import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import {
  advance,
  blockFactor,
  buyRing,
  checkGate,
  maxAll,
  createNumberState,
  decayMultiplier,
  directNumberPerSecond,
  feedMultiplier,
  numberPerSecond,
  ringBlockPrice,
  ringCost,
  ringGainPerSecond,
  ringNumberRate,
  ringProductionMultiplier
} from './economy'
import {
  CHALLENGES,
  activeChallenge,
  challengeById,
  challengeGoalLog,
  challengeProgress,
  completeChallengeIfReady,
  createChallengeState,
  enterChallenge,
  exitChallenge,
  isChallengeUnlocked,
  nextChallenge
} from './challenges'

/**
 * Rung 1 mücadele katmanı testleri — v2 / 190 dk kalibrasyonu.
 *
 * Bağlayıcı kaynak: brain/scratchpad/rung-1-implementation-contract.md §1–3.
 *
 * Kapsam sözleşmesi:
 *   · her ceza en az bir kez (fingersCap · price145 · directOff · decay ·
 *     firstFive · feedFifth · newestOnly · price135feedHalf)
 *   · her ödül en az bir kez (fingers10 · all5 · all3 · first3x5 ·
 *     direct5 · feed15 · all4 · finisher)
 *   · blok çarpanı Fingers ve doğrudan paya girer, BESLEMEYE GİRMEZ
 *   · giriş / çıkış / tamamlama sayıyı ve alımları KORUR
 *   · hedef = max(plan hedefi, giriş + delta) — girişte kilitlenir
 *   · kapı geçişi mandalı · maxAll en derin halkadan blok blok
 */

/** Sayı ve halka durumunu tek satırda karşılaştırmak için anlık görüntü. */
function snapshot(state: ReturnType<typeof createNumberState>) {
  return {
    number: state.number.toString(),
    best: state.bestNumber.toString(),
    bought: state.rings.map((r) => r.bought),
    amounts: state.rings.map((r) => r.amount.toString()),
    totalBuys: state.totalBuys,
    unlocked: [...state.unlocked]
  }
}

