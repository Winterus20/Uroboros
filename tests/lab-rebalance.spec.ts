import { describe, expect, it } from 'vitest'

import { getFeatureById } from '../src/game/unlocks'

/**
 * LAB REBALANCE SÖZLEŞME TESTLERİ (ADR-0050 hazırlık).
 *
 * Not: `src/stores/game.ts` ve `src/components/LabTab.vue` paralel ajan
 * tarafından değiştiriliyor; bu dosya gerçek store'u import etmez, bozmaz.
 * Aşağıdaki saf yardımcılar, rebalance sonrası oyunun sağlaması gereken
 * SÖZLEŞMEYİ pinler: implementasyon bu davranışları karşılamak zorunda.
 * Formül sabitleri game.ts satır 4924-4926 / 3916-3945 / 4942'den alınmıştır.
 */

// ---------------------------------------------------------------------------
// 0. Lab kilit eşikleri (gerçek veri: src/game/unlocks.ts — salt okunur)
// ---------------------------------------------------------------------------

describe('lab kilit eşikleri (unlocks.ts)', () => {
  it('lab sekmesi 1e70, tohumlar 1e80 / 1e100 / 1e125 eşiklerinde', () => {
    expect(getFeatureById('lab')?.req).toEqual({ kind: 'dopamine', amount: '1e70' })
    expect(getFeatureById('seed_nucleon')?.req).toEqual({ kind: 'dopamine', amount: '1e80' })
    expect(getFeatureById('seed_gluon')?.req).toEqual({ kind: 'dopamine', amount: '1e100' })
    expect(getFeatureById('seed_graviton')?.req).toEqual({ kind: 'dopamine', amount: '1e125' })
  })

  it('eşikler kesin artan sırada (lab < nucleon < gluon < graviton)', () => {
    const ids = ['lab', 'seed_nucleon', 'seed_gluon', 'seed_graviton'] as const
    const orders = ids.map((id) => getFeatureById(id)?.order ?? -1)
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1])
    }
  })
})

// ---------------------------------------------------------------------------
// (a) Hype hızı formülü: (0.35 + mature * 0.3) * modeMult
// ---------------------------------------------------------------------------

export type LabMode = 'overdrive' | 'superconductor' | 'fluctuation'

export function hypeModeMult(mode: LabMode): number {
  return mode === 'overdrive' ? 1.8 : 1.0
}

/** game.ts — saniyede kazanılan hype puanı (0..100 bar). Superconductor dondurur (0). */
export function hypeRatePerSec(matureCount: number, mode: LabMode): number {
  if (mode === 'superconductor') return 0
  const mature = Math.max(0, Math.floor(matureCount))
  return (0.35 + mature * 0.3) * hypeModeMult(mode)
}

describe('hype hızı formülü (0.35 + mature * 0.3) * modeMult', () => {
  it('boş matriste taban hız 0.35/sn (100 bar ≈ 286 sn)', () => {
    expect(hypeRatePerSec(0, 'fluctuation')).toBeCloseTo(0.35, 10)
    expect(100 / hypeRatePerSec(0, 'fluctuation')).toBeCloseTo(285.7, 1)
  })

  it('overdrive çarpanı 1.8; fluctuation 1.0; superconductor 0 (donar)', () => {
    expect(hypeModeMult('overdrive')).toBe(1.8)
    expect(hypeModeMult('fluctuation')).toBe(1.0)
    expect(hypeRatePerSec(3, 'superconductor')).toBe(0)
  })

  it('9 olgun + overdrive ≈ 5.49/sn → tam bar ≈ 18.2 sn (spam motivasyonu)', () => {
    expect(hypeRatePerSec(9, 'overdrive')).toBeCloseTo(5.49, 10)
    expect(100 / hypeRatePerSec(9, 'overdrive')).toBeCloseTo(18.2, 1)
  })

  it('olgun sayısına göre monoton artar, negatif/NaN girdiye dayanıklı', () => {
    let prev = -Infinity
    for (const n of [0, 1, 4, 8, 9]) {
      const r = hypeRatePerSec(n, 'fluctuation')
      expect(r).toBeGreaterThan(prev)
      prev = r
    }
    expect(hypeRatePerSec(4, 'fluctuation')).toBeCloseTo(1.55, 10)
    expect(hypeRatePerSec(-3, 'fluctuation')).toBeCloseTo(0.35, 10)
  })
})

