/**
 * AD DIMENSION BOOST MODELI - salt okuma, src/ degismez.
 *
 * En basit dongu: kosul HEP AYNI (halka 8'den bir blok), odul SABIT carpan.
 * Tam sifirlama. Her tur bir oncekinden hizli biter cunku carpan buyudu.
 * Gerilim: carpan kucukse tur cok, buyukse tek tur atlanir.
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
  const { reward, needRing8, tapsPerSecond, limitHours, dt } = cfg
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
  const cycles = []
  let lastSec = 0

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

    if (bought[RING_COUNT - 1] >= needRing8) {
      mult = mult.times(reward)
      boosts += 1
      cycles.push((seconds - lastSec) / 60)
      lastSec = seconds
      number = d(10)
      amount = new Array(RING_COUNT).fill(0).map(() => d(0))
      bought = new Array(RING_COUNT).fill(0)
      unlocked = new Array(RING_COUNT).fill(false)
      unlocked[0] = true
    }
  }

  return { gateMin, boosts, totalBuys, cycles }
}

console.log('AD DIMENSION BOOST MODELI / sabit odul / tam sifirlama / 2 tik/sn')
console.log('odul | blok | kapi (dk) | boost | alim  | ilk 6 tur (dk)')
for (const reward of [2, 3, 5, 10]) {
  for (const needRing8 of [BLOCK_SIZE, 20]) {
    const r = run({ reward, needRing8, tapsPerSecond: 2, dt: 0.5, limitHours: 24 })
    console.log(
      'x' + String(reward).padEnd(4) + ' | ' + String(needRing8).padEnd(4) + ' | ' +
      (r.gateMin === null ? 'yok (>24sa)'.padStart(9) : r.gateMin.toFixed(1).padStart(9)) + ' | ' +
      String(r.boosts).padStart(5) + ' | ' + String(r.totalBuys).padStart(5) + ' | ' +
      r.cycles.slice(0, 6).map((m) => m.toFixed(1)).join(' ')
    )
  }
}
