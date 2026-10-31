import { CHALLENGES, BOOST_TUNING, simulate, fmt } from './model'

;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22

function setup(goals: number[]): void {
  for (let i = 0; i < 8; i++) {
    ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : goals[i - 1]
    ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = goals[i]
  }
}
function full(B: number, goals: number[], targets: number[]) {
  setup(goals)
  return simulate({ B, policy: { enterChallenges: true, boostTargets: targets, maxBoosts: 99 }, maxMinutes: 1500, dt: 1, goalOverride: goals })
}
const score = (r: ReturnType<typeof simulate>): number => (r.completed.length === 8 && r.gateMin !== null ? r.gateMin : Infinity)
function greedy(B: number, goals: number[]) {
  let targets = new Array(8).fill(0)
  let best = score(full(B, goals, targets))
  for (let pass = 0; pass < 5; pass++) {
    let improved = false
    for (let i = 0; i < 8; i++) {
      const cand = targets.slice(); cand[i] += 1
      for (let j = i + 1; j < 8; j++) cand[j] = Math.max(cand[j], cand[i])
      const s = score(full(B, goals, cand))
      if (s < best - 0.05) { targets = cand; best = s; improved = true }
    }
    if (!improved) break
  }
  return { targets, best }
}
function report(tag: string, B: number, goals: number[]) {
  const r0 = full(B, goals, new Array(8).fill(0))
  const g = greedy(B, goals)
  const r = full(B, goals, g.targets)
  const lastEnd = r.phases.length ? r.phases[r.phases.length - 1].endMin : 0
  console.log(tag + ' | noBoost=' + fmt(score(r0)) + ' best=' + fmt(g.best) + ' t=' + JSON.stringify(g.targets) +
    ' n=' + r.completed.length + ' boosts=' + r.boostCount + ' farms=[' + r.boostEvents.map((b) => b.min.toFixed(0)).join(',') + ']' +
    ' push=' + fmt(r.gateMin !== null ? r.gateMin - lastEnd : null) +
    ' | ' + r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0)).join(' '))
}

for (const g8 of [50, 60, 70]) {
  const goals = Array.from({ length: 8 }, (_, i) => 10.5 + (g8 - 10.5) * (i / 7))
  for (const base of [50, 25]) {
    ;(BOOST_TUNING as { baseRequirement: number }).baseRequirement = base
    report('g8=' + g8 + ' reqBase=' + base, 5.35, goals)
  }
}
