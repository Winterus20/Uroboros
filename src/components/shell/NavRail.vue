<script setup lang="ts">
import { computed } from 'vue'
import { Lock } from 'lucide-vue-next'
import { useGameStore } from '../../stores/game'
import { resolveNav, type NavItem } from '../../ui/sections'

/**
 * Bölüm menüsü (ADR-0085): masaüstünde sol ray, ≤ 900 px'te alt sekme çubuğu — aynı kayıt
 * defteri (`ui/sections.ts`), aynı bileşen; yalnız CSS değişir.
 *
 * Grup başlığı oyuncunun basamağıdır ("RUNG 1"); kilitli kayıt "???" + kilit yazar.
 */
const props = defineProps<{ activeId: string }>()
const emit = defineEmits<{ select: [id: string] }>()

const store = useGameStore()
const items = computed(() => resolveNav(store))
const mainItems = computed(() => items.value.filter((item) => item.placement === 'main'))
const bottomItems = computed(() => items.value.filter((item) => item.placement === 'bottom'))

function select(item: NavItem): void {
  if (item.locked) return
  emit('select', item.id)
}

function isActive(id: string): boolean {
  return props.activeId === id
}
</script>

<template>
  <nav class="nav" aria-label="Sections">
    <h6 class="nav__group data">RUNG {{ store.rung }}</h6>

    <template v-for="(list, li) in [mainItems, bottomItems]" :key="li">
      <div v-if="li === 1" class="nav__spacer" aria-hidden="true" />
      <button
        v-for="item in list"
        :key="item.id"
        type="button"
        class="nav__item"
        :class="{ 'nav__item--on': isActive(item.id), 'nav__item--locked': item.locked }"
        :aria-current="isActive(item.id) ? 'page' : undefined"
        :aria-disabled="item.locked ? 'true' : undefined"
        :aria-label="item.locked ? 'Locked section' : undefined"
        @click="select(item)"
      >
        <component
          :is="item.locked ? Lock : item.icon"
          class="nav__icon"
          :size="16"
          :stroke-width="1.6"
          aria-hidden="true"
        />
        <span class="nav__label">{{ item.label }}</span>
        <span v-if="item.badge" class="nav__badge data">{{ item.badge }}</span>
      </button>
    </template>
  </nav>
</template>

<style scoped>
.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  padding: 16px 12px;
  border-right: 1px solid var(--pn-line);
  background: var(--pn-s1);
  overflow-y: auto;
}

.nav__group {
  margin: 6px 10px 8px;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.14em;
  color: var(--pn-text-faint);
}

.nav__spacer { flex: 1; }

.nav__item {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  height: 36px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--pn-r);
  background: transparent;
  font-size: 13px;
  text-align: left;
  color: var(--pn-text-dim);
  cursor: pointer;
  transition: color 120ms ease, background-color 120ms ease;
}
.nav__item:hover { color: var(--pn-text); background: var(--pn-s2); }
.nav__item--on {
  color: var(--pn-text);
  background: var(--pn-s2);
  border-color: var(--pn-line-strong);
}
.nav__item--on .nav__icon { color: var(--pn-rung); }
.nav__item--locked { color: var(--pn-text-faint); cursor: default; }
.nav__item--locked:hover { color: var(--pn-text-faint); background: transparent; }

.nav__icon { flex: none; }
.nav__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav__badge {
  margin-left: auto;
  font-size: 10px;
  color: var(--pn-text-faint);
}

/* ≤ 900 px: aynı menü alt sekme çubuğu olur (ikon üstte, ad altta). */
@media (max-width: 900px) {
  .nav {
    flex-direction: row;
    align-items: stretch;
    gap: 4px;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    border-right: 0;
    border-top: 1px solid var(--pn-line);
    overflow: visible;
  }
  .nav__group,
  .nav__spacer { display: none; }
  .nav__item {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    height: 46px;
    padding: 0 4px;
    font-size: 11px;
    text-align: center;
  }
  .nav__label { max-width: 100%; }
  .nav__badge {
    position: absolute;
    top: 4px;
    right: 6px;
    margin: 0;
    font-size: 9px;
  }
}
</style>
