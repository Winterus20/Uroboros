import { describe, expect, it } from 'vitest'
import { useGameStore } from './game'
import { D_0, D_1, Decimal } from '../core/math'

/**
 * ADR-0052 — Ölçek Sıçrama Motoru (store orkestrasyonu) testleri.
 *
 * Üç garanti:
 *  (a) sayaç işlemleri doğru (shift artırır + galaksiyi korur, galaxy shift'i
 *      sıfırlar, singularity her şeyi sıfırlar + SP verir),
 *  (b) her sıçrama jumpLog'a işlenir,
 *  (c) döküm çarpımları (breakdown) sıcak-yol çarpanlarıyla birebir eşittir.
 */

function richStore() {
  const store = useGameStore()
  for (const d of store.dimensions) {
    d.amount = new Decimal('1e30')
    d.bought = 35
  }
  store.tickspeedBought = 5
  // ADR-0076: Ölçek Sıçraması D8 çağı mekaniğidir — D8'in açık olması gerekir.
  store.lifetimeMaxDimensionTier = 7
  return store
}

function product(parts: Array<{ mult: Decimal }>): Decimal {
  return parts.reduce((acc, p) => acc.times(p.mult), D_1)
}

describe('ADR-0052 sıçrama sayaçları ve kapsamları', () => {
  it('shift: sayacı artırır, galaksiyi korur, koşuyu sıfırlar, günlüğe yazar', () => {
    const store = richStore()
    store.galaxies = 2

    expect(store.dimensionShift(false)).toBe(true)

    expect(store.dimensionShifts).toBe(1)
    expect(store.galaxies).toBe(2)
    expect(store.matter.eq(store.startingMatter)).toBe(true)
    expect(store.dimensions.every((d) => d.amount.eq(0) && d.bought === 0)).toBe(true)
    expect(store.tickspeedBought).toBe(0)
    expect(store.jumpLog[0].layer).toBe('shift')
    expect(store.jumpLog[0].shifts).toBe(1)
    expect(store.jumpLog[0].galaxies).toBe(2)
  })

  it('shift: gereksinim yoksa reddeder ve günlüğe yazmaz', () => {
    const store = useGameStore()
    expect(store.dimensionShift(false)).toBe(false)
    expect(store.jumpLog.length).toBe(0)
    expect(store.dimensionShifts).toBe(0)
  })

  it('galaxy: galaksiyi artırır, shift sayacını sıfırlar', () => {
    const store = richStore()
    store.dimensionShifts = 6

    expect(store.buyGalaxy(false)).toBe(true)

    expect(store.galaxies).toBe(1)
    expect(store.dimensionShifts).toBe(0)
    expect(store.matter.eq(store.startingMatter)).toBe(true)
    expect(store.jumpLog[0].layer).toBe('galaxy')
    expect(store.jumpLog[0].galaxies).toBe(1)
  })

  it('singularity: SP verir, sayaçları sıfırlar, kalıcıları korur', () => {
    const store = richStore()
    store.matter = new Decimal('1.8e308')
    store.dimensionShifts = 3
    store.galaxies = 1
    store.neuralBots = new Decimal(100)
    store.napCount = 3

    expect(store.singularityReset(false)).toBe(true)

    expect(store.singularities).toBe(1)
    expect(store.singularityPoints.eq(1)).toBe(true)
    expect(store.dimensionShifts).toBe(0)
    expect(store.galaxies).toBe(0)
    expect(store.matter.eq(store.startingMatter)).toBe(true)
    expect(store.neuralBots.eq(100)).toBe(true)
    expect(store.napCount).toBe(3)
    expect(store.jumpLog[0].layer).toBe('singularity')
    expect(store.jumpLog[0].spGained.eq(1)).toBe(true)
  })

  it('resetRunState: SP/sayaç kalıcılarını korur, koşu alanlarını sıfırlar', () => {
    const store = richStore()
    store.singularities = 2
    store.singularityPoints = new Decimal(10)
    store.decadeSurgeMult = 2

    store.resetRunState()

    expect(store.singularities).toBe(2)
    expect(store.singularityPoints.eq(10)).toBe(true)
    expect(store.dimensionShifts).toBe(0)
    expect(store.galaxies).toBe(0)
    expect(store.decadeSurgeMult).toBe(1)
    expect(store.matter.eq(store.startingMatter)).toBe(true)
  })

  it('jumpLog: 100 kayıtta kapaklanır', () => {
    const store = useGameStore()
    for (let i = 0; i < 105; i++) {
      store.snapshotJump('shift', D_0)
    }
    expect(store.jumpLog.length).toBe(100)
    expect(store.jumpLog[0].id).toBe(105)
  })
})

describe('ADR-0052 çarpan döküm paritesi', () => {
  it('getDimensionBreakdown çarpımı getDimensionMultiplier ile birebir (tier 1-8)', () => {
    const store = richStore()
    store.dimensionShifts = 2
    for (let tier = 1; tier <= 8; tier++) {
      const expected = store.getDimensionMultiplier(tier)
      const actual = product(store.getDimensionBreakdown(tier))
      expect(actual.eq(expected)).toBe(true)
    }
  })

  it('matterProductionBreakdown çarpımı matterPerSecond ile birebir', () => {
    const store = richStore()
    store.dimensionShifts = 2
    const expected = store.matterPerSecond
    const actual = product(store.matterProductionBreakdown)
    expect(actual.eq(expected)).toBe(true)
  })

  it('dökümler boş değildir ve kaynak etiketleri tektir', () => {
    const store = richStore()
    const parts = store.matterProductionBreakdown
    expect(parts.length).toBeGreaterThan(5)
    const sources = parts.map((p) => p.source)
    expect(new Set(sources).size).toBe(sources.length)
    const dimParts = store.getDimensionBreakdown(1)
    expect(dimParts.length).toBeGreaterThan(2)
  })
})
