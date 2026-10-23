/** Nihai fiyat tablosu ölçümü (uygulanmış sabitlerle). */
import { NUMBER_TUNING } from '../../../src/game/number/tuning'
import { advance, applyBoost, buyRing, canBoost, createNumberState, gateReady, manualTap, ringCost, ringUnlocked } from '../../../src/game/number/economy'

const s = createNumberState()
const bought = new Array(8).fill(0)
const unlocks: number[] = []
const seen = new Array(8).fill(false)
let t = 0, tapAcc = 0, decAcc = 0, firstBoost = false, cycleBuys = 0
let threshold = NUMBER_TUNING.rings[7].baseCost.toNumber() * 10
const G = NUMBER_TUNING.costGrowth

while (t < 300 * 60 && !gateReady(s)) {
  advance(s, 0.5); t += 0.5
  tapAcc += 0.5
  while (tapAcc >= 0.5) { tapAcc -= 0.5; manualTap(s) }
  for (let i = 0; i < 8; i++) if (!seen[i] && ringUnlocked(s, i)) { seen[i] = true; unlocks[i] = t / 60 }
  decAcc += 0.5
  if (decAcc < 0.5) continue
  decAcc = 0
  if (!firstBoost) {
    let picked = -1
    for (let i = 7; i >= 0; i--) if (ringUnlocked(s, i) && s.rings[i].bought < 10) { picked = i; break }
    if (picked >= 0) { if (buyRing(s, picked) > 0) bought[picked]++ }
    else for (let i = 7; i >= 0; i--) if (ringUnlocked(s, i) && s.number.gte(ringCost(s, i))) { if (buyRing(s, i) > 0) bought[i]++; break }
  } else if (cycleBuys < 2) {
    if (s.rings[0].bought === 0 && s.number.gte(ringCost(s, 0))) { buyRing(s, 0); bought[0]++; cycleBuys++ }
    else if (s.number.gte(ringCost(s, 7))) { buyRing(s, 7); bought[7]++; cycleBuys++ }
  }
  if (canBoost(s) && s.number.gte(threshold)) {
    const peak = s.number.toNumber(); applyBoost(s); firstBoost = true; cycleBuys = 0
    threshold = peak * Math.pow(peak / 10, 0.2)
  }
}

const toll = (c: number) => c * (Math.pow(G, 10) - 1) / (G - 1)
const payback = (i: number) => i === 0
  ? NUMBER_TUNING.rings[0].baseCost.toNumber() / NUMBER_TUNING.rings[0].baseRate.toNumber()
  : NUMBER_TUNING.rings[i].baseCost.toNumber() / (NUMBER_TUNING.rings[i].baseRate.toNumber() * NUMBER_TUNING.rings[i - 1].baseCost.toNumber())

console.log('| # | Halka | c | 10 birim | geri odeme | acilis | alim |');
for (let i = 0; i < 8; i++) {
  const c = NUMBER_TUNING.rings[i].baseCost.toNumber()
  console.log('|', i + 1, '|', NUMBER_TUNING.rings[i].name, '|', c, '|', Math.round(toll(c)), '|', payback(i).toFixed(0) + ' sn', '|', (unlocks[i] ?? 0).toFixed(1) + ' dk', '|', bought[i], '|')
}
console.log('kapi', (t / 60).toFixed(1), 'dk · boost', s.boosts, '· alim', s.totalBuys, '· son M', s.boostMult.log10().toNumber().toFixed(1))
