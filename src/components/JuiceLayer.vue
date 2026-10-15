<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { isMotionReduced, useMotionMode } from '../composables/useMotion'

export interface JuiceTriggerOptions {
  x: number
  y: number
  text?: string
  color?: string
  /** Vurgulu boyut (prestij/büyük ödül anları için) */
  big?: boolean
}

export interface ShockwaveTriggerOptions {
  x: number
  y: number
  color?: string
  maxRadius?: number
}

declare global {
  interface Window {
    __triggerJuice?: (options: JuiceTriggerOptions) => void
    __triggerShockwave?: (options: ShockwaveTriggerOptions) => void
    __setJuiceMode?: (mode: string) => void
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  maxLife: number
  life: number
  text: string
  color: string
  size: number
}

interface Shockwave {
  x: number
  y: number
  radius: number
  maxRadius: number
  color: string
  alpha: number
  lineWidth: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  alpha: number
  life: number
  maxLife: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animId: number | null = null
let shakeTimeout: ReturnType<typeof setTimeout> | null = null
let lastShakeAt = 0
const particles: Particle[] = []
const shockwaves: Shockwave[] = []
const sparks: Spark[] = []

let width = 0
let height = 0

// Performans: juice modu sıcak döngüde diskten okunmaz; App.vue'daki watcher besler.
let juiceModeCache = 'balanced'

function getJuiceMode(): string {
  return juiceModeCache
}

const store = useGameStore()

// Sistem tercihi (OS seviyesi): prefers-reduced-motion. Tek kez okunur, değişikliğe tepki verir.
// tilt.ts'teki matchMedia kalıbının canlı (değişiklik dinleyen) hali.
let prefersReducedMotion = false
let reducedMotionQuery: MediaQueryList | null = null

const onReducedMotionChange = (e: MediaQueryListEvent): void => {
  prefersReducedMotion = e.matches
}

/**
 * Hareket bastırma birleşimi dört kaynaktan gelir:
 *  1) prefers-reduced-motion     — işletim sistemi tercihi (canlı dinlenir)
 *  2) 3 durumlu hareket kapısı   — isMotionReduced() kök-sınıf mührü + reaktif motionMode
 *  3) settings.reduceAnimations  — eski kayıt uyumu ('Animasyonları Azalt' bayrağı)
 *  4) settings.batterySaver     — pil tasarrufu (aynı bastırmayı paylaşır)
 * Hepsi aynı şeyi yapar: şok dalgası, kıvılcım, gövde sarsıntısı ve uçan metin üretilmez.
 * Reaktif mod terimi watcher'ı da besler: 'reduced'/'off' açılınca aktif efektler anında düşer.
 */
const motionMode = useMotionMode()

function shouldReduceMotion(): boolean {
  return (
    prefersReducedMotion ||
    isMotionReduced() ||
    motionMode.value !== 'full' ||
    store.settings.reduceAnimations === true ||
    store.settings.batterySaver === true
  )
}

/** 'Ucan Hasar / Dopamin Sayilari' ayarı: kapalıyken hiçbir metin parçacığı doğmaz. */
function floatingTextsEnabled(): boolean {
  return store.settings.floatingTexts !== false
}

// --- Hareketsizlik yardımcıları -------------------------------------------------
// Bunlar mevcut efektleri kapatır; kalıcı bir rAF döngüsü KURMAZLAR.
// Döngü yalnızca spawn ile başlar ve diziler boşalınca kendini kapatır (idle-safe).

function stopAnimation(): void {
  if (animId !== null) {
    cancelAnimationFrame(animId)
    animId = null
  }
}

function clearBodyShake(): void {
  if (shakeTimeout) {
    clearTimeout(shakeTimeout)
    shakeTimeout = null
  }
  const target = document.getElementById('game-main-content')
  if (target) {
    target.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
  }
  document.body.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
}

/** Azaltılmış hareket açıldığı anda uçan tüm efektleri düşürür (döngü kendini kapatır). */
function suppressActiveEffects(): void {
  particles.length = 0
  shockwaves.length = 0
  sparks.length = 0
  stopAnimation()
  clearBodyShake()
}

function resizeCanvas() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
}

function spawnParticle(x: number, y: number, text: string, color = '#e2e8f0', big = false) {
  // Ucan yazi tekligi (STEP 3): 'Ucan Hasar / Dopamin Sayilari' kapaliyken metin dogmaz.
  if (!floatingTextsEnabled()) return

  // AZALTILMIS HAREKET TERCİHİ — metin parçacıkları için alınan karar: TAMAMEN bastırılır
  // (azaltılmış moda düşürülmez). Gerekçe: uçan yazılar sadece hareketle anlam taşıyan
  // süsleme efektidir; aynı bilgi (alınan miktar/saniye) satırın kalıcı sayaçlarında ve
  // satın alma butonunun etiketinde zaten durur. Kısmi (statik) sürüm bırakmak,
  // hareketi sıfırlamadan ekranı kapatıp göstermek zorunda kalmak anlamına gelirdi.
  if (shouldReduceMotion()) return

  // P0 Balatro: juice moduna göre yoğunluk — calm sade, tilt parti
  const mode = getJuiceMode()
  const repeats = big ? (mode === 'tilt' ? 5 : mode === 'calm' ? 1 : 3) : 1
  for (let r = 0; r < repeats; r++) {
    spawnSingle(x, y, text, color, big, mode, r)
  }

  if (animId === null) {
    animId = requestAnimationFrame(loop)
  }
}

function spawnSingle(
  x: number,
  y: number,
  text: string,
  color: string,
  big: boolean,
  mode: string,
  index: number
) {
  // Hafif rastgele dikey açı ve hız (burst'te yana saçılım genişler)
  const spread = big ? 2.6 : 1.5
  const vx = (Math.random() - 0.5) * spread
  const vy = -(2.5 + Math.random() * 2.0) - (big ? index * 0.35 : 0)

  const cap = mode === 'tilt' ? 120 : mode === 'calm' ? 30 : 60
  const p: Particle = {
    // Yatay saçılım: aynı noktadan üst üste spawn'da metin yığını yerine şerit
    x: x + (Math.random() - 0.5) * (big ? 64 : 28),
    y,
    vx,
    vy,
    alpha: 1,
    maxLife: 35 + Math.floor(Math.random() * 10), // ~0.6 - 0.8 saniye
    life: 0,
    text,
    color,
    size: big ? (mode === 'tilt' ? 24 : 20) : 15
  }

  if (particles.length >= cap) {
    particles.shift()
  }
  particles.push(p)
}

function triggerJuice(options: JuiceTriggerOptions) {
  const { x, y, text, color, big } = options
  if (!text) return
  // Erken çıkış: rAF döngüsü hiç başlamaz → katman idle-safe kalır
  if (!floatingTextsEnabled() || shouldReduceMotion()) return
  spawnParticle(x, y, text, color, big)
}

function spawnShockwave(x: number, y: number, color = '#a855f7', maxRadius = 180) {
  const mode = getJuiceMode()

  // Azaltilmis hareket (ayar + OS tercihi + pil tasarrufu): dalga VE kıvılcım üretilmez.
  // juiceMode 'calm' da aynı bastırmayı yapar.
  if (shouldReduceMotion() || mode === 'calm') return

  // 1. Ana Dış Şok Dalgası
  shockwaves.push({
    x,
    y,
    radius: 12,
    maxRadius,
    color,
    alpha: 0.95,
    lineWidth: 4
  })

  // 2. Takip Eden Beyaz/Gümüş İç Çekirdek Dalgası
  shockwaves.push({
    x,
    y,
    radius: 4,
    maxRadius: maxRadius * 0.72,
    color: '#ffffff',
    alpha: 0.85,
    lineWidth: 2.2
  })

  // 3. 360 Derece Dağılan Neon Kıvılcımlar (Sparks)
  const sparkCount = mode === 'tilt' ? 32 : 20
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 2.2 + Math.random() * 5.8
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 1.8 + Math.random() * 2.8,
      alpha: 1,
      life: 0,
      maxLife: 24 + Math.floor(Math.random() * 18)
    })
  }

  if (animId === null) {
    animId = requestAnimationFrame(loop)
  }
}

