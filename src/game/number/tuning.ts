import { Decimal, D } from '../../core/math'

/**
 * 1. BASAMAK (`1.79e308` — "I thought it was a wall") denge sabitleri.
 *
 * Kaynak: brain/research/theme-pivot-grilling-2026-10-23.md §11.3 (E6–E14) +
 * ÖLÇÜM: brain/scratchpad/balance-2026-10-23/report.md (Set A).
 * Hedefler: kapı ~120 dk · 23 boost · 121 alım · halka açılışları 0–37 dk · ilk 10 dk 9 alım.
 *
 * Ölçümün zorunlu kıldığı üç düzeltme (rapor §2.2):
 *  D1 — Boost çarpanı YALNIZ sayı üretimine uygulanır; halka beslemesine uygulanmaz.
 *       (Her halkaya uygulanınca N ∝ M⁸ oluyor, döngü 2 sn'ye çöküyor.)
 *  D3 — Boost sonrası halkalar 0'a değil 1 birime iner; zincir canlı kalır.
 *  D6 — Kilitler MANDALLIDIR: bir kez açılan halka boost/prestij ile kapanmaz (S3).
 *
 * Fiyat/üretim: c_i = 25 · 10^{0,5(i-1)} · p_i = 0,071 · 1,05^{i-1} (ölçülen Set A).
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
    ring('Fingers', 25, 0.071),
    ring('Notch', 79.06, 0.07455),
    ring('Abacus', 250, 0.07828),
    ring('Pencil', 790.57, 0.08219),
    ring('Calculator', 2500, 0.0863),
    ring('Computer', 7905.69, 0.09061),
    ring('Supercomputer', 25000, 0.09514),
    ring('Mathematician', 79056.94, 0.0999)
  ] as readonly RingTuning[]
} as const

export const RING_COUNT = NUMBER_TUNING.rings.length

export function ringCostAt(baseCost: Decimal, bought: number, growth: number = NUMBER_TUNING.costGrowth): Decimal {
  return baseCost.times(new Decimal(growth).pow(bought))
}
