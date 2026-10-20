<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useGameStore } from "../stores/game";
import { Bot, Power, Cpu, Activity, Sparkles, Gauge, Radio, Zap } from "lucide-vue-next";
import TabHero from "./TabHero.vue";
import AutobuyerCard from "./autobuyers/AutobuyerCard.vue";
import AutobuyerBulkControls from "./autobuyers/AutobuyerBulkControls.vue";
import { formatNumber } from "../core/format";
import {
  CHIP_MAX_LEVEL,
  isSpeedChipMaxed,
  speedChipEffectLabel
} from "../game/speed-chip";

const store = useGameStore();

// Kokpit modu kontrolü (singularities >= 1)
const isCockpit = computed(() => store.isCockpitMode);

// Hız çarpanı
const speedMultiplier = computed(() => store.autobuyerFleetSpeedMult.toFixed(1));

// Tüm açık botlar aktif mi
const allEnabled = computed(() => {
  const bots = Object.values(store.autobuyers).filter((b) => b.unlocked);
  return bots.length > 0 && bots.every((b) => b.enabled);
});

function toggleAll() {
  store.toggleAllAutobuyers();
}

// Bot Gruplamaları (Kokpit Görünümü İçin)
const dimensionBots = computed(() => {
  return Object.entries(store.autobuyers).filter(([k]) => k.startsWith("dim"));
});

const speedBot = computed(() => {
  return store.autobuyers.tickspeed ? [["tickspeed", store.autobuyers.tickspeed] as const] : [];
});

// ---------------------------------------------------------------------------
// M1 — Otonom Hız Çipi (bot speed chip)
// ---------------------------------------------------------------------------
// M1 v2: çip artık bot satın alma ARALIĞINI değil, BOYUT ÜRETİM ÇARPANINI
// yükseltir: çarpan = 1.1^seviye (seviye 5 → ×1.61 ≈ bir boyut kovasının değeri).
// Görsel öncelik: önce çubuk + sayı, metin yalnız nüans taşır.
// Saf çekirdek: src/game/speed-chip.ts (tek sabit kaynağı).

// Tavan doldu mu? (CHIP_MAX_LEVEL)
const chipMaxed = computed(() => isSpeedChipMaxed(store.speedChipLevel));

// Boyut üretim çarpanı: store.speedChipProductionMult (Decimal) → ortak
// biçimlendirme yardımcısı (bulk/max kartlarıyla aynı çağrı şekli).
const chipProductionMultText = computed(() =>
  formatNumber(store.speedChipProductionMult, store.settings.notation)
);

// Seviye çubuğu: seviye / CHIP_MAX_LEVEL (görsel ilerleme).
const chipLevelPercent = computed(() => (store.speedChipLevel / CHIP_MAX_LEVEL) * 100);

// Kısa insan-okur etiket (0'da "Etkisiz", üstünde boyut üretim çarpanı).
const chipEffectText = computed(() => speedChipEffectLabel(store.speedChipLevel));

// Seviye rozeti: 0 = nötr (gri), tavan = altın (milestone), ara = cyan.
const chipBadgeText = computed(() => {
  if (chipMaxed.value) return "TAVAN";
  if (store.speedChipLevel <= 0) return "AKTİF DEĞİL";
  return `SEVİYE ${store.speedChipLevel}`;
});

const chipBadgeClass = computed(() => {
  if (chipMaxed.value) return "ds-badge-amber";
  if (store.speedChipLevel <= 0) return "ds-badge-slate";
  return "ds-badge-cyan";
});

// Maliyet — bulk/max kartlarındaki biçimlendirme yardımcısıyla aynı.
const chipCostText = computed(() => formatNumber(store.speedChipCost, store.settings.notation));

// Satın al butonu metni (bir sonraki seviyeyi söyler).
const chipButtonText = computed(() => {
  if (chipMaxed.value) return "Çip Tavanda";
  if (store.speedChipLevel <= 0) return "Hızı Başlat · Seviye 1";
  return `Hızı Yükselt · Seviye ${store.speedChipLevel + 1}`;
});

// Satın alma geri bildirimi: efekt sayısı tek seferlik parlama (decade-flash deseni).
// Ses store action'ının içinde çalar (sounds.playUpgrade) — buton durumu da değişir.
const chipEffectRef = ref<HTMLElement | null>(null);
let chipFlashTimer: number | null = null;

function buyChip(): void {
  const bought = store.buySpeedChip();
  if (!bought) return;
  const el = chipEffectRef.value;
  if (!el) return;
  el.classList.remove("decade-flash");
  void el.offsetWidth; // reflow — animasyonun yeniden tetiklenmesi için
  el.classList.add("decade-flash");
  if (chipFlashTimer !== null) clearTimeout(chipFlashTimer);
  chipFlashTimer = window.setTimeout(() => el.classList.remove("decade-flash"), 900);
}

