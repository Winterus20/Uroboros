<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { sounds } from '../core/audio'

const store = useGameStore()

/** Her basış animasyonu yeniden başlatır: anahtar değişince etiket yeniden doğar. */
const stroke = ref(0)

/** G10: +1 hiç değişmez — 84. saatte de aynı yer, aynı boyut, aynı etiket, aynı vuruş. */
function press(): void {
  store.tap()
  stroke.value += 1
  if (store.settings.soundEnabled) sounds.playClick()
}
</script>

<template>
  <div class="tap-wrap">
    <button class="tap" type="button" @click="press">
      <span :key="stroke" class="tap__label">+1</span>
    </button>
  </div>
</template>

<style scoped>
.tap-wrap {
  display: flex;
  justify-content: center;
  padding: 22px 20px 14px;
}

.tap {
  appearance: none;
  border: 1px solid var(--pn-hairline-strong);
  border-radius: 0;
  background: transparent;
  color: var(--pn-text);
  font-family: var(--font-data);
  font-size: 18px;
  letter-spacing: 0.06em;
  line-height: 1;
  padding: 13px 38px;
  cursor: pointer;
  transition: border-color 120ms ease;
}
.tap:hover { border-color: var(--pn-text-faint); }
.tap:active { border-color: var(--pn-text-dim); }

/* Aynı ölçek vuruşu: +1'in kendisi asla büyümez, yalnız 96 ms'lik bir vuruş yapar. */
.tap__label {
  display: inline-block;
  animation: pn-tap-stroke 96ms cubic-bezier(0.3, 0.7, 0.3, 1);
}
</style>
