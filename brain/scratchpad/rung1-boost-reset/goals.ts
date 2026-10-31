import { CHALLENGES, simulate } from './model'

const CAP = 300
const GOALS = [11, 13, 15, 18, 21, 24, 27, 30]
const ids = CHALLENGES.map((c) => c.id)
const prev = (i: number): string[] => ids.slice(0, i)

for (const B of [5.5, 5.35]) {
  console.log('=== B=' + B + ' | b=0 | tek mucadele suresi (dk), goal log10 ===')
  console.log('id  unlock  ' + GOALS.map((g) => ('1e' + g).padStart(6)).join(' '))
  for (let i = 0; i < 8; i++) {
    const def = CHALLENGES[i]
    const row: string[] = []
    for (const g of GOALS) {
      if (g <= def.unlockLog10) { row.push('   -  '); continue }
      const r = simulate({
        B,
        policy: { enterChallenges: false, boostTargets: [], maxBoosts: 0 },
        maxMinutes: CAP, dt: 1,
        preCompleted: prev(i),
        preBestLog10: def.unlockLog10 + 0.5,
        startChallenge: def.id,
        goalOverride: [g],
        stopAfter: def.id
      })
      const ph = r.phases[0]
      row.push((ph && ph.completed ? ph.endMin.toFixed(1) : 'x').padStart(6))
    }
    console.log(def.id + '  ' + def.unlockLog10.toFixed(1).padStart(6) + '  ' + row.join(' '))
  }
}
