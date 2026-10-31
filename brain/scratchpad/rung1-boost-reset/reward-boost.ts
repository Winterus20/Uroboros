import { CHALLENGES, run, fmt, type Policy } from './harness'

const CAP = 1600
const DT = 1
const all = CHALLENGES.map((c) => c.id)
const noChal = (k: number, pre: string[] = [], preBoost = 0): Policy => ({ enterChallenges: false, boostTargets: [], maxBoosts: k })

for (const B of [5.5, 5.4, 5.35]) {
  // Gercek motor BLOCK_MULT sabitini okuyor; scratchpad'de runtime override.
  const tuning = await import('../../../src/game/number/tuning')
  ;(tuning as unknown as { BLOCK_MULT: number }).BLOCK_MULT = B
  console.log('=== BLOCK_MULT=' + B + ' (rewards: all 8) ===')
  const base = run({ policy: noChal(0), maxMinutes: CAP, dt: DT })
  const rw0 = run({ policy: noChal(0), maxMinutes: CAP, dt: DT, preCompleted: all })
  console.log('base(no meta)=' + fmt(base.gateMin) + '  allRewards=' + fmt(rw0.gateMin))
  console.log('k  farmWithRewards  finalWithRewards')
  for (let k = 1; k <= 7; k++) {
    const lad = run({ policy: noChal(99, all), maxMinutes: CAP, dt: DT, preCompleted: all, stopAfterBoost: k })
    const fin = run({ policy: noChal(0), maxMinutes: CAP, dt: DT, preCompleted: all, preBoost: k })
    console.log(String(k).padEnd(2) + ' ' + fmt(lad.totalMin).padStart(14) + ' ' + fmt(fin.gateMin).padStart(16) + (lad.boostCount < k ? '  (farm incomplete)' : ''))
  }
}
