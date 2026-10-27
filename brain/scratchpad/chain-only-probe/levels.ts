/**
 * SEVIYE (LEVEL) KATMANI OLCUMU - salt okuma, src/ degismez.
 *
 * Fikir: sifirlama YOK. Her halka kendi "seviye"sini alir; her seviye o halkanin
 * sayiya katkisini m kati yapar. Maliyet o halkanin taban fiyatindan turer ve her
 * seviyede C kati artar. Boylece para her zaman bir yere gider ve buyume bilesiklesir.
 */
import { Decimal } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT } from '../../../src/game/number/tuning'

const GATE = new Decimal('1.79e308')
const G = 1.2
const d = (x) => new Decimal(x)

function costAt(base, bought) { return base.times(d(G).pow(bought)) }
function maxAffordable(base, bought, budget) {
  const cost = costAt(base, bought)
  if (budget.lt(cost)) return 0
  const g = d(G)
  const raw = budget.div(cost).times(g.minus(1)).plus(1).log10().div(g.log10()).floor().toNumber()
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), 1000) : 0
}

function run(cfg) {
  const { levelMult, levelCostFactor, levelCostGrowth, levelStart, tapsPerSecond, limitHours, dt, policy } = cfg
  let number = d(10)
  let amount = new Array(RING_COUNT).fill(0).map(() => d(0))
  let bought = new Array(RING_COUNT).fill(0)
  let level = new Array(RING_COUNT).fill(0)
  let unlocked = new Array(RING_COUNT).fill(false)
  unlocked[0] = true
  let totalBuys = 0
  let totalLevels = 0
  let seconds = 0
  let tapAcc = 0
  let decAcc = 0
  const limit = limitHours * 3600
  let gateMin = null
  const unlockMin = new Array(RING_COUNT).fill(null)

  const levelCost = (i, l) =>
    NUMBER_TUNING.rings[i].baseCost.times(d(levelCostFactor)).times(d(levelCostGrowth).pow(l + levelStart))

  const rate = (i) => NUMBER_TUNING.rings[i].baseRate.times(d(levelMult).pow(level[i]))

  while (seconds < limit) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      amount[i] = amount[i].plus(amount[i + 1].times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt))
    }
    let perSecond = d(0)
    for (let i = 0; i < RING_COUNT; i++) perSecond = perSecond.plus(amount[i].times(rate(i)))
    number = number.plus(perSecond.times(dt))
    seconds += dt

    tapAcc += dt
    while (tapAcc >= 1 / tapsPerSecond) { tapAcc -= 1 / tapsPerSecond; number = number.plus(1) }

    for (let i = 0; i < RING_COUNT; i++) if (unlockMin[i] === null && unlocked[i]) unlockMin[i] = seconds / 60
    if (gateMin === null && number.gte(GATE)) { gateMin = seconds / 60; break }

    decAcc += dt
    if (decAcc < 0.5) continue
    decAcc = 0

    // Politika: once seviye mi, once birim mi?
    let acted = false
    if (policy === 'levels-first') {
      let best = -1
      let bestValue = 0
      for (let i = 0; i < RING_COUNT; i++) {
        if (!unlocked[i]) continue
        const c = levelCost(i, level[i])
        if (number.lt(c)) continue
        const value = Number(amount[i].times(rate(i)).times(d(levelMult - 1)).div(c).toString())
        if (value > bestValue) { bestValue = value; best = i }
      }
      if (best >= 0) {
        number = number.minus(levelCost(best, level[best]))
        level[best] += 1
        totalLevels += 1
        acted = true
      }
    }

    if (!acted) {
      let picked = -1
      for (let i = RING_COUNT - 1; i >= 0; i--) if (unlocked[i] && bought[i] < BLOCK_SIZE) { picked = i; break }
      if (picked >= 0) {
        const need = BLOCK_SIZE - bought[picked]
        const count = Math.min(need, maxAffordable(NUMBER_TUNING.rings[picked].baseCost, bought[picked], number))
        for (let c = 0; c < count; c++) {
          const price = costAt(NUMBER_TUNING.rings[picked].baseCost, bought[picked])
          if (number.lt(price)) break
          number = number.minus(price)
          amount[picked] = amount[picked].plus(1)
          bought[picked] += 1
          totalBuys += 1
          if (bought[picked] >= BLOCK_SIZE && picked + 1 < RING_COUNT) unlocked[picked + 1] = true
        }
      } else {
        // En ucuz birim alimi (blok degil, tek tek) - para akisini korur
        let best = -1
        for (let i = 0; i < RING_COUNT; i++) {
          if (!unlocked[i]) continue
          const price = costAt(NUMBER_TUNING.rings[i].baseCost, bought[i])
          if (number.lt(price)) continue
          if (best < 0 || price.lt(costAt(NUMBER_TUNING.rings[best].baseCost, bought[best]))) best = i
        }
        if (best >= 0) {
          number = number.minus(costAt(NUMBER_TUNING.rings[best].baseCost, bought[best]))
          amount[best] = amount[best].plus(1)
          bought[best] += 1
          totalBuys += 1
        }
      }
    }
  }

  return { gateMin, totalBuys, totalLevels, unlocks: unlockMin, number: number.toString() }
}

console.log('SEVIYE KATMANI / hedef ~120 dk / 2 tik/sn / dt=0,5')
console.log('m  | C   | bas | kapi (dk) | alim | seviye | 8. halka')
const cases = []
for (const levelMult of [2, 3]) {
  for (const levelCostGrowth of [100, 1000, 10000]) {
    cases.push({ levelMult, levelCostFactor: 10, levelCostGrowth, levelStart: 0 })
  }
}
for (const cfg of cases) {
  const r = run({ ...cfg, tapsPerSecond: 2, dt: 0.5, limitHours: 12, policy: 'levels-first' })
  console.log(
    String(cfg.levelMult).padEnd(2) + ' | ' + String(cfg.levelCostGrowth).padEnd(5) + ' | 0   | ' +
    (r.gateMin === null ? 'yok (>12sa)'.padStart(9) : r.gateMin.toFixed(1).padStart(9)) + ' | ' +
    String(r.totalBuys).padStart(4) + ' | ' + String(r.totalLevels).padStart(6) + ' | ' +
    (r.unlocks[7] === null ? '-' : r.unlocks[7].toFixed(1)).padStart(8)
  )
}