// ---------------------------------------------------------------------------
// (b) Vent (süperkritik boşalım) cooldown mantığı — 120 sn varsayımı
// ---------------------------------------------------------------------------

export const VENT_COOLDOWN_SECONDS = 120

export interface VentState {
  hype: number
  isViralActive: boolean
  lastVentAtSeconds: number
}

export const NEVER_VENTED: VentState = {
  hype: 100,
  isViralActive: false,
  lastVentAtSeconds: Number.NEGATIVE_INFINITY
}

export function canTriggerVent(s: VentState, nowSeconds: number): boolean {
  if (s.hype < 100 || s.isViralActive) return false
  return nowSeconds - s.lastVentAtSeconds >= VENT_COOLDOWN_SECONDS
}

export function applyVent(_s: VentState, nowSeconds: number): VentState {
  return { hype: 0, isViralActive: true, lastVentAtSeconds: nowSeconds }
}

describe('vent cooldown (120 sn)', () => {
  it('hype < 100 iken asla ateşlenmez', () => {
    expect(canTriggerVent({ ...NEVER_VENTED, hype: 99.9 }, 10_000)).toBe(false)
  })

  it('viral dalga aktifken yeniden ateşlenmez', () => {
    expect(canTriggerVent({ ...NEVER_VENTED, isViralActive: true }, 10_000)).toBe(false)
  })

  it('119. snede kilitli, 120. snede açık (sınır dahil)', () => {
    const s: VentState = { hype: 100, isViralActive: false, lastVentAtSeconds: 1_000 }
    expect(canTriggerVent(s, 1_119)).toBe(false)
    expect(canTriggerVent(s, 1_120)).toBe(true)
    expect(canTriggerVent(s, 1_121)).toBe(true)
  })

  it('ateşleme barı sıfırlar, virali başlatır, saati mühürler', () => {
    const s: VentState = { hype: 100, isViralActive: false, lastVentAtSeconds: 0 }
    const after = applyVent(s, 500)
    expect(after.hype).toBe(0)
    expect(after.isViralActive).toBe(true)
    expect(after.lastVentAtSeconds).toBe(500)
    // Hemen ardından (hype dolsa bile) cooldown + viral kapısı tutar.
    expect(canTriggerVent({ ...after, hype: 100 }, 500)).toBe(false)
    expect(canTriggerVent({ ...after, hype: 100, isViralActive: false }, 619)).toBe(false)
    expect(canTriggerVent({ ...after, hype: 100, isViralActive: false }, 620)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// (c) Egzotik yarı-bonus kuralı (9x Higgs meta freni)
// ---------------------------------------------------------------------------

export const EXOTIC_HALF_WEIGHT = 0.5

/**
 * Yalnız egzotik yarı-bonus (game.ts lone-penalty ile birebir):
 * ebeveyn desteksiz egzotik hücre `b` yerine `1+(b-1)*0.5` verir.
 * Örn. yalnız Higgs: 3 yerine 2; çift yalnız Higgs: 3*3=9 yerine 2*2=4.
 */
export function exoticStackMult(baseMults: number[]): number {
  if (baseMults.length === 0) return 1
  return baseMults.reduce((acc, b) => acc * (1 + (b - 1) * EXOTIC_HALF_WEIGHT), 1)
}

describe('egzotik yarı-bonus kuralı', () => {
  it('tek egzotik yarı-bonusu korur, boş matris nötrdür', () => {
    expect(exoticStackMult([])).toBe(1)
    expect(exoticStackMult([3.0])).toBeCloseTo(2.0, 10)
  })

  it('çift yalnız Higgs 9x değil 4x verir (meta freni)', () => {
    expect(exoticStackMult([3.0, 3.0])).toBeCloseTo(4.0, 10)
    expect(exoticStackMult([3.0, 3.0])).toBeLessThan(9.0)
  })

  it('sıralamadan bağımsızdır', () => {
    expect(exoticStackMult([1.5, 2.0])).toBeCloseTo(exoticStackMult([2.0, 1.5]), 10)
    expect(exoticStackMult([1.5, 2.0])).toBeCloseTo(1.25 * 1.5, 10)
  })

  it('daha fazla egzotik asla azaltmaz ama tam çarpımı da geçemez', () => {
    const two = exoticStackMult([3.0, 2.0])
    const three = exoticStackMult([3.0, 2.0, 1.5])
    expect(three).toBeGreaterThan(two)
    expect(three).toBeLessThan(3.0 * 2.0 * 1.5)
  })
})

// ---------------------------------------------------------------------------
// (d) Fluctuation x2 hasat olasılığı aralığı
// ---------------------------------------------------------------------------

export const FLUCT_DOUBLE_CHANCE = 0.2
export const FLUCT_DOUBLE_MIN = 0.15
export const FLUCT_DOUBLE_MAX = 0.25

/** Fluctuation rejiminde hasat %20 (kabul bandı %15-25) ihtimalle x2 düşer. */
export function rollHarvestMultiplier(mode: LabMode, rng: () => number = Math.random): number {
  if (mode === 'fluctuation' && rng() < FLUCT_DOUBLE_CHANCE) return 2
  return 1
}

describe('fluctuation x2 hasat olasılığı', () => {
  it('hedef olasılık kabul bandı içinde ([0.15, 0.25])', () => {
    expect(FLUCT_DOUBLE_CHANCE).toBeGreaterThanOrEqual(FLUCT_DOUBLE_MIN)
    expect(FLUCT_DOUBLE_CHANCE).toBeLessThanOrEqual(FLUCT_DOUBLE_MAX)
  })

  it('sınırda deterministik: 0.199 → x2, 0.2 → x1', () => {
    expect(rollHarvestMultiplier('fluctuation', () => 0.0)).toBe(2)
    expect(rollHarvestMultiplier('fluctuation', () => 0.199)).toBe(2)
    expect(rollHarvestMultiplier('fluctuation', () => 0.2)).toBe(1)
    expect(rollHarvestMultiplier('fluctuation', () => 0.99)).toBe(1)
  })

  it('diğer rejimlerde rng ne olursa olsun x1', () => {
    for (const mode of ['overdrive', 'superconductor'] as LabMode[]) {
      expect(rollHarvestMultiplier(mode, () => 0.0)).toBe(1)
    }
  })

  it('sabit rng döngüsünde beklenen sayıda x2 üretir (100 ruloda 50)', () => {
    const seq = [0.1, 0.5]
    let i = 0
    const rng = () => seq[i++ % seq.length]
    let doubles = 0
    for (let k = 0; k < 100; k++) {
      if (rollHarvestMultiplier('fluctuation', rng) === 2) doubles++
    }
    expect(doubles).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// Mock-store entegrasyonu: tick → hype birikimi → vent (gerçek store'a dokunmaz)
// ---------------------------------------------------------------------------

export interface MockLab {
  hype: number
  mode: LabMode
  matureCount: number
}

/** game.ts:4923-4927 aynası: superconductor hype üretmez, bar 100'de tavanlar. */
export function tickHype(lab: MockLab, dtSeconds: number): MockLab {
  if (lab.mode === 'superconductor') return lab
  return { ...lab, hype: Math.min(100, lab.hype + dtSeconds * hypeRatePerSec(lab.matureCount, lab.mode)) }
}

describe('mock-store: tick → hype → vent döngüsü', () => {
  it('tick hype biriktirir ve 100 tavanını aşmaz', () => {
    const lab: MockLab = { hype: 0, mode: 'fluctuation', matureCount: 4 }
    const after = tickHype(lab, 10)
    expect(after.hype).toBeCloseTo(15.5, 10)
    expect(tickHype({ ...lab, hype: 99 }, 10).hype).toBe(100)
  })

  it('superconductor modunda hype donar (şarj durur)', () => {
    const lab: MockLab = { hype: 40, mode: 'superconductor', matureCount: 9 }
    expect(tickHype(lab, 60).hype).toBe(40)
  })

  it('tam döngü: birikim → vent izni → ateşleme → cooldown kilidi', () => {
    let lab: MockLab = { hype: 0, mode: 'overdrive', matureCount: 9 }
    lab = tickHype(lab, 20) // 20 sn * 5.49 ≈ 109.8 → tavan 100
    expect(lab.hype).toBe(100)
    const vent: VentState = { hype: lab.hype, isViralActive: false, lastVentAtSeconds: 0 }
    expect(canTriggerVent(vent, 120)).toBe(true)
    const fired = applyVent(vent, 120)
    expect(canTriggerVent({ ...fired, hype: 100, isViralActive: false }, 239)).toBe(false)
  })
})
