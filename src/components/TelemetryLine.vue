<script setup lang="ts">
import { useGameStore } from '../stores/game'

const store = useGameStore()
</script>

<template>
  <!-- Tek telemetri satırı: sayının altındaki tek okuma. Kutu yok, yalnız mono veri. -->
  <p class="telemetry data">
    <span class="telemetry__rate">{{ store.perSecondText }}/s</span>
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
</style>
