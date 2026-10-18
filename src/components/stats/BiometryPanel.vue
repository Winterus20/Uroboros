<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useGameStore } from "../../stores/game";
import { format, formatTime } from "../../core/format";
import {
  Orbit,
  Clock,
  Sparkles,
  Moon,
  BatteryMedium,
  Crosshair,
  Sun,
  Share2,
  Check
} from "lucide-vue-next";

const store = useGameStore();

const bio = computed(() => store.biometrics);
const copied = ref(false);
let copiedTimer: number | null = null;

onUnmounted(() => {
  if (copiedTimer !== null) {
    clearTimeout(copiedTimer);
    copiedTimer = null;
  }
});

async function copyReport(): Promise<void> {
  const b = bio.value;
  const fastestStr = Number.isFinite(store.stats.fastestSingularity)
    ? formatTime(store.stats.fastestSingularity)
    : "—";

  const text = [
    "🌌 UROBOROS: THE COSMIC FEAST — KOZMİK ÇÖKÜŞ RAPORU",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `⏱️ Toplam Çekim Süresi: ${formatTime(store.stats.totalPlaytime)}`,
    `🌌 Manuel Yutma: ${format(store.stats.manualClicks, 2, store.settings.notation)} kez`,
    `⚡ Zirve Çekim Hızı: ${format(store.stats.highestDps, 2, store.settings.notation)} / sn`,
    `🌀 Kozmik Çöküş: ${store.stats.singularityCount} kez (Rekor: ${fastestStr})`,
    `🪐 Kütle Eşdeğeri: ${b.cosmicPrey?.multiplierText || "—"}`,
    `✍️ Kütleyi Yazma Süresi: ${b.writingParadox?.writingTimeFormatted || "—"} (${b.writingParadox?.digitsFormatted || ""})`,
    `👁️ Tekillik Teşhisi: ${b.zombieRank}`,
    `🔋 Kozmik Yoğunluk: %${b.mentalBatteryPct}`,
    `🌌 Ayrıştırılan Foton: ${format(b.blueLightPhotons, 2, store.settings.notation)}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "#Uroboros #TheCosmicFeast #Incremental"
  ].join("\n");

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    copied.value = true;
    if (copiedTimer !== null) clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => {
      copied.value = false;
      copiedTimer = null;
    }, 2200);
  } catch (err) {
    console.error("Kopyalama başarısız:", err);
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- 5.1 Kozmik Kütle & Yazma Telemetrisi -->
    <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Orbit class="w-5 h-5 text-purple-400" />
          <div>
            <h3 class="text-xs font-bold text-slate-100">Kozmik Kütle Analizi</h3>
            <p class="text-[10px] text-slate-400">Yutulan kütlenin basamak yazma süresi ve evrensel eşdeğeri</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-base font-mono font-extrabold text-purple-300 tabular-nums">
            {{ bio.writingParadox.writingTimeFormatted }}
          </div>
          <div class="text-[10px] font-mono text-slate-500 tabular-nums">
            ({{ bio.writingParadox.digitsFormatted }})
          </div>
        </div>
      </div>

      <div class="space-y-2 pt-2 border-t border-white/[0.05] text-xs">
        <!-- 1. Yazma Süresi -->
        <div class="flex items-start gap-2 text-slate-300 leading-relaxed">
          <Clock class="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span>
              Saniyede 3 basamak hızla aralıksız yazsaydınız, bu kütleyi yazmak
              <strong class="text-slate-300 font-mono font-bold tabular-nums">{{ bio.writingParadox.writingTimeFormatted }}</strong>
              sürerdi.
            </span>
            <span class="text-[10px] text-slate-500 block mt-0.5 font-mono">
              {{ bio.writingParadox.humorousQuote }}
            </span>
          </div>
        </div>

        <!-- 2. Kütle Eşdeğerliği -->
        <div class="flex items-start gap-2 text-slate-300 leading-relaxed">
          <Sparkles class="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <span>
              Bu yutulan kütleyle tam
              <strong class="text-purple-300 font-mono font-bold tabular-nums">{{ bio.cosmicPrey.multiplierText }}</strong>
              oluşturulabilir.
            </span>
            <span class="text-[11px] text-slate-400 block mt-0.5">
              {{ bio.cosmicPrey.summaryText }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 5.2 Kozmik Ayrışma & Kararlılık -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-2">
        <div class="flex items-center gap-2">
          <Moon class="w-4 h-4 text-purple-400" />
          <h4 class="text-xs font-bold text-slate-200">Kozmik Ayrışma Süresi</h4>
        </div>
        <div class="text-xl font-mono font-extrabold text-purple-300 tabular-nums">
          {{ Math.floor(bio.lostSleepHours) }} sa {{ Math.round((bio.lostSleepHours % 1) * 60) }} dk
        </div>
        <p class="text-[10px] text-slate-400 leading-relaxed">
          "Sadece laboratuvarda moleküler bağları ayrıştıracaktık." Planck duvarı yırtıldı; mikro-karadelik doymak bilmiyor.
        </p>
      </div>

      <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <BatteryMedium class="w-4 h-4 text-cyan-400" />
            <h4 class="text-xs font-bold text-slate-200">Kozmik Kararlılık (Kritik Kütle)</h4>
          </div>
          <span class="text-xs font-mono font-bold text-cyan-300 tabular-nums">
            %{{ bio.mentalBatteryPct }}
          </span>
        </div>

        <div class="progress-track progress-track-lg progress-track-bordered relative overflow-hidden">
          <!-- Eşik işaretçileri: %20 kritik eşik (rose) ve %50 uyarı eşiği (amber) -->
          <div class="absolute inset-0 flex pointer-events-none z-10" aria-hidden="true">
            <div class="w-[20%] border-r border-rose-500/40"></div>
            <div class="w-[30%] border-r border-amber-500/40"></div>
          </div>
          <div
            class="progress-fill relative"
            :class="
              bio.mentalBatteryPct > 50
                ? 'progress-fill-cyan'
                : bio.mentalBatteryPct > 20
                ? 'progress-fill-slate'
                : 'progress-fill-rose animate-pulse'
            "
            :style="{ width: `${bio.mentalBatteryPct}%` }"
          ></div>
        </div>
        <p class="text-[10px] text-slate-400">
          Tekillik genişledikçe çevresel uzay-zaman bükülme yoğunluğu.
        </p>
      </div>
    </div>

    <!-- 5.3 Mavi Işık Foton Dozu & Bağımlılık Rütbesi -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-1">
        <div class="flex items-center gap-2">
          <Crosshair class="w-4 h-4 text-cyan-400" />
          <h4 class="text-xs font-bold text-slate-200">Yutulan Radyasyon &amp; Hawking Işıması</h4>
        </div>
        <div class="text-lg font-mono font-extrabold text-cyan-300 tabular-nums">
          {{ format(bio.blueLightPhotons, 2, store.settings.notation) }} Foton
        </div>
        <p class="text-[10px] text-slate-400">
          Olay ufkuna çarpan parçacıkların saçtığı enerjik fotonlar ve kuantum ışıma.
        </p>
      </div>

      <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-1">
        <div class="flex items-center gap-2">
          <Sun class="w-4 h-4 text-amber-400" />
          <h4 class="text-xs font-bold text-slate-200">Kozmik Tekillik Teşhisi</h4>
        </div>
        <div class="text-sm font-mono mt-1" :class="bio.zombieRankColor">
          {{ bio.zombieRank }}
        </div>
        <p class="text-[10px] text-slate-400">
          Kütle çekim süresi ve çöküş eşiklerine göre evrensel oburluk rütben.
        </p>
      </div>
    </div>

    <!-- 5.4 Tekillik Raporunu Kopyala (Share Card) -->
    <div class="glass-panel-card p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 flex flex-col md:flex-row items-center justify-between gap-3">
      <div>
        <h4 class="text-xs font-bold text-purple-200 flex items-center gap-1.5">
          <Share2 class="w-4 h-4 text-purple-400" />
          Tekillik Karnesini Paylaş
        </h4>
        <p class="text-[10px] text-slate-400">
          Discord, WhatsApp veya Reddit'te arkadaşlarına evreni ne kadar yuttuğunu göster.
        </p>
      </div>

      <button
        aria-label="Tekillik raporunu panoya kopyala"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg shrink-0"
        :class="
          copied
            ? 'bg-cyan-600 shadow-cyan-900/50'
            : 'bg-purple-600 hover:bg-purple-500 active:scale-95 shadow-purple-900/50'
        "
        @click="copyReport"
      >
        <component :is="copied ? Check : Share2" class="w-4 h-4" />
        <span>{{ copied ? "Kopyalandı! ✓" : "Raporu Panoya Kopyala" }}</span>
      </button>
    </div>
  </div>
</template>
