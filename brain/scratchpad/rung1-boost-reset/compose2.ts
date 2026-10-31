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
  return simulate({ B, policy: { enterChallenges: true, boostTargets: targets, maxBoosts: 99 }, maxMinutes: cap, dt: 1, goalOverride: goals })
}

const total = (r: ReturnType<typeof simulate>): number => r.gateMin ?? Infinity

function greedy(B: number, goals: number[], floorTargets: number[]) {
  let targets = [...floorTargets]
  let best = total(full(B, goals, targets))
  for (let pass = 0; pass < 5; pass++) {
    let improved = false
    for (let i = 0; i < 8; i++) {
      const cand = targets.slice()
      cand[i] += 1
      for (let j = i + 1; j < 8; j++) cand[j] = Math.max(cand[j], cand[i])
      const t = total(full(B, goals, cand))
      if (t < best - 0.05) { targets = cand; best = t; improved = true }
    }
    if (!improved) break
  }
  return { targets, best }
}

function report(tag: string, B: number, goals: number[], floorT: number[]) {
  const r0 = full(B, goals, new Array(8).fill(0))
  const g = greedy(B, goals, floorT)
  const r = full(B, goals, g.targets)
  const lastEnd = r.phases.length ? r.phases[r.phases.length - 1].endMin : 0
  const pushes = r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0)).join(' ')
  const farms = r.boostEvents.map((b) => b.min.toFixed(0)).join(',')
  console.log(tag + ' B=' + B + ' goals=' + goals.map((x) => x.toFixed(1)).join(',') +
    ' | noBoost=' + fmt(r0.gateMin) + ' | best=' + fmt(g.best) + ' t=' + JSON.stringify(g.targets) +
    ' | farms=[' + farms + '] finalPush=' + fmt(r.gateMin !== null ? r.gateMin - lastEnd : null) +
    ' | ' + pushes)
}

// G1 sabit 10.5; G8 degisken; arade log-lineer.
for (const g8 of [40, 50, 60, 70, 80]) {
  const goals = Array.from({ length: 8 }, (_, i) => 10.5 + (g8 - 10.5) * (i / 7))
  report('g8=' + g8, 5.35, goals, [5, 5, 5, 5, 5, 5, 5, 5])
}
