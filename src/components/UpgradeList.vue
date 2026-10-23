<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { sounds } from '../core/audio'
import type { UpgradeId } from '../game/number/upgrades'

const store = useGameStore()
const upgrades = computed(() => store.upgradesView)

function buy(id: UpgradeId): void {
  const ok = store.buyUpgrade(id)
  if (ok && store.settings.soundEnabled) sounds.playUpgrade()
}
</script>

<template>
  <section class="shop" aria-label="Definition upgrades">
    <header class="shop__head">
      <p class="shop__title">Definition</p>
      <p class="shop__balance data">{{ format(store.tanim, 2, store.settings.notation) }}</p>
    </header>

    <div v-for="u in upgrades" :key="u.id" class="up">
      <div class="up__main">
        <p class="up__name">
          {{ u.name }}
          <span class="up__level data">{{ u.level }}/{{ u.maxLevel }}</span>
        </p>
        <p class="up__effect data">{{ u.effect }}</p>
      </div>

      <button
        v-if="u.cost"
        type="button"
        class="up__buy data"
        :class="{ 'up__buy--ready': u.affordable }"
        :disabled="!u.affordable"
        :aria-label="'Buy ' + u.name + ' for ' + format(u.cost, 2, store.settings.notation) + ' Definition'"
        @click="buy(u.id)"
      >
        {{ format(u.cost, 2, store.settings.notation) }}
      </button>
      <p v-else class="up__max data">max</p>
    </div>

    <p class="shop__hint">Definition comes from the gate. Nothing else gives it.</p>
  </section>
</template>

<style scoped>
.shop {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px;
}

.shop__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 10px 0 11px;
  border-top: 1px solid var(--pn-hairline);
}
.shop__title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--pn-text-dim);
}
.shop__balance {
  margin: 0;
  font-size: 14px;
  color: var(--pn-amber);
}

.up {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 0;
  border-top: 1px solid var(--pn-hairline);
}
.up__main { min-width: 0; }
.up__name { margin: 0; font-family: var(--font-ui); font-size: 14px; color: var(--pn-text); }
.up__level { margin-left: 6px; font-size: 11px; color: var(--pn-text-dim); }
.up__effect { margin: 3px 0 0; font-size: 12px; color: var(--pn-text-dim); }

.up__buy {
  appearance: none;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 6px 0 6px 10px;
  min-width: 96px;
  text-align: right;
  font-size: 13px;
  color: var(--pn-text-faint);
  cursor: pointer;
  transition: color 120ms ease;
}
.up__buy--ready { color: var(--pn-amber); }
.up__buy--ready:hover { text-decoration: underline; text-underline-offset: 3px; }
.up__buy:disabled { cursor: default; }

.up__max { margin: 0; font-size: 11px; color: var(--pn-locked); }

.shop__hint {
  margin: 15px 0 0;
  padding-top: 13px;
  border-top: 1px solid var(--pn-hairline);
  font-size: 12px;
  color: var(--pn-text-dim);
}

@media (max-width: 560px) {
  .shop { padding: 0 16px; }
  .up { gap: 12px; }
  .up__name { font-size: 13px; }
  .up__buy { min-width: 78px; font-size: 12px; }
}
</style>
