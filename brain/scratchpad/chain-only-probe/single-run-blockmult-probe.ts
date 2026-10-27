/**
 * TEK KOSU / BLOK CARPANI OLCUMU (salt okuma; src/ degismez).
 *
 * Soru: Sifirlama olmadan, blok carpani (blockMult^(bought/10)) ile
 * tek kosuda 1.79e308'e ne kadar surede ulasilir?
 *
 * Calistirma:
 *   npx esbuild brain/scratchpad/chain-only-probe/single-run-blockmult-probe.ts --bundle --platform=node --format=esm --outfile=brain/scratchpad/chain-only-probe/single-run-blockmult-probe.mjs
 *   node brain/scratchpad/chain-only-probe/single-run-blockmult-probe.mjs
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
const TARGETS: { name: string; value: Decimal }[] = [
  { name: '1e10', value: D('1e10') },
  { name: '1e18', value: D('1e18') },
  { name: '1e28', value: D('1e28') },
  { name: '1e40', value: D('1e40') },
  { name: '1e55', value: D('1e55') },
  { name: '1e75', value: D('1e75') },
  { name: '1e100', value: D('1e100') },
  { name: '1e135', value: D('1e135') },
  { name: '1e165', value: D('1e165') },
  { name: '1e195', value: D('1e195') },
  { name: '1e210', value: D('1e210') },
  { name: '1e240', value: D('1e240') },
  { name: '1e275', value: D('1e275') },
  { name: 'GATE', value: GATE }
]

function multiplierFor(bought: number, base: number): Decimal {
  const exp = Math.floor(bought / BLOCK_SIZE)
  if (exp <= 0) return D(1)
  if (exp <= 300) return D(Math.pow(base, exp))
  return new Decimal(base).pow(exp)
}

function advanceWithBlock(state: ReturnType<typeof createNumberState>, dt: number, base: number): Decimal {
  for (let i = 0; i < RING_COUNT - 1; i++) {
    const feeder = state.rings[i + 1]
    const gain = feeder.amount.times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt)
    state.rings[i].amount = state.rings[i].amount.plus(gain)
  }
  let perSecond = state.rings[0].amount
    .times(NUMBER_TUNING.rings[0].baseRate)
    .times(multiplierFor(state.rings[0].bought, base))
  for (let i = 1; i < RING_COUNT; i++) {
    perSecond = perSecond.plus(
      state.rings[i].amount.times(NUMBER_TUNING.rings[i].baseRate).times(multiplierFor(state.rings[i].bought, base))
    )
  }
  if (perSecond.gt(0)) state.number = state.number.plus(perSecond.times(dt))
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
  return perSecond
}

interface RunResult {
  base: number
  hit: { name: string; minutes: number }[]
  gateMinutes: number | null
  at2h: string
  buysAt2h: number
  perSecondAt2h: string
}

function simulate(base: number, limitHours: number): RunResult {
  const state = createNumberState()
  const dt = 0.5
  const tapsPerSecond = 2
  let seconds = 0
  let tapAccumulator = 0
  let decisionAccumulator = 0
  const hit: { name: string; minutes: number }[] = []
  let nextTarget = 0
  let gateMinutes: number | null = null
  let at2h = ''
  let buysAt2h = 0
  let perSecondAt2h = ''
  const limitSeconds = limitHours * 3600
  let lastPerSecond = D(0)

  while (seconds < limitSeconds) {
    lastPerSecond = advanceWithBlock(state, dt, base)
    seconds += dt

    tapAccumulator += dt
    while (tapAccumulator >= 1 / tapsPerSecond) {
      tapAccumulator -= 1 / tapsPerSecond
      manualTap(state)
    }

    decisionAccumulator += dt
    if (decisionAccumulator >= 0.5) {
      decisionAccumulator = 0
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

    while (nextTarget < TARGETS.length && state.number.gte(TARGETS[nextTarget].value)) {
      hit.push({ name: TARGETS[nextTarget].name, minutes: seconds / 60 })
      if (TARGETS[nextTarget].name === 'GATE') gateMinutes = seconds / 60
      nextTarget++
    }
    if (gateMinutes !== null) break

    if (at2h === '' && seconds >= 7200) {
      at2h = state.number.toExponential(3)
      buysAt2h = state.totalBuys
      perSecondAt2h = lastPerSecond.toExponential(3)
    }
  }

  return { base, hit, gateMinutes, at2h, buysAt2h, perSecondAt2h }
}

function report(run: RunResult): void {
  console.log(`\n=== blockMult tabani B = ${run.base} ===`)
  console.log('2 saatte: ' + run.at2h + ' | alim ' + run.buysAt2h + ' | /sn ' + run.perSecondAt2h)
  console.log('esik | dakika')
  for (const h of run.hit) console.log('  ' + h.name.padEnd(6) + ' | ' + h.minutes.toFixed(1))
  console.log('KAPI: ' + (run.gateMinutes === null ? 'ulasilamadi (' + LIMIT_HOURS + ' sa)' : run.gateMinutes.toFixed(1) + ' dk'))
}

const LIMIT_HOURS = 12
const bases = [5.05, 5.1, 5.2, 5.3, 5.4, 5.45, 5.5, 5.55, 5.6, 5.7]
for (const base of bases) {
  const started = Date.now()
  const run = simulate(base, LIMIT_HOURS)
  report(run)
  console.log('hesap suresi: ' + ((Date.now() - started) / 1000).toFixed(1) + ' sn')
}
