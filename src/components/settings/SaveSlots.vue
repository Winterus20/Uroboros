<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useGameStore } from "../../stores/game";
import { SaveSystem } from "../../core/save";
import { format, formatTime } from "../../core/format";
import { HardDrive, Copy } from "lucide-vue-next";
import { sounds } from "../../core/audio";
import type { SaveSlotMeta } from "../../models/types";
import { useFeedbackTimer } from "../../composables/useFeedbackTimer";

const store = useGameStore();
const { later } = useFeedbackTimer();

// Slot verileri
const slotsMeta = ref<SaveSlotMeta[]>([]);
const slotActionSuccess = ref("");

function refreshSlots() {
  slotsMeta.value = SaveSystem.getAllSlotsMeta();
}

onMounted(() => {
  refreshSlots();
})

// Slot değiştirme
function switchSlot(slot: number) {
  if (slot === store.settings.activeSlot) return;
  sounds.playClick();
  store.switchSaveSlot(slot);
}

// Slot kopyalama
function copyCurrentSlotTo(targetSlot: number) {
  if (targetSlot === store.settings.activeSlot) return;
  const ok = store.copySaveSlot(store.settings.activeSlot, targetSlot);
  if (ok) {
    slotActionSuccess.value = `Slot ${store.settings.activeSlot}, Slot ${targetSlot}'e başarıyla kopyalandı!`;
    refreshSlots();
    later(() => (slotActionSuccess.value = ""), 3000);
    sounds.playClick();
  }
}

defineExpose({ refreshSlots });
</script>

<template>
  <!-- 3 Bağımsız Kayıt Slotu Kartları -->
  <div class="space-y-2.5">
    <div class="flex items-center justify-between">
      <span class="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
        <HardDrive class="w-4 h-4 text-cyan-400" />
        Çoklu Kayıt Slotları (3 Slot)
      </span>
      <span v-if="slotActionSuccess" class="text-[11px] font-mono text-cyan-400 font-bold">
        {{ slotActionSuccess }}
      </span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      <div
        v-for="s in [1, 2, 3]"
        :key="s"
        class="glass-panel-card p-3 rounded-xl border relative flex flex-col justify-between transition-all"
        :class="store.settings.activeSlot === s
          ? 'border-cyan-500/50 bg-cyan-500/[0.06] shadow-sm'
          : 'border-white/[0.07] bg-black/40'"
      >
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-mono font-bold text-white">Slot {{ s }}</span>
            <span
              v-if="store.settings.activeSlot === s"
              class="ds-badge ds-badge-cyan"
            >
              Aktif
            </span>
          </div>

          <div v-if="slotsMeta[s - 1]?.exists" class="space-y-0.5 text-[10px] font-mono text-slate-400">
            <div class="text-slate-200 font-semibold truncate">
              Kütle: {{ format(slotsMeta[s - 1].matter || '0', 2, store.settings.notation) }}
            </div>
            <div>Çöküş: {{ slotsMeta[s - 1].singularities || 0 }}</div>
            <div>Süre: {{ formatTime(slotsMeta[s - 1].playtime || 0) }}</div>
          </div>
          <div v-else class="text-[10px] font-mono text-slate-500 italic py-2">
            Boş Slot
          </div>
        </div>

        <div class="mt-3 pt-2 border-t border-white/[0.06] flex gap-1.5">
          <button
            v-if="store.settings.activeSlot !== s"
            @click="switchSlot(s)"
            :aria-label="`Slot ${s}'e geç`"
            class="btn-tactile flex-1 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
          >
            Geç
          </button>
          <button
            v-if="store.settings.activeSlot !== s"
            @click="copyCurrentSlotTo(s)"
            :aria-label="`Mevcut slotu Slot ${s}'e kopyala`"
            class="btn-tactile px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1"
            v-tip="`Mevcut slotu Slot ${s}'e kopyala`"
          >
            <Copy class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
