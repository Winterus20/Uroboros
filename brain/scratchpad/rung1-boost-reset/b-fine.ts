import { CHALLENGES, simulate, fmt } from './model'

const CAP = 2400
const noChal = { enterChallenges: false, boostTargets: [], maxBoosts: 0 }
const all = CHALLENGES.map((c) => c.id)

console.log('B      base    allRw   C1@1e20  C1@1e25  C1@1e28  C1@1e30  C1@1e33')
for (const B of [5.3, 5.35, 5.4, 5.45, 5.5]) {
  const base = simulate({ B, policy: noChal, maxMinutes: CAP, dt: 1 })
  const rw = simulate({ B, policy: noChal, maxMinutes: CAP, dt: 1, preCompleted: all })
  // C1 run: enter with no rewards, stop at C1 completion; goal override per goal.
  const c1: string[] = []
  for (const goal of [20, 25, 28, 30, 33.242]) {
    const r = simulate({ B, policy: { enterChallenges: true, boostTargets: [0,0,0,0,0,0,0,0], maxBoosts: 0 }, maxMinutes: CAP, dt: 1, goalOverride: [goal], stopAfter: 'C1' })
    c1.push(fmt(r.gateMin ?? (r.phases[0]?.completed ? r.phases[0].endMin : null)).padStart(7))
  }
  console.log(String(B).padEnd(6) + fmt(base.gateMin).padStart(6) + ' ' + fmt(rw.gateMin).padStart(6) + '   ' + c1.join('  '))
}
