import { CHALLENGES, simulate, fmt } from './model'

const ids = CHALLENGES.map((c) => c.id)
;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22

function setup(goals: number[]): void {
  for (let i = 0; i < 8; i++) {
    ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : goals[i - 1]
    ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = goals[i]
  }
}

function full(B: number, goals: number[], targets: number[], cap = 1200) {
  setup(goals)
  return simulate({
    B,
    policy: { enterChallenges: true, boostTargets: targets, maxBoosts: 99 },
    maxMinutes: cap, dt: 1,
    goalOverride: goals
  })
}

function totalOf(r: ReturnType<typeof simulate>): number {
  return r.gateMin ?? Infinity
}

function greedy(B: number, goals: number[], cap = 1200) {
  let targets = new Array(8).fill(0)
  let best = totalOf(full(B, goals, targets, cap))
  for (let pass = 0; pass < 4; pass++) {
    let improved = false
    for (let i = 0; i < 8; i++) {
      const cand = targets.slice()
      cand[i] += 1
      for (let j = i + 1; j < 8; j++) cand[j] = Math.max(cand[j], cand[i])
      const t = totalOf(full(B, goals, cand, cap))
      if (t < best - 0.05) {
        targets = cand
        best = t
        improved = true
      }
    }
    if (!improved) break
  }
  return { targets, best }
}

const CANDIDATES: { name: string; goals: number[] }[] = [
  { name: 'V1', goals: [12, 18, 24, 30, 36, 42, 48, 54] },
  { name: 'V2', goals: [15, 22, 29, 36, 42, 48, 54, 60] },
  { name: 'V3', goals: [20, 28, 36, 44, 50, 55, 60, 65] },
  { name: 'V4', goals: [12, 20, 28, 36, 44, 50, 56, 62] }
]

for (const B of [5.5, 5.35]) {
  for (const c of CANDIDATES) {
    const r0 = full(B, c.goals, new Array(8).fill(0))
    const g = greedy(B, c.goals)
    const rg = full(B, c.goals, g.targets)
    console.log('B=' + B + ' ' + c.name + ' goals=' + c.goals.join(',') +
      '  noBoost=' + fmt(r0.gateMin) +
      '  greedy=' + fmt(g.best) + ' targets=' + JSON.stringify(g.targets) +
      ' boosts=' + rg.boostCount + ' [' + rg.boostEvents.map((b) => b.min.toFixed(0)).join(',') + ']' +
      '  phases=' + rg.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0)).join(' '))
  }
}
