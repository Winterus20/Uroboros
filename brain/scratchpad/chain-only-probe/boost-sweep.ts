/**
 * BOOST US TARAMASI - salt okuma, src/ degismez.
 *
 * Sifirlama TAM: halkalar 0 birim, sayi 10, kilitler 1. halkaya doner (mandalli
 * kilitler de sifirlanir - "aldiklarim sifirlanmiyor" sikayetinin tam tersi).
 * Kalici olan tek sey: carpan. Ekranda da tek satir: "x1.4e6".
 *
 * Hedef: kapi 1,79e308 ~120 dakikada; boost sayisi 12-25 (her biri bir "an").
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
  const { exponent, minPeakLog10, tapsPerSecond, limitHours, dt } = cfg
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
  const boostMarks = []
  let firstBoostMin = null

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

    if (bought[RING_COUNT - 1] >= BLOCK_SIZE) {
      const peakLog = number.log10().toNumber()
      if (peakLog >= minPeakLog10) {
        const gain = number.div(10).pow(exponent)
        mult = mult.times(gain)
        boosts += 1
        boostMarks.push({ min: seconds / 60, peakLog, multLog: mult.log10().toNumber() })
        if (firstBoostMin === null) firstBoostMin = seconds / 60
        number = d(10)
        amount = new Array(RING_COUNT).fill(0).map(() => d(0))
        bought = new Array(RING_COUNT).fill(0)
        unlocked = new Array(RING_COUNT).fill(false)
        unlocked[0] = true
      }
    }
  }

  return { gateMin, boosts, totalBuys, boostMarks, firstBoostMin, mult: mult.toString() }
}

console.log('BOOST US TARAMASI / tam sifirlama / 2 tik/sn / dt=0,5 / esik 1e6')
console.log('us    | kapi (dk) | boost | alim  | ilk boost | son carpan')
for (const exponent of [0.06, 0.08, 0.1, 0.11, 0.12, 0.13, 0.14, 0.16]) {
  const r = run({ exponent, minPeakLog10: 6, tapsPerSecond: 2, dt: 0.5, limitHours: 24 })
  console.log(
    String(exponent).padEnd(5) + ' | ' +
    (r.gateMin === null ? 'yok'.padStart(9) : r.gateMin.toFixed(1).padStart(9)) + ' | ' +
    String(r.boosts).padStart(5) + ' | ' + String(r.totalBuys).padStart(5) + ' | ' +
    (r.firstBoostMin === null ? '-' : r.firstBoostMin.toFixed(1)).padStart(9) + ' | ' +
    r.mult
  )
}

const detail = run({ exponent: 0.12, minPeakLog10: 6, tapsPerSecond: 2, dt: 0.5, limitHours: 24 })
console.log('\nus=0,12 boost anlari (dk / zirve log10 / kumulatif carpan log10):')
console.log(detail.boostMarks.map((b) => b.min.toFixed(1) + ' dk  ' + b.peakLog.toFixed(1) + '  x1e' + b.multLog.toFixed(1)).join('\n'))
