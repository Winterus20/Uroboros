/** Duz üretim (p sabit) + 3,2 kat fiyat merdiveni testi. */
import { D } from '../../../src/core/math'
import { NUMBER_TUNING } from '../../../src/game/number/tuning'
import { advance, applyBoost, buyRing, canBoost, createNumberState, gateReady, manualTap, ringCost, ringUnlocked } from '../../../src/game/number/economy'

type MutableTuning = { rings: { name: string; baseCost: unknown; baseRate: unknown }[] }

function setLadder(costs: number[], rates: number[]): void {
  const t = NUMBER_TUNING as unknown as MutableTuning
  t.rings = costs.map((cost, i) => ({ name: t.rings[i].name, baseCost: D(cost), baseRate: D(rates[i]) }))
}

function runEngine(costs: number[], rates: number[], tapsPerSec = 2, dt = 0.5) {
  setLadder(costs, rates)
  const s = createNumberState()
  let t = 0, tapAcc = 0, decAcc = 0, firstBoost = false, cycleBuys = 0
  let threshold = costs[7] * 10
  let first10 = 0
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
      if (picked >= 0) { if (buyRing(s, picked) > 0 && t <= 600) first10++ }
      else for (let i = 7; i >= 0; i--) if (ringUnlocked(s, i) && s.number.gte(ringCost(s, i))) { if (buyRing(s, i) > 0 && t <= 600) first10++; break }
    } else if (cycleBuys < 2) {
      if (s.rings[0].bought === 0 && s.number.gte(ringCost(s, 0))) { buyRing(s, 0); cycleBuys++ }
      else if (s.number.gte(ringCost(s, 7))) { buyRing(s, 7); cycleBuys++ }
    }
    if (canBoost(s) && s.number.gte(threshold)) {
      const peak = s.number.toNumber(); applyBoost(s); firstBoost = true; cycleBuys = 0
      threshold = peak * Math.pow(peak / 10, 0.2)
    }
  }
  return { gate: gateReady(s) ? t / 60 : null, boosts: s.boosts, buys: s.totalBuys, first10, unlocks }
}

const FLAT = Array(8).fill(0.08)
const LADDER = [25, 80, 250, 800, 2500, 8000, 25000, 80000]
const EXACT = [25, 80, 256, 819, 2621, 8389, 26843, 85899]
const CASES = [
  { name: 'duz-p + yuvarlak', costs: LADDER, rates: FLAT },
  { name: 'duz-p + tam 3.2', costs: EXACT, rates: FLAT },
  { name: 'duz-p + yuvarlak c1=20', costs: [20, 64, 200, 640, 2000, 6400, 20000, 64000], rates: FLAT },
  { name: 'duz-p 0.075 c1=25', costs: LADDER, rates: Array(8).fill(0.075) },
  { name: 'duz-p 0.085 c1=25', costs: LADDER, rates: Array(8).fill(0.085) }
]

for (const c of CASES) {
  const r = runEngine(c.costs, c.rates)
  const pb = [c.costs[0] / c.rates[0], ...c.costs.slice(1).map((x, i) => x / (c.rates[i + 1] * c.costs[i]))]
  console.log(c.name.padEnd(22), '| kapi', r.gate === null ? 'yok' : r.gate.toFixed(1), '| boost', r.boosts, '| alim', r.buys, '| ilk10dk', r.first10, '| odeme', pb.map((x) => x.toFixed(0)).join('/'), '| acilis', r.unlocks.map((x) => (x ?? 0).toFixed(1)).join('/'))
}
