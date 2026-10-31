import { CHALLENGES, BOOST_TUNING, simulate, fmt } from './model'

const B = 5.3
const CAP = 500
const DT = 1
const GOALS = [10.5, 20.1, 29.8, 39.4, 49.1, 58.7, 68.4, 78.0]
;(BOOST_TUNING as { mult: number }).mult = 1.8
for (let i = 0; i < 8; i++) {
  ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = GOALS[i]
  ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : GOALS[i - 1]
  ;(CHALLENGES[i] as { growth: number }).growth = 1.22
}
for (const [gate, targets] of [
  [3, [3,4,5,6,7,8,9,10]],
  [4, [4,5,6,7,8,9,10,11]],
  [5, [5,6,7,8,9,10,11,12]],
  [6, [6,7,8,9,10,11,12,13]]
] as [number, number[]][]) {
  const r = simulate({ B, policy: { enterChallenges: true, boostTargets: targets, maxBoosts: 99 }, maxMinutes: CAP, dt: DT, goalOverride: GOALS })
  console.log('gate=' + gate + ' gate=' + fmt(r.gateMin) + ' completed=' + r.completed.length +
    ' boosts=' + r.boostCount + ' farms=[' + r.boostEvents.map((b) => b.min.toFixed(0)).join(',') + ']' +
    ' runs=' + r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0)).join(' '))
}
