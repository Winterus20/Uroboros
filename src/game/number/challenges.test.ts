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
  ringProductionMultiplier,
  type NumberState
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
 * Rung 1 mücadele katmanı testleri — ADR-0086 (sıfırlamalı koşu).
 *
 * Kapsam sözleşmesi:
 *   · 8 ceza ve 8 ödül en az bir kez ölçülür
 *   · giriş koşuyu sıfırlar: sayı 10, zincir 0, kilitler yalnız Fingers
 *   · kalıcılar korunur: bestNumber, totalBuys, playTime, boostCount, completed
 *   · sıra zorunlu; kilit bestNumber ile açılır (soft-lock yok)
 *   · hedefler MUTLAK; girişteki sayı hedefi kaydırmaz
 *   · tamamlama/çıkış sıfırlanmış koşuyu korur
 *   · blok çarpanı üretime girer, BESLEMEYE girmez
 */

/** Sayı ve halka durumunu tek satırda karşılaştırmak için anlık görüntü. */
function snapshot(state: NumberState) {
  return {
    number: state.number.toString(),
    best: state.bestNumber.toString(),
    bought: state.rings.map((r) => r.bought),
    amounts: state.rings.map((r) => r.amount.toString()),
    totalBuys: state.totalBuys,
    unlocked: [...state.unlocked]
  }
}

/**
 * Mücadeleye gerçek sırayla gir: önceki kimlikler tamamlanmış sayılır, bestNumber
 * eşiğin üstüne çekilir. Giriş koşuyu sıfırladığı için ceza testleri setup'ı
 * girişten SONRA yapar. `completed` varsayılan olarak sıfırlanır ki önceki
 * ödüller ceza ölçümünü kirletmesin.
 */
function enterRun(id: string, isolate = true): NumberState {
  const index = CHALLENGES.findIndex((def) => def.id === id)
  const s = createNumberState()
  s.bestNumber = D(10).pow(CHALLENGES[index].unlockLog10)
  s.boostCount = 4
  s.challenges.completed = CHALLENGES.slice(0, index).map((def) => def.id)
  expect(enterChallenge(s, id)).toBe(true)
  if (isolate) s.challenges.completed = []
  return s
}

