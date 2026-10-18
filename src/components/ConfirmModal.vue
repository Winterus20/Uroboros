<script setup lang="ts">
import { ref, useId } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { useFocusTrap } from '../core/focus-trap'

defineProps<{
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

// Başlık id'si benzersiz olmalı: ConfirmModal aynı anda birden fazla yerde açılabiliyor.
const titleId = useId()

// Tehlikeli onaylarda güvenli varsayılan: odak "Vazgeç" butonunda başlar.
const cancelButtonRef = ref<HTMLButtonElement | null>(null)

// Bileşen yalnızca açıkken mount edildiği için tuzak her zaman etkin.
const { dialogRef } = useFocusTrap(true, {
  initialFocus: cancelButtonRef,
  onEscape: () => emit('cancel')
})
</script>

<template>
  <!-- QoL: tüm prestij/sıfırlama aksiyonları için tek onay diyaloğu (settings.confirmDialogs'a bağlı)
    Teleport: #game-main-content screen-shake transform'u aldığında fixed çocuklar
    containing block'e hapsolup kutuyla birlikte kayıyordu. body'ye ışınlanınca
    kutu viewport'ta sabit kalır, arka plan sallanmaya devam eder. -->
  <Teleport to="body">
    <div
      class="layer-modal fixed inset-0 flex items-center justify-center p-4 bg-black/70"
      @click.self="emit('cancel')"
    >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="modal-glass w-full max-w-xs rounded-2xl border border-white/10 bg-[var(--ds-panel-strong)] p-5 shadow-2xl outline-none"
    >
      <div class="flex items-start gap-3 mb-4">
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          :class="danger ? 'bg-rose-500/15 border border-rose-400/30' : 'bg-cyan-500/15 border border-cyan-400/30'"
        >
          <AlertTriangle class="w-4 h-4" :class="danger ? 'text-rose-300' : 'text-cyan-300'" />
        </div>
        <div class="min-w-0">
          <h3 :id="titleId" class="text-sm font-bold text-white leading-tight">{{ title }}</h3>
          <p class="text-xs text-slate-400 mt-1 leading-snug">{{ message }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          ref="cancelButtonRef"
          class="btn-tactile flex-1 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer transition-all"
          @click="emit('cancel')"
        >
          Vazgeç
        </button>
        <button
          class="btn-tactile flex-1 h-10 rounded-xl text-white text-xs font-bold cursor-pointer transition-all"
          :class="danger ? 'ds-ramp-danger bg-rose-500/90 hover:bg-rose-500' : 'ds-ramp-ready bg-cyan-500/90 hover:bg-cyan-500'"
          @click="emit('confirm')"
        >
          {{ confirmLabel || 'Onayla' }}
        </button>
      </div>
    </div>
    </div>
  </Teleport>
</template>
