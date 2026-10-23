<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { sounds } from '../core/audio'

const store = useGameStore()
const upgrades = computed(() => store.upgradesView)

function buy(id: string): void {
  const ok = store.buyUpgrade(id as never)
  if (ok && store.settings.soundEnabled) sounds.playUpgrade()
}
</script>

<template>
  <section class="shop">
    <header class="shop__head">
      <p class="shop__title">Definition</p>
      <p class="shop__balance data">{{ format(store.tanim, 2, store.settings.notation) }}</p>
    </header>
    <div v-for="u in upgrades" :key="u.id" class="up">
      <div>
        <p class="up__name">{{ u.name }} <span class="up__level data">{{ u.level }}/{{ u.maxLevel }}</span></p>
        <p class="up__effect data">{{ u.effect }}</p>
      </div>
      <button
        v-if="u.cost"
        type="button"
        class="up__buy data"
        :class="{ 'up__buy--ready': u.affordable }"
        :disabled="!u.affordable"
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
.shop { max-width: 720px; margin: 0 auto; padding: 8px 16px 0; }
.shop__head { display: flex; align-items: baseline; justify-content: space-between; padding: 10px 0; }
.shop__title { margin: 0; font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pn-text-faint); }
.shop__balance { margin: 0; font-size: 14px; color: var(--pn-amber); }
.up { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 0; border-top: 1px solid var(--pn-hairline); }
.up__name { margin: 0; font-family: var(--font-ui); font-size: 14px; }
.up__level { color: var(--pn-text-faint); font-size: 11px; margin-left: 6px; }
.up__effect { margin: 3px 0 0; font-size: 12px; color: var(--pn-text-dim); }
.up__buy { appearance: none; border: 1px solid var(--pn-hairline); background: transparent; color: var(--pn-text-faint); font-size: 13px; padding: 8px 14px; min-width: 96px; border-radius: 2px; cursor: pointer; }
.up__buy--ready { color: var(--pn-amber); border-color: color-mix(in srgb, var(--pn-amber) 45%, transparent); }
.up__max { margin: 0; font-size: 11px; color: var(--pn-locked); }
.shop__hint { margin: 14px 0 0; font-size: 12px; color: var(--pn-text-faint); }
</style>
