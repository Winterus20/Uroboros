/**
 * ZINCIRIN KENDISI BILESIKLESIRSE - salt okuma, src/ degismez.
 *
 * Tek degisiklik: her halkanin birim basina uretimi, o halkadan ALINAN birim sayisiyla
 * carparilir:  rate_i = base_i * r^bought_i
 *
 * Sifirlama YOK. Halkalar kaybedilmez. Boylece "aldiklarim sifirlanmiyor" sikayeti
 * kokten cozulur ve zincir polinom (t^8) yerine ussel buyur.
 *
 * Amac: kapi 1,79e308 hangi r'de ~120 dakikada gelir ve alim sayisi makul kalir (<=1500)?
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
  const { r, tapsPerSecond, limitHours, dt, share } = cfg
  let number = d(10)
  let amount = new Array(RING_COUNT).fill(0).map(() => d(0))
  let bought = new Array(RING_COUNT).fill(0)
  let unlocked = new Array(RING_COUNT).fill(false)
  unlocked[0] = true
  let totalBuys = 0
  let seconds = 0
  let tapAcc = 0
  let decAcc = 0
  const limit = limitHours * 3600
  let gateMin = null
  const unlockMin = new Array(RING_COUNT).fill(null)
  let numberAt120 = null

  while (seconds < limit) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      amount[i] = amount[i].plus(amount[i + 1].times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt))
    }
    let perSecond = d(0)
    for (let i = 0; i < RING_COUNT; i++) {
      let rate = NUMBER_TUNING.rings[i].baseRate.times(d(r).pow(bought[i]))
      if (i > 0) rate = rate.times(share)
      perSecond = perSecond.plus(amount[i].times(rate))
    }
    number = number.plus(perSecond.times(dt))
    seconds += dt

    tapAcc += dt
    while (tapAcc >= 1 / tapsPerSecond) { tapAcc -= 1 / tapsPerSecond; number = number.plus(1) }

    for (let i = 0; i < RING_COUNT; i++) if (unlockMin[i] === null && unlocked[i]) unlockMin[i] = seconds / 60
    if (numberAt120 === null && seconds >= 7200) numberAt120 = number.toString()
    if (gateMin === null && number.gte(GATE)) { gateMin = seconds / 60; break }

    decAcc += dt
    if (decAcc < 0.5) continue
    decAcc = 0

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
  }

  return { gateMin, totalBuys, unlockMin, numberAt120, number: number.toString() }
}

console.log('ZINCIR BILESIK / rate_i = base_i * r^bought_i / 2 tik/sn / dt=0,5')
console.log('r     | kapi (dk) | alim  | 8. halka | 120. dk sayi')
for (const r of [1.12, 1.14, 1.16, 1.18, 1.2, 1.25, 1.3]) {
  const res = run({ r, tapsPerSecond: 2, dt: 0.5, limitHours: 12, share: 1 })
  console.log(
    String(r).padEnd(5) + ' | ' +
    (res.gateMin === null ? 'yok'.padStart(9) : res.gateMin.toFixed(1).padStart(9)) + ' | ' +
    String(res.totalBuys).padStart(5) + ' | ' +
    (res.unlockMin[7] === null ? '-' : res.unlockMin[7].toFixed(1)).padStart(8) + ' | ' +
    (res.numberAt120 ?? '-').slice(0, 14)
  )
}
