import Decimal from 'break_eternity.js'

export { Decimal }

export type DecimalSource = Decimal | number | string

export function D(value: DecimalSource): Decimal {
  if (value instanceof Decimal) return value
  if (value === undefined || value === null) {
    throw new Error("D(): DecimalSource gerekli (undefined/null reddedildi)")
  }
  try {
    const dec = new Decimal(value)
    if (dec.isNan() || Number.isNaN(dec.mag)) return D_0
    return dec
  } catch {
    return D_0
  }
}

// Paylaşılan mutable singleton'lar — MUTATE ETMEYİN (plus/mul/times yerinde
// değiştirmez ama assign/copyFrom gibi yöntemler bunları bozabilir).
// Object.freeze ile donduruldu; D(x) her zaman yeni örnek veya salt-okur
// referans döner, bu sabitlere yazmayın.
export const D_0: Decimal = Object.freeze(new Decimal(0)) as Decimal
export const D_1: Decimal = Object.freeze(new Decimal(1)) as Decimal
export const D_2: Decimal = Object.freeze(new Decimal(2)) as Decimal
export const D_10: Decimal = Object.freeze(new Decimal(10)) as Decimal

// 1.7976931348623157e308 (Standart JS float sınırı - İlk Tekillik eşiği)
export const D_INFINITY: Decimal = Object.freeze(new Decimal('1.7976931348623157e308')) as Decimal
