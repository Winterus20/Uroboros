<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGameStore } from '../stores/game'
import { isMotionReduced, useMotionMode } from '../composables/useMotion'

const store = useGameStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

// WebGL referansları ve durumlar
let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
// Bağlamın sahibi canvas: v-if kapanınca eleman yeniden doğar; bayat bağlamı ayırt eder.
let glCanvas: HTMLCanvasElement | null = null
let program: WebGLProgram | null = null
let vsShader: WebGLShader | null = null
let fsShader: WebGLShader | null = null
let positionBuffer: WebGLBuffer | null = null
let animId: number | null = null
let lastTime = 0
let totalShaderTime = 0
const isSupported = ref(true)

/*
 * Parlaklık tavanı (visual-language.md §2.4, ADR-0084):
 * swirl'ün EN PARLAK pikseli bile metin kontrastını bozamaz. Shader rengi doğrudan
 * hesaplamaz; zemin (`--pn-bg`) + tavanlı tint × [0,1] gölge üretir. Tint, JS'te WCAG
 * göreli parlaklığına göre çözülür — böylece tavan basamak renginden bağımsız tutar.
 *
 * Tavan L ≤ 0.016 (tüm ekran, tek kural): en parlak swirl pikseli üzerinde
 * `--pn-text-dim` ≥ 4,6:1, 1. basamak hero ≥ 10:1, `--pn-text` ≥ 14:1.
 */
const SWIRL_BG: [number, number, number] = [6 / 255, 6 / 255, 8 / 255] // --pn-bg
const SWIRL_MAX_LUMINANCE = 0.016
/** Basamak renginin korunan doygunluk payı (1 = tam neon, 0 = gri). */
const SWIRL_SATURATION = 0.55

// Shader Uniform Lokasyonları
interface UniformLocations {
  resolution: WebGLUniformLocation | null
  time: WebGLUniformLocation | null
  base: WebGLUniformLocation | null
  tint: WebGLUniformLocation | null
  contrast: WebGLUniformLocation | null
}
let uniforms: UniformLocations = {
  resolution: null,
  time: null,
  base: null,
  tint: null,
  contrast: null
}

// Pürüzsüz durum Lerp değişkenleri (basamak geçişinde ani renk sıçramasını önler)
interface SwirlParams {
  tint: [number, number, number]
  speed: number
  contrast: number
}

const currentParams: SwirlParams = {
  tint: [0, 0, 0],
  speed: 0.72,
  contrast: 2.3
}

// Sistem tercihi (OS seviyesi): prefers-reduced-motion — canlı dinlenir (JuiceLayer kalıbı).
// ref: ayar/OS değişimi `isEnabled` watcher'ını tetikler; döngü kısıtlı modda durur,
// ekranda statik fallback katmanı kalır, ayar geri alınınca canlı yeniden başlar.
const prefersReducedMotion = ref(false)
let reducedMotionQuery: MediaQueryList | null = null

const onReducedMotionChange = (e: MediaQueryListEvent): void => {
  prefersReducedMotion.value =
    e.matches ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-anim'))
}

// 3 durumlu hareket kapısı (reaktif): 'reduced'/'off' iken tam ekran WebGL döngüsü çalışmaz.
const motionMode = useMotionMode()

// Efektin aktif olup olmadığı (kullanıcı ayarı + pil tasarrufu + hareket kapısı + OS tercihi + .reduce-anim)
const isEnabled = computed(() => {
  if (store.settings.swirlShaderQuality === 'off') return false
  if (store.settings.batterySaver) return false
  if (motionMode.value !== 'full') return false
  if (isMotionReduced()) return false
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-anim')) return false
  if (prefersReducedMotion.value) return false
  return true
})

// WebGL Vertex Shader (Basit full-screen quad)
const VS_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Prosedürel boya girdabı (aspect-correct UV · 5 kademeli warp). Piksel kuantizasyonu
// YOK: Balatro mirası "retro piksel" Saf Sayı'da ölü (G4 piksel font, ADR-0069 CRT/retro).
const FS_SOURCE = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_base;
uniform vec3 u_tint;
uniform float u_contrast;

