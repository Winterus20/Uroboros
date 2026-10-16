<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { isMotionOff } from '../composables/useMotion'
import { ArrowUp, Cpu, Layers, Flame, AlertTriangle } from 'lucide-vue-next'

const store = useGameStore()

const formattedClickPower = computed(() => format(store.manualClickPower, 2, store.settings.notation))
const tickspeedCost = computed(() => format(store.tickspeedCost, 2, store.settings.notation))
const tickspeedMultiplier = computed(() => format(store.tickspeedMultiplier, 2, store.settings.notation))
const canAffordTickspeed = computed(() => store.matter.gte(store.tickspeedCost))

// Hz rampası: kısmi = tek adım fiyatı (paket/10) karşılanıyor ama tam yükseltme değil.
const tickspeedPartial = computed(
  () => !canAffordTickspeed.value && store.matter.gte(store.tickspeedCost.div(10))
)
const tickspeedRampClass = computed(() =>
  tickspeedPartial.value ? 'ds-ramp-partial' : 'ds-ramp-locked'
)

// Tümü rampası — Header ile aynı ayrım: tam paket → ready, yalnız birim → partial.
const canAffordFullPack = computed(() => {
  if (canAffordTickspeed.value) return true
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    if (store.matter.gte(store.getDimensionCost(i))) return true
  }
  return false
})

const canAffordSingleUnit = computed(() => {
  if (canAffordTickspeed.value) return true
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    if (store.matter.gte(store.getDimensionCost(i).div(10))) return true
  }
  return false
})

const canAffordAny = computed(() => canAffordFullPack.value || canAffordSingleUnit.value)

const maxAllRampClass = computed(() => {
  if (canAffordFullPack.value) return ''
  return canAffordSingleUnit.value ? 'ds-ramp-partial' : 'ds-ramp-locked'
})

function handleConsume(e: MouseEvent | TouchEvent) {
  let x = window.innerWidth / 2
  let y = window.innerHeight * 0.75
  if ('clientX' in e && (e.clientX || e.clientY)) {
    x = e.clientX
    y = e.clientY
  } else if ('touches' in e && e.touches && e.touches[0]) {
    x = e.touches[0].clientX
    y = e.touches[0].clientY
  }

  // Taktil dokunsal titreşim (Web Vibration API - haptik his)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(8)
    } catch { /* yoksay */ }
  }

  // Taktil floating juice parçacığı
  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: `+${formattedClickPower.value}`,
        color: '#c084fc',
        combo: store.clickCombo.count > 1 ? store.clickCombo.count : undefined
      }
    })
  )

  store.manualClick({ x, y })
}

function handleTickspeed() {
  if (!canAffordTickspeed.value) return
  store.buyTickspeed()
}

function handleMaxAll() {
  if (!canAffordAny.value) return
  store.maxAll()
}

// Ortak punch kalıbı: dokunma geri bildirimi pointerdown anında (≤100 ms, tek impuls).
function punchTap(e: PointerEvent): void {
  if (isMotionOff()) return
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  el.classList.add('juice-punch')
  window.setTimeout(() => el.classList.remove('juice-punch'), 160)
}
</script>

