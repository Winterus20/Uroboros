<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useGameStore } from '../stores/game'
import { useFocusTrap } from '../core/focus-trap'
import { rungDef } from '../game/number/rungs'

/**
 * Kapı (contract §6): sayı 1.79e308'e ulaştığında büyüme durur ve tek bir an açılır.
 *
 * Kural: burada kutlama yok — sayı, tek bir satır bilgi ve tek bir eylem.
 * Zemin tek renk (--pn-bg), kart / blur / yuvarlak köşe / gölge yok (ADR-0078).
 * Amber rezerve renk: prestij/milestone (sözleşme §2.3).
 */
const store = useGameStore()

/** Kapı sayısı sözleşmeden gelir: GATE = 1.79e308 (contract §0). */
const GATE_TEXT = '1.79e308'

/**
 * Sıradaki basamak adı ve eşiği doğrudan basamak tablosundan okunur: kapı satırı
 * “ne olacak” sorusunu uydurmadan yanıtlar (V4). Ad tabloda yoksa rungDef son
 * basamağı döndürür; satır yine de tek bir gerçek yazar.
 */
const nextRung = computed(() => rungDef(store.rung + 1))

const titleId = useId()
const prestigeButton = ref<HTMLButtonElement | null>(null)

/** Kapı kapatılamaz: odak tuzağı açık, Escape bağlı değil — çıkış tek yoldan (Prestige). */
const { dialogRef } = useFocusTrap(true, { initialFocus: prestigeButton })

function prestige(): void {
  store.prestige()
}
</script>

<template>
  <div ref="dialogRef" class="gate" role="dialog" aria-modal="true" :aria-labelledby="titleId">
    <div class="gate__inner">
      <p class="gate__kicker data">Gate</p>

      <p :id="titleId" class="gate__number">{{ GATE_TEXT }}</p>

      <p class="gate__line data">+1 Definition</p>

      <!--
        Yalan yok (V4): satır yalnız sıradaki basamağın adını ve eşiğini yazar, vaat vermez.
        Geliştirici/yama notu şakası yasak (V2) — cümle mekanik gerçeğin dışına çıkmaz.
      -->
      <p class="gate__next data">Rung {{ nextRung.index }} · {{ nextRung.label }}</p>

      <button ref="prestigeButton" type="button" class="gate__action data" @click="prestige">
        Prestige
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Tam ekran an: oyunun arkası görünmez, çünkü büyüme durmuştur. */
.gate {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--pn-bg);
}

.gate__inner {
  width: 100%;
  max-width: 520px;
  padding: 26px 0 28px;
  text-align: center;
  border-top: 1px solid var(--pn-hairline);
  border-bottom: 1px solid var(--pn-hairline);
}

/* Mikro etiket: mono, seyrek harf aralığı; renk taşımaz. */
.gate__kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--pn-text-faint);
}

/* Sayı ekranın en büyük nesnesidir (G1); hero 300 ağırlık kuralı burada da geçerli. */
.gate__number {
  margin: 14px 0 0;
  font-family: var(--font-hero);
  font-weight: 300;
  font-size: clamp(46px, 11vw, 92px);
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--pn-amber);
  text-shadow: 0 0 40px color-mix(in srgb, var(--pn-amber) 22%, transparent);
}

.gate__line {
  margin: 16px 0 0;
  font-size: 14px;
  letter-spacing: 0.02em;
  color: var(--pn-text);
}

.gate__next {
  margin: 6px 0 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--pn-text-faint);
}

/* Tek eylem: kutu yok, 1px çerçeve (G10 odak dili aynı kalır). */
.gate__action {
  appearance: none;
  margin-top: 26px;
  border: 1px solid var(--pn-hairline-strong);
  border-radius: 0;
  background: transparent;
  padding: 11px 30px;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--pn-text);
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;
}
.gate__action:hover {
  border-color: var(--pn-amber);
  color: var(--pn-amber);
}

@media (max-width: 560px) {
  .gate { padding: 24px; }
  .gate__inner { padding: 22px 0 24px; }
  .gate__number { font-size: clamp(40px, 13vw, 64px); }
  .gate__action { margin-top: 22px; padding: 10px 24px; font-size: 12px; }
}
</style>
