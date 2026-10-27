/**
 * B MERDIVENI OLCUMU (salt okuma; src/ degismez).
 * Sifirlama yok; her hedef gecilince blockMult tabani KALICI olarak artar.
 */
import { Decimal, D } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT } from '../../../src/game/number/tuning'
import {
  buyRing,
  createNumberState,
  manualTap,
  maxAffordableRing,
  ringBlockPrice,
  ringUnlocked
} from '../../../src/game/number/economy'

const GATE = D('1.79e308')
const GOALS = ['1e10', '1e18', '1e28', '1e40', '1e55', '1e75', '1e100', '1e135'].map((g) => D(g))

function mult(bought: number, base: number): Decimal {
  const exp = Math.floor(bought / BLOCK_SIZE)
  if (exp <= 0) return D(1)
  if (exp <= 300) return D(Math.pow(base, exp))
  return new Decimal(base).pow(exp)
}

function tick(state: ReturnType<typeof createNumberState>, dt: number, base: number): void {
  for (let i = 0; i < RING_COUNT - 1; i++) {
    const feeder = state.rings[i + 1]
    state.rings[i].amount = state.rings[i].amount.plus(
      feeder.amount.times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt)
    )
  }
  let perSecond = state.rings[0].amount
    .times(NUMBER_TUNING.rings[0].baseRate)
    .times(mult(state.rings[0].bought, base))
  for (let i = 1; i < RING_COUNT; i++) {
    perSecond = perSecond.plus(
      state.rings[i].amount.times(NUMBER_TUNING.rings[i].baseRate).times(mult(state.rings[i].bought, base))
    )
  }
  if (perSecond.gt(0)) state.number = state.number.plus(perSecond.times(dt))
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
}

interface Result {
  step: number
  base: number
  gateMinutes: number | null
  goalsHit: number
  twoHour: string
  goalTimes: number[]
}

function run(step: number): Result {
  const state = createNumberState()
  const dt = 0.5
  let base = 2.0
  let goalIndex = 0
  let seconds = 0
  let tapAcc = 0
  let buyAcc = 0
  let twoHour = ''
  const goalTimes: number[] = []
  const limit = 12 * 3600

  while (seconds < limit) {
    tick(state, dt, base)
    seconds += dt

    tapAcc += dt
    while (tapAcc >= 0.5) {
      tapAcc -= 0.5
      manualTap(state)
    }

    buyAcc += dt
    if (buyAcc >= 0.5) {
      buyAcc = 0
      let picked = -1
      for (let i = RING_COUNT - 1; i >= 0; i--) {
        if (ringUnlocked(state, i) && state.rings[i].bought < NUMBER_TUNING.unlockThreshold) {
          picked = i
          break
        }
      }
      if (picked >= 0) {
        const need = NUMBER_TUNING.unlockThreshold - state.rings[picked].bought
        buyRing(state, picked, Math.min(need, maxAffordableRing(state, picked)))
      } else {
        let best = -1
        for (let i = 0; i < RING_COUNT; i++) {
          if (!ringUnlocked(state, i)) continue
          const price = ringBlockPrice(state, i, BLOCK_SIZE)
          if (state.number.lt(price)) continue
          if (best < 0 || price.lt(ringBlockPrice(state, best, BLOCK_SIZE))) best = i
        }
        if (best >= 0) buyRing(state, best, BLOCK_SIZE)
      }
    }

    while (goalIndex < GOALS.length && state.number.gte(GOALS[goalIndex])) {
      base += step
      goalIndex++
      goalTimes.push(seconds / 60)
    }

    if (twoHour === '' && seconds >= 7200) twoHour = state.number.toExponential(3)
    if (state.number.gte(GATE)) {
      return { step, base, gateMinutes: seconds / 60, goalsHit: goalIndex, twoHour, goalTimes }
    }
  }
  return { step, base, gateMinutes: null, goalsHit: goalIndex, twoHour, goalTimes }
}

for (const step of [0.45]) {
  const r = run(step)
  console.log(
    'adim +' + step +
      ' | hedef ' + r.goalsHit + '/8' +
      ' | B ' + r.base.toFixed(2) +
      ' | 2 saat: ' + (r.twoHour || '-') +
      ' | KAPI: ' + (r.gateMinutes === null ? 'yok (12 sa)' : r.gateMinutes.toFixed(1) + ' dk')
  )
  console.log('hedef anlari (dk): ' + r.goalTimes.map((t) => t.toFixed(1)).join(' / '))
}
