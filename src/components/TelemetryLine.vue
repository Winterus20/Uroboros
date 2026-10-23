<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'

const store = useGameStore()
const efficiency = computed(() => store.efficiency.toNumber())
const boostText = computed(() => format(store.boostMult, 2, store.settings.notation))
</script>

<template>
  <p class="telemetry data">
    <span>{{ store.perSecondText }}/s</span>
    <span class="sep">·</span>
    <span>boost ×{{ boostText }}</span>
    <span v-if="efficiency < 0.999" class="sep">·</span>
    <span v-if="efficiency < 0.999" class="warn">yield {{ (efficiency * 100).toFixed(0) }}%</span>
    <span class="sep">·</span>
    <span>Definition {{ format(store.tanim, 2, store.settings.notation) }}</span>
  </p>
</template>

<style scoped>
.telemetry {
  margin: 0;
  padding: 0 16px 18px;
  text-align: center;
  font-size: 12px;
  color: var(--pn-text-dim);
}
.sep { opacity: 0.4; margin: 0 8px; }
.warn { color: var(--pn-rose); }
</style>
