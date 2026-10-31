<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import SectionHeader from './ui/SectionHeader.vue'
import ProgressBar from './ui/ProgressBar.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'

/**
 * Boost paneli (ADR-0086): gücün kaynağı, mücadelelerden ÖNCE açılır.
 *
 * Boost sayıyı ve zinciri sıfırlar (sayı 10, halkalar 0, kilitler yalnız Fingers);
 * boost sayısı ve tamamlanmış mücadele ödülleri KALIR. Çarpan yalnız sayı üretimine
 * uygulanır, zincir beslemesine değil.
 *
 * Tüm sayılar store getter'larından gelir (V4): bileşen çarpan hesaplamaz, biçimlemez.
 * Satır dili zincir tablosuyla aynıdır (ADR-0085): 1px çizgi, mono veri, vurgu yalnız
 * eyleme açık durumda.
 */
const store = useGameStore()

/** Fiyat, oyuncunun seçtiği notasyonda okunur. */
const priceText = computed(() => format(store.boostPrice, store.settings.decimalPlaces, store.settings.notation))

/** Görünür eylem: yalnız engelsiz ve fiyatı ödenebilirken vurgulanır. */
const ready = computed(() => store.canBoost)

/**
 * Devre dışı gerekçesi — store'un boostBlockedReason değeri doğrudan yazıya çevrilir.
 * Gerekçe her zaman metindir; renk tek başına bilgi taşımaz (§8.4). Sayısal etiket
 * şaka yapmaz (V4).
 */
const blockedText = computed(() => {
  const reason = store.boostBlockedReason
  if (reason === 'challenge') return 'Finish or exit the active challenge first.'
  if (reason === 'rung') return 'Rung 2 has no economy yet.'
  if (reason === 'gate') return 'The gate is open. Prestige to continue.'
  if (reason === 'requirement') {
    // İki farklı engel aynı reason'da: son halka kilitli ya da yeterince alınmamış.
    if (!store.boostRingUnlocked) return 'Unlock Mathematician first.'
    const remaining = Math.max(0, store.boostRequirement - store.boostBought)
    return remaining === 1
      ? 'Buy 1 more Mathematician.'
      : 'Buy ' + remaining + ' more Mathematician.'
  }
  if (reason === 'price') return 'Not enough number to pay the price.'
  return ''
})

/** Onay yalnız ayar açıksa sorulur; kapalıysa eylem doğrudan çalışır. */
const askConfirm = ref(false)
const dialogOpen = computed(() => askConfirm.value && ready.value)

function requestBoost(): void {
  if (!ready.value) return
  if (store.settings.confirmDialogs) {
    askConfirm.value = true
    return
  }
  store.boost()
}

function confirmBoost(): void {
  askConfirm.value = false
  store.boost()
}
</script>

