<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { useMotionReduced } from '../composables/useMotion'
import { safeConfetti } from '../core/celebrate'
import { sounds } from '../core/audio'
import {
  TIME_CLOCK_DECAY_BASE_PER_SEC,
  TIME_CLOCK_LIFETIME_SECONDS,
  TIME_CLOCK_PERFECT_DURATION_MULT,
  TIME_CLOCK_PERFECT_TENSION,
  releaseProfitRatio,
  streakPeakBonus
} from '../game/clock-data'

/**
 * Zaman Yayı (Time Clock) — §8.1.
 *
 * Katman: `#game-main-content` KARDEŞİ (ADR-0044) — kök `position: fixed`
 * screen-shake transform'unun içine asla girmez. Kök `pointer-events-none`,
 * yalnız saat gövdesi `pointer-events-auto` (oyunun geri kalanı tıklanabilir kalır).
 *
 * Girdi: repoda ilk dairesel (rotary) sürükleme. `pointerdown` → `setPointerCapture`
 * → merkeze göre `atan2` açısı → her adım (-π, π] aralığına indirgenir (unwrap) →
 * YALNIZ saat yönünün tersi dilimi `windTimeClock(delta)`'ya POZİTİF radyan olarak
 * beslenir. `pointerup` / `pointercancel` / `lostpointercapture` → `releaseTimeClock()`.
 * Space/Escape bağlanmaz (Header.vue Space'i sahiplenir); Enter salar.
 */

const store = useGameStore()
const motionReduced = useMotionReduced()

// --- Görünürlük / faz okumaları -------------------------------------------
const isWinding = computed(() => store.timeClockIsWinding)
const isReleasing = computed(() => store.timeClockIsReleasing)
const visible = computed(() => store.timeClock.phase !== 'idle')

/**
 * Salgı fazında kadran merkezi TERK EDER: sağ kenara süzülüp küçülür.
 * Sarma fazında taşınamaz — parmak kadranın merkezine göre açı ölçüyor
 * (`pointerSample` her örnekte `getBoundingClientRect`), kadran kaysa jest
 * bozulurdu. Bu yüzden yerleşme YALNIZ salgıda olur (salgı zaten ≤75 sn).
 */
const docked = computed(() => isReleasing.value)

// --- Okumalar (mekanik girdisi hareket kapısından ETKİLENMEZ) --------------
const tension = computed(() => store.timeClockTension)
const tensionPct = computed(() => Math.round(clamp01(tension.value) * 100))
const rewoundSeconds = computed(() => store.timeClockRewoundSeconds)
const previewPeak = computed(() => store.timeClockPreviewPeakSpeed)
const previewDuration = computed(() => store.timeClockPreviewDuration)
const handAngleDeg = computed(() => store.timeClockHandAngleDeg)
const speed = computed(() => store.timeClock.speed)
const speedRemaining = computed(() => store.timeClock.speedRemaining)
const remainingTime = computed(() => store.timeClock.remainingTime)

const profitRatio = computed(() => releaseProfitRatio(tension.value))
/**
 * Uyari esigi SABIT DEGIL, ekonomiden turetilir: salgi enerjisi geri sarilan
 * sureden azsa net zarardir (basabas ≈ gerginlik 0.345). Sabit 0.3 yazmak
 * uyariyi yanlis yere koyardi — `profitRatio` zaten hesaplaniyor.
 */
const weakRelease = computed(() => profitRatio.value < 1)
// v2: Kusursuz önizleme + seri + görünür sonum.
const isPerfectPreview = computed(() => tension.value >= TIME_CLOCK_PERFECT_TENSION)
const perfectBonusPct = Math.round((TIME_CLOCK_PERFECT_DURATION_MULT - 1) * 100)
const decayLabel = computed(() =>
  (TIME_CLOCK_DECAY_BASE_PER_SEC * (0.5 + 0.5 * tension.value) * 100).toFixed(1)
)
const clockStreak = computed(() => store.stats.clockStreak)
const streakBonusPct = computed(() =>
  Math.round((streakPeakBonus(clockStreak.value + 1) - 1) * 100)
)
const profitLabel = computed(() => profitRatio.value.toFixed(2))
const rewoundLabel = computed(() => Math.max(0, Math.round(rewoundSeconds.value)))
const previewPeakLabel = computed(() => Math.max(0, previewPeak.value).toFixed(1))
const previewDurationLabel = computed(() => Math.max(1, Math.round(previewDuration.value)))
const speedLabel = computed(() => Math.max(1, speed.value).toFixed(1))
const speedRemainingLabel = computed(() => Math.max(0, Math.ceil(speedRemaining.value)))
const remainingLabel = computed(() => Math.max(0, Math.ceil(remainingTime.value)))

