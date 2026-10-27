/**
 * BOOST DONGUSU YENIDEN OLCUMU - salt okuma, src/ degismez.
 *
 * ADR-0082 boost'u kaldirdi cunku (a) halkalar 1 birime iniyordu (oyuncu "sifirlanmadi"
 * diye okudu) ve (b) boost tek basina kapıya yetmiyordu. Burada iki soruyu olcuyorum:
 *
 *   1) TAM sifirlama (halkalar 0 birim, sayi 10) ile dongu kac tur / kac dakika surer?
 *   2) Kapiya (1,79e308) kac boost gerekir, carpan ussu ne olmali?
 *
 * Ekonomi AYNEN bugunku (tuning.ts): c=25 x8, g=1,20, p1=1, p2..8=0,11, blok 10.
 * Boost kosulu: halka 8'den 10 birim (tek blok) alinmis olmasi.
 */
import { Decimal } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT } from '../../../src/game/number/tuning'

const GATE = new Decimal('1.79e308')
const G = 1.2
const d = (x) => new Decimal(x)

function costAt(base, bought) {
  return base.times(d(G).pow(bought))
}
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

function run(opts) {
  const { exponent, resetTo, tapsPerSecond, limitHours, dt } = opts
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
  const cycleTimes = []
  let lastBoostAt = 0

  while (seconds < limit && gateMin === null) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      const gain = amount[i + 1].times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt)
      amount[i] = amount[i].plus(gain)
    }
    let perSecond = amount[0].times(NUMBER_TUNING.rings[0].baseRate)
    for (let i = 1; i < RING_COUNT; i++) {
      perSecond = perSecond.plus(amount[i].times(NUMBER_TUNING.rings[i].baseRate))
    }
    number = number.plus(perSecond.times(mult).times(dt))
    seconds += dt

    tapAcc += dt
    while (tapAcc >= 1 / tapsPerSecond) {
      tapAcc -= 1 / tapsPerSecond
      number = number.plus(mult)
    }

    decAcc += dt
    if (decAcc < 0.5) continue
    decAcc = 0

    if (number.gte(GATE)) { gateMin = seconds / 60; break }

    let picked = -1
    for (let i = RING_COUNT - 1; i >= 0; i--) {
      if (unlocked[i] && bought[i] < BLOCK_SIZE) { picked = i; break }
    }
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
        const price = blockCost(NUMBER_TUNING.rings[i].baseCost, bought[i], BLOCK_SIZE)
        if (number.lt(price)) continue
        if (best < 0 || price.lt(blockCost(NUMBER_TUNING.rings[best].baseCost, bought[best], BLOCK_SIZE))) best = i
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

    // Boost kosulu: halka 8'den bir blok alinmis olmasi
    if (bought[RING_COUNT - 1] >= BLOCK_SIZE) {
      const peak = number
      const gain = peak.div(10).pow(exponent)
      mult = mult.times(gain)
      boosts += 1
      cycleTimes.push((seconds - lastBoostAt) / 60)
      lastBoostAt = seconds
      number = d(10)
      amount = new Array(RING_COUNT).fill(0).map(() => d(0))
      bought = new Array(RING_COUNT).fill(0)
      unlocked = new Array(RING_COUNT).fill(false)
      unlocked[0] = true
      unlocked[1] = resetTo === 1 ? true : false
      if (resetTo === 1) amount[0] = d(1)
    }
  }

  return { gateMin, boosts, totalBuys, cycles: cycleTimes.length, medianCycle: cycleTimes.length ? cycleTimes.slice().sort((a, b) => a - b)[Math.floor(cycleTimes.length / 2)] : 0 }
}

console.log('BOOST DONGUSU: mevcut A+ ekonomisi, 2 tik/sn, dt=0,5, 12 saat tavan')
console.log('us    | sifir | kapi (dk) | boost | alim  | medyan tur')
for (const [exponent, resetTo] of [[0.15, 0], [0.2, 0], [0.25, 0], [0.3, 0], [0.4, 0], [0.2, 1], [0.3, 1], [0.4, 1]]) {
  const r = run({ exponent, resetTo, tapsPerSecond: 2, limitHours: 12, dt: 0.5 })
  console.log(
    String(exponent).padEnd(5) + ' | ' + String(resetTo).padEnd(5) + ' | ' +
    (r.gateMin === null ? 'yok (>12sa)' : r.gateMin.toFixed(1).padStart(9)) + ' | ' +
    String(r.boosts).padStart(5) + ' | ' + String(r.totalBuys).padStart(5) + ' | ' +
    r.medianCycle.toFixed(1) + ' dk'
  )
}
