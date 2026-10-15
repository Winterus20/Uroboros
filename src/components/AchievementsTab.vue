<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, PER_ACHIEVEMENT_MULT, ROW_COMPLETION_MULT } from '../game/achievements'
import type { AchievementDef } from '../models/types'
import { format } from '../core/format'
import { Trophy, ChevronDown, Search, Gift } from 'lucide-vue-next'
import TabHero from './TabHero.vue'

const store = useGameStore()

type FilterKind = 'all' | 'rewarded' | 'unlocked' | 'locked'

const FILTERS: Array<{ id: FilterKind; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'rewarded', label: 'Ödüllü' },
  { id: 'unlocked', label: 'Açılan' },
  { id: 'locked', label: 'Kilitli' }
]

const filter = ref<FilterKind>('all')
const query = ref('')
const collapsed = ref<Set<string>>(new Set())

const unlockedSet = computed(() => new Set<string>(store.achievements))

function isUnlocked(id: string): boolean {
  return unlockedSet.value.has(id)
}

// Kategori -> tanım haritası: şablon içindeki filter() çağrısını kaldırır (O(n²) render engeli).
const grouped = computed<Record<string, AchievementDef[]>>(() => {
  const map: Record<string, AchievementDef[]> = {}
  for (const cat of ACHIEVEMENT_CATEGORIES) map[cat.id] = []
  for (const ach of ACHIEVEMENTS) {
    const list = map[ach.category]
    if (list) list.push(ach)
  }
  return map
})

function categoryProgress(catId: string): { done: number; total: number } {
  const defs = grouped.value[catId] ?? []
  return { done: defs.filter((a) => isUnlocked(a.id)).length, total: defs.length }
}

function isCategoryComplete(catId: string): boolean {
  const defs = grouped.value[catId] ?? []
  return defs.length > 0 && defs.every((a) => isUnlocked(a.id))
}

function matchesFilter(ach: AchievementDef): boolean {
  if (filter.value === 'rewarded' && !ach.reward) return false
  if (filter.value === 'unlocked' && !isUnlocked(ach.id)) return false
  if (filter.value === 'locked' && isUnlocked(ach.id)) return false
  const q = query.value.trim().toLocaleLowerCase('tr')
  if (q.length === 0) return true
  const hay = `${ach.name} ${ach.desc} ${ach.reward?.desc ?? ''}`.toLocaleLowerCase('tr')
  return hay.includes(q)
}

function visibleAchievements(catId: string): AchievementDef[] {
  return (grouped.value[catId] ?? []).filter((a) => matchesFilter(a))
}

// Her kategoride kilitli, gizli olmayan ilk plaket "Sıradaki" hedeftir.
const nextIdByCategory = computed<Record<string, string | null>>(() => {
  const out: Record<string, string | null> = {}
  for (const cat of ACHIEVEMENT_CATEGORIES) {
    const defs = grouped.value[cat.id] ?? []
    out[cat.id] = defs.find((a) => !isUnlocked(a.id) && !a.secret)?.id ?? null
  }
  return out
})

function isNext(achId: string, catId: string): boolean {
  return nextIdByCategory.value[catId] === achId
}

function isCollapsed(catId: string): boolean {
  return collapsed.value.has(catId)
}

function toggleCategory(catId: string): void {
  const next = new Set(collapsed.value)
  if (next.has(catId)) next.delete(catId)
  else next.add(catId)
  collapsed.value = next
}

function setAllCollapsed(value: boolean): void {
  collapsed.value = value ? new Set(ACHIEVEMENT_CATEGORIES.map((c) => c.id)) : new Set()
}

const visibleCategories = computed(() =>
  ACHIEVEMENT_CATEGORIES.filter((c) => visibleAchievements(c.id).length > 0)
)

