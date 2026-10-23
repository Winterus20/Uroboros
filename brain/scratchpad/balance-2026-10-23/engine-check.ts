/** Gerçek motorla denge ölçümü: 20 TPS Euler + rapor §2.3 oyuncu politikası. */
import {
  advance, applyBoost, buyRing, canBoost, createNumberState, gateReady, ringCost, ringUnlocked
} from '../../../src/game/number/economy'
import { NUMBER_TUNING } from '../../../src/game/number/tuning'

interface Result { gateMin: number | null; boosts: number; buys: number; unlocks: number[]; first10: number }

function run(dt: number, tapsPerSec: number): Result {
  const s = createNumberState()
  let t = 0
  let tapAcc = 0
  let decAcc = 0
  let firstBoostDone = false
  let cycleBuys = 0
  let threshold = NUMBER_TUNING.rings[7].baseCost.times(10)
  let lastPeak = 10
  let first10 = 0
  const unlockTimes: number[] = []
  const seenUnlock = new Array(8).fill(false)
  const limit = 300 * 60
  while (t < limit && !gateReady(s)) {
    advance(s, dt)
    t += dt
    tapAcc += dt
    while (tapAcc >= 1 / tapsPerSec) {
      tapAcc -= 1 / tapsPerSec
      s.number = s.number.plus(1)
      if (s.number.gt(s.bestNumber)) s.bestNumber = s.number
      if (s.number.gt(s.peak)) s.peak = s.number
    }
    for (let i = 0; i < 8; i++) {
      if (!seenUnlock[i] && ringUnlocked(s, i)) { seenUnlock[i] = true; unlockTimes[i] = t / 60 }
    }
    decAcc += dt
    if (decAcc < 0.5) continue
    decAcc = 0
    if (!firstBoostDone) {
      let picked = -1
      for (let i = 7; i >= 0; i--) {
        if (ringUnlocked(s, i) && s.rings[i].bought < NUMBER_TUNING.unlockThreshold) { picked = i; break }
      }
      if (picked >= 0) { if (buyRing(s, picked) > 0 && t <= 600) first10++ }
      else {
        for (let i = 7; i >= 0; i--) { if (ringUnlocked(s, i) && s.number.gte(ringCost(s, i))) { buyRing(s, i); break } }
      }
    } else {
      if (cycleBuys < 2) {
        if (s.rings[0].bought === 0 && s.number.gte(ringCost(s, 0))) { buyRing(s, 0); cycleBuys++ }
        else if (s.number.gte(ringCost(s, 7))) { buyRing(s, 7); cycleBuys++ }
      }
    }
    if (canBoost(s) && s.number.gte(threshold)) {
      lastPeak = s.number.toNumber()
      applyBoost(s)
      firstBoostDone = true
      cycleBuys = 0
      const gain = Math.pow(lastPeak / 10, 0.2)
      threshold = lastPeak * gain
    }
  }
  return {
    gateMin: gateReady(s) ? t / 60 : null,
    boosts: s.boosts,
    buys: s.totalBuys,
    unlocks: unlockTimes,
    first10
  }
}

for (const dt of [0.05, 0.1, 0.5]) {
  const r = run(dt, 2)
  console.log('dt=' + dt, JSON.stringify({
    gateMin: r.gateMin === null ? null : Number(r.gateMin.toFixed(1)),
    boosts: r.boosts,
    buys: r.buys,
    first10: r.first10,
    unlocks: r.unlocks.map((x) => Number((x ?? 0).toFixed(1)))
  }))
}
