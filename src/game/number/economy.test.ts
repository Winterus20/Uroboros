import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import { NUMBER_TUNING, ringCostAt } from './tuning'
import {
  advance,
  applyBoost,
  applyPrestige,
  boostMultiplier,
  buyRing,
  canBoost,
  createNumberState,
  gateReady,
  manualTap,
  numberPerSecond,
  overflowRatio,
  productionEfficiency,
  ringCost,
  ringGainPerSecond,
  ringUnlocked,
  tanimReward,
  unlockedRingCount
} from './economy'

describe('sayı ekonomisi — 1. basamak', () => {
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

  it('yalnız Fingers sayı üretir; üretim sayıya akar (E6)', () => {
    const s = createNumberState()
    s.number = D('1e6')
    buyRing(s, 0)
    expect(numberPerSecond(s).toNumber()).toBeCloseTo(0.071, 9)
    const before = s.number
    advance(s, 1)
    expect(s.number.minus(before).toNumber()).toBeCloseTo(0.071, 6)
  })

  it('üst halka alt halkayı besler', () => {
    const s = createNumberState()
    s.rings[1].amount = D(1)
    advance(s, 1)
    expect(s.rings[0].amount.toNumber()).toBeCloseTo(NUMBER_TUNING.rings[1].baseRate.toNumber(), 6)
  })

  it('boost çarpanı halka beslemesine UYGULANMAZ (D1)', () => {
    const s = createNumberState()
    s.rings[1].amount = D(1)
    s.boostMult = D(1000)
    const ringGain = ringGainPerSecond(s, 1)
    expect(ringGain.toNumber()).toBeCloseTo(NUMBER_TUNING.rings[1].baseRate.toNumber(), 9)
    const numberGain = numberPerSecond(s)
    expect(numberGain.eq(0)).toBe(true)
  })

  it('alım sayıyı düşürse de zirve (peak) geri gitmez (S3 mandal)', () => {
    const s = createNumberState()
    s.number = D('1e9')
    advance(s, 0.05)
    const peak = s.peak
    buyRing(s, 0)
    expect(s.number.lt(peak)).toBe(true)
    expect(s.peak.toString()).toBe(peak.toString())
  })

  it('mini boost 8. halka alınmadan açılmaz (E13)', () => {
    const s = createNumberState()
    expect(canBoost(s)).toBe(false)
    s.rings[7].bought = 1
    expect(canBoost(s)).toBe(true)
  })

  it('boost çarpanı (zirve/başlangıç)^0,2 formülünü izler (E14)', () => {
    const s = createNumberState()
    s.peak = D('1e13')
    expect(boostMultiplier(s).toNumber()).toBeCloseTo(Math.pow(1e12, 0.2), 4)
  })

  it('boost sayıyı başlangıca, halkaları 1 birime indirir; Tanım vermez (E12/D3)', () => {
    const s = createNumberState()
    s.number = D('1e13')
    s.peak = D('1e13')
    s.rings[7].bought = 1
    s.rings[7].amount = D(5)
    s.rings[0].amount = D(9)
    const gain = applyBoost(s)
    expect(gain.gt(1)).toBe(true)
    expect(s.number.toString()).toBe('10')
    expect(s.rings[0].amount.toString()).toBe('1')
    expect(s.rings[7].amount.toString()).toBe('1')
    expect(s.rings[7].bought).toBe(0)
    expect(s.boosts).toBe(1)
    expect(s.boostMult.toString()).toBe(gain.toString())
    expect(s.tanim.toString()).toBe('0')
  })

  it('kilitler boost sonrası KAPANMAZ (D6/S3)', () => {
    const s = createNumberState()
    s.number = D('1e12')
    for (let i = 0; i < 10; i++) buyRing(s, 0)
    expect(ringUnlocked(s, 1)).toBe(true)
    s.rings[7].bought = 1
    s.peak = D('1e13')
    applyBoost(s)
    expect(ringUnlocked(s, 1)).toBe(true)
    expect(s.rings[0].bought).toBe(0)
  })

  it('kapı 1.79e308; altında ödül yok, üstünde log10(1+A) (E7)', () => {
    const s = createNumberState()
    expect(gateReady(s)).toBe(false)
    expect(tanimReward(s).toString()).toBe('0')
    s.number = NUMBER_TUNING.gate
    expect(gateReady(s)).toBe(true)
    expect(overflowRatio(s).toNumber()).toBeCloseTo(1, 6)
    expect(tanimReward(s).toNumber()).toBeCloseTo(Math.log10(2), 6)
  })

  it('kapı sonrası üretim verimi düşer, kapı altında ceza yok (E7)', () => {
    const s = createNumberState()
    expect(productionEfficiency(s).toString()).toBe('1')
    s.number = NUMBER_TUNING.gate
    expect(productionEfficiency(s).toNumber()).toBeCloseTo(1, 6)
    s.number = NUMBER_TUNING.gate.times('1e10')
    expect(productionEfficiency(s).toNumber()).toBeCloseTo(Math.pow(0.9, 10), 4)
  })

  it('prestij Tanım verir ve koşuyu sıfırlar (S2)', () => {
    const s = createNumberState()
    s.number = NUMBER_TUNING.gate.times(2)
    s.peak = s.number
    s.rings[3].bought = 4
    const reward = applyPrestige(s)
    expect(reward.gt(0)).toBe(true)
    expect(s.number.toString()).toBe('10')
    expect(s.peak.toString()).toBe('10')
    expect(s.rings[3].bought).toBe(0)
    expect(s.prestiges).toBe(1)
    expect(s.tanim.toString()).toBe(reward.toString())
    expect(s.rung).toBe(1)
  })

  it('kapı kapalıyken prestij hiçbir şey vermez', () => {
    const s = createNumberState()
    expect(applyPrestige(s).toString()).toBe('0')
    expect(s.prestiges).toBe(0)
  })

  it('+1 gerçekten 1 ekler (S9)', () => {
    const s = createNumberState()
    manualTap(s)
    expect(s.number.toString()).toBe('11')
    expect(s.bestNumber.toString()).toBe('11')
  })
})