describe('mücadele tanımları — v2 kalibrasyonu', () => {
  it('8 mücadele, C1..C8 sırasıyla ve kalibre edilmiş hedeflerle', () => {
    expect(CHALLENGES).toHaveLength(8)
    expect(CHALLENGES.map((def) => def.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'])
    expect(CHALLENGES.map((def) => def.goalLog10)).toEqual([
      33.242, 37.376, 95.157, 104.688, 119.334, 122.271, 125.573, 128.967
    ])
  })

  it('kilit eşikleri hedef zincirine bağlıdır (C_n kilidi = C_{n-1} hedefi)', () => {
    expect(CHALLENGES[0].unlockLog10).toBe(10)
    for (let i = 1; i < CHALLENGES.length; i++) {
      expect(CHALLENGES[i].unlockLog10).toBeCloseTo(CHALLENGES[i - 1].goalLog10, 6)
    }
  })

  it('her mücadelenin ceza ve ödülü tekil (8 farklı ceza, 8 farklı ödül)', () => {
    const penalties = new Set(CHALLENGES.map((def) => def.penalty))
    const rewards = new Set(CHALLENGES.map((def) => def.reward))
    expect(penalties.size).toBe(8)
    expect(rewards.size).toBe(8)
  })

  it('hedef = max(plan hedefi, giriş + delta) ve delta = 2', () => {
    for (const def of CHALLENGES) expect(def.delta).toBe(2)
    const c1 = CHALLENGES[0]
    // Giriş düşükse plan hedefi kazanır.
    expect(challengeGoalLog(c1, 10)).toBeCloseTo(33.242, 6)
    // Giriş plan hedefini aşarsa giriş + delta kazanır.
    expect(challengeGoalLog(c1, 40)).toBeCloseTo(42, 6)
    expect(challengeGoalLog(c1, 33)).toBeCloseTo(35, 6)
  })

  it('bilinmeyen kimlik null döner (kayıt temizliği)', () => {
    expect(challengeById('C9')).toBeNull()
    expect(challengeById(null)).toBeNull()
    expect(challengeById('')).toBeNull()
    expect(challengeById('C1')?.id).toBe('C1')
  })
})
describe('mücadele örtüsü — giriş/çıkış/tamamlama sıfırlamaz', () => {
  it('C1 girişi sayıyı, halkaları, alımları ve blok çarpanını birebir korur', () => {
    const s = createNumberState()
    s.number = D('1e12')
    buyRing(s, 0, 20)
    s.rings[1].amount = D(7)
    const before = snapshot(s)
    expect(enterChallenge(s, 'C1')).toBe(true)
    expect(snapshot(s)).toEqual(before)
    expect(s.challenges.active).toBe('C1')
  })

  it('kilitli mücadeleye girilmez, aktifken ikinci giriş reddedilir', () => {
    const s = createNumberState()
    s.number = D('1e12')
    expect(enterChallenge(s, 'C2')).toBe(false)
    expect(s.challenges.active).toBeNull()
    expect(enterChallenge(s, 'C1')).toBe(true)
    expect(enterChallenge(s, 'C1')).toBe(false)
    expect(enterChallenge(s, 'C2')).toBe(false)
  })

  it('tamamlanmış mücadeleye yeniden girilmez (mandal)', () => {
    const s = createNumberState()
    s.number = D('1e40')
    s.challenges.completed = ['C1']
    expect(enterChallenge(s, 'C1')).toBe(false)
  })

  it('bilinmeyen kimlikle giriş reddedilir', () => {
    const s = createNumberState()
    s.number = D('1e40')
    expect(enterChallenge(s, 'C99')).toBe(false)
    expect(s.challenges.active).toBeNull()
  })

  it('çıkış cezayı kaldırır, sayı ve alımlar aynı kalır', () => {
    const s = createNumberState()
    s.number = D('1e12')
    buyRing(s, 0, 10)
    enterChallenge(s, 'C1')
    const inside = snapshot(s)
    s.number = D('1e20')
    expect(challengeProgress(s)).toBeGreaterThan(0)
    exitChallenge(s)
    expect(s.challenges.active).toBeNull()
    expect(s.challenges.goalLog10).toBeNull()
    expect(s.challenges.entryLog10).toBeNull()
    // Sayı yalnız büyüdü; alımlar, halkalar ve kilitler değişmedi.
    expect(s.number.gte(D(inside.number))).toBe(true)
    expect(s.rings[0].bought).toBe(inside.bought[0])
    expect(s.challenges.completed).toHaveLength(0)
  })

  it('hedefe varınca tamamlanır: sayı korunur, ödül kalıcı, örtü kalkar', () => {
    const s = createNumberState()
    // Önce alım (fiyat sayıdan düşer), SONRA eşiğin üstüne çık: 1e12 - 649 ≈ 1e10.
    s.number = D('1e12')
    expect(buyRing(s, 0, 10)).toBe(10)
    s.number = D('1e11')
    expect(enterChallenge(s, 'C1')).toBe(true)
    s.number = D('1e35')
    const completed = completeChallengeIfReady(s)
    expect(completed?.id).toBe('C1')
    expect(s.number.toString()).toBe(D('1e35').toString())
    expect(s.rings[0].bought).toBe(10)
    expect(s.challenges.completed).toEqual(['C1'])
    expect(s.challenges.active).toBeNull()
    // Ödül kalıcıdır: örtü kalktıktan sonra da çarpan duruyor.
    expect(ringProductionMultiplier(s, 0)).toBe(10)
  })

  it('hedefin altında tamamlanmaz; aktif mücadele yoksa null döner', () => {
    const s = createNumberState()
    s.number = D('1e12')
    enterChallenge(s, 'C1')
    s.number = D('1e20')
    expect(completeChallengeIfReady(s)).toBeNull()
    expect(s.challenges.active).toBe('C1')
    exitChallenge(s)
    s.number = D('1e40')
    expect(completeChallengeIfReady(s)).toBeNull()
    expect(s.challenges.completed).toHaveLength(0)
  })

  it('girişte hedef kilitlenir: sonradan sayı artsa da hedef değişmez', () => {
    const s = createNumberState()
    s.number = D('1e11')
    enterChallenge(s, 'C1')
    const goal = s.challenges.goalLog10
    expect(goal).toBeCloseTo(33.242, 6)
    s.number = D('1e50')
    expect(s.challenges.goalLog10).toBe(goal)
  })

  it('giriş ilerlemesi 0 ile 100 arasında ve monoton', () => {
    const s = createNumberState()
    s.number = D('1e11')
    enterChallenge(s, 'C1')
    expect(challengeProgress(s)).toBeCloseTo(0, 6)
    s.number = D('1e22') // giriş 11, hedef 33,242 → yaklaşık yarısı
    const mid = challengeProgress(s)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(100)
    s.number = D('1e34')
    expect(challengeProgress(s)).toBe(100)
  })
})
describe('mücadele cezaları — sekizi de', () => {
  it('fingersCap (C1): Fingers 10 alımda durur, mevcut üretim sayılmaya devam eder', () => {
    const s = createNumberState()
    s.number = D('1e30')
    enterChallenge(s, 'C1')
    expect(buyRing(s, 0, 25)).toBe(10)
    expect(s.rings[0].bought).toBe(10)
    s.number = D('1e300')
    expect(buyRing(s, 0, 1)).toBe(0)
    expect(s.rings[0].bought).toBe(10)
    // Mevcut üretim durmaz: 10 parmak × blok çarpanı hâlâ sayı üretir.
    expect(numberPerSecond(s).gt(0)).toBe(true)
    // Diğer halkalar etkilenmez.
    expect(buyRing(s, 1, 1)).toBe(1)
  })

  it('price145 (C2): fiyat artışı 1,45 olur, çıkınca 1,20ye döner', () => {
    const s = createNumberState()
    s.number = D('1e34')
    s.unlocked = s.unlocked.map(() => true)
    const base = D(200)
    expect(ringCost(s, 1).div(base).toNumber()).toBeCloseTo(1, 9)
    enterChallenge(s, 'C2')
    expect(ringCost(s, 1).div(base).toNumber()).toBeCloseTo(1, 9)
    buyRing(s, 1, 1)
    expect(ringCost(s, 1).div(base).toNumber()).toBeCloseTo(1.45, 6)
    const blockInChallenge = ringBlockPrice(s, 1, 10)
    exitChallenge(s)
    expect(ringCost(s, 1).div(base).toNumber()).toBeCloseTo(1.2, 6)
    expect(ringBlockPrice(s, 1, 10).lt(blockInChallenge)).toBe(true)
  })

  it('directOff (C3): doğrudan katkı sıfırlanır, Fingers üretimi devam eder', () => {
    const s = createNumberState()
    s.rings[1].amount = D(1)
    s.rings[1].bought = 10
    s.number = D('1e38')
    expect(directNumberPerSecond(s).gt(0)).toBe(true)
    enterChallenge(s, 'C3')
    expect(directNumberPerSecond(s).toString()).toBe('0')
    expect(ringNumberRate(s, 1).toString()).toBe('0')
    s.rings[0].amount = D(5)
    expect(ringGainPerSecond(s, 0).gt(0)).toBe(true)
    expect(numberPerSecond(s).gt(0)).toBe(true)
  })

  it('decay (C4): alım yoksa üretim düşer, 20 sn tau, taban 0.1', () => {
    const s = createNumberState()
    s.rings[0].amount = D(100)
    s.number = D('1e96')
    enterChallenge(s, 'C4')
    s.playTime = 100
    s.challenges.lastBuyAt = 100
    expect(decayMultiplier(s)).toBeCloseTo(1, 9)
    s.playTime = 120
    expect(decayMultiplier(s)).toBeCloseTo(Math.exp(-1), 6)
    s.playTime = 300
    expect(decayMultiplier(s)).toBeCloseTo(0.1, 9)
    s.playTime = 5000
    expect(decayMultiplier(s)).toBeCloseTo(0.1, 9)
    s.challenges.lastBuyAt = 5000
    expect(decayMultiplier(s)).toBeCloseTo(1, 9)
  })

  it('firstFive (C5): 5-7. halkalar alınamaz, mevcut üretim sayılır', () => {
    const s = createNumberState()
    s.number = D('1e121')
    s.unlocked = s.unlocked.map(() => true)
    s.rings[6].amount = D(10)
    s.rings[6].bought = 10
    enterChallenge(s, 'C5')
    for (const i of [5, 6, 7]) {
      expect(buyRing(s, i, 1)).toBe(0)
      expect(buyRing(s, i, 10)).toBe(0)
      expect(ringBlockPrice(s, i, 10).gt(0)).toBe(true)
    }
    for (const i of [0, 1, 2, 3, 4]) expect(buyRing(s, i, 1)).toBe(1)
    expect(ringNumberRate(s, 6).gt(0)).toBe(true)
  })

  it('feedFifth (C6): besleme /5, global 0,2 ile birlikte /25', () => {
    const s = createNumberState()
    s.number = D('1e120')
    expect(feedMultiplier(s)).toBeCloseTo(1, 12)
    enterChallenge(s, 'C6')
    expect(feedMultiplier(s)).toBeCloseTo(0.2 / 5, 12)
    s.rings[1].amount = D(1)
    advance(s, 1)
    expect(s.rings[0].amount.toNumber()).toBeCloseTo(0.11 * 0.04, 9)
  })

  it('newestOnly (C7): yalnız son alınan halka tam hızda, diğerleri x0.25', () => {
    const s = createNumberState()
    s.number = D('1e123')
    enterChallenge(s, 'C7')
    s.challenges.lastBoughtRing = 3
    expect(ringProductionMultiplier(s, 3)).toBeCloseTo(1, 9)
    for (const i of [0, 1, 2, 4, 5, 6, 7]) {
      expect(ringProductionMultiplier(s, i)).toBeCloseTo(0.25, 9)
    }
    s.challenges.lastBoughtRing = -1
    expect(ringProductionMultiplier(s, 0)).toBeCloseTo(1, 9)
  })

  it('price135feedHalf (C8): fiyat 1,35, besleme /2 (global 0,2 ile /10)', () => {
    const s = createNumberState()
    s.number = D('1e250')
    s.unlocked = s.unlocked.map(() => true)
    enterChallenge(s, 'C8')
    const base = ringCost(s, 7)
    buyRing(s, 7, 1)
    expect(ringCost(s, 7).div(base).toNumber()).toBeCloseTo(1.35, 6)
    expect(feedMultiplier(s)).toBeCloseTo(0.2 / 2, 12)
  })
})
describe('mücadele ödülleri — sekizi de kalıcı', () => {
  it('fingers10 (C1): Fingers x10, besleme x1.5', () => {
    const s = createNumberState()
    s.challenges.completed = ['C1']
    expect(ringProductionMultiplier(s, 0)).toBe(10)
    expect(ringProductionMultiplier(s, 1)).toBe(1)
    expect(feedMultiplier(s)).toBeCloseTo(1.5, 12)
  })

  it('all5 (C2): tüm halkalar x5', () => {
    const s = createNumberState()
    s.challenges.completed = ['C2']
    for (let i = 0; i < 8; i++) expect(ringProductionMultiplier(s, i)).toBe(5)
    expect(feedMultiplier(s)).toBeCloseTo(1, 12)
  })

  it('all3 (C3): tüm halkalar x3', () => {
    const s = createNumberState()
    s.challenges.completed = ['C3']
    for (let i = 0; i < 8; i++) expect(ringProductionMultiplier(s, i)).toBe(3)
  })

  it('first3x5 (C4): yalnız 0-2. halkalar x5', () => {
    const s = createNumberState()
    s.challenges.completed = ['C4']
    for (let i = 0; i < 3; i++) expect(ringProductionMultiplier(s, i)).toBe(5)
    for (let i = 3; i < 8; i++) expect(ringProductionMultiplier(s, i)).toBe(1)
  })

  it('direct5 (C5): 1-7. halkalar x5, besleme x1.5', () => {
    const s = createNumberState()
    s.challenges.completed = ['C5']
    expect(ringProductionMultiplier(s, 0)).toBe(1)
    for (let i = 1; i < 8; i++) expect(ringProductionMultiplier(s, i)).toBe(5)
    expect(feedMultiplier(s)).toBeCloseTo(1.5, 12)
  })

  it('feed15 (C6): yalnız besleme x1.5 (üretime dokunmaz)', () => {
    const s = createNumberState()
    s.challenges.completed = ['C6']
    expect(feedMultiplier(s)).toBeCloseTo(1.5, 12)
    for (let i = 0; i < 8; i++) expect(ringProductionMultiplier(s, i)).toBe(1)
  })

  it('all4 (C7): tüm halkalar x4', () => {
    const s = createNumberState()
    s.challenges.completed = ['C7']
    for (let i = 0; i < 8; i++) expect(ringProductionMultiplier(s, i)).toBe(4)
  })

  it('finisher (C8): üretim x2 — eski 1.15 fiyat tabanlı değer DEĞİL', () => {
    const s = createNumberState()
    s.challenges.completed = ['C8']
    for (let i = 0; i < 8; i++) expect(ringProductionMultiplier(s, i)).toBe(2)
    expect(feedMultiplier(s)).toBeCloseTo(1, 12)
  })

  it('ödüller çarpışır: C1..C8 birlikte Fingers 10x5x3x5x4x2 = 6000', () => {
    const s = createNumberState()
    s.challenges.completed = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']
    // Fingers: C1 10 · C2 5 · C3 3 · C4 5 (0-2) · C5 1 (0 hariç) · C7 4 · C8 2
    expect(ringProductionMultiplier(s, 0)).toBe(10 * 5 * 3 * 5 * 4 * 2)
    // Halka 7: C2 5 · C3 3 · C5 5 · C7 4 · C8 2 (C4 ve C1 yok)
    expect(ringProductionMultiplier(s, 7)).toBe(5 * 3 * 5 * 4 * 2)
    // Besleme: C1 · C5 · C6 = 1,5^3
    expect(feedMultiplier(s)).toBeCloseTo(1.5 ** 3, 12)
  })
})
describe('blok çarpanı — 5,5 ^ floor(bought / 10)', () => {
  it('10 alımda bir kademe atlar, kademe içinde sabit kalır', () => {
    expect(blockFactor(0).toNumber()).toBe(1)
    expect(blockFactor(9).toNumber()).toBe(1)
    expect(blockFactor(10).toNumber()).toBeCloseTo(5.5, 9)
    expect(blockFactor(19).toNumber()).toBeCloseTo(5.5, 9)
    expect(blockFactor(20).toNumber()).toBeCloseTo(30.25, 9)
    expect(blockFactor(30).toNumber()).toBeCloseTo(166.375, 9)
  })

  it('geçersiz girdide güvenli: negatif ve NaN -> 1', () => {
    expect(blockFactor(-5).toNumber()).toBe(1)
    expect(blockFactor(Number.NaN).toNumber()).toBe(1)
    expect(blockFactor(Number.POSITIVE_INFINITY).toNumber()).toBe(1)
  })

  it('Fingers üretimine girer: 9 vs 10 alım tam 5,5 kat', () => {
    const a = createNumberState()
    const b = createNumberState()
    a.rings[0].amount = D(1)
    b.rings[0].amount = D(1)
    a.rings[0].bought = 9
    b.rings[0].bought = 10
    expect(numberPerSecond(b).div(numberPerSecond(a)).toNumber()).toBeCloseTo(5.5, 9)
  })

  it('doğrudan paya girer: halka 3 için 9 vs 10 alım tam 5,5 kat', () => {
    const a = createNumberState()
    const b = createNumberState()
    a.rings[3].amount = D(1)
    b.rings[3].amount = D(1)
    a.rings[3].bought = 9
    b.rings[3].bought = 10
    expect(directNumberPerSecond(b).div(directNumberPerSecond(a)).toNumber()).toBeCloseTo(5.5, 9)
  })

  it('BESLEMEYE girmez: 9 ve 10 alımlı halka aynı hızda besler', () => {
    const a = createNumberState()
    const b = createNumberState()
    a.rings[1].amount = D(1)
    b.rings[1].amount = D(1)
    a.rings[1].bought = 9
    b.rings[1].bought = 10
    a.rings[0].amount = D(0)
    b.rings[0].amount = D(0)
    advance(a, 1)
    advance(b, 1)
    expect(a.rings[0].amount.toString()).toBe(b.rings[0].amount.toString())
    expect(ringGainPerSecond(a, 1).toString()).toBe(ringGainPerSecond(b, 1).toString())
  })

  it('advance blok çarpanını Fingers üretiminde kullanır (sayı 5,5 kat hızlı büyür)', () => {
    const a = createNumberState()
    const b = createNumberState()
    a.number = D(0)
    b.number = D(0)
    a.rings[0].amount = D(1)
    b.rings[0].amount = D(1)
    a.rings[0].bought = 9
    b.rings[0].bought = 10
    advance(a, 1)
    advance(b, 1)
    expect(b.number.div(a.number).toNumber()).toBeCloseTo(5.5, 9)
  })
})

describe('kapı geçişi — 1.79e308 mandalı', () => {
  it('eşiğin altında açılmaz', () => {
    const s = createNumberState()
    s.number = D('1.78e308')
    expect(checkGate(s)).toBe(false)
    expect(s.gateReached).toBe(false)
  })

  it('eşiğe varınca bir kez açılır ve mandal kalır', () => {
    const s = createNumberState()
    s.number = D('1.79e308')
    expect(checkGate(s)).toBe(true)
    expect(s.gateReached).toBe(true)
    expect(checkGate(s)).toBe(false)
  })

  it('sayı sonradan düşse de mandal geri gitmez', () => {
    const s = createNumberState()
    s.number = D('1e309')
    expect(checkGate(s)).toBe(true)
    s.number = D(100)
    expect(checkGate(s)).toBe(false)
    expect(s.gateReached).toBe(true)
  })
})
describe('maxAll — en derin halkadan blok blok', () => {
  it('en derin açık halkadan başlar ve her halkada 10lu blok alır', () => {
    const s = createNumberState()
    s.number = D('1e12')
    const total = maxAll(s)
    expect(total).toBeGreaterThan(0)
    expect(s.totalBuys).toBe(total)
    // Hiçbir halkada yarım blok kalmaz: tüm alımlar 10'un katı (0 dahil).
    for (const ring of s.rings) expect(ring.bought % 10).toBe(0)
    // En derin halka (7) 1e12 bütçesinde erişilebilir hâle gelmiş olmalı.
    expect(s.rings[7].bought).toBeGreaterThan(0)
  })

  it('bütçeyi aşmaz: hiçbir alım negatif sayı bırakmaz', () => {
    const s = createNumberState()
    s.number = D('1e6')
    maxAll(s)
    expect(s.number.gte(0)).toBe(true)
  })

  it('bütçe yoksa hiçbir şey almaz', () => {
    const s = createNumberState()
    s.number = D(10)
    expect(maxAll(s)).toBe(0)
    expect(s.totalBuys).toBe(0)
  })

  it('derin halkaya öncelik verir (alt halka sonra tamamlanır)', () => {
    const s = createNumberState()
    // Tam 7. halkanın bir bloğuna yetecek, 0. halkanın bloğuna yetmeyecek kadar.
    s.unlocked = s.unlocked.map(() => true)
    const price7 = ringBlockPrice(s, 7, 10)
    s.number = price7
    const total = maxAll(s)
    expect(total).toBe(10)
    expect(s.rings[7].bought).toBe(10)
    expect(s.rings[0].bought).toBe(0)
  })

  it('mücadele cezası blok alımını da engeller (C1 Fingers 10 alımda durur)', () => {
    const s = createNumberState()
    s.number = D('1e30')
    enterChallenge(s, 'C1')
    maxAll(s)
    expect(s.rings[0].bought).toBe(10)
    expect(s.rings[1].bought).toBeGreaterThan(0)
  })
})

describe('nextChallenge ve kilit durumu', () => {
  it('sıradaki tamamlanmamış mücadeleyi verir', () => {
    const s = createNumberState()
    expect(nextChallenge(s)?.id).toBe('C1')
    s.challenges.completed = ['C1', 'C2']
    expect(nextChallenge(s)?.id).toBe('C3')
  })
  it('hepsi bittiğinde null döner', () => {
    const s = createNumberState()
    s.challenges.completed = CHALLENGES.map((def) => def.id)
    expect(nextChallenge(s)).toBeNull()
  })
  it('kilit sayı eşiğine bağlıdır, tamamlanmışsa kapalıdır', () => {
    const s = createNumberState()
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
    s.number = D('1e10')
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(true)
    s.challenges.completed = ['C1']
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
  })
  it('boş mücadele durumu doğru başlar', () => {
    const state = createChallengeState()
    expect(state.completed).toEqual([])
    expect(state.active).toBeNull()
    expect(state.entryLog10).toBeNull()
    expect(state.goalLog10).toBeNull()
    expect(state.lastBuyAt).toBe(0)
  })
  it('activeChallenge aktif kimliği çözer', () => {
    const s = createNumberState()
    expect(activeChallenge(s)).toBeNull()
    s.number = D('1e12')
    enterChallenge(s, 'C1')
    expect(activeChallenge(s)?.id).toBe('C1')
  })
})
describe('tam koşu — gerçek motor, 190 dk kalibrasyonu', () => {
  it('260 dk sınırında 8 mücadele biter ve kapıya ulaşır, sayı sıfırlanmaz', () => {
    const s = createNumberState()
    const dt = 0.5
    let seconds = 0
    let tapAcc = 0
    let previous = D(0)
    let monotoneBreaks = 0
    const limit = 260 * 60
    while (seconds < limit && !s.gateReached) {
      s.playTime = seconds
      previous = s.number
      advance(s, dt)
      seconds += dt
      // Sıfırlama yok: alım öncesi sayı asla eskisinden küçük olamaz.
      if (s.number.lt(previous)) monotoneBreaks++
      tapAcc += dt
      while (tapAcc >= 0.5) {
        tapAcc -= 0.5
        s.number = s.number.plus(1)
        if (s.number.gt(s.bestNumber)) s.bestNumber = s.number
      }
      completeChallengeIfReady(s)
      if (!s.challenges.active) {
        const next = nextChallenge(s)
        if (next && isChallengeUnlocked(s, next)) enterChallenge(s, next.id)
      }
      maxAll(s)
      checkGate(s)
    }
    expect(monotoneBreaks).toBe(0)
    expect(s.challenges.completed).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'])
    expect(s.gateReached).toBe(true)
    expect(s.challenges.active).toBeNull()
    const minutes = seconds / 60
    expect(minutes).toBeGreaterThan(170)
    expect(minutes).toBeLessThan(210)
    expect(Number.isFinite(s.number.log10().toNumber())).toBe(true)
    expect(s.number.gte(D('1.79e308'))).toBe(true)
  }, 180000)
})