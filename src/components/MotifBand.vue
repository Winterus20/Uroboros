<script setup lang="ts">
/**
 * MotifBand — Boost anı yan motif bandı (Faz C "Aç Kumarhane", L3).
 *
 * Sözleşme: visual-language.md §5 + plan §6 (C3).
 * - Kozmik Dalgalanma tetiklendiğinde (yüzen anomali VEYA aktif buff varken)
 *   ekranın iki yanından GIC motifleri süzülür.
 * - Rezonans kombosunda (7x + 777x) yoğunluk katlanır (daha çok glif + opaklık).
 * - Motif seti bozulma seviyesinden gelir (`motifsForCorruption`); K0 steril
 *   olduğu için bant K1+ seviyelerde görünür.
 * - Kapılar: motion `off` → render yok; `reduced` → statik bant; `batterySaver`
 *   → gizli (CSS + TS çift kapı). Bileşen sayı/etiket okumaz, tıklanamaz.
 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { useMotionMode } from '../composables/useMotion'
import { buildMotifStrip } from '../game/motifs'

const store = useGameStore()
const motionMode = useMotionMode()

const corruptionLevel = computed(() => store.corruptionLevel)
const hasBoost = computed(
  () => store.floatingAnomalies.length > 0 || store.activeBuffs.length > 0
)
const isDense = computed(() => store.isComboActive)

const visible = computed(() => {
  if (corruptionLevel.value < 1) return false
  if (!hasBoost.value) return false
  if (motionMode.value === 'off') return false
  if (store.settings.batterySaver) return false
  return true
})

const STRIP_COUNT = 8
const STRIP_COUNT_DENSE = 14

const strip = computed(() =>
  buildMotifStrip(corruptionLevel.value, isDense.value ? STRIP_COUNT_DENSE : STRIP_COUNT)
)

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
      <div class="motif-track">
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
      <div class="motif-track">
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
