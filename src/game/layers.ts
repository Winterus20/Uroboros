import { D_0, D_1, type Decimal } from '../core/math'
import { createIdleTimeClock } from './clock-data'
import type { TimeClockState } from '../models/clock'
import type { NeuralNode, ScaleJumpRecord } from '../models/types'

/**
 * Ölçek Sıçrama Katmanları (ADR-0052) — framework'süz saf oyun verisi.
 *
 * Shift / Galaxy / Singularity eskiden üç ayrı el-yazması gövdeydi; gereksinim,
 * sıfırlama kapsamı ve etki üç ayrı yerde elle senkron tutuluyordu. Burada her
 * katman TEK şablonla tanımlanır; store yalnızca şablonu çalıştırır (orkestrasyon),
 * yan etkiler (ses/konfeti/olay) store'da kalır.
 *
 * Kural: bu dosyadaki hiçbir fonksiyon Pinia'ya, `window`'a veya sese dokunmaz.
 * Eski davranış birebir korunur; kapsam testleri `layers.test.ts`'tedir.
 */

export type ScaleLayerId = ScaleJumpRecord['layer']

export const JUMP_LOG_CAP = 100

export type ResetCounter = 'dimensionShifts' | 'galaxies'

/**
 * Sıfırlama kapsamı — hangi katmanın neleri sıfırladığının TEK kaynağı.
 * Yeni katman eklemek = buraya bir kapsam satırı (davranış kodu yok).
 */
export interface ResetScope {
  /** Sıfıra indirilecek sayaçlar (artırma değil — artırma action'da olur). */
  zeroCounters: ResetCounter[]
  resetMatter: boolean
  resetDimensions: boolean
  resetTickspeed: boolean
  resetOptimizerSamples: boolean
  /** Vicdan azapları + önbellek temizleme (yalnızca derin sıfırlama). */
  clearPrestigeEphemerals: boolean
  /** Buff/anomali/debuff/viral + Dekad Yükselişi (yalnızca koşu sıfırlama). */
  clearRunFx: boolean
  /** Hariç-seçim nöral düğümlerini iade et (yalnızca koşu sıfırlama). */
  refundChoiceNodes: boolean
}

/** Motorun dokunduğu en küçük store yüzeyi (sahte nesneyle test edilebilir). */
export interface ScaleJumpHost {
  startingMatter: Decimal
  matter: Decimal
  dimensions: Array<{ amount: Decimal; bought: number }>
  tickspeedBought: number
  /**
   * M1 — Otonom Hız Çipi seviyesi (koşu içi). tickspeedBought ile AYNI kancada
   * sıfırlanır; isteğe bağlıdır çünkü sahte host'lar (layers.test.ts) alanı taşımaz.
   */
  speedChipLevel?: number
  dimensionShifts: number
  galaxies: number
  slackers: unknown[]
  sacrificeCount: number
  sacrificeMultiplier: Decimal
  activeBuffs: unknown[]
  floatingAnomalies: unknown[]
  anomalyTimer: number
  crisisBackfireDebuff: number
  isViralActive: boolean
  viralTimeRemaining: number
  viralViews: number
  decadeSurgeMult: number
  /** Zaman Yayı (Time Clock) canlı durumu — koşu sıfırlamasında `idle`'a döner. */
  timeClock: TimeClockState
  clockTimer: number
  neuralNodesBought: Record<string, number>
  singularityPoints: Decimal
  singularityBotSamples: unknown[]
  singularityDecelStreak: number
  singularityRunSeconds: number
  singularitySampleAcc: number
  jumpLog: ScaleJumpRecord[]
}

export interface ScaleLayerFx {
  sound: 'shift' | 'galaxy' | 'singularity'
  confetti: {
    particleCount: number
    spread: number
    originY: number
    colors: string[]
  }
  /** Doomscroll makro dalga tipi; null = dalga yok (tekillik). */
  surgeType: 'shift' | 'galaxy' | null
}

export interface ScaleLayerSpec {
  id: ScaleLayerId
  /** Küçükten büyüğe: shift 0, galaxy 1, singularity 2. */
  order: number
  scope: ResetScope
  fx: ScaleLayerFx
}

const RUN_RESET = {
  resetMatter: true,
  resetDimensions: true,
  resetTickspeed: true,
  resetOptimizerSamples: true
} as const

export const SCALE_LAYERS: Record<ScaleLayerId, ScaleLayerSpec> = {
  shift: {
    id: 'shift',
    order: 0,
    scope: {
      ...RUN_RESET,
      zeroCounters: [],
      clearPrestigeEphemerals: false,
      clearRunFx: false,
      refundChoiceNodes: false
    },
    fx: {
      sound: 'shift',
      confetti: {
        particleCount: 50,
        spread: 70,
        originY: 0.8,
        colors: ['#a855f7', '#ec4899', '#06b6d4']
      },
      surgeType: 'shift'
    }
  },
  galaxy: {
    id: 'galaxy',
    order: 1,
    scope: {
      ...RUN_RESET,
      zeroCounters: ['dimensionShifts'],
      clearPrestigeEphemerals: false,
      clearRunFx: false,
      refundChoiceNodes: false
    },
    fx: {
      sound: 'galaxy',
      confetti: {
        particleCount: 90,
        spread: 100,
        originY: 0.8,
        colors: ['#38bdf8', '#818cf8', '#c084fc']
      },
      surgeType: 'galaxy'
    }
  },
  singularity: {
    id: 'singularity',
    order: 2,
    scope: {
      ...RUN_RESET,
      zeroCounters: ['dimensionShifts', 'galaxies'],
      clearPrestigeEphemerals: true,
      clearRunFx: true,
      refundChoiceNodes: true
    },
    fx: {
      sound: 'singularity',
      confetti: {
        particleCount: 180,
        spread: 120,
        originY: 0.5,
        colors: ['#f59e0b', '#06b6d4', '#ec4899', '#ffffff']
      },
      surgeType: null
    }
  }
}

