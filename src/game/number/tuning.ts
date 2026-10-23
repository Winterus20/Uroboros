import { Decimal, D } from '../../core/math'

/**
 * 1. BASAMAK (`1.79e308` — "I thought it was a wall") denge sabitleri.
 *
 * Kaynak: brain/research/theme-pivot-grilling-2026-10-23.md §11.3 (E6–E14) +
 * ÖLÇÜM: brain/scratchpad/balance-2026-10-23/report.md (Set A) ve pricing-probe/pricing-flat.
 *
 * ── FİYAT KURALI (tek cümle) ─────────────────────────────────────────────
 * Her halka 0,08 birim/sn üretir ve her halka bir öncekinin 3,2 katı eder.
 * Bu ikisinin çarpımı tek bir değişmez verir: **her halka kendini 40 saniyede öder**
 *   T_i = c_i / (p_i · c_{i-1}) = 3,2 / 0,08 = 40 sn      (i = 2..8)
 * 3,2 katsayısı buradan gelir: hedef geri ödeme (40 sn) × üretim (0,08/sn).
 * Ölçülen sapma: 39–40 sn (yuvarlama payı, ±%2,5).
 *
 * Halka 1'in geri ödemesi 25/0,08 = 313 sn'dir; o bir istisna değil, oyunun
 * kendi para birimidir (sayı, kendisiyle ölçülür).
 *
 * ── ÖLÇÜMÜN ZORUNLU KILDIĞI ÜÇ DÜZELTME (rapor §2.2) ────────────────────
 *  D1 — Boost çarpanı YALNIZ sayı üretimine uygulanır; halka beslemesine uygulanmaz.
 *  D3 — Boost sonrası halkalar 0'a değil 1 birime iner; zincir canlı kalır.
 *  D6 — Kilitler MANDALLIDIR: bir kez açılan halka boost/prestij ile kapanmaz (S3).
 *
 * ── DOĞRULANAN KOŞU (20 TPS, 2 tık/sn) ──────────────────────────────────
 * kapı 121,9 dk · 23 boost · 122 alım · ilk 10 dk 9 alım
 * halka açılışları 0 · 11,4 · 21,0 · 26,1 · 29,3 · 31,7 · 33,7 · 35,4 dk
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

/** Tüm halkalar aynı hızda üretir — merdiven bir HIZ değil, bir DEĞER merdivenidir. */
export const RING_RATE = 0.08

export const NUMBER_TUNING = {
  /** Kapı: 1. basamağın sonu (S1/S5). */
  gate: D('1.79e308'),

  /** Her alımda fiyat çarpanı (E10: ×1,3–1,5; güvenli bant 1,32–1,48). */
  costGrowth: 1.4,

  /** Mini boost çarpan üssü (E14: (zirve/10)^0,2 → ~23 döngü ≈ 2 saat). */
  boostExponent: 0.2,

  /** `Birikim` verim cezası tabanı (E7: 0,9^log10(A)) — yalnız sayı üretimine. */
  efficiencyBase: 0.9,

  /** Halkadan kaç birim alınınca sonraki halka açılır (E11, mandallı). */
  unlockThreshold: 10,

  /** 1. basamak zinciri — indeks 0 = ekranın en üstü = Fingers (E6). */
  rings: [
    ring('Fingers', 25, RING_RATE),
    ring('Notch', 80, RING_RATE),
    ring('Abacus', 250, RING_RATE),
    ring('Pencil', 800, RING_RATE),
    ring('Calculator', 2500, RING_RATE),
    ring('Computer', 8000, RING_RATE),
    ring('Supercomputer', 25000, RING_RATE),
    ring('Mathematician', 80000, RING_RATE)
  ] as readonly RingTuning[]
} as const

export const RING_COUNT = NUMBER_TUNING.rings.length

export function ringCostAt(baseCost: Decimal, bought: number, growth: number = NUMBER_TUNING.costGrowth): Decimal {
  return baseCost.times(new Decimal(growth).pow(bought))
}