const ariaValueText = computed(() => {
  if (isReleasing.value) return `Zaman hızı ${speedLabel.value} kat, ${speedRemainingLabel.value} saniye kaldı`
  return `Gerginlik yüzde ${tensionPct.value}, geri sarılan ${rewoundLabel.value} saniye, tahmini tepe hız ${previewPeakLabel.value} kat, ${previewDurationLabel.value} saniye`
})

// --- Salgı anı yakalama: kaynak değerler (store `drag`'i salarken sıfırlar) ---
// Bu ref'ler kadran geometrisinden ÖNCE tanımlanır: `lifePct` salgı oranını okur.
const frozenHandDeg = ref(0)
const frozenRewoundSn = ref(0)
const releaseFromDeg = ref(0)
const releaseDurationS = ref(TIME_CLOCK_LIFETIME_SECONDS)
const peakSpeed = ref(1)
const releaseTension = ref(0)
const releaseCount = ref(0)
/** v2: salgi aninda kusursuz esik asildi mi (altin efekt/rozet). */
const wasPerfect = ref(false)

// --- Kadran geometrisi (viewBox 0 0 200 200, merkez 100,100) ---------------
const LIFE_R = 88
const TENSION_R = 76
const LIFE_CIRC = 2 * Math.PI * LIFE_R
const TENSION_CIRC = 2 * Math.PI * TENSION_R

// v2: KUSURSUZ bölge işareti — gerginlik yayının son dilimi (altın).
const PERFECT_FRACTION = 1 - TIME_CLOCK_PERFECT_TENSION
const perfectDash =
  (TENSION_CIRC * PERFECT_FRACTION).toFixed(1) + ' ' + (TENSION_CIRC * (1 - PERFECT_FRACTION)).toFixed(1)
const perfectDashOffset = (-TENSION_CIRC * (1 - PERFECT_FRACTION)).toFixed(1)

const lifePct = computed(() => {
  // Sarma fazında: saatin ekranda kalan ömrü (`remainingTime`).
  // Salgı fazında: salgının kalan oranı (`speedRemaining`) — halka fazın saatidir.
  if (isReleasing.value) return clamp01(speedRemaining.value / Math.max(1, releaseDurationS.value))
  return clamp01(remainingTime.value / Math.max(1, TIME_CLOCK_LIFETIME_SECONDS))
})
const lifeRingColor = computed(() => (isReleasing.value ? '#a855f7' : '#22d3ee'))
const lifeDashArray = LIFE_CIRC.toFixed(1)
const lifeDashOffset = computed(() => (LIFE_CIRC * (1 - lifePct.value)).toFixed(1))
const tensionDashArray = TENSION_CIRC.toFixed(1)
const tensionDashOffset = computed(() => (TENSION_CIRC * (1 - clamp01(tension.value))).toFixed(1))

/** 60 çentik: her 5'inci majör (saat başı). */
interface ClockTick {
  angle: number
  major: boolean
}
const TICKS: ClockTick[] = Array.from({ length: 60 }, (_, i) => ({
  angle: i * 6,
  major: i % 5 === 0
}))

const handTransform = computed(() => `rotate(${handAngleDeg.value.toFixed(2)} 100 100)`)

/** Gerginlik kademesi → dış hale (dekoratif; okuma/girdiyi etkilemez). */
const heatClass = computed(() => {
  if (!isWinding.value) return ''
  if (tension.value >= 0.8) return 'clock-dial-hot'
  if (tension.value >= 0.5) return 'clock-dial-warm'
  return ''
})

