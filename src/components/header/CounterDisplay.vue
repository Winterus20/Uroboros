<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useGameStore } from "../../stores/game";
import { format, getMassScaleBadge } from "../../core/format";
import { Decimal, D_1 } from "../../core/math";
import { sounds } from "../../core/audio";
import { Zap } from "lucide-vue-next";
import { useCounterHeat } from "../../composables/useCounterHeat";
import { useMpsTrend } from "../../composables/useMpsTrend";

const store = useGameStore();

const counterRef = ref<HTMLElement | null>(null);
const perSecRef = ref<HTMLElement | null>(null);
const dpsSurgeActive = ref(false);
const dpsSurgeDelta = ref("");
let popTimer: number | null = null;
let dpsSurgeTimer: number | null = null;

const comboCount = computed(() => store.clickCombo.count);
const comboUnlocked = computed(() => (store.neuralNodesBought["combo_unlock"] || 0) >= 1);
const comboActive = computed(() => comboUnlocked.value && comboCount.value >= 2);

function popCounter(intensity: 0 | 1 | 2 = 0): void {
  const el = counterRef.value?.parentElement ?? counterRef.value;
  if (!el) return;
  const comboClass = comboActive.value
    ? "count-pop-combo"
    : intensity === 2
      ? "count-pop-lg"
      : intensity === 1
        ? "count-pop-md"
        : "count-pop";
  el.classList.remove("count-pop", "count-pop-md", "count-pop-lg", "count-pop-combo");
  void el.offsetWidth;
  el.classList.add(comboClass);
  if (popTimer !== null) clearTimeout(popTimer);
  popTimer = window.setTimeout(
    () => el.classList.remove("count-pop", "count-pop-md", "count-pop-lg", "count-pop-combo"),
    380
  );
}

function onCounterPop(e: Event): void {
  const detail = (e as CustomEvent<{ intensity?: number }>).detail;
  const raw = detail?.intensity ?? 0;
  const intensity: 0 | 1 | 2 = raw === 2 ? 2 : raw === 1 ? 1 : 0;
  popCounter(intensity);
}

const { counterHeatClass, flameOn, decadeFlash, motionOff, checkDecade, syncDecade, disposeDecade } =
  useCounterHeat(counterRef);
const { mpsTrend, updateTrend } = useMpsTrend();

const formattedDopamine = computed(() => format(store.matter, 2, store.settings.notation));
const massScaleBadge = computed(() => getMassScaleBadge(store.matter));
const formattedPerSec = computed(() => format(store.matterPerSecond, 2, store.settings.notation));
const singularityReady = computed(() => store.canSingularity);

watch(singularityReady, (ready, prev) => {
  if (ready && !prev) {
    sounds.playAffordableNotice();
  }
});

const displayDopamine = ref("");
const displayPerSec = ref("");
const srSummary = ref("");
let srSummaryInterval: number | null = null;
let lastCounterRefresh = 0;
let lastSecondaryRefresh = 0;
let lastSmoothCheck = 0;
let smoothRaf = 0;

function refreshCounterText(): void {
  displayDopamine.value = formattedDopamine.value;
}

function refreshSecondaryText(): void {
  displayPerSec.value = formattedPerSec.value;
}

function refreshThrottledText(): void {
  refreshCounterText();
  refreshSecondaryText();
}

function refreshSrSummary(): void {
  srSummary.value = `Yutulan Kütle ${displayDopamine.value}, saniyede ${displayPerSec.value}`;
}

function tickSmooth(frameT: number): void {
  if (smoothRaf === 0) return;
  const counterEvery = motionOff.value ? 500 : 80;
  if (frameT - lastCounterRefresh >= counterEvery) {
    lastCounterRefresh = frameT;
    refreshCounterText();
  }
  if (frameT - lastSecondaryRefresh >= 500) {
    lastSecondaryRefresh = frameT;
    refreshSecondaryText();
  }
  if (frameT - lastSmoothCheck >= 500) {
    lastSmoothCheck = frameT;
    checkDecade();
    updateTrend(frameT);
  }
  smoothRaf = requestAnimationFrame(tickSmooth);
}

function handleCounterVisibility(): void {
  if (!document.hidden) {
    syncDecade();
  }
}

