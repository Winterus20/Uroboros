<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore, LAB_SEEDS } from "../../stores/game";
import type { LabSeedType } from "../../models/types";
import { Radio, Layers, Sparkles, Scissors } from "lucide-vue-next";

const props = defineProps<{
  selectedSeedType: LabSeedType;
}>();

const store = useGameStore();
const bulkHarvestInfo = ref<string>("");

const matureCellCount = computed(() => store.labCells.filter((c) => c.isMature && c.seedType !== null).length);

const emptyCellCount = computed(() => store.labCells.filter((c) => c.seedType === null).length);

function handleBulkHarvest(): void {
  let count = 0;
  for (const cell of store.labCells) {
    if (!cell.isMature || cell.seedType === null) continue;
    if (store.harvestCell(cell.id)) count += 1;
  }
  bulkHarvestInfo.value = count > 0 ? `${count} olgun hücre hasat edildi.` : "Hasat edilecek olgun hücre yok.";
}

function handleBulkPlant(): void {
  if (isSeedLocked(props.selectedSeedType)) return;
  if (selectedSeed.value.isMutationOnly && !isSeedDiscovered(props.selectedSeedType)) return;
  for (const cell of store.labCells) {
    if (cell.seedType !== null) continue;
    store.plantSeed(cell.id, props.selectedSeedType);
  }
}

const resonancePreview = computed<{ cellId: number; mult: number } | null>(() => {
  const emptyIds = store.labCells.filter((c) => c.seedType === null).map((c) => c.id);
  if (emptyIds.length === 0) return null;
  let best: { cellId: number; mult: number } = { cellId: emptyIds[0], mult: 1 };
  for (const id of emptyIds) {
    const row = Math.floor(id / 3);
    const col = id % 3;
    const neighbors: (typeof store.labCells)[number][] = [];
    if (row > 0) neighbors.push(store.labCells[id - 3]);
    if (row < 2) neighbors.push(store.labCells[id + 3]);
    if (col > 0) neighbors.push(store.labCells[id - 1]);
    if (col < 2) neighbors.push(store.labCells[id + 1]);
    const matureNeighbors = neighbors.filter((n) => n && n.isMature && n.seedType !== null);
    let mult = 1;
    if (matureNeighbors.some((n) => n.seedType === "photon_resonator")) mult *= 1.15;
    if (matureNeighbors.some((n) => n.seedType === "graviton_trap")) mult *= 1.25;
    // Ağır sinerji tahmini: seçili tohum ağırsa ve komşuda ağır olgun varsa ×1.30
    const isHeavySel = props.selectedSeedType === "heavy_nucleon" || props.selectedSeedType === "dark_matter_core" || props.selectedSeedType === "magnetic_shield";
    if (isHeavySel && matureNeighbors.some((n) => n.seedType === "heavy_nucleon" || n.seedType === "dark_matter_core" || n.seedType === "magnetic_shield")) mult *= 1.3;
    if (id === 4) {
      mult *= 1.5;
    } else if (matureNeighbors.some((n) => n.id === 4)) {
      mult *= 1.2;
    }
    if (mult > best.mult) best = { cellId: id, mult };
  }
  return best;
});

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

const selectedSeed = computed(() => {
  return LAB_SEEDS.find((s) => s.type === props.selectedSeedType) || LAB_SEEDS[0];
});

/**
 * Seçili tohum kilitli mi?
 *
 * Karar (kilitli içerik gizleme): kilitli tohumun KİMLİĞİ (isim, ikon,
 * rezonans önizlemesi) hiçbir yerde gösterilmez — sadece kilidi açıldığında
 * görünür. Bu bileşen ayrı bir kilit kartı kullanmaz; kilitli grid öğesini gizleme
 * yükümlülüğü isim/ikon sızıntısını kapatarak burada yerine getirilir.
 */
const selectedSeedLocked = computed(() => isSeedLocked(props.selectedSeedType));

/** Kilitli tohumun adı sızmaz: yalnızca nötr bir etiket görünür. */
const selectedSeedLabel = computed(() =>
  selectedSeedLocked.value ? "Kilitli Tohum" : selectedSeed.value.name
);

/** Kilitli tohumun ikonu sızmaz: nötr bir kilit glifi kullanılır. */
const selectedSeedIcon = computed(() =>
  selectedSeedLocked.value ? "🔒" : selectedSeed.value.icon
);

function canAffordSeed(seedType: LabSeedType): boolean {
  const seed = LAB_SEEDS.find((s) => s.type === seedType);
  if (!seed) return false;
  const effective = store.labSeedEffectiveCost(seedType);
  return store.matter.gte(effective);
}

