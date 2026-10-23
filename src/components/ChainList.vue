<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { sounds } from '../core/audio'
import { NUMBER_TUNING } from '../game/number/tuning'
import type { RingRow } from '../models/number'

const store = useGameStore()

/** E6: ekranda yukarıdan aşağı Parmaklar → Matematikçi; üretim aşağıdan yukarı akar. */
const rows = computed(() => store.ringRows)

function buy(index: number): void {
  const before = store.rings[index].bought
  store.buyRing(index)
  if (store.rings[index].bought > before && store.settings.soundEnabled) sounds.playBuy(index)
}

function costText(value: RingRow['cost']): string {
  return format(value, 2, store.settings.notation)
}

/** Kilit gerekçesi yazıyla: bir önceki halkanın eşiği. Renk bilgi taşımaz (§8.4). */
function lockHint(row: RingRow): string {
  const previous = rows.value[row.index - 1]
  if (!previous) return 'locked'
  const remaining = Math.max(0, NUMBER_TUNING.unlockThreshold - store.rings[row.index - 1].bought)
  return remaining === 1 ? '1 more ' + previous.name : remaining + ' more ' + previous.name
}
</script>

<template>
  <section class="chain" aria-label="Chain">
    <div v-for="row in rows" :key="row.index" class="row" :class="{ 'row--locked': !row.unlocked }">
      <div class="row__main">
        <p class="row__name">{{ row.name }}</p>
        <p class="row__meta data">
          <span>{{ format(row.amount, 0, store.settings.notation) }}</span>
          <span class="dot" aria-hidden="true">·</span>
          <span>{{ format(row.producesPerSecond, 2, store.settings.notation) }}/s</span>
        </p>
      </div>

      <button
        v-if="row.unlocked"
        type="button"
        class="row__buy data"
        :class="{ 'row__buy--ready': row.affordable }"
        :disabled="!row.affordable"
        :aria-label="'Buy ' + row.name + ' for ' + costText(row.cost)"
        @click="buy(row.index)"
      >
        {{ costText(row.cost) }}
      </button>
      <p v-else class="row__lock data">{{ lockHint(row) }}</p>
    </div>
  </section>
</template>

<style scoped>
.chain {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Kutu yok: her satır yalnız 1px hairline ile ayrılır (G3). */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 0;
  border-top: 1px solid var(--pn-hairline);
}
.row:last-child { border-bottom: 1px solid var(--pn-hairline); }

.row__main { min-width: 0; }

.row__name {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 14px;
  letter-spacing: 0.01em;
  color: var(--pn-text);
}
.row__meta {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--pn-text-dim);
}
.dot { opacity: 0.55; margin: 0 6px; }

/* Kilitli = gri (rezerve renk değil, ton). Gerekçe metni okunur tonda kalır. */
.row--locked .row__name { color: var(--pn-locked); }

.row__buy {
  appearance: none;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 6px 0 6px 10px;
  min-width: 104px;
  text-align: right;
  font-size: 13px;
  color: var(--pn-text-dim);
  cursor: pointer;
  transition: color 120ms ease;
}
.row__buy--ready { color: var(--pn-text); }
.row__buy--ready:hover { color: var(--pn-text); text-decoration: underline; text-underline-offset: 3px; }
.row__buy:disabled { color: var(--pn-text-faint); cursor: default; }

.row__lock {
  margin: 0;
  padding-left: 10px;
  font-size: 11px;
  text-align: right;
  color: var(--pn-text-dim);
}

@media (max-width: 560px) {
  .chain { padding: 0 16px; }
  .row { gap: 12px; }
  .row__name { font-size: 13px; }
  .row__buy { min-width: 84px; font-size: 12px; }
  .row__lock { font-size: 10px; max-width: 42%; line-height: 1.45; }
}
</style>
