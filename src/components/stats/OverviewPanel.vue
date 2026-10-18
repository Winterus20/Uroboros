<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../../stores/game";
import { format, formatTime } from "../../core/format";
import {
  Moon,
  Zap,
  MousePointerClick,
  Sun,
  Award,
  Clock,
  TrendingUp
} from "lucide-vue-next";
import TelemetryChart from "./TelemetryChart.vue";

const store = useGameStore();

const kpiOverview = computed(() => [
  {
    label: "Kozmik Simülasyon Süresi",
    value: formatTime(store.stats.totalPlaytime),
    icon: Moon,
    color: "text-purple-400",
    subtext: "İlk kuantum uyarımından bu yana"
  },
  {
    label: "Bu Koşuda Geçen Süre",
    value: formatTime(store.currentRunSeconds),
    icon: Clock,
    color: "text-cyan-400",
    subtext: "Son Kozmik Çöküşten beri"
  },
  {
    label: "En Yüksek Kütle Zirvesi",
    value: format(store.stats.highestMatter, 2, store.settings.notation),
    icon: Award,
    color: "text-amber-400",
    subtext: "Tüm zamanların anlık kütle tepesi"
  },
  {
    label: "Zirve Çekim Hızı",
    value: `${format(store.stats.highestDps, 2, store.settings.notation)} / sn`,
    icon: Zap,
    color: "text-cyan-400",
    subtext: "Ulaşılan en yüksek saniyelik debi"
  },
  {
    label: "En Hızlı Çöküş (Rekor)",
    value: Number.isFinite(store.stats.fastestSingularity)
      ? formatTime(store.stats.fastestSingularity)
      : "Henüz Yok",
    icon: Sun,
    color: "text-amber-300",
    subtext: `${store.stats.singularityCount} Kozmik Çöküş içinden`
  },
  {
    label: "Manuel Yutma (Çekim)",
    value: format(store.stats.manualClicks, 2, store.settings.notation),
    icon: MousePointerClick,
    color: "text-blue-400",
    subtext: `${format(store.stats.totalManualDopamine, 2, store.settings.notation)} Kütle manuel çekimden`
  }
]);

const ratio = computed(() => store.activeVsPassiveRatio);
</script>

<template>
  <div class="space-y-3">
    <!-- 6'lı Hero KPI Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      <div
        v-for="kpi in kpiOverview"
        :key="kpi.label"
        class="glass-panel-card p-3 rounded-xl flex items-center justify-between border border-white/[0.06] hover:border-white/[0.12] transition-colors"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 rounded-lg bg-black/40 border border-white/[0.06]" :class="kpi.color">
            <component :is="kpi.icon" class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <div class="text-xs text-slate-300 font-medium truncate">
              {{ kpi.label }}
            </div>
            <div class="text-[10px] text-slate-500 truncate">
              {{ kpi.subtext }}
            </div>
          </div>
        </div>
        <span class="text-sm font-mono font-bold text-white tabular-nums shrink-0 ml-2">
          {{ kpi.value }}
        </span>
      </div>
    </div>

    <!-- Aktif vs Pasif Üretim Dengesi (Cookie Clicker Modeli) -->
    <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <TrendingUp class="w-4 h-4 text-purple-400" />
          <span class="text-xs font-bold text-slate-200">Kütle Çekim Kaynağı Dağılımı</span>
        </div>
        <span class="text-[11px] font-mono text-slate-400">
          Toplam: {{ format(store.stats.totalMatterProduced, 2, store.settings.notation) }}
        </span>
      </div>

      <div class="progress-track progress-track-lg progress-track-bordered flex">
        <div
          class="progress-fill progress-fill-blue"
          :style="{ width: `${ratio.manualPct}%` }"
        ></div>
        <div
          class="progress-fill progress-fill-cyan"
          :style="{ width: `${ratio.passivePct}%` }"
        ></div>
      </div>

      <div class="flex items-center justify-between text-[11px] font-mono tabular-nums mt-2">
        <span class="text-blue-300 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
          🌌 Manuel Yutma: %{{ ratio.manualPct }}
        </span>
        <span class="text-cyan-300 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
          ⚡ Otonom Çekim: %{{ ratio.passivePct }}
        </span>
      </div>
    </div>

    <!-- İnteraktif Saniyelik Üretim Zaman Çizelgesi (Telemetry SVG Chart) -->
    <TelemetryChart />
  </div>
</template>
