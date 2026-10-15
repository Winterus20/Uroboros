<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore } from "../stores/game";
import { format, formatTime } from "../core/format";
import {
  BarChart3,
  Moon,
  Zap,
  Clock,
  Activity,
  History,
  Gauge,
  Swords
} from "lucide-vue-next";
import TabHero from "./TabHero.vue";
import OverviewPanel from "./stats/OverviewPanel.vue";
import MultipliersPanel from "./stats/MultipliersPanel.vue";
import PastRunsPanel from "./stats/PastRunsPanel.vue";
import RecordsPanel from "./stats/RecordsPanel.vue";
import BiometryPanel from "./stats/BiometryPanel.vue";

const store = useGameStore();

type SubTabId = "overview" | "multipliers" | "past10" | "challenges" | "biometrics";
const activeSubTab = ref<SubTabId>("overview");

const subTabs = [
  { id: "overview" as const, label: "Genel Bakış", icon: Activity },
  { id: "multipliers" as const, label: "Çarpan Laboratuvarı", icon: Gauge },
  { id: "past10" as const, label: "Son 10 Çöküş", icon: History },
  { id: "challenges" as const, label: "Kriz & Rekorlar", icon: Swords },
  { id: "biometrics" as const, label: "Tekillik Telemetrisi", icon: Moon }
];

const pastRunsCount = computed(() => store.pastSingularities.length);
</script>

<template>
  <div class="space-y-3 pb-8">
    <!-- Üst Hero Banner -->
    <TabHero
      :icon="BarChart3"
      icon-class="text-slate-300"
      title="Kozmik Çekim & Kütle Telemetrisi"
      badge="Rapor"
      subtitle="Kuantum ve kozmik tekillik teşhis merkezi: çarpanlar, son 10 çöküş günlüğü, hız rekorları ve tekillik biyometrisi."
      accent="slate"
    >
      <template #stats>
        <div class="stat-box">
          <Moon class="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <div class="stat-box-label">Uykusuz Süre</div>
            <div class="stat-box-value text-slate-100 tabular-nums">
              {{ formatTime(store.stats.totalPlaytime) }}
            </div>
          </div>
        </div>

        <div class="stat-box">
          <Clock class="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div class="stat-box-label">Bu Koşu</div>
            <div class="stat-box-value text-cyan-200 tabular-nums">
              {{ formatTime(store.currentRunSeconds) }}
            </div>
          </div>
        </div>

        <div class="stat-box">
          <Zap class="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div class="stat-box-label">Zirve Debi</div>
            <div class="stat-box-value text-cyan-200 tabular-nums">
              {{ format(store.stats.highestDps, 2, store.settings.notation) }}/s
            </div>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Alt Sekme Navigasyonu (Segmented Pill Bar) -->
    <div role="tablist" aria-label="İstatistik alt sekmeleri" class="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08] overflow-x-auto no-scrollbar">
      <button
        v-for="tab in subTabs"
        :key="tab.id"
        role="tab"
        :aria-selected="activeSubTab === tab.id"
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer"
        :class="
          activeSubTab === tab.id
            ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
        "
        @click="activeSubTab = tab.id"
      >
        <component :is="tab.icon" class="w-3.5 h-3.5" />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.id === 'past10' && pastRunsCount > 0"
          class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-purple-500/20 text-purple-300"
        >
          {{ pastRunsCount }}
        </span>
      </button>
    </div>

    <OverviewPanel v-if="activeSubTab === 'overview'" />
    <MultipliersPanel v-else-if="activeSubTab === 'multipliers'" />
    <PastRunsPanel v-else-if="activeSubTab === 'past10'" />
    <RecordsPanel v-else-if="activeSubTab === 'challenges'" />
    <BiometryPanel v-else-if="activeSubTab === 'biometrics'" />
  </div>
</template>