describe('mücadele tanımları — ADR-0086', () => {
  it('8 mücadele, C1..C8 sırasıyla ve mutlak hedeflerle', () => {
    expect(CHALLENGES).toHaveLength(8)
    expect(CHALLENGES.map((def) => def.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'])
    expect(CHALLENGES.map((def) => def.goalLog10)).toEqual([
      10.5, 20.1, 29.8, 39.4, 49.1, 58.7, 68.4, 78
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

  it('hedef mutlaktır: giriş sayısı hedefi kaydırmaz', () => {
    const c1 = CHALLENGES[0]
    expect(challengeGoalLog(c1, 10)).toBeCloseTo(10.5, 6)
    expect(challengeGoalLog(c1, 40)).toBeCloseTo(10.5, 6)
    expect(challengeGoalLog(c1, 33)).toBeCloseTo(10.5, 6)
  })

  it('C1/C5/C6/C8 ceza etiketleri gerçek mekaniği söyler', () => {
    const byId = (id: string) => challengeById(id)!.penaltyLabel
    // Global besleme cezası her mücadelede vardır ve etikette yazmalıdır.
    for (const id of ['C1', 'C5', 'C6', 'C8']) expect(byId(id)).toContain('x0.2')
    // C6: global 0.2 × 1/5 = 25 kat yavaş.
    expect(byId('C6')).toContain('25x')
    expect(byId('C6')).toContain('/5')
    // C8: global 0.2 × 1/2 = 10 kat yavaş.
    expect(byId('C8')).toContain('10x')
    expect(byId('C8')).toContain('/2')
    // C5 yalnız ALIMI kilitler; üretim durmaz.
    expect(byId('C5')).toContain('Rings 6-8 cannot be purchased')
  })

  it('bilinmeyen kimlik null döner (kayıt temizliği)', () => {
    expect(challengeById('C9')).toBeNull()
    expect(challengeById(null)).toBeNull()
    expect(challengeById('')).toBeNull()
    expect(challengeById('C1')?.id).toBe('C1')
  })
})

describe('mücadele girişi — koşu sıfırlanır, kalıcılar korunur', () => {
  it('C1 girişi sayıyı 10a, zinciri sıfıra çeker; bestNumber/boost/ödüller kalır', () => {
    const s = createNumberState()
    s.number = D('1e12')
    s.bestNumber = D('1e40')
    s.boostCount = 5
    s.totalBuys = 88
    s.playTime = 900
    s.challenges.completed = []
    s.rings[0].amount = D(20)
    s.rings[0].bought = 20
    s.rings[1].amount = D(7)
    s.unlocked = s.unlocked.map(() => true)

    expect(enterChallenge(s, 'C1')).toBe(true)

    expect(s.number.toString()).toBe('10')
    expect(s.rings.every((ring) => ring.amount.eq(0) && ring.bought === 0)).toBe(true)
    expect(s.unlocked).toEqual([true, false, false, false, false, false, false, false])
    expect(s.bestNumber.toString()).toBe('1e40')
    expect(s.boostCount).toBe(5)
    expect(s.totalBuys).toBe(88)
    expect(s.playTime).toBe(900)
    expect(s.challenges.lastBuyAt).toBe(900)
    expect(s.challenges.lastBoughtRing).toBe(-1)
    expect(s.challenges.active).toBe('C1')
    expect(s.challenges.entryLog10).toBe(1)
    expect(s.challenges.goalLog10).toBeCloseTo(10.5, 6)
  })

  it('sıra zorunlu: C1 bitmeden C2, C1 aktifken ikinci giriş reddedilir', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C2')).toBe(false)
    expect(s.challenges.active).toBeNull()
    expect(enterChallenge(s, 'C1')).toBe(true)
    expect(enterChallenge(s, 'C1')).toBe(false)
    expect(enterChallenge(s, 'C2')).toBe(false)
  })

  it('C1 tamamlanınca C2 açılır; C3 hâlâ sırası değil', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C1')).toBe(true)
    s.number = D('1e34')
    expect(completeChallengeIfReady(s)?.id).toBe('C1')
    expect(enterChallenge(s, 'C3')).toBe(false)
    expect(enterChallenge(s, 'C2')).toBe(true)
  })

  it('tamamlanmış mücadeleye yeniden girilmez (mandal)', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    s.challenges.completed = ['C1']
    expect(enterChallenge(s, 'C1')).toBe(false)
  })

  it('bilinmeyen kimlikle giriş reddedilir', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C99')).toBe(false)
    expect(s.challenges.active).toBeNull()
  })

  it('çıkış cezayı kaldırır; sıfırlanmış koşu aynen kalır (eski koşu geri gelmez)', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    s.number = D('1e12')
    s.rings[0].bought = 10
    expect(enterChallenge(s, 'C1')).toBe(true)
    s.number = D('1e20')
    const inside = snapshot(s)
    exitChallenge(s)
    expect(s.challenges.active).toBeNull()
    expect(s.challenges.goalLog10).toBeNull()
    expect(s.challenges.entryLog10).toBeNull()
    expect(snapshot(s)).toEqual(inside)
  })

  it('hedefe varınca tamamlanır: koşunun sayısı/halkaları korunur, ödül kalıcı', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C1')).toBe(true)
    s.number = D('1e30')
    expect(buyRing(s, 0, 10)).toBe(10)
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
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C1')).toBe(true)
    s.number = D('1e5')
    expect(completeChallengeIfReady(s)).toBeNull()
    expect(s.challenges.active).toBe('C1')
    exitChallenge(s)
    s.number = D('1e40')
    expect(completeChallengeIfReady(s)).toBeNull()
    expect(s.challenges.completed).toHaveLength(0)
  })

  it('hedef girişte mutlak değere kilitlenir ve sonradan değişmez', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C1')).toBe(true)
    const goal = s.challenges.goalLog10
    expect(goal).toBeCloseTo(10.5, 6)
    s.number = D('1e50')
    expect(s.challenges.goalLog10).toBe(goal)
  })

  it('ilerleme 1 → 10,5 arasında 0–100 ve monoton', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C1')).toBe(true)
    expect(challengeProgress(s)).toBeCloseTo(0, 6)
    s.number = D('1e5')
    const mid = challengeProgress(s)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(100)
    s.number = D('1e11')
    expect(challengeProgress(s)).toBe(100)
  })

  it('boost sayısı mücadele girişinde korunur', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    s.boostCount = 7
    expect(enterChallenge(s, 'C1')).toBe(true)
    expect(s.boostCount).toBe(7)
  })
})

