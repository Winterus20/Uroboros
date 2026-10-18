<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { sounds } from '../core/audio'
import { useMotionReduced } from '../composables/useMotion'
import { Radio, Zap, ChevronRight, Sparkles, Pause, Gauge } from 'lucide-vue-next'
import { Decimal } from '../core/math'
import { safeConfetti } from '../core/celebrate'
import { NEWS_DATABASE, type NewsItem, type NewsClickResult } from '../game/news'

const store = useGameStore()

// State
const currentNews = ref<NewsItem>(NEWS_DATABASE[0])
const interactiveTextOverride = ref<string | null>(null)
const isDiscoActive = ref(false)
const isFlipped = ref(false)
const heartsGiven = ref<Record<string, number>>({})
const isHovered = ref(false)
const isAnimating = ref(false)
const speedMultiplier = ref<1 | 1.6>(1)
const recentTickers = ref<string[]>([])

const trackContainerRef = ref<HTMLElement | null>(null)
const trackTextRef = ref<HTMLElement | null>(null)

let restartTimer: number | null = null
let resizeObserver: ResizeObserver | null = null
let discoTimeout: number | null = null

// 3 durumlu hareket kapısı — kritik: kısıtlı/devre dışı harekette marquee HİÇ başlatılmaz.
// Kök sınıflar animasyon süresini 0.001s'e çektiği için çalışan bir marquee `animationend`i
// her karede tetikler ve sonsuz haber döngüsü açardı. Haber metni statik gösterilir;
// döndürme işini aşağıdaki JS timer üstlenir (gizli sekmede duraklar, unmount'ta temizlenir).
// Faz E (E3): tek kaynak hareket kapısı — ayar + kök mühür + OS tercihi.
// Scoped marquee'yi global OS media query öldüremez; kapı burada JS'tedir.
const motionReduced = useMotionReduced()
const REDUCED_ROTATE_MS = 9000
let reducedRotateTimer: number | null = null

/** Statik bant modu: tek computed kapı (reaktif — ayar/OS değişince döner). */
function isStaticTicker(): boolean {
  return motionReduced.value
}

/** Statik modda haberleri sabit aralıkla döndüren timer (marquee zinciri olmadan). */
function startReducedRotation() {
  stopReducedRotation()
  reducedRotateTimer = window.setInterval(() => {
    pickNextNews()
  }, REDUCED_ROTATE_MS)
}

function stopReducedRotation() {
  if (reducedRotateTimer !== null) {
    clearInterval(reducedRotateTimer)
    reducedRotateTimer = null
  }
}

// Havuz: Kilitli olmayan ve kriz/şafak aşamasına uygun haberler
const availableNews = computed(() => {
  return NEWS_DATABASE.filter((item) => {
    if (item.unlocked && !item.unlocked(store)) {
      return false
    }
    return true
  })
})

// Anlık haber metni (Statik, Dinamik Fonksiyon veya Tıklama Değişikliği)
const activeText = computed(() => {
  if (interactiveTextOverride.value) {
    return interactiveTextOverride.value
  }
  const item = currentNews.value
  if (typeof item.text === 'function') {
    return item.text(store)
  }
  return item.text
})

/**
 * Yazar vurgusu — ADR-0049 Kural 3 + görsel dil §9.2 ("durum ≠ hue"): haber bandı
 * yalnız nötr slate · bonus cyan · feast ailelerini konuşur. news DB'sindeki geniş
 * authorColor yelpazesi (sky/violet/emerald/amber…) render anında üç tona süzülür;
 * yazar kimliğine göre dağılım korunur, okunabilirlik slate-300 tabanında kalır.
 */
const AUTHOR_TONES = [
  'rgb(203 213 225)', // nötr slate-300
  'rgb(103 232 249)', // bonus cyan-300
  'rgb(var(--feast-rgb))' // feast — tek kaynak: style.css --feast-rgb
] as const

const authorTone = computed((): string => {
  const author = currentNews.value.author
  if (!author) return AUTHOR_TONES[0]
  let hash = 0
  for (let i = 0; i < author.length; i++) hash += author.charCodeAt(i)
  return AUTHOR_TONES[hash % AUTHOR_TONES.length]
})

