<script setup lang="ts">
import { ref } from "vue";
import { useGameStore, LAB_SEEDS, LAB_RECIPES } from "../stores/game";
import { formatNumber } from "../core/format";
import type { LabSeedType } from "../models/types";
import {
  Atom,
  Sparkles,
  Info,
  Zap,
  Flame,
  Activity,
  Orbit,
  BookOpen,
  Layers,
  X,
  Crown
} from "lucide-vue-next";
import TabHero from "./TabHero.vue";
import LockedFeature from "./LockedFeature.vue";
import LabSeedCard from "./lab/LabSeedCard.vue";
import LabRecipeList from "./lab/LabRecipeList.vue";
import ViralGrid from "./lab/ViralGrid.vue";
import TrendReactor from "./lab/TrendReactor.vue";
import ConfirmModal from "./ConfirmModal.vue";

const store = useGameStore();
const selectedSeedType = ref<LabSeedType>("photon_resonator");
const showCodexModal = ref(false);
const showCollapseConfirm = ref(false);

// Parçacık kademesi (Özellik Merdiveni): Foton başlangıçta, Nükleon/Gluon/Graviton sırayla açılır
const SEED_UNLOCK_FEATURES: Partial<Record<LabSeedType, string>> = {
  heavy_nucleon: "seed_nucleon",
  gluon_binder: "seed_gluon",
  graviton_trap: "seed_graviton"
};

function seedUnlockFeatureId(seedType: LabSeedType): string | null {
  return SEED_UNLOCK_FEATURES[seedType] || null;
}

function isSeedLocked(seedType: LabSeedType): boolean {
  const featureId = seedUnlockFeatureId(seedType);
  return !!featureId && !store.isFeatureUnlocked(featureId);
}

function isSeedDiscovered(seedType: LabSeedType): boolean {
  return store.discoveredFormulas.includes(seedType);
}

function handleCollapseReactor() {
  if (!store.canCollapseReactor) return;
  if (store.settings.confirmDialogs) {
    showCollapseConfirm.value = true;
    return;
  }
  store.collapseReactor();
}
</script>

