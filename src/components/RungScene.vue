<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { useMotionReduced } from '../composables/useMotion'
import { sounds } from '../core/audio'

/**
 * G8 — basamak geçişi sahnesi (2.500 ms).
 *
 * Ekran söner → basamak adı tek başına yazılır → sayı yeni renginde doğar.
 * 11 kez oynar: mandal store.latch ile tutulur (S3), aynı basamak iki kez sahne almaz.
 * Dizin değişimi motoru tetikler: bugün yalnız 1. basamak var, 2-11 hazır olduğunda
 * bu bileşen değişmez.
 *
 * Sınır (G11): bu sahne RENK + İSİM dilidir. Boost'un hareket dili buraya karışmaz.
 */

const store = useGameStore()
const reduced = useMotionReduced()

/** Sahnenin süreleri: tam hareket 2.500 ms · azaltılmış hareket anlık ama içerikli. */
const FRAME_MS = 2500
const STATIC_MS = 1100
/** Açılışta kayıt yüklemesi (App.onMounted) basamak değiştirebilir — o değişim sahne değildir. */
const BOOT_GUARD_MS = 700

interface SceneRung {
  name: string
}

const scene = ref<SceneRung | null>(null)
const ready = ref(false)

let bootTimer: number | null = null
let endTimer: number | null = null

function clearEndTimer(): void {
  if (endTimer !== null) {
    window.clearTimeout(endTimer)
    endTimer = null
  }
}

function play(rung: SceneRung): void {
  clearEndTimer()
  scene.value = rung
  if (store.settings.soundEnabled) sounds.playMilestone()
  endTimer = window.setTimeout(() => {
    scene.value = null
    endTimer = null
  }, reduced.value ? STATIC_MS : FRAME_MS)
}

watch(
  () => store.rung,
  (next, previous) => {
    if (!ready.value) return
    if (next <= previous) return
    // A4 (narrative-voice §9): humor 'off' iken sahne kanalı da susar.
    // Mandal harcanmaz: oyuncu mizahı geri açarsa sahne hakkını kaybetmemiş olur.
    if (store.settings.humor === 'off') return
    // Mandal: sahne bir kez oynar. Kimlik basamak numarasıyla tutulur.
    if (!store.latch('scene_rung_' + next)) return
    play({ name: store.rungInfo.name })
  }
)

onMounted(() => {
  bootTimer = window.setTimeout(() => {
    ready.value = true
    bootTimer = null
  }, BOOT_GUARD_MS)
})

onUnmounted(() => {
  if (bootTimer !== null) window.clearTimeout(bootTimer)
  clearEndTimer()
})
</script>

<template>
  <div
    v-if="scene"
    class="scene"
    :class="{ 'scene--animated': !reduced }"
    role="status"
    aria-live="polite"
  >
    <p class="scene__name">{{ scene.name }}</p>
  </div>
</template>

<style scoped>
/*
 * Sahne bir katman değil, bir andır: tam ekran sönme + tek satır isim.
 * Zemin tek renk (--pn-bg); blur/gradyan yok. İşaretçiyi yutmaz: oyun arkada durmaz.
 */
.scene {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--pn-bg);
  pointer-events: none;
}

.scene--animated {
  animation: pn-scene-shell 2500ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

.scene__name {
  max-width: 780px;
  margin: 0;
  font-family: var(--font-hero);
  font-weight: 300;
  font-size: clamp(26px, 4.4vw, 52px);
  line-height: 1.18;
  letter-spacing: -0.015em;
  text-align: center;
  color: var(--pn-text);
}

.scene--animated .scene__name {
  animation: pn-scene-name 2500ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

/* Azaltılmış hareket: içerik kaybolmaz — isim statik olarak kısa süre durur, sonra geçer. */
.scene:not(.scene--animated) .scene__name {
  opacity: 1;
  transform: none;
}

@media (max-width: 560px) {
  .scene { padding: 24px; }
  .scene__name { font-size: clamp(24px, 8vw, 34px); }
}
</style>
