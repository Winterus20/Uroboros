<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format, formatTime } from '../core/format'

const store = useGameStore()
const rows = computed(() => [
  { label: 'Playtime', value: formatTime(store.playTime) },
  { label: 'Best number', value: format(store.bestNumber, 2, store.settings.notation) },
  { label: 'Prestiges', value: String(store.prestiges) },
  { label: 'Boosts', value: String(store.boosts) },
  { label: 'Purchases', value: String(store.totalBuys) },
  { label: '+1 presses', value: String(store.taps) },
  { label: 'Presses that changed nothing', value: String(store.uselessTaps) },
  { label: 'Definition earned', value: format(store.tanimTotal, 2, store.settings.notation) }
])
</script>

<template>
  <section class="stats">
    <div v-for="row in rows" :key="row.label" class="stat">
      <p class="stat__label">{{ row.label }}</p>
      <p class="stat__value data">{{ row.value }}</p>
    </div>
  </section>
</template>

<style scoped>
.stats { max-width: 720px; margin: 0 auto; padding: 8px 16px 0; }
.stat { display: flex; align-items: baseline; justify-content: space-between; padding: 11px 0; border-top: 1px solid var(--pn-hairline); }
.stat__label { margin: 0; font-family: var(--font-ui); font-size: 13px; color: var(--pn-text-dim); }
.stat__value { margin: 0; font-size: 13px; color: var(--pn-text); }
</style>
