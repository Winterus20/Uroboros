<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { Decimal, D_0 } from '../core/math'
import { pushDirectionFor, isPressFeedbackFresh, CARD_PUSH_MS, CARD_RELEASE_MS } from '../core/card-physics'
import type { DimensionData } from '../models/types'
import { getTierGlyph, getTierAccent } from '../game/dimension_identity'
import { Link } from 'lucide-vue-next'

const props = defineProps<{
  dimension: DimensionData
}>()

const store = useGameStore()
const shellRef = ref<HTMLElement | null>(null)
const cardRef = ref<HTMLElement | null>(null)
let bounceTimer: number | null = null

// ---- Faz 0 Taktil Cila (Sütun 3): bas-bırak lastik gerilmesi (spring damping) ----
// Butona basılı tutunca kart lastik gibi gerilir (scale3d(1.04, 0.92, 1)),
// bırakılınca yay (overshoot) ile geri oturur. Sarmalayıcı (shell) üzerinde
// çalışır: iç karttaki v-tilt inline transform'u ile çakışmaz.
let isPressing = false
let pressReleaseAt = 0
let releaseTimer: number | null = null

function pressStart(e: PointerEvent) {
  if (e.button !== 0) return
  if (store.settings.reduceAnimations) return
  const shell = shellRef.value
  if (!shell) return
  isPressing = true
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
  shell.classList.remove('card-released')
  shell.classList.add('card-squash')
  // Basılı tutarken buton "yetersiz kütle" ile disabled olursa pointerup
  // butona uğramaz; pencere güvenlik ağı gerilmenin takılı kalmasını önler.
  window.addEventListener('pointerup', finishPress)
}

function finishPress() {
  window.removeEventListener('pointerup', finishPress)
  if (!isPressing) return
  isPressing = false
  pressReleaseAt = performance.now()
  const shell = shellRef.value
  if (!shell) return
  shell.classList.add('card-released')
  shell.classList.remove('card-squash')
  if (releaseTimer !== null) clearTimeout(releaseTimer)
  releaseTimer = window.setTimeout(() => {
    shell.classList.remove('card-released')
    releaseTimer = null
  }, CARD_RELEASE_MS + 60)
}

// ---- Push Dynamics: manuel satın almada komşu satırlar 2.5px yana açılır ----
let pushTimer: number | null = null

function onNeighborBuy(e: Event) {
  if (store.settings.reduceAnimations) return
  const detail = (e as CustomEvent<{ tier?: number }>).detail
  if (!detail || typeof detail.tier !== 'number') return
  const dir = pushDirectionFor(props.dimension.tier, detail.tier)
  if (!dir) return
  const shell = shellRef.value
  if (!shell) return
  const cls = dir === 'up' ? 'card-push-up' : 'card-push-down'
  shell.classList.remove('card-push-up', 'card-push-down')
  void shell.offsetWidth // ardışık alımlarda animasyonu yeniden başlat
  shell.classList.add(cls)
  if (pushTimer !== null) clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    shell.classList.remove(cls)
    pushTimer = null
  }, CARD_PUSH_MS + 40)
}

function bounceCard() {
  if (store.settings.reduceAnimations) return
  const el = cardRef.value
  if (!el) return
  el.classList.remove('buy-bounce')
  void el.offsetWidth
  el.classList.add('buy-bounce')
  if (bounceTimer !== null) clearTimeout(bounceTimer)
  bounceTimer = window.setTimeout(() => el.classList.remove('buy-bounce'), 260)
}

interface FormatMeta {
  tier: number
  shortName: string
  subtitle: string
  scale: string
  metric: string
  symbol: string
}

