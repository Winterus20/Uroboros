import { describe, expect, it } from 'vitest'

import {
  CORRUPTION_META,
  MAX_CORRUPTION_LEVEL,
  corruptionStamp,
  deriveCorruptionLevel,
  parseCorruptionStamp
} from './corruption'

describe('corruption — faz-temelli bozulma merdiveni (Faz B)', () => {
  it('K0: Faz 0 ilk yarısı (D5 kilitli)', () => {
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 3, singularities: 0, nightWatchUnlocked: false })).toBe(0)
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 4, singularities: 0, nightWatchUnlocked: false })).toBe(0)
  })

  it('K1: D5 açılınca Planck Aşınması (D4/D5 sınırı)', () => {
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 5, singularities: 0, nightWatchUnlocked: false })).toBe(1)
  })

  it('K2: D6–D8 Kozmik Yutuş (D5/D6 sınırı)', () => {
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 6, singularities: 0, nightWatchUnlocked: false })).toBe(2)
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 8, singularities: 0, nightWatchUnlocked: false })).toBe(2)
  })

  it('K3: ilk tekillikte Çöküş Sonrası (prestij sayacı)', () => {
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 8, singularities: 1, nightWatchUnlocked: false })).toBe(3)
    // Düşük boyut + prestij: prestij baskındır (monotonik yukarı)
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 3, singularities: 1, nightWatchUnlocked: false })).toBe(3)
  })

  it('K4: nightWatch + tekillik birlikte (O1 kararı — sıra çakışması kilidi)', () => {
    // §2.2: nightWatch tek başına K4 doğurmaz (1e308 şafaktan önce tetiklenir)
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 8, singularities: 0, nightWatchUnlocked: true })).toBe(2)
    // İlk Big Crunch sonrası: K3 → hemen ardından K4 (monotonik sıra korunur)
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 8, singularities: 1, nightWatchUnlocked: true })).toBe(4)
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 3, singularities: 2, nightWatchUnlocked: true })).toBe(4)
  })

  it('K5 tavanı: Faz 3 yokken max K4 döner', () => {
    expect(MAX_CORRUPTION_LEVEL).toBe(4)
    // Aşırı girdiler bile tavanı aşamaz
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 8, singularities: 999, nightWatchUnlocked: true })).toBe(4)
  })

  it('monotonik: reset senaryosunda seviye düşmez (koşu sayacı sıfırlansa bile kalıcı sinyaller)', () => {
    // unlockedDimensionsCount zaten lifetimePeakMatter tabanlı kütle kapılarıdır (ADR-0072);
    // burada monotonluk sözleşmesi: daha yüksek kalıcı sinyal asla düşük seviye vermez.
    const low = deriveCorruptionLevel({ unlockedDimensionsCount: 3, singularities: 0, nightWatchUnlocked: false })
    const mid = deriveCorruptionLevel({ unlockedDimensionsCount: 5, singularities: 0, nightWatchUnlocked: false })
    const high = deriveCorruptionLevel({ unlockedDimensionsCount: 8, singularities: 1, nightWatchUnlocked: true })
    expect(low).toBeLessThanOrEqual(mid)
    expect(mid).toBeLessThanOrEqual(high)
  })

  it('bozuk girdiler güvenli varsayılana düşer (NaN/negatif/taşıma)', () => {
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: Number.NaN, singularities: 0, nightWatchUnlocked: false })).toBe(0)
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: -3, singularities: -1, nightWatchUnlocked: false })).toBe(0)
    expect(deriveCorruptionLevel({ unlockedDimensionsCount: 99, singularities: 0, nightWatchUnlocked: false })).toBe(2)
  })

  it('corruptionStamp K0..K5 üretir, parse round-trip yapar', () => {
    expect(corruptionStamp(0)).toBe('K0')
    expect(corruptionStamp(1)).toBe('K1')
    expect(corruptionStamp(4)).toBe('K4')
    expect(corruptionStamp(5)).toBe('K5')
    expect(parseCorruptionStamp('K3')).toBe(3)
    expect(parseCorruptionStamp('bogus')).toBe(0)
    expect(parseCorruptionStamp(undefined)).toBe(0)
  })

  it('CORRUPTION_META şiddet eğrisi monoton artar (O5: K2→K4 substrat; glitch K0→K5)', () => {
    // Substrat tavanı: K2 %25, K4 %40
    expect(CORRUPTION_META[2].substrateOpacity).toBeCloseTo(0.25, 6)
    expect(CORRUPTION_META[4].substrateOpacity).toBeCloseTo(0.4, 6)
    // ADR-0069: CRT ayağı kaldırıldı — CRT alanları meta'da YOKTUR (regresyon kilidi)
    expect(CORRUPTION_META[0]).not.toHaveProperty('crtIntensity')
    expect(CORRUPTION_META[0]).not.toHaveProperty('scanlineAlpha')
    expect(CORRUPTION_META[0]).not.toHaveProperty('vignetteAlpha')
    expect(CORRUPTION_META[0]).not.toHaveProperty('glowAlpha')
    // Genel monotonluk (K0..K5)
    for (let l = 1; l <= 5; l++) {
      const prev = CORRUPTION_META[(l - 1) as 0 | 1 | 2 | 3 | 4 | 5]
      const cur = CORRUPTION_META[l as 0 | 1 | 2 | 3 | 4 | 5]
      expect(cur.substrateOpacity).toBeGreaterThanOrEqual(prev.substrateOpacity)
      expect(cur.motifBandOpacity).toBeGreaterThanOrEqual(prev.motifBandOpacity)
      expect(cur.glitchIntensity).toBeGreaterThanOrEqual(prev.glitchIntensity)
    }
  })

  it('okunabilirlik kanonu: meta yalnız ambient token üretir (metin/ramp anahtarı yok)', () => {
    for (const meta of Object.values(CORRUPTION_META)) {
      expect(meta).not.toHaveProperty('textColor')
      expect(meta).not.toHaveProperty('ramp')
    }
  })
})
