import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import { RUNG1_LINES } from './lines-rung1'
import {
  RARE_WEIGHT,
  RECENT_WINDOW,
  SILENCE_CHANCE,
  availableSceneLines,
  availableTickerLines,
  eligibleTickerLines,
  lineText,
  linesForRung,
  pickSceneLine,
  pickTickerLine,
  selectFromPool
} from './index'
import type { VoiceContext, VoiceLine } from './types'

/** Test bağlamı: yalnız oyun içi veri (V3), alanlar açıkça verilir. */
function context(over: Partial<VoiceContext> = {}): VoiceContext {
  return {
    rung: 1,
    number: D(10),
    peak: D(10),
    perSecond: D(0),
    tanim: D(0),
    prestiges: 0,
    boosts: 0,
    taps: 0,
    uselessTaps: 0,
    idleSeconds: 0,
    hour: 12,
    tab: 'number',
    ...over
  }
}

/** Deterministik PRNG (mulberry32): Math.random hiç kullanılmaz. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ids = (pool: readonly VoiceLine[]): string[] => pool.map((line) => line.id)

const RENDER_CONTEXTS: VoiceContext[] = [
  context(),
  context({ number: D('1e12'), perSecond: D(50), taps: 1500, uselessTaps: 1200, hour: 3 }),
  context({ number: D('1.7e308'), perSecond: D('1e9'), boosts: 23, prestiges: 2, tanim: D(12), idleSeconds: 200 }),
  context({ tab: 'upgrades', hour: 23 })
]

describe('1. basamak havuzu — bütünlük', () => {
  it('120 satır: 110 ticker + 10 sahne, 20 nadir, hepsi benzersiz kimlik', () => {
    expect(RUNG1_LINES).toHaveLength(120)
    expect(RUNG1_LINES.filter((line) => line.channel === 'ticker')).toHaveLength(110)
    expect(RUNG1_LINES.filter((line) => line.channel === 'scene')).toHaveLength(10)
    expect(RUNG1_LINES.filter((line) => line.rare === true)).toHaveLength(20)
    expect(new Set(ids(RUNG1_LINES)).size).toBe(120)
  })

  it('her sahne mandallıdır (S3): latch olmayan sahne yok', () => {
    for (const line of RUNG1_LINES.filter((candidate) => candidate.channel === 'scene')) {
      expect(line.latch, line.id).toBe(true)
    }
  })

  it('sahne satırları iki ritim taşır (V5): tam birer satır sonu, ticker metinleri tek satır', () => {
    for (const line of RUNG1_LINES) {
      const text = lineText(line, context({ number: D('1e6'), boosts: 3, uselessTaps: 2000 }))
      if (line.channel === 'scene') {
        expect(text.split('\n'), line.id).toHaveLength(2)
      } else {
        expect(text.includes('\n'), line.id).toBe(false)
      }
    }
  })

  it('nadir satırların hepsi ticker kanalındadır (sahne nadir olmaz)', () => {
    for (const line of RUNG1_LINES.filter((candidate) => candidate.rare)) {
      expect(line.channel, line.id).toBe('ticker')
    }
  })

  it('2. basamak henüz yazılmadı (E5): havuz boş döner', () => {
    expect(linesForRung(2)).toEqual([])
    expect(linesForRung(99)).toEqual([])
  })
})

describe('kural testi — ses sözleşmesi (V1/V2, P3)', () => {
  it('hiçbir satırda ünlem işareti yok', () => {
    for (const line of RUNG1_LINES) {
      for (const ctx of RENDER_CONTEXTS) {
        expect(lineText(line, ctx), line.id).not.toContain('!')
      }
    }
  })

  it('hiçbir satır kurum dili taşımaz (SİCİL / Registry / sicil)', () => {
    for (const line of RUNG1_LINES) {
      for (const ctx of RENDER_CONTEXTS) {
        const text = lineText(line, ctx).toLowerCase()
        expect(text, line.id).not.toContain('sicil')
        expect(text, line.id).not.toContain('registry')
        expect(text, line.id).not.toContain('bureau')
      }
    }
  })

  it('tüm metinler İngilizce yazılır: yalnız ASCII (Türkçe karakter yok)', () => {
    for (const line of RUNG1_LINES) {
      for (const ctx of RENDER_CONTEXTS) {
        const text = lineText(line, ctx)
        expect(text, line.id).toMatch(/^[\x20-\x7E\n]+$/)
        expect(text.trim().length, line.id).toBeGreaterThan(0)
      }
    }
  })

  it('satır metinleri bağlama göre kurulabilir (dinamik metin yolu)', () => {
    const dynamic = RUNG1_LINES.find((line) => line.id === 'r1_tap_5')
    expect(dynamic).toBeDefined()
    expect(lineText(dynamic as VoiceLine, context({ taps: 1500 }))).toContain('1500')
  })
})

describe('(a) filtre doğru mu', () => {
  it('yalnız ticker kanalı ve koşulu geçen satırlar gelir', () => {
    const pool = availableTickerLines(context(), [])
    const poolIds = ids(pool)
    expect(pool.every((line) => line.channel === 'ticker')).toBe(true)
    expect(poolIds).toContain('r1_open_1')
    expect(poolIds).not.toContain('r1_m_1')
    expect(poolIds).not.toContain('r1_scene_open')
    expect(poolIds).not.toContain('r1_gate_1')
  })

  it('sayı bandı değişince havuz değişir', () => {
    const early = ids(availableTickerLines(context({ number: D(10) }), []))
    const mid = ids(availableTickerLines(context({ number: D('5e6'), perSecond: D(5) }), []))
    expect(early).toContain('r1_open_1')
    expect(mid).not.toContain('r1_open_1')
    expect(mid).toContain('r1_m_1')
    expect(mid).not.toContain('r1_t_1')
    const late = ids(availableTickerLines(context({ number: D('1e200') }), []))
    expect(late).toContain('r1_h_2')
    expect(late).not.toContain('r1_s_1')
  })

  it('seen listesindeki kimlikler havuza girmez; pencere dışı serbest kalır', () => {
    const ctx = context()
    const history = ['r1_open_1', 'r1_open_2', 'r1_open_3']
    const poolIds = ids(availableTickerLines(ctx, history))
    expect(poolIds).not.toContain('r1_open_1')
    expect(poolIds).not.toContain('r1_open_3')
    // Pencere 2: yalnız ilk iki kimlik dışlanır.
    const wide = ids(availableTickerLines(ctx, history, 2))
    expect(wide).not.toContain('r1_open_1')
    expect(wide).toContain('r1_open_3')
    // Pencere 0: dışlama yok (geri çekilmenin son basamağı).
    expect(ids(availableTickerLines(ctx, history, 0))).toContain('r1_open_1')
  })

  it('eligibleTickerLines gösterim geçmişini yok sayar', () => {
    const ctx = context()
    const all = ids(eligibleTickerLines(ctx))
    expect(all).toEqual(ids(linesForRung(1).filter((line) => line.channel === 'ticker' && (!line.when || line.when(ctx)))))
  })
})

describe('(b) nadir satır ~10× seyrek mi', () => {
  const normalPool: VoiceLine[] = Array.from({ length: 40 }, (_, i) => ({
    id: 'n' + i,
    channel: 'ticker',
    text: 'normal ' + i
  }))
  const rarePool: VoiceLine[] = Array.from({ length: 10 }, (_, i) => ({
    id: 'r' + i,
    channel: 'ticker',
    text: 'rare ' + i,
    rare: true
  }))
  const pool = normalPool.concat(rarePool)

  it('ağırlık oranı tam 0,1: beklenen nadir payı 1/41', () => {
    const random = seeded(20261023)
    const draws = 100_000
    let rareHits = 0
    for (let i = 0; i < draws; i++) {
      const line = selectFromPool(pool, [], random)
      if (line && line.rare) rareHits += 1
    }
    const observed = rareHits / draws
    const expected = (10 * RARE_WEIGHT) / (40 + 10 * RARE_WEIGHT)
    expect(observed).toBeCloseTo(expected, 3)
    expect(Math.abs(observed - expected)).toBeLessThan(0.004)
  })

  it('tek bir nadir satır, tek bir normal satırdan ~10× seyrek seçilir', () => {
    const random = seeded(777)
    const draws = 100_000
    const counts = new Map<string, number>()
    for (let i = 0; i < draws; i++) {
      const line = selectFromPool(pool, [], random)
      if (line) counts.set(line.id, (counts.get(line.id) ?? 0) + 1)
    }
    const perNormal = (counts.get('n0') ?? 0) / draws
    const perRare = (counts.get('r0') ?? 0) / draws
    expect(perRare).toBeGreaterThan(0)
    expect(perRare / perNormal).toBeCloseTo(RARE_WEIGHT, 1)
  })

  it('gerçek havuzda da oran formülü tutar (bağlam: 1e6)', () => {
    const ctx = context({ number: D('1e6'), perSecond: D(100) })
    const eligible = eligibleTickerLines(ctx)
    const rareCount = eligible.filter((line) => line.rare).length
    const normalCount = eligible.length - rareCount
    const expected = (rareCount * RARE_WEIGHT) / (normalCount + rareCount * RARE_WEIGHT)
    const random = seeded(4242)
    let rareHits = 0
    const draws = 50_000
    for (let i = 0; i < draws; i++) {
      const line = selectFromPool(eligible, [], random)
      if (line && line.rare) rareHits += 1
    }
    const share = rareHits / draws
    expect(share).toBeGreaterThan(0)
    expect(Math.abs(share - expected)).toBeLessThan(0.01)
    expect(share).toBeLessThan(0.2)
  })

  it('her temsili bağlamda havuz yeterince derin (bant ölmez)', () => {
    const contexts: VoiceContext[] = [
      context({ number: D(10) }),
      context({ number: D('5e4'), perSecond: D(3), taps: 40 }),
      context({ number: D('1e6'), perSecond: D(100) }),
      context({ number: D('1e9'), perSecond: D('1e4'), taps: 600, uselessTaps: 200 }),
      context({ number: D('1e20'), perSecond: D('1e8'), hour: 3 }),
      context({ number: D('1e80'), perSecond: D('1e20'), boosts: 4, prestiges: 1, tanim: D(3) }),
      context({ number: D('1.7e308'), perSecond: D('1e40'), boosts: 23, prestiges: 2, tanim: D(9) })
    ]
    for (const ctx of contexts) {
      const depth = eligibleTickerLines(ctx).length
      expect(depth, 'havuz derinliği: ' + depth + ' @ ' + ctx.number.toString()).toBeGreaterThanOrEqual(12)
    }
  })
})

describe('(c) seen listesi tekrarı engelliyor mu', () => {
  it('son 8 gösterimde aynı satır iki kez görünmez (gerçek havuz, 400 tur)', () => {
    const ctx = context({ number: D('1e6'), perSecond: D(100), taps: 60, idleSeconds: 10 })
    const random = seeded(9)
    let seen: string[] = []
    const history: string[] = []
    for (let i = 0; i < 400; i++) {
      const line = pickTickerLine(ctx, seen, random)
      if (!line) continue
      const window = history.slice(-RECENT_WINDOW)
      expect(window, 'tekrar: ' + line.id).not.toContain(line.id)
      history.push(line.id)
      seen = [line.id].concat(seen.filter((id) => id !== line.id)).slice(0, RECENT_WINDOW)
    }
    expect(history.length).toBeGreaterThan(300)
  })

  it('küçük havuzda (12 satır) da kural korunur', () => {
    const pool: VoiceLine[] = Array.from({ length: 12 }, (_, i) => ({
      id: 'p' + i,
      channel: 'ticker',
      text: 'line ' + i
    }))
    const random = seeded(31)
    let seen: string[] = []
    const history: string[] = []
    for (let i = 0; i < 60; i++) {
      const line = selectFromPool(pool, seen, random)
      expect(line).not.toBeNull()
      const id = (line as VoiceLine).id
      expect(history.slice(-RECENT_WINDOW)).not.toContain(id)
      history.push(id)
      seen = [id].concat(seen.filter((other) => other !== id)).slice(0, RECENT_WINDOW)
    }
  })

  it('havuz pencereden küçükse bant ölmez: geri çekilme devreye girer', () => {
    const pool: VoiceLine[] = [
      { id: 'q0', channel: 'ticker', text: 'zero' },
      { id: 'q1', channel: 'ticker', text: 'one' }
    ]
    const random = seeded(5)
    const seen = ['q1', 'q0', 'q1', 'q0', 'q1', 'q0', 'q1', 'q0']
    const picks = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const line = selectFromPool(pool, seen, random)
      expect(line).not.toBeNull()
      picks.add((line as VoiceLine).id)
    }
    expect(picks.size).toBe(2)
  })

  it('boş havuz null döner', () => {
    expect(selectFromPool([], [], seeded(1))).toBeNull()
    expect(pickTickerLine(context({ rung: 2 }), [], () => 0.9)).toBeNull()
  })
})

describe('(d) sessizlik dönüşü null mu (T4)', () => {
  it('random < SILENCE_CHANCE ise satır yok', () => {
    expect(pickTickerLine(context(), [], () => 0)).toBeNull()
    expect(pickTickerLine(context(), [], () => SILENCE_CHANCE - 1e-9)).toBeNull()
  })

  it('eşiğin üstünde konuşur', () => {
    const line = pickTickerLine(context(), [], () => SILENCE_CHANCE + 1e-9)
    expect(line).not.toBeNull()
  })

  it('sessizlik oranı SILENCE_CHANCE ile uyuşur (10.000 tur)', () => {
    const random = seeded(2026)
    const draws = 10_000
    let silent = 0
    for (let i = 0; i < draws; i++) {
      if (pickTickerLine(context(), [], random) === null) silent += 1
    }
    expect(silent / draws).toBeCloseTo(SILENCE_CHANCE, 1)
    expect(Math.abs(silent / draws - SILENCE_CHANCE)).toBeLessThan(0.02)
  })
})

describe('bağlam anahtarları gerçekten kullanılıyor (V3)', () => {
  const cases: Array<[string, VoiceContext, VoiceContext]> = [
    ['number', context({ number: D(10) }), context({ number: D('1e13') })],
    ['idleSeconds', context({ idleSeconds: 0 }), context({ idleSeconds: 200, perSecond: D(5) })],
    ['taps', context({ taps: 0 }), context({ taps: 600 })],
    ['uselessTaps', context({ uselessTaps: 0 }), context({ uselessTaps: 2000 })],
    ['hour', context({ hour: 12 }), context({ hour: 3 })],
    ['boosts', context({ boosts: 0 }), context({ boosts: 12 })],
    ['prestiges', context({ prestiges: 0 }), context({ prestiges: 2 })],
    ['tab', context({ tab: 'number' }), context({ tab: 'upgrades' })],
    ['perSecond', context({ perSecond: D(0) }), context({ perSecond: D('1e7') })]
  ]

  it('her anahtar havuğu değiştirir', () => {
    for (const [name, a, b] of cases) {
      const left = new Set(ids(availableTickerLines(a, [])))
      const right = new Set(ids(availableTickerLines(b, [])))
      const differs =
        left.size !== right.size || Array.from(left).some((id) => !right.has(id))
      expect(differs, 'anahtar kullanılmıyor: ' + name).toBe(true)
    }
  })
})

describe('sahne kanalı (S3 mandal)', () => {
  it('koşul geçmeyen sahne havuza girmez', () => {
    const early = ids(availableSceneLines(context({ number: D(10) }), []))
    expect(early).toContain('r1_scene_open')
    expect(early).not.toContain('r1_scene_m')
    const mid = ids(availableSceneLines(context({ number: D('1e6') }), []))
    expect(mid).toContain('r1_scene_m')
    expect(mid).not.toContain('r1_scene_gate')
  })

  it('mandallı sahne ikinci kez dönmez', () => {
    const ctx = context({ number: D('1e6') })
    expect(pickSceneLine(1, [], 'r1_scene_m', ctx)).not.toBeNull()
    expect(pickSceneLine(1, ['r1_scene_m'], 'r1_scene_m', ctx)).toBeNull()
    expect(pickSceneLine(1, [], 'r1_scene_yok', ctx)).toBeNull()
  })

  it('koşul sağlanmadan sahne oynamaz', () => {
    expect(pickSceneLine(1, [], 'r1_scene_gate', context({ number: D(10) }))).toBeNull()
    expect(pickSceneLine(1, [], 'r1_scene_gate', context({ number: D('1.75e308') }))).not.toBeNull()
  })
})
