<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format, formatTime } from '../core/format'
import SectionHeader from './ui/SectionHeader.vue'

/** İstatistikler: zincir/mücadele tablolarıyla aynı satır dili (ADR-0085). Yalnız kayıtlı veri. */
const store = useGameStore()

const rows = computed(() => [
  { label: 'Playtime', value: formatTime(store.playTime) },
  { label: 'Best number', value: format(store.bestNumber, 2, store.settings.notation) },
  { label: 'Purchases', value: String(store.totalBuys) },
  { label: '+1 presses', value: String(store.taps) },
  { label: 'Presses that changed nothing', value: String(store.uselessTaps) }
])
</script>

<template>
  <section class="stats" aria-label="Statistics">
    <SectionHeader title="Statistics" description="Totals for this save." />

    <table class="dt stats__table">
      <tbody>
        <tr v-for="row in rows" :key="row.label">
          <th scope="row" class="stats__label">{{ row.label }}</th>
          <td class="r data stats__value">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.stats__table tbody tr:first-child th,
.stats__table tbody tr:first-child td { border-top: 1px solid var(--pn-line); }
.stats__label {
  height: 48px;
  padding: 0 12px;
  border-top: 1px solid var(--pn-line);
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
  text-align: left;
  color: var(--pn-text-dim);
  white-space: normal;
}
.stats__table tbody tr:last-child th { border-bottom: 1px solid var(--pn-line); }
.stats__table td { height: 48px; }
.stats__value { color: var(--pn-text); }
</style>