// Anlık beğeni / kütle rezonansı
const currentLikes = computed(() => {
  const hash = currentNews.value.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const base = 42 + (hash % 137)
  const bonus = heartsGiven.value[currentNews.value.id] || 0
  return base + bonus
})

// Hız hesabı: Taban 100 px/sn; hızlı modda 160 px/sn
const currentPxPerSec = computed(() => {
  const base = store.settings.reduceAnimations ? 70 : 105
  return base * speedMultiplier.value
})

/**
 * Haber metnini çözümler (statik ya da dinamik). Boş metin bandı boş bırakır.
 */
function resolveNewsText(item: NewsItem): string {
  try {
    return typeof item.text === 'function' ? item.text(store) : item.text
  } catch {
    return ''
  }
}

/**
 * Tekrarı engelleyerek sıradaki haberi seç
 */
function pickNextNews() {
  interactiveTextOverride.value = null
  const pool = availableNews.value
  if (!pool.length) {
    currentNews.value = NEWS_DATABASE[0]
    return
  }

  // Son görülen haberleri süz (tampon bellek)
  const candidatePool = pool.filter((item) => !recentTickers.value.includes(item.id))
  const finalPool = candidatePool.length > 0 ? candidatePool : pool

  // Rastgele seç — boş metinli haber gelirse dolu bulunana kadar yeniden seç
  let picked = finalPool[Math.floor(Math.random() * finalPool.length)]
  let guard = 0
  while (!resolveNewsText(picked) && guard < finalPool.length) {
    picked = finalPool[Math.floor(Math.random() * finalPool.length)]
    guard++
  }
  currentNews.value = picked

  // Son görülenlere ekle (maksimum 15 adet sakla)
  recentTickers.value.push(picked.id)
  while (recentTickers.value.length > 15) {
    recentTickers.value.shift()
  }

  // Store'a görüldü olarak işle
  store.recordNewsSeen(picked.id)
}

/**
 * Sağdan sola Antimatter Dimensions tarzı kesintisiz kaydırmayı başlatır
 */
function startScroll() {
  if (restartTimer !== null) {
    clearTimeout(restartTimer)
    restartTimer = null
  }

  isAnimating.value = false

  // Statik bant: marquee sınıfı/animasyonu ve animationend zinciri KURULMAZ;
  // haber döndürmeyi JS rotasyon timer'ı üstlenir.
  if (isStaticTicker()) {
    startReducedRotation()
    return
  }

  nextTick(() => {
    const container = trackContainerRef.value
    const textEl = trackTextRef.value
    if (!container || !textEl) return

    const containerWidth = container.clientWidth || 600
    const textWidth = textEl.scrollWidth || 300

    const startX = containerWidth
    const endX = -(textWidth + 24)
    const totalDistance = startX - endX
    const duration = totalDistance / currentPxPerSec.value

    textEl.style.setProperty('--start-x', `${startX}px`)
    textEl.style.setProperty('--end-x', `${endX}px`)
    textEl.style.setProperty('--ticker-duration', `${duration.toFixed(2)}s`)

    void textEl.offsetWidth
    isAnimating.value = true
  })
}

/**
 * Bir önceki haber sol taraftan tamamen çıktığında tarayıcı tarafından tetiklenir
 */
function onAnimationEnd() {
  // Güvenlik kapısı: statik moddayken zincir ASLA yeniden başlamaz (sonsuz döngü koruması).
  if (isStaticTicker()) return
  pickNextNews()
  startScroll()
}

/**
 * Manuel sonraki habere atlama
 */
function skipNext() {
  sounds.playTallyTick(0.7)
  pickNextNews()
  startScroll()
}

/**
 * Hız değiştirici (1x / 1.6x)
 */
function toggleSpeed() {
  speedMultiplier.value = speedMultiplier.value === 1 ? 1.6 : 1
  sounds.playTallyTick(0.5)
  startScroll()
}

/**
 * Haber bandına tıklama: Taktil rezonans, easter egg tetikleme & kütle ödülü
 */
