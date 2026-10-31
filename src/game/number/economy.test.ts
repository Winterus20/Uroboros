import { describe, expect, it } from 'vitest'
import { D, Decimal } from '../../core/math'
import { BLOCK_SIZE, BOOST_MULT, NUMBER_TUNING, RING_DIRECT_SHARE, ringBlockCost, ringCostAt } from './tuning'
import {
  advance,
  applyBoost,
  blockFactor,
  boostBlockedReason,
  boostBought,
  boostMultiplier,
  boostPrice,
  boostRequirement,
  boostUnlocked,
  buyRing,
  buyRingMax,
  canBoost,
  createNumberState,
  directNumberPerSecond,
  manualTap,
  maxAffordableRing,
  numberPerSecond,
  resetRun,
  ringDirectRate,
  ringBlockPrice,
  ringCost,
  ringGainPerSecond,
  ringUnlocked,
  unlockedRingCount
} from './economy'

describe('sayı ekonomisi — zincir', () => {
  it('yeni oyun 10 ile başlar, yalnız 1. halka açıktır', () => {
    const s = createNumberState()
    expect(s.number.toString()).toBe('10')
    expect(unlockedRingCount(s)).toBe(1)
    expect(ringUnlocked(s, 1)).toBe(false)
    expect(numberPerSecond(s).toString()).toBe('0')
  })

  it('alım sayıyı düşürür, birim ekler ve fiyatı büyütür (E2/E10)', () => {
    const s = createNumberState()
    s.number = D(1000)
    const first = ringCost(s, 0)
    expect(first.toString()).toBe('25')
    expect(buyRing(s, 0)).toBe(1)
    expect(s.number.toString()).toBe('975')
    expect(s.rings[0].amount.toString()).toBe('1')
    const second = ringCost(s, 0)
    expect(second.div(first).toNumber()).toBeCloseTo(NUMBER_TUNING.costGrowth, 6)
  })

  it('yetersiz sayıda alım reddedilir', () => {
    const s = createNumberState()
    s.number = D(0)
    expect(buyRing(s, 0)).toBe(0)
    expect(s.rings[0].bought).toBe(0)
  })

  it('bir halkadan 10 birim alınınca sonraki halka açılır (E11)', () => {
    const s = createNumberState()
    s.number = D('1e12')
    for (let i = 0; i < 9; i++) buyRing(s, 0)
    expect(ringUnlocked(s, 1)).toBe(false)
    buyRing(s, 0)
    expect(ringUnlocked(s, 1)).toBe(true)
    expect(unlockedRingCount(s)).toBe(2)
  })

  it('kilitli halka satın alınamaz', () => {
    const s = createNumberState()
    s.number = D('1e30')
    expect(buyRing(s, 3)).toBe(0)
  })

  it('maliyet eğrisi taban × oran^alınan formülünü izler', () => {
    const base = NUMBER_TUNING.rings[2].baseCost
    expect(ringCostAt(base, 0).toString()).toBe(base.toString())
    expect(ringCostAt(base, 5).div(base).toNumber()).toBeCloseTo(Math.pow(NUMBER_TUNING.costGrowth, 5), 4)
  })

  it('Fingers sayıyı üretir; tek parmak /s = 1 (E6, ilk blokta blok çarpanı ×1)', () => {
    const s = createNumberState()
    s.number = D('1e6')
    buyRing(s, 0)
    // bought = 1 → blockFactor = 5,5^0 = 1, yani ham oran geçerli.
    expect(numberPerSecond(s).toNumber()).toBeCloseTo(NUMBER_TUNING.rings[0].baseRate.toNumber(), 9)
    const before = s.number
    advance(s, 1)
    expect(s.number.minus(before).toNumber()).toBeCloseTo(NUMBER_TUNING.rings[0].baseRate.toNumber(), 6)
  })

  it('halka 1 doğrudan katkı almaz — sayının kendisi odur', () => {
    expect(ringDirectRate(0).toString()).toBe('0')
    expect(ringDirectRate(1).toNumber()).toBeCloseTo(
      NUMBER_TUNING.rings[1].baseRate.toNumber() * RING_DIRECT_SHARE,
      12
    )
  })

  it('satın alınan halka /s okumasını ANINDA büyütür (zinciri beklemez)', () => {
    const s = createNumberState()
    s.number = D('1e6')
    // 10 parmak: Fingers artık blok çarpanı ×5,5 alır (v2). Ölçüm `after - before`
    // farkı olduu için sabit çarpan iki tarafta da bulunur ve fark değişmez.
    buyRing(s, 0, BLOCK_SIZE)
    expect(ringUnlocked(s, 1)).toBe(true)
    const before = numberPerSecond(s)
    expect(buyRing(s, 1)).toBe(1)
    const after = numberPerSecond(s)
    expect(after.minus(before).toNumber()).toBeCloseTo(
      NUMBER_TUNING.rings[1].baseRate.toNumber() * RING_DIRECT_SHARE,
      12
    )
    expect(ringGainPerSecond(s, 1).toNumber()).toBeCloseTo(NUMBER_TUNING.rings[1].baseRate.toNumber(), 12)
  })

  it('üst halka alt halkayı besler', () => {
    const s = createNumberState()
    s.rings[1].amount = D(1)
    advance(s, 1)
    expect(s.rings[0].amount.toNumber()).toBeCloseTo(NUMBER_TUNING.rings[1].baseRate.toNumber(), 6)
  })

  it('alım sayıyı düşürse de en yüksek sayı (bestNumber) geri gitmez (S3 mandal)', () => {
    const s = createNumberState()
    s.number = D('1e9')
    advance(s, 0.05)
    const best = s.bestNumber
    buyRing(s, 0)
    expect(s.number.lt(best)).toBe(true)
    expect(s.bestNumber.toString()).toBe(best.toString())
  })

  it('+1 gerçekten 1 ekler (S9)', () => {
    const s = createNumberState()
    manualTap(s)
    expect(s.number.toString()).toBe('11')
    expect(s.bestNumber.toString()).toBe('11')
  })
})

