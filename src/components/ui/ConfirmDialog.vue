<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useFocusTrap } from '../../core/focus-trap'

/**
 * Onay diyaloğu (ADR-0085 modal dili): düz karartma + s1 panel, 1px çizgi, 8 px köşe.
 *
 * Sıfırlama gibi GERİ ALINAMAZ eylemler için ortak katman. Odak varsayılan olarak
 * "Vazgeç" düğmesindedir: yanlışlıkla Enter'a basmak koşuyu silmesin. Escape da iptal eder.
 * Metin yalnız gerçek mekanik bilgi yazar (V4); gövde ebeveynin slot'undan gelir.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'accent' | 'amber' | 'danger'
  }>(),
  { confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'danger' }
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const titleId = useId()
const cancelButton = ref<HTMLButtonElement | null>(null)

const { dialogRef } = useFocusTrap(() => props.open, {
  initialFocus: cancelButton,
  onEscape: () => emit('cancel')
})

const confirmClass = computed(() => 'btn btn--' + props.tone)
</script>

<template>
  <div v-if="open" class="modal confirm" @click.self="emit('cancel')">
    <div
      ref="dialogRef"
      class="modal__panel confirm__panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <header class="modal__head">
        <h2 :id="titleId" class="modal__title">{{ title }}</h2>
      </header>

      <div class="modal__body confirm__body">
        <slot />
      </div>

      <footer class="confirm__actions">
        <button ref="cancelButton" type="button" class="btn" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button type="button" :class="confirmClass" @click="emit('confirm')">
          {{ confirmLabel }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Katman sırası: çevrimdışı (45) üstü, kapı (50) altı. */
.confirm {
  z-index: 48;
  /* Üst çubuk hedef alanı nowrap miras bırakır; diyalog metni kendi sarar. */
  white-space: normal;
}

.confirm__panel {
  width: min(440px, 100%);
  max-height: none;
}

.confirm__body {
  padding-bottom: 4px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--pn-text-dim);
}
.confirm__body :deep(p) { margin: 0 0 10px; }
.confirm__body :deep(p:last-child) { margin-bottom: 0; }
.confirm__body :deep(strong) { font-weight: 400; color: var(--pn-text); }
.confirm__body :deep(ul) {
  margin: 0;
  padding-left: 16px;
  list-style: disc;
}
.confirm__body :deep(li) { margin: 0 0 4px; }
.confirm__body :deep(li::marker) { color: var(--pn-text-faint); }

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 18px 18px;
}
</style>
