<script setup lang="ts" generic="T extends string | number">
/**
 * Segmentli seçim (ADR-0085): tek seçimli mod grubu (×1 / ×10 / Max gibi).
 * Seçim bir DURUMDUR (aria-pressed); eylem düğmeleri bunun dışında `.btn` kullanır.
 */
defineProps<{
  options: readonly { value: T; label: string }[]
  modelValue: T
  label: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="seg" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="seg__btn data"
      :class="{ 'seg__btn--on': modelValue === option.value }"
      :aria-pressed="modelValue === option.value"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--pn-line-strong);
  border-radius: 7px;
  background: var(--pn-s1);
}
.seg__btn {
  appearance: none;
  border: 0;
  border-radius: 5px;
  background: transparent;
  padding: 5px 12px;
  font-size: 11px;
  color: var(--pn-text-dim);
  cursor: pointer;
  transition: color 120ms ease, background-color 120ms ease;
}
.seg__btn:hover { color: var(--pn-text); }
.seg__btn--on { background: var(--pn-s3); color: var(--pn-text); }
</style>
