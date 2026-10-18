<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useGameStore } from '../stores/game'
import { formatNumber } from '../core/format'
import { useFocusTrap } from '../core/focus-trap'
import { Moon, Zap } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'dismiss'): void }>()
const store = useGameStore()

const report = computed(() => store.offlineReport)

// saniye → "2s 14dk" biçimli kısa süre
const awayText = computed(() => {
  if (!report.value) return ''
  const s = Math.floor(report.value.seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h} sa ${m} dk`
  if (m > 0) return `${m} dk ${sec} sn`
  return `${sec} sn`
})

const gainedText = computed(() => {
  if (!report.value) return ''
  return formatNumber(report.value.dopamineGained, store.settings.notation, 2)
})

const cpsText = computed(() => {
  if (!report.value || report.value.seconds <= 0) return ''
  const perSec = report.value.dopamineGained.div(Math.max(1, report.value.seconds))
  return formatNumber(perSec, store.settings.notation, 2)
})

function dismiss() {
  store.dismissOfflineReport()
  emit('dismiss')
}

const titleId = useId()
const resumeButtonRef = ref<HTMLButtonElement | null>(null)

// Rapor varken modal açıktır (kök v-if="report").
const { dialogRef } = useFocusTrap(() => report.value !== null, {
  initialFocus: resumeButtonRef,
  onEscape: dismiss
})
</script>

<template>
  <div v-if="report" class="layer-modal fixed inset-0 flex items-center justify-center p-4 bg-black/70" @click.self="dismiss">
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="modal-glass w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--ds-panel-strong)] p-5 shadow-2xl outline-none"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center shrink-0">
          <Moon class="w-5 h-5 text-purple-300" />
        </div>
        <div class="min-w-0">
          <h2 :id="titleId" class="text-base font-bold text-white leading-tight">Tekrar hoş geldin!</h2>
          <p class="text-xs text-slate-400">Uzakta {{ awayText }} geçirdin — akış durmadı.</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-3">
        <div class="flex items-center gap-2">
          <Zap class="w-4 h-4 text-cyan-300 shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Toplanan Kütle</div>
            <div class="text-lg font-bold font-mono tabular-nums text-cyan-200 leading-tight">+{{ gainedText }}</div>
          </div>
        </div>
        <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
          <span>Ortalama</span>
          <span class="text-slate-300">{{ cpsText }} / sn</span>
        </div>
        <div v-if="store.passiveBadges.d6Offline" class="text-[10px] text-slate-500 font-mono leading-snug">
          D6 pasifi çevrimdışı üretimi ×1.02 güçlendirdi.
        </div>
        <div v-if="report.capped" class="text-[11px] text-slate-500 leading-snug">
          Yakalama 24 saatlik sınırıyla kesildi — daha uzun süre uzak kaldın.
        </div>
      </div>

      <button
        ref="resumeButtonRef"
        class="btn-tactile mt-4 w-full h-11 rounded-xl bg-purple-500/90 hover:bg-purple-500 text-white text-sm font-bold cursor-pointer"
        @click="dismiss"
      >
        Akışa Dön
      </button>
    </div>
  </div>
</template>