<template>
  <!-- Sadece mobilde (< 768px) görünür, masaüstünde gizlidir -->
  <aside
    aria-label="Hızlı Taktil Çekim Çubuğu"
    class="md:hidden fixed bottom-[60px] left-0 right-0 z-30 px-3 py-1 pointer-events-none select-none"
  >
    <div
      class="pointer-events-auto max-w-md mx-auto flex items-center justify-between gap-1.5 p-1.5 rounded-2xl bg-[#090d15]/90 backdrop-blur-xl border border-white/[0.12] shadow-[0_12px_36px_rgba(0,0,0,0.85)]"
    >
      <!-- Sol 1: Çekim Hızı Hz Butonu -->
      <button
        type="button"
        @click="handleTickspeed"
        @pointerdown="punchTap"
        v-hold="handleTickspeed"
        :disabled="!canAffordTickspeed"
        class="btn-tactile h-11 px-2.5 rounded-xl text-xs font-mono font-medium transition-all flex flex-col items-center justify-center shrink-0 border"
        :class="canAffordTickspeed
          ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border-cyan-500/35 cursor-pointer shadow-xs affordance-pulse'
          : `bg-black/40 text-slate-600 border-white/[0.04] cursor-not-allowed ${tickspeedRampClass}`"
        :style="canAffordTickspeed ? { '--pulse-c1': 'rgba(0, 240, 255, 0.3)', '--pulse-c2': 'rgba(0, 240, 255, 0.7)' } : undefined"
        v-tip="'Çekim Hızı (Hz)'"
      >
        <div class="flex items-center gap-1 leading-none">
          <Cpu class="w-3 h-3 text-cyan-400" />
          <span class="text-[10px] font-bold text-white">×{{ tickspeedMultiplier }}</span>
        </div>
        <span
          class="text-[9px] font-normal tabular-nums truncate max-w-[50px] leading-tight"
          :class="canAffordTickspeed ? 'text-slate-200' : 'text-slate-500'"
        >
          {{ tickspeedCost }}
        </span>
      </button>

      <!-- Sol 2: Tümü (Max All) Butonu -->
      <button
        type="button"
        @click="handleMaxAll"
        @pointerdown="punchTap"
        :disabled="!canAffordAny"
        class="btn-tactile h-11 px-2.5 rounded-xl font-mono text-xs font-bold transition-all flex flex-col items-center justify-center shrink-0 border"
        :class="canAffordFullPack
          ? 'bg-white/[0.08] hover:bg-white/[0.15] text-white border-white/20 cursor-pointer shadow-xs affordance-pulse'
          : `bg-black/40 text-slate-600 border-white/[0.04] cursor-not-allowed ${maxAllRampClass}`"
        :style="canAffordFullPack ? { '--pulse-c1': 'rgba(255, 255, 255, 0.35)', '--pulse-c2': 'rgba(255, 255, 255, 0.75)' } : undefined"
        v-tip="'Tümünü Maks Al'"
      >
        <div class="flex items-center gap-1 leading-none">
          <Layers class="w-3 h-3 text-slate-300" />
          <span class="text-[10px] font-bold">Tümü</span>
        </div>
        <span class="text-[9px] text-slate-400 font-normal leading-tight">Maks</span>
      </button>

      <!-- Sağ: BÜYÜK ERGONOMİK "YUT!" (CONSUME) BUTONU -->
      <button
        type="button"
        @click="handleConsume($event)"
        @pointerdown="punchTap"
        class="btn-tactile flex-1 h-11 px-3.5 rounded-xl bg-purple-600/35 hover:bg-purple-600/45 text-white font-bold text-xs font-mono flex items-center justify-between gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.25)] active:scale-95 transition-all border border-purple-400/50 cursor-pointer"
        :class="{ 'cta-beacon': store.dimensions[0]?.bought === 0 }"
        v-tip="'Kütleçekim Vakumu / Taktil Yutuş'"
      >
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
            <ArrowUp class="w-3.5 h-3.5 text-purple-300 animate-pulse" />
          </div>
          <div class="flex flex-col items-start leading-none">
            <span class="text-xs font-black tracking-wider text-white uppercase">YUT!</span>
            <span class="text-[9px] text-purple-200/90 font-mono font-normal tabular-nums">
              +{{ formattedClickPower }}
            </span>
          </div>
        </div>

        <!-- Durum Rozeti (Kombo veya Kriz Debuff) -->
        <div v-if="store.isComboActive" class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/35 text-cyan-300 text-[10px] font-bold animate-pulse">
          <Flame class="w-2.5 h-2.5 fill-cyan-400" />
          <span>{{ store.comboMultiplier.toFixed(1) }}x</span>
        </div>
        <div v-else-if="store.crisisBackfireDebuff > 0" class="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/35 text-rose-300 text-[9px] font-bold">
          <AlertTriangle class="w-2.5 h-2.5" />
          <span>%50</span>
        </div>
      </button>
    </div>
  </aside>
</template>
