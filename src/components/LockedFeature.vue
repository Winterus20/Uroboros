<script setup lang="ts">
import { computed } from "vue";
import { Decimal } from "../core/math";
import { useGameStore } from "../stores/game";
import { checkVisibility, getFeatureById, unlockProgress, unlockProgressFraction } from "../game/unlocks";
import { getBranchGate } from "../game/branches";
import { ACHIEVEMENT_CATEGORIES } from "../game/achievements";
import { formatNumber } from "../core/format";
import { Lock } from "lucide-vue-next";

const props = defineProps<{ featureId: string | null }>();
const store = useGameStore();

const feature = computed(() => (props.featureId ? getFeatureById(props.featureId) : null));

/**
 * P3.2 — dal kapısı (başarım ailesi) bu özellik için var mı?
 * `getBranchGate` yalnızca dal özelliklerinde non-null döner; omurga
 * özelliklerinde null döner (dekad eşiği tek başına açar).
 */
const branchGate = computed(() => (feature.value ? getBranchGate(feature.value.id) : null));

/**
 * Dal kapısı YALNIZCA dekad eşiği aşıldığında devreye girer (`unlockProgress` ile
 * aynı koşul). Dekad öncesi hiçbir şey değişmez.
 */
const gateActive = computed(() => {
  const f = feature.value;
  const gate = branchGate.value;
  if (!f || !gate) return false;
  return checkVisibility(store.unlockContext, f);
});

const progress = computed(() => {
  const f = feature.value;
  if (!f) return { current: 0, target: 1 };
  return unlockProgress(store.unlockContext, f);
});

// ADR-0032: dopamin kapıları 1e308 ölçeğine kadar gidiyor; doğrusal oran
// Infinity üretirdi. unlockProgressFraction dopamin için logaritmik ölçek kullanır.
const percent = computed(() => {
  const f = feature.value;
  if (!f) return 0;
  return unlockProgressFraction(store.unlockContext, f) * 100;
});

/**
 * P3.2: dal kapısı devredeyken "current / target" bir SAYIDIR (başarım adedi),
 * kütle değil. `formatNumber` bu küçük tam sayıyı 1e308 biçimine sokabiliyordu
 * ("2.00") — bu bir hataydı. Bu dalda formatNumber KULLANILMAZ; tam sayı yazılır.
 */
function formatCount(value: number): string {
  return Math.round(value).toLocaleString("tr-TR");
}

const formattedCurrent = computed(() =>
  gateActive.value
    ? formatCount(progress.value.current)
    : formatNumber(new Decimal(progress.value.current), store.settings.notation, 1)
);
const formattedTarget = computed(() =>
  gateActive.value
    ? formatCount(progress.value.target)
    : formatNumber(new Decimal(progress.value.target), store.settings.notation, 1)
);

/** Aile adı (ACHIEVEMENT_CATEGORIES) — ör. "Kozmik Dalgalanmalar". */
const gateFamilyName = computed(() => {
  const gate = branchGate.value;
  if (!gate) return "";
  const meta = ACHIEVEMENT_CATEGORIES.find((c) => c.id === gate.family);
  return meta ? meta.name : gate.family;
});

/** Kısa aile ipucu: "Kozmik Dalgalanmalar: 1/2". */
const gateHint = computed(
  () => `${gateFamilyName.value}: ${formatCount(progress.value.current)}/${formatCount(progress.value.target)}`
);

/** Kademe göstergesi: her kutu bir dal basamağı, dolu = kazanılan başarım. */
const gateSteps = computed(() => {
  const gate = branchGate.value;
  if (!gate) return [];
  const total = Math.max(0, Math.min(12, gate.requiredAchievements));
  const filled = Math.max(0, Math.min(total, Math.round(progress.value.current)));
  return Array.from({ length: total }, (_, index) => index < filled);
});
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
        v-if="feature.req.kind !== 'dopamine' && !gateActive"
        class="ml-auto text-[10px] font-mono text-slate-500 tabular-nums shrink-0"
      >
        {{ formattedCurrent }} / {{ formattedTarget }}
      </span>
      <!-- P3.2: dal kapısı devredeyken sayı + kademe göstergesi + aile ipucu -->
      <span v-else-if="gateActive" class="ml-auto flex items-center gap-2 shrink-0">
        <span class="flex items-center gap-0.5" aria-hidden="true">
          <span
            v-for="(filled, stepIndex) in gateSteps"
            :key="stepIndex"
            class="w-1.5 h-1.5 rounded-[1px]"
            :class="filled ? 'bg-cyan-400' : 'bg-white/15'"
          ></span>
        </span>
        <span class="text-[10px] font-mono text-slate-500 tabular-nums">{{ gateHint }}</span>
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
