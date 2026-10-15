<script setup lang="ts">
import { computed } from "vue";
import { useGameStore, LAB_SEEDS } from "../../stores/game";
import type { LabSeedType } from "../../models/types";
import { formatNumber } from "../../core/format";

export type LabSeedDef = (typeof LAB_SEEDS)[number];

const props = defineProps<{
  seed: LabSeedDef;
  selected: boolean;
}>();

const emit = defineEmits<{
  (e: "select", seedType: LabSeedType): void;
}>();

const store = useGameStore();

const effectiveCost = computed(() => store.labSeedEffectiveCost(props.seed.type));

const affordable = computed(() => store.matter.gte(effectiveCost.value));
</script>

<template>
  <!-- Seçilebilir Açık Parçacık -->
  <button
    @click="emit('select', seed.type)"
    class="btn-tactile p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer"
    :class="[
      selected
        ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
        : 'bg-black/40 border-white/[0.06] hover:border-white/[0.14]'
    ]"
  >
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xl">{{ seed.icon }}</span>
        <span
          v-if="seed.isMutationOnly"
          class="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30"
        >
          Sentezlendi
        </span>
        <span
          v-else
          class="text-[10px] font-mono tabular-nums"
          :class="affordable ? 'text-slate-100' : 'text-slate-500'"
        >
          {{ formatNumber(effectiveCost, store.settings.notation) }}
        </span>
      </div>
      <div class="text-xs font-bold font-mono text-slate-200 line-clamp-1">{{ seed.name }}</div>
      <div class="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">{{ seed.desc }}</div>
    </div>

    <div class="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
      <span class="text-cyan-400">{{ seed.matureBoostDesc }}</span>
      <span class="text-slate-500 tabular-nums">{{ seed.growthSeconds }}s</span>
    </div>
  </button>
</template>
