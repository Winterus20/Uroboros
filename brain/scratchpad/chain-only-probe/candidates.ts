/**
 * ADAY MEKANIK OLCUMU - salt okuma, src/ degismez.
 *
 * Soru: 1. basamak 10 -> 1,79e308 arasini ~120 dakikada bitirebilsin diye
 * hangi carpan kurali gerekli? Hicbiri sifirlama yapmiyor (ADR-0082 dersi).
 *
 *   M1  her birim alimi o halkanin uretimini r kati yapar      (yerel us)
 *   M2  her X toplam alimda TUM halkalar 2 kati olur            (global esik)
 *   M3  her X toplam alimda TUM halkalar r kati olur            (global us)
 */
import { Decimal } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT } from '../../../src/game/number/tuning'

const GATE = new Decimal('1.79e308')
const G = 1.2
const d = (x) => new Decimal(x)

function costAt(base, bought) { return base.times(d(G).pow(bought)) }
function blockCost(base, bought, count) {
  const g = d(G)
  return costAt(base, bought).times(g.pow(count).minus(1)).div(g.minus(1))
}
function maxAffordable(base, bought, budget) {
  const cost = costAt(base, bought)
  if (budget.lt(cost)) return 0
  const g = d(G)
  const raw = budget.div(cost).times(g.minus(1)).plus(1).log10().div(g.log10()).floor().toNumber()
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), 1000) : 0
}

function run(cfg) {
  let number = d(10)
  let amount = new Array(RING_COUNT).fill(0).map(() => d(0))
  let bought = new Array(RING_COUNT).fill(0)
  let unlocked = new Array(RING_COUNT).fill(false)
  unlocked[0] = true
  let totalBuys = 0
  let seconds = 0
  let tapAcc = 0
  let decAcc = 0
  const limit = cfg.limitHours * 3600
  let gateMin = null
  let globalMult = d(1)
  let lastMilestone = 0
  const unlockMin = new Array(RING_COUNT).fill(null)

  while (seconds < limit) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      amount[i] = amount[i].plus(amount[i + 1].times(NUMBER_TUNING.rings[i + 1].baseRate).times(cfg.dt))
    }
    let perSecond = d(0)
    for (let i = 0; i < RING_COUNT; i++) {
      let rate = NUMBER_TUNING.rings[i].baseRate
      if (cfg.localFactor) rate = rate.times(d(cfg.localFactor).pow(bought[i]))
      perSecond = perSecond.plus(amount[i].times(rate))
    }
    number = number.plus(perSecond.times(globalMult).times(cfg.dt))
    seconds += cfg.dt

    tapAcc += cfg.dt
    while (tapAcc >= 1 / cfg.tapsPerSecond) { tapAcc -= 1 / cfg.tapsPerSecond; number = number.plus(1) }

    for (let i = 0; i < RING_COUNT; i++) if (unlockMin[i] === null && unlocked[i]) unlockMin[i] = seconds / 60
    if (gateMin === null && number.gte(GATE)) { gateMin = seconds / 60; break }

    decAcc += cfg.dt
    if (decAcc < 0.5) continue
    decAcc = 0

    let picked = -1
    for (let i = RING_COUNT - 1; i >= 0; i--) if (unlocked[i] && bought[i] < BLOCK_SIZE) { picked = i; break }
    const doBuy = (i, count) => {
      for (let c = 0; c < count; c++) {
        const price = costAt(NUMBER_TUNING.rings[i].baseCost, bought[i])
        if (number.lt(price)) break
        number = number.minus(price)
        amount[i] = amount[i].plus(1)
        bought[i] += 1
        totalBuys += 1
        if (bought[i] >= BLOCK_SIZE && i + 1 < RING_COUNT) unlocked[i + 1] = true
      }
    }
    if (picked >= 0) {
      const need = BLOCK_SIZE - bought[picked]
      doBuy(picked, Math.min(need, maxAffordable(NUMBER_TUNING.rings[picked].baseCost, bought[picked], number)))
    } else {
      let best = -1
      for (let i = 0; i < RING_COUNT; i++) {
        if (!unlocked[i]) continue
        const price = blockCost(NUMBER_TUNING.rings[i].baseCost, bought[i], BLOCK_SIZE)
        if (number.lt(price)) continue
        if (best < 0 || price.lt(blockCost(NUMBER_TUNING.rings[best].baseCost, bought[best], BLOCK_SIZE))) best = i
      }
      if (best >= 0) doBuy(best, BLOCK_SIZE)
    }

    if (cfg.globalPer) {
      while (totalBuys - lastMilestone >= cfg.globalPer) {
        lastMilestone += cfg.globalPer
        globalMult = globalMult.times(cfg.globalFactor)
      }
    }
  }

  return { gateMin, totalBuys, unlocks: unlockMin, number: number.toString() }
}

const cases = [
  ['M1 r=1.02', { localFactor: 1.02 }],
  ['M1 r=1.05', { localFactor: 1.05 }],
  ['M1 r=1.10', { localFactor: 1.1 }],
  ['M1 r=1.20', { localFactor: 1.2 }],
  ['M2 25 alim x2', { globalPer: 25, globalFactor: 2 }],
  ['M2 50 alim x2', { globalPer: 50, globalFactor: 2 }],
  ['M2 100 alim x2', { globalPer: 100, globalFactor: 2 }],
  ['M3 25 alim x1.5', { globalPer: 25, globalFactor: 1.5 }],
  ['M3 50 alim x1.5', { globalPer: 50, globalFactor: 1.5 }],
  ['M3 25 alim x1.25', { globalPer: 25, globalFactor: 1.25 }],
  ['M3 100 alim x1.5', { globalPer: 100, globalFactor: 1.5 }]
]

console.log('ADAY MEKANIKLER / hedef: kapi ~120 dk / 2 tik/sn / dt=0,5 / 12 saat tavan')
console.log('mekanik        | kapi (dk) | alim | 8. halka | 2. saat sayi')
for (const [label, cfg] of cases) {
  const r = run({ ...cfg, tapsPerSecond: 2, dt: 0.5, limitHours: 12 })
  const r120 = run({ ...cfg, tapsPerSecond: 2, dt: 0.5, limitHours: 2 })
  console.log(
    label.padEnd(14) + ' | ' +
    (r.gateMin === null ? 'yok'.padStart(8) : r.gateMin.toFixed(1).padStart(8)) + ' | ' +
    String(r.totalBuys).padStart(4) + ' | ' +
    (r.unlocks[7] === null ? '-' : r.unlocks[7].toFixed(1)).padStart(8) + ' | ' +
    r120.number
  )
}
