import { CHALLENGES, BOOST_TUNING, simulate, fmt } from './model'

const B = 5.3
const CAP = 600
const DT = 2
const GOALS = [10.5, 20.1, 29.8, 39.4, 49.1, 58.7, 68.4, 78.0]
;(BOOST_TUNING as { mult: number }).mult = 1.8
for (let i = 0; i < 8; i++) {
  ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = GOALS[i]
  ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : GOALS[i - 1]
  ;(CHALLENGES[i] as { growth: number }).growth = 1.22
}

const score = (r: ReturnType<typeof simulate>): number => (r.completed.length === 8 && r.gateMin !== null ? r.gateMin : Infinity)
const full = (targets: number[]) => simulate({ B, policy: { enterChallenges: true, boostTargets: targets, maxBoosts: 99 }, maxMinutes: CAP, dt: DT, goalOverride: GOALS })

function greedy(n: number) {
  let t = new Array(8).fill(n)
  let best = score(full(t))
  for (let pass = 0; pass < 3; pass++) {
    let improved = false
    for (let i = 1; i < 8; i++) {
      const c = t.slice(); c[i] += 1
      for (let j = i + 1; j < 8; j++) c[j] = Math.max(c[j], c[i])
      const s = score(full(c))
      if (s < best - 0.05) { t = c; best = s; improved = true }
    }
    if (!improved) break
  }
  return { t, best }
}

for (const n of [0, 1, 2, 3, 4, 5, 6]) {
  const g = greedy(n)
  const r = full(g.t)
  console.log('gate=' + n + ' best=' + fmt(g.best) + ' t=' + JSON.stringify(g.t) +
    ' boosts=' + r.boostCount + ' farms=[' + r.boostEvents.map((b) => b.min.toFixed(0)).join(',') + ']' +
    ' runs=' + r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0) + (p.completed ? '' : 'x')).join(' '))
}
