import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import { BLOCK_SIZE, NUMBER_TUNING } from './tuning'
import {
  advance,
  buyRing,
  createNumberState,
  manualTap,
  maxAffordableRing,
  ringBlockPrice,
  ringUnlocked
} from './economy'

/**
 * 1. basamak ZİNCİR kilidi (2026-10-25).
 *
 * Mini boost, prestij ve Tanım yükseltmeleri kaldırıldı; oyun yalnız zinciri
 * büyütür. Bu test GERÇEK motoru çalıştırır ve tasarlanan oyuncuyu oynar:
 * sığ halkayı bir bloğa tamamlar, sonra en ucuz bloğu alır.
 *
 * Ölçülen (2 tık/sn, dt = 0,5): halka açılışları 0 · 1,6 · 4,2 · 6,8 · 9,3 ·
 * 11,9 · 14,5 · 17,0 dk · 60. dk sayı 7,9e15 · 120. dk sayı 4,3e19 · 1 440 alım.
 */
interface SimResult {
  number: string
  buys: number
  firstTenMinutesBuys: number
  unlockMinutes: number[]
}

function simulate(options: { dt: number; tapsPerSecond: number; limitMinutes: number }): SimResult {
  const { dt, tapsPerSecond, limitMinutes } = options
  const state = createNumberState()
  let seconds = 0
  let tapAccumulator = 0
  let decisionAccumulator = 0
  let firstTenMinutesBuys = 0
  const unlockMinutes: number[] = []
  const seenUnlock = new Array<boolean>(8).fill(false)
  const limitSeconds = limitMinutes * 60

  while (seconds < limitSeconds) {
    advance(state, dt)
    seconds += dt

    // Oyuncu saniyede `tapsPerSecond` kez +1'e basar (S9: gerçekten 1 ekler).
    if (tapsPerSecond > 0) {
      tapAccumulator += dt
      while (tapAccumulator >= 1 / tapsPerSecond) {
        tapAccumulator -= 1 / tapsPerSecond
        manualTap(state)
      }
    }

    for (let i = 0; i < 8; i++) {
      if (!seenUnlock[i] && ringUnlocked(state, i)) {
        seenUnlock[i] = true
        unlockMinutes[i] = seconds / 60
      }
    }

    decisionAccumulator += dt
    if (decisionAccumulator < 0.5) continue
    decisionAccumulator = 0

    let acted = 0
    // Tırmanış: en derin açık halkayı bir bloğa tamamla (AD ritmi).
    let picked = -1
    for (let i = 7; i >= 0; i--) {
      if (ringUnlocked(state, i) && state.rings[i].bought < NUMBER_TUNING.unlockThreshold) {
        picked = i
        break
      }
    }
    if (picked >= 0) {
      const need = NUMBER_TUNING.unlockThreshold - state.rings[picked].bought
      acted = buyRing(state, picked, Math.min(need, maxAffordableRing(state, picked)))
    } else {
      // Her halka bir blokta: en ucuz blok alınır.
      let best = -1
      for (let i = 0; i < 8; i++) {
        if (!ringUnlocked(state, i)) continue
        const price = ringBlockPrice(state, i, BLOCK_SIZE)
        if (state.number.lt(price)) continue
        if (best < 0 || price.lt(ringBlockPrice(state, best, BLOCK_SIZE))) best = i
      }
      if (best >= 0) acted = buyRing(state, best, BLOCK_SIZE)
    }
    if (acted > 0 && seconds <= 600) firstTenMinutesBuys++
  }

  return {
    number: state.number.toString(),
    buys: state.totalBuys,
    firstTenMinutesBuys,
    unlockMinutes
  }
}

describe('1. basamak zincir kilidi', () => {
  const firstHour = simulate({ dt: 0.5, tapsPerSecond: 2, limitMinutes: 60 })
  const secondHour = simulate({ dt: 0.5, tapsPerSecond: 2, limitMinutes: 120 })

  it('8 halka da 45. dakikadan önce açılır', () => {
    expect(firstHour.unlockMinutes.filter((m) => m !== undefined).length).toBe(8)
    expect(Math.max(...firstHour.unlockMinutes)).toBeLessThan(45)
  })

  it('ilk 10 dakikada en az 6 alım kararı verilir', () => {
    expect(firstHour.firstTenMinutesBuys).toBeGreaterThanOrEqual(6)
  })

  it('60. dakikada sayı 1e15 üstüne çıkar', () => {
    expect(D(firstHour.number).gt('1e15')).toBe(true)
  })

  it('120. dakikada sayı 1e18 üstüne çıkar (zincir kendi kendini büyütür)', () => {
    expect(D(secondHour.number).gt('1e18')).toBe(true)
  })

  it('halka başına bir blok (10 birim) alınır', () => {
    expect(firstHour.buys).toBeGreaterThanOrEqual(8 * BLOCK_SIZE)
  })

  it('tıklamasız oyuncu ilk alımı yapamaz (c1 = 25 > başlangıç 10)', () => {
    const idle = simulate({ dt: 1, tapsPerSecond: 0, limitMinutes: 10 })
    expect(idle.buys).toBe(0)
    expect(idle.number).toBe('10')
    const state = createNumberState()
    expect(NUMBER_TUNING.rings[0].baseCost.gt(state.number)).toBe(true)
  })
})
