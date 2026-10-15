<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useId } from "vue";
import { useGameStore } from "../stores/game";
import { SaveSystem } from "../core/save";
import { useFocusTrap } from "../core/focus-trap";
import { sounds } from "../core/audio";
import {
  X,
  Save,
  AlertTriangle,
  Sliders,
  Palette,
  Radio,
  HardDrive,
  Keyboard,
  Info
} from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";
import { CloudSaveService } from "../core/auth/cloud-save-service";
import { useFeedbackTimer } from "../composables/useFeedbackTimer";
import GameplaySettings from "./settings/GameplaySettings.vue";
import AudioSettings from "./settings/AudioSettings.vue";
import CloudSaveSection from "./settings/CloudSaveSection.vue";
import SaveSlots from "./settings/SaveSlots.vue";
import ImportExport from "./settings/ImportExport.vue";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const store = useGameStore();
const authStore = useAuthStore();
const { saveFeedback, later } = useFeedbackTimer();

// Erişilebilirlik: başlık bağlantısı + odak yönetimi.
const titleId = useId();

// Not: Escape ile kapatma App.vue'deki global keydown dinleyicisinde zaten var
// (showAdmin / showSettings kapatılır); burada ikinci bir handler eklenmiyor ki
// tek tuş iki kez kapanma tetiklemesin. İç içe açılan ConfirmModal kendi
// Escape'ini yakalayıp yayılımı durdurur, ayarlar açık kalır.
const { dialogRef } = useFocusTrap(true, { focusDialog: true });

type TabType = "gameplay" | "visuals" | "audio" | "save" | "about";
const activeTab = ref<TabType>("gameplay");

const showHardResetConfirm = ref(false);
const hardResetConfirmInput = ref("");

const saveSlotsRef = ref<{ refreshSlots: () => void } | null>(null);
const importExportRef = ref<{
  setImportError: (msg: string) => void;
  setImportSuccess: (msg: string) => void;
} | null>(null);

// Canlı kayıt telemetrisi
const lastSavedAgoSeconds = ref(0);
let saveTimerInterval: number | null = null;

function updateLastSavedCounter() {
  const ts = SaveSystem.lastSaveTimestamp;
  if (ts > 0) {
    lastSavedAgoSeconds.value = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  }
}

onMounted(() => {
  updateLastSavedCounter();
  saveTimerInterval = window.setInterval(() => {
    updateLastSavedCounter();
  }, 1000);
});

onUnmounted(() => {
  if (saveTimerInterval !== null) {
    clearInterval(saveTimerInterval);
  }
});

// --- Kayıt & Slot Yönetimi ---
function manualSave() {
  const ok = SaveSystem.save(store.serialize(), store.settings.activeSlot);
  saveFeedback.value = true;
  later(() => (saveFeedback.value = false), 2000);
  if (!ok) {
    importExportRef.value?.setImportError("Kayıt yazılamadı (depolama kotası dolu olabilir)!");
  } else {
    saveSlotsRef.value?.refreshSlots();
    updateLastSavedCounter();
  }
  sounds.playClick();
}

function onSaveImported() {
  saveSlotsRef.value?.refreshSlots();
}

// Güvenli Hard Reset
const canHardReset = computed(() => {
  return hardResetConfirmInput.value.trim().toUpperCase() === "RESET";
});

/**
 * Sıfırlamanın kalıcı olması için bulut tarafı da temizlenmeli.
 *
 * ADR-0033: yalnızca `SaveSystem.hardReset()` çağrıldığında buluttaki eski
 * kayıt kalıyordu; 5 dakika sonraki otomatik senkron bir çakışma bulup eski
 * ilerlemeyi geri getiriyordu, yani "sıfırla" işlevi tutmuyordu.
 *
 * Firestore kuralları belge silmeyi (`allow delete: if false`) yasaklıyor;
 * bu yüzden kayıt SİLİNMEZ, sıfırlanmış durumla ÜZERİNE YAZILIR. Referans
 * anahtarları da unutulur ki eski belge "çakışma" üretmesin.
 */
