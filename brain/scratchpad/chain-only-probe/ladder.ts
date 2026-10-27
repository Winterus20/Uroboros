/**
 * GEREKSINIM MERDIVENI (requirement ladder) OLCUMU - salt okuma.
 *
 * Teshis: sabit uslu boost (zirve/10)^e dongu KONTROLDEN CIKIYOR — cunku odul
 * zirveye, zirve de carpanla buyuyor; 40. dakikadan sonra her 12 saniyede bir
 * boost aliniyor (olculdu: 43 boost'un 28'i son 5 dakikada).
 *
 * Cozum adayi: BOOST'UN KOSULU her turda olceklensin (AD / Cookie Clicker usulu).
 *   tur i icin gerekli zirve:  R_i = R_0 * k^i
 *   odul SABIT:                carpan *= m  (ya da log-artim)
 * Boylece her tur bir oncekinden uzun surer; dongu asla patlamaz.
 *
 * Hedef: kapi 1,79e308 ~120 dk · tur suresi MONOTON ARTIYOR · boost sayisi 8-15.
 */
import { Decimal } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT } from '../../../src/game/number/tuning'

const GATE = new Decimal('1.79e308')
const G = 1.2
const d = (x) => new Decimal(x)

const costAt = (base, bought) => base.times(d(G).pow(bought))
function maxAffordable(base, bought, budget) {
  const cost = costAt(base, bought)
  if (budget.lt(cost)) return 0
  const g = d(G)
  const raw = budget.div(cost).times(g.minus(1)).plus(1).log10().div(g.log10()).floor().toNumber()
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), 1000) : 0
}

function run(cfg) {
  const { startLog, reqGrowthLog, rewardLog, tapsPerSecond, limitHours, dt } = cfg
  let number = d(10)
  let amount = new Array(RING_COUNT).fill(0).map(() => d(0))
  let bought = new Array(RING_COUNT).fill(0)
  let unlocked = new Array(RING_COUNT).fill(false)
  unlocked[0] = true
  let mult = d(1)
  let boosts = 0
  let totalBuys = 0
  let seconds = 0
  let tapAcc = 0
  let decAcc = 0
  const limit = limitHours * 3600
  let gateMin = null
  let reqLog = startLog
  const cycleMinutes = []
  let lastBoostSec = 0

  while (seconds < limit && gateMin === null) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      amount[i] = amount[i].plus(amount[i + 1].times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt))
    }
    let perSecond = amount[0].times(NUMBER_TUNING.rings[0].baseRate)
    for (let i = 1; i < RING_COUNT; i++) perSecond = perSecond.plus(amount[i].times(NUMBER_TUNING.rings[i].baseRate))
    number = number.plus(perSecond.times(mult).times(dt))
    seconds += dt

    tapAcc += dt
    while (tapAcc >= 1 / tapsPerSecond) { tapAcc -= 1 / tapsPerSecond; number = number.plus(1) }

    decAcc += dt
    if (decAcc < 0.5) continue
    decAcc = 0

    if (number.gte(GATE)) { gateMin = seconds / 60; break }

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
      let best = -1
      for (let i = 0; i < RING_COUNT; i++) {
        if (!unlocked[i]) continue
        const price = costAt(NUMBER_TUNING.rings[i].baseCost, bought[i])
        if (number.lt(price)) continue
        if (best < 0 || price.lt(costAt(NUMBER_TUNING.rings[best].baseCost, bought[best]))) best = i
      }
      if (best >= 0) {
        for (let c = 0; c < BLOCK_SIZE; c++) {
          const price = costAt(NUMBER_TUNING.rings[best].baseCost, bought[best])
          if (number.lt(price)) break
          number = number.minus(price)
          amount[best] = amount[best].plus(1)
          bought[best] += 1
          totalBuys += 1
        }
      }
    }

    if (bought[RING_COUNT - 1] >= BLOCK_SIZE && number.log10().toNumber() >= reqLog) {
      mult = mult.times(d(10).pow(rewardLog))
      boosts += 1
      cycleMinutes.push((seconds - lastBoostSec) / 60)
      lastBoostSec = seconds
      reqLog += reqGrowthLog
      number = d(10)
      amount = new Array(RING_COUNT).fill(0).map(() => d(0))
      bought = new Array(RING_COUNT).fill(0)
      unlocked = new Array(RING_COUNT).fill(false)
      unlocked[0] = true
    }
  }

  return { gateMin, boosts, totalBuys, cycleMinutes, mult: mult.log10().toNumber() }
}

console.log('GEREKSINIM MERDIVENI / tam sifirlama / 2 tik/sn / dt=0,5 / 24 sa tavan')
console.log('R0    | artis | odul | kapi (dk) | boost | alim  | turler (dk)')
for (const startLog of [6, 8, 10]) {
  for (const reqGrowthLog of [2, 3, 4]) {
    for (const rewardLog of [1.5, 2]) {
      const r = run({ startLog, reqGrowthLog, rewardLog, tapsPerSecond: 2, dt: 0.5, limitHours: 24 })
      console.log(
        '1e' + String(startLog).padEnd(3) + ' | +' + String(reqGrowthLog).padEnd(4) + ' | x1e' + String(rewardLog).padEnd(3) + ' | ' +
        (r.gateMin === null ? 'yok (>24sa)'.padStart(9) : r.gateMin.toFixed(1).padStart(9)) + ' | ' +
        String(r.boosts).padStart(5) + ' | ' + String(r.totalBuys).padStart(5) + ' | ' +
        r.cycleMinutes.map((m) => m.toFixed(1)).join(' ')
      )
    }
  }
}
