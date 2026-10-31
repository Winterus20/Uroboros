<script setup lang="ts">
import { computed } from 'vue'

/**
 * İnce ilerleme çubuğu (ADR-0085): oran = çubuk (ADR-0058). Değer 0–100, aralık dışı kırpılır.
 * Ton: `rung` (vurgu) · `amber` (prestij/milestone) · `dim` (pasif/tamamlanmış).
 */
const props = withDefaults(
  defineProps<{
    value: number
    tone?: 'rung' | 'amber' | 'dim'
    label?: string
  }>(),
  { tone: 'rung', label: '' }
)

const width = computed(() => {
  const value = Number(props.value)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
})
</script>

<template>
  <div
    class="bar"
    :class="'bar--' + tone"
    role="progressbar"
    :aria-valuenow="Math.floor(width)"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label || undefined"
  >
    <i class="bar__fill" :style="{ width: width + '%' }" />
  </div>
</template>

<style scoped>
.bar {
  height: 6px;
  border-radius: 3px;
  background: var(--pn-s3);
  overflow: hidden;
}
.bar__fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--pn-rung);
  transition: width 200ms linear;
}
.bar--amber .bar__fill { background: var(--pn-amber); }
.bar--dim .bar__fill { background: var(--pn-text-faint); }
</style>
