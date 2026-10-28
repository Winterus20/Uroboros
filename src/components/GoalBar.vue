<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import type { DecimalSource } from '../core/math'

/**
 * Kalıcı hedef satırı (contract §6): TickerBar ile HeroNumber arasında tek satır.
 *
 * Normal:   Goal 1.79e308 · 42% · Next: C3
 * Mücadele: C3 Active · 64% · Goal 1e95.16 · [Exit]
 *
 * Kutu yok, yalnız 1px hairline (ADR-0078). Sayılar mono + tabular: saniyede 20 kez
 * yenilenen bir satırda rakam genişliği titreyemez (§3.1).
 */
const store = useGameStore()

/** Aktif mücadele satırı; yoksa null (contract §4). */
const active = computed(() => store.activeChallengeRow)

/**
 * Yüzde: getter 0-100 verir, ekran tam sayı okur (plan §6: ⌊100·…⌋).
 * Aralık dışı değer (kayıt bozukluğu) sessizce kırpılır; satır yalan söylemez (V4).
 */
const percentText = computed(() => {
  const raw = Number(store.goalProgress)
  if (!Number.isFinite(raw)) return '0%'
  return Math.floor(Math.min(100, Math.max(0, raw))) + '%'
})

const nextLabel = computed(() => {
  const label = store.nextChallengeLabel
  return typeof label === 'string' ? label : ''
})

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
  <!-- Mücadele modunda satır aynı yükseklikte kalır: hedef değişir, yer değişmez. -->
  <div class="goal">
    <div class="goal__inner">
      <p class="goal__line data">
        <template v-if="active">
          <span class="goal__id">{{ active.id }}</span>
          <span class="goal__mode"> Active</span>
          <span class="dot" aria-hidden="true">·</span>
          <span class="goal__pct">{{ percentText }}</span>
          <span class="dot" aria-hidden="true">·</span>
          <span>Goal <span class="goal__value">{{ asGoalText(active.goal) }}</span></span>
        </template>
        <template v-else>
          <span>Goal <span class="goal__value">{{ asGoalText(store.goalText) }}</span></span>
          <span class="dot" aria-hidden="true">·</span>
          <span class="goal__pct">{{ percentText }}</span>
          <template v-if="nextLabel">
            <span class="dot" aria-hidden="true">·</span>
            <span>Next: <span class="goal__value">{{ nextLabel }}</span></span>
          </template>
        </template>
      </p>

      <button
        v-if="active"
        type="button"
        class="goal__exit data"
        aria-label="Exit challenge"
        @click="exit"
      >
        Exit
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Hairline ayırıcı: satır ekranın enine, içerik 1000px'te ortalanır (ticker dili). */
.goal {
  border-bottom: 1px solid var(--pn-hairline);
}

.goal__inner {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 9px 20px 10px;
}

.goal__line {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.02em;
  color: var(--pn-text-dim);
}

/* Değerler bir ton yukarıda: hiyerarşi punto/kontrast (G-bölüm 8), renk değil. */
.goal__value,
.goal__pct,
.goal__id {
  color: var(--pn-text);
}

/* Mücadele modu tek kelimeyle işaretlenir; basamak rengi buraya gelmez (§2.2). */
.goal__mode {
  color: var(--pn-text);
  letter-spacing: 0.06em;
}

.dot { opacity: 0.55; margin: 0 7px; }

/* Çıkış metin düğmesi: kutu yok, 1px alt çizgi (dock dili). */
.goal__exit {
  appearance: none;
  flex: none;
  border: 0;
  border-bottom: 1px solid var(--pn-hairline-strong);
  border-radius: 0;
  background: transparent;
  margin: 0;
  padding: 1px 0 2px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--pn-text-dim);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.goal__exit:hover {
  color: var(--pn-text);
  border-bottom-color: var(--pn-text-dim);
}

@media (max-width: 560px) {
  .goal__inner { padding: 8px 16px 9px; gap: 10px; }
  .goal__line { font-size: 11px; }
  .dot { margin: 0 5px; }
  .goal__exit { font-size: 10px; }
}
</style>