describe('mücadele cezaları — sekizi de', () => {
  it('fingersCap (C1): Fingers 10 alımda durur, mevcut üretim sayılmaya devam eder', () => {
    const s = enterRun('C1')
    s.number = D('1e30')
    expect(buyRing(s, 0, 25)).toBe(10)
    expect(s.rings[0].bought).toBe(10)
    s.number = D('1e300')
    expect(buyRing(s, 0, 1)).toBe(0)
    expect(s.rings[0].bought).toBe(10)
    // Mevcut üretim durmaz: 10 parmak × blok çarpanı hâlâ sayı üretir.
    expect(numberPerSecond(s).gt(0)).toBe(true)
    // Diğer halkalar etkilenmez (10 parmak ring 1'i açtı).
    expect(buyRing(s, 1, 1)).toBe(1)
  })

  it('price145 (C2): fiyat artışı 1,22 olur, çıkınca 1,20ye döner', () => {
    const s = enterRun('C2')
    s.number = D('1e34')
    s.unlocked = s.unlocked.map(() => true)
    const base = D(200)
    expect(ringCost(s, 1).div(base).toNumber()).toBeCloseTo(1, 9)
    buyRing(s, 1, 1)
    expect(ringCost(s, 1).div(base).toNumber()).toBeCloseTo(1.22, 6)
    const blockInChallenge = ringBlockPrice(s, 1, 10)
    exitChallenge(s)
    expect(ringCost(s, 1).div(base).toNumber()).toBeCloseTo(1.2, 6)
    expect(ringBlockPrice(s, 1, 10).lt(blockInChallenge)).toBe(true)
  })

  it('directOff (C3): doğrudan katkı sıfırlanır, Fingers üretimi devam eder', () => {
    const s = enterRun('C3')
    s.rings[1].amount = D(1)
    s.rings[1].bought = 10
    expect(directNumberPerSecond(s).toString()).toBe('0')
    expect(ringNumberRate(s, 1).toString()).toBe('0')
    s.rings[0].amount = D(5)
    expect(ringGainPerSecond(s, 0).gt(0)).toBe(true)
    expect(numberPerSecond(s).gt(0)).toBe(true)
  })

  it('decay (C4): alım yoksa üretim düşer, 20 sn tau, taban 0.1', () => {
    const s = enterRun('C4')
    s.rings[0].amount = D(100)
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

  it('firstFive (C5): 6-8. halkalar ALINAMAZ, mevcut üretim sayılır', () => {
    const s = enterRun('C5')
    s.number = D('1e121')
    s.unlocked = s.unlocked.map(() => true)
    s.rings[6].amount = D(10)
    s.rings[6].bought = 10
    for (const i of [5, 6, 7]) {
      expect(buyRing(s, i, 1)).toBe(0)
      expect(buyRing(s, i, 10)).toBe(0)
    }
    for (const i of [0, 1, 2, 3, 4]) expect(buyRing(s, i, 1)).toBe(1)
    // Yalnız alım engellenir: mevcut halkanın üretimi sürer.
    expect(ringNumberRate(s, 6).gt(0)).toBe(true)
  })

  it('feedFifth (C6): besleme /5, global 0,2 ile birlikte /25', () => {
    const s = enterRun('C6')
    expect(feedMultiplier(s)).toBeCloseTo(0.2 / 5, 12)
    s.rings[1].amount = D(1)
    advance(s, 1)
    expect(s.rings[0].amount.toNumber()).toBeCloseTo(0.11 * 0.04, 9)
  })

  it('newestOnly (C7): yalnız son alınan halka tam hızda, diğerleri x0.25', () => {
    const s = enterRun('C7')
    s.challenges.lastBoughtRing = 3
    expect(ringProductionMultiplier(s, 3)).toBeCloseTo(1, 9)
    for (const i of [0, 1, 2, 4, 5, 6, 7]) {
      expect(ringProductionMultiplier(s, i)).toBeCloseTo(0.25, 9)
    }
    s.challenges.lastBoughtRing = -1
    expect(ringProductionMultiplier(s, 0)).toBeCloseTo(1, 9)
  })

  it('price135feedHalf (C8): fiyat 1,22, besleme /2 (global 0,2 ile /10)', () => {
    const s = enterRun('C8')
    s.number = D('1e250')
    s.unlocked = s.unlocked.map(() => true)
    const base = ringCost(s, 7)
    buyRing(s, 7, 1)
    expect(ringCost(s, 7).div(base).toNumber()).toBeCloseTo(1.22, 6)
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

  it('finisher (C8): üretim x2 — fiyat tabanlı değer DEĞİL', () => {
    const s = createNumberState()
    s.challenges.completed = ['C8']
    for (let i = 0; i < 8; i++) expect(ringProductionMultiplier(s, i)).toBe(2)
    expect(feedMultiplier(s)).toBeCloseTo(1, 12)
  })

  it('ödüller çarpışır: C1..C8 birlikte Fingers 10x5x3x5x4x2 = 6000', () => {
    const s = createNumberState()
    s.challenges.completed = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']
    expect(ringProductionMultiplier(s, 0)).toBe(10 * 5 * 3 * 5 * 4 * 2)
    expect(ringProductionMultiplier(s, 7)).toBe(5 * 3 * 5 * 4 * 2)
    expect(feedMultiplier(s)).toBeCloseTo(1.5 ** 3, 12)
  })
})

describe('blok çarpanı — 5,3 ^ floor(bought / 10)', () => {
  it('10 alımda bir kademe atlar, kademe içinde sabit kalır', () => {
    expect(blockFactor(0).toNumber()).toBe(1)
    expect(blockFactor(9).toNumber()).toBe(1)
    expect(blockFactor(10).toNumber()).toBeCloseTo(5.3, 9)
    expect(blockFactor(19).toNumber()).toBeCloseTo(5.3, 9)
    expect(blockFactor(20).toNumber()).toBeCloseTo(28.09, 9)
    expect(blockFactor(30).toNumber()).toBeCloseTo(148.877, 9)
  })

  it('geçersiz girdide güvenli: negatif ve NaN -> 1', () => {
    expect(blockFactor(-5).toNumber()).toBe(1)
    expect(blockFactor(Number.NaN).toNumber()).toBe(1)
    expect(blockFactor(Number.POSITIVE_INFINITY).toNumber()).toBe(1)
  })

  it('Fingers üretimine girer: 9 vs 10 alım tam 5,3 kat', () => {
    const a = createNumberState()
    const b = createNumberState()
    a.rings[0].amount = D(1)
    b.rings[0].amount = D(1)
    a.rings[0].bought = 9
    b.rings[0].bought = 10
    expect(numberPerSecond(b).div(numberPerSecond(a)).toNumber()).toBeCloseTo(5.3, 9)
  })

  it('doğrudan paya girer: halka 3 için 9 vs 10 alım tam 5,3 kat', () => {
    const a = createNumberState()
    const b = createNumberState()
    a.rings[3].amount = D(1)
    b.rings[3].amount = D(1)
    a.rings[3].bought = 9
    b.rings[3].bought = 10
    expect(directNumberPerSecond(b).div(directNumberPerSecond(a)).toNumber()).toBeCloseTo(5.3, 9)
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

  it('advance blok çarpanını Fingers üretiminde kullanır (sayı 5,3 kat hızlı büyür)', () => {
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
    expect(b.number.div(a.number).toNumber()).toBeCloseTo(5.3, 9)
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
    for (const ring of s.rings) expect(ring.bought % 10).toBe(0)
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
    s.boostCount = 4
    s.bestNumber = D('1e30')
    expect(enterChallenge(s, 'C1')).toBe(true)
    s.number = D('1e30')
    maxAll(s)
    expect(s.rings[0].bought).toBe(10)
    expect(s.rings[1].bought).toBeGreaterThan(0)
  })
})

describe('kilit ve sıra — bestNumber tabanlı', () => {
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

  it('kilit bestNumber eşiğine bağlıdır: current number 10 olsa da açık kalır', () => {
    const s = createNumberState()
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
    s.bestNumber = D('1e10')
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
    s.boostCount = 4
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(true)
    // Koşu sıfırlandı: current number 10, kilit yine de açık (soft-lock yok).
    s.number = D(10)
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(true)
    s.challenges.completed = ['C1']
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
  })

  it('boost kapısı: 4 boost olmadan kilit açılsa da girilmez', () => {
    const s = createNumberState()
    s.bestNumber = D('1e40')
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
    expect(enterChallenge(s, 'C1')).toBe(false)
    s.boostCount = 3
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
    s.boostCount = 4
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(true)
    expect(enterChallenge(s, 'C1')).toBe(true)
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
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C1')).toBe(true)
    expect(activeChallenge(s)?.id).toBe('C1')
  })
})

describe('sıralı koşu akışı', () => {
  it('C1 tamamlanınca C2 girişi koşuyu yeniden sıfırlar, boost korunur', () => {
    const s = createNumberState()
    s.boostCount = 4
    s.bestNumber = D('1e40')
    expect(enterChallenge(s, 'C1')).toBe(true)
    s.number = D('1e34')
    expect(completeChallengeIfReady(s)?.id).toBe('C1')
    expect(nextChallenge(s)?.id).toBe('C2')
    expect(enterChallenge(s, 'C2')).toBe(true)
    expect(s.number.toString()).toBe('10')
    expect(s.boostCount).toBe(4)
    expect(s.bestNumber.toString()).toBe('1e40')
    expect(s.challenges.active).toBe('C2')
    expect(s.challenges.completed).toEqual(['C1'])
  })
})