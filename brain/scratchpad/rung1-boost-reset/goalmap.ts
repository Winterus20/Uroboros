import { CHALLENGES, simulate } from './model'

const CAP = 300
const DT = 1
const ids = CHALLENGES.map((c) => c.id)
const GOALS = [12, 16, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60]

;(CHALLENGES[1] as { growth: number }).growth = 1.22
for (let i = 1; i < 8; i++) (CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = 10
;(CHALLENGES[7] as { growth: number }).growth = 1.22

function ov(i: number, g: number): number[] {
  const a = new Array(8).fill(NaN); a[i] = g; return a
}

for (const B of [5.5, 5.35]) {
  console.log('=== B=' + B + ' | C2,C8 growth=1.22 | hedef -> sure (dk) ===')
  console.log('id   b  ' + GOALS.map((g) => ('1e' + g).padStart(6)).join(' '))
  for (let i = 0; i < 8; i++) {
    const def = CHALLENGES[i]
    for (const b of [0, 3, 6]) {
      const row: string[] = []
      for (const g of GOALS) {
        const r = simulate({
          B, policy: { enterChallenges: false, boostTargets: [], maxBoosts: 0 },
          maxMinutes: CAP, dt: DT,
          preCompleted: ids.slice(0, i),
          preBestLog10: 12,
          preBoost: b,
          startChallenge: def.id,
          goalOverride: ov(i, g),
          stopAfter: def.id
        })
        const ph = r.phases[0]
        row.push((ph && ph.completed ? ph.endMin.toFixed(1) : 'x').padStart(6))
      }
      console.log(def.id + ' b=' + b + ' ' + row.join(' '))
    }
  }
}