describe('blok satın alma — AD "Buy 10"', () => {
  it('blok fiyatı 10 birimin geometrik toplamıdır', () => {
    const base = NUMBER_TUNING.rings[0].baseCost
    const g = NUMBER_TUNING.costGrowth
    const expected = base.times(new Decimal(g).pow(BLOCK_SIZE).minus(1)).div(g - 1)
    expect(ringBlockCost(base, 0, BLOCK_SIZE).div(expected).toNumber()).toBeCloseTo(1, 9)
  })

  it('tek birim fiyatı count = 1 ile aynıdır', () => {
    const base = NUMBER_TUNING.rings[3].baseCost
    expect(ringBlockCost(base, 4, 1).toString()).toBe(ringCostAt(base, 4).toString())
  })

  it('blok alımı toplamı düşer, sayacı 10 artırır ve sonraki halkayı açar', () => {
    const s = createNumberState()
    s.number = D('1e12')
    const price = ringBlockPrice(s, 0, BLOCK_SIZE)
    const before = s.number
    expect(buyRing(s, 0, BLOCK_SIZE)).toBe(BLOCK_SIZE)
    expect(s.number.eq(before.minus(price))).toBe(true)
    expect(s.rings[0].bought).toBe(BLOCK_SIZE)
    expect(ringUnlocked(s, 1)).toBe(true)
  })

  it('maxAffordableRing bütçenin alabildiği en büyük sayıyı verir', () => {
    const s = createNumberState()
    s.number = D('1e6')
    const n = maxAffordableRing(s, 0)
    expect(n).toBeGreaterThan(BLOCK_SIZE)
    expect(s.number.gte(ringBlockPrice(s, 0, n))).toBe(true)
    expect(s.number.lt(ringBlockPrice(s, 0, n + 1))).toBe(true)
  })

  it('kilitli halkada max 0 döner, alım yapılmaz', () => {
    const s = createNumberState()
    s.number = D('1e30')
    expect(maxAffordableRing(s, 4)).toBe(0)
    expect(buyRingMax(s, 4)).toBe(0)
  })

  it('halka başına bir blok sığar (log(8)/log(1,20) = 11,4 birim)', () => {
    const perRing = Math.log(NUMBER_TUNING.ladderRatio) / Math.log(NUMBER_TUNING.costGrowth)
    expect(perRing).toBeGreaterThan(BLOCK_SIZE)
    expect(perRing).toBeLessThan(BLOCK_SIZE * 1.3)
  })
})