/** v2: Aşırı gerilme (≥ %97) — yay çatlıyor; kozmetik tremble (motion gate'li). */
const strainClass = computed(() =>
  isWinding.value && !motionReduced.value && tension.value >= 0.97 ? 'clock-dial-strain' : ''
)

// --- Salgı anı yakalama: store `drag`'i sıfırlar, ibre nereden devam edecek --
watch(
  () => ({
    winding: store.timeClockIsWinding,
    angle: store.timeClockHandAngleDeg,
    tension: store.timeClockTension,
    rewound: store.timeClockRewoundSeconds
  }),
  (state) => {
    if (!state.winding) return
    frozenHandDeg.value = state.angle
    releaseTension.value = state.tension
    frozenRewoundSn.value = state.rewound
  },
  { immediate: true }
)

watch(
  () => store.timeClock.phase,
  (phase, previous) => {
    if (previous !== 'winding' || phase !== 'released') return
    releaseFromDeg.value = frozenHandDeg.value
    releaseDurationS.value = Math.max(1, store.timeClock.speedRemaining)
    peakSpeed.value = store.timeClock.peakSpeed
    releaseCount.value = store.stats.clockRewinds
    wasPerfect.value = releaseTension.value >= TIME_CLOCK_PERFECT_TENSION
    fireReleaseEffects(releaseTension.value)
  }
)

const releaseStyle = computed(() => ({
  '--clock-hand-from': `${releaseFromDeg.value.toFixed(2)}deg`,
  '--clock-release-duration': `${releaseDurationS.value.toFixed(2)}s`
}))

const releasePeakLabel = computed(() => Math.max(1, peakSpeed.value).toFixed(1))

// --- Dairesel sürükleme (rotary input) ------------------------------------
const dialRef = ref<HTMLElement | null>(null)
const dragging = ref(false)

/** Kadran yarıçapının bu oranından merkeze yakın örnekler açı-gürültülüdür. */
const DEAD_ZONE_RATIO = 0.06

interface PointerSample {
  /** Matematik yönü: saat yönünün TERSİ = artan açı. */
  angle: number
  /** Merkez kuyusu: açı kararsız, sarma beslenmez (yalnız taban hizalanır). */
  inDeadZone: boolean
}

let activePointerId: number | null = null
let lastPointerAngle = 0
let lastPointerInDeadZone = true
let windRatchet = 0

