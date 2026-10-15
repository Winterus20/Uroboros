import Decimal from 'break_eternity.js'

// PERFORMANS (2026-10-15 ölçümü): Pinia/Vue state'i derindir; Decimal örnekleri
// de reaktivite proxy'sine sarılıyordu ve tick döngüsündeki HER Decimal metodu
// proxy `get` tuzağından geçiyordu (geç oyun CPU profilinde tick süresinin
// ~%25'i, tek çarpım ~4µs). Decimal'ler bu kod tabanında değişmez değerlerdir:
// hiçbir yerde yerinde mutasyon yapılmaz (`.mag =`, `.assign()`, `.copyFrom()`
// kullanımı yok — tarama 2026-10-15); her güncelleme yeni örnek atamasıyla olur
// ve o atama zaten reaktif bir `set` tetikler. Prototipe Vue'nun `markRaw`
// bayrağını (__v_skip) koymak tüm Decimal örneklerini proxy'siz bırakır:
// oyun davranışı birebir aynı kalır, sarmalama maliyeti sıfırlanır.
Object.defineProperty(Decimal.prototype, '__v_skip', { value: true })

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
