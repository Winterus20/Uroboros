<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { lineText, pickTickerLine, type VoiceContext } from '../game/voice'

const store = useGameStore()
const text = ref('')
const lastInteraction = ref(Date.now())
let timer: number | null = null

/** V3: ses yalnız oyun içi veriyi görür (tıklama, süre, saat, sekme). */
function context(): VoiceContext {
  return {
    rung: store.rung,
    number: store.number,
    peak: store.peak,
    perSecond: store.perSecond,
    tanim: store.tanim,
    prestiges: store.prestiges,
    boosts: store.boosts,
    taps: store.taps,
    uselessTaps: store.uselessTaps,
    idleSeconds: (Date.now() - lastInteraction.value) / 1000,
    hour: new Date().getHours(),
    tab: 'number'
  }
}

/** T4: susmak bir replik — satır yoksa ekran boş kalmaz, önceki satır durur. */
function speak(): void {
  if (store.settings.humor === 'off') return
  const line = pickTickerLine(context(), store.seenVoice)
  if (!line) return
  store.markVoiceSeen(line.id)
  text.value = lineText(line, context())
}

const intervalMs = computed(() => (store.settings.humor === 'full' ? 12000 : 20000))

onMounted(() => {
  speak()
  timer = window.setInterval(() => {
    if (document.hidden) return
    speak()
  }, intervalMs.value)
  window.addEventListener('pointerdown', markInteraction)
  window.addEventListener('keydown', markInteraction)
})

onUnmounted(() => {
  if (timer !== null) window.clearInterval(timer)
  window.removeEventListener('pointerdown', markInteraction)
  window.removeEventListener('keydown', markInteraction)
})

function markInteraction(): void {
  lastInteraction.value = Date.now()
}
</script>

<template>
  <header v-if="store.settings.humor !== 'off'" class="ticker">
    <p class="ticker__text" aria-live="polite">{{ text }}</p>
  </header>
</template>

<style scoped>
.ticker {
  padding: 10px 16px 12px;
  border-bottom: 1px solid var(--pn-hairline);
  min-height: 40px;
  display: flex;
  align-items: center;
}
.ticker__text {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 13px;
  letter-spacing: 0.01em;
  color: var(--pn-text-dim);
}
</style>
