<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format, formatTime } from '../core/format'

const store = useGameStore()
const report = computed(() => store.offlineReport)
const gained = computed(() => (report.value ? format(report.value.gained, 2, store.settings.notation) : '0'))
function close(): void { store.offlineReport = null }
</script>

<template>
  <div v-if="report" class="overlay" role="dialog" aria-modal="true">
    <div class="sheet">
      <p class="kicker">While you were away</p>
      <p class="amount data">+{{ gained }}</p>
      <p class="meta">
        {{ formatTime(report.seconds) }} of counting.
        <span v-if="report.capped"> Capped at 12 hours.</span>
      </p>
      <button type="button" class="ok" @click="close">Continue</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(3,3,5,0.88); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 45; }
.sheet { text-align: center; border: 1px solid var(--pn-hairline); padding: 32px 36px; background: var(--pn-bg); }
.kicker { margin: 0; font-family: var(--font-data); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--pn-text-faint); }
.amount { margin: 12px 0 6px; font-size: 34px; color: var(--pn-text); }
.meta { margin: 0 0 22px; font-family: var(--font-ui); font-size: 12px; color: var(--pn-text-dim); }
.ok { appearance: none; border: 1px solid var(--pn-hairline-strong); background: transparent; color: var(--pn-text); font-family: var(--font-data); font-size: 13px; padding: 10px 26px; cursor: pointer; }
</style>
