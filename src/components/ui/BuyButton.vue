<script setup lang="ts">
import { computed } from 'vue'

/**
 * Alım düğmesi (ADR-0085): zemin, fiyata ne kadar yaklaşıldığını doldurarak gösterir
 * (`progress` = min(1, sayı / fiyat)). Alınabilir olduğunda vurgu çizgisi + parlak metin.
 * Doluluk bir OKUMADIR, süs değil: değer çağıranın gerçek oranıdır (V4).
 */
const props = defineProps<{
  /** 0–1; aralık dışı/NaN değer kırpılır. */
  progress: number
  ready: boolean
  label: string
}>()

const emit = defineEmits<{ click: [] }>()

const fill = computed(() => {
  const value = Number(props.progress)
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
})
</script>

<template>
  <button
    type="button"
    class="buy data"
    :class="{ 'buy--ready': ready }"
    :disabled="!ready"
    :aria-label="label"
    @click="emit('click')"
  >
    <i class="buy__fill" aria-hidden="true" :style="{ transform: 'scaleX(' + fill + ')' }" />
    <span class="buy__label"><slot /></span>
  </button>
</template>

<style scoped>
.buy {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 128px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--pn-line-strong);
  border-radius: var(--pn-r);
  background: var(--pn-s2);
  font-size: 12px;
  color: var(--pn-text-dim);
  cursor: default;
  transition: border-color 120ms ease, color 120ms ease, background-color 120ms ease;
}
.buy__fill {
  position: absolute;
  inset: 0;
  background: var(--pn-rung-soft);
  transform-origin: left center;
  transition: transform 160ms linear;
}
.buy__label {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  white-space: nowrap;
}
.buy--ready {
  border-color: var(--pn-rung-line);
  color: var(--pn-text);
  cursor: pointer;
}
.buy--ready:hover { background: var(--pn-rung-hover); }
.buy--ready:active { transform: translateY(1px); }
</style>