function handleTickerClick(e: MouseEvent) {
  const item = currentNews.value
  heartsGiven.value[item.id] = (heartsGiven.value[item.id] || 0) + 1

  // Ekran koordinatında hafif kuantum halka dalgası
  window.dispatchEvent(
    new CustomEvent('doomscroll:heart', {
      detail: { x: e.clientX, y: e.clientY }
    })
  )

  // Dokunsal titreşim (Haptic)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(8)
    } catch {
      /* yoksay */
    }
  }

  // Tıklama istatistiği & Gizli haber kontrolü
  const isSecret = item.category === 'secret'
  store.recordNewsClick(isSecret)

  // Özel onClick eylemi varsa çalıştır
  if (item.onClick) {
    const result = item.onClick(store) as NewsClickResult | string | void
    if (result) {
      if (typeof result === 'string') {
        interactiveTextOverride.value = result
      } else {
        if (result.updatedText) {
          interactiveTextOverride.value = result.updatedText
        }
        if (result.effect === 'shake') {
          window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'medium' } }))
          sounds.playAnomaly()
        }
        if (result.effect === 'disco') {
          isDiscoActive.value = true
          sounds.playMythicCollect()
          if (discoTimeout) clearTimeout(discoTimeout)
          discoTimeout = window.setTimeout(() => {
            isDiscoActive.value = false
          }, 3500)
        }
        if (result.effect === 'flip') {
          isFlipped.value = !isFlipped.value
          sounds.playTallyTick(0.8)
        }
        if (result.effect === 'confetti') {
          sounds.playMythicCollect()
          safeConfetti({
            particleCount: 65,
            spread: 60,
            origin: { y: 0.15 },
            // ADR-0049 Kural 3: konfeti yalnız feast · bonus cyan · prestij amber ailesinden.
            colors: ['#ff3355', '#06b6d2', '#f59e0b']
          })
        }
        if (result.bonusMatter) {
          try {
            store.addMatter(result.bonusMatter, true)
          } catch {
            /* break_eternity koruması */
          }
        }
      }
      return
    }
  }

  // Standart kuantum rezonans kütle ödülü (+%20 saniyelik üretim veya 10 taban kütle)
  try {
    const mps = store.matterPerSecond
    const reward = mps.gt(0) ? mps.times(0.2) : new Decimal(10)
    store.addMatter(reward, true)
  } catch {
    /* break_eternity koruması */
  }

  sounds.playTallyTick(0.6)
}

function handleVisibilityChange() {
  if (document.hidden) {
    // Statik rotasyon gizli sekmede duraklar (görünür olunca aşağıdaki dal devam ettirir).
    stopReducedRotation()
    return
  }
  if (!isAnimating.value) {
    startScroll()
  }
}

