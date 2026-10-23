<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { sounds } from '../core/audio'

const store = useGameStore()

/** G10: `+1` hiç değişmez — 84. saatte de aynı görünür, aynı sesi çıkarır. */
function press(): void {
  store.tap()
  if (store.settings.soundEnabled) sounds.playClick()
}
</script>

<template>
  <div class="tap-wrap">
    <button class="tap" type="button" @click="press">+1</button>
  </div>
</template>

<style scoped>
.tap-wrap { display: flex; justify-content: center; padding: 18px 16px 22px; }
.tap {
  appearance: none;
  border: 1px solid var(--pn-hairline-strong);
  background: transparent;
  color: var(--pn-text);
  font-family: var(--font-data);
  font-size: 18px;
  letter-spacing: 0.08em;
  padding: 12px 34px;
  border-radius: 2px;
  cursor: pointer;
  transition: transform 90ms ease, border-color 120ms ease;
}
.tap:active { transform: scale(0.96); border-color: var(--pn-text-dim); }
.tap:focus-visible { outline: 1px solid var(--pn-text-dim); outline-offset: 4px; }
</style>
