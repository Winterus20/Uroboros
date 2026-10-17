import { describe, it, expect } from 'vitest'
import {
  FEAST_SCENES,
  PARTICLE_BUDGET,
  feastScene,
  isBigScene,
  shouldSuppressFeast,
  scaleCountForMode,
  clampEmission,
  type FeastSceneId
} from './particles'

const SCENE_IDS: FeastSceneId[] = [
  'supernova',
  'mass_burst',
  'hawking',
  'resonance',
  'crunch',
  'decade',
  'yut',
  'time_warp'
]

describe('particles — Faz D sahne tablosu', () => {
  it('tüm sahneler tanımlı ve kimlikleri tutarlı', () => {
    for (const id of SCENE_IDS) {
      expect(FEAST_SCENES[id]).toBeDefined()
      expect(feastScene(id).id).toBe(id)
    }
  })

  it('renk disiplini: yalnız sözleşme paleti (mor/cyan/amber/feast/beyaz)', () => {
    const allowed = new Set(['#a855f7', '#22d3ee', '#67e8f9', '#fbbf24', '#f59e0b', '#ff3355', '#ffffff'])
    for (const id of SCENE_IDS) {
      for (const s of FEAST_SCENES[id].shocks) {
        expect(allowed.has(s.color)).toBe(true)
        expect(s.maxRadius).toBeGreaterThan(0)
        expect(s.maxRadius).toBeLessThanOrEqual(320)
      }
    }
  })

  it('büyük sahneler suppression koyar, küçükler koymaz', () => {
    expect(isBigScene('supernova')).toBe(true)
    expect(isBigScene('mass_burst')).toBe(true)
    expect(isBigScene('resonance')).toBe(true)
    expect(isBigScene('crunch')).toBe(true)
    expect(isBigScene('time_warp')).toBe(true)
    expect(isBigScene('hawking')).toBe(false)
    expect(isBigScene('decade')).toBe(false)
    expect(isBigScene('yut')).toBe(false)
    for (const id of SCENE_IDS) {
      if (isBigScene(id)) expect(FEAST_SCENES[id].suppressionMs).toBeGreaterThan(0)
      else if (id !== 'yut') expect(FEAST_SCENES[id].suppressionMs).toBe(0)
    }
  })

  it('time_warp (Zaman Yayı) sahnesi: supernova ile crunch arası, cyan-mor hard', () => {
    const t = FEAST_SCENES.time_warp
    expect(t.sparks).toBeGreaterThan(FEAST_SCENES.supernova.sparks)
    expect(t.sparks).toBeLessThan(FEAST_SCENES.crunch.sparks)
    expect(t.shake).toBe('hard')
    expect(t.big).toBe(true)
    expect(t.suppressionMs).toBeGreaterThan(0)
    expect(t.shocks.length).toBeGreaterThanOrEqual(2)
    expect(t.shocks[0].color).toBe('#22d3ee')
    expect(t.shocks[1].color).toBe('#a855f7')
  })

  it('rezonans tekil sahnelerden yoğundur (katmanlı şölen)', () => {
    const r = FEAST_SCENES.resonance
    expect(r.sparks).toBeGreaterThan(FEAST_SCENES.supernova.sparks)
    expect(r.shocks.length).toBeGreaterThan(FEAST_SCENES.supernova.shocks.length)
    expect(r.big).toBe(true)
  })

  it('crunch imza sahnesidir: en büyük emisyon + en uzun knock + hard shake', () => {
    const c = FEAST_SCENES.crunch
    expect(c.sparks).toBeGreaterThanOrEqual(FEAST_SCENES.resonance.sparks)
    expect(c.knockMs).toBeGreaterThanOrEqual(140)
    expect(c.shake).toBe('hard')
    expect(c.big).toBe(true)
  })

  it('yut sahnesi minimaldir: 4 kıvılcım, halka/yazı/shake/knock yok', () => {
    const y = FEAST_SCENES.yut
    expect(y.sparks).toBe(4)
    expect(y.shocks).toEqual([])
    expect(y.texts).toBe(0)
    expect(y.shake).toBeNull()
    expect(y.knockMs).toBe(0)
  })

  it('shake kademesi yalnız soft/medium/hard/null', () => {
    for (const id of SCENE_IDS) {
      const s = FEAST_SCENES[id].shake
      expect(s === 'soft' || s === 'medium' || s === 'hard' || s === null).toBe(true)
    }
  })

  it('hawking/decade knock-down koymaz (zemin yalnız büyük olayda bastırılır)', () => {
    expect(FEAST_SCENES.hawking.knockMs).toBe(0)
    expect(FEAST_SCENES.decade.knockMs).toBe(0)
    expect(FEAST_SCENES.decade.shake).toBe('medium')
  })
})

describe('particles — suppression penceresi', () => {
  it('pencere içinde true, dışında false', () => {
    expect(shouldSuppressFeast(1000, 900, 400)).toBe(true)
    expect(shouldSuppressFeast(1400, 900, 400)).toBe(false)
    expect(shouldSuppressFeast(1300, 900, 400)).toBe(false)
  })

  it('hiç büyük sahne yoksa suppression yok; bozuk girdi güvenli', () => {
    expect(shouldSuppressFeast(1000, 0)).toBe(false)
    expect(shouldSuppressFeast(Number.NaN, 900)).toBe(false)
    expect(shouldSuppressFeast(1000, Number.NaN)).toBe(false)
    expect(shouldSuppressFeast(1000, 900, 0)).toBe(false)
  })
})

describe('particles — motion ölçeği ve havuz kıskaçı', () => {
  it('full tam, reduced ~%35, off sıfır', () => {
    expect(scaleCountForMode(40, 'full')).toBe(40)
    expect(scaleCountForMode(40, 'reduced')).toBe(14)
    expect(scaleCountForMode(40, 'off')).toBe(0)
    expect(scaleCountForMode(0, 'reduced')).toBe(0)
    expect(scaleCountForMode(1, 'reduced')).toBe(1)
  })

  it('clampEmission havuz tavanını aşmaz; bozuk girdi 0', () => {
    expect(clampEmission(40, 0, 220)).toBe(40)
    expect(clampEmission(40, 200, 220)).toBe(20)
    expect(clampEmission(40, 220, 220)).toBe(0)
    expect(clampEmission(Number.NaN, 0, 220)).toBe(0)
    expect(clampEmission(-5, 0, 220)).toBe(0)
  })

  it('bütçe sabitleri planla birebir (metin 60 / halka 8 / kıvılcım 220)', () => {
    expect(PARTICLE_BUDGET.MAX_PARTICLES).toBe(60)
    expect(PARTICLE_BUDGET.MAX_SHOCKWAVES).toBe(8)
    expect(PARTICLE_BUDGET.MAX_SPARKS).toBe(220)
    expect(PARTICLE_BUDGET.SUPPRESSION_WINDOW_MS).toBe(400)
  })
})