function onProductionBump(e: Event): void {
  const detail = (e as CustomEvent<{ delta: string }>).detail;
  if (!detail?.delta) return;
  const delta = new Decimal(detail.delta);
  if (delta.lte(0)) return;
  dpsSurgeDelta.value = `+${format(delta, 2, store.settings.notation)}/s`;
  dpsSurgeActive.value = true;
  try {
    const baseM = store.matter.gte(D_1) ? store.matter : D_1;
    const ratio = delta.div(baseM).toNumber();
    if (Number.isFinite(ratio) && ratio > 0.25) {
      popCounter(2);
      sounds.playTallyTick(1);
    } else {
      popCounter(1);
      sounds.playTallyTick(0.55);
    }
  } catch {
    popCounter(1);
  }
  const el = perSecRef.value;
  if (el) {
    el.classList.remove("dps-surge");
    void el.offsetWidth;
    el.classList.add("dps-surge");
  }
  if (dpsSurgeTimer !== null) clearTimeout(dpsSurgeTimer);
  dpsSurgeTimer = window.setTimeout(() => {
    dpsSurgeActive.value = false;
    dpsSurgeDelta.value = "";
    dpsSurgeTimer = null;
  }, 1200);
}

onMounted(() => {
  window.addEventListener("doomscroll:production-bump", onProductionBump as EventListener);
  window.addEventListener("doomscroll:counter-pop", onCounterPop as EventListener);
  syncDecade();
  const now = performance.now();
  lastSmoothCheck = now;
  lastCounterRefresh = now;
  lastSecondaryRefresh = now;
  refreshThrottledText();
  refreshSrSummary();
  srSummaryInterval = window.setInterval(refreshSrSummary, 5000);
  smoothRaf = requestAnimationFrame(tickSmooth);
  document.addEventListener("visibilitychange", handleCounterVisibility);
});

onUnmounted(() => {
  window.removeEventListener("doomscroll:production-bump", onProductionBump as EventListener);
  window.removeEventListener("doomscroll:counter-pop", onCounterPop as EventListener);
  document.removeEventListener("visibilitychange", handleCounterVisibility);
  if (dpsSurgeTimer !== null) {
    clearTimeout(dpsSurgeTimer);
    dpsSurgeTimer = null;
  }
  if (srSummaryInterval !== null) {
    clearInterval(srSummaryInterval);
    srSummaryInterval = null;
  }
  if (smoothRaf !== 0) {
    cancelAnimationFrame(smoothRaf);
    smoothRaf = 0;
  }
  disposeDecade();
  if (popTimer !== null) {
    clearTimeout(popTimer);
    popTimer = null;
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center my-4 py-1 relative z-10">
    <div
      v-if="singularityReady"
      class="inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-mono font-bold animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.25)]"
    >
      <span class="text-amber-400">⚡</span>
      <span>EVRENSEL TEKİLLİK EŞİĞİ AŞILDI — KOZMİK ÇÖKÜŞ HAZIR</span>
    </div>

    <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-0.5">
      <Zap class="w-3.5 h-3.5 text-purple-400" />
      <span>Yutulan Kütle</span>
      <span class="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 ml-1">{{ massScaleBadge }}</span>
    </span>

    <div
      ref="counterRef"
      aria-live="off"
      :aria-label="`Yutulan Kütle: ${displayDopamine}`"
      class="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tabular-nums tracking-tight my-0.5 select-all will-change-transform"
      :class="[
        flameOn
          ? 'flame-text'
          : singularityReady
            ? 'text-amber-200 counter-gold'
            : 'text-white counter-glow',
        flameOn ? '' : counterHeatClass,
        decadeFlash ? 'decade-flash' : ''
      ]"
    >
      {{ displayDopamine }}
    </div>
    <span class="sr-only" aria-live="polite">{{ srSummary }}</span>

    <div class="text-xs font-mono text-purple-300/80 flex items-center gap-2 mt-1">
      <span
        ref="perSecRef"
        :class="[
          'tabular-nums text-[15px] font-semibold inline-flex items-center gap-1.5',
          flameOn ? 'dps-burn' : 'text-purple-100'
        ]"
      >
        <span>+{{ displayPerSec }}/s</span>
        <span v-if="mpsTrend === 1" class="dps-delta-up" aria-hidden="true">▲</span>
        <span v-else-if="mpsTrend === -1" class="dps-delta-down" aria-hidden="true">▼</span>
        <span v-if="dpsSurgeActive && dpsSurgeDelta" class="text-emerald-300 font-bold text-[11px] animate-pulse">{{ dpsSurgeDelta }}</span>
      </span>
      <span
        v-if="store.formatUnlockBuffActive"
        class="text-[10px] font-mono text-cyan-200 bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-400/30 tabular-nums shrink-0"
        v-tip="'Yeni format keşfi: bu tier üretimine kısa süre ×1.25'"
      >
        📺 D{{ store.formatUnlockBuffTier }} · {{ store.formatUnlockBuffSecondsRemaining }}s
      </span>
    </div>
  </div>
</template>
