<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { RUNGS } from '../game/number/rungs'

const props = withDefaults(defineProps<{ boostPulse?: boolean }>(), { boostPulse: false })

const store = useGameStore()
const parts = computed(() => store.heroParts)
const rung = computed(() => store.rungInfo)
const rungTotal = RUNGS.length
const boostText = computed(() => format(store.boostMult, 2, store.settings.notation))
</script>

<template>
  <!--
    G9: yapısal dizgi — taban büyük / kuyruk küçük, auto-fit YOK.
    G13: 390px'te uzun notasyon iki satıra iner, punto küçültülmez.
    G11: mini boost yalnız hareket — renk ve isim değişmez.
    §8.4: basamak bilgisi renkle değil, her zaman yazıyla da verilir (etiket + ad).
  -->
  <section class="hero" :class="{ 'hero--boost': props.boostPulse }">
    <div class="hero__top">
      <p class="hero__label data">{{ rung.label }}</p>
      <p v-if="props.boostPulse" class="hero__badge data" aria-hidden="true">×{{ boostText }}</p>
    </div>

    <div class="hero__number" :style="{ color: rung.color }">
      <span class="hero__base">{{ parts.base }}</span>
      <span v-if="parts.tail" class="hero__tail">{{ parts.tail }}</span>
    </div>

    <p class="hero__name">
      <span class="hero__rung data">rung {{ rung.index }} / {{ rungTotal }}</span>
      <span class="hero__name-sep" aria-hidden="true">·</span>
      <span class="hero__name-text">{{ rung.name }}</span>
    </p>
  </section>
</template>

<style scoped>
.hero {
  --hero-base: clamp(56px, 12vw, 112px);
  --hero-tail: calc(var(--hero-base) * 0.34);
  position: relative;
  padding: 42px 20px 6px;
  text-align: center;
}

.hero__top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 16px;
}

/* Notasyon mikro etiketi — KÜÇÜK HARF kalır (text-transform yok): "1.79e308". */
.hero__label {
  margin: 0;
  font-family: var(--font-data);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--pn-text-dim);
}

/* Çarpan rozeti: kutu değil, mono okuma. Boost anında sağ üstteki yuvasına oturur. */
.hero__badge {
  position: absolute;
  top: 50%;
  right: 0;
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--pn-text);
  transform: translateY(-50%);
  animation: pn-boost-badge 400ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
}
.hero__number {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.04em;
  margin-top: 10px;
  font-family: var(--font-hero);
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  line-height: 0.92;
  letter-spacing: -0.03em;
  text-shadow: 0 0 44px color-mix(in srgb, currentColor 32%, transparent);
  transition: color 700ms ease;
}

.hero__base {
  display: block;
  font-size: var(--hero-base);
}

.hero__tail {
  display: block;
  font-size: var(--hero-tail);
  line-height: 1;
  opacity: 0.88;
}

.hero--boost .hero__number {
  animation: pn-boost-collapse 400ms cubic-bezier(0.3, 0.7, 0.3, 1);
}

.hero__name {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0 8px;
  margin: 14px 0 0;
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.5;
  color: var(--pn-text-dim);
}
.hero__rung { font-size: 11px; letter-spacing: 0.1em; color: var(--pn-text-dim); }
.hero__name-sep { opacity: 0.55; }
.hero__name-text { color: var(--pn-text-dim); }

/* G13 — mobil: taban üstte, notasyon altta; punto küçültülmez. */
@media (max-width: 560px) {
  .hero {
    padding: 32px 20px 4px;
  }
  .hero__number {
    flex-direction: column;
    align-items: center;
    gap: 0;
  }
  .hero__base { line-height: 0.9; }
  .hero__tail { line-height: 1.1; }
  .hero__name { font-size: 12px; margin-top: 12px; }
}
</style>
