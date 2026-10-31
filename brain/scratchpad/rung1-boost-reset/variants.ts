import { CHALLENGES, BOOST_TUNING, simulate, fmt } from './model'
const B = 5.3
;(BOOST_TUNING as { mult: number }).mult = 1.8
;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22
const goals = Array.from({ length: 8 }, (_, i) => 10.5 + (70 - 10.5) * (i / 7))
for (let i = 0; i < 8; i++) {
  ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : goals[i - 1]
  ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = goals[i]
}
function full(t: number[]) { return simulate({ B, policy: { enterChallenges: true, boostTargets: t, maxBoosts: 99 }, maxMinutes: 600, dt: 1, goalOverride: goals }) }
for (const [name, t] of [
  ['optimal', [1,2,3,4,5,6,7,8]],
  ['mixed-C1-0', [0,1,2,3,4,5,6,7]],
  ['floor5', [4,5,6,7,8,9,10,11]]
] as [string, number[]][]) {
  const r = full(t)
  console.log(name + ' gate=' + fmt(r.gateMin) + ' n=' + r.completed.length + ' boost=' + r.boostCount +
    ' runs=' + r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0)).join(' ') +
    ' finalPush=' + fmt(r.gateMin !== null ? r.gateMin - (r.phases[r.phases.length-1]?.endMin ?? 0) : null))
}
console.log('goals=' + JSON.stringify(goals))