// Ayar/OS değişince canlı uygula: kısıtlı → statik + JS rotasyon; full → marquee.
watch(motionReduced, (reduced) => {
  if (reduced) {
    if (restartTimer !== null) {
      clearTimeout(restartTimer)
      restartTimer = null
    }
    // Koşan marquee'yi durdur: animasyon sınıfı kalkar, animationend zinciri kırılır.
    isAnimating.value = false
    startReducedRotation()
  } else {
    stopReducedRotation()
    startScroll()
  }
})

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)

  if (typeof ResizeObserver !== 'undefined' && trackContainerRef.value) {
    let lastWidth = trackContainerRef.value.clientWidth
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width
        if (Math.abs(newWidth - lastWidth) > 30) {
          lastWidth = newWidth
          startScroll()
        }
      }
    })
    resizeObserver.observe(trackContainerRef.value)
  }

  // İlk başlangıç
  pickNextNews()
  restartTimer = window.setTimeout(() => {
    startScroll()
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (restartTimer !== null) {
    clearTimeout(restartTimer)
    restartTimer = null
  }
  stopReducedRotation()
  if (discoTimeout !== null) {
    clearTimeout(discoTimeout)
    discoTimeout = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<template>
  <div class="w-full max-w-5xl mx-auto py-0.5 select-none mb-3">
    <div
      class="flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[var(--ds-panel)] backdrop-blur-md shadow-xs text-xs relative overflow-hidden transition-all hover:border-cyan-500/30 group"
    >
      <!-- Sol: İkon & Canlı Yayın LED Rozeti (Antimatter Dimensions tarzı) -->
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <div class="flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
          <Radio class="w-3 h-3 text-cyan-400 shrink-0" />
          <span class="hidden sm:inline">KOZMİK HABER</span>
        </div>
      </div>

      <div class="h-3.5 w-px bg-white/10 shrink-0 hidden sm:block"></div>

      <!-- Orta: Sağdan Sola Kesintisiz Kayan Haber Bandı (Marquee Track) -->
      <div
        ref="trackContainerRef"
        class="relative flex-1 overflow-hidden h-6 flex items-center min-w-0 cursor-pointer"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
        @click="handleTickerClick"
      >
        <!-- Sol & Sağ Kenar Yumuşak Gradyan Maskeleri -->
        <div class="pointer-events-none absolute left-0 inset-y-0 w-6 bg-gradient-to-r from-[var(--ds-panel)] to-transparent z-10"></div>
        <div class="pointer-events-none absolute right-0 inset-y-0 w-6 bg-gradient-to-l from-[var(--ds-panel)] to-transparent z-10"></div>

        <!-- Üzerine Gelindiğinde 'Duraklatıldı' İpucu Rozeti -->
        <transition name="fade">
          <div
            v-if="isHovered"
            class="pointer-events-none absolute right-8 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-black/80 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 backdrop-blur-xs shadow-xs"
          >
            <Pause class="w-2.5 h-2.5 text-cyan-400" />
            <span>DURAKLATILDI</span>
          </div>
        </transition>

        <!-- Kayan Metin Elemanı -->
        <div
          ref="trackTextRef"
          :class="[
            'ticker-track',
            {
              'is-animating': isAnimating,
              'is-paused': isHovered,
              'is-flipped': isFlipped
            }
          ]"
          @animationend="onAnimationEnd"
        >
          <div class="flex items-center gap-2 font-mono text-[11px] pr-8">
            <!-- Yazar / Kaynak Rozeti -->
            <span
              v-if="currentNews.author"
              class="font-bold shrink-0 tracking-wide text-[10px]"
              :style="{ color: authorTone }"
            >
              {{ currentNews.author }}:
            </span>

            <!-- Özel Kategori İkonu -->
            <Sparkles
              v-if="currentNews.category === 'secret' || isDiscoActive"
              class="w-3.5 h-3.5 text-white shrink-0 animate-pulse"
            />

            <!-- Haber Metni -->
            <span
              class="text-slate-200 font-normal tracking-tight"
              :class="{ 'text-white font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.28)]': currentNews.category === 'secret' }"
            >
              {{ activeText }}
            </span>
          </div>
        </div>
      </div>

      <div class="h-3.5 w-px bg-white/10 shrink-0"></div>

      <!-- Sağ: Hız Ayarı, Kuantum Rezonans Butonu & İleri Atlama -->
      <div class="flex items-center gap-1.5 shrink-0">
        <!-- Hız Düğmesi (1x / 1.6x) -->
        <button
          type="button"
          class="btn-tactile hidden xs:flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.06] transition-all text-[9px] font-mono cursor-pointer"
          @click.stop="toggleSpeed"
          aria-label="Akış hızını değiştir"
        >
          <Gauge class="w-2.5 h-2.5 text-slate-400" />
          <span>{{ speedMultiplier }}x</span>
        </button>

        <!-- Kütle Rezonans Butonu (+Kütle) -->
        <button
          type="button"
          class="btn-tactile flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/25 transition-all active:scale-95 cursor-pointer"
          @click.stop="handleTickerClick"
          aria-label="Kozmik habere rezonans aktar"
        >
          <Zap class="w-3 h-3 text-cyan-400 shrink-0" />
          <span class="text-[10px] font-mono tabular-nums font-bold">{{ currentLikes }}</span>
        </button>

        <!-- Sonraki Habere Atla (Antimatter Dimensions Fast-Forward) -->
        <button
          type="button"
          class="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
          @click.stop="skipNext"
          aria-label="Sonraki habere geç"
        >
          <ChevronRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes ticker-slide {
  0% {
    transform: translate3d(var(--start-x, 600px), 0, 0);
  }
  100% {
    transform: translate3d(var(--end-x, -600px), 0, 0);
  }
}

.ticker-track {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  will-change: transform;
  transition: transform 0.2s ease;
}

.ticker-track.is-animating {
  animation: ticker-slide var(--ticker-duration, 14s) linear forwards;
}

.ticker-track.is-paused {
  animation-play-state: paused !important;
}

.ticker-track.is-flipped {
  transform: rotate(180deg);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
