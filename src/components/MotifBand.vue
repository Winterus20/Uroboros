<script setup lang="ts">
/**
 * MotifBand — Boost anı yan motif bandı (Faz C "Aç Kumarhane", L3).
 *
 * Sözleşme: visual-language.md §5 + plan §6 (C3) · ADR-0049 doz kuralı.
 * - Kozmik Dalgalanma tetiklendiğinde (yüzen anomali VEYA aktif buff artışı)
 *   ekranın iki yanından GIC motifleri süzülür.
 * - Rezonans kombosunda (7x + 777x) yoğunluk katlanır (daha çok glif + opaklık).
 * - Motif seti bozulma seviyesinden gelir (`motifsForCorruption`); K0 steril
 *   olduğu için bant K1+ seviyelerde görünür.
 * - ÖMÜR (A5-12 · ADR-0049 doz): buff 25-120 sn sürebildiği için bant buff
 *   süresince akmaz. Her tetikleme 7 sn görünür + 0.9 sn söner; yeni tetikleme
 *   için 500 ms suppression (partikül deseniyle aynı pencere).
 * - PENCERE (A5-05): her tetiklemede `cycle` artar → dizi 0. indeksten değil
 *   kaydırılmış pencereden başlar; sonlu döngüde 16 motifin tamamı görünür.
 * - BÜTÇE (A5-10 · brief §1): yarım başına normal 4 / dense 7 glif × 2 yarım
 *   × 2 taraf = DOM'da normal 16, dense 28 kopya (28 tavanı).
 * - Kapılar: motion `off` → render yok; `reduced` → statik bant; `batterySaver`
 *   → gizli (CSS + TS çift kapı). Bileşen sayı/etiket okumaz, tıklanamaz.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { useMotionMode } from '../composables/useMotion'
import { buildMotifStrip } from '../game/motifs'

const store = useGameStore()
const motionMode = useMotionMode()

const corruptionLevel = computed(() => store.corruptionLevel)
const isDense = computed(() => store.isComboActive)

/** Bant yalnız dekoratif katmanda yaşar: K0 steril + motion off + batterySaver kapalı. */
const canRender = computed(
  () => corruptionLevel.value >= 1 && motionMode.value !== 'off' && !store.settings.batterySaver
)

/** Boost parmak izi: yüzen anomali + aktif buff sayısı (artış = yeni tetikleme). */
const boostCounts = computed<readonly [number, number]>(
  () => [store.floatingAnomalies.length, store.activeBuffs.length]
)

const BOOST_HOLD_MS = 7000
const BOOST_FADE_MS = 900
const BOOST_RETRIGGER_MS = 500

const isVisible = ref(false)
const isFading = ref(false)
/** Her tetiklemede artar: `buildMotifStrip` kaydırılmış pencereyi bundan alır. */
const cycle = ref(0)

let lastShownAt = 0
let holdTimer: number | null = null
let fadeTimer: number | null = null

// DOM bütçesi (A5-10): count × 2 yarım × 2 taraf → normal 16, dense 28 kopya.
const STRIP_COUNT = 4
const STRIP_COUNT_DENSE = 7

const strip = computed(() =>
  buildMotifStrip(
    corruptionLevel.value,
    isDense.value ? STRIP_COUNT_DENSE : STRIP_COUNT,
    cycle.value
  )
)

const visible = computed(() => isVisible.value && canRender.value)

/** Sönme yalnız glif şeridinin opaklığında; `.motif-band` tabanına (style.css) dokunmaz. */
const trackStyle = computed(() => ({
  opacity: isFading.value ? '0' : '1',
  transition: 'opacity ' + BOOST_FADE_MS + 'ms ease-out'
}))

function clearTimers(): void {
  if (holdTimer !== null) {
    window.clearTimeout(holdTimer)
    holdTimer = null
  }
  if (fadeTimer !== null) {
    window.clearTimeout(fadeTimer)
    fadeTimer = null
  }
}

function hideNow(): void {
  clearTimers()
  isVisible.value = false
  isFading.value = false
}

/** Yeni tetikleme: suppression penceresi dolmadıysa yutulur (ADR-0049 doz). */
function triggerBand(): void {
  if (!canRender.value) return
  const now = Date.now()
  if (now - lastShownAt < BOOST_RETRIGGER_MS) return
  lastShownAt = now
  cycle.value += 1
  clearTimers()
  isFading.value = false
  isVisible.value = true
  holdTimer = window.setTimeout(() => {
    holdTimer = null
    isFading.value = true
    fadeTimer = window.setTimeout(() => {
      fadeTimer = null
      isVisible.value = false
      isFading.value = false
    }, BOOST_FADE_MS)
  }, BOOST_HOLD_MS)
}

watch(boostCounts, (next, prev) => {
  if (next[0] <= 0 && next[1] <= 0) {
    hideNow()
    return
  }
  if (next[0] > prev[0] || next[1] > prev[1]) triggerBand()
})

watch(
  canRender,
  (open) => {
    if (!open) {
      hideNow()
      return
    }
    if (boostCounts.value[0] > 0 || boostCounts.value[1] > 0) triggerBand()
  },
  { immediate: true }
)

onUnmounted(clearTimers)

function glyphTilt(i: number): string {
  return 'rotate(' + (((i % 5) - 2) * 9) + 'deg)';
}
</script>

<template>
  <div
    v-if="visible"
    class="layer-motif motif-band pointer-events-none fixed inset-y-0 inset-x-0"
    :class="{ 'motif-band-dense': isDense }"
    aria-hidden="true"
  >
    <div class="motif-side motif-side-left">
      <div class="motif-track" :style="trackStyle">
        <div v-for="half in 2" :key="'l' + half" class="motif-half">
          <span
            v-for="(m, i) in strip"
            :key="'l' + half + '-' + m.id + '-' + i"
            class="motif-glyph"
            :class="'motif-tone-' + m.tone"
            :style="{ transform: glyphTilt(i) }"
            v-html="m.svg"
          ></span>
        </div>
      </div>
    </div>
    <div class="motif-side motif-side-right">
      <div class="motif-track" :style="trackStyle">
        <div v-for="half in 2" :key="'r' + half" class="motif-half">
          <span
            v-for="(m, i) in strip"
            :key="'r' + half + '-' + m.id + '-' + i"
            class="motif-glyph"
            :class="'motif-tone-' + m.tone"
            :style="{ transform: glyphTilt(i + 2) }"
            v-html="m.svg"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>
