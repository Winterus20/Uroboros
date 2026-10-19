import { describe, expect, it } from 'vitest'
import { Decimal } from '../core/math'
import {
  BASE_COSTS,
  BASE_UNLOCKED_DIMENSIONS,
  DIMENSION_UNLOCK_GATES,
  dimensionGateUnlockCount,
  resolvedUnlockedDimensionCount
} from './balance'

/**
 * ADR-0072 — Boyut açılımları sıçramadan koparıldı.
 *
 * Sözleşme:
 *  - D4–D8 açılışı `DIMENSION_UNLOCK_GATES` tablosundaki deterministik kütle
 *    eşiklerine bağlıdır; sıçrama sayacı (`dimensionShifts` / `lifetimePeakShifts`)
 *    açılışa ETKİ ETMEZ.
 *  - `lifetimePeakMatter` monotonik olduğu için (ADR-0035) bir kez açılan boyut
 *    geri kilitlenmez; bu yüzden yeni kayıt alanı gerekmez.
 *  - `dimensionCapFloor` (save v12 legacy taban) ve `challengeDimensionCap` (C7)
 *    davranışı korunur.
 *  - Eşikler PROVISIONAL; testler değeri değil TÜRETME KURALINI kilitler
 *    (eşik = taban fiyatın 100 katı), böylece P0 kilitlemesi testi kırmaz.
 */

const BASE_STATE = {
  dimensionCapFloor: BASE_UNLOCKED_DIMENSIONS,
  activeChallenge: null
} as const

function gateCap(peak?: Decimal): number {
  return resolvedUnlockedDimensionCount({ ...BASE_STATE, lifetimePeakMatter: peak })
}

/** Her kapının hemen altındaki temsilî tepe kütle (aynı basamak, eşiğin altı). */
const BELOW_GATE: Record<number, string> = {
  4: '9.99e7',
  5: '9.99e10',
  6: '9.99e14',
  7: '9.99e19',
  8: '9.99e25'
}

describe('ADR-0072 boyut açılış kapıları (saf fonksiyon)', () => {
  it("kapı tablosu D4–D8'i kapsar ve her eşik taban fiyatın 100 katıdır", () => {
    expect(DIMENSION_UNLOCK_GATES.map((g) => g.tier)).toEqual([4, 5, 6, 7, 8])
    for (const gate of DIMENSION_UNLOCK_GATES) {
      const expected = BASE_COSTS[gate.tier - 1].times(100)
      expect(new Decimal(gate.minMatter).eq(expected)).toBe(true)
    }
  })

  it('tepe kütle yokken taban 3 boyut açıktır', () => {
    expect(gateCap(undefined)).toBe(BASE_UNLOCKED_DIMENSIONS)
    expect(gateCap(new Decimal(10))).toBe(BASE_UNLOCKED_DIMENSIONS)
  })

  for (const gate of DIMENSION_UNLOCK_GATES) {
    it(`D${gate.tier}: eşiğin altında kilitli, eşiğe ulaşınca açık`, () => {
      expect(gateCap(new Decimal(BELOW_GATE[gate.tier]))).toBe(gate.tier - 1)
      expect(gateCap(new Decimal(gate.minMatter))).toBe(gate.tier)
    })
  }

  it('tepe kütle monoton artarken açık boyut sayısı asla azalmaz', () => {
    const peaks = ['1e7', '1e8', '1e9', '1e10', '1e11', '1e14', '1e15', '1e19', '1e20', '1e25', '1e26', '1e100']
    let previous = 0
    for (const peak of peaks) {
      const current = gateCap(new Decimal(peak))
      expect(current).toBeGreaterThanOrEqual(previous)
      previous = current
    }
    expect(previous).toBe(8)
  })

  it('dimensionCapFloor legacy tabanı korunur ve kapı tavanını aşabilir', () => {
    const peak = new Decimal(10)
    expect(
      resolvedUnlockedDimensionCount({ dimensionCapFloor: 5, activeChallenge: null, lifetimePeakMatter: peak })
    ).toBe(5)
    expect(
      resolvedUnlockedDimensionCount({ dimensionCapFloor: 8, activeChallenge: null, lifetimePeakMatter: peak })
    ).toBe(8)
    // Kapı daha ileriye götürürse taban KISITLAMAZ (max).
    expect(
      resolvedUnlockedDimensionCount({
        dimensionCapFloor: 4,
        activeChallenge: null,
        lifetimePeakMatter: new Decimal('1e26')
      })
    ).toBe(8)
  })

  it('challengeDimensionCap (C7 = 6) kirpmasi korunur', () => {
    const peak = new Decimal('1e30')
    expect(
      resolvedUnlockedDimensionCount({ dimensionCapFloor: 8, activeChallenge: 'c7', lifetimePeakMatter: peak })
    ).toBe(6)
    // Taban zaten cap altındaysa min() onu YÜKSELTMEZ (cap yalnız kırpar).
    expect(
      resolvedUnlockedDimensionCount({
        dimensionCapFloor: 4,
        activeChallenge: 'c7',
        lifetimePeakMatter: new Decimal(10)
      })
    ).toBe(4)
    // maxDimensions tanımlamayan challenge cap uygulamaz.
    expect(
      resolvedUnlockedDimensionCount({ dimensionCapFloor: 8, activeChallenge: 'c1', lifetimePeakMatter: peak })
    ).toBe(8)
  })

  it('NaN/geçersiz tepe kütlede güvenli davranır: 0 kapı, taban 3', () => {
    const bad = new Decimal(Number.NaN)
    expect(dimensionGateUnlockCount(bad)).toBe(0)
    expect(gateCap(bad)).toBe(BASE_UNLOCKED_DIMENSIONS)
    expect(dimensionGateUnlockCount(undefined)).toBe(0)
  })
})
