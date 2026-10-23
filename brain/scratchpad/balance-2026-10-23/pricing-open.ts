/** Açılış (c1) ve ROI taraması. */
import { D } from '../../../src/core/math'
import { NUMBER_TUNING } from '../../../src/game/number/tuning'
import { advance, applyBoost, buyRing, canBoost, createNumberState, gateReady, manualTap, ringCost, ringUnlocked } from '../../../src/game/number/economy'

type MutableTuning = { rings: { name: string; baseCost: unknown; baseRate: unknown }[] }
const RATES = [0.071, 0.07455, 0.07828, 0.08219, 0.0863, 0.09061, 0.09514, 0.0999]
const BASE = [1, 3.2, 3.125, 3.2, 3.125, 3.2, 3.125, 3.2]

function ladder(c1: number): number[] {
  const out = [c1]
  for (let i = 1; i < 8; i++) out.push(out[i - 1] * BASE[i])
  return out.map((x) => (x >= 1000 ? Math.round(x / 100) * 100 : Math.round(x)))
}

function setLadder(costs: number[], rates: number[]): void {
  const t = NUMBER_TUNING as unknown as MutableTuning
  t.rings = costs.map((cost, i) => ({ name: t.rings[i].name, baseCost: D(cost), baseRate: D(rates[i]) }))
}

function runEngine(costs: number[], tapsPerSec: number, dt = 0.5) {
  setLadder(costs, RATES)
  const s = createNumberState()
  let t = 0, tapAcc = 0, decAcc = 0, firstBoost = false, cycleBuys = 0
  let threshold = costs[7] * 10
  let firstBuySec: number | null = null
  const unlocks: number[] = []
  const seen = new Array(8).fill(false)
  while (t < 300 * 60 && !gateReady(s)) {
    advance(s, dt); t += dt
    tapAcc += dt
    while (tapAcc >= 1 / tapsPerSec) { tapAcc -= 1 / tapsPerSec; manualTap(s) }
    for (let i = 0; i < 8; i++) if (!seen[i] && ringUnlocked(s, i)) { seen[i] = true; unlocks[i] = t / 60 }
    decAcc += dt
    if (decAcc < 0.5) continue
    decAcc = 0
    if (!firstBoost) {
      let picked = -1
      for (let i = 7; i >= 0; i--) if (ringUnlocked(s, i) && s.rings[i].bought < 10) { picked = i; break }
      if (picked >= 0) { if (buyRing(s, picked) > 0 && firstBuySec === null) firstBuySec = t }
      else for (let i = 7; i >= 0; i--) if (ringUnlocked(s, i) && s.number.gte(ringCost(s, i))) { if (buyRing(s, i) > 0 && firstBuySec === null) firstBuySec = t; break }
    } else if (cycleBuys < 2) {
      if (s.rings[0].bought === 0 && s.number.gte(ringCost(s, 0))) { buyRing(s, 0); cycleBuys++ }
      else if (s.number.gte(ringCost(s, 7))) { buyRing(s, 7); cycleBuys++ }
    }
    if (canBoost(s) && s.number.gte(threshold)) {
      const peak = s.number.toNumber(); applyBoost(s); firstBoost = true; cycleBuys = 0
      threshold = peak * Math.pow(peak / 10, 0.2)
    }
  }
  return { gate: gateReady(s) ? t / 60 : null, boosts: s.boosts, buys: s.totalBuys, firstBuy: firstBuySec, unlocks }
}

console.log('--- acilis (c1) taramasi, 2 tik/sn ---')
for (const c1 of [6, 10, 15, 20, 25]) {
  const costs = ladder(c1)
  const r = runEngine(costs, 2)
  console.log('c1=' + String(c1).padStart(2), '| merdiven', costs.join('/'), '| kapi', r.gate === null ? 'yok' : r.gate.toFixed(1), '| boost', r.boosts, '| alim', r.buys, '| ilk alim', r.firstBuy === null ? 'yok' : r.firstBuy.toFixed(1) + 's', '| acilis', r.unlocks.map((x) => (x ?? 0).toFixed(1)).join('/'))
}

console.log('--- c1=10: tiklamasiz ve 5 tik/sn ---')
for (const taps of [1, 5]) {
  const r = runEngine(ladder(10), taps)
  console.log('tik/sn=' + taps, '| kapi', r.gate === null ? 'yok' : r.gate.toFixed(1), '| boost', r.boosts, '| alim', r.buys)
}