/** Radyan → tek adımda (-π, π] aralığına indirge (unwrap). */
function unwrapDelta(delta: number): number {
  let d = delta
  while (d > Math.PI) d -= Math.PI * 2
  while (d <= -Math.PI) d += Math.PI * 2
  return d
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** Kadran merkezine göre açı + yarıçap (tek ölçüm; layout okuması burada). */
function pointerSample(event: PointerEvent): PointerSample | null {
  const el = dialRef.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  const dx = event.clientX - (rect.left + rect.width / 2)
  const dy = event.clientY - (rect.top + rect.height / 2)
  const radius = Math.sqrt(dx * dx + dy * dy)
  // Ekran y'si aşağı büyür: işareti çevir → saat yönünün tersi = POZİTİF artış.
  return { angle: Math.atan2(-dy, dx), inDeadZone: radius < rect.width * DEAD_ZONE_RATIO }
}

function onPointerDown(event: PointerEvent) {
  if (!isWinding.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const el = dialRef.value
  const sample = pointerSample(event)
  if (!el || sample === null) return
  activePointerId = event.pointerId
  lastPointerAngle = sample.angle
  lastPointerInDeadZone = sample.inDeadZone
  windRatchet = 0
  dragging.value = true
  try {
    el.setPointerCapture(event.pointerId)
  } catch {
    /* pointer capture opsiyonel — sürükleme yine de çalışır */
  }
}

function onPointerMove(event: PointerEvent) {
  if (activePointerId === null || event.pointerId !== activePointerId) return
  if (!isWinding.value) {
    endDrag()
    return
  }
  const sample = pointerSample(event)
  if (sample === null) return
  // Merkez kuyusu: açı burada kararsızdır. Sarma BESLENMEZ, yalnız taban
  // hizalanır — böylece merkezden tutup dışa kaydırmak yayı sıçratmaz.
  if (sample.inDeadZone || lastPointerInDeadZone) {
    lastPointerAngle = sample.angle
    lastPointerInDeadZone = sample.inDeadZone
    return
  }
  const delta = unwrapDelta(sample.angle - lastPointerAngle)
  lastPointerAngle = sample.angle
  lastPointerInDeadZone = false
  // YALNIZ saat yönünün tersi dilimi beslenir; ileri çevirme yayı gevşetmez.
  if (delta <= 0) return
  store.windTimeClock(delta)
  windRatchet += delta
  // Kurma tıkırtısı: ~17°'de bir tetik; metodun kendi 90ms throttle'ı üstüne biner.
  if (windRatchet >= 0.3) {
    windRatchet = 0
    sounds.playClockWind(Math.min(1, Math.max(0.15, tension.value)))
  }
}

function endDrag() {
  if (activePointerId === null) return
  const el = dialRef.value
  const id = activePointerId
  activePointerId = null
  dragging.value = false
  windRatchet = 0
  if (el !== null) {
    try {
      if (el.hasPointerCapture(id)) el.releasePointerCapture(id)
    } catch {
      /* capture zaten bırakılmış olabilir */
    }
  }
  // Store guard'lı: yalnız `winding` fazında salar (çift çağrı zararsız).
  store.releaseTimeClock()
}

function onEnterKey() {
  if (!isWinding.value) return
  store.releaseTimeClock()
}

/**
 * v2: Klavye ile sarma — Sol/Aşağı ok tuşu başına sabit radyan besler
 * (işaretçi erişilemezken klavye yoluyla tam sarma mümkün olur).
 */
const KEY_WIND_RADIANS = 0.35
function onKeyWind() {
  if (!isWinding.value) return
  store.windTimeClock(KEY_WIND_RADIANS)
  sounds.playClockWind(Math.min(1, Math.max(0.15, tension.value)))
}

function onPointerUp() {
  endDrag()
}

function onLostPointerCapture() {
  endDrag()
}

onBeforeUnmount(() => {
  const el = dialRef.value
  const id = activePointerId
  activePointerId = null
  dragging.value = false
  if (el === null || id === null) return
  try {
    if (el.hasPointerCapture(id)) el.releasePointerCapture(id)
  } catch {
    /* unmount sırasında capture bırakma başarısız olabilir */
  }
})

// --- Salgı efektleri (YALNIZ dekoratif — motion gate'li) -------------------
function fireReleaseEffects(tensionAtRelease: number) {
  const t = clamp01(tensionAtRelease)
  const perfect = wasPerfect.value
  const text = perfect
    ? `KUSURSUZ SALGI ×${Math.max(1, peakSpeed.value).toFixed(1)}`
    : `ZAMAN YAYI ×${Math.max(1, peakSpeed.value).toFixed(1)}`
  // Azaltılmış hareket: konfeti/şok dalgası/shake yok. Okuma ve girdi etkilenmez.
  if (motionReduced.value) return
  // v2: kusursuz salgı ALTIN paletle kutlanır.
  // Görsel dil sözleşmesi §2: amber/altın TEK TON #f59e0b (prestij/milestone).
  // Kusursuz salgı = saatin milestone anı → altın+ring (§9.4 bir semantik = bir görsel).
  const palette = perfect ? ['#f59e0b', '#ffffff'] : ['#22d3ee', '#a855f7', '#ffffff']
  safeConfetti({
    particleCount: (perfect ? 70 : 40) + Math.round(t * 80),
    spread: 90,
    origin: { x: 0.5, y: 0.45 },
    colors: palette,
    disableForReducedMotion: true
  })
  const x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0
  const y = typeof window !== 'undefined' ? window.innerHeight * 0.45 : 0
  // Şölen sahnesi reçetesi `shake: 'hard'` taşır (JuiceLayer onu kendi yayar);
  // burada ayrıca shake yayılır ki sahne suppression penceresine düşse bile
  // salgı hissi kaybolmasın.
  window.dispatchEvent(
    new CustomEvent('doomscroll:feast-scene', {
      detail: { scene: 'time_warp', text, color: perfect ? '#f59e0b' : '#22d3ee' }
    })
  )
  window.dispatchEvent(
    new CustomEvent('doomscroll:shake', { detail: { level: 'hard' } })
  )
  window.dispatchEvent(
    new CustomEvent('doomscroll:shockwave', {
      detail: { x, y, color: perfect ? '#f59e0b' : '#22d3ee', maxRadius: 200 + Math.round(t * 120) }
    })
  )
  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: `−${Math.max(0, Math.round(frozenRewoundSn.value))} sn → ×${Math.max(1, peakSpeed.value).toFixed(1)}`,
        color: '#a855f7'
      }
    })
  )
}
</script>

