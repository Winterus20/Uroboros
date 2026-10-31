<script setup lang="ts">
/**
 * Bölüm başlığı (ADR-0085): başlık + tek satır nötr açıklama solda, eylemler sağda (slot).
 * Açıklama "Açıklama" kanalıdır (narrative-voice §4): yalnız mekanik bilgi, şaka yok.
 */
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="sh">
    <div class="sh__text">
      <h2 class="sh__title">{{ title }}</h2>
      <p v-if="description" class="sh__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="sh__actions">
      <slot />
    </div>
  </header>
</template>

<style scoped>
.sh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 26px 0 12px;
}
.sh__text { min-width: 0; }
.sh__title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--pn-text);
}
.sh__desc {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pn-text-dim);
}
.sh__actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 900px) {
  .sh { flex-direction: column; align-items: stretch; gap: 10px; margin: 20px 0 10px; }
  .sh__actions { justify-content: space-between; }
}
</style>
