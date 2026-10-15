<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../../stores/game";
import { formatTime } from "../../core/format";
import { CHALLENGES } from "../../game/challenges";
import {
  Swords,
  ShieldCheck,
  Sparkles,
  Flame,
  EyeOff,
  FlaskConical,
  Zap,
  Cpu
} from "lucide-vue-next";

const store = useGameStore();

const challengeList = computed(() => {
  return CHALLENGES.map((c) => {
    const isCompleted = store.completedChallenges.includes(c.id);
    const isRunning = store.activeChallenge === c.id;
    const bestTime = store.challengeBestTimes[c.id];
    return {
      ...c,
      isCompleted,
      isRunning,
      bestTimeText: bestTime !== undefined ? formatTime(bestTime) : "—"
    };
  });
});
</script>

<template>
  <div class="space-y-3">
    <!-- C1-C8 Hız Rekorları -->
    <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Swords class="w-4 h-4 text-rose-400" />
          <span class="text-xs font-bold text-slate-200">Kozmik Kriz Meydan Okumaları Rekorları (C1–C8)</span>
        </div>
        <span class="text-[11px] font-mono text-rose-300">
          Tamamlanan: {{ store.completedChallenges.length }} / 8
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="c in challengeList"
          :key="c.id"
          class="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] flex items-center justify-between text-xs"
          :class="{ 'border-cyan-500/30 bg-cyan-950/10': c.isCompleted }"
        >
          <div class="min-w-0 pr-2">
            <div class="flex items-center gap-1.5 font-bold text-slate-200 truncate">
              <span>{{ c.icon }}</span>
              <span>{{ c.name }}</span>
              <ShieldCheck v-if="c.isCompleted" class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            </div>
            <div class="text-[10px] text-slate-400 truncate mt-0.5">
              {{ c.rewardDesc }}
            </div>
          </div>

          <div class="text-right shrink-0">
            <div class="text-[10px] text-slate-500 font-mono">En İyi Süre</div>
            <div
              class="font-mono font-bold text-xs tabular-nums"
              :class="c.isCompleted ? 'text-cyan-300' : 'text-slate-500'"
            >
              {{ c.bestTimeText }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kriz Anomalileri ve Mini-Oyun Telemetrisi -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <Sparkles class="w-4 h-4 text-cyan-300" />
          <span class="text-xs text-slate-300 font-medium">Tıklanan Kozmik Dalgalanmalar</span>
        </div>
        <span class="text-sm font-mono font-bold text-white tabular-nums">
          {{ store.stats.anomaliesClicked.toLocaleString("tr-TR") }}
        </span>
      </div>

      <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <Flame class="w-4 h-4 text-rose-400" />
          <span class="text-xs text-slate-300 font-medium">Rezonans Hipnozları</span>
        </div>
        <span class="text-sm font-mono font-bold text-rose-300 tabular-nums">
          {{ store.stats.combosTriggered.toLocaleString("tr-TR") }}
        </span>
      </div>

      <div class="glass-panel-card p-3 rounded-xl border border-cyan-400/20 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <Sparkles class="w-4 h-4 text-cyan-300" />
          <span class="text-xs text-slate-300 font-medium">Kozmik Tekillik Yakalamaları</span>
        </div>
        <span class="text-sm font-mono font-bold text-cyan-200 tabular-nums">
          {{ (store.stats.mythicsClicked || 0).toLocaleString("tr-TR") }}
        </span>
      </div>

      <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <EyeOff class="w-4 h-4 text-rose-400" />
          <span class="text-xs text-slate-300 font-medium">Etkisizleştirilen Kozmik Parazitler</span>
        </div>
        <span class="text-sm font-mono font-bold text-rose-300 tabular-nums">
          {{ store.stats.slackersFired.toLocaleString("tr-TR") }}
        </span>
      </div>

      <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <FlaskConical class="w-4 h-4 text-emerald-400" />
          <span class="text-xs text-slate-300 font-medium">Kuantum Lab Hasatları</span>
        </div>
        <span class="text-sm font-mono font-bold text-emerald-300 tabular-nums">
          {{ (store.stats.labHarvests || 0).toLocaleString("tr-TR") }}
        </span>
      </div>

      <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <Zap class="w-4 h-4 text-cyan-400" />
          <span class="text-xs text-slate-300 font-medium">Kozmik Müdahale Kararları</span>
        </div>
        <span class="text-sm font-mono font-bold text-cyan-300 tabular-nums">
          {{ (store.stats.spellsCast || 0).toLocaleString("tr-TR") }}
        </span>
      </div>

      <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <Cpu class="w-4 h-4 text-purple-400" />
          <span class="text-xs text-slate-300 font-medium">Ekilen Lab Trendleri</span>
        </div>
        <span class="text-sm font-mono font-bold text-purple-300 tabular-nums">
          {{ (store.stats.seedsPlanted || 0).toLocaleString("tr-TR") }}
        </span>
      </div>
    </div>
  </div>
</template>