function triggerShockwave(options: ShockwaveTriggerOptions) {
  const { x, y, color, maxRadius } = options
  spawnShockwave(x, y, color, maxRadius)
}

function loop() {
  if (!ctx || !canvasRef.value) {
    animId = null
    return
  }

  // Ayar ortada açıldıysa kalan son kareleri de çizme; döngü burada kendini kapatır
  // (yine kalıcı döngü yok: spawn ile başlar, boşalınca biter).
  if (shouldReduceMotion()) {
    suppressActiveEffects()
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  // 1. Şok Dalgaları Render & Fizik
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i]
    sw.radius += (sw.maxRadius - sw.radius) * 0.16 + 2.2
    sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius)

    if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
      shockwaves.splice(i, 1)
      continue
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2)
    ctx.strokeStyle = sw.color
    ctx.globalAlpha = sw.alpha
    ctx.lineWidth = sw.lineWidth * (1 - sw.radius / sw.maxRadius) + 0.6
    ctx.stroke()
    ctx.restore()
  }

  // 2. Neon Kıvılcımlar Render & Fizik
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]
    s.life++
    s.x += s.vx
    s.y += s.vy
    s.vx *= 0.94
    s.vy *= 0.94
    s.vy += 0.08 // Yerçekimi
    s.alpha = Math.max(0, 1 - s.life / s.maxLife)

    if (s.life >= s.maxLife || s.alpha <= 0) {
      sparks.splice(i, 1)
      continue
    }

    ctx.save()
    ctx.globalAlpha = s.alpha
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.arc(s.x, s.y, Math.max(0.5, s.size * (1 - s.life / s.maxLife)), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // 3. Metin Parçacıkları Render & Fizik
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life++

    p.x += p.vx
    p.y += p.vy
    p.vy *= 0.96

    const progress = p.life / p.maxLife
    p.alpha = Math.max(0, 1 - progress)

    if (p.life >= p.maxLife || p.alpha <= 0) {
      particles.splice(i, 1)
      continue
    }

    ctx.save()
    ctx.globalAlpha = p.alpha
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // İmza tipografi: display font, boyut parçacıkla taşınır
    ctx.font = `700 ${p.size}px "Chakra Petch", "JetBrains Mono", monospace`

    // Koyu kontur: her zeminde okunabilirlik (karanlık panelde de açık alanda da)
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3.5
    ctx.strokeStyle = 'rgba(8, 9, 13, 0.9)'
    ctx.strokeText(p.text, p.x, p.y)

    ctx.fillStyle = p.color
    ctx.fillText(p.text, p.x, p.y)

    ctx.restore()
  }

  ctx.restore()

  if (particles.length > 0 || shockwaves.length > 0 || sparks.length > 0) {
    animId = requestAnimationFrame(loop)
  } else {
    animId = null
  }
}

