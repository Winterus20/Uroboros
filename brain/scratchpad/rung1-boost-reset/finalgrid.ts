import { CHALLENGES, BOOST_TUNING, simulate, fmt } from './model'

const B = 5.35
const CAP = 600
;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22
const g8 = 70
const goals = Array.from({ length: 8 }, (_, i) => 10.5 + (g8 - 10.5) * (i / 7))
for (let i = 0; i < 8; i++) {
  ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : goals[i - 1]
  ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = goals[i]
}
function full(targets: number[]) {
  return simulate({ B, policy: { enterChallenges: true, boostTargets: targets, maxBoosts: 99 }, maxMinutes: CAP, dt: 1, goalOverride: goals })
}
const score = (r: ReturnType<typeof simulate>): number => (r.completed.length === 8 && r.gateMin !== null ? r.gateMin : Infinity)
function greedy() {
  let targets = new Array(8).fill(0)
  let best = score(full(targets))
  for (let pass = 0; pass < 2; pass++) {
    let improved = false
    for (let i = 0; i < 8; i++) {
      const cand = targets.slice(); cand[i] += 1
      for (let j = i + 1; j < 8; j++) cand[j] = Math.max(cand[j], cand[i])
      const s = score(full(cand))
      if (s < best - 0.05) { targets = cand; best = s; improved = true }
    }
    if (!improved) break
  }
  return { targets, best }
}

for (const mult of [1.5, 1.7, 1.8, 2.0]) {
  ;(BOOST_TUNING as { mult: number }).mult = mult
  // boost-only: merdiven + final
  let bestBoostOnly = Infinity
  const noChal = (k: number) => ({ enterChallenges: false, boostTargets: [] as number[], maxBoosts: k })
  for (let k = 0; k <= 12; k++) {
    if (k === 0) { bestBoostOnly = Math.min(bestBoostOnly, simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: 1 }).gateMin ?? Infinity); continue }
    const lad = simulate({ B, policy: noChal(99), maxMinutes: CAP, dt: 1, stopAfterBoost: k })
    if (lad.boostCount < k) continue
    const fin = simulate({ B, policy: noChal(0), maxMinutes: CAP, dt: 1, preBoost: k })
    if (fin.gateMin === null) continue
    bestBoostOnly = Math.min(bestBoostOnly, lad.totalMin + fin.gateMin)
  }
  const r0 = full(new Array(8).fill(0))
  const g = greedy()
  const r = full(g.targets)
  console.log('mult=' + mult + ' | noBoost=' + fmt(score(r0)) + ' best=' + fmt(g.best) + ' t=' + JSON.stringify(g.targets) +
    ' boosts=' + r.boostCount + ' farms=[' + r.boostEvents.map((b) => b.min.toFixed(0)).join(',') + ']' +
    ' ratio=' + (score(r0) / g.best).toFixed(2) + ' boostOnly=' + fmt(bestBoostOnly) +
    ' | ' + r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0)).join(' '))
}
