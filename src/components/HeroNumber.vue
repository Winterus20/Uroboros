<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { RUNGS } from '../game/number/rungs'
import TapButton from './TapButton.vue'

/**
 * Hero başlığı (ADR-0085): basamak hapı + adı · SAYI · oran · "sıradaki" satırı; sağda `+1`.
 *
 * G9: yapısal dizgi — taban büyük / kuyruk küçük, auto-fit YOK (punto dizeye göre küçülmez;
 * yalnız ekran genişliği eşiğinde sabit bir ölçeğe iner).
 * §8.4: basamak bilgisi renkle değil, her zaman yazıyla da verilir (hap + ad).
 */
const store = useGameStore()
const parts = computed(() => store.heroParts)
const rung = computed(() => store.rungInfo)
const rungTotal = RUNGS.length

/**
 * "Sıradaki" satırı — yalnız store'un gerçek verisinden türer (V4: sayısal etiket yalan söylemez).
 * Aktif mücadelede o mücadelenin kilitli hedefi; değilse sıradaki mücadele ve açılma eşiği;
 * hepsi bittiyse kapı.
 */
interface NextLine {
  tag: string
  title: string
  detail: string
}

const nextLine = computed<NextLine | null>(() => {
  // Basamak 2+ için 1. basamağın kapı hedefi yoktur; "Next Gate" yazmak yalan olurdu (V4).
  if (store.rung > 1) {
    return { tag: 'Next', title: 'Rung ' + store.rung, detail: 'not implemented in this build' }
  }
  const active = store.activeChallengeRow
  if (active) {
    return { tag: 'Active', title: active.id + ' · ' + active.ringName, detail: 'goal ' + active.goalText }
  }
  // ADR-0087: mücadeleler 4 boost'ta açılır. Oyuncu boost panelini görmeden
  // C1'in 36 dk'lık duvarına girmesin; sıradaki iş boost'tur.
  if (store.boostCount < store.challengeBoostGate) {
    return {
      tag: 'Next',
      title: 'Boost ' + store.boostCount + ' / ' + store.challengeBoostGate,
      detail: 'challenges open at ' + store.challengeBoostGate + ' boosts'
    }
  }
  const label = store.nextChallengeLabel
  if (label === 'Gate') return { tag: 'Next', title: 'Gate', detail: store.goalText }
  const row = store.challengeRows.find((item) => item.id === label)
  if (!row) return null
  const detail = row.status === 'available' ? 'open now' : 'opens at ' + row.unlockText
  return { tag: 'Next', title: row.id + ' · ' + row.ringName, detail }
})

/**
 * Sayı vuruşu: basış ya da alım olduğunda 160 ms'lik küçük bir ölçek. Sınıf kaldırılıp
 * yeniden eklenir ki art arda basışlarda animasyon baştan başlasın. Hareket kapısı CSS'te.
 */
const numberEl = ref<HTMLElement | null>(null)

function pop(): void {
  const el = numberEl.value
  if (!el) return
  el.classList.remove('hero__number--pop')
  void el.offsetWidth
  el.classList.add('hero__number--pop')
}

watch(
  () => [store.taps, store.totalBuys] as const,
  ([taps, buys], [prevTaps, prevBuys]) => {
    // Kayıt yüklemesi sıçraması vuruş değildir: yalnız küçük artışlar.
    const tapped = taps === prevTaps + 1
    const bought = buys > prevBuys && buys - prevBuys < 10000
    if (tapped || bought) pop()
  }
)
</script>

<template>
  <section class="hero" aria-label="Number">
    <div class="hero__main">
      <p class="hero__kicker">
        <span class="pill pill--accent">RUNG {{ rung.index }} / {{ rungTotal }}</span>
        <span class="hero__name">{{ rung.name }}</span>
      </p>

      <div ref="numberEl" class="hero__number" aria-live="off">
        <span class="hero__base">{{ parts.base }}</span>
        <span v-if="parts.tail" class="hero__tail">{{ parts.tail }}</span>
      </div>

      <p class="hero__rate data"><b>+{{ store.perSecondText }}</b> per second</p>

      <p v-if="nextLine" class="hero__next">
        <span>{{ nextLine.tag }}</span>
        <b class="hero__next-title">{{ nextLine.title }}</b>
        <span class="hero__sep" aria-hidden="true">·</span>
        <span class="data">{{ nextLine.detail }}</span>
      </p>
    </div>

    <TapButton class="hero__tap" />
  </section>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--pn-line);
}

.hero__main { flex: 1; min-width: 0; }

.hero__kicker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0;
  font-size: 12px;
  color: var(--pn-text-dim);
}

/* Sayı: 300 ağırlık sabit (§3.2), basamak renginde, tabular. Taban + küçük kuyruk (§4). */
.hero__number {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  margin-top: 10px;
  font-family: var(--font-hero);
  font-weight: 300;
  font-size: 104px;
  line-height: 0.95;
  letter-spacing: -0.035em;
  color: var(--pn-rung);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  transform-origin: left bottom;
  transition: color 700ms ease;
}
.hero__number--pop { animation: pn-pop 160ms ease-out; }
.hero__tail {
  margin-left: 4px;
  font-size: 38px;
  letter-spacing: -0.01em;
  opacity: 0.9;
}

.hero__rate {
  margin: 10px 0 0;
  font-size: 14px;
  color: var(--pn-text-dim);
}
.hero__rate b { font-weight: 400; color: var(--pn-text); }

.hero__next {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--pn-text-dim);
}
.hero__next-title { font-weight: 400; color: var(--pn-text); }
.hero__sep { color: var(--pn-text-faint); }

.hero__tap { flex: none; }

/* ≤ 900 px: sabit daha küçük ölçek (auto-fit değil); taban/kuyruk yapısı aynı. */
@media (max-width: 900px) {
  .hero { gap: 16px; padding-bottom: 20px; }
  .hero__number { font-size: 72px; }
  .hero__tail { font-size: 27px; }
}

/* Dar telefon: +1 sayının altına iner, satır boyunca sağa yaslanır. */
@media (max-width: 560px) {
  .hero { flex-direction: column; align-items: stretch; }
  .hero__number { font-size: 60px; }
  .hero__tail { font-size: 22px; }
  .hero__tap { flex-direction: row-reverse; justify-content: flex-start; align-items: center; gap: 12px; }
}
</style>