describe('blok çarpanı — her 10 alımda üretim ×5,3 (ADR-0086)', () => {
  it('Fingers üretimi blok çarpanını alır', () => {
    const s = createNumberState()
    s.number = D('1e9')
    expect(buyRing(s, 0, 10)).toBe(10)
    // 10 parmak × 1 sayı/sn × 5,3 = 53 sayı/sn (doğrudan katkı yok).
    expect(s.rings[0].amount.toNumber()).toBe(10)
    expect(numberPerSecond(s).toNumber()).toBeCloseTo(10 * 5.3, 6)
    expect(blockFactor(10).toNumber()).toBeCloseTo(5.3, 9)
  })

  it('doğrudan pay blok çarpanını alır, besleme almaz', () => {
    const s = createNumberState()
    s.rings[1].amount = D(1)
    s.rings[1].bought = 10
    // Doğrudan katkı: 1 birim × 0,11 × 5,3.
    expect(directNumberPerSecond(s).toNumber()).toBeCloseTo(0.11 * 5.3, 9)
    // Besleme: 1 birim × 0,11 × 1 (blok çarpanı YOK).
    expect(ringGainPerSecond(s, 1).toNumber()).toBeCloseTo(0.11, 9)
    s.rings[0].amount = D(0)
    advance(s, 1)
    expect(s.rings[0].amount.toNumber()).toBeCloseTo(0.11, 9)
  })
})


describe('koşu sıfırlama — ADR-0086', () => {
  it('sayı 10, zincir sıfır, kilitler yalnız Fingers; kalıcılar korunur', () => {
    const s = createNumberState()
    s.number = D('1e50')
    s.bestNumber = D('1e60')
    s.totalBuys = 42
    s.boostCount = 3
    s.playTime = 1234
    s.challenges.completed = ['C1', 'C2']
    s.challenges.lastBoughtRing = 7
    s.rings[0].amount = D(5)
    s.rings[0].bought = 10
    s.unlocked = s.unlocked.map(() => true)

    resetRun(s)

    expect(s.number.toString()).toBe('10')
    expect(s.rings.every((ring) => ring.amount.eq(0) && ring.bought === 0)).toBe(true)
    expect(s.unlocked).toEqual([true, false, false, false, false, false, false, false])
    expect(s.challenges.lastBuyAt).toBe(1234)
    expect(s.challenges.lastBoughtRing).toBe(-1)
    // Kalıcı olan her şey yerinde.
    expect(s.bestNumber.toString()).toBe('1e60')
    expect(s.totalBuys).toBe(42)
    expect(s.boostCount).toBe(3)
    expect(s.playTime).toBe(1234)
    expect(s.challenges.completed).toEqual(['C1', 'C2'])
  })
})

describe('boost — gereksinim, fiyat, çarpan', () => {
  it('gereksinim ceil(50 · 1,35^n): 50, 68, 92', () => {
    expect(boostRequirement(0)).toBe(50)
    expect(boostRequirement(1)).toBe(68)
    expect(boostRequirement(2)).toBe(92)
  })

  it('geçersiz boost sayacı 0 gibi davranır (negatif/NaN/ondalık)', () => {
    expect(boostRequirement(-3)).toBe(50)
    expect(boostRequirement(Number.NaN)).toBe(50)
    expect(boostRequirement(1.9)).toBe(68)
  })

  it('çarpan 1,8^n ve 0. boost ×1', () => {
    expect(boostMultiplier(0).toString()).toBe('1')
    expect(boostMultiplier(1).toNumber()).toBeCloseTo(BOOST_MULT, 12)
    expect(boostMultiplier(2).toNumber()).toBeCloseTo(BOOST_MULT * BOOST_MULT, 12)
  })

  it('fiyat son halkanın 10 bloğu × 1,5^n', () => {
    const s = createNumberState()
    s.rings[7].bought = 30
    const basePrice = ringBlockPrice(s, 7, BLOCK_SIZE)
    expect(boostPrice(s).eq(basePrice)).toBe(true)
    s.boostCount = 1
    expect(boostPrice(s).div(basePrice).toNumber()).toBeCloseTo(1.5, 9)
  })
})