const formatConfigs: Record<number, FormatMeta> = {
  1: {
    tier: 1,
    shortName: 'Moleküler Bağlar',
    subtitle: 'Su damlasındaki kovalent bağları ayrıştırma',
    scale: '10⁻⁹ m',
    metric: 'Nanometre',
    symbol: 'nm'
  },
  2: {
    tier: 2,
    shortName: 'Elektron Orbitalleri',
    subtitle: 'Elektron bulutlarını ve spinleri vakumlama',
    scale: '10⁻¹² m',
    metric: 'Pikometre',
    symbol: 'pm'
  },
  3: {
    tier: 3,
    shortName: 'Nükleer Çekirdek',
    subtitle: 'Proton ve nötronları birbirine bağlayan güçlü nükleer kuvvet',
    scale: '10⁻¹⁵ m',
    metric: 'Femtometre',
    symbol: 'fm'
  },
  4: {
    tier: 4,
    shortName: 'Kuark Çorbası',
    subtitle: 'Renk yükleri, gluonlar ve kuantum dalgalanması',
    scale: '10⁻¹⁸ m',
    metric: 'Attometre',
    symbol: 'am'
  },
  5: {
    tier: 5,
    shortName: 'Laboratuvar & Şehir',
    subtitle: 'Planck Yırtılması: Binalar ve nesneler olay ufkuna çekiliyor',
    scale: '10⁰ m',
    metric: 'Metre',
    symbol: 'm'
  },
  6: {
    tier: 6,
    shortName: 'Gezegenler & Dünya',
    subtitle: 'Ay ve Dünya\'nın kütleçekimsel olay ufkuna kapılışı',
    scale: '10⁷ m',
    metric: 'Megametre',
    symbol: 'Mm'
  },
  7: {
    tier: 7,
    shortName: 'Yıldızlar & Güneş',
    subtitle: 'Güneş sistemleri ve plazma kürelerinin yutuluşu',
    scale: '10⁹ m',
    metric: 'Gigametre',
    symbol: 'Gm'
  },
  8: {
    tier: 8,
    shortName: 'Samanyolu & Karadelik',
    subtitle: 'Süper kütleli galaktik merkez tekillik tabağında',
    scale: '10²¹ m',
    metric: 'Kiloparsek',
    symbol: 'kpc'
  }
}

const tierConfig = computed<FormatMeta>(() => {
  return (
    formatConfigs[props.dimension.tier] || {
      tier: props.dimension.tier,
      shortName: `D${props.dimension.tier} Boyutu`,
      subtitle: 'Kozmik Katman',
      scale: '10ⁿ m',
      metric: 'Bilinmeyen',
      symbol: '?'
    }
  )
})

const formatDiscoverGlow = computed(
  () =>
    store.formatUnlockBuffActive &&
    store.formatUnlockBuffTier === props.dimension.tier
)

const comboRowGlow = computed(() => store.isComboActive)

const milestoneInfo = computed(() => store.getDimensionMilestone(props.dimension.tier))
const partnerInfo = computed(() => store.getPartnerInfo(props.dimension.tier))
const cost = computed(() => store.getDimensionCost(props.dimension.tier))
const multiplier = computed(() => store.getDimensionMultiplier(props.dimension.tier))

// Manuel alım ad bazlı maks: buton, tıklanıldığında alınacak adetlerin TOPLAM fiyatını gösterir.
// getDimensionCost 10 birimlik paketin TOPLAM fiyatıdır (birim fiyat = paket / 10).
// preview null iken (tek birim bile alınamıyor) cost.div(10) birim fiyat göstermek
// yanıltıcıydı: buton o fiyata bile kapalıydı. Bu yüzden gerçek fiyat (paket toplamı) gösterilir.
const preview = computed(() => store.previewDimensionBuy(props.dimension.tier))
const displayCost = computed(() => (preview.value ? preview.value.cost : cost.value))
const canAfford = computed(() => preview.value !== null)

// Paket bölmeleri: mevcut 10'luk kovada kaçıncı adetteyiz (0 - 9 arası)
const packProgress = computed(() => props.dimension.bought % 10)
const affordableUnits = computed(() => (preview.value ? preview.value.units : 0))

// 10'luk paket bu alımla tamamlanıyor mu?
const completesPack = computed(() => packProgress.value + affordableUnits.value >= 10)

const flowRate = computed(() => {
  if (props.dimension.tier === 1) {
    return { suffix: '/s', value: store.matterPerSecond, hint: 'Toplam pasif Kütle çekim akışı' }
  }
  return {
    suffix: `/s →D${props.dimension.tier - 1}`,
    value: store.getDimensionChainFeedPerSecond(props.dimension.tier),
    hint: 'Alt katmana saniyelik besleme'
  }
})

const flowRateFormatted = computed(() => format(flowRate.value.value, 2, store.settings.notation))
const showFlowRate = computed(() => flowRate.value.value.gt(0))

// 20TPS yükü: akış/fiyat metinleri ~4-5Hz anlık değerle beslenir (ham computed mantıkta kalır).
const displayCostText = ref('')
const displayFlowText = ref('')
const displayMultText = ref('')
const displayAmountText = ref('')
let textThrottleInterval: number | null = null

