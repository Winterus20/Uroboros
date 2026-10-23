/** Fiyat çalışması: analitik geri ödeme + motor koşusu (geçici ölçüm aracı). */
import { D } from '../../../src/core/math'
import { NUMBER_TUNING } from '../../../src/game/number/tuning'
import {
  advance, applyBoost, buyRing, canBoost, createNumberState, gateReady, manualTap, ringCost, ringUnlocked
} from '../../../src/game/number/economy'

type MutableTuning = { rings: { name: string; baseCost: unknown; baseRate: unknown }[] }

const RATES = [0.071, 0.07455, 0.07828, 0.08219, 0.0863, 0.09061, 0.09514, 0.0999]

function setLadder(costs: number[], rates: number[]): void {
  const t = NUMBER_TUNING as unknown as MutableTuning
  t.rings = costs.map((cost, i) => ({ name: t.rings[i].name, baseCost: D(cost), baseRate: D(rates[i]) }))
}

const G = NUMBER_TUNING.costGrowth

/** 10 birimlik kilit bedeli (geometrik seri). */
function tollCost(cost: number): number {
  return cost * (Math.pow(G, 10) - 1) / (G - 1)
}

/** Analitik geri ödeme: c_i / (p_i · c_{i-1}) saniye. */
function paybacks(costs: number[], rates: number[]): number[] {
  const out: number[] = [costs[0] / rates[0]]
  for (let i = 1; i < costs.length; i++) out.push(costs[i] / (rates[i] * costs[i - 1]))
  return out
}

interface Run { gateMin: number | null; boosts: number; buys: number; first10: number; unlocks: number[] }

function runEngine(costs: number[], rates: number[], tapsPerSec = 2, dt = 0.5): Run {
  setLadder(costs, rates)
  const s = createNumberState()
  let t = 0, tapAcc = 0, decAcc = 0, firstBoost = false, cycleBuys = 0
  let threshold = costs[7] * 10
  let first10 = 0
  const unlocks: number[] = []
  const seen = new Array(8).fill(false)
  while (t < 300 * 60 && !gateReady(s)) {
    advance(s, dt)
    t += dt
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
      const peak = s.number.toNumber()
      applyBoost(s)
      firstBoost = true; cycleBuys = 0
      threshold = peak * Math.pow(peak / 10, 0.2)
    }
  }
  return { gateMin: gateReady(s) ? t / 60 : null, boosts: s.boosts, buys: s.totalBuys, first10, unlocks }
}

const CANDIDATES: { name: string; costs: number[] }[] = [
  { name: 'MEVCUT', costs: [25, 79.06, 250, 790.57, 2500, 7905.69, 25000, 79056.94] },
  { name: 'YUVARLAK-3.16', costs: [25, 80, 250, 800, 2500, 8000, 25000, 80000] },
  { name: 'DUZ-ODEME-40s', costs: [25, 75, 235, 770, 2650, 9600, 36500, 146000] },
  { name: 'KADEMELI-2.8-4.0', costs: [25, 70, 215, 700, 2350, 8200, 30000, 120000] },
  { name: 'SADE-1-2-5', costs: [25, 75, 250, 750, 2500, 7500, 25000, 75000] }
]

for (const c of CANDIDATES) {
  const pb = paybacks(c.costs, RATES)
  const r = runEngine(c.costs, RATES)
  console.log(
    c.name.padEnd(18),
    '| kapi', r.gateMin === null ? 'yok' : r.gateMin.toFixed(1),
    '| boost', r.boosts,
    '| alim', r.buys,
    '| ilk10dk', r.first10,
    '| odeme', pb.map((x) => x.toFixed(0)).join('/'),
    '| kilit-bedeli', c.costs.map((x) => Math.round(tollCost(x))).join('/')
  )
}