void main() {
  // 1. Aspect-correct UV (kuantizasyonsuz: yumuşak alan, bilinear büyütme)
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / length(u_resolution);

  // 2. Kutupsal dönüşüm ve açısal girdap (Polar Coordinates & Swirl)
  float uv_len = length(uv);
  float speed = ( -2.0 * 0.2 ) + 302.2;
  float new_angle = atan(uv.y, uv.x) + speed - 20.0 * (0.25 * uv_len + 0.75);
  vec2 mid = (u_resolution / length(u_resolution)) / 2.0;
  uv = vec2(uv_len * cos(new_angle) + mid.x, uv_len * sin(new_angle) + mid.y) - mid;
  uv *= 28.0;

  // 3. 5 Kademeli İteratif Kaos Döngüsü (Iterative Warping Loop)
  float loop_speed = u_time;
  vec2 uv2 = vec2(uv.x + uv.y, 0.0);

  for (int i = 0; i < 5; i++) {
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv += 0.5 * vec2(cos(5.1123 + 0.353 * uv2.y + loop_speed * 0.1311), sin(uv2.x - 0.113 * loop_speed));
    uv -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
  }

  // 4. Boya ayrışması → tek gölge değeri [0,1] (beyaz ışık eklemesi yok: tavanı delerdi)
  float contrast_mod = (0.25 * u_contrast + 0.5 * 0.25 + 1.2);
  float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
  float c1 = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
  float c2 = max(0.0, 1.0 - contrast_mod * abs(paint_res));
  float shade = clamp(0.32 * c1 + 0.78 * c2 + 0.22 * max(c2 * 5.0 - 4.0, 0.0), 0.0, 1.0);

  // 5. Zemin + tavanlı tint: shade ≤ 1 olduğundan hiçbir piksel tavanı aşamaz.
  gl_FragColor = vec4(u_base + u_tint * shade, 1.0);
}
`

function createShader(glCtx: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = glCtx.createShader(type)
  if (!shader) return null
  glCtx.shaderSource(shader, source)
  glCtx.compileShader(shader)
  if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
    console.error('[AlgorithmicSwirl] Shader derleme hatası:', glCtx.getShaderInfoLog(shader))
    glCtx.deleteShader(shader)
    return null
  }
  return shader
}

function initWebGL(): boolean {
  if (!canvasRef.value) return false
  const canvas = canvasRef.value

  // Canvas yeniden doğduysa eski bağlam bayattır: açıkça bırak (tarayıcı bağlam sınırı ~16).
  if (gl && glCanvas !== canvas) {
    const loseExt = gl.getExtension('WEBGL_lose_context')
    loseExt?.loseContext()
    gl = null
    glCanvas = null
  }

  const options: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power'
  }

  gl = (canvas.getContext('webgl2', options) || canvas.getContext('webgl', options)) as WebGLRenderingContext | null
  if (!gl) {
    isSupported.value = false
    return false
  }
  glCanvas = canvas

  vsShader = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE)
  fsShader = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE)
  if (!vsShader || !fsShader) return false

  program = gl.createProgram()
  if (!program) return false
  gl.attachShader(program, vsShader)
  gl.attachShader(program, fsShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[AlgorithmicSwirl] Program link hatası:', gl.getProgramInfoLog(program))
    return false
  }

  gl.useProgram(program)

  // Full-screen quad pozisyonları
  positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]),
    gl.STATIC_DRAW
  )

  const posAttr = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(posAttr)
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0)

  // Uniform konumları
  uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    time: gl.getUniformLocation(program, 'u_time'),
    base: gl.getUniformLocation(program, 'u_base'),
    tint: gl.getUniformLocation(program, 'u_tint'),
    contrast: gl.getUniformLocation(program, 'u_contrast')
  }
  // Başlangıç tinti hedefe eşit: ilk karede tavansız/yanlış renkli flaş olmaz.
  const initial = getTargetParams()
  currentParams.tint = [...initial.tint]

  resizeCanvas()
  return true
}

function resizeCanvas() {
  if (!canvasRef.value || !gl) return
  const canvas = canvasRef.value
  
  // Düşük çözünürlüklü tampon (CSS pikseline göre, DPR bilinçli olarak yok sayılır):
  // Dengeli 0.5x, yüksek 0.75x → fill-rate ~%75 / ~%44 düşer. Alan yumuşak olduğu için
  // tarayıcının bilinear büyütmesi yeterli; `image-rendering: pixelated` kaldırıldı.
  // En-boy oranı viewport ile AYNI tutulur: eski 320×240 tabanı dar ekranda tamponu
  // görüntüden farklı orana zorlayıp object-cover ile 2× kırpılmış bloklara büyütüyordu.
  const quality = store.settings.swirlShaderQuality ?? 'balanced'
  const vw = Math.max(1, window.innerWidth)
  const vh = Math.max(1, window.innerHeight)
  let scale = quality === 'high' ? 0.75 : 0.5
  // Kısa kenar 200 px'in altına düşmesin (çok küçük pencerede bulanıklaşmayı sınırlar).
  scale = Math.min(1, Math.max(scale, 200 / Math.min(vw, vh)))

  const w = Math.max(1, Math.round(vw * scale))
  const h = Math.max(1, Math.round(vh * scale))

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
    gl.viewport(0, 0, w, h)
  }
}

// Hedef parametreleri oyun durumundan hesaplar (G2/G5: swirl basamak rengini taşır)
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255
  ]
}

/** WCAG 2.x göreli parlaklık (sRGB). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * Basamak renginden tavanlı tint: renk önce griye doğru `SWIRL_SATURATION` kadar çekilir,
 * sonra `SWIRL_BG + k·renk` göreli parlaklığı tam `maxLum` olacak şekilde k ikiye bölmeyle
 * bulunur. Shader'da gölge ≤ 1 olduğu için hiçbir piksel bu tavanı aşamaz.
 */
function cappedTint(color: [number, number, number], maxLum: number): [number, number, number] {
  const luma = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]
  const dir = color.map((c) => luma + (c - luma) * SWIRL_SATURATION) as [number, number, number]
  const peak = Math.max(dir[0], dir[1], dir[2], 1e-6)
  const at = (k: number): [number, number, number] =>
    dir.map((c, i) => Math.min(1, SWIRL_BG[i] + c * k)) as [number, number, number]
  let lo = 0
  let hi = 1 / peak
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (relativeLuminance(at(mid)) > maxLum) hi = mid
    else lo = mid
  }
  return dir.map((c) => c * lo) as [number, number, number]
}

// Tint yalnız basamak değişince yeniden çözülür (her karede 24 adımlık arama gereksiz).
let tintCacheKey = ''
let tintCache: [number, number, number] = [0, 0, 0]

function getTargetParams(): SwirlParams {
  const hex = store.rungInfo.color
  if (hex !== tintCacheKey) {
    tintCache = cappedTint(hexToRgb(hex), SWIRL_MAX_LUMINANCE)
    tintCacheKey = hex
  }
  return {
    tint: tintCache,
    speed: 0.72,
    contrast: 2.3
  }
}

// Lineer İnterpolasyon
function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

function render(now: number) {
  if (!gl || !program || !canvasRef.value || !isEnabled.value || document.hidden) {
    animId = null
    return
  }

  if (lastTime === 0) lastTime = now
  const dt = Math.min(0.1, (now - lastTime) / 1000)
  lastTime = now

  const target = getTargetParams()
  const lerpFactor = Math.min(1.0, dt * 2.8)

  // Parametreleri pürüzsüzce yaklaştır. Basamak geçişinde iki tavanlı tint arasında lineer
  // karışım: sRGB→lineer dönüşüm konveks olduğundan karışımın parlaklığı iki ucun
  // karışımını aşamaz — geçiş boyunca da tavan tutar.
  for (let i = 0; i < 3; i++) {
    currentParams.tint[i] = lerp(currentParams.tint[i], target.tint[i], lerpFactor)
  }
  currentParams.speed = lerp(currentParams.speed, target.speed, lerpFactor)
  currentParams.contrast = lerp(currentParams.contrast, target.contrast, lerpFactor)

  totalShaderTime += dt * currentParams.speed

  // Uniform güncellemesi
  const width = canvasRef.value.width
  gl.uniform2f(uniforms.resolution, width, canvasRef.value.height)
  gl.uniform1f(uniforms.time, totalShaderTime)
  gl.uniform3fv(uniforms.base, SWIRL_BG)
  gl.uniform3fv(uniforms.tint, currentParams.tint)
  gl.uniform1f(uniforms.contrast, currentParams.contrast)

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  animId = requestAnimationFrame(render)
}

function startLoop() {
  if (animId !== null) return
  if (!isEnabled.value || document.hidden) return
  lastTime = performance.now()
  animId = requestAnimationFrame(render)
}

function stopLoop() {
  if (animId !== null) {
    cancelAnimationFrame(animId)
    animId = null
  }
  lastTime = 0
}

function handleVisibility() {
  if (document.hidden) {
    stopLoop()
  } else if (isEnabled.value) {
    startLoop()
  }
}

watch(
  isEnabled,
  (active) => {
    if (active) {
      // DOM güncellemesini bekle: v-if ile geri gelen canvas ancak flush sonrası hazır olur
      // (aksi halde initWebGL canvasRef null'da düşer ve döngü canlı başlamaz).
      nextTick(() => {
        if (!isEnabled.value || document.hidden) return
        // Canvas v-if ile yeniden doğduysa eski bağlam bayattır: yeni canvas'a göre kur.
        if (!gl || glCanvas !== canvasRef.value) initWebGL()
        resizeCanvas()
        startLoop()
      })
    } else {
      stopLoop()
    }
  },
  { immediate: true }
)

watch(
  () => store.settings.swirlShaderQuality,
  () => {
    resizeCanvas()
  }
)

onMounted(() => {
  // Sistem hareket tercihi: bir kez oku, çalışma boyunca değişiklikleri dinle (JuiceLayer kalıbı, F7.5: root .reduce-anim destekli).
  if (typeof window.matchMedia === 'function') {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value =
      reducedMotionQuery.matches ||
      (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-anim'))
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', onReducedMotionChange)
    }
  } else if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-anim')) {
    prefersReducedMotion.value = true
  }

  if (isEnabled.value && !document.hidden) {
    const ok = initWebGL()
    if (ok) startLoop()
  }

  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('visibilitychange', handleVisibility)

  if (reducedMotionQuery) {
    if (typeof reducedMotionQuery.removeEventListener === 'function') {
      reducedMotionQuery.removeEventListener('change', onReducedMotionChange)
    }
    reducedMotionQuery = null
  }

  if (gl) {
    if (program) {
      if (vsShader) gl.detachShader(program, vsShader)
      if (fsShader) gl.detachShader(program, fsShader)
      gl.deleteProgram(program)
      program = null
    }
    if (vsShader) {
      gl.deleteShader(vsShader)
      vsShader = null
    }
    if (fsShader) {
      gl.deleteShader(fsShader)
      fsShader = null
    }
    if (positionBuffer) {
      gl.deleteBuffer(positionBuffer)
      positionBuffer = null
    }
    gl = null
    glCanvas = null
  }
})
</script>

<template>
  <div
    class="algorithmic-swirl-container pointer-events-none fixed inset-0 w-screen h-screen max-w-full max-h-full z-0 overflow-hidden select-none"
    aria-hidden="true"
  >
    <!--
      Canlı swirl: renk shader'da son haliyle üretilir (zemin + tavanlı tint). Opaklık ve
      mix-blend yok — hem tavanı ölçülebilir kılar hem ekstra kompozit geçişini kaldırır.
    -->
    <canvas
      v-if="isEnabled && isSupported"
      ref="canvasRef"
      class="algorithmic-swirl-canvas"
    />

    <!-- Kapalı / azaltılmış hareket / WebGL yok: tek renk zemin (§2.1 — gradyan dolgu yok). -->
    <div
      v-else
      class="algorithmic-swirl-still"
    />
  </div>
</template>

<style scoped>
.algorithmic-swirl-container {
  contain: strict;
}

.algorithmic-swirl-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.algorithmic-swirl-still {
  width: 100%;
  height: 100%;
  background: var(--pn-bg);
}
</style>
