import { BOOST_TUNING, simulate, fmt } from './model'

const B = 5.3
const CAP = 2000
const DT = 2
const noChal = (k: number) => ({ enterChallenges: false, boostTargets: [] as number[], maxBoosts: k })
;(BOOST_TUNING as { mult: number }).mult = 1.8
const base = simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: DT })
console.log('base=' + fmt(base.gateMin))
let best = Infinity
for (let k = 1; k <= 12; k++) {
  const lad = simulate({ B, policy: noChal(99), maxMinutes: CAP, dt: DT, stopAfterBoost: k })
  if (lad.boostCount < k) { console.log('k=' + k + ' incomplete at ' + fmt(lad.totalMin)); break }
  const fin = simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: DT, preBoost: k })
  const total = fin.gateMin === null ? null : lad.totalMin + fin.gateMin
  if (total !== null) best = Math.min(best, total)
  console.log('k=' + k + ' farm=' + fmt(lad.totalMin) + ' final=' + fmt(fin.gateMin) + ' total=' + fmt(total))
}
console.log('best=' + fmt(best))
