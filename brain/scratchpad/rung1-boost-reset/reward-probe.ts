import { CHALLENGES, simulate, fmt } from './model'

const CAP = 400
const p = { enterChallenges: false, boostTargets: [], maxBoosts: 0 }
const subsets: { name: string; ids: string[] }[] = [
  { name: 'none', ids: [] },
  { name: 'C1', ids: ['C1'] },
  { name: 'C2', ids: ['C2'] },
  { name: 'C1+C2', ids: ['C1', 'C2'] },
  { name: 'C1-C4', ids: ['C1', 'C2', 'C3', 'C4'] },
  { name: 'C1-C6', ids: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] },
  { name: 'all', ids: CHALLENGES.map((c) => c.id) }
]
for (const s of subsets) {
  const r = simulate({ B: 5.5, policy: p, maxMinutes: CAP, dt: 1, preCompleted: s.ids })
  console.log('rewards ' + s.name.padEnd(8) + ' gate=' + fmt(r.gateMin).padStart(6) + ' log=' + r.finalLog.toFixed(1))
}
for (const k of [0, 1, 2, 4, 6, 8, 10]) {
  const r = simulate({ B: 5.5, policy: p, maxMinutes: CAP, dt: 1, preBoost: k })
  console.log('boost x' + String(k).padEnd(3) + '       gate=' + fmt(r.gateMin).padStart(6) + ' log=' + r.finalLog.toFixed(1))
}
