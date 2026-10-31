import { CHALLENGES, simulate } from './model'

const CAP = 400
const DT = 1
const ids = CHALLENGES.map((c) => c.id)
const GOALS = [10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16]
const BOOSTS = [0, 2, 4, 7]

// C2 fiyat carpanini 1.22'ye cek (aday).
;(CHALLENGES[1] as { growth: number }).growth = 1.22

for (const B of [5.5, 5.35]) {
  console.log('=== B=' + B + ' | C2 growth=1.22, dusuk hedefler ===')
  for (const id of ['C2', 'C5', 'C6', 'C8']) {
    const i = ids.indexOf(id)
    const def = CHALLENGES[i]
    ;(def as { unlockLog10: number }).unlockLog10 = 10
    console.log(id + ' (goal -> sure)  ' + GOALS.map((g) => ('1e' + g).padStart(6)).join(' '))
    for (const b of BOOSTS) {
      const row: string[] = []
      for (const g of GOALS) {
        const r = simulate({
          B,
          policy: { enterChallenges: false, boostTargets: [], maxBoosts: 0 },
          maxMinutes: CAP, dt: DT,
          preCompleted: ids.slice(0, i),
          preBestLog10: 11,
          preBoost: b,
          startChallenge: def.id,
          goalOverride: [g],
          stopAfter: def.id
        })
        const ph = r.phases[0]
        row.push((ph && ph.completed ? ph.endMin.toFixed(1) : 'x').padStart(6))
      }
      console.log('  b=' + b + '  ' + row.join(' '))
    }
  }
}
