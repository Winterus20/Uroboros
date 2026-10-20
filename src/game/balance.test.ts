import { describe, expect, it } from 'vitest'
import { Decimal } from '../core/math'
import {
  BASE_UNLOCKED_DIMENSIONS,
  DIMENSION_UNLOCK_PURCHASE_COUNT,
  LEGACY_DIMENSION_UNLOCK_GATES,
  MAX_DIMENSIONS,
  dimensionUnlockCountFromPurchases,
  legacyDimensionGateUnlockCount,
  legacyLifetimeMaxDimensionTier,
  lifetimeMaxDimensionTierFromBought,
  resolvedUnlockedDimensionCount
} from './balance'

/**
 * ADR-0076 — Boyut açılışı SATIN ALMA tabanlı; Ölçek Sıçraması D8 çağı.
 *
 * Sözleşme:
 *  - Bir boyuttan 1 paket (DIMENSION_UNLOCK_PURCHASE_COUNT = 10 adet) satın
 *    alındığında bir sonraki boyut AÇILIR (klasik AD düzeni).
 *  - Açılış KALICIDIR: kaynak `lifetimeMaxDimensionTier` (hayat boyu satın
 *    alınmış en yüksek tier) koşu sıfırlamalarından etkilenmez.
 *  - D1–D3 taban olarak hep açıktır (BASE_UNLOCKED_DIMENSIONS = 3).
 *  - `dimensionCapFloor` (save v12 legacy taban) ve `challengeDimensionCap`
 *    (C7) davranışı korunur.
 *  - Kütle kapıları (LEGACY_DIMENSION_UNLOCK_GATES) artık YALNIZ kayıt göçünde
 *    kullanılır: eski oyuncunun açık boyutu yeni modelde düşmez.
 */

const BASE_STATE = {
  dimensionCapFloor: BASE_UNLOCKED_DIMENSIONS,
  activeChallenge: null
} as const

function unlocked(
  tier: number,
  overrides: { dimensionCapFloor?: number; activeChallenge?: string | null } = {}
): number {
  return resolvedUnlockedDimensionCount({
    ...BASE_STATE,
    lifetimeMaxDimensionTier: tier,
    ...overrides
  })
}

