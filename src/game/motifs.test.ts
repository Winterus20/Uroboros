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
})