<template>
  <section class="boost" aria-label="Boost">
    <SectionHeader
      title="Boost"
      description="A boost multiplies number production and resets the run: number to 10, chain to 0, unlocks back to Fingers. Boosts and completed challenge rewards survive. The price is live: it rises with Mathematician's block price."
    >
      <span class="pill pill--accent">{{ store.boostMultiplierText }} production</span>
    </SectionHeader>

    <table class="dt boost__table">
      <thead>
        <tr>
          <th scope="col">BOOSTS</th>
          <th scope="col">REQUIREMENT</th>
          <th scope="col">PRICE</th>
          <th scope="col" class="r">MULTIPLIER</th>
          <th scope="col" class="r"><span class="sr-only">Action</span></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="data boost__count">{{ store.boostCount }}</td>

          <td class="boost__req">
            <span class="boost__req-head">
              <span class="data boost__req-count">{{ store.boostBought }} / {{ store.boostRequirement }}</span>
              <span class="data boost__req-next">next {{ store.boostNextRequirement }}</span>
            </span>
            <ProgressBar
              class="boost__bar"
              :value="store.boostProgress"
              :tone="ready ? 'rung' : 'dim'"
              label="Mathematician requirement for the next boost"
            />
            <span class="boost__req-label">Mathematician owned</span>
          </td>

          <td class="data boost__price">
            <span>{{ priceText }}</span>
            <span class="boost__price-note">live</span>
          </td>

          <td class="r data boost__mult">
            <span class="boost__now">{{ store.boostMultiplierText }}</span>
            <span class="boost__arrow" aria-hidden="true">&#8594;</span>
            <span class="boost__next">{{ store.boostNextMultiplierText }}</span>
          </td>

          <td class="r boost__action">
            <button
              type="button"
              class="btn"
              :class="{ 'btn--accent': ready }"
              :disabled="!ready"
              aria-label="Buy a boost and reset the run"
              @click="requestBoost"
            >
              Boost
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="blockedText" class="boost__blocked data">{{ blockedText }}</p>

    <!-- ADR-0087: mücadeleler 4 boost'ta açılır; panel bunu ilk günden söyler. -->
    <p v-if="store.boostCount < store.challengeBoostGate" class="boost__gate data">
      {{ store.challengeBoostGate - store.boostCount }} more
      {{ store.challengeBoostGate - store.boostCount === 1 ? 'boost' : 'boosts' }}
      open the challenges.
    </p>

    <ConfirmDialog
      v-if="dialogOpen"
      :open="dialogOpen"
      title="Buy a boost?"
      confirm-label="Boost"
      tone="danger"
      @cancel="askConfirm = false"
      @confirm="confirmBoost"
    >
      <ul>
        <li>Number resets to <strong>10</strong>; every ring returns to <strong>0</strong>; unlocks return to <strong>Fingers</strong> only.</li>
        <li>Boost count and completed challenge rewards are kept.</li>
        <li>Number production goes from <strong>{{ store.boostMultiplierText }}</strong> to <strong>{{ store.boostNextMultiplierText }}</strong>.</li>
        <li>The current run is not restored.</li>
      </ul>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.boost__table td { height: 72px; padding-top: 10px; padding-bottom: 10px; }

.boost__count {
  width: 74px;
  font-size: 16px;
  color: var(--pn-text);
}

.boost__req { min-width: 220px; }
.boost__req-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}
.boost__req-count { font-size: 12px; color: var(--pn-text); }
.boost__req-next { font-size: 10px; color: var(--pn-text-dim); }
.boost__bar { width: 100%; }
.boost__req-label {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  color: var(--pn-text-dim);
}

.boost__price { white-space: nowrap; color: var(--pn-text); }
.boost__price-note {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: var(--pn-text-dim);
}

.boost__mult {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px;
  white-space: nowrap;
}
.boost__now { color: var(--pn-text); }
.boost__arrow { color: var(--pn-text-faint); }
.boost__next { color: var(--pn-text-dim); }

.boost__action { width: 92px; }
.boost__action .btn { min-width: 76px; }

.boost__blocked {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--pn-text-dim);
}

.boost__gate {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--pn-text);
}

/* ≤ 900 px: satır ızgaraya katlanır — [sayı] [çarpan] [düğme] / [şart] / [fiyat]. */
@media (max-width: 900px) {
  .boost__table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .boost__table,
  .boost__table tbody { display: block; }
  .boost__table tr {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'count mult action'
      'req req req'
      'price price price';
    align-items: center;
    column-gap: 12px;
    row-gap: 8px;
    padding: 12px 0;
    border-top: 1px solid var(--pn-line);
    border-bottom: 1px solid var(--pn-line);
  }
  .boost__table tr td {
    display: block;
    width: auto;
    height: auto;
    padding: 0;
    border: 0;
    background: transparent;
  }
  .boost__count { grid-area: count; }
  .boost__req { grid-area: req; }
  .boost__price { grid-area: price; font-size: 12px; color: var(--pn-text-dim); }
  .boost__mult { grid-area: mult; justify-content: flex-start; }
  .boost__action { grid-area: action; justify-self: end; }
}
</style>
