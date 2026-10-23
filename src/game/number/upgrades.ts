import { Decimal, D } from '../../core/math'
import type { NumberState } from './economy'

/**
 * `Tanım` yükseltmeleri (K2) — prestijin harcama yeri.
 *
 * Tasarım ölçütü: ilk prestij ödülü ~0,30 Tanım (kapıda A=1 → log10(2)),
 * Birikim ile 10× aşımda ~1,04. Yani ilk yükseltme 1 Tanım'ın altında olmalı ki
 * oyuncu ilk prestijde bir şey satın alabilsin.
 */
export type UpgradeId = 'start' | 'chain' | 'boost' | 'autobuy'

export interface UpgradeDef {
  readonly id: UpgradeId
  /** UI adı (İngilizce, P3). */
  readonly name: string
  readonly maxLevel: number
  /** Sıradaki seviyenin maliyeti (level = mevcut seviye). */
  cost(level: number): Decimal
  /** Mevcut seviyenin etkisini tek satırda anlatır (tooltip DEĞİL — sayısal etiket). */
  describe(level: number): string
}

/** Otomasyon aralıkları (sn) — seviye 0 = kapalı. */
export const AUTOBUY_INTERVALS = [0, 5, 2, 1] as const

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'start',
    name: 'Start higher',
    maxLevel: 6,
    cost: (level) => D(0.5).times(new Decimal(2).pow(level)),
    describe: (level) => 'Start at ' + startNumberFor(level).toString()
  },
  {
    id: 'chain',
    name: 'Chain output',
    maxLevel: 10,
    cost: (level) => D(1).times(new Decimal(1.8).pow(level)),
    describe: (level) => 'x' + (1 + 0.25 * level).toFixed(2) + ' chain production'
  },
  {
    id: 'boost',
    name: 'Deeper breath',
    maxLevel: 10,
    cost: (level) => D(1.5).times(new Decimal(2.2).pow(level)),
    describe: (level) => 'boost exponent ' + boostExponentFor(level).toFixed(2)
  },
  {
    id: 'autobuy',
    name: 'Idle hands',
    maxLevel: 3,
    cost: (level) => D(2).times(new Decimal(5).pow(level)),
    describe: (level) => {
      const interval = AUTOBUY_INTERVALS[level] ?? 0
      return interval > 0 ? 'buys every ' + interval + 's' : 'off'
    }
  }
] as const

export function emptyUpgrades(): Record<UpgradeId, number> {
  return { start: 0, chain: 0, boost: 0, autobuy: 0 }
}

export function upgradeDef(id: UpgradeId): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id)
  if (!def) throw new Error('Bilinmeyen yükseltme: ' + id)
  return def
}

/** Sıradaki seviyenin maliyeti; maksimumdaysa null. */
export function upgradeCost(id: UpgradeId, level: number): Decimal | null {
  const def = upgradeDef(id)
  if (level >= def.maxLevel) return null
  return def.cost(level)
}

/** Başlangıç sayısı: 10 → 100 → 1e3 … → 1e7 (seviye 0..6). */
export function startNumberFor(level: number): Decimal {
  return new Decimal(10).pow(Math.min(7, 1 + Math.max(0, level)))
}

/** Zincir üretim çarpanı: 1,00 → 3,50 (seviye 0..10). */
export function chainMultiplierFor(level: number): Decimal {
  return D(1 + 0.25 * Math.max(0, level))
}

/** Boost üssü: 0,20 → 0,40 (seviye 0..10). */
export function boostExponentFor(level: number): number {
  return 0.2 + 0.02 * Math.max(0, level)
}

export function autobuyIntervalFor(level: number): number {
  return AUTOBUY_INTERVALS[Math.min(Math.max(0, level), AUTOBUY_INTERVALS.length - 1)]
}

/** Yükseltme seviyelerini türetilmiş alanlara uygular (deserialize/prestij sonrası). */
export function applyUpgradeLevels(state: NumberState, upgrades: Record<UpgradeId, number>): void {
  state.startNumber = startNumberFor(upgrades.start)
  state.chainMult = chainMultiplierFor(upgrades.chain)
  state.boostExp = boostExponentFor(upgrades.boost)
}