function handleTapEvent(e: Event) {
  // Sıralı Reels Vuruşu açıkken sayıyı SequentialStrikeLayer çizer; çift sayı engellenir.
  if (store.settings.sequentialStrike !== false) return
  const customEvent = e as CustomEvent<JuiceTriggerOptions>
  if (customEvent.detail) {
    triggerJuice(customEvent.detail)
  }
}

function handleShockwaveEvent(e: Event) {
  const customEvent = e as CustomEvent<ShockwaveTriggerOptions>
  if (customEvent.detail) {
    triggerShockwave(customEvent.detail)
  }
}

function handleShakeEvent(e: Event) {
  // Azaltılmış hareket veya kullanıcı ayarında sarsıntı kapalıysa: HİÇ eklenmez (ve açık kalan temizlenir)
  if (shouldReduceMotion() || store.settings.screenShake === false) {
    clearBodyShake()
    return
  }

  // Sakin modda sarsıntı kapalıdır
  if (juiceModeCache === 'calm') {
    clearBodyShake()
    return
  }

  const target = document.getElementById('game-main-content')
  if (!target) return

  // P0 Balatro: shake kademesi — detail.level: 'soft' | 'medium' | 'hard'
  const level = (e as CustomEvent<{ level?: string }>).detail?.level ?? 'medium'
  const cls = level === 'hard' ? 'shake-hard' : level === 'soft' ? 'shake-soft' : 'screen-shake'
  const ms = level === 'hard' ? 400 : level === 'soft' ? 200 : 250

  const now = Date.now()
  // Anti-Spam Koruması: Botlar veya hızlı döngüler çalışırken ekranın aralıksız titremesini önle
  // Soft sarsıntılar için en az 600ms, orta sarsıntılar için en az 400ms aralık zorunludur
  // İstisna: Mevcut durumdan daha sert bir seviyeye ('hard') yükselme her zaman uygulanır
  const minInterval = level === 'soft' ? 600 : level === 'medium' ? 400 : 200
  const isUpgradingToHard = level === 'hard' && !target.classList.contains('shake-hard')

  if (now - lastShakeAt < minInterval && !isUpgradingToHard) {
    return
  }
  lastShakeAt = now

  const hasHard = target.classList.contains('shake-hard')
  const hasMedium = target.classList.contains('screen-shake')

  // Zaten aynı veya daha üst kademede bir sarsıntı aktifse, sınıfı silip eklemek
  // ve reflow tetiklemek yerine sadece zamanlayıcıyı uzatırız.
  // Bu sayede ardışık kütle/dekad artışlarında mobilde ve PC'de GPU katman yırtılması veya titreme olmaz.
  if (
    target.classList.contains(cls) ||
    (cls === 'shake-soft' && (hasMedium || hasHard)) ||
    (cls === 'screen-shake' && hasHard)
  ) {
    if (shakeTimeout) {
      clearTimeout(shakeTimeout)
    }
    shakeTimeout = setTimeout(() => {
      target.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
      shakeTimeout = null
    }, ms)
    return
  }

  if (shakeTimeout) {
    clearTimeout(shakeTimeout)
  }

  target.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
  target.classList.add(cls)

  shakeTimeout = setTimeout(() => {
    target.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
    shakeTimeout = null
  }, ms)
}

