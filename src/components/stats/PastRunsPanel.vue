<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../../stores/game";
import { format, formatTime } from "../../core/format";
import { Moon } from "lucide-vue-next";

const store = useGameStore();

const pastRuns = computed(() => store.pastSingularities);
const pastAverages = computed(() => store.pastSingularitiesAverage);
</script>

<template>
  <div class="space-y-3">
    <!-- Boş Durum (Henüz prestij yoksa) -->
    <div
      v-if="pastRuns.length === 0"
      class="glass-panel-card p-8 rounded-xl border border-white/[0.06] text-center space-y-2"
    >
      <Moon class="w-10 h-10 text-purple-400 mx-auto opacity-60" />
      <h3 class="text-sm font-bold text-white">Henüz Kozmik Çöküş Yaşanmadı</h3>
      <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
        1.79e308 g Kütle tekilliğine ulaşıp ilk çöküşünü gerçekleştirdiğinde veya bir Kozmik Krizi
        tamamladığında; son 10 çöküşün süre, SP kazancı ve <b>SP / Dakika verimi</b> burada listelenecektir.
      </p>
    </div>

    <!-- Kayıtlar Mevcutsa -->
    <template v-else>
      <!-- Ortalama ve Hız Rekoru Bannerı -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06]">
          <div class="text-[10px] text-slate-400 font-medium">Ortalama Koşu Süresi</div>
          <div class="text-base font-mono font-bold text-cyan-300 tabular-nums mt-0.5">
            {{ formatTime(pastAverages.avgDuration) }}
          </div>
        </div>

        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06]">
          <div class="text-[10px] text-slate-400 font-medium">Ortalama SP / Dakika Verimi</div>
          <div class="text-base font-mono font-bold text-amber-300 tabular-nums mt-0.5">
            {{ format(pastAverages.avgSpPerMinute, 2, store.settings.notation) }} / dk
          </div>
        </div>

        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06]">
          <div class="text-[10px] text-slate-400 font-medium">En Hızlı Çöküş Rekoru</div>
          <div class="text-base font-mono font-bold text-amber-300 tabular-nums mt-0.5">
            {{ formatTime(store.stats.fastestSingularity) }}
          </div>
        </div>
      </div>

      <!-- Son 10 Çöküş Tablosu -->
      <div class="glass-panel-card rounded-xl border border-white/[0.06] overflow-hidden">
        <div class="p-3 border-b border-white/[0.06] flex items-center justify-between">
          <span class="text-xs font-bold text-slate-200">Son 10 Kozmik Çöküşün Telemetrisi</span>
          <span class="text-[10px] text-slate-500 font-mono">En Yeni → Eski</span>
        </div>

        <div class="divide-y divide-white/[0.04]">
          <div
            v-for="(run, idx) in pastRuns"
            :key="run.id + '-' + run.timestamp"
            class="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono font-bold text-slate-500 w-6">#{{ pastRuns.length - idx }}</span>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-bold text-slate-100">
                    {{ formatTime(run.duration) }}
                  </span>
                  <span
                    v-if="run.challengeId"
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  >
                    Meydan Okuma: {{ run.challengeId.toUpperCase() }}
                  </span>
                  <span
                    v-else
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  >
                    Standart Çöküş
                  </span>
                </div>
                <div class="text-[10px] text-slate-500 font-mono">
                  Zirve: {{ format(run.peakMatter, 2, store.settings.notation) }} g Kütle
                </div>
              </div>
            </div>

            <div class="flex items-center gap-4 text-right">
              <div>
                <div class="text-xs font-mono font-bold text-cyan-300 tabular-nums">
                  {{ run.challengeId ? "Tamamlandı" : `+${format(run.spGained, 2, store.settings.notation)} SP` }}
                </div>
                <div
                  v-if="!run.challengeId"
                  class="text-[10px] font-mono font-bold text-amber-400 tabular-nums"
                >
                  {{ format(run.spPerMinute, 2, store.settings.notation) }} SP/dk
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
