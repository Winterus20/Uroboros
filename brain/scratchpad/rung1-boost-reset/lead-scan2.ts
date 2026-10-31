import { CHALLENGES, BOOST_TUNING, simulate, fmt } from './model'

const B = 5.35
const CAP = 600
const DT = 2
;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22
;(BOOST_TUNING as { mult: number }).mult = 2.0

function setup(g8: number): number[] {
  const goals = Array.from({ length: 8 }, (_, i) => 10.5 + (g8 - 10.5) * (i / 7))
  for (let i = 0; i < 8; i++) {
    ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : goals[i - 1]
    ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = goals[i]
  }
  return goals
}

for (const g8 of [80, 90, 100]) {
  const goals = setup(g8)
  for (const k of [0, 3, 5, 7]) {
    const r = simulate({
      B,
      policy: { enterChallenges: true, boostTargets: new Array(8).fill(k), maxBoosts: 99 },
      maxMinutes: CAP, dt: DT, goalOverride: goals
    })
    const ok = r.completed.length === 8 && r.gateMin !== null
    console.log('mult=2 g8=' + g8 + ' k=' + k + ' gate=' + (ok ? fmt(r.gateMin) : 'X(' + r.completed.length + ')') +
      ' boosts=' + r.boostCount + ' phases=' + r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0) + (p.completed ? '' : 'x')).join(' '))
  }
}
