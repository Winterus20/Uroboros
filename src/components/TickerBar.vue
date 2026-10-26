<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { availableTickerLines, lineText, pickTickerLine, type VoiceContext, type VoiceLine } from '../game/voice'

const store = useGameStore()
const text = ref('')
const lastInteraction = ref(Date.now())
let timer: number | null = null

/** V3: ses yalnız oyun içi veriyi görür (tıklama, süre, saat, sekme). */
function context(): VoiceContext {
  return {
    rung: store.rung,
    number: store.number,
    perSecond: store.perSecond,
    taps: store.taps,
    uselessTaps: store.uselessTaps,
    idleSeconds: (Date.now() - lastInteraction.value) / 1000,
    hour: new Date().getHours(),
    tab: 'number'
  }
}

/**
 * İlk satır (G14): bant açılışta bağlamsız bir replikle konuşmaz, rastgele de konuşmaz.
 *
 * Sıra:
 *  1) Bağlam iddia etmeyen satır (when koşulu yok) — havuzun açılış satırları bunlardır.
 *  2) Açılış grubu dışındaki ilk satır: bunlar koşullu yazılmış DURUM satırlarıdır,
 *     yüklü bir koşuda doğru olanı söylerler (Kural 2: mekanik hakkında yalan yok).
 *  3) Hiçbiri yoksa havuzun ilk satırı.
 *
 * Açılış grubu havuzun kendi kimlik kuralıdır (r1_open_*, r2_open_* …). Havuzun
 * seçim algoritmasına dokunulmaz: ağırlıklı/rastgele seçim sonraki satırlarda.
 */
const OPENING_GROUP = /_open_/

function openingLine(ctx: VoiceContext): VoiceLine | null {
  const pool = availableTickerLines(ctx, store.seenVoice)
  if (pool.length === 0) return null
  const neutral = pool.find((line) => line.when === undefined)
  if (neutral) return neutral
  const status = pool.find((line) => !OPENING_GROUP.test(line.id))
  return status ?? pool[0]
}

/** T4: susmak bir replik — satır yoksa ekran boş kalmaz, önceki satır durur. */
function speak(first = false): void {
  if (store.settings.humor === 'off') return
  const ctx = context()
  const line = first ? openingLine(ctx) : pickTickerLine(ctx, store.seenVoice)
  if (!line) return
  store.markVoiceSeen(line.id)
  text.value = lineText(line, ctx)
}

const intervalMs = computed(() => (store.settings.humor === 'full' ? 12000 : 20000))

/** Kendini yeniden kuran zamanlayıcı: mizah yoğunluğu değişirse aralık da değişir. */
function schedule(): void {
  timer = window.setTimeout(() => {
    if (!document.hidden) speak()
    schedule()
  }, intervalMs.value)
}

/**
 * A4 (narrative-voice §9): humor 'off' iken bant susar. Ayar geri açılırsa
 * bant ilk satırını hemen söyler — 20 saniye boş bir şerit beklemez.
 */
watch(
  () => store.settings.humor,
  (next) => {
    if (next === 'off') {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      text.value = ''
      return
    }
    if (!text.value) speak(true)
    if (timer === null) schedule()
  }
)

onMounted(() => {
  window.addEventListener('pointerdown', markInteraction)
  window.addEventListener('keydown', markInteraction)
  // Kayıt yüklemesi (App.onMounted) ilk karede olur: ilk replik ondan SONRA seçilir,
  // aksi hâlde bant yüklenen koşuya değil, boş başlangıç durumuna konuşur.
  void nextTick(() => {
    speak(true)
    schedule()
  })
})

onUnmounted(() => {
  if (timer !== null) window.clearTimeout(timer)
  timer = null
  window.removeEventListener('pointerdown', markInteraction)
  window.removeEventListener('keydown', markInteraction)
})

function markInteraction(): void {
  lastInteraction.value = Date.now()
}
</script>

<template>
  <!-- G14: ekranın en üstü · tek satır · hairline altında · düz metin (kutu/blur yok).
       A4: humor 'off' iken başlık tamamen gizlenir (narrative-voice §9). -->
  <header v-if="store.settings.humor !== 'off'" class="ticker">
    <p class="ticker__text" aria-live="polite">{{ text }}</p>
  </header>
</template>

<style scoped>
.ticker {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 10px 20px 11px;
  border-bottom: 1px solid var(--pn-hairline);
}
.ticker__text {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: var(--pn-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