// Toplu ek uygunluğu: mevcut kilit/keşif şartları korunur; kütle eşiği görünür rampa ile eklenir.
// Kısmi karşılanabilirlikte buton AKTİF kalır — mevcut kısmi ekim davranışı bozulmaz, yalnız görünürlük kazanır.
const bulkPlantable = computed(
  () =>
    emptyCellCount.value > 0 &&
    !isSeedLocked(props.selectedSeedType) &&
    !(selectedSeed.value.isMutationOnly && !isSeedDiscovered(props.selectedSeedType))
);

const bulkPlantRampClass = computed(() => {
  if (!bulkPlantable.value) return 'ds-ramp-locked';
  const unitCost = store.labSeedEffectiveCost(props.selectedSeedType);
  if (store.matter.lt(unitCost)) return 'ds-ramp-locked';
  if (store.matter.gte(unitCost.times(emptyCellCount.value))) return '';
  return 'ds-ramp-partial';
});

function handleCellClick(cellId: number) {
  const cell = store.labCells[cellId];
  if (!cell) return;

  if (cell.seedType === null) {
    if (selectedSeed.value.isMutationOnly && !isSeedDiscovered(props.selectedSeedType)) return;
    if (isSeedLocked(props.selectedSeedType)) return;
    store.plantSeed(cellId, props.selectedSeedType);
  } else if (cell.isMature) {
    // Olgun hücreye tıklandığında anlık kütle & Plazma şarjı toplar, hücre silinmez tekrar ısınır!
    store.harvestCell(cellId);
  } else if (cell.seedType !== props.selectedSeedType && canAffordSeed(props.selectedSeedType)) {
    if (selectedSeed.value.isMutationOnly && !isSeedDiscovered(props.selectedSeedType)) return;
    if (isSeedLocked(props.selectedSeedType)) return;
    store.plantSeed(cellId, props.selectedSeedType);
  }
}

function getCellSeedDef(seedType: LabSeedType | null) {
  if (!seedType) return null;
  return LAB_SEEDS.find((s) => s.type === seedType) || null;
}

function getProgressPercent(cell: (typeof store.labCells)[0]): number {
  if (!cell.seedType || cell.matureAge <= 0) return 0;
  return Math.min(100, Math.floor((cell.age / cell.matureAge) * 100));
}

function isRowResonant(rowIndex: number): boolean {
  const rowCells = [store.labCells[rowIndex * 3], store.labCells[rowIndex * 3 + 1], store.labCells[rowIndex * 3 + 2]];
  return rowCells.every((c) => c && c.isMature && c.seedType !== null);
}

function isColResonant(colIndex: number): boolean {
  const colCells = [store.labCells[colIndex], store.labCells[colIndex + 3], store.labCells[colIndex + 6]];
  return colCells.every((c) => c && c.isMature && c.seedType !== null);
}
</script>

