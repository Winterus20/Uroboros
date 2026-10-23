<script setup lang="ts">
import { computed, useId } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { format, formatTime } from '../core/format'
import { Decimal } from '../core/math'
import { toMillis } from '../core/auth/cloud-conflict'
import { useFocusTrap } from '../core/focus-trap'
import { AlertTriangle, Cloud, HardDrive, Sparkles, RefreshCw } from 'lucide-vue-next'

const authStore = useAuthStore()
const gameStore = useGameStore()

const conflict = computed(() => authStore.conflictData)

function formatMatter(val: string): string {
  try {
    return format(new Decimal(val), 2, gameStore.settings.notation)
  } catch {
    return val
  }
}

function formatDate(ts: number): string {
  if (!ts) return 'Bilinmiyor'
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ')'
}

const isCloudAhead = computed(() => {
  if (!conflict.value) return false
  try {
    const localDop = new Decimal(conflict.value.localMeta.number)
    const cloudDop = new Decimal(conflict.value.cloudMeta.number)
    return cloudDop.gt(localDop) || conflict.value.cloudMeta.prestiges > conflict.value.localMeta.prestiges
  } catch {
    return false
  }
})

function choose(choice: 'local' | 'cloud') {
  authStore.resolveConflict(choice)
}

const titleId = useId()

// Çakışma tek seferlik bir karardır: kapatma yolu yok, bu yüzden odak başlıkta tutulur
// (Escape handler'ı yok — kullanıcı bilinçli olarak bir kayıt seçmek zorunda).
const { dialogRef } = useFocusTrap(
  () => authStore.showConflictModal && conflict.value !== null,
  { focusDialog: true }
)
</script>

<template>
  <div v-if="authStore.showConflictModal && conflict" class="layer-modal fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="relative w-full max-w-2xl bg-[var(--ds-panel-strong)] border border-slate-600/60 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto outline-none"
    >
      
      <!-- Başlık Çubuğu -->
      <div class="flex items-center gap-3 pb-4 border-b border-[var(--ds-border)]">
        <div class="p-2.5 rounded-xl bg-slate-500/10 border border-slate-400/30 text-slate-300">
          <AlertTriangle class="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 :id="titleId" class="text-xl font-black text-slate-100 tracking-wide">Bulut Kayıt Çakışması Algılandı</h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Bu cihazdaki ilerlemeniz ile buluttaki ilerleme arasında fark bulundu. Lütfen devam etmek istediğiniz kaydı seçin.
          </p>
        </div>
      </div>

      <!-- İki Sütunlu Karşılaştırma Bento Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        
        <!-- Sol: Bu Cihazdaki İlerleme -->
        <div class="flex flex-col justify-between p-4 rounded-xl bg-[var(--ds-panel)] border border-slate-700/60 hover:border-slate-500/60 transition-all">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <span class="flex items-center gap-2 text-sm font-bold text-slate-300">
                <HardDrive class="w-4 h-4 text-cyan-400" />
                Bu Cihazdaki Kayıt
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                Yerel
              </span>
            </div>

            <div class="space-y-3 mt-4 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Kütle:</span>
                <span class="font-mono font-bold tabular-nums text-cyan-300 text-sm">
                  {{ formatMatter(conflict.localMeta.number) }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Kozmik Çöküş:</span>
                <span class="font-mono tabular-nums text-amber-300">
                  {{ conflict.localMeta.prestiges }} kez
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Oynama Süresi:</span>
                <span class="font-mono tabular-nums text-slate-300">
                  {{ formatTime(conflict.localMeta.playtime) }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Son Güncelleme:</span>
                <span class="font-mono tabular-nums text-slate-400 text-[11px]">
                  {{ formatDate(conflict.localMeta.clientTimestamp) }}
                </span>
              </div>
            </div>
          </div>

          <button
            @click="choose('local')"
            class="btn-tactile mt-6 w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Bu Cihazdakini Sakla (Bulutu Güncelle)
          </button>
        </div>

        <!-- Sağ: Buluttaki İlerleme -->
        <div
          class="flex flex-col justify-between p-4 rounded-xl bg-[var(--ds-panel)] border transition-all"
          :class="isCloudAhead ? 'ds-ramp-ready border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30' : 'border-slate-700/60'"
        >
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <span class="flex items-center gap-2 text-sm font-bold text-cyan-400">
                <Cloud class="w-4 h-4 text-cyan-400" />
                Buluttaki Kayıt
              </span>
              <span
                v-if="isCloudAhead"
                class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1"
              >
                <Sparkles class="w-2.5 h-2.5" />
                Daha İleride
              </span>
              <span v-else class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                Bulut
              </span>
            </div>

            <div class="space-y-3 mt-4 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Kütle:</span>
                <span class="font-mono font-bold tabular-nums text-cyan-300 text-sm">
                  {{ formatMatter(conflict.cloudMeta.number) }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Kozmik Çöküş:</span>
                <span class="font-mono tabular-nums text-amber-300">
                  {{ conflict.cloudMeta.prestiges }} kez
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Oynama Süresi:</span>
                <span class="font-mono tabular-nums text-slate-300">
                  {{ formatTime(conflict.cloudMeta.playtime) }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Son Güncelleme:</span>
                <span class="font-mono tabular-nums text-slate-400 text-[11px]">
                  {{ formatDate(toMillis(conflict.cloudPayload.updatedAt) ?? conflict.cloudMeta.clientTimestamp) }}
                </span>
              </div>
            </div>
          </div>

          <button
            @click="choose('cloud')"
            class="btn-tactile ds-ramp-ready mt-6 w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            Buluttakini Yükle (Cihazı Güncelle)
          </button>
        </div>

      </div>

      <!-- Bilgilendirme Çubuğu -->
      <div class="text-[11px] text-slate-500 text-center">
        ⚠️ Seçtiğiniz ilerleme aktif hale gelecektir. Yanlışlıkla yapılan seçimlerde mevcut slot yedeği yerel çöp kutusunda tutulur.
      </div>

    </div>
  </div>
</template>
