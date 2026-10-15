<script setup lang="ts">
import { computed } from "vue";
import { useGameStore, LAB_RECIPES } from "../../stores/game";
import { Rocket, Radio, BookOpen } from "lucide-vue-next";

const emit = defineEmits<{
  (e: "open-codex"): void;
}>();

const store = useGameStore();

const matureCellCount = computed(() => store.labCells.filter((c) => c.isMature && c.seedType !== null).length);

const hypeRatePerSec = computed(() => {
  if (store.labMode === "superconductor") return 0;
  const modeMult = store.labMode === "overdrive" ? 1.8 : 1.0;
  return (0.35 + matureCellCount.value * 0.3) * modeMult;
});

const isHypeFull = computed(() => store.labHype >= 100);

// Boşalım butonu uygunluk rampası: hazır = cyan gradient + pulse;
// süperiletken (donuk) = locked; şarj/bekleme akıyorsa = partial.
const ventRampClass = computed(() => {
  if (store.canTriggerViralDrop) return '';
  if (store.labMode === 'superconductor') return 'ds-ramp-locked';
  if (store.labHype > 0 || store.viralCooldownRemaining > 0) return 'ds-ramp-partial';
  return 'ds-ramp-locked';
});
</script>

<template>
  <!-- Reaktör & Süperkritik Boşalım (Supercritical Venting) Paneli -->
  <div
    class="glass-panel-card p-4 rounded-xl border transition-all"
    :class="[
      store.isViralActive
        ? 'border-rose-500/60 bg-gradient-to-r from-rose-950/20 via-black/60 to-purple-950/20 shadow-[0_0_25px_rgba(244,63,94,0.25)] animate-pulse'
        : isHypeFull
          ? 'border-cyan-500/50 bg-cyan-950/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
          : 'border-white/[0.06]'
    ]"
  >
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <Rocket
          class="w-5 h-5"
          :class="store.isViralActive ? 'text-rose-400 animate-bounce' : isHypeFull ? 'text-cyan-400 animate-pulse' : 'text-slate-400'"
        />
        <div>
          <div class="text-sm font-bold font-mono tracking-wide text-slate-200">
            Kuantum Reaktörü & Süperkritik Boşalım
          </div>
          <div class="text-[11px] text-slate-400">
            {{
              store.isViralActive
                ? '💥 Canlı Süperkritik Plazma Boşalımı Yayında!'
                : store.labMode === 'superconductor'
                  ? 'Süperiletken Rejim: Plazma şarjı donduruldu, 2.5× sabit pasif kütle devrede.'
                  : 'Kuantum akısı ve matris titreştikçe plazma barı dolar.'
            }}
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <button
          @click="emit('open-codex')"
          class="px-2.5 py-1.5 rounded-lg border bg-white/5 border-white/10 hover:bg-white/10 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <BookOpen class="w-3.5 h-3.5" />
          <span>Parçacık Atlası ({{ store.labCodexDiscoveredCount }}/{{ LAB_RECIPES.length }})</span>
        </button>
        <div class="progress-track progress-track-mini">
          <div
            class="progress-fill progress-fill-cyan"
            :style="{ width: `${(store.labCodexDiscoveredCount / LAB_RECIPES.length) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Canlı Süperkritik Boşalım Durumu -->
    <div v-if="store.isViralActive" class="p-3 rounded-xl bg-black/60 border border-rose-500/40 mb-3 space-y-2">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span class="text-xs font-sans font-bold text-rose-300">Süperkritik plazma boşalımı aktif</span>
        </div>
        <div class="text-xs font-mono text-slate-300 flex items-center gap-3">
          <span class="flex items-center gap-1 text-cyan-300">
            <Radio class="w-3.5 h-3.5" />
            <span>Plazma Akısı Rezonansta</span>
          </span>
          <span class="text-rose-400 font-bold tabular-nums">
            {{ store.viralTimeRemaining.toFixed(1) }}s kaldı
          </span>
        </div>
      </div>

      <div class="progress-track progress-track-md">
        <div
          class="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400 transition-all duration-100"
          :style="{ width: `${Math.min(100, (store.viralTimeRemaining / 25) * 100)}%` }"
        ></div>
      </div>

      <div class="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
        <span class="text-cyan-300 font-bold">⚡ ×{{ store.labViralMultiplier.toFixed(1) }} Canlı Plazma Çarpanı</span>
        <span class="text-cyan-300 font-bold">✨ 3× Kozmik Kriz Yağmuru</span>
      </div>
    </div>

    <!-- Şarj Olma Durumu -->
    <div v-else class="space-y-2.5">
      <div class="space-y-1">
        <div class="flex items-center justify-between text-xs font-mono">
          <span class="text-slate-300 flex items-center gap-1">
            <span>Kritik Plazma Seviyesi:</span>
            <b :class="isHypeFull ? 'text-cyan-400 font-bold' : 'text-slate-200'">{{ Math.floor(store.labHype) }}%</b>
          </span>
          <span v-if="isHypeFull" class="text-cyan-400 font-bold animate-pulse">
            REAKTÖR KRİTİK SEVİYEDE! BOŞALIMA HAZIR!
          </span>
          <span v-else-if="store.labMode === 'superconductor'" class="text-slate-400">
            (Süperiletken modunda şarj durduruldu)
          </span>
          <span v-else class="text-slate-500 text-[11px]">
            Yutma yaparak (+0.4%) hızlandır
          </span>
        </div>

        <div class="progress-track progress-track-lg relative overflow-hidden">
          <div
            class="h-full transition-all duration-200"
            :class="isHypeFull ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 animate-pulse' : 'bg-cyan-500'"
            :style="{ width: `${store.labHype}%` }"
          ></div>
        </div>
        <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 tabular-nums">
          <span v-if="store.labMode === 'superconductor'" class="text-slate-400">
            ❄️ Plazma şarjı donduruldu (Süperiletken)
          </span>
          <span v-else>
            +{{ hypeRatePerSec.toFixed(2) }}%/sn plazma şarj hızı ({{ matureCellCount }} olgun hücre)
          </span>
        </div>
      </div>

      <button
        @click="store.triggerSupercriticalVent()"
        :disabled="!store.canTriggerViralDrop"
        class="w-full py-2.5 px-4 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        :class="[
          store.canTriggerViralDrop
            ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-black hover:opacity-95 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.01] affordance-pulse'
            : ['bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed', ventRampClass]
        ]"
      >
        <Rocket class="w-4 h-4" :class="store.canTriggerViralDrop ? 'animate-bounce' : ''" />
        <span v-if="store.canTriggerViralDrop">
          Süperkritik Boşalım Başlat (60s Kütle + ×{{ store.labViralMultiplier.toFixed(1) }} Canlı Plazma Çarpanı)
        </span>
        <span v-else-if="isHypeFull && store.viralCooldownRemaining > 0">
          Reaktör Soğuyor ({{ Math.ceil(store.viralCooldownRemaining) }}sn bekleme)
        </span>
        <span v-else>
          Plazma Şarj Oluyor (%{{ Math.floor(store.labHype) }} / %100)
        </span>
      </button>
    </div>
  </div>
</template>
