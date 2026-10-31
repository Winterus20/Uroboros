import { CHALLENGES, simulate, fmt } from './model'

const CAP = 1600
const DT = 1
const all = CHALLENGES.map((c) => c.id)
const noChal = (k: number, preBoost = 0) => ({ enterChallenges: false, boostTargets: [] as number[], maxBoosts: k, ...(preBoost ? { preBoost } : {}) })

for (const B of [5.5, 5.4, 5.35, 5.3]) {
  console.log('=== B=' + B + ' (all rewards pre-granted) ===')
  const base = simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: DT })
  const rw0 = simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: DT, preCompleted: all })
  console.log('base(no meta)=' + fmt(base.gateMin) + '  allRewards=' + fmt(rw0.gateMin))
  console.log('k  farmWithRewards  finalWithRewards  total')
  for (let k = 1; k <= 7; k++) {
    const lad = simulate({ B, policy: noChal(99), maxMinutes: CAP, dt: DT, preCompleted: all, stopAfterBoost: k })
    const fin = simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: DT, preCompleted: all, preBoost: k })
    const ok = lad.boostCount >= k && fin.gateMin !== null
    console.log(String(k).padEnd(2) + ' ' + fmt(lad.totalMin).padStart(14) + ' ' + fmt(fin.gateMin).padStart(16) + '  ' + (ok ? (lad.totalMin + (fin.gateMin as number)).toFixed(1) : 'x'))
  }
}
