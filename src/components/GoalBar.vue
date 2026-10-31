<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import type { DecimalSource } from '../core/math'
import ProgressBar from './ui/ProgressBar.vue'

/**
 * Kalıcı hedef alanı — üst çubuğun sağı (ADR-0085). Sayfa değişse de yerinde kalır.
 *
 * Normal:   Goal ▬▬▬▬▬ 42.1%  1.79e308
 * Mücadele: C3 Active ▬▬▬▬▬ 64.0%  Goal 1e95.16  [Exit]
 *
 * Yüzde logaritmiktir (store.goalProgress) ve AŞAĞI yuvarlanır: hedefe varılmadan ekran
 * asla "100%" okumaz (V4). Sayılar mono + tabular (§3.1).
 */
const store = useGameStore()

/** Aktif mücadele satırı; yoksa null (contract §4). */
const active = computed(() => store.activeChallengeRow)

const progress = computed(() => {
  const raw = Number(store.goalProgress)
  if (!Number.isFinite(raw)) return 0
  return Math.min(100, Math.max(0, raw))
})

/** Bir ondalık, aşağı yuvarlanmış: 99.97 → "99.9%", hiçbir zaman erken "100%". */
const percentText = computed(() => (Math.floor(progress.value * 10) / 10).toFixed(1) + '%')

/** Hedef metni: getter biçimlenmiş metin verirse aynen, Decimal verirse aynı notasyonla yazılır. */
function asGoalText(goal: DecimalSource | string): string {
  if (typeof goal === 'string') return goal
  return format(goal, 2, store.settings.notation)
}

function exit(): void {
  store.exitChallenge()
}
</script>

<template>
  <div class="goal" :class="{ 'goal--challenge': active }">
    <template v-if="active">
      <span class="goal__id data">{{ active.id }}</span>
      <span class="goal__mode">Active</span>
    </template>
    <span v-else class="goal__label">Goal</span>

    <ProgressBar
      class="goal__bar"
      :value="progress"
      :label="active ? active.id + ' progress' : 'Progress to ' + asGoalText(store.goalText)"
    />
    <span class="goal__pct data">{{ percentText }}</span>

    <span v-if="active" class="goal__target data">Goal {{ asGoalText(active.goal) }}</span>
    <span v-else class="goal__target data">{{ asGoalText(store.goalText) }}</span>

    <button
      v-if="active"
      type="button"
      class="btn goal__exit"
      aria-label="Exit challenge"
      @click="exit"
    >
      Exit
    </button>
  </div>
</template>

<style scoped>
.goal {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 11px;
  color: var(--pn-text-dim);
  white-space: nowrap;
}
.goal__label { color: var(--pn-text-dim); }
.goal__id { color: var(--pn-text); font-size: 12px; }
.goal__mode { color: var(--pn-rung); letter-spacing: 0.04em; }
.goal__bar { width: 220px; flex: none; }
.goal__pct { min-width: 44px; text-align: right; color: var(--pn-text); }
.goal__target { color: var(--pn-text-faint); }
.goal--challenge .goal__target { color: var(--pn-text-dim); }
.goal__exit { height: 26px; padding: 0 10px; font-size: 11px; }

@media (max-width: 1180px) {
  .goal__bar { width: 140px; }
}

@media (max-width: 900px) {
  .goal { gap: 8px; }
  .goal__label { display: none; }
  .goal__bar { width: auto; flex: 1 1 40px; min-width: 32px; }
  .goal__pct { min-width: 0; }
  .goal__target { display: none; }
  .goal__exit { height: 24px; padding: 0 8px; font-size: 10px; }
}
</style>
