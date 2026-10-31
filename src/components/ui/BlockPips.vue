<script setup lang="ts">
import { computed } from 'vue'

/**
 * Blok göstergesi (ADR-0085): bir sonraki blok çarpanına kadar alınan birimler.
 * `filled` = bought % size. Yanındaki metin (varsa) mevcut blok çarpanıdır.
 */
const props = withDefaults(
  defineProps<{
    filled: number
    size?: number
    /** Mevcut çarpan metni (ör. "x5.50"); boşsa yazılmaz. */
    text?: string
  }>(),
  { size: 10, text: '' }
)

const count = computed(() => Math.min(props.size, Math.max(0, Math.floor(props.filled))))
</script>

<template>
  <div class="pips" role="img" :aria-label="count + ' of ' + size + ' toward the next block' + (text ? ', block ' + text : '')">
    <span class="pips__row" aria-hidden="true">
      <i v-for="k in size" :key="k" class="pips__pip" :class="{ 'pips__pip--on': k <= count }" />
    </span>
    <span v-if="text" class="pips__text data" aria-hidden="true">{{ text }}</span>
  </div>
</template>

<style scoped>
.pips { display: inline-flex; align-items: center; gap: 8px; }
.pips__row { display: inline-flex; gap: 3px; }
.pips__pip {
  width: 10px;
  height: 4px;
  border-radius: 1px;
  background: var(--pn-s3);
}
.pips__pip--on { background: var(--pn-rung); }
.pips__text { font-size: 11px; color: var(--pn-text-dim); white-space: nowrap; }

@media (max-width: 1180px) {
  .pips__row { gap: 2px; }
  .pips__pip { width: 6px; }
}

@media (max-width: 900px) {
  .pips { gap: 6px; }
  .pips__row { gap: 2px; }
  .pips__pip { width: 6px; }
}
</style>
