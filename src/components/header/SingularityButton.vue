<script setup lang="ts">
import { computed, ref } from "vue";
import { useGameStore } from "../../stores/game";
import { format } from "../../core/format";
import { Sun } from "lucide-vue-next";
import ConfirmModal from "../ConfirmModal.vue";

const store = useGameStore();

const singularityReady = computed(() => store.canSingularity);
const singularityGainText = computed(() => format(store.singularityGain, 2, store.settings.notation));
const nextSpMatterText = computed(() => format(store.nextSingularityPointAt, 2, store.settings.notation));
const singularityBroken = computed(() => store.hasBreakSingularity);
const singularityTip = computed(() =>
  singularityBroken.value
    ? `Kozmik Çöküş hazır! +${singularityGainText.value} SP (Sonraki SP: ${nextSpMatterText.value} g) — Planck sınırı yıkıldı, üstel büyüme devrede.`
    : `Kozmik Çöküş hazır! +${singularityGainText.value} SP — Planck Duvarı kilitli (1.79e308 g). Sınırı aşmak için Nöral Ağaç'tan Planck Duvarını Yıkma yükseltmesini almalısın.`
);

const inChallenge = computed(() => !!store.activeChallenge);
const challengeRewardShort = computed(() =>
  (store.activeChallengeDef?.rewardDesc || "").replace(/^Kalıcı ödül:\s*/, "")
);
const challengeTip = computed(() => {
  const def = store.activeChallengeDef;
  if (!def) return "";
  return `Meydan Okuma: ${def.name} — ${def.ruleDesc} Hedef: 1.79e308 g Kütle. Ödül: ${def.rewardDesc}.`;
});

const showSingularityConfirm = ref(false);
const showCompleteConfirm = ref(false);

function handleSingularity(): void {
  if (store.activeChallenge) {
    if (!store.canSingularity) return;
    if (!store.settings.confirmDialogs) {
      store.completeChallenge();
      return;
    }
    showCompleteConfirm.value = true;
    return;
  }
  if (!store.canSingularity) return;
  if (!store.settings.confirmDialogs) {
    store.singularityReset();
    return;
  }
  showSingularityConfirm.value = true;
}
</script>

<template>
  <div class="contents">
    <button
      v-if="inChallenge || singularityReady"
      @click="handleSingularity"
      :disabled="inChallenge && !singularityReady"
      aria-label="Kozmik çöküşü başlat veya meydan okumayı tamamla"
      class="btn-tactile h-11 px-2.5 sm:px-3 rounded-xl border text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shrink-0 min-w-[70px] sm:min-w-[90px]"
      :class="inChallenge && !singularityReady
        ? 'bg-black/30 text-slate-600 border-white/[0.05] cursor-not-allowed ds-ramp-partial'
        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-md animate-pulse'"
      v-tip="inChallenge ? challengeTip : singularityTip"
    >
      <Sun class="w-4 h-4 text-slate-950/80 shrink-0" />
      <div class="flex flex-col items-start text-left leading-tight min-w-0">
        <span class="text-[10px] text-slate-950/80 font-normal">{{ inChallenge ? "Meydan" : "Tekillik" }}</span>
        <span class="text-xs font-black tabular-nums truncate max-w-[110px] sm:max-w-[150px]">
          {{ inChallenge ? challengeRewardShort : `+${singularityGainText}` }}
        </span>
      </div>
    </button>

    <ConfirmModal
      v-if="showSingularityConfirm"
      title="Kozmik Çöküş"
      message="Yutulan kütle ve tüm katmanlar sıfırlanacak; karşılığında kalıcı Tekillik Puanı (SP) kazanacaksın. Hazır mısın?"
      confirm-label="Çöküşü Başlat"
      :danger="false"
      @confirm="store.singularityReset(); showSingularityConfirm = false"
      @cancel="showSingularityConfirm = false"
    />

    <ConfirmModal
      v-if="showCompleteConfirm && store.activeChallengeDef"
      title="Meydan Okumayı Tamamla"
      :message="`“${store.activeChallengeDef.name}” hedefi tuttu (1.79e308 g Kütle). Koşu sıfırlanacak ve kalıcı ödül kazanacaksın: ${store.activeChallengeDef.rewardDesc}. Onaylıyor musun?`"
      confirm-label="Ödülü Al"
      :danger="false"
      @confirm="store.completeChallenge(); showCompleteConfirm = false"
      @cancel="showCompleteConfirm = false"
    />
  </div>
</template>
