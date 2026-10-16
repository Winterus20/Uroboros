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
let cachedHzLog = 0
let lastHzCheckTime = 0
const isSupported = ref(true)

// Shader Uniform Lokasyonları
interface UniformLocations {
  resolution: WebGLUniformLocation | null
  time: WebGLUniformLocation | null
  color1: WebGLUniformLocation | null
  color2: WebGLUniformLocation | null
  color3: WebGLUniformLocation | null
  speed: WebGLUniformLocation | null
  contrast: WebGLUniformLocation | null
  lighting: WebGLUniformLocation | null
}
let uniforms: UniformLocations = {
  resolution: null,
  time: null,
  color1: null,
  color2: null,
  color3: null,
  speed: null,
  contrast: null,
  lighting: null
}

// Pürüzsüz durum Lerp değişkenleri (ani renk ve hız sıçramalarını önler)
interface SwirlParams {
  c1: [number, number, number, number]
  c2: [number, number, number, number]
  c3: [number, number, number, number]
  speed: number
  contrast: number
  lighting: number
}

const currentParams: SwirlParams = {
  c1: [0.04, 0.05, 0.09, 1.0],
  c2: [0.30, 0.11, 0.58, 1.0],
  c3: [0.02, 0.02, 0.03, 1.0],
  speed: 1.0,
  contrast: 2.6,
  lighting: 0.35
}

// Sistem tercihi (OS seviyesi): prefers-reduced-motion — canlı dinlenir (JuiceLayer kalıbı).
// ref: ayar/OS değişimi `isEnabled` watcher'ını tetikler; döngü kısıtlı modda durur,
// ekranda statik fallback katmanı kalır, ayar geri alınınca canlı yeniden başlar.
const prefersReducedMotion = ref(false)
let reducedMotionQuery: MediaQueryList | null = null

const onReducedMotionChange = (e: MediaQueryListEvent): void => {
  prefersReducedMotion.value = e.matches
}

// 3 durumlu hareket kapısı (reaktif): 'reduced'/'off' iken tam ekran WebGL döngüsü çalışmaz.
const motionMode = useMotionMode()

// Efektin aktif olup olmadığı (kullanıcı ayarı + pil tasarrufu + hareket kapısı + OS tercihi)
const isEnabled = computed(() => {
  if (store.settings.swirlShaderQuality === 'off') return false
  if (store.settings.batterySaver) return false
  if (motionMode.value !== 'full') return false
  if (isMotionReduced()) return false
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

// Balatro Procedural Paint Swirl Fragment Shader (AspectRatio & Quantized UV & 5-Step Warping)
const FS_SOURCE = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_speed;
uniform float u_contrast;
uniform float u_lighting;

void main() {
  // 1. Aspect-correct UV & retro pikselleştirme (480 filter)
  float pixel_filter = 480.0;
  float pixel_size = length(u_resolution) / pixel_filter;
  vec2 uv = floor(gl_FragCoord.xy / pixel_size) * pixel_size;
  uv = (uv - 0.5 * u_resolution) / length(u_resolution);

  // 2. Kutupsal dönüşüm ve açısal girdap (Polar Coordinates & Swirl)
  float uv_len = length(uv);
  float speed = ( -2.0 * 0.2 ) + 302.2;
  float new_angle = atan(uv.y, uv.x) + speed - 20.0 * (0.25 * uv_len + 0.75);
  vec2 mid = (u_resolution / length(u_resolution)) / 2.0;
  uv = vec2(uv_len * cos(new_angle) + mid.x, uv_len * sin(new_angle) + mid.y) - mid;
  uv *= 28.0;

  // 3. 5 Kademeli İteratif Kaos Döngüsü (Iterative Warping Loop)
  float loop_speed = u_time * u_speed;
  vec2 uv2 = vec2(uv.x + uv.y, 0.0);

  for (int i = 0; i < 5; i++) {
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv += 0.5 * vec2(cos(5.1123 + 0.353 * uv2.y + loop_speed * 0.1311), sin(uv2.x - 0.113 * loop_speed));
    uv -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
  }

  // 4. 3 Renkli Boya Ayrışması ve Işıklandırma
  float contrast_mod = (0.25 * u_contrast + 0.5 * 0.25 + 1.2);
  float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
  float c1 = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
  float c2 = max(0.0, 1.0 - contrast_mod * abs(paint_res));
  float c3 = 1.0 - min(1.0, c1 + c2);

  float light = (u_lighting - 0.2) * max(c1 * 5.0 - 4.0, 0.0) + u_lighting * max(c2 * 5.0 - 4.0, 0.0);
  vec4 final_color = (0.3 / u_contrast) * u_color1 + (1.0 - 0.3 / u_contrast) * (u_color1 * c1 + u_color2 * c2 + u_color3 * c3) + light;
  
  gl_FragColor = vec4(final_color.rgb, 1.0);
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
    color1: gl.getUniformLocation(program, 'u_color1'),
    color2: gl.getUniformLocation(program, 'u_color2'),
    color3: gl.getUniformLocation(program, 'u_color3'),
    speed: gl.getUniformLocation(program, 'u_speed'),
    contrast: gl.getUniformLocation(program, 'u_contrast'),
    lighting: gl.getUniformLocation(program, 'u_lighting')
  }

  resizeCanvas()
  return true
}

function resizeCanvas() {
  if (!canvasRef.value || !gl) return
  const canvas = canvasRef.value
  
  // Düşük çözünürlüklü tampon: Dengeli modda 0.5x, yüksek modda 0.75x
  // Retro piksel estetiğini pekiştirir ve fill-rate yükünü %75 azaltır
  const quality = store.settings.swirlShaderQuality ?? 'balanced'
  const scale = quality === 'high' ? 0.75 : 0.5
  
  const w = Math.max(320, Math.floor(window.innerWidth * scale))
  const h = Math.max(240, Math.floor(window.innerHeight * scale))

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
    gl.viewport(0, 0, w, h)
  }
}

