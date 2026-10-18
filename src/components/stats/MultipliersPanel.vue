<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../../stores/game";
import { format } from "../../core/format";
import { Zap, MousePointerClick, Gauge, Layers } from "lucide-vue-next";

const store = useGameStore();

const DIM_NAMES: Record<number, string> = {
  1: "Moleküler Bağlar",
  2: "Elektron Orbitalleri",
  3: "Nükleer Çekirdek",
  4: "Kuark Çorbası",
  5: "Laboratuvar & Şehir",
  6: "Gezegenler & Dünya",
  7: "Yıldızlar & Güneş",
  8: "Samanyolu & Karadelik"
};

const dimensionSummary = computed(() => {
  return store.dimensions.map((d) => ({
    tier: d.tier,
    name: DIM_NAMES[d.tier] || `${d.tier}. Katman`,
    amount: d.amount,
    bought: d.bought,
    mult: store.getDimensionMultiplier(d.tier)
  }));
});
</script>

<template>
  <div class="space-y-3">
    <!-- 2.1 Pasif Kütle Çekim Çarpanları -->
    <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Zap class="w-4 h-4 text-purple-400" />
          <span class="text-xs font-bold text-slate-200">Global Pasif Üretim Çarpanları</span>
        </div>
        <span class="text-[11px] font-mono text-purple-300">
          Net Hız: {{ format(store.matterPerSecond, 2, store.settings.notation) }} / sn
        </span>
      </div>

      <div class="space-y-1.5">
        <div
          v-for="row in store.multiplierBreakdown"
          :key="row.name"
          class="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/[0.04] text-xs hover:border-white/[0.09] transition-colors"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
            <span class="text-slate-300 font-medium truncate">{{ row.name }}</span>
          </div>
          <span
            class="font-mono font-bold tabular-nums shrink-0"
            :class="row.value > 1 ? 'text-cyan-300' : 'text-slate-400'"
          >
            ×{{ format(row.value, 2, store.settings.notation) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 2.2 Manuel Yutma Gücü (Click Power) Kırılımı -->
    <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <MousePointerClick class="w-4 h-4 text-blue-400" />
          <span class="text-xs font-bold text-slate-200">Manuel Yutma Gücü (Taktil Çekim) Kırılımı</span>
        </div>
        <span class="text-xs font-mono font-bold text-blue-300 tabular-nums">
          {{ format(store.manualClickPower, 2, store.settings.notation) }} / Dokunuş
        </span>
      </div>

      <div class="space-y-1.5">
        <div
          v-for="row in store.clickPowerBreakdown"
          :key="row.name"
          class="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/[0.04] text-xs hover:border-white/[0.09] transition-colors"
        >
          <span class="text-slate-300 font-medium truncate">{{ row.name }}</span>
          <span class="font-mono font-bold text-blue-300 tabular-nums shrink-0">
            {{ row.value }}
          </span>
        </div>
      </div>
    </div>

    <!-- 2.3 Algoritma Frekansı (Hz & Tickspeed) Kırılımı -->
    <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Gauge class="w-4 h-4 text-cyan-400" />
          <span class="text-xs font-bold text-slate-200">Algoritma Frekansı & Tickspeed</span>
        </div>
        <span class="text-xs font-mono font-bold text-cyan-300 tabular-nums">
          ×{{ format(store.tickspeedMultiplier, 2, store.settings.notation) }} Hız
        </span>
      </div>

      <div class="space-y-1.5">
        <div
          v-for="row in store.tickspeedBreakdown"
          :key="row.name"
          class="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/[0.04] text-xs hover:border-white/[0.09] transition-colors"
        >
          <span class="text-slate-300 font-medium truncate">{{ row.name }}</span>
          <span class="font-mono font-bold text-cyan-300 tabular-nums shrink-0">
            {{ row.value }}
          </span>
        </div>
      </div>
    </div>

    <!-- 2.4 İstasyonların Üretim Gücü (D1-D8) -->
    <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Layers class="w-4 h-4 text-purple-400" />
          <span class="text-xs font-bold text-slate-200">İstasyon Kademeleri (D1–D8)</span>
        </div>
        <span class="text-[11px] font-mono text-slate-400">
          Açık: {{ store.unlockedDimensionsCount }} / 8
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="d in dimensionSummary"
          :key="d.tier"
          class="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] flex items-center justify-between text-xs"
          :class="{ 'opacity-40': d.tier > store.unlockedDimensionsCount }"
        >
          <div class="min-w-0">
            <div class="font-bold text-slate-200 truncate">
              D{{ d.tier }}: {{ d.name }}
            </div>
            <div class="text-[10px] text-slate-500 font-mono">
              Satın Alınan: {{ d.bought }} adet
            </div>
          </div>
          <div class="text-right shrink-0 ml-2">
            <div class="font-mono font-bold text-purple-300 tabular-nums">
              ×{{ format(d.mult, 2, store.settings.notation) }}
            </div>
            <div class="text-[10px] text-slate-400 font-mono tabular-nums">
              {{ format(d.amount, 2, store.settings.notation) }} birim
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