<template>
  <!-- 3x3 Kuantum Akı Devresi (Flux Circuit) Matris Izgarası -->
  <div class="lg:col-span-2 glass-panel-card p-4 rounded-xl">
    <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
      <span class="section-label flex items-center gap-1.5">
        <Radio class="w-4 h-4 text-cyan-400" />
        <span>Kuantum Akı Devresi (3×3 Süperiletken Matris)</span>
      </span>
      <span class="section-hint">ÇÜRÜME YOK! Parçacıklar kalıcı çalışır</span>
    </div>

    <!-- Toplu Hasat & Toplu Ek -->
    <div class="flex items-center gap-2 mb-2.5 flex-wrap">
      <button
        @click="handleBulkHarvest"
        :disabled="matureCellCount === 0"
        class="px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        :class="[
          matureCellCount > 0
            ? 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 affordance-pulse'
            : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed ds-ramp-locked'
        ]"
      >
        <Sparkles class="w-3.5 h-3.5" />
        <span>Toplu Hasat ({{ matureCellCount }})</span>
      </button>
      <button
        @click="handleBulkPlant"
        :disabled="bulkPlantRampClass === 'ds-ramp-locked'"
        class="px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        :class="[
          bulkPlantRampClass === ''
            ? 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 affordance-pulse'
            : bulkPlantRampClass === 'ds-ramp-partial'
              ? 'bg-white/5 border-white/10 text-slate-400 cursor-pointer ds-ramp-partial'
              : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed ds-ramp-locked'
        ]"
      >
        <Layers class="w-3.5 h-3.5" />
        <span>Toplu Ek: {{ selectedSeedLabel }} ({{ emptyCellCount }})</span>
      </button>
      <span v-if="bulkHarvestInfo" class="text-[10px] font-mono text-cyan-400">
        {{ bulkHarvestInfo }}
      </span>
    </div>

    <!-- Rezonans önizlemesi: seçili tohumun en iyi boş hücredeki tahmini komşuluk bonusu -->
    <div v-if="resonancePreview && !selectedSeedLocked" class="mb-2.5 text-[10px] font-mono text-slate-400 tabular-nums">
      <span v-if="resonancePreview.mult > 1" class="text-cyan-300">
        ✨ {{ selectedSeed.name }} → Hücre {{ resonancePreview.cellId }}: tahmini komşuluk bonusu ×{{ resonancePreview.mult.toFixed(2) }} (foton +%15, graviton ×1.25, merkez ×1.5 / komşu +%20)
      </span>
      <span v-else>
        {{ selectedSeed.name }} için boş hücrelerde aktif komşuluk bonusu yok.
      </span>
    </div>

    <!-- Süperiletken Hat Durum Bildirimi -->
    <div class="flex items-center justify-center gap-3 mb-2.5 text-[10px] font-mono text-slate-400">
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
        <span>Merkez Çekirdek: Hücre 4</span>
      </span>
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
        <span>Rezonans Akısı: Dolu Satır/Sütun ×1.12</span>
      </span>
    </div>

    <div class="grid grid-cols-3 gap-2.5 sm:gap-3.5 max-w-lg mx-auto aspect-square">
      <div
        v-for="cell in store.labCells"
        :key="cell.id"
        class="relative rounded-xl border flex flex-col items-center justify-between p-2.5 transition-all select-none overflow-hidden"
        :class="[
          cell.id === 4 ? 'ring-1 ring-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : '',
          isRowResonant(Math.floor(cell.id / 3)) ? 'border-cyan-500/40' : '',
          isColResonant(cell.id % 3) ? 'border-cyan-500/40' : '',
          cell.seedType === null
            ? 'bg-black/40 border-white/[0.06] hover:border-cyan-500/50 hover:bg-black/60 cursor-pointer group'
            : cell.isMature
              ? 'bg-cyan-950/20 border-cyan-500/60 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-black/60 border-white/[0.08]'
        ]"
        @click="handleCellClick(cell.id)"
      >
        <!-- Merkez Odak Çekirdeği Rozeti -->
        <div
          v-if="cell.id === 4"
          class="absolute top-1 left-1 z-10 text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
        >
          Odak Çekirdeği
        </div>

        <!-- Boş Hücre Durumu -->
        <template v-if="cell.seedType === null">
          <div class="h-full w-full flex flex-col items-center justify-center text-slate-600 group-hover:text-cyan-400 transition-colors gap-1.5">
            <span class="text-3xl opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-transform">
              {{ selectedSeedIcon }}
            </span>
            <span class="text-[10px] font-mono font-bold group-hover:text-cyan-300">
              + Yerleştir
            </span>
            <span class="text-[9px] font-mono text-slate-600 line-clamp-1">
              {{ selectedSeedLabel }}
            </span>
          </div>
        </template>

        <!-- Yerleştirilmiş Parçacık Hücresi -->
        <template v-else>
          <!-- Sök / Temizle Butonu -->
          <div class="absolute top-1.5 right-1.5 z-10">
            <button
              @click.stop="store.clearCell(cell.id)"
              class="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
              aria-label="Parçacığı yuvadan çıkar"
            >
              <Scissors class="w-3 h-3" />
            </button>
          </div>

          <!-- Parçacık İkonu -->
          <div class="text-3xl mt-1.5 transform transition-transform" :class="cell.isMature ? 'scale-110' : ''">
            {{ getCellSeedDef(cell.seedType)?.icon }}
          </div>

          <!-- İsim & Durum -->
          <div class="text-[11px] font-mono font-bold text-slate-200 text-center line-clamp-1 w-full px-1">
            {{ getCellSeedDef(cell.seedType)?.name }}
          </div>

          <!-- Durum ve İlerleme / Rezonans -->
          <div class="w-full mt-1.5">
            <div v-if="!cell.isMature" class="space-y-1">
              <div class="progress-track progress-track-sm">
                <div
                  class="progress-fill progress-fill-cyan"
                  :style="{ width: `${getProgressPercent(cell)}%` }"
                ></div>
              </div>
              <div class="flex justify-between text-[8px] font-mono text-slate-400 tabular-nums">
                <span>Uyarılıyor</span>
                <span>{{ Math.floor(cell.age) }}s / {{ cell.matureAge }}s</span>
              </div>
            </div>

            <div v-else class="text-center">
              <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/25 text-cyan-300 border border-cyan-500/40">
                ✨ REZONANSTA
              </span>
              <div class="text-[8px] font-mono text-cyan-400/80 mt-0.5">
                Tıkla: +Kütle & Şarj
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
