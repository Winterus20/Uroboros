<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore, BASE_UNLOCKED_DIMENSIONS } from '../stores/game'
import { format } from '../core/format'
import { D_0 } from '../core/math'
import { getTierIdentity, getTierGlyph, getTierAccent } from '../game/dimension_identity'
import { isMotionOff } from '../composables/useMotion'
import DimensionRow from './DimensionRow.vue'
import ConfirmModal from './ConfirmModal.vue'
import {
  Sparkles,
  Radio,
  EyeOff,
  AlertCircle,
  Trash2,
  ChevronDown,
  Lock,
  MousePointerClick
} from 'lucide-vue-next'

const store = useGameStore()
// P2 cila: Vicdan kartı katlanabilir — alt scroll zorunluluğu kalkar, ceza rozeti üstte kalır
const slackersOpen = ref(false)

// Parazit doğduğu an kart otomatik açılır (kullanıcı yine elle kapatabilir)
watch(
  () => store.slackers.length,
  (n, old) => {
    if (n > 0 && (old ?? 0) === 0) slackersOpen.value = true
  }
)

// Bağlamsal pasif rozetleri — etki ettiği mekanikte gösterilir (satırlar temiz kalır)
const d3Passive = computed(() => {
  const id = getTierIdentity(3)
  if (!store.passiveBadges.d3Leech || !id) return null
  return { label: `D3 -${Math.round((1 - id.passive.value) * 100)}%`, desc: id.passive.desc }
})
const d5Passive = computed(() => {
  const id = getTierIdentity(5)
  if (!store.passiveBadges.d5Shift || !id) return null
  return { label: `D5 -${Math.round((1 - id.passive.value) * 100)}%`, desc: id.passive.desc }
})

const visibleDimensions = computed(() => {
  return store.dimensions.slice(0, store.unlockedDimensionsCount)
})

// ADR-0027: sıradaki kilitli format teaser'ı — unfolding "merak metni" (P1, research §5).
const nextLockedTier = computed(() => {
  const unlocked = store.unlockedDimensionsCount
  if (unlocked >= 8 || store.activeChallenge) return null
  const tier = unlocked + 1
  const identity = getTierIdentity(tier)
  // Kaçıncı Akış Sıçramasında açılacağı tek kaynaktan türetilir (ADR-0033).
  const shiftsNeeded = Math.max(1, tier - BASE_UNLOCKED_DIMENSIONS)
  return { tier, label: identity?.label ?? `D${tier}`, shiftsNeeded }
})

// Teaser ilerleme çubuğu: mevcut sıçrama / gereken sıçrama oranı (oran = çubuk, sayı ikincil).
const nextLockedTeaserPercent = computed(() => {
  const teaser = nextLockedTier.value
  if (!teaser) return 0
  return Math.min(100, (store.dimensionShifts / teaser.shiftsNeeded) * 100)
})

const shiftReq = computed(() => store.shiftRequirement)
const isShiftUnlock = computed(() => store.dimensionShifts < 6)

const currentShiftDimAmount = computed(() => {
  const dim = store.dimensions[shiftReq.value.tier - 1]
  return dim ? dim.amount : D_0
})

const shiftProgressPercent = computed(() => {
  if (shiftReq.value.amount.lte(0)) return 0
  const ratio = currentShiftDimAmount.value.div(shiftReq.value.amount).toNumber()
  return Math.min(100, Math.max(0, ratio * 100))
})

const galaxyReq = computed(() => store.galaxyRequirement)
const galaxyTier = computed(() => store.galaxyRequirementTier)
// Hedef boyut henüz kilitliyse ölü ilerleme (0/40 D8) yerine teaser gösterilir
const isGalaxyTierLocked = computed(() => galaxyTier.value > store.unlockedDimensionsCount)
const currentGalaxyDimAmount = computed(() => {
  const dim = store.dimensions[galaxyTier.value - 1]
  return dim ? dim.amount : D_0
})

const galaxyProgressPercent = computed(() => {
  if (galaxyReq.value <= 0) return 0
  const ratio = currentGalaxyDimAmount.value.div(galaxyReq.value).toNumber()
  return Math.min(100, Math.max(0, ratio * 100))
})