export const SCALE_LAYER_ORDER: ScaleLayerId[] = ['shift', 'galaxy', 'singularity']

/**
 * Düğümün belirtilen seviyedeki satın alma maliyetini hesaplar (indirim dahil).
 */
export function getNeuralNodeCost(
  node: NeuralNode,
  level: number,
  discount: number = 1
): number {
  return Math.max(1, Math.floor(node.cost * Math.pow(node.costMult ?? 1, level) * discount))
}

/** Kapsamı porta uygula (saf durum mutasyonu; orkestrasyon store'dadır). */
export function applyResetScope(
  host: ScaleJumpHost & { achievementSpDiscount?: number },
  scope: ResetScope,
  neuralTree: NeuralNode[],
  spCostDiscount?: number
): void {
  for (const counter of scope.zeroCounters) {
    host[counter] = 0
  }
  if (scope.resetMatter) host.matter = host.startingMatter
  if (scope.resetDimensions) {
    for (const d of host.dimensions) {
      d.amount = D_0
      d.bought = 0
    }
  }
  if (scope.resetTickspeed) {
    host.tickspeedBought = 0
    // M1 — Otonom Hız Çipi koşu içidir: tickspeed ile aynı anda sıfırlanır
    // (shift / galaxy / singularity — yani tickspeedBought'ın sıfırlandığı her kanca).
    if (host.speedChipLevel !== undefined) host.speedChipLevel = 0
  }
  if (scope.resetOptimizerSamples) {
    host.singularityBotSamples = []
    host.singularityDecelStreak = 0
    host.singularityRunSeconds = 0
    host.singularitySampleAcc = 0
  }
  if (scope.clearPrestigeEphemerals) {
    host.slackers = []
    host.sacrificeCount = 0
    host.sacrificeMultiplier = D_1
    // Not: neuralBots / napCount / napMultiplier KALICI — prestijden sağ çıkar.
  }
  if (scope.clearRunFx) {
    host.activeBuffs = []
    host.floatingAnomalies = []
    host.anomalyTimer = 0
    host.crisisBackfireDebuff = 0
    host.isViralActive = false
    host.viralTimeRemaining = 0
    host.viralViews = 0
    // ADR-0034: Dekad Yükselişi koşuya özeldir.
    host.decadeSurgeMult = 1
    // Zaman Yayı koşuya özeldir: yarıda kalmış sarma/salgı yeni koşuya taşınmaz.
    // Burada yalnızca CANLI FAZ ve zamanlayıcı temizlenir; yaşam boyu istatistikler
    // (`stats.clockRewinds` / `clockRewoundSeconds` / `clockBestTension`) `stats`
    // altında yaşadığı için bu bloktan etkilenmez ve prestijden sağ çıkar.
    host.timeClock = createIdleTimeClock()
    host.clockTimer = 0
  }
  if (scope.refundChoiceNodes) {
    const choiceIds = new Set(
      neuralTree.filter((n) => n.choiceGroup).map((n) => n.id)
    )
    const discount = spCostDiscount ?? (host as { achievementSpDiscount?: number }).achievementSpDiscount ?? 1
    const remaining: Record<string, number> = {}
    let refunded = 0
    for (const [nodeId, lvl] of Object.entries(host.neuralNodesBought || {})) {
      if (choiceIds.has(nodeId) && lvl > 0) {
        const node = neuralTree.find((n) => n.id === nodeId)
        if (node) {
          for (let i = 0; i < lvl; i++) {
            refunded += getNeuralNodeCost(node, i, discount)
          }
        }
      } else {
        remaining[nodeId] = lvl
      }
    }
    host.neuralNodesBought = remaining
    if (refunded > 0) {
      host.singularityPoints = host.singularityPoints.plus(refunded)
    }
  }
}

export interface JumpSnapshot {
  runSeconds: number
  peakLogMatter: number
  shifts: number
  galaxies: number
  singularities: number
  spGained: Decimal
}

/** Sıçramayı günlüğe işle (en yeni başa; kapak aşılınca eskiler düşer). */
export function recordJump(
  host: ScaleJumpHost,
  layer: ScaleLayerId,
  snapshot: JumpSnapshot,
  now: number = Date.now()
): ScaleJumpRecord {
  const record: ScaleJumpRecord = {
    id: (host.jumpLog[0]?.id ?? 0) + 1,
    layer,
    timestamp: now,
    runSeconds: snapshot.runSeconds,
    peakLogMatter: snapshot.peakLogMatter,
    shifts: snapshot.shifts,
    galaxies: snapshot.galaxies,
    singularities: snapshot.singularities,
    spGained: snapshot.spGained
  }
  host.jumpLog.unshift(record)
  if (host.jumpLog.length > JUMP_LOG_CAP) host.jumpLog.length = JUMP_LOG_CAP
  return record
}
