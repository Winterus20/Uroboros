<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { sounds } from '../core/audio'

const store = useGameStore()

/** E6: ekranda yukarıdan aşağı Parmaklar → Matematikçi; üretim aşağıdan yukarı akar. */
const rows = computed(() => store.ringRows)

function buy(index: number): void {
  const before = store.rings[index].bought
  store.buyRing(index)
  if (store.rings[index].bought > before && store.settings.soundEnabled) sounds.playBuy(index)
}
</script>

<template>
  <section class="chain" aria-label="Chain">
    <div
      v-for="row in rows"
      :key="row.index"
      class="row"
      :class="{ 'row--locked': !row.unlocked }"
    >
      <div class="row__main">
        <p class="row__name">{{ row.name }}</p>
        <p class="row__meta data">
          <span>{{ format(row.amount, 0, store.settings.notation) }}</span>
          <span class="dot">·</span>
          <span>{{ format(row.producesPerSecond, 2, store.settings.notation) }}/s</span>
        </p>
      </div>
      <button
        v-if="row.unlocked"
        type="button"
        class="row__buy data"
        :class="{ 'row__buy--ready': row.affordable }"
        :disabled="!row.affordable"
        @click="buy(row.index)"
      >
        {{ format(row.cost, 2, store.settings.notation) }}
      </button>
      <p v-else class="row__lock data">{{ row.unlockedNextAt }} more {{ rows[row.index - 1].name }}</p>
    </div>
  </section>
</template>

<style scoped>
.chain { max-width: 720px; margin: 0 auto; padding: 0 16px; }
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--pn-hairline);
}
.row:last-child { border-bottom: 1px solid var(--pn-hairline); }
.row--locked { color: var(--pn-locked); }
.row__name { margin: 0; font-family: var(--font-ui); font-size: 14px; letter-spacing: 0.01em; }
.row__meta { margin: 3px 0 0; font-size: 12px; color: var(--pn-text-dim); }
.row--locked .row__meta { color: var(--pn-locked); }
.dot { opacity: 0.4; margin: 0 6px; }
.row__buy {
  appearance: none;
  border: 1px solid var(--pn-hairline);
  background: transparent;
  color: var(--pn-text-faint);
  font-size: 13px;
  padding: 8px 14px;
  min-width: 104px;
  text-align: right;
  border-radius: 2px;
  cursor: pointer;
}
.row__buy--ready { color: var(--pn-text); border-color: var(--pn-hairline-strong); }
.row__buy:disabled { cursor: default; }
.row__lock { margin: 0; font-size: 11px; color: var(--pn-locked); }
</style>
