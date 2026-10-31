<script setup lang="ts">
import { computed } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useGameStore } from '../../stores/game'
import { resolveResources } from '../../ui/resources'
import GoalBar from '../GoalBar.vue'

/**
 * Üst çubuk (ADR-0085): marka · kaynak çipleri (kayıt defterinden) · hedef · ayarlar.
 * Çipler `ui/resources.ts`'ten çizilir; yeni para birimi buraya dokunmadan eklenir.
 */
const store = useGameStore()
const emit = defineEmits<{ settings: [] }>()

const chips = computed(() => resolveResources(store))
</script>

<template>
  <header class="top">
    <div class="top__brand">
      <span class="top__mark data" aria-hidden="true">#</span>
      <span class="top__name">HOLD THAT NUMBER</span>
    </div>

    <ul class="top__res" aria-label="Resources">
      <li
        v-for="chip in chips"
        :key="chip.id"
        class="chip"
        :class="'chip--' + chip.tone"
        :aria-label="chip.label + ' ' + chip.value + (chip.rate ? ', ' + chip.rate : '')"
      >
        <i class="chip__dot" aria-hidden="true" />
        <span class="chip__value data" aria-hidden="true">{{ chip.value }}</span>
        <span v-if="chip.rate" class="chip__rate data" aria-hidden="true">{{ chip.rate }}</span>
      </li>
    </ul>

    <GoalBar class="top__goal" />

    <button type="button" class="top__icon" aria-label="Settings" @click="emit('settings')">
      <Settings :size="17" :stroke-width="1.6" aria-hidden="true" />
    </button>
  </header>
</template>

<style scoped>
.top {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
  padding: 0 20px;
  border-bottom: 1px solid var(--pn-line);
  background: var(--pn-s1);
}

.top__brand {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 192px;
}
.top__mark {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1.5px solid var(--pn-rung);
  border-radius: 5px;
  font-size: 11px;
  color: var(--pn-rung);
}
.top__name {
  font-size: 12px;
  letter-spacing: 0.16em;
  color: var(--pn-text-dim);
  white-space: nowrap;
}

.top__res {
  display: flex;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}
.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--pn-line-strong);
  border-radius: var(--pn-r);
  background: var(--pn-s2);
  font-size: 12px;
  white-space: nowrap;
}
.chip__dot { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--pn-rung); }
.chip--amber .chip__dot { background: var(--pn-amber); }
.chip--neutral .chip__dot { background: var(--pn-text-dim); }
.chip__value { color: var(--pn-text); }
.chip__rate { font-size: 11px; color: var(--pn-text-dim); }

.top__goal { margin-left: auto; }

.top__icon {
  appearance: none;
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: var(--pn-r);
  background: transparent;
  color: var(--pn-text-dim);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.top__icon:hover { border-color: var(--pn-line-strong); color: var(--pn-text); }

@media (max-width: 1180px) {
  .top__brand { width: auto; }
  .top__name { display: none; }
}

@media (max-width: 900px) {
  .top { gap: 10px; padding: 0 12px; }
  .chip { padding: 0 10px; gap: 7px; }
  .chip__rate { display: none; }
  .top__goal { flex: 1 1 auto; justify-content: flex-end; }
}
</style>
