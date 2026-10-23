<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const parts = computed(() => store.heroParts)
const rung = computed(() => store.rungInfo)
</script>

<template>
  <section class="hero">
    <p class="hero__label">{{ rung.label }}</p>
    <p class="hero__name">{{ rung.name }}</p>
    <!-- G9: yapısal dizgi — taban büyük, notasyon küçük, auto-fit YOK -->
    <div class="hero__number" :style="{ color: rung.color }">
      <span class="hero__base">{{ parts.base }}</span>
      <span v-if="parts.tail" class="hero__tail">{{ parts.tail }}</span>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 40px 16px 8px;
  text-align: center;
}
.hero__label {
  margin: 0;
  font-family: var(--font-data);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--pn-text-faint);
}
.hero__name {
  margin: 6px 0 18px;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--pn-text-dim);
}
.hero__number {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.06em;
  font-family: var(--font-hero);
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-shadow: 0 0 40px color-mix(in srgb, currentColor 35%, transparent);
}
.hero__base { font-size: clamp(56px, 12vw, 120px); }
.hero__tail { font-size: clamp(20px, 4.2vw, 40px); opacity: 0.85; }

@media (max-width: 420px) {
  .hero__number { flex-wrap: wrap; }
  .hero__tail { flex-basis: 100%; text-align: center; font-size: 22px; }
}
</style>
