<script setup lang="ts">
import { useGameStore, LAB_RECIPES, LAB_SEEDS } from "../../stores/game";
import type { LabSeedType } from "../../models/types";
import { CheckCircle2, HelpCircle } from "lucide-vue-next";

const store = useGameStore();

function isSeedDiscovered(seedType: LabSeedType): boolean {
  return store.discoveredFormulas.includes(seedType);
}

function getCellSeedDef(seedType: LabSeedType | null) {
  if (!seedType) return null;
  return LAB_SEEDS.find((s) => s.type === seedType) || null;
}
</script>

<template>
  <!-- Sentez Tarifleri Listesi -->
  <div class="space-y-2.5">
    <div
      v-for="recipe in LAB_RECIPES"
      :key="recipe.result"
      class="p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
      :class="[
        isSeedDiscovered(recipe.result)
          ? 'bg-cyan-950/20 border-cyan-500/40 ds-ramp-ready'
          : 'bg-black/50 border-white/[0.08] ds-ramp-locked'
      ]"
    >
      <div class="flex items-center gap-3">
        <span class="text-3xl p-1.5 rounded-lg bg-black/40 border border-white/10">
          {{ isSeedDiscovered(recipe.result) ? recipe.icon : '❓' }}
        </span>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold font-mono" :class="isSeedDiscovered(recipe.result) ? 'text-cyan-300' : 'text-slate-300'">
              {{ isSeedDiscovered(recipe.result) ? recipe.name : 'Gizli Egzotik İzotop' }}
            </span>
            <span
              v-if="isSeedDiscovered(recipe.result)"
              class="text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
            >
              <CheckCircle2 class="w-3 h-3" />
              <span>Sentezlendi (+%3)</span>
            </span>
            <span
              v-else
              class="ds-badge ds-badge-slate text-[9px]"
            >
              <HelpCircle class="w-3 h-3" />
              <span>Kilitli</span>
            </span>
          </div>
          <div class="text-[11px] text-slate-400 mt-0.5">
            {{ isSeedDiscovered(recipe.result) ? recipe.desc : recipe.hint }}
          </div>
        </div>
      </div>

      <!-- Ebeveyn İpuçları -->
      <div class="flex items-center gap-1.5 text-xs font-mono tabular-nums bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-300 shrink-0">
        <span>{{ getCellSeedDef(recipe.parent1)?.icon }} {{ getCellSeedDef(recipe.parent1)?.name }}</span>
        <span class="text-slate-400">+</span>
        <span>{{ getCellSeedDef(recipe.parent2)?.icon }} {{ getCellSeedDef(recipe.parent2)?.name }}</span>
      </div>
    </div>
  </div>
</template>
