import { describe, expect, it } from 'vitest'

import {
  MOTIFS,
  MOTIF_GROUPS,
  MOTIF_GROUP_ORDER,
  buildMotifStrip,
  motifsForCorruption
} from './motifs'

const EXPECTED_IDS = [
  'delik', 'goz', 'dis', 'zincir',
  'tekerlek', 'gul', 'dama', 'yirtik',
  'bant', 'karalama', 'vida', 'catlak',
  'ay', 'yildiz', 'saat', 'perde'
]

describe('motifs — GIC slot kontratı (Faz C)', () => {
  it('motif adı = dosya adı (slot kontratı, birebir değişim garantisi)', () => {
    expect(MOTIFS.map((m) => m.id).sort()).toEqual([...EXPECTED_IDS].sort())
    expect(new Set(MOTIFS.map((m) => m.id)).size).toBe(MOTIFS.length)
  })

  it('her grup faz başına 4–6 motif açar (slot bütçesi)', () => {
    for (const group of MOTIF_GROUP_ORDER) {
      const n = MOTIFS.filter((m) => m.group === group).length
      expect(n).toBeGreaterThanOrEqual(4)
      expect(n).toBeLessThanOrEqual(6)
    }
  })

  it('grup eşikleri bozulma merdiveniyle hizalı (K1..K4)', () => {
    expect(MOTIF_GROUPS.planck.minCorruption).toBe(1)
    expect(MOTIF_GROUPS.cosmic.minCorruption).toBe(2)
    expect(MOTIF_GROUPS.collapse.minCorruption).toBe(3)
    expect(MOTIF_GROUPS.nightwatch.minCorruption).toBe(4)
  })

  it('K0 steril: motif yok; seviyeyle kümülatif açılır', () => {
    expect(motifsForCorruption(0)).toEqual([])
    expect(motifsForCorruption(1).length).toBe(4)
    expect(motifsForCorruption(2).length).toBe(8)
    expect(motifsForCorruption(3).length).toBe(12)
    expect(motifsForCorruption(4).length).toBe(16)
    expect(motifsForCorruption(5).length).toBe(16)
  })

  it('ham SVG stringleri geçerli ve currentColor ile tintlenir', () => {
    for (const m of MOTIFS) {
      expect(m.svg).toContain('<svg')
      expect(m.svg).toContain('currentColor')
      expect(m.weight).toBeGreaterThanOrEqual(1)
    }
    // Tekrar eden korku kökü (delik) daha sık görünür
    const delik = MOTIFS.find((m) => m.id === 'delik')
    expect(delik?.weight).toBeGreaterThan(1)
  })

  it('tonlar rezerve durum renkleriyle çakışmaz (rose/cyan/amber/purple yok)', () => {
    for (const m of MOTIFS) {
      expect(['feast', 'bone', 'ember']).toContain(m.tone)
    }
  })

  it('buildMotifStrip deterministik ve ağırlıklı (RNG yok)', () => {
    const a = buildMotifStrip(2, 10)
    const b = buildMotifStrip(2, 10)
    expect(a.map((m) => m.id)).toEqual(b.map((m) => m.id))
    expect(a.length).toBe(10)
    expect(buildMotifStrip(0, 10)).toEqual([])
    expect(buildMotifStrip(4, 0)).toEqual([])
    // delik ağırlığı 2 → ilk 9'luk döngüde iki kez görünür
    const ids = buildMotifStrip(1, 5).map((m) => m.id)
    expect(ids.filter((id) => id === 'delik').length).toBe(2)
  })

  it('her motif gövdesi yasaklı token taşımaz (brief §1 kapısı — A5-02)', () => {
    // Gerekçe: aynı glif DOM'da 16–28 kez tekrarlanır → `id=` çakışır,
    // `url(#...)`/`<defs>`/gradient referansı sızar; renk yalnız currentColor'dan
    // gelir (var() arka plan hilesi ve gömülü stil yasak). Kontrat brief §1/§5.
    const FORBIDDEN = [
      'id=', 'url(', 'defs', 'style', 'filter', 'gradient',
      'mask', 'clippath', 'text', 'image', 'script', 'var('
    ]
    for (const m of MOTIFS) {
      // Gövde küçük harfe indirilir: 'clipPath' → 'clippath' (SVG'de büyük/küçük harf kaçağı kapatılır).
      const svg = m.svg.toLowerCase()
      for (const token of FORBIDDEN) {
        expect(svg, m.id + '.svg yasaklı token taşıyor: ' + token).not.toContain(token)
      }
    }
  })

  it('kök şablon kilitli: viewBox 0 0 32 32 + fill="none" + currentColor (brief §1)', () => {
    for (const m of MOTIFS) {
      expect(m.svg.startsWith('<svg '), m.id + '.svg <svg ile başlamalı').toBe(true)
      expect(m.svg, m.id + '.svg viewBox').toContain('viewBox="0 0 32 32"')
      expect(m.svg, m.id + '.svg fill=none').toContain('fill="none"')
      expect(m.svg, m.id + '.svg stroke=currentColor').toContain('stroke="currentColor"')
      expect(m.svg, m.id + '.svg aria-hidden').toContain('aria-hidden="true"')
      expect(m.svg.trimEnd().endsWith('</svg>'), m.id + '.svg kapanış').toBe(true)
    }
  })

  it('pencere kaydırması: her cycle farklı bir pencere açar (A5-05)', () => {
    const pool = motifsForCorruption(4)
    // Ağırlıklı havuz uzunluğu = pencere periyodu (motifs.ts kontratı).
    const period = pool.reduce((sum, m) => sum + Math.max(1, Math.floor(m.weight)), 0)
    const windows = new Set<string>()
    for (let cycle = 0; cycle < period; cycle++) {
      const ids = buildMotifStrip(4, 4, cycle).map((m) => m.id)
      expect(ids.length).toBe(4)
      windows.add(ids.join('|'))
    }
    expect(windows.size).toBe(period)
  })

  it('ardışık pencereler sonlu döngüde tüm havuzu kapsar (A5-05)', () => {
    const pool = motifsForCorruption(4)
    const period = pool.reduce((sum, m) => sum + Math.max(1, Math.floor(m.weight)), 0)
    const seen = new Set<string>()
    for (let cycle = 0; cycle < period; cycle++) {
      for (const m of buildMotifStrip(4, 4, cycle)) seen.add(m.id)
    }
    expect([...seen].sort()).toEqual(pool.map((m) => m.id).sort())
  })

  it('kaydırma geriye uyumlu ve güvenli: cycle yok = 0. indeks, negatif/NaN sarmalanır', () => {
    const legacy = buildMotifStrip(3, 6)
    expect(legacy.map((m) => m.id)).toEqual(buildMotifStrip(3, 6, 0).map((m) => m.id))
    const period = motifsForCorruption(3).reduce((sum, m) => sum + Math.max(1, Math.floor(m.weight)), 0)
    expect(buildMotifStrip(3, 6, -1).map((m) => m.id)).toEqual(
      buildMotifStrip(3, 6, period - 1).map((m) => m.id)
    )
    expect(buildMotifStrip(3, 6, Number.NaN).map((m) => m.id)).toEqual(legacy.map((m) => m.id))
  })
})