describe('ADR-0076 boyut açılışı: satın alma tabanlı (saf fonksiyon)', () => {
  it('paket eşiği bir tam pakettir (10 adet) ve taban 3 boyuttur', () => {
    expect(DIMENSION_UNLOCK_PURCHASE_COUNT).toBe(10)
    expect(BASE_UNLOCKED_DIMENSIONS).toBe(3)
    expect(MAX_DIMENSIONS).toBe(8)
  })

  it('hiç satın alınmadıysa taban 3 boyut açıktır', () => {
    expect(dimensionUnlockCountFromPurchases(0)).toBe(BASE_UNLOCKED_DIMENSIONS)
    expect(unlocked(0)).toBe(BASE_UNLOCKED_DIMENSIONS)
  })

  it('D1–D2 satın alımı tabanı aşmaz (zaten açıklar)', () => {
    expect(dimensionUnlockCountFromPurchases(1)).toBe(3)
    expect(dimensionUnlockCountFromPurchases(2)).toBe(3)
  })

  it('D3 satın alımı D4 ü açar, D4 alımı D5 i açar (klasik AD zinciri)', () => {
    expect(dimensionUnlockCountFromPurchases(3)).toBe(4)
    expect(dimensionUnlockCountFromPurchases(4)).toBe(5)
    expect(dimensionUnlockCountFromPurchases(5)).toBe(6)
    expect(dimensionUnlockCountFromPurchases(6)).toBe(7)
    expect(dimensionUnlockCountFromPurchases(7)).toBe(8)
  })

  it('D8 en üst sınırdır: 8 alınsa da 9 boyut açılmaz', () => {
    expect(dimensionUnlockCountFromPurchases(8)).toBe(MAX_DIMENSIONS)
    expect(dimensionUnlockCountFromPurchases(99)).toBe(MAX_DIMENSIONS)
  })

  it('geçersiz girdi güvenli tarafta taban 3 e düşer', () => {
    expect(dimensionUnlockCountFromPurchases(Number.NaN)).toBe(BASE_UNLOCKED_DIMENSIONS)
    expect(dimensionUnlockCountFromPurchases(Number.POSITIVE_INFINITY)).toBe(BASE_UNLOCKED_DIMENSIONS)
    expect(dimensionUnlockCountFromPurchases(-5)).toBe(BASE_UNLOCKED_DIMENSIONS)
  })

  it('satın alınmış boyutlardan en yüksek tier türetilir (paket eşiği)', () => {
    const dims = Array.from({ length: 8 }, () => ({ bought: 0 }))
    expect(lifetimeMaxDimensionTierFromBought(dims)).toBe(0)
    dims[2].bought = DIMENSION_UNLOCK_PURCHASE_COUNT
    expect(lifetimeMaxDimensionTierFromBought(dims)).toBe(3)
    dims[2].bought = DIMENSION_UNLOCK_PURCHASE_COUNT - 1
    expect(lifetimeMaxDimensionTierFromBought(dims)).toBe(0)
    dims[6].bought = 42
    expect(lifetimeMaxDimensionTierFromBought(dims)).toBe(7)
  })

  it('dimensionCapFloor legacy tabanı korunur ve satın alma tabanını aşabilir', () => {
    expect(unlocked(0, { dimensionCapFloor: 5 })).toBe(5)
    expect(unlocked(0, { dimensionCapFloor: 8 })).toBe(8)
    expect(unlocked(7, { dimensionCapFloor: 4 })).toBe(8)
  })

  it('challengeDimensionCap (C7 = 6) kirpmasi korunur', () => {
    expect(unlocked(7, { activeChallenge: 'c7' })).toBe(6)
    expect(unlocked(3, { activeChallenge: 'c7' })).toBe(4)
    expect(unlocked(7, { activeChallenge: 'c1' })).toBe(8)
  })
})

describe('ADR-0076 kayit gocu: legacy kitle kapilari', () => {
  it('legacy kapi tablosu D4-D8 kapsar ve esikler artan sirada', () => {
    const tiers = LEGACY_DIMENSION_UNLOCK_GATES.map((gate) => gate.tier)
    expect(tiers).toEqual([4, 5, 6, 7, 8])
    let previous = new Decimal(0)
    for (const gate of LEGACY_DIMENSION_UNLOCK_GATES) {
      const value = new Decimal(gate.minMatter)
      expect(value.gt(previous)).toBe(true)
      previous = value
    }
  })

  it('legacy kapi sayisi tepe kulleye gore monoton artar', () => {
    expect(legacyDimensionGateUnlockCount(new Decimal(10))).toBe(0)
    expect(legacyDimensionGateUnlockCount(new Decimal('1e8'))).toBe(1)
    expect(legacyDimensionGateUnlockCount(new Decimal('1e65'))).toBe(5)
    expect(legacyDimensionGateUnlockCount(undefined)).toBe(0)
    expect(legacyDimensionGateUnlockCount(new Decimal(Number.NaN))).toBe(0)
  })

  it('legacy acilis, yeni modelde ayni boyut sayisini korur (oyuncu kaybetmez)', () => {
    expect(legacyLifetimeMaxDimensionTier(new Decimal(10))).toBe(2)
    const lowTier = legacyLifetimeMaxDimensionTier(new Decimal(10))
    expect(dimensionUnlockCountFromPurchases(lowTier)).toBe(3)
    expect(legacyLifetimeMaxDimensionTier(new Decimal('1e65'))).toBe(7)
    const highTier = legacyLifetimeMaxDimensionTier(new Decimal('1e65'))
    expect(dimensionUnlockCountFromPurchases(highTier)).toBe(8)
  })
})