function executeHardReset() {
  if (!canHardReset.value) return;
  // Kök neden düzeltmesi (2026-10-04): bellek sıfırlanmadan reload yapılırsa
  // App.vue'daki beforeunload/pagehide → persistLocalSave ESKİ store'u diske
  // geri yazar ve sıfırlama tutmazdı. Önce bellek, sonra disk sıfırlanır.
  store.$reset();
  SaveSystem.hardReset();
  // hardReset bayrağı sonunda kaldırır; reload'a kadar otomatik kayıtları
  // sustur ki yarışta eski durum geri yazılmasın (save() buna saygı duyar).
  SaveSystem.suppressSaves();
  CloudSaveService.forgetAllLocalRevisions();

  if (!authStore.isAuthenticated) {
    window.location.reload();
    return;
  }

  const uid = authStore.user?.uid;
  if (uid) CloudSaveService.forgetMockCloud(uid);

  // Sıfırlanmış (taze) durumu buluta zorla yaz; ağ patlasa bile reload —
  // eskiden catch yoktu, reject olursa sayfada kalınıyordu.
  authStore.saveToCloud(true).then(
    () => window.location.reload(),
    () => window.location.reload()
  );
}
</script>

<template>
  <div class="layer-modal fixed inset-0 flex items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-md z-50" @click.self="emit('close')">
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="glass-panel-glow modal-glass w-full max-w-2xl rounded-2xl relative max-h-[92vh] flex flex-col overflow-hidden border border-white/[0.1] shadow-2xl outline-none"
    >
      <!-- Modal Üst Başlık & Telemetri Çubuğu -->
      <div class="p-4 md:px-6 md:pt-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-black/40">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Sliders class="w-4 h-4" />
          </div>
          <div>
            <h3 :id="titleId" class="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <span>Sistem Ayarları</span>
              <span class="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                Slot {{ store.settings.activeSlot }} Aktif
              </span>
            </h3>
            <p class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
              <span>Otomatik Kayıt:</span>
              <span class="text-cyan-400 font-semibold">{{ lastSavedAgoSeconds }} sn önce</span>
              <span>· 10 sn aralık</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="manualSave"
            aria-label="Oyunu hemen kaydet"
            class="btn-tactile px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            v-tip="'Anında kaydet'"
          >
            <Save class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ saveFeedback ? 'Kaydedildi!' : 'Kaydet' }}</span>
          </button>

          <button
            @click="emit('close')"
            class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
            aria-label="Kapat"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Bento Sekmeli Navigasyon Çubuğu -->
      <div class="flex items-center gap-1 p-2 md:px-6 border-b border-white/[0.06] bg-black/50 overflow-x-auto no-scrollbar shrink-0">
        <button
          @click="activeTab = 'gameplay'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border"
          :class="activeTab === 'gameplay'
            ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>Oynanış &amp; QoL</span>
        </button>

        <button
          @click="activeTab = 'visuals'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border"
          :class="activeTab === 'visuals'
            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <Palette class="w-3.5 h-3.5" />
          <span>Görsel &amp; Ekran</span>
        </button>

        <button
          @click="activeTab = 'audio'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border"
          :class="activeTab === 'audio'
            ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <Radio class="w-3.5 h-3.5" />
          <span>Lo-Fi Radyo &amp; SFX</span>
        </button>

        <button
          @click="activeTab = 'save'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border"
          :class="activeTab === 'save'
            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <HardDrive class="w-3.5 h-3.5" />
          <span>Kayıt &amp; Slotlar</span>
        </button>

        <button
          @click="activeTab = 'about'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border ml-auto"
          :class="activeTab === 'about'
            ? 'bg-slate-500/20 text-slate-200 border-slate-400/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <Keyboard class="w-3.5 h-3.5" />
          <span>Kısayollar</span>
        </button>
      </div>

      <!-- Sekme İçerikleri (Kaydırılabilir Gövde) -->
      <div class="p-4 md:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
        <GameplaySettings v-if="activeTab === 'gameplay'" section="gameplay" />
        <GameplaySettings v-else-if="activeTab === 'visuals'" section="visuals" />
        <AudioSettings v-else-if="activeTab === 'audio'" />

        <!-- =================== SEKME 4: KAYIT & SLOTLAR =================== -->
        <div v-else-if="activeTab === 'save'" class="space-y-4">
          <CloudSaveSection />
          <SaveSlots ref="saveSlotsRef" />
          <ImportExport ref="importExportRef" @imported="onSaveImported" />

          <!-- Tehlikeli Alan: Güvenli Hard Reset -->
          <div class="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] space-y-3">
            <div class="flex items-center gap-2 text-rose-400">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span class="text-xs font-mono font-bold">Tehlikeli Alan: Sıfırla (Hard Reset)</span>
            </div>

            <div v-if="!showHardResetConfirm">
              <button
                @click="showHardResetConfirm = true"
                aria-label="Sıfırlama onayını göster"
                class="btn-tactile w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Tüm İlerlemeyi ve Kayıtları Kalıcı Olarak Sıfırla
              </button>
            </div>

            <div v-else class="space-y-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40">
              <p class="text-xs text-rose-200 font-medium leading-relaxed">
                Bu işlem tüm slotları, başarımları ve ayarları geri dönülemez biçimde silecektir! Onaylamak için aşağıdaki kutuya <strong class="text-white font-mono uppercase underline">RESET</strong> yazın:
              </p>
              <div class="flex gap-2">
                <label for="hard-reset-confirm" class="sr-only">Onay için RESET yazın</label>
                <input
                  id="hard-reset-confirm"
                  v-model="hardResetConfirmInput"
                  type="text"
                  placeholder="RESET yazın..."
                  autocomplete="off"
                  class="flex-1 bg-black/60 border border-rose-500/50 rounded-xl px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-rose-400"
                />
                <button
                  @click="executeHardReset"
                  :disabled="!canHardReset"
                  aria-label="Tüm ilerlemeyi kalıcı olarak sıfırla"
                  class="btn-tactile px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer"
                  :class="canHardReset
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-rose-900/40 text-rose-400/40 cursor-not-allowed'"
                >
                  Sıfırla
                </button>
                <button
                  @click="showHardResetConfirm = false; hardResetConfirmInput = ''"
                  aria-label="Sıfırlamayı iptal et"
                  class="btn-tactile px-3 py-1.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- =================== SEKME 5: KISAYOLLAR & BİLGİ =================== -->
        <div v-else-if="activeTab === 'about'" class="space-y-4">
          <!-- Kısayollar Tablosu -->
          <div class="glass-panel-card p-3.5 rounded-xl space-y-2.5">
            <div class="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
              <Keyboard class="w-4 h-4 text-cyan-300" />
              Klavye Kısayolları Haritası
            </div>
            <div class="divide-y divide-white/[0.06] text-xs font-mono">
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">1 - 9 Tuşları</span>
                <span class="text-white font-bold bg-white/[0.06] px-2 py-0.5 rounded-md">Sekme Değiştir (Katmanlar, Lab, Kriz...)</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">M Tuşu</span>
                <span class="text-slate-300 font-bold bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/10">Tüm Kademeleri Satın Al (Max All)</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">Space (Boşluk)</span>
                <span class="text-slate-300 font-bold bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/10">Kütle Yut (Taktil Çekim)</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">Esc (Escape)</span>
                <span class="text-slate-300 font-bold bg-white/[0.06] px-2 py-0.5 rounded-md">Pencereyi / Modalı Kapat</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">GODMODE (yazın)</span>
                <span class="text-slate-300 font-bold bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/10">Gizli Geliştirici &amp; Hile Paneli</span>
              </div>
            </div>
          </div>

          <!-- Oyun Hakkında & Mimari -->
          <div class="glass-panel-card p-3.5 rounded-xl space-y-2">
            <div class="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
              <Info class="w-4 h-4 text-purple-400" />
              UROBOROS: The Cosmic Feast
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed font-sans">
              Bir su damlasındaki moleküler bağları ayrıştırmakla başlayıp Planck duvarını delen, Dünya'yı ve tüm Samanyolu Galaksisi'ni yutan sonsuz bir kuantum-kozmik tekillik döngüsü. Antimatter Dimensions, Tasty Planet ve Cookie Clicker mekanikleri sentezlenerek geliştirilmiştir.
            </p>
            <div class="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Sürüm: v0.23.0 (UROBOROS)</span>
              <span>Vue 3 · Pinia · Vite 6 · Web Audio API</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
