<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../stores/game";
import { Bot, Power, Cpu, Activity, Sparkles, Gauge, Radio } from "lucide-vue-next";
import TabHero from "./TabHero.vue";
import AutobuyerCard from "./autobuyers/AutobuyerCard.vue";
import AutobuyerBulkControls from "./autobuyers/AutobuyerBulkControls.vue";

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

      <AutobuyerBulkControls />

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

      <AutobuyerBulkControls />

      <!-- Faz 0 Bot Listesi -->
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
