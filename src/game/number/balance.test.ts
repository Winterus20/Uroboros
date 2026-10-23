import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import { BLOCK_SIZE, NUMBER_TUNING } from './tuning'
import {
  advance,
  applyBoost,
  buyRing,
  canBoost,
  createNumberState,
  gateReady,
  manualTap,
  maxAffordableRing,
  ringBlockPrice,
  ringCost,
  ringUnlocked
} from './economy'

/**
 * K5 — 1. basamak denge kilidi (ölçüm: brain/scratchpad/balance-2026-10-23/ ve
 * brain/research/ad-pricing-and-chain-math-2026-10-23.md).
 *
 * Bu test oyunun GERÇEK motorunu 20 TPS'te çalıştırır ve tasarlanan oyuncuyu oynar:
 * tırmanışta her halkayı bir bloğa (10 birim) tamamlar, ilk boost'tan sonra döngü
 * başına 2 alım yapar. Denge sabitleri değişirse test kırılır — istenen davranış budur.
 *
 * Hedefler: kapı 110–130 dk · 18–24 boost · ilk 10 dk ≥6 karar · 8 halka < 45 dk.
 * Ölçülen (2026-10-23, A+ sabitleri): 119,0 dk · 21 boost · 371 birim · 42 karar.
 */
interface SimResult {
  gateMinutes: number | null
  boosts: number
  buys: number
  firstTenMinutesBuys: number
  unlockMinutes: number[]
}

function simulate(options: { dt: number; tapsPerSecond: number }): SimResult {
  const { dt, tapsPerSecond } = options
  const state = createNumberState()
  let seconds = 0
  let tapAccumulator = 0
  let decisionAccumulator = 0
  let firstBoostDone = false
  let cycleBuys = 0
  let threshold = NUMBER_TUNING.rings[7].baseCost.toNumber() * 10
  let firstTenMinutesBuys = 0
  const unlockMinutes: number[] = []
  const seenUnlock = new Array<boolean>(8).fill(false)
  const limitSeconds = 300 * 60

  while (seconds < limitSeconds && !gateReady(state)) {
    advance(state, dt)
    seconds += dt

    // Oyuncu saniyede `tapsPerSecond` kez +1'e basar (S9: gerçekten 1 ekler).
    tapAccumulator += dt
    while (tapAccumulator >= 1 / tapsPerSecond) {
      tapAccumulator -= 1 / tapsPerSecond
      manualTap(state)
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
    if (!firstBoostDone) {
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
    } else if (cycleBuys < 2) {
      // Döngü modu: en fazla 2 alım — 1 Fingers (zinciri canlandır) + 1 Mathematician.
      if (state.rings[0].bought === 0 && state.number.gte(ringCost(state, 0))) {
        if (buyRing(state, 0) > 0) cycleBuys++
      } else if (state.number.gte(ringCost(state, 7))) {
        if (buyRing(state, 7) > 0) cycleBuys++
      }
    }
    if (acted > 0 && seconds <= 600) firstTenMinutesBuys++

    if (canBoost(state) && state.number.gte(threshold)) {
      const peak = state.number.toNumber()
      applyBoost(state)
      firstBoostDone = true
      cycleBuys = 0
      threshold = peak * Math.pow(peak / 10, 0.2)
    }
  }

  return {
    gateMinutes: gateReady(state) ? seconds / 60 : null,
    boosts: state.boosts,
    buys: state.totalBuys,
    firstTenMinutesBuys,
    unlockMinutes
  }
}

describe('1. basamak denge kilidi (K5)', () => {
  const result = simulate({ dt: 0.5, tapsPerSecond: 2 })

  it('kapıya 110–130 dakikada ulaşılır', () => {
    expect(result.gateMinutes).not.toBeNull()
    expect(result.gateMinutes ?? 0).toBeGreaterThan(110)
    expect(result.gateMinutes ?? 0).toBeLessThan(130)
  })

  it('18–24 mini boost yapılır', () => {
    expect(result.boosts).toBeGreaterThanOrEqual(18)
    expect(result.boosts).toBeLessThanOrEqual(24)
  })

  it('ilk 10 dakikada en az 6 alım kararı verilir', () => {
    expect(result.firstTenMinutesBuys).toBeGreaterThanOrEqual(6)
  })

  it('8 halka da 45. dakikadan önce açılır', () => {
    expect(result.unlockMinutes.filter((m) => m !== undefined).length).toBe(8)
    expect(Math.max(...result.unlockMinutes)).toBeLessThan(45)
  })

  it('halka başına bir blok (10 birim) alınır', () => {
    expect(result.buys).toBeGreaterThanOrEqual(8 * BLOCK_SIZE)
  })

  it('tıklamasız oyuncu ilk alımı yapamaz (c1 = 25 > başlangıç 10)', () => {
    const idle = simulate({ dt: 1, tapsPerSecond: 1 })
    expect(idle.buys).toBeGreaterThan(0)
    const state = createNumberState()
    expect(ringCost(state, 0).gt(state.number)).toBe(true)
    expect(D(0).lt(1)).toBe(true)
  })
})
