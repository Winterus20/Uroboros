<script setup lang="ts">
import { computed } from "vue";
import {
  useGameStore,
  AUTOBUYER_BULK_COST,
  AUTOBUYER_MAX_COST,
  AUTOBUYER_BULK_SHIFT_REQ,
  AUTOBUYER_MAX_GALAXY_REQ
} from "../../stores/game";
import { formatNumber } from "../../core/format";
import type { AutobuyerMode } from "../../models/types";
import { Sliders, Zap, Layers } from "lucide-vue-next";

const store = useGameStore();

// Kokpit modu kontrolü (singularities >= 1)
const isCockpit = computed(() => store.isCockpitMode);

// Rampa: ready'de blue kimlik + pulse; şartlardan tam biri karşılanmışsa partial.
const bulkUnlockRamp = computed(() => {
  if (store.canUnlockBulk) return ""; // ready → kimlik + pulse (ramp sınıfı yok)
  const matterOk = store.matter.gte(AUTOBUYER_BULK_COST);
  const shiftOk = store.dimensionShifts >= AUTOBUYER_BULK_SHIFT_REQ;
  return matterOk || shiftOk ? "ds-ramp-partial" : "ds-ramp-locked";
});

const maxUnlockRamp = computed(() => {
  if (store.canUnlockMax) return ""; // ready → kimlik + pulse (ramp sınıfı yok)
  if (!store.autobuyerBulkUnlocked) return "ds-ramp-locked";
  const matterOk = store.matter.gte(AUTOBUYER_MAX_COST);
  const galaxyOk = store.galaxies >= AUTOBUYER_MAX_GALAXY_REQ;
  return matterOk || galaxyOk ? "ds-ramp-partial" : "ds-ramp-locked";
});

// Filo MAKS ataması: yalnız MAKS kademesi açılınca iş görür; açılmadan önce satın alınabilirse partial.
const maxBatchRamp = computed(() => (store.canUnlockMax ? "ds-ramp-partial" : "ds-ramp-locked"));

function setAllModes(mode: AutobuyerMode): void {
  store.setAllAutobuyerModes(mode);
}
</script>

<template>
  <!-- Kokpit Hızlı Kontrol Konsolu (Batch Mod Seçiciler) -->
  <div
    v-if="isCockpit"
    class="glass-panel-card p-3 rounded-xl border-cyan-500/30 bg-black/40 flex flex-wrap items-center justify-between gap-3"
  >
    <div class="flex items-center gap-2">
      <Sliders class="w-4 h-4 text-cyan-400" />
      <span class="text-xs font-mono font-bold text-slate-200">Filo Hızlı Mod Ataması:</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        @click="setAllModes('max')"
        class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border cursor-pointer"
        :class="store.autobuyerMaxUnlocked
          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30 affordance-pulse'
          : `bg-black/30 text-slate-500 border-white/[0.05] ${maxBatchRamp}`"
      >
        <Zap class="w-3.5 h-3.5" />
        <span>Tümünü MAKS Yap</span>
      </button>
      <button
        @click="setAllModes('bulk')"
        class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 cursor-pointer"
      >
        <Layers class="w-3.5 h-3.5" />
        <span>Tümünü ×10 Yap</span>
      </button>
      <button
        @click="setAllModes('single')"
        class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 affordance-pulse cursor-pointer"
      >
        <span>Tümünü ×1 Yap</span>
      </button>
    </div>
  </div>

  <!-- Kademe Kartları: ×1 -> ×10 -> Maks -->
  <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="glass-panel-card p-4 rounded-xl border-cyan-500/30 bg-cyan-950/10">
      <div class="text-xs font-bold font-mono text-cyan-300 mb-1">1. ×1 ALIM</div>
      <div class="text-[11px] text-slate-400 font-mono leading-relaxed">Her bot tek tek açılır. 8sn'de 1 adet alır. Erken oyun manuel kalır, hız patlaması yok.</div>
      <div class="text-[11px] font-mono text-cyan-300 mt-2">Durum: HER ZAMAN AÇIK</div>
    </div>
    <div class="glass-panel-card p-4 rounded-xl" :class="store.autobuyerBulkUnlocked ? 'border-blue-500/40 bg-blue-950/20' : ''">
      <div class="flex items-center gap-2 mb-1">
        <Layers class="w-3.5 h-3.5 text-blue-400" />
        <div class="text-xs font-bold font-mono text-slate-200">2. ×10 ALIM</div>
      </div>
      <div class="text-[11px] text-slate-400 font-mono leading-relaxed">Her basışta 1 paket (10 adet) alır. Sıçrama ister.</div>
      <div class="text-[11px] font-mono mt-2 tabular-nums" :class="store.autobuyerBulkUnlocked ? 'text-blue-300' : 'text-slate-500'">
        <span v-if="store.autobuyerBulkUnlocked">Durum: AÇIK</span>
        <span v-else>İster: {{ formatNumber(AUTOBUYER_BULK_COST, store.settings.notation) }} + {{ AUTOBUYER_BULK_SHIFT_REQ }} Sıçrama</span>
      </div>
      <button
        v-if="!store.autobuyerBulkUnlocked"
        @click="store.unlockBulkMode()"
        :disabled="!store.canUnlockBulk"
        class="btn-tactile mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
        :class="store.canUnlockBulk
          ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/50 affordance-pulse'
          : `bg-black/30 text-slate-500 border-white/[0.05] ${bulkUnlockRamp}`"
      >
        {{ store.canUnlockBulk ? '×10 Modu Aç' : 'Kilitli' }}
      </button>
    </div>
    <div class="glass-panel-card p-4 rounded-xl" :class="store.autobuyerMaxUnlocked ? 'border-blue-500/40 bg-blue-950/20' : 'ds-ramp-locked'">
      <div class="flex items-center gap-2 mb-1">
        <Zap class="w-3.5 h-3.5 text-blue-400" />
        <div class="text-xs font-bold font-mono text-slate-200">3. MAKS ALIM</div>
      </div>
      <div class="text-[11px] text-slate-400 font-mono leading-relaxed">Her basışta paran yettiği kadar alır. Küme ister, en son açılır.</div>
      <div class="text-[11px] font-mono mt-2 tabular-nums">
        <span v-if="store.autobuyerMaxUnlocked" class="ds-badge ds-badge-cyan">Durum: AÇIK</span>
        <span v-else class="ds-badge ds-badge-slate">İster: {{ formatNumber(AUTOBUYER_MAX_COST, store.settings.notation) }} + {{ AUTOBUYER_MAX_GALAXY_REQ }} Küme</span>
      </div>
      <button
        v-if="!store.autobuyerMaxUnlocked"
        @click="store.unlockMaxMode()"
        :disabled="!store.canUnlockMax"
        class="btn-tactile mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
        :class="store.canUnlockMax
          ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/50 affordance-pulse'
          : `bg-black/30 text-slate-500 border-white/[0.05] ${maxUnlockRamp}`"
      >
        {{ store.canUnlockMax ? 'Maks Modu Aç' : 'Kilitli' }}
      </button>
    </div>
  </div>
</template>
