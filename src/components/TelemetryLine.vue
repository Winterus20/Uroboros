<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'

const store = useGameStore()
const efficiency = computed(() => store.efficiency.toNumber())
const boostText = computed(() => format(store.boostMult, 2, store.settings.notation))
</script>

<template>
  <!-- Tek telemetri satırı: sayının altındaki tek okuma. Kutu yok, yalnız mono veri. -->
  <p class="telemetry data">
    <span class="telemetry__rate">{{ store.perSecondText }}/s</span>
    <span class="sep" aria-hidden="true">·</span>
    <span>boost ×{{ boostText }}</span>
    <template v-if="efficiency < 0.999">
      <span class="sep" aria-hidden="true">·</span>
      <span class="telemetry__warn">yield {{ (efficiency * 100).toFixed(0) }}%</span>
    </template>
    <span class="sep" aria-hidden="true">·</span>
    <span>Definition <span class="telemetry__tanim">{{ format(store.tanim, 2, store.settings.notation) }}</span></span>
  </p>
</template>

<style scoped>
.telemetry {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0 10px;
  margin: 0;
  padding: 2px 20px 18px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--pn-text-dim);
  text-align: center;
}
.telemetry__rate { color: var(--pn-text); }
.telemetry__tanim { color: var(--pn-amber); }
.telemetry__warn { color: var(--pn-rose); }
.sep { opacity: 0.55; }
</style>
