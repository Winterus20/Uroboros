/**
 * ZINCIR-ONLY UZUN VADE OLCUMU (salt okuma; src/'de hicbir sey degismez).
 *
 * Soru: dongu (boost/prestij) olmadan zincir 2 saatten sonra ne yapiyor?
 * Ayni oyuncu politikasi (balance.test.ts ile birebir): en derin acik halkayi
 * bir bloga tamamla, hepsi bloktaysa en ucuz blogu al.
 *
 * Calistirma:
 *   npx esbuild brain/scratchpad/chain-only-probe/probe.ts --bundle --platform=node --format=esm --outfile=brain/scratchpad/chain-only-probe/probe.mjs
 *   node brain/scratchpad/chain-only-probe/probe.mjs
 */
import { D } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING } from '../../../src/game/number/tuning'
import {
  advance,
  buyRing,
  createNumberState,
  manualTap,
  maxAffordableRing,
  numberPerSecond,
  ringBlockPrice,
  ringUnlocked
} from '../../../src/game/number/economy'

const MARK_HOURS = [1, 2, 4, 8, 12, 24, 48, 96]

interface Mark {
  hours: number
  number: string
  perSecond: string
  buys: number
  rings: string[]
}

function simulate(dt: number, tapsPerSecond: number, limitHours: number): Mark[] {
  const state = createNumberState()
  const marks: Mark[] = []
  let seconds = 0
  let tapAccumulator = 0
  let decisionAccumulator = 0
  const limitSeconds = limitHours * 3600
  const targets = MARK_HOURS.filter((h) => h <= limitHours)

  while (seconds < limitSeconds) {
    advance(state, dt)
    seconds += dt

    if (tapsPerSecond > 0) {
      tapAccumulator += dt
      while (tapAccumulator >= 1 / tapsPerSecond) {
        tapAccumulator -= 1 / tapsPerSecond
        manualTap(state)
      }
    }

    decisionAccumulator += dt
    if (decisionAccumulator >= 0.5) {
      decisionAccumulator = 0
      let picked = -1
      for (let i = 7; i >= 0; i--) {
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
        for (let i = 0; i < 8; i++) {
          if (!ringUnlocked(state, i)) continue
          const price = ringBlockPrice(state, i, BLOCK_SIZE)
          if (state.number.lt(price)) continue
          if (best < 0 || price.lt(ringBlockPrice(state, best, BLOCK_SIZE))) best = i
        }
        if (best >= 0) buyRing(state, best, BLOCK_SIZE)
      }
    }

    while (targets.length > 0 && seconds >= targets[0] * 3600) {
      const hours = targets.shift() as number
      marks.push({
        hours,
        number: state.number.toString(),
        perSecond: numberPerSecond(state).toString(),
        buys: state.totalBuys,
        rings: state.rings.map((ring) => ring.amount.toExponential(2))
      })
    }
  }

  return marks
}

const policy = simulate(0.5, 2, 96)

console.log('dt=0.5 / 2 tik/sn / politik: derin halkayi blokla, sonra en ucuz blok')
console.log('saat | sayi | /s | alim')
for (const mark of policy) {
  console.log(
    String(mark.hours).padStart(4) +
      ' | ' +
      mark.number.padEnd(14) +
      ' | ' +
      mark.perSecond.padEnd(12) +
      ' | ' +
      String(mark.buys).padStart(6)
  )
}

const last = policy[policy.length - 1]
if (last) console.log('son halka miktarlari: ' + last.rings.join(' / '))

console.log('log10 buyume (onceki isarete gore):')
let previous: Mark | null = null
for (const mark of policy) {
  if (previous) {
    const delta = D(mark.number).log10().minus(D(previous.number).log10()).toNumber()
    const hours = mark.hours - previous.hours
    console.log(
      '  ' + previous.hours + 'sa -> ' + mark.hours + 'sa : +' + delta.toFixed(3) + ' basamak (' + (delta / hours).toFixed(3) + '/sa)'
    )
  }
  previous = mark
}
