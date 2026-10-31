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
  <div v-if="report" class="modal offline" role="dialog" aria-modal="true" aria-labelledby="offline-title">
    <div class="modal__panel offline__panel">
      <div class="modal__body offline__body">
        <p id="offline-title" class="modal__kicker">While you were away</p>
        <p class="offline__amount data">+{{ gained }}</p>
        <p class="offline__meta">
          {{ formatTime(report.seconds) }} of counting.
          <span v-if="report.capped"> Capped at 12 hours.</span>
        </p>
        <button type="button" class="btn btn--accent btn--lg" @click="close">Continue</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.offline { z-index: 45; }
.offline__panel { width: min(380px, 100%); text-align: center; }
.offline__body { padding: 28px 28px 26px; }
.offline__amount { margin: 12px 0 6px; font-size: 34px; color: var(--pn-rung); }
.offline__meta { margin: 0 0 22px; font-size: 12px; color: var(--pn-text-dim); }
</style>
