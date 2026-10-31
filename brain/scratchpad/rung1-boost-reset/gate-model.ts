import { CHALLENGES, BOOST_TUNING, simulate, fmt, setChallengeBoostGate } from './model'

const B = 5.3
;(BOOST_TUNING as { mult: number }).mult = 1.8
;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22
const goals = [10.5, 20.1, 29.8, 39.4, 49.1, 58.7, 68.4, 78.0]
for (let i = 0; i < 8; i++) {
  ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : goals[i - 1]
  ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = goals[i]
}

for (const gate of [3, 4, 5, 6]) {
  setChallengeBoostGate(gate)
  const targets = Array.from({ length: 8 }, (_, i) => gate + i)
  const r = simulate({ B, policy: { enterChallenges: true, boostTargets: targets, maxBoosts: 99 }, maxMinutes: 600, dt: 1, goalOverride: goals })
  const lastEnd = r.phases.length ? r.phases[r.phases.length - 1].endMin : 0
  console.log('gate=' + gate + ' targets=' + JSON.stringify(targets) +
    ' gateMin=' + fmt(r.gateMin) + ' completed=' + r.completed.length + '/8' +
    ' boosts=' + r.boostCount +
    ' farms=[' + r.boostEvents.map((b) => b.min.toFixed(0)).join(',') + ']' +
    ' finalPush=' + fmt(r.gateMin !== null ? r.gateMin - lastEnd : null) +
    ' runs=' + r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(1)).join(' '))
}
// gate=4: 0..3 boostla giris reddi
setChallengeBoostGate(4)
const r0 = simulate({ B, policy: { enterChallenges: true, boostTargets: new Array(8).fill(0), maxBoosts: 0 }, maxMinutes: 600, dt: 1, goalOverride: goals })
console.log('gate=4, targets all 0: gateMin=' + fmt(r0.gateMin) + ' completed=' + r0.completed.length + '/8 boosts=' + r0.boostCount)