function handleJuiceModeEvent(e: Event) {
  const mode = (e as CustomEvent<string>).detail
  if (mode === 'calm' || mode === 'balanced' || mode === 'tilt') {
    juiceModeCache = mode
  }
}

// --- Store bağlantıları -------------------------------------------------------------
// juiceMode: App.vue olayı da besliyor; bu watcher katmanı tek başına da doğru tutar.
watch(
  () => store.settings.juiceMode,
  (mode) => {
    if (mode === 'calm' || mode === 'balanced' || mode === 'tilt') {
      juiceModeCache = mode
    }
  },
  { immediate: true }
)

// Azaltılmış hareket: dört kaynaktan biri açılırsa uçan efektleri hemen düşür
// (OS tercihi · 3 durumlu kapı · legacy reduceAnimations · pil tasarrufu)
watch(
  shouldReduceMotion,
  (reduced) => {
    if (reduced) suppressActiveEffects()
  }
)

// Ekran sarsıntısı kapatılırsa aktif sarsıntı sınıfını anında temizle
watch(
  () => store.settings.screenShake,
  (enabled) => {
    if (enabled === false) clearBodyShake()
  }
)

// Ucan yazi tekligi kapatildiysa mevcut metin parçaciklari dusurulur.
// Dalga/kıvılcım uçuşu sürüyorsa döngü onları bitirip kendi kapanır (donmuş kare kalmaz).
watch(floatingTextsEnabled, (enabled) => {
  if (enabled) return
  particles.length = 0
  if (shockwaves.length === 0 && sparks.length === 0) stopAnimation()
})

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    resizeCanvas()
  }

  try {
    const tiny = localStorage.getItem('doomscroll-juice-mode')
    if (tiny === 'calm' || tiny === 'balanced' || tiny === 'tilt') {
      juiceModeCache = tiny
    }
  } catch { /* yoksay */ }

  // Sistem hareket tercihi: bir kez oku, çalışma boyunca değişiklikleri dinle
  if (typeof window.matchMedia === 'function') {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion = reducedMotionQuery.matches
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', onReducedMotionChange)
    }
  }

  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('doomscroll:tap', handleTapEvent)
  window.addEventListener('doomscroll:shake', handleShakeEvent)
  window.addEventListener('doomscroll:screen-shake', handleShakeEvent)
  window.addEventListener('doomscroll:shockwave', handleShockwaveEvent)
  window.addEventListener('doomscroll:juice-mode', handleJuiceModeEvent as EventListener)

  window.__triggerJuice = triggerJuice
  window.__triggerShockwave = triggerShockwave
  window.__setJuiceMode = (mode: string) => {
    if (mode === 'calm' || mode === 'balanced' || mode === 'tilt') {
      juiceModeCache = mode
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('doomscroll:tap', handleTapEvent)
  window.removeEventListener('doomscroll:shake', handleShakeEvent)
  window.removeEventListener('doomscroll:screen-shake', handleShakeEvent)
  window.removeEventListener('doomscroll:shockwave', handleShockwaveEvent)
  window.removeEventListener('doomscroll:juice-mode', handleJuiceModeEvent as EventListener)

  if (window.__triggerJuice === triggerJuice) {
    delete window.__triggerJuice
  }
  if (window.__triggerShockwave === triggerShockwave) {
    delete window.__triggerShockwave
  }
  if (window.__setJuiceMode) {
    delete window.__setJuiceMode
  }

  if (reducedMotionQuery) {
    if (typeof reducedMotionQuery.removeEventListener === 'function') {
      reducedMotionQuery.removeEventListener('change', onReducedMotionChange)
    }
    reducedMotionQuery = null
  }

  if (animId !== null) {
    cancelAnimationFrame(animId)
    animId = null
  }

  clearBodyShake()

  particles.length = 0
  shockwaves.length = 0
  sparks.length = 0
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="layer-juice pointer-events-none fixed inset-0 h-full w-full select-none"
  />
</template>