<template>
  <div class="layer-clock pointer-events-none fixed inset-0 w-screen h-screen max-w-full max-h-full overflow-hidden">
    <!-- Sahne: sarma anında ekranın ortasında dev kadran; salgıya geçince
         sağ kenara süzülüp küçülür (`clock-stage--dock`) — merkez serbest kalır.
         Kadran sahneyi tam doldurur (boyut `style.css` → `.clock-dial`
         `width/height: 100%`); ölçü ve konum tek yerde, CSS değişkeninde. -->
    <div
      v-if="visible"
      class="clock-stage"
      :class="{ 'clock-materialize': !motionReduced, 'clock-stage--dock': docked }"
    >
      <!-- ================= SAAT GÖVDESİ (tek pointer-events-auto alan) ========= -->
      <div
        ref="dialRef"
        class="clock-dial relative select-none"
        :class="[
          heatClass,
          strainClass,
          motionReduced ? 'clock-static' : '',
          isWinding ? 'pointer-events-auto cursor-grab' : 'pointer-events-none cursor-default',
          dragging ? 'cursor-grabbing clock-dial-grabbed' : ''
        ]"
        role="slider"
        :tabindex="isWinding ? 0 : -1"
        aria-label="Zaman Yayı kadranı: ibreyi saat yönünün tersine çevirerek zamanı geri sar, bırakarak zaman hızı salgısını tetikle"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="tensionPct"
        :aria-valuetext="ariaValueText"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @lostpointercapture="onLostPointerCapture"
        @keydown.enter.prevent="onEnterKey"
        @keydown.left.prevent="onKeyWind"
        @keydown.down.prevent="onKeyWind"
        @contextmenu.prevent
      >
        <svg
          class="absolute inset-0 w-full h-full"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="clock-tension-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#00f0ff" />
              <stop offset="55%" stop-color="#22d3ee" />
              <stop offset="100%" stop-color="#a855f7" />
            </linearGradient>
            <radialGradient id="clock-core-grad" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stop-color="#0a0608" />
              <stop offset="62%" stop-color="rgba(18, 11, 14, 0.92)" />
              <stop offset="100%" stop-color="#00f0ff" stop-opacity="0.28" />
            </radialGradient>
          </defs>

          <!-- Kadran zemini -->
          <circle cx="100" cy="100" r="96" fill="url(#clock-core-grad)" opacity="0.9" />

          <!-- Dış halka -->
          <circle cx="100" cy="100" r="94" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />

          <!-- 60 çentik: her 5'inci majör -->
          <line
            v-for="tick in TICKS"
            :key="tick.angle"
            x1="100"
            :y1="tick.major ? 8 : 12"
            x2="100"
            :y2="tick.major ? 22 : 17"
            :stroke="tick.major ? 'rgba(226,232,240,0.55)' : 'rgba(148,163,184,0.28)'"
            :stroke-width="tick.major ? 2 : 1"
            :transform="`rotate(${tick.angle} 100 100)`"
          />

          <!-- Ömür halkası + gerginlik yayı (üstten başlar) -->
          <g transform="rotate(-90 100 100)">
            <circle
              cx="100"
              cy="100"
              :r="LIFE_R"
              stroke="rgba(255,255,255,0.08)"
              stroke-width="3"
            />
            <circle
              cx="100"
              cy="100"
              :r="LIFE_R"
              :stroke="lifeRingColor"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="lifeDashArray"
              :stroke-dashoffset="lifeDashOffset"
              opacity="0.85"
            />
            <!-- Gerginlik yayı: aynalı grup → yay SAAT YÖNÜNÜN TERSİNE büyür
                 (ibre de tersine döndüğü için görsel dil tutarlı kalır). -->
            <g transform="translate(200 0) scale(-1 1)">
              <circle
                v-if="isWinding"
                cx="100"
                cy="100"
                :r="TENSION_R"
                :stroke="weakRelease ? '#f43f5e' : 'url(#clock-tension-grad)'"
                stroke-width="7"
                stroke-linecap="round"
                :stroke-dasharray="tensionDashArray"
                :stroke-dashoffset="tensionDashOffset"
                class="clock-tension-arc"
              />
              <!-- v2: KUSURSUZ bölge — yayın son dilimi (altın); oyuncu hedefi
                   kadran ÜZERİNDE görür, ayrı hesap yapması gerekmez. -->
              <circle
                cx="100"
                cy="100"
                :r="TENSION_R"
                stroke="#f59e0b"
                stroke-width="7"
                stroke-linecap="round"
                :stroke-dasharray="perfectDash"
                :stroke-dashoffset="perfectDashOffset"
                class="clock-perfect-zone"
              />
            </g>
          </g>

          <!-- Dekoratif nabız halkası (yalnız sarma fazında, motion gate'li) -->
          <circle
            v-if="isWinding && !motionReduced"
            cx="100"
            cy="100"
            r="66"
            stroke="rgba(0,240,255,0.35)"
            stroke-width="1"
            stroke-dasharray="4 9"
            class="clock-ring-pulse"
          />

          <!-- İBRE: dış grup CSS salgı dönüşü, iç grup sarma açısı -->
          <g class="clock-hand-layer" :class="{ 'clock-hand-release': isReleasing && !motionReduced }" :style="releaseStyle">
            <g :transform="handTransform">
              <line x1="100" y1="100" x2="100" y2="28" stroke="#00f0ff" stroke-width="3.4" stroke-linecap="round" />
              <line x1="100" y1="100" x2="100" y2="28" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.65" />
              <circle cx="100" cy="28" r="4.2" fill="#ffffff" />
              <circle cx="100" cy="28" r="8" fill="#00f0ff" opacity="0.22" />
            </g>
          </g>

          <!-- Merkez göbeği -->
          <circle cx="100" cy="100" r="12" fill="#05070c" stroke="rgba(0,240,255,0.45)" stroke-width="1.5" />
          <circle cx="100" cy="100" r="4.5" fill="#00f0ff" opacity="0.85" />
        </svg>

        <!-- Merkez okuma (dev sayaç): salgıya geçişte solar, yerini kompakt
             okumaya bırakır. `v-show` DEĞİL → opacity geçişi kırpılmasın.
             `aria-hidden` faz ile bağlı: solmuş okuma ekran okuyucuya düşmesin
             (durumu zaten `aria-valuetext` anlatıyor). -->
        <div
          class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-200"
          :class="isWinding ? 'opacity-100' : 'opacity-0'"
          :aria-hidden="!isWinding"
        >
          <!-- Tipografi sözleşmesi §7: hero sayaç = font-display (m6x11plus),
               18-px ızgarası (36/54), sentetik bold YOK, tracking ELLE DÜZELTMEZ. -->
          <span class="font-display text-[36px] sm:text-[54px] text-white counter-glow tabular-nums leading-none">
            %{{ tensionPct }}
          </span>
          <span class="font-mono text-[10px] tracking-[0.32em] text-cyan-300/80 mt-1">GERGİNLİK</span>
          <span class="font-mono text-[11px] sm:text-xs text-violet-200 tabular-nums mt-1.5">
            −{{ rewoundLabel }} sn geri sarıldı
          </span>
        </div>

        <!-- Kompakt okuma (sağ kenardaki küçük hâl): küçülme bitmeden yazı
             sıçramasın diye gecikmeli belirir -->
        <div
          class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-300 delay-[260ms]"
          :class="isReleasing ? 'opacity-100' : 'opacity-0'"
          :aria-hidden="!isReleasing"
        >
          <span class="font-mono text-[18px] text-quantum-blue counter-glow tabular-nums leading-none">
            ×{{ speedLabel }}
          </span>
          <span class="font-mono text-[9px] text-cyan-200/85 tabular-nums mt-0.5">
            {{ speedRemainingLabel }} sn
          </span>
        </div>
      </div>

      <!-- ================= BİLGİ PANELİ (pointer-events-none) ================= -->
      <div
        v-if="isWinding"
        class="pointer-events-none absolute left-1/2 top-full mt-3 sm:mt-4 flex w-[min(92vw,520px)] -translate-x-1/2 flex-col items-center gap-2"
      >
        <!-- GIC L2 kolaj dokunuşu (görsel dil sözleşmesi §4): tape köşeleri +
             el yazısı notu. FAZ KAPISI: --substrate-opacity (K0'da 0 → görünmez,
             K1+ aşınır) — K0 steril kumarhane kuralı burada da geçerli.
             Yalnız AMBIENT katman: sayı/etiket/ramp bu sınıflara GİRMEZ
             (okunabilirlik kanonu). -->
        <div class="collage-tape" style="top: -7px; left: 9%; transform: rotate(-8deg)" aria-hidden="true"></div>
        <div class="collage-tape" style="top: -7px; right: 9%; transform: rotate(7deg)" aria-hidden="true"></div>
        <span
          class="collage-scrawl font-hand"
          style="bottom: -20px; left: 7%; transform: rotate(-4deg)"
          aria-hidden="true"
        >daha çok çevir!</span>
        <div class="progress-track progress-track-md progress-track-bordered w-full">
          <div
            class="progress-fill duration-75"
            :class="weakRelease ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-violet-500'"
            :style="{ width: `${tensionPct}%` }"
          ></div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-1.5">
          <span class="clock-chip">GERGİNLİK %{{ tensionPct }}</span>
          <span class="clock-chip">GERİ SARILAN {{ rewoundLabel }} sn</span>
          <span class="clock-chip clock-chip-forecast">TAHMİN {{ previewPeakLabel }}× / {{ previewDurationLabel }} sn</span>
          <span v-if="!weakRelease" class="clock-chip clock-chip-profit">KÂR {{ profitLabel }}×</span>
          <span class="clock-chip">KALAN {{ remainingLabel }} sn</span>
          <span v-if="clockStreak >= 1" class="clock-chip clock-chip-profit">SERİ ×{{ clockStreak }} (+%{{ streakBonusPct }})</span>
          <span v-if="isPerfectPreview" class="clock-chip clock-chip-perfect">KUSURSUZ! SÜRE +%{{ perfectBonusPct }}</span>
          <span class="clock-chip">SONUM −%{{ decayLabel }}/sn</span>
        </div>

        <div
          v-if="weakRelease"
          class="clock-warn px-3 py-1 rounded-full border border-rose-500/60 bg-rose-950/70 font-mono text-[11px] font-bold text-rose-200 animate-pulse"
        >
          ZAYIF SALGI — NET ZARAR
        </div>

        <p class="font-mono text-[10px] text-slate-400 text-center leading-tight">
          İbreyi saat yönünün TERSİNE çevir · bırakınca zaman hızlanır · Enter = bırak
        </p>
      </div>

      <!-- Salgı bilgisi: kenara yerleşmiş küçük kadranın ALTINDA, sağa yaslı
           dar çipler. Girişi gecikmeli (`.clock-dock-info`): çipler sahneyle
           birlikte uçarken 0.68 sn boyunca okunmasın, kadran oturunca gelsin. -->
      <div
        v-else-if="isReleasing"
        class="clock-dock-info pointer-events-none absolute right-0 top-full mt-1.5 flex flex-col items-end gap-1 whitespace-nowrap"
      >
        <span v-if="wasPerfect" class="clock-chip clock-chip-perfect">KUSURSUZ</span>
        <span class="clock-chip clock-chip-profit">TEPE {{ releasePeakLabel }}×</span>
        <span class="clock-chip">{{ releaseCount }}. salgı</span>
      </div>
    </div>
  </div>
</template>