// Üç durumlu uygunluk rampası (durum ≠ hue): hazırda kimlik hue'u + pulse,
// kısmide ds-ramp-partial, hiç yapılamıyorsa ds-ramp-locked. Rampa yalnız
// opacity/kenarlık/zemin oynatır; buton kimlik hue'u ezilmez.
const shiftAffordRampClass = computed(() =>
  shiftProgressPercent.value > 0 ? 'ds-ramp-partial' : 'ds-ramp-locked'
)
const galaxyAffordRampClass = computed(() => {
  if (isGalaxyTierLocked.value) return 'ds-ramp-locked'
  return galaxyProgressPercent.value > 0 ? 'ds-ramp-partial' : 'ds-ramp-locked'
})
const sacrificeAffordRampClass = computed(() =>
  store.currentSacrificeReward.gt(store.sacrificeMultiplier) ? 'ds-ramp-partial' : 'ds-ramp-locked'
)

// Önbellek Temizleme (Sacrifice) açık mı?
// ADR-0035: artık `dimensionShifts >= 5` değil — Akış Kümesi o sayacı 0'a indirdiği
// için kart her kümeden sonra kayboluyordu. Store'daki kalıcı getter tek kaynak.
const isSacrificeUnlocked = computed(() => store.sacrificeUnlocked)

function triggerSacrifice(e: MouseEvent) {
  if (!store.canSacrifice) return
  // QoL: geri dönüşsüz aksiyon — onay diyaloğu (ayarlardan kapatılabilir)
  if (store.settings.confirmDialogs) {
    showSacrificeConfirm.value = true
    return
  }
  doSacrifice(e)
}

function doSacrifice(e?: MouseEvent) {
  if (!store.canSacrifice) return
  window.dispatchEvent(new CustomEvent('doomscroll:shake'))

  const target = e?.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'Önbellek Temizlendi!',
        color: '#fda4af'
      }
    })
  )
  store.sacrificeDimensions()
}

function triggerShift(e: MouseEvent) {
  if (!store.canShift) return
  const target = e.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: isShiftUnlock.value ? 'Yeni Format!' : `×${format(store.singleShiftPower, 1, store.settings.notation)} Boost!`,
        color: '#d8b4fe',
        big: true
      }
    })
  )
  window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))
  store.dimensionShift()
}

function triggerGalaxy(e: MouseEvent) {
  if (!store.canBuyGalaxy) return
  const target = e.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'Küme Kuruldu!',
        color: '#fcd34d',
        big: true
      }
    })
  )
  window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))
  store.buyGalaxy()
}

// QoL: onay diyaloğu görünürlüğü
const showSacrificeConfirm = ref(false)

// Akış Kümesi kartı D8 çağında anlamlıdır: ilk sıçrama öncesi ve D5 kapalıysa
// ölü kart yerine tek satır hedef gösterilir.
const showGalaxyCard = computed(
  () => store.dimensionShifts >= 1 || store.galaxies > 0 || store.unlockedDimensionsCount >= 5
)

const gridColsClass = computed(() => {
  if (isSacrificeUnlocked.value) return 'md:grid-cols-3'
  if (showGalaxyCard.value) return 'md:grid-cols-2'
  return 'grid-cols-1'
})

function handleSlackerClick(e: MouseEvent, id: string) {
  window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))

  let x = e.clientX
  let y = e.clientY
  if (!x && !y) {
    const target = e.currentTarget as HTMLElement | null
    const rect = target?.getBoundingClientRect()
    x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
  }

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'Sustur!',
        color: '#fda4af'
      }
    })
  )
  store.clickSlacker(id)
}

// Ortak punch kalıbı: dokunma geri bildirimi pointerdown anında (≤100 ms, tek impuls).
function punchTap(e: PointerEvent): void {
  if (isMotionOff()) return
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  el.classList.add('juice-punch')
  window.setTimeout(() => el.classList.remove('juice-punch'), 160)
}

// Dokunmatik Yukarı Kaydırma (Touch Swipe-Up Gesture)
let touchStartTime = 0
let touchStartY = 0
let touchStartX = 0
let touchScrollStartY = 0

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    const target = e.target as HTMLElement | null
    // Buton, link veya form elemanı üzerindeyse jest başlatma
    if (target?.closest('button, a, input, select, textarea, [role="button"]')) {
      touchStartTime = 0
      return
    }

    const touch = e.touches[0]
    touchStartTime = performance.now()
    touchStartY = touch.clientY
    touchStartX = touch.clientX
    touchScrollStartY = window.scrollY || document.documentElement.scrollTop || 0
  }
}