function refreshDisplayText() {
  displayCostText.value = format(displayCost.value, 2, store.settings.notation)
  displayFlowText.value = flowRateFormatted.value
  displayMultText.value = format(multiplier.value, 2, store.settings.notation)
  displayAmountText.value = format(props.dimension.amount, 2, store.settings.notation)
}

onMounted(() => {
  refreshDisplayText()
  textThrottleInterval = window.setInterval(refreshDisplayText, 220)
  window.addEventListener('doomscroll:dimension-buy', onNeighborBuy)
})

onUnmounted(() => {
  if (bounceTimer !== null) {
    clearTimeout(bounceTimer)
    bounceTimer = null
  }
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
  if (pushTimer !== null) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  window.removeEventListener('pointerup', finishPress)
  window.removeEventListener('doomscroll:dimension-buy', onNeighborBuy)
  if (textThrottleInterval !== null) {
    clearInterval(textThrottleInterval)
    textThrottleInterval = null
  }
})

// Tier renk ve stil temaları — ADR-0049 Okunaklı Balatro: D1-D7 nötr,
// yalnızca D8 (tekillik) özel muamele görür. Vurgu tek renkte (mor) toplanır.
const TIER_ACCENT_COLORS: Record<number, { bar: string; badge: string; text: string }> = {
  1: { bar: 'bg-slate-600/60', badge: 'bg-white/[0.04] text-slate-300 border-white/10', text: 'text-slate-400' },
  2: { bar: 'bg-slate-600/60', badge: 'bg-white/[0.04] text-slate-300 border-white/10', text: 'text-slate-400' },
  3: { bar: 'bg-slate-600/60', badge: 'bg-white/[0.04] text-slate-300 border-white/10', text: 'text-slate-400' },
  4: { bar: 'bg-slate-600/60', badge: 'bg-white/[0.04] text-slate-300 border-white/10', text: 'text-slate-400' },
  5: { bar: 'bg-slate-600/60', badge: 'bg-white/[0.04] text-slate-300 border-white/10', text: 'text-slate-400' },
  6: { bar: 'bg-slate-600/60', badge: 'bg-white/[0.04] text-slate-300 border-white/10', text: 'text-slate-400' },
  7: { bar: 'bg-slate-600/60', badge: 'bg-white/[0.04] text-slate-300 border-white/10', text: 'text-slate-400' },
  8: { bar: 'bg-amber-400', badge: 'bg-white/10 text-slate-100 border-white/30', text: 'text-white' }
}

const tierStyle = computed(() => TIER_ACCENT_COLORS[props.dimension.tier] || TIER_ACCENT_COLORS[1])

// Katman kimlik glifi (AD tarzı dizgi karakteri) + accent — durum'dan bağımsız kanal.
const tierGlyph = computed(() => getTierGlyph(props.dimension.tier))
const tierAccentClass = computed(() => getTierAccent(props.dimension.tier))

// Üç durumlu uygunluk rampası (durum ≠ hue): tam=purple parlak, kısmi=sarı, kilit=gri soluk.
// hue kimliği rozet/glif'te kalır; rampa yalnız opaklık/kenarlık/zeminle sinyal verir.
const affordRampClass = computed(() => {
  if (canAfford.value) return ''
  if (packProgress.value > 0) return 'ds-ramp-partial'
  return 'ds-ramp-locked'
})

// Akış yönü: d1 matterPerSecond için basit ↑ (her zaman pozitif akış) — yön oku görsel kanal.
const milestoneEdition = computed(() => {
  const m = milestoneInfo.value.current
  if (!m) return null
  if (m.count >= 500) return 'edition-tag-poly'
  if (m.count >= 100) return 'edition-tag-holo'
  if (m.count >= 50) return 'edition-tag-foil'
  return null
})

