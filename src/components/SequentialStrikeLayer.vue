<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useGameStore } from '../stores/game'
import { sounds } from '../core/audio'
import type { StrikeStage, SequentialStrikePayload } from '../models/types'
import { isMotionReduced, useMotionMode } from '../composables/useMotion'

interface ActiveStrikeGroup {
  id: number
  x: number
  y: number
  stages: StrikeStage[]
  isCrit: boolean
  visibleStagesCount: number
}

interface MacroSurgePayload {
  type: 'shift' | 'galaxy' | 'crit'
  title: string
  unlockedDims: number
  multiplierText: string
}

const STAGE_STEP_MS = 40
const GROUP_LIFETIME_MS = 760
const MAX_ACTIVE_GROUPS = 3
const MACRO_STEP_MS = 65
const BADGE_HALF_WIDTH = 96

const store = useGameStore()

const activeGroups = ref<ActiveStrikeGroup[]>([])

let nextGroupId = 0
let macroToken = 0
const groupTimers = new Map<number, number[]>()
let macroTimers: number[] = []

// Sıralı mod kapalıyken veya hareket azaltılmışken katman hiçbir şey çizmez;
// bu durumda geleneksel tek sayı JuiceLayer'dan gelir.
// 3 durumlu kapı: reaktif mod terimi, ayar değişiminde computed'ın canlı yenilenmesini sağlar.
const motionMode = useMotionMode()

const isSequentialEnabled = computed(() => {
  if (store.settings.sequentialStrike === false) return false
  if (isMotionReduced() || motionMode.value !== 'full' || store.settings.batterySaver) return false
  return true
})

/** Çarpan yokken TABAN ile SLAM aynı sayıyı tekrarlar; tek rozete indirilir. */
function collapseStages(stages: StrikeStage[]): StrikeStage[] {
  if (stages.length <= 2) {
    const final = stages.find((s) => s.id === 'final')
    return final ? [final] : stages
  }
  return stages
}

function clearGroupTimers(id: number) {
  const timers = groupTimers.get(id)
  if (!timers) return
  timers.forEach((t) => window.clearTimeout(t))
  groupTimers.delete(id)
}

function removeGroup(id: number) {
  clearGroupTimers(id)
  const index = activeGroups.value.findIndex((g) => g.id === id)
  if (index !== -1) activeGroups.value.splice(index, 1)
}

function schedule(id: number, delayMs: number, fn: () => void) {
  const handle = window.setTimeout(fn, delayMs)
  const list = groupTimers.get(id) ?? []
  list.push(handle)
  groupTimers.set(id, list)
}

function handleSequentialStrike(e: Event) {
  if (!isSequentialEnabled.value) return
  const detail = (e as CustomEvent<SequentialStrikePayload>).detail
  if (!detail || !detail.stages || detail.stages.length === 0) return

  // Spam koruması: eski grubu anında düşür, ekranda en fazla MAX_ACTIVE_GROUPS kalır
  while (activeGroups.value.length >= MAX_ACTIVE_GROUPS) {
    removeGroup(activeGroups.value[0].id)
  }

  const stages = collapseStages(detail.stages)
  const id = nextGroupId++
  const group: ActiveStrikeGroup = {
    id,
    x: Math.min(Math.max(detail.x, BADGE_HALF_WIDTH), window.innerWidth - BADGE_HALF_WIDTH),
    y: Math.max(detail.y - 24, 8),
    stages,
    isCrit: detail.isCrit,
    visibleStagesCount: 1
  }
  activeGroups.value.push(group)

  for (let step = 2; step <= stages.length; step++) {
    schedule(id, (step - 1) * STAGE_STEP_MS, () => {
      group.visibleStagesCount = step
    })
  }
  schedule(id, GROUP_LIFETIME_MS, () => removeGroup(id))
}

function clearMacroTimers() {
  macroTimers.forEach((t) => window.clearTimeout(t))
  macroTimers = []
}

function handleMacroSurge(e: Event) {
  if (!isSequentialEnabled.value) return
  const detail = (e as CustomEvent<MacroSurgePayload>).detail
  if (!detail) return

  // Üst popup kaldırıldı: yalnızca kademeli ses + final sarsıntı çalınır, görsel bar yok.
  clearMacroTimers()
  const token = ++macroToken
  const total = Math.min(Math.max(detail.unlockedDims || 3, 1), 8)

  for (let i = 0; i <= total; i++) {
    macroTimers.push(
      window.setTimeout(() => {
        if (token !== macroToken) return
        if (i < total) {
          sounds.playMacroSurge(i, total)
        } else {
          window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'medium' } }))
        }
      }, i * MACRO_STEP_MS)
    )
  }
}

onMounted(() => {
  window.addEventListener('doomscroll:sequential-strike', handleSequentialStrike as EventListener)
  window.addEventListener('doomscroll:macro-surge', handleMacroSurge as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('doomscroll:sequential-strike', handleSequentialStrike as EventListener)
  window.removeEventListener('doomscroll:macro-surge', handleMacroSurge as EventListener)
  groupTimers.forEach((timers) => timers.forEach((t) => window.clearTimeout(t)))
  groupTimers.clear()
  clearMacroTimers()
})
</script>

<template>
  <div
    class="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
    aria-hidden="true"
  >
    <!-- Mikro Reels Vuruşu: dikey yığın, viewport'a sıkıştırılmış, CSS ile süzülür -->
    <div
      v-for="group in activeGroups"
      :key="group.id"
      class="strike-group absolute flex flex-col items-center gap-1"
      :class="{ 'strike-group-crit': group.isCrit }"
      :style="{ left: `${group.x}px`, top: `${group.y}px` }"
    >
      <template v-for="(stage, idx) in group.stages" :key="stage.id">
        <div
          v-if="idx < group.visibleStagesCount"
          class="strike-badge flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono font-bold shadow-md backdrop-blur-sm whitespace-nowrap"
          :class="[
            stage.bgClass,
            stage.borderClass,
            stage.id === 'final' ? 'strike-badge-final' : ''
          ]"
        >
          <span v-if="stage.icon" class="text-[11px] leading-none">{{ stage.icon }}</span>
          <span class="text-[10px] uppercase tracking-wider opacity-85">{{ stage.label }}</span>
          <span class="text-white font-black tabular-nums">{{ stage.text }}</span>
        </div>
      </template>
    </div>

  </div>
</template>

<style scoped>
.strike-group {
  transform: translateX(-50%);
  animation: strikeFloat 760ms ease-out forwards;
  will-change: transform, opacity;
}

.strike-group-crit {
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.55));
}

.strike-badge {
  animation: strikePop 220ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.strike-badge-final {
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
}

@keyframes strikePop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  65% {
    transform: scale(1.15);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes strikeFloat {
  0%,
  55% {
    transform: translate(-50%, 0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -34px);
    opacity: 0;
  }
}
</style>
