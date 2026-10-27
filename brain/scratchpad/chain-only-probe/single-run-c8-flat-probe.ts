/**
 * B=5.5 + C8 DUZ CARPAN BITIRICI (salt okuma).
 * 1e275'ten sonra uretim xM. Amac: 3-5 dk'lik final push icin M ne olmali?
 */
import { Decimal, D } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT, ringBlockCost, ringCostAt } from '../../../src/game/number/tuning'
import { createNumberState, ringUnlocked } from '../../../src/game/number/economy'

const GATE = D('1.79e308')
const B = 5.5
const GROWTH = 1.2
const SWITCH = D('1e275')

function blockMult(bought: number): Decimal {
  const exp = Math.floor(bought / BLOCK_SIZE)
  if (exp <= 0) return D(1)
  if (exp <= 300) return D(Math.pow(B, exp))
  return new Decimal(B).pow(exp)
}

function buyWith(state: ReturnType<typeof createNumberState>, i: number, count: number): number {
  let n = 0
  for (let k = 0; k < count; k++) {
    if (!ringUnlocked(state, i)) break
    const cost = ringCostAt(NUMBER_TUNING.rings[i].baseCost, state.rings[i].bought, GROWTH)
    if (state.number.lt(cost)) break
    state.number = state.number.minus(cost)
    state.rings[i].amount = state.rings[i].amount.plus(1)
    state.rings[i].bought += 1
    state.totalBuys += 1
    n++
    if (state.rings[i].bought >= NUMBER_TUNING.unlockThreshold && i + 1 < RING_COUNT) {
      state.unlocked[i + 1] = true
    }
  }
  return n
}

function run(finishMult: number): { gate: number | null; t275: number | null; tail: number | null; bought: number } {
  const state = createNumberState()
  const dt = 0.5
  let seconds = 0
  let tapAcc = 0
  let buyAcc = 0
  let t275: number | null = null
  const limit = 8 * 3600

  while (seconds < limit) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      const feeder = state.rings[i + 1]
      state.rings[i].amount = state.rings[i].amount.plus(
        feeder.amount.times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt)
      )
    }
    let perSecond = state.rings[0].amount
      .times(NUMBER_TUNING.rings[0].baseRate)
      .times(blockMult(state.rings[0].bought))
    for (let i = 1; i < RING_COUNT; i++) {
      perSecond = perSecond.plus(
        state.rings[i].amount.times(NUMBER_TUNING.rings[i].baseRate).times(blockMult(state.rings[i].bought))
      )
    }
    if (state.number.gte(SWITCH)) perSecond = perSecond.times(finishMult)
    if (perSecond.gt(0)) state.number = state.number.plus(perSecond.times(dt))
    if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
    seconds += dt

    tapAcc += dt
    while (tapAcc >= 0.5) {
      tapAcc -= 0.5
      state.number = state.number.plus(1)
    }

    buyAcc += dt
    if (buyAcc >= 0.5) {
      buyAcc = 0
      for (let i = RING_COUNT - 1; i >= 0; i--) {
        if (!ringUnlocked(state, i)) continue
        for (let guard = 0; guard < 500; guard++) {
          const price = ringBlockCost(NUMBER_TUNING.rings[i].baseCost, state.rings[i].bought, BLOCK_SIZE, GROWTH)
          if (state.number.lt(price)) break
          buyWith(state, i, BLOCK_SIZE)
        }
      }
    }

    if (t275 === null && state.number.gte(SWITCH)) t275 = seconds / 60
    if (state.number.gte(GATE)) {
      const gate = seconds / 60
      return { gate, t275, tail: t275 === null ? null : gate - t275, bought: state.totalBuys }
    }
  }
  return { gate: null, t275, tail: null, bought: state.totalBuys }
}

const f = (x: number | null) => (x === null ? '-' : x.toFixed(1))
for (const m of [75, 100, 150, 300, 1000, 3000]) {
  const r = run(m)
  console.log(
    'x' + String(m).padStart(3) +
      ' | 1e275 ' + f(r.t275).padStart(6) +
      ' | KAPI ' + (r.gate === null ? 'yok' : r.gate.toFixed(1) + ' dk') +
      ' | son itis ' + f(r.tail).padStart(5) + ' dk' +
      ' | alim ' + r.bought
  )
}
