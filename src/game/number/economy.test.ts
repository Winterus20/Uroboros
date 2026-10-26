import { describe, expect, it } from 'vitest'
import { D, Decimal } from '../../core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_DIRECT_SHARE, ringBlockCost, ringCostAt } from './tuning'
import {
  advance,
  buyRing,
  buyRingMax,
  createNumberState,
  manualTap,
  maxAffordableRing,
  numberPerSecond,
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

  it('Fingers sayıyı üretir; tek başına /s = 1 (E6)', () => {
    const s = createNumberState()
    s.number = D('1e6')
    buyRing(s, 0)
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
