<script setup lang="ts">
import { useGameStore } from "../../stores/game";
import { useAuthStore } from "../../stores/auth";
import { format } from "../../core/format";
import { Decimal } from "../../core/math";
import {
  Cloud,
  LogIn,
  UploadCloud,
  DownloadCloud,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from "lucide-vue-next";

const store = useGameStore();
const authStore = useAuthStore();
</script>

<template>
  <!-- Bulut Senkronizasyon & Hesap Kartı -->
  <div class="glass-panel-card p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 relative overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
      <div class="flex items-center gap-2.5">
        <div class="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Cloud class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold text-white">Bulut Senkronizasyonu (Cloud Save)</span>
            <span
              v-if="authStore.isAuthenticated"
              class="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold border border-cyan-500/30"
            >
              Aktif
            </span>
            <span
              v-else
              class="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-mono border border-slate-700"
            >
              Misafir
            </span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">
            {{ authStore.isAuthenticated ? `Bağlı Hesap: ${authStore.userDisplayName} (${authStore.userEmail || 'Google'})` : 'Kayıtlarınızı buluta bağlayarak cihazlar arası veri kaybını önleyin.' }}
          </p>
        </div>
      </div>

      <!-- Hesap Yönetimi / Giriş Butonu -->
      <button
        @click="authStore.openAuthModal()"
        class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shrink-0"
        :class="authStore.isAuthenticated ? 'bg-[var(--ds-panel)] border-cyan-500/40 text-cyan-300 hover:bg-[var(--ds-panel-strong)]' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20'"
      >
        <LogIn v-if="!authStore.isAuthenticated" class="w-3.5 h-3.5" />
        <span>{{ authStore.isAuthenticated ? 'Bulut Paneli / Çıkış' : 'Giriş Yap / Kaydol' }}</span>
      </button>
    </div>

    <!-- Giriş yapılmışsa hızlı aksiyonlar -->
    <div v-if="authStore.isAuthenticated" class="mt-3 pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div class="text-[11px] text-slate-400 font-mono">
        Buluttaki Son Kayıt:
        <span class="text-slate-200 font-semibold">
          {{ authStore.cloudMeta ? format(new Decimal(authStore.cloudMeta.matter), 2, store.settings.notation) + ' g Kütle' : 'Henüz yok' }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="authStore.saveToCloud(true)"
          :disabled="authStore.isSyncing"
          class="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
        >
          <Loader2 v-if="authStore.syncStatus === 'syncing'" class="w-3 h-3 animate-spin" />
          <UploadCloud v-else class="w-3 h-3" />
          <span>{{ authStore.syncStatus === 'syncing' ? 'Yedekleniyor...' : 'Buluta Yedekle' }}</span>
        </button>
        <button
          @click="authStore.loadFromCloud()"
          :disabled="authStore.isSyncing"
          class="px-2.5 py-1 rounded-lg bg-[var(--ds-panel)] hover:bg-[var(--ds-panel-strong)] text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
        >
          <DownloadCloud class="w-3 h-3 text-cyan-400" />
          <span>Buluttan Çek</span>
        </button>
      </div>
    </div>

    <!-- Geri Bildirim Satırı (Hata veya Başarı) -->
    <div v-if="authStore.error" class="mt-2.5 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center gap-1.5">
      <AlertTriangle class="w-3.5 h-3.5 shrink-0 text-rose-400" />
      <span>{{ authStore.error }}</span>
    </div>
    <div v-else-if="authStore.syncStatus === 'success'" class="mt-2.5 p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium flex items-center gap-1.5">
      <CheckCircle2 class="w-3.5 h-3.5 shrink-0 text-cyan-400" />
      <span>İlerlemeniz buluta başarıyla yedeklendi!</span>
    </div>
  </div>
</template>
