import { Decimal, D } from '../../core/math'

/**
 * 1. BASAMAK (`1.79e308` — "I thought it was a wall") denge sabitleri.
 *
 * Kaynak: brain/research/theme-pivot-grilling-2026-10-23.md §11.3 (E6–E14) ·
 * brain/research/ring-pricing-2026-10-23.md (fiyat kuralı) ·
 * brain/research/ad-pricing-and-chain-math-2026-10-23.md §6 (A+ ölçümü).
 *
 * ── ÜRETİM (Antimatter Dimensions kuralı, S9) ────────────────────────────
 * Bir parmak saniyede TAM 1 sayı üretir; her halka kendinden bir aşağıdakini
 * saniyede `CHAIN_RATE` adet üretir. `+1` bu yüzden gerçek bir birimdir.
 *
 * ── FİYAT KURALI (tek cümle) ─────────────────────────────────────────────
 * Her halka bir öncekinin 8 katı eder, birim başına fiyat 1,20 ile artar:
 *     c_i = 25 · 8^i          g = 1,20
 * İkisi birlikte halka başına log(8)/log(1,2) = 11,4 birim verir; yani 10'lu
 * blok (AD'nin "Buy 10"ı) tam olarak BİR halkayı satın alır ve kilit eşiği
 * (10 birim) tek bloktur.
 *
 * ── NEDEN 1/sn HER YERDE DEĞİL ───────────────────────────────────────────
 * Zincir 7 katlı bir integraldir: N(t) ≈ M · (∏p) · t⁸/8!. Sekiz halka da
 * 1/sn olsaydı ∏p = 1 olur, zincir bugünkünün (1/0,11)⁷ ≈ 5,1e6 katı güçlenir
 * ve iki saatlik koşu imkânsızlaşırdı (ölçüm: 43 dakikada kapı + 10. dakikada
 * 1,3e10 parmak). `CHAIN_RATE = 0,11` iki saatlik koşuyu koruyan sayıdır.
 *
 * ── ÖLÇÜMÜN ZORUNLU KILDIĞI ÜÇ DÜZELTME (rapor §2.2) ────────────────────
 *  D1 — Boost çarpanı YALNIZ sayı üretimine uygulanır; halka beslemesine uygulanmaz.
 *  D3 — Boost sonrası halkalar 0'a değil 1 birime iner; zincir canlı kalır.
 *  D6 — Kilitler MANDALLIDIR: bir kez açılan halka boost/prestij ile kapanmaz (S3).
 *
 * ── DOĞRULANAN KOŞU (20 TPS, 2 tık/sn, K5 politikası — gerçek motor) ────
 * kapı 119,0 dk · 21 boost · 371 alım · halka açılışları 0 · 1,6 · 4,2 · 6,8 ·
 * 9,4 · 12,0 · 14,5 · 17,1 dk
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

/** Halka i+1 → halka i: saniyede 0,11 birim. ∏p'yi iki saate kalibre eden sayı. */
export const CHAIN_RATE = 0.11

/** AD'nin "Buy 10"ı: tek blok = bir halka (11,4 birim) = kilit eşiği. */
export const BLOCK_SIZE = 10

export const NUMBER_TUNING = {
  /** Kapı: 1. basamağın sonu (S1/S5). */
  gate: D('1.79e308'),

  /** Birim başına fiyat çarpanı (g). 1,20 → halka başına 11,4 birim. */
  costGrowth: 1.2,

  /** Halkalar arası fiyat oranı: c_i = c_0 · ladderRatio^i. */
  ladderRatio: 8,

  /** Mini boost çarpan üssü (E14: (zirve/başlangıç)^0,2). */
  boostExponent: 0.2,

  /** `Birikim` verim cezası tabanı (E7: 0,9^log10(A)) — yalnız sayı üretimine. */
  efficiencyBase: 0.9,

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