onUnmounted(() => {
  if (chipFlashTimer !== null) clearTimeout(chipFlashTimer);
});
</script>

<template>
  <div class="space-y-4">
    <!-- ========================================================= -->
    <!-- MOD B: PRESTİJ SONRASI KOZMİK OTONOMİ KOKPİTİ             -->
    <!-- ========================================================= -->
    <template v-if="isCockpit">
      <!-- Kokpit Hero -->
      <TabHero
        :icon="Radio"
        icon-class="text-cyan-400"
        title="Kozmik Otonomi Kokpiti"
        badge="Merkezi Komuta"
        badge-class="ds-badge-cyan"
        subtitle="Evrenler boyu edinilmiş kuantum otonomi filosu. Tüm botlar kalıcı lisansla emrinde."
        accent="cyan"
      >
        <template #stats>
          <!-- Filo Durum Kutusu -->
          <div class="stat-box">
            <div class="stat-box-label">Filo Çevrimiçi</div>
            <div class="stat-box-value text-cyan-300 flex items-center gap-1.5">
              <Activity class="w-3.5 h-3.5 animate-pulse text-cyan-300" />
              <span class="tabular-nums font-mono">{{ store.activeAutobuyersCount }}/{{ store.totalAutobuyersCount }} Bot</span>
            </div>
            <div class="progress-track progress-track-mini w-20 mt-1">
              <div
                class="progress-fill progress-fill-cyan"
                :style="{ width: `${store.totalAutobuyersCount > 0 ? (store.activeAutobuyersCount / store.totalAutobuyersCount) * 100 : 0}%` }"
              ></div>
            </div>
          </div>

          <!-- Overclock Hız Kutusu -->
          <div class="stat-box">
            <div class="stat-box-label">Aşırı Yükleme</div>
            <div class="stat-box-value text-cyan-400 flex items-center gap-1.5">
              <Cpu class="w-3.5 h-3.5 text-cyan-400" />
              <span class="tabular-nums font-mono">{{ speedMultiplier }}× Hız</span>
            </div>
          </div>

          <!-- Ana Şalter (Master Switch) -->
          <button
            @click="toggleAll"
            class="btn-tactile px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-lg"
            :class="allEnabled
              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30'
              : 'bg-white/[0.06] text-slate-300 border-white/10 hover:bg-white/[0.10]'"
          >
            <Power class="w-3.5 h-3.5" />
            <span>{{ allEnabled ? 'Filoyu Durdur' : 'Filoyu Başlat' }}</span>
          </button>
        </template>
      </TabHero>
    </template>

    <!-- ========================================================= -->
    <!-- MOD A: FAZ 0 DÜKKAN MODU (singularities === 0)              -->
    <!-- ========================================================= -->
    <template v-else>
      <TabHero
        :icon="Bot"
        icon-class="text-blue-400"
        title="Otomatik Çekim Botları (Autobuyers)"
        badge="Otonom Çekim"
        badge-class="ds-badge-blue"
        subtitle="Kuantum boyutlarını, Çekim Hızını (Hz) ve Ölçek Sıçramalarını otomatik olarak satın alan otonom nano-botlar."
        accent="blue"
      >
        <template #stats>
          <div class="stat-box">
            <div>
              <div class="stat-box-label">Bot İşlem Hızı</div>
              <div class="stat-box-value text-cyan-400 flex items-center gap-1">
                <Cpu class="w-3.5 h-3.5 text-cyan-400" />
                <span class="tabular-nums">{{ speedMultiplier }}× Hız</span>
              </div>
            </div>
          </div>
          <button
            @click="toggleAll"
            class="btn-tactile px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border"
            :class="allEnabled
              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30'
              : 'bg-black/40 text-slate-300 border-white/[0.08] hover:border-white/[0.16]'"
          >
            <Power class="w-3.5 h-3.5" />
            <span>{{ allEnabled ? 'Tümünü Kapat' : 'Tümünü Aç' }}</span>
          </button>
        </template>
      </TabHero>
    </template>

    <!-- Toplu/MAKS konsolu (iki modda da aynı bileşen) -->
    <AutobuyerBulkControls />

    <!-- ========================================================= -->
    <!-- M1 — OTONOM HIZ ÇİPİ (boyut üretim çarpanını yükseltir)    -->
    <!-- ========================================================= -->
    <div
      class="glass-panel-card p-4 rounded-xl border flex flex-col justify-between"
      :class="chipMaxed
        ? 'border-amber-500/40 bg-amber-950/10'
        : store.speedChipLevel > 0
          ? 'border-cyan-500/40 bg-cyan-950/20'
          : 'border-white/[0.08] bg-black/40'"
    >
      <div>
        <!-- Başlık + seviye rozeti -->
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Cpu class="w-4 h-4 text-cyan-400" />
            <h3 class="text-xs font-bold font-mono text-slate-200">Otonom Hız</h3>
          </div>
          <span class="ds-badge" :class="chipBadgeClass">{{ chipBadgeText }}</span>
        </div>

        <!-- Etki (görsel): boyut üretim çarpanı + seviye çubuğu -->
        <div class="flex items-baseline justify-between">
          <span class="text-[11px] font-mono text-slate-400">Boyut üretimi</span>
          <span
            ref="chipEffectRef"
            class="text-sm font-mono font-bold tabular-nums text-cyan-300"
            :aria-label="`Boyut üretim çarpanı ${chipProductionMultText}`"
          >×{{ chipProductionMultText }}</span>
        </div>
        <div class="progress-track progress-track-mini mt-1.5">
          <div
            class="progress-fill"
            :class="chipMaxed ? 'progress-fill-amber' : 'progress-fill-cyan'"
            :style="{ width: `${chipLevelPercent}%` }"
          ></div>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-[10px] font-mono text-slate-500 tabular-nums">Seviye {{ store.speedChipLevel }} / {{ CHIP_MAX_LEVEL }}</span>
          <span class="text-[10px] font-mono text-slate-400">{{ chipEffectText }}</span>
        </div>

        <!-- Maliyet (bulk/max kartlarıyla aynı bicim) -->
        <div class="text-[11px] font-mono text-slate-400 mt-2">
          Maliyet:
          <span
            class="font-bold tabular-nums"
            :class="store.canBuySpeedChip ? 'text-cyan-300' : 'text-slate-500'"
          >{{ chipCostText }}</span>
          g Kütle
        </div>
      </div>

      <!-- Satın al -->
      <div class="mt-3 pt-3 border-t border-white/[0.06]">
        <button
          @click="buyChip"
          :disabled="!store.canBuySpeedChip"
          class="btn-tactile w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border"
          :class="store.canBuySpeedChip
            ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-500/40 affordance-pulse'
            : 'bg-black/30 text-slate-500 border-white/[0.05] cursor-not-allowed'"
        >
          <Zap class="w-3.5 h-3.5" />
          <span>{{ chipButtonText }}</span>
        </button>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- MOD B İÇERİĞİ: KOKPİT KANATLARI                            -->
    <!-- ========================================================= -->
    <template v-if="isCockpit">
      <!-- KANAT 1: Kuantum Boyut Botları (D1 - D8) -->
      <div>
        <div class="flex items-center gap-2 mb-2 px-1">
          <Sparkles class="w-3.5 h-3.5 text-blue-400" />
          <h2 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Kuantum Boyut Botları (D1 – D8)</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <AutobuyerCard
            v-for="[key] in dimensionBots"
            :key="key"
            variant="dim"
            :bot-key="String(key)"
          />
        </div>
      </div>

      <!-- KANAT 2 & 3: Frekans & Makro Çöküş Yöneticileri -->
      <div>
        <div class="flex items-center gap-2 mb-2 px-1">
          <Gauge class="w-3.5 h-3.5 text-cyan-400" />
          <h2 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Kozmik Hız & Makro Operatörler</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Frekans (Hz) Botu -->
          <AutobuyerCard
            v-for="[key] in speedBot"
            :key="key"
            variant="operator"
            :bot-key="String(key)"
          />

          <!-- Akış Sıçraması (Shift) Botu -->
          <AutobuyerCard
            v-if="store.autobuyers.shift"
            variant="operator"
            bot-key="shift"
          />

          <!-- Akış Kümeleri (Galaxy) Botu -->
          <AutobuyerCard
            v-if="store.autobuyers.galaxy"
            variant="operator"
            bot-key="galaxy"
          />

          <!-- Şafak Nöbeti (Singularity) Botu -->
          <AutobuyerCard
            v-if="store.autobuyers.singularity"
            variant="operator"
            bot-key="singularity"
          />
        </div>
      </div>
    </template>

    <!-- ========================================================= -->
    <!-- MOD A İÇERİĞİ: FAZ 0 BOT LİSTESİ                           -->
    <!-- ========================================================= -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AutobuyerCard
          v-for="(_, key) in store.autobuyers"
          :key="key"
          variant="shop"
          :bot-key="String(key)"
        />
      </div>
    </template>
  </div>
</template>
