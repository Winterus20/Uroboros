import { CHALLENGES, simulate } from './model'

;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22
const goals = Array.from({ length: 8 }, (_, i) => 10.5 + (60 - 10.5) * (i / 7))
for (let i = 0; i < 8; i++) {
  ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : goals[i - 1]
  ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = goals[i]
}
const targets = [6, 7, 8, 9, 9, 10, 11, 13]
const r = simulate({ B: 5.35, policy: { enterChallenges: true, boostTargets: targets, maxBoosts: 99 }, maxMinutes: 1200, dt: 1, goalOverride: goals })
console.log('gate', r.gateMin, 'log', r.finalLog, 'boost', r.boostCount)
console.log('completed', JSON.stringify(r.completed))
console.log('phases', JSON.stringify(r.phases, null, 1))
console.log('boosts', JSON.stringify(r.boostEvents.map((b) => [Number(b.min.toFixed(1)), b.count, Number(b.logBefore.toFixed(1))])))
