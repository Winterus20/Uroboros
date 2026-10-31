import { CHALLENGES, simulate } from './model'

const CAP = 400
const DT = 1
const ids = CHALLENGES.map((c) => c.id)
const chain = [10.5, 12, 14, 16, 18, 20, 22, 24]

// Aday: C2 ve C8 fiyat carpani 1.22, dusuk mutlak hedef zinciri.
;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22
for (let i = 0; i < 8; i++) {
  ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : chain[i - 1]
}

function ov(i: number, g: number): number[] {
  const a = new Array(8).fill(NaN)
  a[i] = g
  return a
}

for (const B of [5.5, 5.35]) {
  console.log('=== B=' + B + ' | zincir ' + chain.join(' / ') + ' | C2,C8 growth=1.22 ===')
  console.log('id  hedef  ' + [0,1,2,3,4,5,6,7].map((b) => ('b=' + b).padStart(6)).join(' '))
  for (let i = 0; i < 8; i++) {
    const def = CHALLENGES[i]
    const row: string[] = []
    for (let b = 0; b <= 7; b++) {
      const r = simulate({
        B,
        policy: { enterChallenges: false, boostTargets: [], maxBoosts: 0 },
        maxMinutes: CAP, dt: DT,
        preCompleted: ids.slice(0, i),
        preBestLog10: def.unlockLog10 + 0.5,
        preBoost: b,
        startChallenge: def.id,
        goalOverride: ov(i, chain[i]),
        stopAfter: def.id
      })
      const ph = r.phases[0]
      row.push((ph && ph.completed ? ph.endMin.toFixed(1) : 'x').padStart(6))
    }
    console.log(def.id + '  ' + chain[i].toFixed(1).padStart(4) + '  ' + row.join(' '))
  }
}
