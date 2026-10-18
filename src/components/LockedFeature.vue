<script setup lang="ts">
import { computed } from 'vue'
import { Decimal } from '../core/math'
import { useGameStore } from '../stores/game'
import { getFeatureById, unlockProgress, unlockProgressFraction } from '../game/unlocks'
import { formatNumber } from '../core/format'
import { Lock } from 'lucide-vue-next'

const props = defineProps<{ featureId: string | null }>()
const store = useGameStore()

const feature = computed(() => (props.featureId ? getFeatureById(props.featureId) : null))

const progress = computed(() => {
  const f = feature.value
  if (!f) return { current: 0, target: 1 }
  return unlockProgress(store.unlockContext, f)
})

// ADR-0032: dopamin kapıları 1e308 ölçeğine kadar gidiyor; doğrusal oran
// Infinity üretirdi. unlockProgressFraction dopamin için logaritmik ölçek kullanır.
const percent = computed(() => {
  const f = feature.value
  if (!f) return 0
  return unlockProgressFraction(store.unlockContext, f) * 100
})

const formattedCurrent = computed(() =>
  formatNumber(new Decimal(progress.value.current), store.settings.notation, 1)
)
const formattedTarget = computed(() =>
  formatNumber(new Decimal(progress.value.target), store.settings.notation, 1)
)
</script>

<template>
  <div
    v-if="feature"
    class="ds-ramp-locked p-3 rounded-xl border border-dashed border-white/[0.08] bg-black/20 flex flex-col gap-2"
  >
    <div class="flex items-center gap-2">
      <span class="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500 flex items-center justify-center shrink-0">
        <Lock class="w-3.5 h-3.5" />
      </span>
      <div class="min-w-0">
        <div class="text-xs font-bold font-mono text-slate-400 truncate">{{ feature.name }}</div>
        <div class="text-[10px] font-mono text-slate-500">{{ feature.hint }}</div>
      </div>
      <span
        v-if="feature.req.kind !== 'dopamine'"
        class="ml-auto text-[10px] font-mono text-slate-500 tabular-nums shrink-0"
      >
        {{ formattedCurrent }} / {{ formattedTarget }}
      </span>
    </div>
    <div class="progress-track progress-track-sm progress-track-bordered w-full">
      <div
        class="progress-fill progress-fill-slate"
        :style="{ width: `${percent}%` }"
      ></div>
    </div>
  </div>
</template>