// Hedef parametreleri oyun durumundan hesaplar
function getTargetParams(): SwirlParams {
  // 1. Şafak (06:00) / Tekillik Eşiği hazır
  if (store.canSingularity) {
    return {
      c1: [0.11, 0.10, 0.09, 1.0], // Şafak sıcağı
      c2: [0.96, 0.62, 0.07, 1.0], // Güneş Altını
      c3: [0.05, 0.04, 0.04, 1.0], // Karanlık Ufuk
      speed: 1.2,
      contrast: 3.2,
      lighting: 0.52
    }
  }

  // 2. Gece Krizi / Meydan Okuma / Ters Tepme
  if (store.activeChallenge || store.crisisBackfireDebuff > 0) {
    return {
      c1: [0.11, 0.03, 0.05, 1.0], // Karanlık Kızıl
      c2: [0.88, 0.11, 0.28, 1.0], // Kan Kırmızısı
      c3: [0.02, 0.005, 0.01, 1.0], // Abis
      speed: 2.8,
      contrast: 4.2,
      lighting: 0.45
    }
  }

  // 3. Kombo Hipnozu
  if (store.isComboActive) {
    return {
      c1: [0.12, 0.11, 0.29, 1.0], // Elektrik İndigo
      c2: [0.02, 0.71, 0.83, 1.0], // Neon Camgöbeği
      c3: [0.48, 0.23, 0.93, 1.0], // Canlı Mor
      speed: 2.0,
      contrast: 3.8,
      lighting: 0.42
    }
  }

  // 3.5 Şafak öncesi (gece %75+): zemin şafağa ısınır — tekillik altını değil, uykusuz şafak
  // Header saati + ScreenOverlay ufkuyla aynı ilerleme (log10/308.25).
  try {
    const m = store.matter
    if (m && !m.isNan() && m.isFinite() && m.gte(10)) {
      const logVal = m.log10().toNumber()
      if (Number.isFinite(logVal)) {
        const p = Math.min(1, Math.max(0, logVal / 308.25))
        if (p >= 0.75) {
          const k = (p - 0.75) / 0.25
          return {
            c1: [0.04 + k * 0.05, 0.05 + k * 0.02, 0.09, 1.0],
            c2: [0.3 + k * 0.35, 0.11 + k * 0.25, 0.58 - k * 0.3, 1.0],
            c3: [0.02 + k * 0.03, 0.02, 0.03, 1.0],
            speed: 0.9 + k * 0.3,
            contrast: 2.6 + k * 0.5,
            lighting: 0.35 + k * 0.1
          }
        }
      }
    }
  } catch { /* yoksay — dingin geceye düş */ }

  // 4. Normal Dingin Gece (Çekim Hızı / Hz ile ivmelenir — 500ms throttle ile hafifletilmiştir)
  const nowMs = performance.now()
  if (nowMs - lastHzCheckTime > 500) {
    lastHzCheckTime = nowMs
    try {
      const mult = store.tickspeedMultiplier
      if (mult && mult.gt(1)) {
        cachedHzLog = Math.min(6, Math.max(0, mult.log10().toNumber()))
      } else {
        cachedHzLog = 0
      }
    } catch {
      cachedHzLog = 0
    }
  }
  const speed = 0.8 + 0.28 * cachedHzLog

  return {
    c1: [0.04, 0.05, 0.09, 1.0], // Koyu Gece Mavisi
    c2: [0.30, 0.11, 0.58, 1.0], // Karanlık Mor
    c3: [0.02, 0.02, 0.03, 1.0], // Zifiri Boşluk
    speed,
    contrast: 2.6,
    lighting: 0.35
  }
}

