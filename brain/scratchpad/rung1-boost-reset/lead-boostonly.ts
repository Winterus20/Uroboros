import { BOOST_TUNING, simulate, fmt } from './model'

const B = 5.35
const CAP = 1400
const DT = 2
const noChal = (k: number) => ({ enterChallenges: false, boostTargets: [] as number[], maxBoosts: k })

for (const mult of [1.5, 2.0]) {
  ;(BOOST_TUNING as { mult: number }).mult = mult
  const base = simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: DT })
  console.log('mult=' + mult + ' base=' + fmt(base.gateMin))
  let best = Infinity
  let bestK = 0
  for (let k = 1; k <= 10; k++) {
    const lad = simulate({ B, policy: noChal(99), maxMinutes: CAP, dt: DT, stopAfterBoost: k })
    if (lad.boostCount < k) { console.log('  k=' + k + ' farm incomplete'); continue }
    const fin = simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: DT, preBoost: k })
    const total = fin.gateMin === null ? null : lad.totalMin + fin.gateMin
    if (total !== null && total < best) { best = total; bestK = k }
    console.log('  k=' + k + ' farm=' + fmt(lad.totalMin) + ' final=' + fmt(fin.gateMin) + ' total=' + fmt(total))
  }
  console.log('  BEST k=' + bestK + ' total=' + fmt(best))
}
