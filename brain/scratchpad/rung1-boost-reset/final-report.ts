import { run, brief, fmt, type Policy } from './harness'

const DT = 1
const noChal = (k: number): Policy => ({ enterChallenges: false, boostTargets: [], maxBoosts: k })
const t = (v: number[]): Policy => ({ enterChallenges: true, boostTargets: v, maxBoosts: 99 })

console.log('=== GERCEK MOTOR · dt=1s · yeni sabitler (B=5.3, boost x1.8) ===')
const base = run({ policy: noChal(0), maxMinutes: 1200, dt: DT })
console.log('base (no meta): ' + brief(base))

const r0 = run({ policy: t([1, 2, 3, 4, 5, 6, 7, 8]), maxMinutes: 400, dt: DT })
console.log('intended 0-greedy [1..8]: ' + brief(r0))
const r4 = run({ policy: t([4, 5, 6, 7, 8, 9, 10, 11]), maxMinutes: 400, dt: DT })
console.log('intended seeded [4..11]: ' + brief(r4))
console.log('  runs: ' + r4.phases.map((p) => p.id + ' ' + (p.endMin - p.entryMin).toFixed(1) + 'dk').join(' · '))
console.log('  finalPush: ' + fmt(r4.gateMin !== null ? r4.gateMin - r4.phases[r4.phases.length - 1].endMin : null) + ' dk')

const only = run({ policy: t([0, 0, 0, 0, 0, 0, 0, 0]), maxMinutes: 500, dt: DT })
console.log('challenges-only: ' + brief(only))

let bestK = 0
let bestTotal = base.gateMin ?? Infinity
console.log('boost-only merdiveni:')
for (let k = 1; k <= 10; k++) {
  const lad = run({ policy: noChal(99), maxMinutes: 1000, dt: DT, stopAfterBoost: k })
  if (lad.boostCount < k) { console.log('  k=' + k + ' farm ulasilamadi (' + fmt(lad.totalMin) + ')'); continue }
  const fin = run({ policy: noChal(0), maxMinutes: 1000, dt: DT, preBoost: k })
  if (fin.gateMin === null) continue
  const total = lad.totalMin + fin.gateMin
  if (total < bestTotal) { bestTotal = total; bestK = k }
  console.log('  k=' + k + ' farm=' + fmt(lad.totalMin) + ' final=' + fmt(fin.gateMin) + ' total=' + total.toFixed(1))
}
console.log('BOOST-ONLY OPTIMAL: k=' + bestK + ' total=' + bestTotal.toFixed(1) + ' dk')
console.log('RATIOS: intended=' + fmt(r4.gateMin) + ' challenges/intended=' + ((only.gateMin ?? 0) / (r4.gateMin ?? 1)).toFixed(2) +
  ' boost/intended=' + (bestTotal / (r4.gateMin ?? 1)).toFixed(2))