// Lineer İnterpolasyon
function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

function render(now: number) {
  if (!gl || !program || !canvasRef.value || !isEnabled.value) {
    animId = null
    return
  }

  if (lastTime === 0) lastTime = now
  const dt = Math.min(0.1, (now - lastTime) / 1000)
  lastTime = now

  const target = getTargetParams()
  const lerpFactor = Math.min(1.0, dt * 2.8)

  // Parametreleri pürüzsüzce yaklaştır
  for (let i = 0; i < 4; i++) {
    currentParams.c1[i] = lerp(currentParams.c1[i], target.c1[i], lerpFactor)
    currentParams.c2[i] = lerp(currentParams.c2[i], target.c2[i], lerpFactor)
    currentParams.c3[i] = lerp(currentParams.c3[i], target.c3[i], lerpFactor)
  }
  currentParams.speed = lerp(currentParams.speed, target.speed, lerpFactor)
  currentParams.contrast = lerp(currentParams.contrast, target.contrast, lerpFactor)
  currentParams.lighting = lerp(currentParams.lighting, target.lighting, lerpFactor)

  totalShaderTime += dt * currentParams.speed

  // Uniform güncellemesi
  gl.uniform2f(uniforms.resolution, canvasRef.value.width, canvasRef.value.height)
  gl.uniform1f(uniforms.time, totalShaderTime)
  gl.uniform4fv(uniforms.color1, currentParams.c1)
  gl.uniform4fv(uniforms.color2, currentParams.c2)
  gl.uniform4fv(uniforms.color3, currentParams.c3)
  gl.uniform1f(uniforms.speed, 1.0)
  gl.uniform1f(uniforms.contrast, currentParams.contrast)
  gl.uniform1f(uniforms.lighting, currentParams.lighting)

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  animId = requestAnimationFrame(render)
}

function startLoop() {
  if (animId !== null) return
  if (!isEnabled.value) return
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
  if (document.visibilityState === 'hidden') {
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
        if (!isEnabled.value) return
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
  // Sistem hareket tercihi: bir kez oku, çalışma boyunca değişiklikleri dinle (JuiceLayer kalıbı).
  if (typeof window.matchMedia === 'function') {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = reducedMotionQuery.matches
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', onReducedMotionChange)
    }
  }

  if (isEnabled.value) {
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
    <!-- WebGL Canlı Balatro Swirl Katmanı -->
    <canvas
      v-if="isEnabled && isSupported"
      ref="canvasRef"
      class="w-full h-full object-cover opacity-65 mix-blend-screen"
      style="image-rendering: pixelated;"
    />

    <!-- Fallback / Statik Gece Zemin Gradyanı (Shader kapalıyken veya desteklenmediğinde) -->
    <div
      v-else
      class="w-full h-full bg-radial-at-c from-purple-950/20 via-[#0a0608] to-[#07030a]"
    />
  </div>
</template>

<style scoped>
.algorithmic-swirl-container {
  contain: strict;
}
</style>