function handleTouchEnd(e: TouchEvent) {
  // Jest kapalıysa veya başlangıç geçersizse çık
  if (store.settings.swipeSensitivity === 'off' || touchStartTime === 0) return

  if (e.changedTouches.length === 1) {
    const touch = e.changedTouches[0]
    const endTime = performance.now()
    const duration = endTime - touchStartTime
    touchStartTime = 0 // Sıfırla

    // 1. Sayfa dikeyde kaymış mı? (Kullanıcı ekranı kaydırıyorsa ASLA jest/tıklama tetikleme!)
    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0
    if (Math.abs(currentScrollY - touchScrollStartY) > 8) {
      return
    }

    const deltaY = touch.clientY - touchStartY
    const deltaX = touch.clientX - touchStartX
    const absY = Math.abs(deltaY)
    const absX = Math.abs(deltaX)
    const velocity = absY / Math.max(duration, 1)

    // Hassasiyet eşikleri (Dengeli vs Düşük)
    const isLow = store.settings.swipeSensitivity === 'low'
    const minDistance = isLow ? 100 : 70 // px
    const maxDuration = isLow ? 220 : 280 // ms (280ms'den uzun süren dokunmalar kaydırma/drag'dir)
    const minVelocity = isLow ? 0.65 : 0.42 // px/ms

    // 2. Yalnızca YUKARI doğru (deltaY < 0), dikey yönü belirgin ve hızlı bir fiskeleme
    if (
      deltaY <= -minDistance &&
      duration >= 45 &&
      duration <= maxDuration &&
      velocity >= minVelocity &&
      absY > absX * 1.5
    ) {
      const x = touch.clientX
      const y = touch.clientY

      // Taktil dokunsal titreşim
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(8)
        } catch { /* yoksay */ }
      }

      window.dispatchEvent(
        new CustomEvent('doomscroll:tap', {
          detail: {
            x,
            y,
            text: `+${format(store.manualClickPower, 2, store.settings.notation)}`
          }
        })
      )
      store.manualClick({ x, y })
    }
  }
}
</script>

