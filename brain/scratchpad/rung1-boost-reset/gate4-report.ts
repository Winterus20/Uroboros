import { run, brief, fmt } from './harness'
import { CHALLENGES } from '../../../src/game/number/challenges'

const intended = run({
  policy: { enterChallenges: true, boostTargets: [4, 5, 6, 7, 8, 9, 10, 11], maxBoosts: 99 },
  maxMinutes: 360,
  dt: 1
})

const boostOnly = run({
  policy: { enterChallenges: false, boostTargets: [], maxBoosts: 8 },
  maxMinutes: 900,
  dt: 1
})

console.log('INTENDED', brief(intended))
console.log('  boost farm list:', intended.boostEvents.map((b) => b.min.toFixed(1) + 'dk').join(', '))
console.log('  phases:', intended.phases.map((p) => p.id + ' ' + (p.endMin - p.entryMin).toFixed(1) + 'dk @' + p.entryBoost + 'b').join(' | '))
console.log('  completed:', intended.completed.join(','), 'gate', fmt(intended.gateMin))
console.log('BOOST-ONLY', brief(boostOnly))
console.log('  gate', fmt(boostOnly.gateMin), 'boost', boostOnly.boostCount, 'completed', boostOnly.completed.length)
console.log('CHALLENGES', CHALLENGES.length)
