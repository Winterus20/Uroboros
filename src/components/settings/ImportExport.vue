<script setup lang="ts">
import { ref } from "vue";
import { useGameStore } from "../../stores/game";
import { SaveSystem, type InspectResult } from "../../core/save";
import { format, formatTime } from "../../core/format";
import { sounds } from "../../core/audio";
import { Copy, Download, Upload, FolderOpen, CheckCircle2, RotateCcw } from "lucide-vue-next";
import { useFeedbackTimer } from "../../composables/useFeedbackTimer";
import ConfirmModal from "../ConfirmModal.vue";

const emit = defineEmits<{
  (e: "imported"): void;
}>();

const store = useGameStore();
const { copyFeedback, downloadFeedback, later } = useFeedbackTimer();

// İçe aktarma/dosya güvenlik sınırları: 1MB dosya, 500k karakter metin.
const MAX_SAVE_FILE_BYTES = 1_000_000;
const MAX_IMPORT_CHARS = 500_000;
const importString = ref("");
const importError = ref("");
const importSuccess = ref("");
const importInspection = ref<InspectResult | null>(null);
const showImportConfirm = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

function setImportError(msg: string) {
  importError.value = msg;
}

function setImportSuccess(msg: string) {
  importSuccess.value = msg;
}

function downloadSaveFile(saveStr: string) {
  const blob = new Blob([saveStr], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `uroboros-save-slot${store.settings.activeSlot}-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  later(() => URL.revokeObjectURL(url), 1000);
  downloadFeedback.value = true;
  later(() => (downloadFeedback.value = false), 2500);
}

function exportSave() {
  const saveStr = SaveSystem.exportSave(store.serialize());
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(saveStr)
      .then(() => {
        importSuccess.value = "Kayıt kodu panoya kopyalandı!";
        copyFeedback.value = true;
        later(() => (copyFeedback.value = false), 2000);
        sounds.playClick();
      })
      .catch(() => {
        downloadSaveFile(saveStr);
      });
  } else {
    downloadSaveFile(saveStr);
  }
}

// Dosya seçerek içe aktarma
function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // Güvenlik: devasa dosya + yanlış tip/uzantı elenir.
  const nameOk = /\.(txt|json)$/i.test(file.name);
  const typeOk = file.type === "" || file.type === "text/plain" || file.type === "application/json";
  if (!nameOk || !typeOk) {
    importError.value = "Yalnızca .txt / .json kayıt dosyası seçin!";
    importSuccess.value = "";
    target.value = "";
    return;
  }
  if (file.size > MAX_SAVE_FILE_BYTES) {
    importError.value = "Dosya çok büyük (sınır 1MB)!";
    importSuccess.value = "";
    target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    importError.value = "Dosya okunamadı, tekrar deneyin!";
    importSuccess.value = "";
    target.value = "";
  };
  reader.onload = (event) => {
    const content = event.target?.result as string;
    if (content) {
      const trimmed = content.trim();
      if (trimmed.length > MAX_IMPORT_CHARS) {
        importError.value = "Kayıt metni çok uzun (sınır 500k karakter)!";
        importSuccess.value = "";
        target.value = "";
        return;
      }
      importString.value = trimmed;
      onImportInputChanged();
    }
    target.value = "";
  };
  reader.readAsText(file);
}

function onImportInputChanged() {
  importError.value = "";
  importSuccess.value = "";
  if (!importString.value.trim()) {
    importInspection.value = null;
    return;
  }
  // Textarea yapıştırma yolu da aynı 500k sınırına tabidir (bellek şişmesini önler).
  if (importString.value.length > MAX_IMPORT_CHARS) {
    importInspection.value = null;
    importError.value = "Kayıt metni çok uzun (sınır 500k karakter)!";
    return;
  }
  importInspection.value = SaveSystem.inspectSaveString(importString.value);
  if (!importInspection.value.valid) {
    importError.value = importInspection.value.error || "Geçersiz kayıt dizesi";
  }
}

function requestImport() {
  if (!importString.value.trim()) return;
  if (importString.value.length > MAX_IMPORT_CHARS) {
    importError.value = "Kayıt metni çok uzun (sınır 500k karakter)!";
    return;
  }
  onImportInputChanged();
  if (!importInspection.value?.valid) return;

  if (store.settings.confirmDialogs) {
    showImportConfirm.value = true;
    return;
  }
  doImport();
}

function doImport() {
  showImportConfirm.value = false;
  if (!importString.value.trim()) return;
  const data = SaveSystem.importSave(importString.value);
  if (data) {
    store.deserialize(data);
    SaveSystem.save(store.serialize(), store.settings.activeSlot);
    importString.value = "";
    importInspection.value = null;
    importError.value = "";
    importSuccess.value = "Kayıt başarıyla yüklendi ve kaydedildi!";
    emit("imported");
    sounds.playClick();
  } else {
    importSuccess.value = "";
    importError.value = "Geçersiz veya bozuk kayıt dizesi!";
  }
}

// Otomatik yedekten kurtarma
function restoreBackup() {
  const ok = store.restoreFromBackup();
  if (ok) {
    importSuccess.value = "Otomatik yedekten başarıyla geri dönüldü!";
    emit("imported");
    sounds.playClick();
  } else {
    importError.value = "Kullanılabilir bir otomatik yedek bulunamadı!";
  }
}

defineExpose({ setImportError, setImportSuccess });
</script>

<template>
  <div class="space-y-4">
    <!-- Dışa Aktarma (Export) — panel zemini glass-panel-card (--ds-panel); quantum-* kullanılmıyor -->
    <div class="glass-panel-card p-3.5 rounded-xl space-y-2">
      <div class="text-xs font-mono font-semibold text-slate-200">Kayıt Dışa Aktarma (Yedekleme)</div>
      <div class="grid grid-cols-2 gap-2">
        <button
          @click="exportSave"
          aria-label="Kayıt kodunu panoya kopyala"
          class="btn-tactile p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Copy class="w-4 h-4 text-cyan-300" />
          <span>{{ copyFeedback ? 'Panoya Kopyalandı!' : 'Panoya Kopyala' }}</span>
        </button>

        <button
          @click="downloadSaveFile(SaveSystem.exportSave(store.serialize()))"
          aria-label="Kaydı metin dosyası olarak indir"
          class="btn-tactile p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Download class="w-4 h-4 text-cyan-400" />
          <span>{{ downloadFeedback ? 'Dosya İndirildi!' : 'Dosya İndir (.txt)' }}</span>
        </button>
      </div>
    </div>

    <!-- İçe Aktarma (Import) & Dosya Seçimi -->
    <div class="glass-panel-card p-3.5 rounded-xl space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-mono font-semibold text-slate-200">Kayıt İçe Aktarma</span>
        <button
          @click="triggerFileInput"
          aria-label="Kayıt dosyası seç (.txt veya .json)"
          class="btn-tactile px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
        >
          <FolderOpen class="w-3 h-3" />
          Dosya Seç (.txt)
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".txt,.json"
          @change="handleFileSelect"
          class="hidden"
        />
      </div>

      <div class="flex gap-2">
        <input
          v-model="importString"
          @input="onImportInputChanged"
          type="text"
          placeholder="Kayıt kodunu buraya yapıştırın veya dosya seçin..."
          class="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
        />
        <button
          @click="requestImport"
          :disabled="!importInspection?.valid"
          aria-label="Kayıt kodunu içe aktar"
          class="btn-tactile px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer"
          :class="importInspection?.valid
            ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
            : 'bg-black/30 text-slate-500 border border-white/[0.04] opacity-50 cursor-not-allowed'"
        >
          <Upload class="w-3.5 h-3.5" />
          Yükle
        </button>
      </div>

      <!-- İçe Aktarma Önizleme / Doğrulama Kartı -->
      <div v-if="importInspection?.valid && importInspection.summary" class="p-2.5 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/30 text-xs font-mono space-y-1">
        <div class="text-cyan-300 font-bold flex items-center gap-1.5">
          <CheckCircle2 class="w-3.5 h-3.5" />
          Geçerli Kayıt Doğrulandı
        </div>
        <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
          <div>Kütle: <span class="text-white font-bold">{{ format(importInspection.summary.matter, 2, store.settings.notation) }}</span></div>
          <div>Çöküş: <span class="text-white font-bold">{{ importInspection.summary.singularities }}</span></div>
          <div>Süre: <span class="text-white font-bold">{{ formatTime(importInspection.summary.playtime) }}</span></div>
          <div>Sürüm: <span class="text-white font-bold">v{{ importInspection.summary.version }}</span></div>
        </div>
      </div>

      <p v-if="importError" class="text-[11px] text-rose-400 font-mono">
        {{ importError }}
      </p>
      <p v-else-if="importSuccess" class="text-[11px] text-cyan-400 font-mono">
        {{ importSuccess }}
      </p>
    </div>

    <!-- Otomatik Yedekten Kurtarma -->
    <div class="glass-panel-card p-3 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Otomatik Yedekten Geri Yükle</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Sistem her 1 dakikada bir otomatik dönen yedek tutar</div>
      </div>
      <button
        @click="restoreBackup"
        aria-label="Otomatik yedekten geri yükle"
        class="btn-tactile px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        Yedekten Yükle
      </button>
    </div>

    <!-- İçe Aktarma Onay Modalı -->
    <ConfirmModal
      v-if="showImportConfirm"
      title="Kaydı Üzerine Yaz"
      message="İçe aktarılan kayıt mevcut slotunuzun üzerine yazacaktır. Önce mevcut kaydınızı dışa aktarıp yedeklemeniz önerilir. Devam etmek istiyor musunuz?"
      confirm-label="Evet, Üzerine Yaz"
      :danger="true"
      @confirm="doImport"
      @cancel="showImportConfirm = false"
    />
  </div>
</template>