<template>
  <div
    class="space-y-3"
    @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd"
  >
    <!-- 3. Vicdan Azapları — katlanabilir: başlık her zaman görünür, chipler açılır/kapanır -->
    <div
      v-if="store.slackers.length > 0"
      class="glass-panel-card p-2.5 rounded-xl border border-rose-500/30 bg-rose-950/15 space-y-0"
    >
      <button
        @click="slackersOpen = !slackersOpen"
        :aria-expanded="slackersOpen"
        aria-label="Kozmik parazit listesini aç veya kapat"
        class="w-full flex items-center justify-between text-xs font-mono py-0.5 cursor-pointer"
      >
        <div class="flex items-center gap-1.5 text-rose-200 font-bold">
          <AlertCircle class="w-3.5 h-3.5 text-rose-300" />
          <span class="font-sans">Kozmik Parazit</span>
          <span class="text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25 shrink-0 select-none">-{{ (store.slackerLeechPercent * 100).toFixed(0) }}%</span>
          <span class="text-[10px] font-mono tabular-nums text-slate-500 shrink-0">×{{ store.slackers.length }}</span>
          <span
            v-if="d3Passive"
            class="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 shrink-0 select-none"
          >
            <span class="dim-glyph" :class="getTierAccent(3)">{{ getTierGlyph(3) }}</span>
            {{ d3Passive.label }}
          </span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-[10px] font-mono font-bold tabular-nums text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0 select-none" aria-label="3 tıkla devre dışı bırak, yüzde 120 kütle iadesi"><MousePointerClick class="w-3 h-3" />3 tık → +%120</span>
          <ChevronDown class="w-3.5 h-3.5 text-slate-500 transition-transform" :class="{ 'rotate-180': !slackersOpen }" />
        </div>
      </button>

      <div v-show="slackersOpen" class="flex flex-wrap gap-2 pt-2">
        <button
          v-for="slacker in store.slackers"
          :key="slacker.id"
          @click="handleSlackerClick($event, slacker.id)"
          @pointerdown="punchTap"
          :aria-label="`${slacker.name} parazitini etkisizleştir`"
          class="wrinkler-chip btn-tactile px-3 py-1.5 rounded-lg border border-rose-800/40 bg-rose-950/20 hover:border-rose-500/60 cursor-pointer flex items-center gap-2 text-xs font-mono text-slate-200"
        >
          <EyeOff class="w-3 h-3 text-rose-400" />
          <span>{{ slacker.name }}</span>
          <span class="text-rose-400 tabular-nums font-bold">{{ format(slacker.leechedDopamine, 1, store.settings.notation) }}</span>
          <span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] tabular-nums" aria-label="Kalan tık">×{{ slacker.clicksRemaining }}</span>
        </button>
      </div>
    </div>

    <!-- 4. Format Listesi (D1-D8 Kompakt Satırlar) — mobilde 44px hitbox çakışmasını önlemek için space-y-2 -->
    <div class="space-y-2 sm:space-y-1.5">
      <template v-for="dim in visibleDimensions" :key="dim.tier">
        <DimensionRow :dimension="dim" />
      </template>
    </div>

    <!-- ADR-0027: sıradaki format teaser'ı -->
    <div
      v-if="nextLockedTier"
      class="text-[11px] font-mono text-slate-500 px-1 flex items-start gap-1.5"
    >
      <Lock class="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
      <div class="min-w-0 flex-1">
        <span>
          <span class="dim-glyph" :class="getTierAccent(nextLockedTier.tier)">{{ getTierGlyph(nextLockedTier.tier) }}</span>
          D{{ nextLockedTier.tier }} {{ nextLockedTier.label }} —
          <span class="text-slate-400">{{ nextLockedTier.shiftsNeeded }}. Ölçek Sıçraması ile açılır</span>
        </span>
        <div class="progress-track progress-track-mini w-full max-w-[220px] mt-1">
          <div class="progress-fill progress-fill-purple" :style="{ width: `${nextLockedTeaserPercent}%` }"></div>
        </div>
      </div>
    </div>

    <!-- 5. Bento Kartlar: Sıçrama, Kümeler ve Önbellek Temizleme -->
    <div
      class="grid grid-cols-1 gap-3 pt-1"
      :class="gridColsClass"
    >
      <!-- Ölçek Sıçraması (Shift) -->
      <div
        v-tilt="{ max: 6, scale: 1.015, disabled: !(store.settings.holoCardsEnabled ?? true) }"
        class="card-tilt-surface glass-panel-card p-3 rounded-xl flex items-center justify-between gap-3 border border-white/[0.06] transition-all"
        :class="store.canShift && (store.settings.holoCardsEnabled ?? true) ? 'edition-foil' : ''"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] text-purple-400 flex items-center justify-center shrink-0">
            <Sparkles class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-xs text-slate-200">Ölçek Sıçraması</span>
              <span class="text-[10px] font-mono text-purple-400">Sv: {{ store.dimensionShifts }}</span>
              <span
                v-if="d5Passive"
                class="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 shrink-0 select-none"
              >
                <span class="dim-glyph" :class="getTierAccent(5)">{{ getTierGlyph(5) }}</span>
                {{ d5Passive.label }}
              </span>
            </div>
            <div class="text-[11px] font-mono text-slate-400 tabular-nums">
              {{ format(currentShiftDimAmount, 0, store.settings.notation) }} / {{ format(shiftReq.amount, 0, store.settings.notation) }} <span class="dim-glyph" :class="getTierAccent(shiftReq.tier)">{{ getTierGlyph(shiftReq.tier) }}</span> D{{ shiftReq.tier }}
            </div>
            <div class="progress-track progress-track-mini w-20 sm:w-24 mt-1">
              <div class="progress-fill progress-fill-purple" :style="{ width: `${shiftProgressPercent}%` }"></div>
            </div>
          </div>
        </div>

        <button
          @click="triggerShift($event)"
          :disabled="!store.canShift"
          aria-label="Ölçek sıçraması yap"
          class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border shrink-0"
          :class="store.canShift
            ? 'bg-purple-600/25 hover:bg-purple-600/35 text-purple-200 border-purple-500/40 cursor-pointer affordance-pulse'
            : `bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed ${shiftAffordRampClass}`"
        >
          {{ isShiftUnlock ? 'Boyut Aç' : `×${format(store.singleShiftPower, 1, store.settings.notation)} Boost` }}
        </button>
      </div>

      <!-- Kozmik Kümeler / Olay Ufku (Galaxies — D8 çağında açılır) -->
      <div
        v-if="showGalaxyCard"
        v-tilt="{ max: 6, scale: 1.015, disabled: !(store.settings.holoCardsEnabled ?? true) }"
        class="card-tilt-surface glass-panel-card p-3 rounded-xl flex items-center justify-between gap-3 border border-white/[0.06] transition-all"
        :class="store.canBuyGalaxy && (store.settings.holoCardsEnabled ?? true) ? 'edition-poly' : ''"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] text-amber-400 flex items-center justify-center shrink-0">
            <Radio class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-xs text-slate-200">Kozmik Kümeler</span>
              <span class="text-[10px] font-mono text-amber-400">Adet: {{ store.galaxies }}</span>
            </div>
            <div v-if="isGalaxyTierLocked" class="text-[11px] font-sans text-slate-500 leading-tight">
              <span class="dim-glyph" :class="getTierAccent(galaxyTier)">{{ getTierGlyph(galaxyTier) }}</span> D{{ galaxyTier }} açılınca aktifleşir
            </div>
            <template v-else>
              <div class="text-[11px] font-mono text-slate-400 tabular-nums">
                {{ format(currentGalaxyDimAmount, 0, store.settings.notation) }} / {{ galaxyReq }} <span class="dim-glyph" :class="getTierAccent(galaxyTier)">{{ getTierGlyph(galaxyTier) }}</span> D{{ galaxyTier }}
              </div>
              <div class="progress-track progress-track-mini w-20 sm:w-24 mt-1">
                <div class="progress-fill progress-fill-amber" :style="{ width: `${galaxyProgressPercent}%` }"></div>
              </div>
            </template>
          </div>
        </div>

        <button
          @click="triggerGalaxy($event)"
          :disabled="!store.canBuyGalaxy"
          aria-label="Kozmik küme kur"
          class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border shrink-0"
          :class="store.canBuyGalaxy
            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40 cursor-pointer affordance-pulse'
            : `bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed ${galaxyAffordRampClass}`"
          :style="store.canBuyGalaxy ? { '--pulse-c1': 'rgba(245, 158, 11, 0.35)', '--pulse-c2': 'rgba(245, 158, 11, 0.75)' } : undefined"
        >
          Küme Kur
        </button>
      </div>

      <!-- Önbelleği Temizleme (Dimension Sacrifice - Antimatter Dimensions) -->
      <div
        v-if="isSacrificeUnlocked"
        v-tilt="{ max: 6, scale: 1.015, disabled: !(store.settings.holoCardsEnabled ?? true) }"
        class="card-tilt-surface glass-panel-card p-3 rounded-xl flex items-center justify-between gap-3 border border-rose-500/20 bg-rose-950/10 transition-all"
        :class="store.canSacrifice && (store.settings.holoCardsEnabled ?? true) ? 'edition-negative' : ''"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-xs text-rose-200">Tekillik Besle</span>
              <span class="text-[10px] font-mono text-rose-400 tabular-nums">×{{ format(store.sacrificeMultiplier, 1, store.settings.notation) }}</span>
            </div>
            <div class="text-[11px] font-mono text-rose-300/80 tabular-nums">
              → ×{{ format(store.currentSacrificeReward, 1, store.settings.notation) }} <span class="dim-glyph" :class="getTierAccent(8)">{{ getTierGlyph(8) }}</span> D8
            </div>
            <div class="text-[9px] text-slate-500 font-mono">
              D1 birikimini D8 tekillik gücüne çevir
            </div>
          </div>
        </div>

        <button
          @click="triggerSacrifice($event)"
          :disabled="!store.canSacrifice"
          aria-label="Tekillik besle"
          class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border shrink-0 uppercase"
          :class="store.canSacrifice
            ? 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 border-rose-500/50 cursor-pointer shadow-sm affordance-pulse'
            : `bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed ${sacrificeAffordRampClass}`"
          :style="store.canSacrifice ? { '--pulse-c1': 'rgba(244, 63, 94, 0.4)', '--pulse-c2': 'rgba(244, 63, 94, 0.8)' } : undefined"
        >
          Besle
        </button>
      </div>

      <!-- QoL: onay diyaloğu (native confirm yerine; ayarlardan kapatılabilir) -->
      <ConfirmModal
        v-if="showSacrificeConfirm"
        title="Tekillik Besleme"
        message="D1-D7 katmanların korunur; biriken D1 miktarına göre D8 Samanyolu & Karadelik katmanına kalıcı çarpan eklenir. Devam edilsin mi?"
        confirm-label="Besle"
        :danger="false"
        @confirm="showSacrificeConfirm = false; doSacrifice()"
        @cancel="showSacrificeConfirm = false"
      />
    </div>
  </div>
</template>
