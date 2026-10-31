import { simulate, fmt } from './model'

const CAP = 3000
const noChal = { enterChallenges: false, boostTargets: [], maxBoosts: 99 }

const base = simulate({ B: 5.5, policy: noChal, maxMinutes: CAP, dt: 1 })
console.log('base gate=' + fmt(base.gateMin) + ' maxBought=' + JSON.stringify(base.maxBought))

// Boost ladder: time to reach k boosts (stop right after the k-th purchase).
console.log('k  ladderMin  finalRunMin  total')
for (let k = 1; k <= 10; k++) {
  const lad = simulate({ B: 5.5, policy: noChal, maxMinutes: CAP, dt: 1, stopAfterBoost: k })
  const fin = simulate({ B: 5.5, policy: { ...noChal, maxBoosts: 0 }, maxMinutes: CAP, dt: 1, preBoost: k })
  const total = lad.boostCount >= k ? lad.totalMin + (fin.gateMin ?? NaN) : NaN
  console.log(String(k).padEnd(2) + ' ' + fmt(lad.totalMin).padStart(9) + ' ' + fmt(fin.gateMin).padStart(12) + ' ' + (Number.isFinite(total) ? total.toFixed(1) : 'unreachable'))
}
