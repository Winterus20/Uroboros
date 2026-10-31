<script setup lang="ts">
import { useGameStore } from '../../stores/game'
import { AUTOSAVE_MS, TICK_MS } from '../../core/game-loop'
import TickerBar from '../TickerBar.vue'

/**
 * Durum çubuğu (ADR-0085) = ticker. Canlı nokta yalnız ticker konuşurken yanar
 * (humor 'off' → bant ve nokta gizlenir, narrative-voice §9).
 *
 * Sağdaki teknik satır yalnız GERÇEK sabitleri yazar (döngü hızı + otomatik kayıt aralığı,
 * `core/game-loop.ts`'ten). "saved 4s ago" gibi izlenmeyen bir değer yazılmaz (V4).
 */
const store = useGameStore()

const techLine =
  Math.round(1000 / TICK_MS) + ' tps · autosave ' + Math.round(AUTOSAVE_MS / 1000) + 's'
</script>

<template>
  <footer class="status">
    <template v-if="store.settings.humor !== 'off'">
      <i class="status__live" aria-hidden="true" />
      <TickerBar class="status__ticker" />
    </template>
    <span class="status__tech data">{{ techLine }}</span>
  </footer>
</template>

<style scoped>
.status {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0 20px;
  border-top: 1px solid var(--pn-line);
  background: var(--pn-s1);
  font-size: 12px;
  color: var(--pn-text-dim);
}
.status__live {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pn-rung);
  box-shadow: 0 0 0 3px var(--pn-rung-soft);
}
.status__ticker { flex: 1 1 auto; min-width: 0; }
.status__tech {
  flex: none;
  margin-left: auto;
  font-size: 11px;
  color: var(--pn-text-faint);
}

@media (max-width: 900px) {
  .status { padding: 0 12px; }
  .status__tech { display: none; }
}
</style>