describe('boost — engel sırası ve satın alma', () => {
  function ready(): ReturnType<typeof createNumberState> {
    const s = createNumberState()
    s.unlocked[7] = true
    s.rings[7].bought = boostRequirement(0)
    s.number = D('1e100')
    s.bestNumber = D('1e120')
    return s
  }

  it('son halka kilitliyken gereksinim engeli', () => {
    const s = createNumberState()
    s.number = D('1e100')
    expect(boostUnlocked(s)).toBe(false)
    expect(boostBought(s)).toBe(0)
    expect(boostBlockedReason(s)).toBe('requirement')
    expect(canBoost(s)).toBe(false)
  })

  it('gereksinim dolunca fiyat engeli; para yetince engel kalkar', () => {
    const s = ready()
    s.number = D(0)
    expect(boostBlockedReason(s)).toBe('price')
    expect(canBoost(s)).toBe(false)
    s.number = D('1e100')
    expect(boostBlockedReason(s)).toBeNull()
    expect(canBoost(s)).toBe(true)
  })

  it('mücadele, basamak ve kapı engelleri sırayla öne çıkar', () => {
    const s = ready()
    s.challenges.active = 'C1'
    expect(boostBlockedReason(s)).toBe('challenge')

    s.rung = 2
    expect(boostBlockedReason(s)).toBe('rung')

    s.rung = 1
    s.challenges.active = null
    s.gateReached = true
    expect(boostBlockedReason(s)).toBe('gate')
  })

  it('satın alma sayacı artırır, koşuyu sıfırlar, kalıcıları korur', () => {
    const s = ready()
    s.challenges.completed = ['C1']
    s.totalBuys = 77
    const best = s.bestNumber.toString()

    expect(applyBoost(s)).toBe(true)
    expect(s.boostCount).toBe(1)
    expect(s.number.toString()).toBe('10')
    expect(s.rings.every((ring) => ring.bought === 0 && ring.amount.eq(0))).toBe(true)
    expect(s.unlocked).toEqual([true, false, false, false, false, false, false, false])
    expect(s.bestNumber.toString()).toBe(best)
    expect(s.totalBuys).toBe(77)
    expect(s.challenges.completed).toEqual(['C1'])
    // Yeni koşuda son halka yeniden kilitli: ikinci boost hemen alınamaz.
    expect(applyBoost(s)).toBe(false)
    expect(s.boostCount).toBe(1)
  })
})

describe('boost çarpanı yalnız sayı üretimine girer', () => {
  it('sayı üretimi ×1,8; doğrudan katkı ve zincir beslemesi değişmez', () => {
    const plain = createNumberState()
    const boosted = createNumberState()
    for (const s of [plain, boosted]) {
      s.rings[0].amount = D(10)
      s.rings[0].bought = 10
      s.rings[1].amount = D(2)
    }
    boosted.boostCount = 1

    expect(numberPerSecond(boosted).div(numberPerSecond(plain)).toNumber()).toBeCloseTo(1.8, 9)
    // İki üretim kanalı da boost alır: zincir satırlarının toplamı hero /s ile eşleşir.
    expect(ringGainPerSecond(boosted, 0).div(ringGainPerSecond(plain, 0)).toNumber()).toBeCloseTo(1.8, 9)
    expect(directNumberPerSecond(boosted).div(directNumberPerSecond(plain)).toNumber()).toBeCloseTo(1.8, 9)
    // Zincir BESLEMESİ boost almaz.
    expect(ringGainPerSecond(boosted, 1).toString()).toBe(ringGainPerSecond(plain, 1).toString())
  })

  it('advance sayıyı boost çarpanıyla büyütür, beslemeyi etkilemez', () => {
    const plain = createNumberState()
    const boosted = createNumberState()
    for (const s of [plain, boosted]) {
      s.number = D(0)
      s.rings[0].amount = D(1)
      s.rings[1].amount = D(1)
    }
    boosted.boostCount = 1
    advance(plain, 1)
    advance(boosted, 1)
    expect(boosted.number.div(plain.number).toNumber()).toBeCloseTo(1.8, 9)
    expect(boosted.rings[0].amount.toString()).toBe(plain.rings[0].amount.toString())
  })
})