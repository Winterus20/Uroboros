<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore } from "../../stores/game";
import { format } from "../../core/format";
import { Activity } from "lucide-vue-next";

const store = useGameStore();

const SPARK_W = 100;
const SPARK_H = 34;
const hoverIndex = ref<number | null>(null);

function safeVal(v: number): number {
  if (v <= 0 || Number.isNaN(v)) return 0;
  if (!Number.isFinite(v)) return Number.MAX_VALUE;
  return v;
}

const sparkMax = computed(() => {
  const hist = store.dpsHistory;
  if (hist.length < 2) return 0;
  let m = 0;
  for (let i = 0; i < hist.length; i++) {
    const sv = safeVal(hist[i]);
    if (sv > m) m = sv;
  }
  return m;
});

const sparkPoints = computed(() => {
  const hist = store.dpsHistory;
  if (hist.length < 2 || sparkMax.value <= 0) return "";
  const maxLog = Math.log10(sparkMax.value + 1);
  if (maxLog <= 0) return "";
  return hist
    .map((v, i) => {
      const x = (i / (hist.length - 1)) * SPARK_W;
      const valLog = Math.log10(safeVal(v) + 1);
      const ratioVal = Math.min(1, Math.max(0, valLog / maxLog));
      const y = SPARK_H - Math.max(0.5, ratioVal * (SPARK_H - 3));
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
});

const sparkAreaPoints = computed(() => {
  if (!sparkPoints.value) return "";
  return `0,${SPARK_H} ${sparkPoints.value} ${SPARK_W},${SPARK_H}`;
});

function onChartMouseMove(e: MouseEvent): void {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const hist = store.dpsHistory;
  if (hist.length > 0) {
    const idx = Math.min(hist.length - 1, Math.floor(normX * hist.length));
    hoverIndex.value = idx;
  }
}

function onChartMouseLeave(): void {
  hoverIndex.value = null;
}

const hoverDpsText = computed(() => {
  if (hoverIndex.value === null) return null;
  const rawVal = store.dpsHistory[hoverIndex.value];
  if (rawVal === undefined) return null;
  const val = safeVal(rawVal);
  const secsAgo = store.dpsHistory.length - 1 - hoverIndex.value;
  return {
    valText: format(val, 2, store.settings.notation),
    timeText: secsAgo === 0 ? "Şimdi" : `${secsAgo} sn önce`
  };
});
</script>

<template>
  <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <Activity class="w-4 h-4 text-purple-400" />
        <span class="text-xs font-bold text-slate-200">Saniyelik Üretim Zaman Çizelgesi</span>
        <span class="text-[10px] text-slate-500 font-mono">Son 10 dk (<span class="tabular-nums">{{ store.dpsHistory.length }}</span> sn)</span>
      </div>

      <div class="flex items-center gap-2">
        <span v-if="hoverDpsText" class="text-[11px] font-mono text-cyan-300 tabular-nums">
          {{ hoverDpsText.timeText }}: {{ hoverDpsText.valText }} / sn
        </span>
        <span v-else class="text-[11px] font-mono text-purple-300 tabular-nums">
          Şu an: {{ format(store.matterPerSecond, 2, store.settings.notation) }} / sn
        </span>
      </div>
    </div>

    <div
      v-if="sparkPoints"
      tabindex="0"
      role="img"
      :aria-label="`Saniyelik üretim grafiği: ${store.dpsHistory.length} örnek, zirve ${format(sparkMax, 2, store.settings.notation)} bölü saniye`"
      class="relative w-full h-24 rounded-lg bg-black/50 border border-white/[0.05] overflow-hidden cursor-crosshair select-none"
      @mousemove="onChartMouseMove"
      @mouseleave="onChartMouseLeave"
    >
      <svg :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`" preserveAspectRatio="none" class="w-full h-full">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgb(192 132 252)" stop-opacity="0.35" />
            <stop offset="100%" stop-color="rgb(192 132 252)" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Kılavuz Çizgileri -->
        <line x1="0" y1="8" x2="100" y2="8" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" />
        <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" />

        <!-- Alan Dolgusu -->
        <polygon :points="sparkAreaPoints" fill="url(#chartGradient)" />

        <!-- Ana Eğri Çizgisi -->
        <polyline
          :points="sparkPoints"
          fill="none"
          stroke="rgb(192 132 252)"
          stroke-width="1.8"
          vector-effect="non-scaling-stroke"
        />

        <!-- Hover Dikey Göstergesi -->
        <line
          v-if="hoverIndex !== null && store.dpsHistory.length > 1"
          :x1="(hoverIndex / (store.dpsHistory.length - 1)) * SPARK_W"
          y1="0"
          :x2="(hoverIndex / (store.dpsHistory.length - 1)) * SPARK_W"
          :y2="SPARK_H"
          stroke="rgba(34, 211, 238, 0.8)"
          stroke-width="1"
          stroke-dasharray="2,2"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    </div>
    <div v-else class="h-24 rounded-lg bg-black/50 border border-white/[0.05] flex items-center justify-center">
      <span class="text-xs font-mono text-slate-500">Telemetri verisi toplanıyor... (<span class="tabular-nums">{{ store.dpsHistory.length }}</span> sn)</span>
    </div>

    <div class="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
      <span>-10 dakika</span>
      <span>-5 dakika</span>
      <span>şimdi</span>
    </div>
  </div>
</template>
