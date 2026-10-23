import { Decimal, D } from '../../core/math'

/**
 * 1. BASAMAK (`1.79e308` — "Duvar sandım") denge sabitleri.
 *
 * Kaynak: brain/research/theme-pivot-grilling-2026-10-23.md §11.3 (E6–E14).
 * Ölçüm: brain/scratchpad/balance-2026-10-23/ (simülasyon) — hedefler
 * kapı ~120 dk, 20–26 boost, 100–150 alım.
 *
 * Kurallar (kilitli):
 *  - Zincir aşağıdan yukarı besler: halka 1 (Parmaklar) SAYIYI üretir,
 *    halka n+1 halka n'i üretir (E6).
 *  - Sınırsız alım, tek havuz (E2/E10); fiyat her alımda ×COST_GROWTH.
 *  - Bir halkadan 10 birim alınınca sonraki halka açılır (E11).
 *  - Mini boost: 8. halka alınınca açılır; çarpan = (zirve/10)^BOOST_EXPONENT (E13/E14).
 *  - Kapı: sayı >= 1.79e308 → prestij; Tanım = log10(1+A), A = sayı/kapı (E7).
 *
 * BURADAKİ SAYILAR ÖLÇÜMLE KİLİTLENİR (todo K5). Tek dosyada durur ki
 * denge değişince tek yerden dönsün.
 */

export interface RingTuning {
  /** İngilizce ad (P3: tüm oyun metni İngilizce). */
  readonly name: string
  /** İlk birimin sayı cinsinden maliyeti. */
  readonly baseCost: Decimal
  /** Bir birimin saniyede ürettiği miktar (halka 1 için: sayı/sn). */
  readonly baseRate: Decimal
}

function ring(name: string, baseCost: string, baseRate: string): RingTuning {
  return { name, baseCost: D(baseCost), baseRate: D(baseRate) }
}

export const NUMBER_TUNING = {
  /** Kapı: 1. basamağın sonu (S1/S5). Aynı zamanda JS float tavanı. */
  gate: D('1.79e308'),

  /** Her alımda fiyat çarpanı (E10: ×1,3–1,5). */
  costGrowth: 1.4,

  /** Mini boost çarpan üssü (E14: (zirve/10)^0,2 → ~23 döngü ≈ 2 saat). */
  boostExponent: 0.2,

  /** `Birikim` verim cezası tabanı (E7: 0,9^log10(A)). */
  efficiencyBase: 0.9,

  /** Halkadan kaç birim alınınca sonraki halka açılır (E11). */
  unlockThreshold: 10,

  /** 1. basamak zinciri — indeks 0 = ekranın en üstü = Parmaklar (E6). */
  rings: [
    ring('Fingers', '10', '1'),
    ring('Notch', '100', '1e2'),
    ring('Abacus', '1e3', '1e3'),
    ring('Pencil', '1e4', '1e4'),
    ring('Calculator', '1e5', '1e5'),
    ring('Computer', '1e6', '1e6'),
    ring('Supercomputer', '1e7', '1e7'),
    ring('Mathematician', '1e8', '1e8')
  ] as readonly RingTuning[]
} as const

export const RING_COUNT = NUMBER_TUNING.rings.length

export function ringCostAt(baseCost: Decimal, bought: number, growth: number = NUMBER_TUNING.costGrowth): Decimal {
  return baseCost.times(new Decimal(growth).pow(bought))
}
