/**
 * B=5.5 + C8 BITIRICI + POLITIKA OLCUMU (salt okuma; src/ degismez).
 * Iki politika: "cheapest block" (eski probe) ve "max all" (plana yakin: en derin halkadan blokla).
 * C8 odulu: sayi 1e275'i gecince fiyat artisi 1.20 -> 1.15.
 */
import { Decimal, D } from '../../../src/core/math'
import {
  BLOCK_SIZE,
  NUMBER_TUNING,
  RING_COUNT,
  maxAffordableCount,
  ringBlockCost,
  ringCostAt
} from '../../../src/game/number/tuning'
import { createNumberState, ringUnlocked } from '../../../src/game/number/economy'

const GATE = D('1.79e308')
const B = 5.5
const BASE_GROWTH = 1.2
const FINISH_GROWTH = 1.15

function blockMult(bought: number): Decimal {
  const exp = Math.floor(bought / BLOCK_SIZE)
  if (exp <= 0) return D(1)
  if (exp <= 300) return D(Math.pow(B, exp))
  return new Decimal(B).pow(exp)
}

function buyWith(state: ReturnType<typeof createNumberState>, i: number, count: number, growth: number): number {
  let n = 0
  for (let k = 0; k < count; k++) {
    if (!ringUnlocked(state, i)) break
    const cost = ringCostAt(NUMBER_TUNING.rings[i].baseCost, state.rings[i].bought, growth)
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

function tick(state: ReturnType<typeof createNumberState>, dt: number): void {
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
  if (perSecond.gt(0)) state.number = state.number.plus(perSecond.times(dt))
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
}

type Policy = 'cheapest' | 'maxall'

interface Run {
  policy: Policy
  switchAt: string | null
  t210: number | null
  t240: number | null
  t275: number | null
  b7At275: number | null
  gate: number | null
  finalBought: number
}

function run(policy: Policy, switchAt: Decimal | null, finishGrowth = FINISH_GROWTH): Run {
  const state = createNumberState()
  const dt = 0.5
  let seconds = 0
  let tapAcc = 0
  let buyAcc = 0
  let t210: number | null = null
  let t240: number | null = null
  let t275: number | null = null
  let b7At275: number | null = null
  const limit = 8 * 3600

  while (seconds < limit) {
    tick(state, dt)
    seconds += dt

    tapAcc += dt
    while (tapAcc >= 0.5) {
      tapAcc -= 0.5
      state.number = state.number.plus(1)
      if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
    }

    const growth = switchAt !== null && state.number.gte(switchAt) ? finishGrowth : BASE_GROWTH

    buyAcc += dt
    if (buyAcc >= 0.5) {
      buyAcc = 0
      if (policy === 'maxall') {
        for (let i = RING_COUNT - 1; i >= 0; i--) {
          if (!ringUnlocked(state, i)) continue
          for (let guard = 0; guard < 500; guard++) {
            const price = ringBlockCost(NUMBER_TUNING.rings[i].baseCost, state.rings[i].bought, BLOCK_SIZE, growth)
            if (state.number.lt(price)) break
            buyWith(state, i, BLOCK_SIZE, growth)
          }
        }
      } else {
        let picked = -1
        for (let i = RING_COUNT - 1; i >= 0; i--) {
          if (ringUnlocked(state, i) && state.rings[i].bought < NUMBER_TUNING.unlockThreshold) {
            picked = i
            break
          }
        }
        if (picked >= 0) {
          const need = NUMBER_TUNING.unlockThreshold - state.rings[picked].bought
          buyWith(
            state,
            picked,
            Math.min(
              need,
              maxAffordableCount(NUMBER_TUNING.rings[picked].baseCost, state.rings[picked].bought, state.number, growth)
            ),
            growth
          )
        } else {
          let best = -1
          for (let i = 0; i < RING_COUNT; i++) {
            if (!ringUnlocked(state, i)) continue
            const price = ringBlockCost(NUMBER_TUNING.rings[i].baseCost, state.rings[i].bought, BLOCK_SIZE, growth)
            if (state.number.lt(price)) continue
            if (
              best < 0 ||
              price.lt(ringBlockCost(NUMBER_TUNING.rings[best].baseCost, state.rings[best].bought, BLOCK_SIZE, growth))
            ) {
              best = i
            }
          }
          if (best >= 0) buyWith(state, best, BLOCK_SIZE, growth)
        }
      }
    }

    if (t210 === null && state.number.gte(D('1e210'))) t210 = seconds / 60
    if (t240 === null && state.number.gte(D('1e240'))) t240 = seconds / 60
    if (t275 === null && state.number.gte(D('1e275'))) {
      t275 = seconds / 60
      b7At275 = state.rings[7].bought
    }
    if (state.number.gte(GATE)) {
      return {
        policy,
        switchAt: switchAt ? switchAt.toString() : null,
        t210,
        t240,
        t275,
        b7At275,
        gate: seconds / 60,
        finalBought: state.totalBuys
      }
    }
  }
  return {
    policy,
    switchAt: switchAt ? switchAt.toString() : null,
    t210,
    t240,
    t275,
    b7At275,
    gate: null,
    finalBought: state.totalBuys
  }
}

const fmt = (x: number | null) => (x === null ? '-' : x.toFixed(1))
for (const fg of [1.15, 1.16, 1.17, 1.18, 1.19]) {
  const r = run('maxall', D('1e275'), fg)
  const tail = r.gate !== null && r.t275 !== null ? r.gate - r.t275 : null
  console.log(
    'C8 taban ' + fg.toFixed(2) +
      ' | 1e275 ' + fmt(r.t275).padStart(6) +
      ' (Math ' + (r.b7At275 === null ? '-' : r.b7At275) + ')' +
      ' | KAPI ' + (r.gate === null ? 'yok' : r.gate.toFixed(1) + ' dk') +
      ' | son itis ' + (tail === null ? '-' : tail.toFixed(1) + ' dk') +
      ' | alim ' + r.finalBought
  )
}