const totalUnlocked = computed(() => store.achievements.length)
const totalCount = computed(() => ACHIEVEMENTS.length)
const globalPercent = computed(() =>
  totalCount.value === 0 ? 0 : (totalUnlocked.value / totalCount.value) * 100
)
const multiplierText = computed(() => format(store.achievementMultiplier, 2, store.settings.notation))
const rewardedUnlocked = computed(() => ACHIEVEMENTS.filter((a) => a.reward && isUnlocked(a.id)).length)
const rewardedTotal = computed(() => ACHIEVEMENTS.filter((a) => a.reward).length)
</script>

<template>
  <div class="space-y-3">
    <TabHero
      :icon="Trophy"
      icon-class="text-amber-400"
      title="Kozmik Başarımlar & Plaketler"
      :badge="`${totalUnlocked}/${totalCount}`"
      badge-class="ds-badge-amber"
      subtitle="Her plaket kalıcı güç verir. Ödüllüler yetenek açar."
      accent="amber"
    >
      <template #stats>
        <div class="stat-box">
          <div>
            <div class="stat-box-label">Başarım Çarpanı (kalıcı)</div>
            <div class="stat-box-value text-amber-400 tabular-nums">×{{ multiplierText }}</div>
          </div>
        </div>
        <div class="stat-box">
          <div>
            <div class="stat-box-label">Ödüllü {{ rewardedUnlocked }}/{{ rewardedTotal }}</div>
            <div class="stat-box-value text-cyan-300 tabular-nums">%{{ globalPercent.toFixed(0) }}</div>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Yapışkan araç çubuğu: arama + filtre + genel ilerleme -->
    <div class="sticky top-2 z-20 glass-panel-card rounded-xl p-2.5 space-y-2 backdrop-blur-md">
      <div class="flex items-center gap-2 flex-wrap">
        <label class="relative flex-1 min-w-[160px]">
          <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            v-model="query"
            type="search"
            placeholder="Plaket ara..."
            aria-label="Plaket ara"
            class="no-swipe w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500/50"
          />
        </label>
        <div class="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Plaket filtresi">
          <button
            v-for="f in FILTERS"
            :key="f.id"
            type="button"
            :aria-pressed="filter === f.id"
            @click="filter = f.id"
            class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer"
            :class="filter === f.id
              ? 'bg-white/[0.10] border-white/25 text-white'
              : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'"
          >
            {{ f.label }}
          </button>
        </div>
        <button
          type="button"
          @click="setAllCollapsed(collapsed.size === 0)"
          class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-white/10 bg-black/30 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          {{ collapsed.size === 0 ? 'Daralt' : 'Aç' }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <div class="progress-track progress-track-sm flex-1">
          <div class="progress-fill progress-fill-amber" :style="{ width: `${globalPercent}%` }"></div>
        </div>
        <span class="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
          {{ totalUnlocked }}/{{ totalCount }}
        </span>
      </div>
      <details class="text-[11px] text-slate-500">
        <summary class="cursor-pointer hover:text-slate-300 select-none">Formül detayı</summary>
        <p class="mt-1 leading-relaxed">
          Her plaket kalıcı ×{{ PER_ACHIEVEMENT_MULT }} üretim verir, tam satır (kategori) ×{{ ROW_COMPLETION_MULT }} ekler.
          Gizli plaketler ipucu vermez, ödül vermez — sadece plaket.
        </p>
      </details>
    </div>

    <!-- Kategori Satırları -->
    <div v-if="visibleCategories.length > 0" class="glass-panel-card p-4 rounded-xl space-y-4">
      <div
        v-for="cat in visibleCategories"
        :key="cat.id"
        class="space-y-2.5"
      >
        <button
          type="button"
          :aria-expanded="!isCollapsed(cat.id)"
          @click="toggleCategory(cat.id)"
          class="w-full flex items-center justify-between gap-3 flex-wrap text-left cursor-pointer rounded-lg px-1 py-0.5 hover:bg-white/[0.02] transition-colors"
        >
          <span class="flex items-center gap-2 min-w-0">
            <ChevronDown
              class="w-4 h-4 shrink-0 text-slate-500 transition-transform"
              :class="{ '-rotate-90': isCollapsed(cat.id) }"
            />
            <span class="text-lg shrink-0" aria-hidden="true">{{ cat.icon }}</span>
            <span class="min-w-0">
              <span class="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                {{ cat.name }}
                <span v-if="isCategoryComplete(cat.id)" class="ds-badge ds-badge-amber">Tam satır ✓ ×1.06</span>
                <span v-else class="ds-badge">Tam satır → ×1.06</span>
              </span>
              <span class="text-[11px] text-slate-500 block">{{ cat.desc }}</span>
            </span>
          </span>
          <span class="flex items-center gap-2 shrink-0">
            <span class="progress-track progress-track-sm w-24 progress-track-bordered" aria-hidden="true">
              <span
                class="progress-fill progress-fill-amber block h-full"
                :style="{ width: `${(categoryProgress(cat.id).done / Math.max(1, categoryProgress(cat.id).total)) * 100}%` }"
              ></span>
            </span>
            <span class="text-xs font-mono text-slate-400 tabular-nums">
              {{ categoryProgress(cat.id).done }}/{{ categoryProgress(cat.id).total }}
            </span>
          </span>
        </button>

        <div v-show="!isCollapsed(cat.id)" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 items-stretch">
          <div
            v-for="ach in visibleAchievements(cat.id)"
            :key="ach.id"
            class="p-3 rounded-xl border flex flex-col gap-1.5 transition-all min-w-0 overflow-hidden h-full"
            :class="[
              isUnlocked(ach.id)
                ? 'bg-amber-500/[0.05] border-amber-500/25'
                : 'bg-black/30 border-white/[0.04] opacity-60',
              ach.reward && !isNext(ach.id, cat.id) ? 'border-l-2 border-l-cyan-400/70' : '',
              isNext(ach.id, cat.id) ? 'ring-1 ring-amber-400/60 border-amber-400/40 opacity-100' : ''
            ]"
          >
            <div class="flex items-start gap-2 min-w-0">
              <span class="text-xl leading-none shrink-0 mt-px" :class="{ 'grayscale': !isUnlocked(ach.id) }">
                {{ isUnlocked(ach.id) || !ach.secret ? ach.icon : '❓' }}
              </span>
              <span class="text-xs font-bold flex-1 min-w-0 break-words leading-tight line-clamp-2 min-h-[2em]" :class="isUnlocked(ach.id) ? 'text-amber-200' : 'text-slate-400'">
                {{ isUnlocked(ach.id) || !ach.secret ? ach.name : '???' }}
              </span>
              <span v-if="isNext(ach.id, cat.id)" class="ds-badge ds-badge-amber shrink-0">★ Sıradaki</span>
            </div>
            <div class="text-[11px] leading-snug break-words line-clamp-2 min-h-[2.1rem]" :class="isUnlocked(ach.id) ? 'text-slate-300' : 'text-slate-500'">
              {{ isUnlocked(ach.id) || !ach.secret ? ach.desc : 'Gizli başarım — olay ufkunu kurcala, belki bulursun.' }}
            </div>
            <div class="mt-auto pt-1 min-w-0 min-h-[1.75rem]">
              <span
                v-if="ach.reward"
                class="ds-badge tabular-nums max-w-full text-left leading-snug break-words [white-space:normal]"
                :class="isUnlocked(ach.id) ? 'ds-badge-amber' : 'ds-badge-slate'"
              >
                <Gift class="w-3 h-3 shrink-0" aria-hidden="true" />
                <span class="min-w-0">{{ isUnlocked(ach.id) ? '✔ ' : '' }}{{ ach.reward.desc }}</span>
              </span>
              <span v-else-if="ach.secret && !isUnlocked(ach.id)" class="ds-badge ds-badge-slate">
                GİZLİ · ÖDÜLSÜZ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="glass-panel-card p-6 rounded-xl text-center text-xs text-slate-500">
      Filtreye uyan plaket yok. Filtreyi temizle ya da farklı bir şey ara.
    </div>
  </div>
</template>
