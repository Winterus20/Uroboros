<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { sounds } from '../core/audio'
import { useMotionReduced } from '../composables/useMotion'

/**
 * `+1` (ADR-0085): normal boyutta bir tuş — ne dev, ne gizli. Altında basış sayısı; her
 * basışta küçük bir "+1" yükselip söner (600 ms), hero sayı küçük bir vuruş yapar (HeroNumber).
 *
 * G10: +1 hiç değişmez — 84. saatte de aynı yer, aynı boyut, aynı etiket, aynı vuruş.
 * Klavye basışı (space / +) App.vue'dan gelir; yüzen etiket ve vuruş `store.taps` izlenerek
 * doğduğu için fare ve klavye aynı geri bildirimi alır.
 */
const store = useGameStore()
const reduced = useMotionReduced()

/** Aynı anda en fazla bu kadar yüzen etiket: hızlı basışta DOM şişmez. */
const MAX_FLOATS = 6
const FLOAT_MS = 600
const HIT_MS = 110

const floats = ref<number[]>([])
const hit = ref(false)
let floatSeq = 0
let hitTimer: number | null = null
const timers = new Set<number>()

function press(): void {
  store.tap()
  if (store.settings.soundEnabled) sounds.playClick()
}

function spawnFloat(): void {
  if (reduced.value) return
  const id = ++floatSeq
  floats.value = [...floats.value, id].slice(-MAX_FLOATS)
  const timer = window.setTimeout(() => {
    floats.value = floats.value.filter((item) => item !== id)
    timers.delete(timer)
  }, FLOAT_MS)
  timers.add(timer)
}

function flashHit(): void {
  hit.value = true
  if (hitTimer !== null) window.clearTimeout(hitTimer)
  hitTimer = window.setTimeout(() => {
    hit.value = false
    hitTimer = null
  }, HIT_MS)
}

/** Yalnız tek basışlık artış geri bildirim üretir; kayıt yüklemesi (sıçrama) üretmez. */
watch(
  () => store.taps,
  (next, previous) => {
    if (next !== previous + 1) return
    spawnFloat()
    flashHit()
  }
)

onUnmounted(() => {
  for (const timer of timers) window.clearTimeout(timer)
  timers.clear()
  if (hitTimer !== null) window.clearTimeout(hitTimer)
})
</script>

<template>
  <div class="tap-col">
    <!--
      Erişilebilir ad düğmede sabittir: görünür "+1" ile aynı şeyi söyler; kısayol ipucu
      yalnız görseldir (aria-hidden), kısayollar kapalıysa çizilmez.
    -->
    <button class="tap data" :class="{ 'tap--hit': hit }" type="button" aria-label="Add one" @click="press">
      <span aria-hidden="true">+1</span>
      <kbd v-if="store.settings.hotkeysEnabled" class="kbd tap__kbd" aria-hidden="true">space</kbd>
    </button>
    <span class="tap__count data">{{ store.taps }} {{ store.taps === 1 ? 'press' : 'presses' }}</span>
    <span v-for="id in floats" :key="id" class="tap__float data" aria-hidden="true">+1</span>
  </div>
</template>

<style scoped>
.tap-col {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.tap {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--pn-line-strong);
  border-radius: var(--pn-r);
  background: var(--pn-s2);
  font-size: 13px;
  color: var(--pn-text);
  cursor: pointer;
  transition: background-color 100ms ease, border-color 100ms ease, transform 60ms ease;
}
.tap:hover { border-color: var(--pn-rung-line); }
.tap:active,
.tap--hit {
  transform: translateY(1px);
  background: var(--pn-s3);
}

.tap__count {
  font-size: 10px;
  color: var(--pn-text-faint);
}

.tap__float {
  position: absolute;
  top: -6px;
  right: 18px;
  font-size: 13px;
  color: var(--pn-rung);
  pointer-events: none;
  animation: pn-float-up 600ms ease-out forwards;
}

@media (max-width: 900px) {
  .tap__kbd { display: none; }
}
</style>
