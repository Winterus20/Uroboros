import { Decimal, D } from '../../core/math'

/**
 * 1. BASAMAK ("1.79e308") zincir sabitleri.
 *
 * Kaynak: brain/research/theme-pivot-grilling-2026-10-23.md §11.3 (E6–E11) ·
 * brain/research/ring-pricing-2026-10-23.md (fiyat kuralı) ·
 * brain/research/ad-pricing-and-chain-math-2026-10-23.md §6 (A+ ölçümü).
 *
 * 2026-10-25: mini boost, prestij ve Tanım yükseltmeleri kaldırıldı. Oyun şimdilik
 * yalnız zinciri büyütür; sıfırlama ve kapı yoktur. Bu dosya zincirin tek sabit
 * kaynağıdır.
 *
 * ── ÜRETİM (Antimatter Dimensions kuralı, S9) ────────────────────────────
 * Bir parmak saniyede TAM 1 sayı üretir; her halka kendinden bir aşağıdakini
 * saniyede `CHAIN_RATE` adet üretir. `+1` bu yüzden gerçek bir birimdir.
 *
 * ── HALKANIN SAYIYA DOĞRUDAN KATKISI ────────────────────────────────────
 * Halka 2–8, bir altındakine verdiği miktarı sayının kendisine de yazar
 * (`RING_DIRECT_SHARE = 1` → birim başına 0,11/sn). Zincir integrali tek
 * yol değil: alınan halka `/s` okumasını ANINDA büyütür.
 *
 * ── FİYAT KURALI (tek cümle) ────────────────────────────────────────────
 * Her halka bir öncekinin 8 katı eder, birim başına fiyat 1,20 ile artar:
 *     c_i = 25 · 8^i          g = 1,20
 * İkisi birlikte halka başına log(8)/log(1,2) = 11,4 birim verir; yani 10'lu
 * blok (AD'nin "Buy 10"ı) tam olarak BİR halkayı satın alır ve kilit eşiği
 * (10 birim) tek bloktur.
 *
 * ── NEDEN 1/sn HER YERDE DEĞİL ──────────────────────────────────────────
 * Zincir 7 katlı bir integraldir. Sekiz halka da 1/sn olsaydı zincir
 * (1/0,11)⁷ ≈ 5,1e6 kat güçlenirdi. `CHAIN_RATE = 0,11` zincirin ritmini koruyan sayıdır.
 *
 * ── ÖLÇÜLEN AÇILIŞLAR (zincir-only, 2 tık/sn) ───────────────────────────
 * Halka açılışları 0 · 1,6 · 4,2 · 6,8 · 9,3 · 11,9 · 14,5 · 17,0 dk.
 */

export interface RingTuning {
  /** İngilizce ad (P3: tüm oyun metni İngilizce). */
  readonly name: string
  /** İlk birimin sayı cinsinden maliyeti. */
  readonly baseCost: Decimal
  /** Bir birimin saniyede ürettiği miktar (halka 1 için: sayı/sn). */
  readonly baseRate: Decimal
}

function ring(name: string, baseCost: number, baseRate: number): RingTuning {
  return { name, baseCost: D(baseCost), baseRate: D(baseRate) }
}

/** Halka 1 → sayı: bir parmak saniyede tam 1 sayı (S9: "+1 gerçek"). */
export const NUMBER_RATE = 1

/** Halka i+1 → halka i: saniyede 0,11 birim. */
export const CHAIN_RATE = 0.11

/**
 * Halka i (i ≥ 1) birim başına sayıya DOĞRUDAN kattığı miktar, kendi zincir hızının katı:
 * 0,11 × 1 = 0,11/sn. Yani halka hem bir altındakini besler hem de sayının kendisine yazar;
 * böylece satın alınan her halka `/s` okumasında ANINDA görünür (zincirin integralini beklemez).
 *
 * - Halka 1 (Fingers) hariç: o zaten sayının kendisidir, "1 parmak = 1 sayı/sn" bozulmaz.
 * - `0` yazılırsa özellik kapanır (eski davranış: yalnız Fingers sayı üretir).
 */
export const RING_DIRECT_SHARE = 1

/** AD'nin "Buy 10"ı: tek blok = bir halka (11,4 birim) = kilit eşiği. */
export const BLOCK_SIZE = 10

export const NUMBER_TUNING = {
  /** Birim başına fiyat çarpanı (g). 1,20 → halka başına 11,4 birim. */
  costGrowth: 1.2,

  /** Halkalar arası fiyat oranı: c_i = c_0 · ladderRatio^i. */
  ladderRatio: 8,

  /** Halkadan kaç birim alınınca sonraki halka açılır (E11, mandallı). */
  unlockThreshold: BLOCK_SIZE,

  /** 1. basamak zinciri — indeks 0 = ekranın en üstü = Fingers (E6). */
  rings: [
    ring('Fingers', 25, NUMBER_RATE),
    ring('Notch', 200, CHAIN_RATE),
    ring('Abacus', 1600, CHAIN_RATE),
    ring('Pencil', 12800, CHAIN_RATE),
    ring('Calculator', 102400, CHAIN_RATE),
    ring('Computer', 819200, CHAIN_RATE),
    ring('Supercomputer', 6553600, CHAIN_RATE),
    ring('Mathematician', 52428800, CHAIN_RATE)
  ] as readonly RingTuning[]
} as const

export const RING_COUNT = NUMBER_TUNING.rings.length

export function ringCostAt(baseCost: Decimal, bought: number, growth: number = NUMBER_TUNING.costGrowth): Decimal {
  return baseCost.times(new Decimal(growth).pow(bought))
}

/**
 * `count` birimin toplam fiyatı — geometrik toplam (AD'nin "Buy 10" formülü):
 *     c · g^bought · (g^count − 1) / (g − 1)
 * `count = 1` tek birim fiyatına eşittir.
 */
export function ringBlockCost(
  baseCost: Decimal,
  bought: number,
  count: number,
  growth: number = NUMBER_TUNING.costGrowth
): Decimal {
  if (count <= 1) return ringCostAt(baseCost, bought, growth)
  const g = new Decimal(growth)
  return ringCostAt(baseCost, bought, growth).times(g.pow(count).minus(1)).div(g.minus(1))
}

/**
 * Bütçeyle alınabilecek en fazla birim sayısı (kapalı form, döngü yok):
 *     n = ⌊ log(1 + (bütçe/fiyat)·(g − 1)) / log(g) ⌋
 */
export function maxAffordableCount(
  baseCost: Decimal,
  bought: number,
  budget: Decimal,
  growth: number = NUMBER_TUNING.costGrowth
): number {
  const cost = ringCostAt(baseCost, bought, growth)
  if (budget.lt(cost)) return 0
  const g = new Decimal(growth)
  const raw = budget.div(cost).times(g.minus(1)).plus(1).log10().div(g.log10()).floor().toNumber()
  if (!Number.isFinite(raw) || raw < 1) return 0
  return Math.min(Math.floor(raw), 1000)
}