<template>
  <div class="space-y-3.5">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="Atom"
      icon-class="text-cyan-400"
      title="Kuantum Parçacık Reaktörü & Akı Matrisi"
      badge="Kuantum Reaktörü"
      badge-class="ds-badge-cyan"
      subtitle="Atomaltı kuantum parçacıklarını rezonans matrisine yerleştir, süperiletken akı hatlarıyla egzotik izotopları sentezle ve Reaktörü tekilliğe kurban et!"
      accent="cyan"
    >
      <template #stats>
        <div class="stat-box flex-wrap gap-y-2">
          <div>
            <div class="stat-box-label">Pasif Akı</div>
            <div class="stat-box-value text-cyan-400 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-cyan-400" />
              <span>×{{ formatNumber(store.labPassiveMultiplier, store.settings.notation) }}</span>
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div>
            <div class="stat-box-label">Manuel Yutma</div>
            <div class="stat-box-value text-cyan-400">
              ×{{ formatNumber(store.labClickMultiplier, store.settings.notation) }}
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div>
            <div class="stat-box-label">Parçacık Atlası</div>
            <div class="stat-box-value text-cyan-400">
              +{{ store.labCodexBonusPercent }}% Kalıcı
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div>
            <div class="stat-box-label">Kozmik Relik</div>
            <div class="stat-box-value text-purple-400 flex items-center gap-1">
              <Crown class="w-3.5 h-3.5 text-purple-400" />
              <span>Lv. {{ store.reactorCollapseCount || 0 }}</span>
            </div>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Plazma Besleme Rejimleri (Modlar) -->
    <div class="glass-panel-card p-3 sm:p-4 rounded-xl">
      <div class="flex items-center justify-between mb-2.5 flex-wrap gap-1">
        <span class="section-label flex items-center gap-1.5">
          <Layers class="w-4 h-4 text-cyan-400" />
          <span>Plazma Besleme Rejimi (Reaktör Akı Modu)</span>
        </span>
        <span class="section-hint">İstediğin an serbestçe değiştir</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <!-- 1. Hiper-Yükleme (Overdrive) -->
        <button
          @click="store.setLabMode('overdrive')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'overdrive'
              ? 'bg-rose-500/15 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-rose-300 flex items-center gap-1.5">
                <Flame class="w-4 h-4 text-rose-400" />
                <span>Hiper-Yükleme (Overdrive)</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Aktif Oyun
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Plazma şarjı <b class="text-cyan-300">%80 daha hızlı</b> dolar. Süperkritik boşalımda anında <b class="text-cyan-300">2× Kütle</b> fışkırır!
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'overdrive' ? 'text-rose-400 font-bold' : ''">
              {{ store.labMode === 'overdrive' ? '● Aktif Rejim' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>

        <!-- 2. Süperiletken Durgunluk (Superconductor) -->
        <button
          @click="store.setLabMode('superconductor')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'superconductor'
              ? 'bg-slate-500/15 border-slate-400/50 shadow-[0_0_15px_rgba(148,163,184,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-slate-200 flex items-center gap-1.5">
                <Activity class="w-4 h-4 text-slate-300" />
                <span>Süperiletken (Superconductor)</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/15">
                AFK & Durgunluk
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Plazma şarjı dondurulur. Matrisin ürettiği kalıcı pasif kütle çarpanı <b class="text-cyan-300">2.5×</b> katına çıkar.
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'superconductor' ? 'text-slate-200 font-bold' : ''">
              {{ store.labMode === 'superconductor' ? '● Aktif Rejim' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>

        <!-- 3. Kuantum Dalgalanması (Fluctuation) -->
        <button
          @click="store.setLabMode('fluctuation')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'fluctuation'
              ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                <Orbit class="w-4 h-4 text-cyan-400" />
                <span>Dalgalanma (Fluctuation)</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Formül Kaşifi
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Şarj normal hızda dolar. Komşu parçacıkların yeni egzotik formülleri sentezleme olasılığı <b class="text-cyan-300">3 katına</b> çıkar.
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'fluctuation' ? 'text-cyan-400 font-bold' : ''">
              {{ store.labMode === 'fluctuation' ? '● Aktif Rejim' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <TrendReactor @open-codex="showCodexModal = true" />

    <!-- 3x3 Kuantum Akı Devresi (Flux Circuit) & Matris Izgarası -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <!-- Matris Izgarası (2 Kolon) -->
      <ViralGrid :selected-seed-type="selectedSeedType" />

      <!-- Bilgi & Sinerji İpuçları (1 Kolon) -->
      <div class="glass-panel-card p-4 rounded-xl flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <Info class="w-4 h-4 text-cyan-400" />
            <h3 class="section-label">Akı Devresi Sinerji Kuralları</h3>
          </div>

          <div class="space-y-2.5 text-xs text-slate-400 leading-relaxed">
            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <Zap class="w-3.5 h-3.5 text-cyan-400" />
                <span>Kuantum Odak Çekirdeği (Merkez Hücre 4)</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Merkezdeki parçacık kendi katsayısını <b>1.5×</b> yapar ve çevresindeki 4 komşusuna <b>+%20</b> plazma yayar. En kritik parçacığı merkeze yerleştir!
              </p>
            </div>

            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <span>⚡ + 🕳️ = Foton & Graviton Sentezi</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Foton komşularına <b>+%15 rezonans</b>, Graviton ise <b>Gravitasyonel Şok (×1.25)</b> yayar. Yan yana geldiklerinde <b>Higgs Bozonu (×3 Evrensel Kütle)</b> sentezlenir!
              </p>
            </div>

            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <span>🛡️ Manyetik Plazma Kalkanı</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Foton ve Nükleon senteziyle açılan Manyetik Kalkan, <b>Kozmik Parazitlerin kütle emişini %25 soğurur!</b>
              </p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-slate-400 flex items-center justify-between tabular-nums">
          <span>Toplam Kuantum Hasatları:</span>
          <span class="text-cyan-400 font-bold">{{ store.stats.labHarvests || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- Meta-İlerleme: Reaktör Çöküşü & Kozmik Relikler (Cosmic Relics) -->
    <div class="glass-panel-card p-4 rounded-xl border border-purple-500/30 bg-purple-950/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <Crown class="w-5 h-5 text-purple-400" />
          <div>
            <div class="text-sm font-bold font-mono text-purple-200">
              Kozmik Relikler & Reaktör Çöküşü (Meta-İlerleme)
            </div>
            <div class="text-[11px] text-slate-400">
              Tüm 4 egzotik formül sentezlendiğinde reaktörü tekilliğe kurban edip kalıcı relik seviyeleri kazanın.
            </div>
          </div>
        </div>
        <div class="text-xs font-mono px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
          Relik Seviyesi: Lv. {{ store.reactorCollapseCount || 0 }}
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mb-3 text-xs font-mono">
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 1: Çekim Hızı (Hz)</div>
          <div class="text-cyan-300 font-bold mt-1">-%{{ (store.reactorRelicBonuses.tickspeedBase * 100).toFixed(0) }} Taban</div>
          <div class="text-[9px] text-slate-500">Kalıcı frekans indirimi</div>
        </div>
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 2: Kriz Süreleri</div>
          <div class="text-cyan-300 font-bold mt-1">+{{ store.reactorRelicBonuses.crisisDuration }}s İlave</div>
          <div class="text-[9px] text-slate-500">Tüm buff sürelerine ek</div>
        </div>
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 3: Tekillik SP</div>
          <div class="text-cyan-300 font-bold mt-1">×{{ store.reactorRelicBonuses.spGainMult.toFixed(1) }} SP</div>
          <div class="text-[9px] text-slate-500">Post-break SP çarpanı</div>
        </div>
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 4: Hücre Başı İvme</div>
          <div class="text-cyan-300 font-bold mt-1">+%{{ (store.reactorRelicBonuses.dimensionalBoostPerCell * 100).toFixed(0) }} / hücre</div>
          <div class="text-[9px] text-slate-500">Boyutlara evrensel ivme</div>
        </div>
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 5+: Evrensel Kütle</div>
          <div class="text-purple-300 font-bold mt-1">×{{ formatNumber(store.reactorRelicBonuses.universalMassMult, store.settings.notation) }}</div>
          <div class="text-[9px] text-slate-500">Sınırsız ölçeklenen relik</div>
        </div>
      </div>

      <!-- Reaktörü Kurban Et Butonu -->
      <button
        @click="handleCollapseReactor"
        :disabled="!store.canCollapseReactor"
        class="w-full py-2.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        :class="[
          store.canCollapseReactor
            ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 text-white hover:opacity-95 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.01] affordance-pulse'
            : store.labCodexDiscoveredCount > 0
              ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed ds-ramp-partial'
              : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed ds-ramp-locked'
        ]"
      >
        <Crown class="w-4 h-4" />
        <span v-if="store.canCollapseReactor">
          Reaktörü Tekilliğe Kurban Et (Kozmik Relik Lv. {{ (store.reactorCollapseCount || 0) + 1 }} Kazan)
        </span>
        <span v-else>
          Reaktör Çöküşü Kilitli (4 Egzotik Formülün Tamamı Sentezlenmeli: {{ store.labCodexDiscoveredCount }}/4)
        </span>
      </button>

      <!-- Egzotik formül keşif ilerlemesi (görsel çubuk) -->
      <div class="mt-2.5 progress-track progress-track-mini">
        <div
          class="progress-fill progress-fill-cyan"
          :style="{ width: `${(store.labCodexDiscoveredCount / LAB_RECIPES.length) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Parçacık Seçim Paleti -->
    <div class="glass-panel-card p-4 rounded-xl">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
        <span class="section-label">
          <span>Yerleştirilecek Parçacık Formatı</span>
        </span>
        <span class="section-hint">Seçtikten sonra matristeki bir hücreye tıkla</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
        <template v-for="seed in LAB_SEEDS" :key="seed.type">
          <!-- Kilitli Temel Tohum -->
          <LockedFeature
            v-if="isSeedLocked(seed.type)"
            :feature-id="seedUnlockFeatureId(seed.type)"
          />

          <!-- Henüz Keşfedilmemiş Egzotik Formül -->
          <div
            v-else-if="seed.isMutationOnly && !isSeedDiscovered(seed.type)"
            class="p-3 rounded-xl border border-dashed border-white/10 bg-black/30 flex flex-col justify-between opacity-60"
            v-tip="'Henüz keşfedilmedi! Komşu ebeveyn parçacıkları yan yana yerleştirerek bu gizli formülü sentezle.'"
          >
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-xl">❓</span>
                <span class="text-[9px] font-mono bg-white/10 text-slate-400 px-1.5 py-0.5 rounded">
                  Egzotik Sentez
                </span>
              </div>
              <div class="text-xs font-bold font-mono text-slate-400">???</div>
              <div class="text-[10px] text-slate-500 mt-1">Keşif için komşuları eşleştir</div>
            </div>
            <div class="mt-2 text-[9px] font-mono text-slate-400">
              Atlas'tan ipucuna bak
            </div>
          </div>

          <!-- Seçilebilir Açık Parçacık -->
          <LabSeedCard
            v-else
            :seed="seed"
            :selected="selectedSeedType === seed.type"
            @select="selectedSeedType = $event"
          />
        </template>
      </div>
    </div>

    <!-- Parçacık Atlası & Sentez Kodeksi Modal -->
    <Teleport to="body">
      <div
        v-if="showCodexModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        @click.self="showCodexModal = false"
      >
        <div class="glass-panel-card max-w-2xl w-full p-5 rounded-2xl border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.2)] space-y-4 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2">
              <BookOpen class="w-5 h-5 text-cyan-400" />
              <div>
                <h2 class="text-base font-bold font-mono text-slate-100">
                  Kuantum Parçacık Atlası & Sentez Kodeksi
                </h2>
                <div class="text-xs text-cyan-300 font-mono">
                  Keşfedilen: {{ store.labCodexDiscoveredCount }}/{{ LAB_RECIPES.length }} Formül (+{{ store.labCodexBonusPercent }}% Kalıcı Global Kütle)
                </div>
              </div>
            </div>
            <button
              @click="showCodexModal = false"
              class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Açıklama -->
          <p class="text-xs text-slate-300 leading-relaxed">
            Akı matrisinde doğru iki ebeveyn parçacığı yan yana komşu yerleştirdiğinde, aralarında kuantum rezonansı başlar. Sentezlenen her egzotik parçacık kalıcı olarak tüm oyununa <b>+%3 Global Kütle</b> kazandırır ve seçim paletinde sınırsız ekilebilir hale gelir!
          </p>

          <LabRecipeList />

          <div class="pt-2 text-right">
            <button
              @click="showCodexModal = false"
              class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Reaktör Kurbanı Onay Modalı -->
    <ConfirmModal
      v-if="showCollapseConfirm"
      title="Kozmik Relik Kurbanı"
      message="Tüm reaktör matrisi ve sentezlenen formüller tekilliğe feda edilecek, kalıcı Kozmik Relik Seviyesi kazanacaksınız. Onaylıyor musunuz?"
      confirm-label="Kurban Et"
      :danger="true"
      @confirm="showCollapseConfirm = false; store.collapseReactor()"
      @cancel="showCollapseConfirm = false"
    />
  </div>
</template>
