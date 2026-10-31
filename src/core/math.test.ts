import { describe, expect, it } from 'vitest'

import { D, D_0, D_1, D_10, D_2, D_INFINITY, Decimal } from './math'

/**
 * Sayı motoru sözleşmesi (`src/core/math.ts`).
 *
 * AGENTS.md'nin en çok vurgulanan kuralı burada kilitlenir:
 * `break_eternity.js` içinde `isNaN` YOKTUR, küçük harfli `isNan()` vardır.
 * Bu dosya hem sarmalayıcıyı hem de kuralın kendisini pinler — kütüphane
 * güncellenip API değişirse ilk kırılan test burası olur.
 */
describe('sayı motoru sözleşmesi', () => {
  it('Decimal, break_eternity sürümüdür ve isNan (küçük n) sunar', () => {
    const d = new Decimal(10)
    expect(typeof d.isNan).toBe('function')
    expect((d as unknown as Record<string, unknown>).isNaN).toBeUndefined()
    expect(d.isNan()).toBe(false)
  })

  it('NaN Decimal, isNan + isNaN(mag) çift kontrolüyle yakalanır', () => {
    const nan = new Decimal(Number.NaN)
    expect(nan.isNan() || Number.isNaN(nan.mag)).toBe(true)
  })

  it('D() bozuk girdiyi istisna yerine D_0 yapar (kayıt göçü güvenliği)', () => {
    expect(D('bozuk-girdi').eq(0)).toBe(true)
    expect(D(Number.NaN).eq(0)).toBe(true)
    expect(D(new Decimal('1e30')).eq('1e30')).toBe(true)
  })

  it('D() Decimal örneğini aynen geçirir (kopya maliyeti yok)', () => {
    const d = new Decimal(42)
    expect(D(d)).toBe(d)
  })

  it('paylaşılan sabitler doğru değerleri taşır ve dondurulmuştur', () => {
    expect(D_0.eq(0)).toBe(true)
    expect(D_1.eq(1)).toBe(true)
    expect(D_2.eq(2)).toBe(true)
    expect(D_10.eq(10)).toBe(true)
    expect(Object.isFrozen(D_0)).toBe(true)
    expect(Object.isFrozen(D_1)).toBe(true)
  })

  it('D_INFINITY JS float sınırıdır (1.7976931348623157e308)', () => {
    expect(D_INFINITY.eq('1.7976931348623157e308')).toBe(true)
    expect(new Decimal('1e308').lt(D_INFINITY)).toBe(true)
    expect(new Decimal('1.8e308').gte(D_INFINITY)).toBe(true)
  })
})