function getClickCoordinates(e?: MouseEvent): { x: number; y: number } {
  if (e && (e.clientX || e.clientY)) {
    return { x: e.clientX, y: e.clientY }
  }
  const target = e?.currentTarget as HTMLElement | null
  if (target) {
    const rect = target.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

function purchaseFloaterText(mpsBefore: Decimal, flowBefore: Decimal): string {
  if (props.dimension.tier === 1) {
    const dpsDelta = store.matterPerSecond.minus(mpsBefore)
    if (dpsDelta.gt(0)) {
      return `+${format(dpsDelta, 2, store.settings.notation)}/s`
    }
    return '↑ Hız'
  }
  const flowDelta = store.getDimensionChainFeedPerSecond(props.dimension.tier).minus(flowBefore)
  if (flowDelta.gt(0)) {
    return `+${format(flowDelta, 2, store.settings.notation)}/s →D${props.dimension.tier - 1}`
  }
  return '↑ Akış'
}

function buy(e?: MouseEvent) {
  const coords = getClickCoordinates(e)
  const mpsBefore = props.dimension.tier === 1 ? store.matterPerSecond : D_0
  const flowBefore = props.dimension.tier === 1 ? D_0 : store.getDimensionChainFeedPerSecond(props.dimension.tier)
  const success = store.buyDimensionUnits(props.dimension.tier)
  if (success) {
    // Bas-bırak döngüsü geri bildirimin sahibiyse (taze squash/yay), eski
    // buy-bounce bastırılır — çift hareket yığılması olmaz. Klavye
    // aktivasyonunda damga boş kalır ve bounce çalışır.
    if (!isPressing && !isPressFeedbackFresh(pressReleaseAt, performance.now())) {
      bounceCard()
    }
    // Komşu itme yalnız tek tık alımlarında oynar; hold-spam'de titreşim üretmez.
    if (!isPressing) {
      window.dispatchEvent(
        new CustomEvent('doomscroll:dimension-buy', {
          detail: { tier: props.dimension.tier }
        })
      )
    }
    window.dispatchEvent(
      new CustomEvent('doomscroll:tap', {
        detail: {
          x: coords.x,
          y: coords.y,
          text: purchaseFloaterText(mpsBefore, flowBefore)
        }
      })
    )
  }
}
</script>

<template>
  <!-- .card-physics-shell: Sütun 3 gerilme/itme katmanı — v-tilt ve kaplama iç
       kartta kalır; inline tilt transform'u ile sınıf transform'ları çakışmaz. -->
  <div ref="shellRef" class="card-physics-shell">
    <div
      ref="cardRef"
      v-tilt="{ max: 4, scale: 1.008, disabled: !(store.settings.holoCardsEnabled ?? true) }"
      class="card-tilt-surface glass-panel-card relative pl-3.5 pr-3 py-2.5 rounded-xl flex items-center justify-between gap-3 border border-white/[0.07] hover:border-white/[0.14] transition-all overflow-hidden"
      :class="[
        formatDiscoverGlow ? 'ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : '',
        comboRowGlow ? 'ring-1 ring-amber-400/30' : ''
      ]"
    >
    <!-- Sol Tier Vurgu Çizgisi — alınabilir satır mor yanar, diğerleri sönük -->
    <span class="absolute left-0 top-0 bottom-0 w-1 shrink-0" :class="canAfford ? 'bg-purple-500/80' : 'bg-white/[0.06]'"></span>

    <!-- Sol: Tier Ölçek Rozeti + Başlık + Bilgi -->
    <div class="flex items-center gap-2.5 min-w-0 flex-1">
      <!-- Metrik Planck-Ölçek Rozeti (Minimalist Bilimsel Kare) — AD tarzı dizgi glifi kimlik kanalı -->
      <div
        class="w-10 h-10 rounded-lg border flex flex-col items-center justify-center shrink-0 select-none font-mono"
        :class="tierStyle.badge"
        v-tip="`${tierConfig.metric} ölçeği: ${tierConfig.scale}`"
      >
        <span class="dim-glyph text-sm leading-none" :class="tierAccentClass">{{ tierGlyph }}</span>
        <span class="text-[10px] font-bold opacity-90 leading-tight mt-0.5 whitespace-nowrap">{{ tierConfig.symbol }}</span>
      </div>

      <!-- Başlık ve Meta Bilgileri (alt yazı kaldırıldı — açıklama ismin tooltip'inde) -->
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span
            class="text-xs font-bold text-slate-100 truncate max-w-[130px] sm:max-w-[200px] md:max-w-none cursor-help"
            v-tip="tierConfig.subtitle"
          >
            {{ tierConfig.shortName }}
          </span>

          <!-- Mobilde Sahip Olunan Adet Rozeti -->
          <span class="sm:hidden text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
            ×{{ props.dimension.bought }}
          </span>

          <!-- Milestone / Rozet (Varsa) -->
          <span
            v-if="milestoneInfo.current"
            class="edition-tag shrink-0 cursor-help select-none"
            :class="[milestoneEdition || milestoneInfo.current.colorClass]"
            v-tip="`${milestoneInfo.current.name}: ${milestoneInfo.current.desc}${milestoneInfo.next ? ` (Sıradaki: ${milestoneInfo.next.name} — ${milestoneInfo.next.count} adette)` : ''}`"
          >
            {{ milestoneInfo.current.shortName }}
          </span>

          <!-- Toplam Çarpan (ikincil bilgi — rozet hiyerarşisinde silik) -->
          <span
            class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-slate-500 border border-white/[0.06] tabular-nums shrink-0 cursor-help select-none"
            v-tip="`D${props.dimension.tier} Çarpanı: Toplam ×${displayMultText} kat çekim gücü`"
          >
            ×{{ displayMultText }}
          </span>

          <!-- Sinerji Bağlantısı -->
          <span
            v-if="partnerInfo.partnerBought > 0 && partnerInfo.mult > 1"
            class="hidden lg:inline-flex items-center gap-1 text-[10px] font-sans px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 tabular-nums shrink-0 cursor-help select-none"
            v-tip="`Kuantum Rezonans Bağı: ${partnerInfo.label} (${partnerInfo.partnerBought} adet) bu boyuta ×${partnerInfo.mult.toFixed(2)} çarpan sağlıyor`"
          >
            <Link class="w-2.5 h-2.5 text-cyan-400" />
            <span>D{{ partnerInfo.partnerTier }}: ×{{ partnerInfo.mult.toFixed(2) }}</span>
          </span>
        </div>

      </div>
    </div>

    <!-- Orta: Miktar & Üretim Hızı Telemetrisi (Tablet & Masaüstü) -->
    <div class="hidden sm:flex flex-col items-end gap-0.5 text-xs font-mono tabular-nums shrink-0 min-w-[80px]">
      <div class="flex items-center gap-1.5 text-slate-300">
        <span class="font-bold text-slate-100">{{ displayAmountText }}</span>
        <span class="text-slate-500 text-[11px]">({{ props.dimension.bought }})</span>
      </div>
      <span
        v-if="showFlowRate"
        class="text-[10px] font-medium text-emerald-400/90 inline-flex items-center gap-0.5"
        v-tip="flowRate.hint"
      >
        <span class="text-emerald-300">↑</span>
        +{{ displayFlowText }}{{ flowRate.suffix }}
      </span>
    </div>

    <!-- Sağ: Satın Alma Butonu (Taktil HUD Butonu + İlerleme Göstergesi) -->
    <div class="flex items-center gap-2 shrink-0">
      <button
        @click="buy($event)"
        @pointerdown="pressStart"
        @pointerup="finishPress"
        @pointercancel="finishPress"
        @pointerleave="finishPress"
        v-hold="buy"
        :disabled="!canAfford"
        :aria-label="`D${props.dimension.tier} boyutu satın al`"
        class="btn-tactile hit-44 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all flex flex-col items-end justify-center border shrink-0 relative overflow-hidden min-w-[88px] sm:min-w-[104px]"
        :class="[
          canAfford
            ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-100 border-purple-500/40 cursor-pointer shadow-xs affordance-pulse'
            : `bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed ${affordRampClass}`,
          completesPack && canAfford ? 'ring-1 ring-emerald-400/40' : ''
        ]"
        v-tip="canAfford ? `+${affordableUnits} adet için ${displayCostText} (bu alımla ${packProgress + affordableUnits} adet olur)` : 'Yetersiz Kütle'"
      >
        <div class="flex items-center gap-1 leading-none z-10">
          <span class="tabular-nums font-bold text-xs">{{ displayCostText }}</span>
        </div>

        <div class="flex items-center gap-1 text-[10px] font-sans leading-none mt-1 z-10 tabular-nums">
          <span :class="canAfford ? 'text-purple-300/80' : 'text-slate-500'">{{ packProgress }}/10</span>
          <span v-if="canAfford && affordableUnits > 0" class="text-emerald-400 font-bold">
            (+{{ affordableUnits }})
          </span>
        </div>

        <!-- İnce Alt Paket İlerleme Çubuğu -->
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40 pointer-events-none">
          <div
            class="h-full bg-purple-400/80 transition-all duration-150"
            :style="{ width: `${(packProgress / 10) * 100}%` }"
          ></div>
        </div>
      </button>
      </div>
    </div>
  </div>
</template>
