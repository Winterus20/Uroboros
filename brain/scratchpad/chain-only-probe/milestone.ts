/**
 * ESIK (MILESTONE) CARPANI DENEYI - salt okuma, src/ degismez.
 *
 * Soru: zincir tek basina 1,79e308'e ulasamiyor (olculdu: 96 saatte 2,8e34).
 * "Her 10 birimde o halkanin uretimi k katina cikar" kurali eklenirse 2 saatlik
 * hedef tutar mi? Maliyet ve zincir yapisi DEGISMIYOR.
 *
 * Model (gercek motorun ayni formulleri, multiplier enjekte edilmis hali):
 *   p_eff(i) = p(i) * k^floor(bought_i / 10)
 *   dA[i]/dt = A[i+1] * p_base_raw[i+1]        (zincir beslemesi carpan almaz, D1)
 *   dN/dt    = A[0]*p_eff(0) + sum A[i]*p_eff(i)*SHARE
 */
import { Decimal } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT } from '../../../src/game/number/tuning'

const GATE = new Decimal('1.79e308')
const G = 1.2

function costAt(base, bought) {
  return base.times(new Decimal(G).pow(bought))
}

function blockCost(base, bought, count) {
  const g = new Decimal(G)
  return costAt(base, bought).times(g.pow(count).minus(1)).div(g.minus(1))
}

function maxAffordable(base, bought, budget) {
  const cost = costAt(base, bought)
  if (budget.lt(cost)) return 0
  const g = new Decimal(G)
  const raw = budget.div(cost).times(g.minus(1)).plus(1).log10().div(g.log10()).floor().toNumber()
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), 1000) : 0
}

function run(opts) {
  const { k, tapsPerSecond, limitHours, dt, onlyRing1 } = opts
  const number = [new Decimal(10)]
  const amount = new Array(RING_COUNT).fill(0).map(() => new Decimal(0))
  const bought = new Array(RING_COUNT).fill(0)
  const unlocked = new Array(RING_COUNT).fill(false)
  unlocked[0] = true
  let seconds = 0
  let tapAcc = 0
  let decAcc = 0
  let totalBuys = 0
  const limit = limitHours * 3600
  const unlocks = new Array(RING_COUNT).fill(null)
  let gateMin = null

  const eff = (i) => {
    const base = NUMBER_TUNING.rings[i].baseRate
    if (i > 0 && onlyRing1) return base
    const mult = Math.pow(k, Math.floor(bought[i] / BLOCK_SIZE))
    return base.times(mult)
  }

  while (seconds < limit) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      const gain = amount[i + 1].times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt)
      amount[i] = amount[i].plus(gain)
    }
    let perSecond = amount[0].times(eff(0))
    for (let i = 1; i < RING_COUNT; i++) perSecond = perSecond.plus(amount[i].times(eff(i)))
    number[0] = number[0].plus(perSecond.times(dt))
    seconds += dt

    tapAcc += dt
    while (tapAcc >= 1 / tapsPerSecond) {
      tapAcc -= 1 / tapsPerSecond
      number[0] = number[0].plus(1)
    }
    for (let i = 0; i < RING_COUNT; i++) {
      if (unlocks[i] === null && unlocked[i]) unlocks[i] = seconds / 60
    }

    if (gateMin === null && number[0].gte(GATE)) gateMin = seconds / 60

    decAcc += dt
    if (decAcc < 0.5) continue
    decAcc = 0

    let picked = -1
    for (let i = RING_COUNT - 1; i >= 0; i--) {
      if (unlocked[i] && bought[i] < BLOCK_SIZE) { picked = i; break }
    }
    if (picked >= 0) {
      const need = BLOCK_SIZE - bought[picked]
      const count = Math.min(need, maxAffordable(NUMBER_TUNING.rings[picked].baseCost, bought[picked], number[0]))
      for (let c = 0; c < count; c++) {
        const price = costAt(NUMBER_TUNING.rings[picked].baseCost, bought[picked])
        if (number[0].lt(price)) break
        number[0] = number[0].minus(price)
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
        if (number[0].lt(price)) continue
        if (best < 0 || price.lt(blockCost(NUMBER_TUNING.rings[best].baseCost, bought[best], BLOCK_SIZE))) best = i
      }
      if (best >= 0) {
        for (let c = 0; c < BLOCK_SIZE; c++) {
          const price = costAt(NUMBER_TUNING.rings[best].baseCost, bought[best])
          if (number[0].lt(price)) break
          number[0] = number[0].minus(price)
          amount[best] = amount[best].plus(1)
          bought[best] += 1
          totalBuys += 1
        }
      }
    }
  }

  return { gateMin, number: number[0].toString(), totalBuys, unlocks }
}

const limitHours = Number(process.argv[2] ?? 8)
console.log('k = her 10 birimde o halkanin uretim carpani | ' + limitHours + ' saatlik kosu')
console.log('k     | kapi (dk) | ' + limitHours + '. saat sayi | alim')
for (const k of [1, 1.5, 2, 2.5, 3, 4]) {
  const r = run({ k, tapsPerSecond: 2, limitHours, dt: 0.5, onlyRing1: false })
  console.log(
    String(k).padEnd(5) +
      ' | ' +
      (r.gateMin === null ? 'yok    ' : r.gateMin.toFixed(1).padStart(7)) +
      ' | ' +
      r.number.padEnd(14) +
      ' | ' +
      String(r.totalBuys)
  )
}
