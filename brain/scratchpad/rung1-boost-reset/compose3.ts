import { CHALLENGES, simulate, fmt } from './model'

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

/** Gecerli toplam: 8 mucadele de bitmis olmali. */
function score(r: ReturnType<typeof simulate>): number {
  return r.completed.length === 8 && r.gateMin !== null ? r.gateMin : Infinity
}

function greedy(B: number, goals: number[]) {
  let targets = new Array(8).fill(0)
  let best = score(full(B, goals, targets))
  for (let pass = 0; pass < 6; pass++) {
    let improved = false
    for (let i = 0; i < 8; i++) {
      const cand = targets.slice()
      cand[i] += 1
      for (let j = i + 1; j < 8; j++) cand[j] = Math.max(cand[j], cand[i])
      const s = score(full(B, goals, cand))
      if (s < best - 0.05) { targets = cand; best = s; improved = true }
    }
    if (!improved) break
  }
  return { targets, best }
}

function report(name: string, B: number, goals: number[]) {
  const r0 = full(B, goals, new Array(8).fill(0))
  const g = greedy(B, goals)
  const r = full(B, goals, g.targets)
  const lastEnd = r.phases.length ? r.phases[r.phases.length - 1].endMin : 0
  const pushes = r.phases.map((p) => p.id + ':' + (p.endMin - p.entryMin).toFixed(0)).join(' ')
  console.log(name + ' B=' + B + ' goals=' + goals.map((x) => x.toFixed(0)).join(',') +
    ' | noBoost=' + fmt(score(r0)) + ' (C' + r0.completed.length + ')' +
    ' | best=' + fmt(g.best) + ' t=' + JSON.stringify(g.targets) + ' got=' + r.completed.length +
    ' farms=[' + r.boostEvents.map((b) => b.min.toFixed(0)).join(',') + ']' +
    ' finalPush=' + fmt(r.gateMin !== null && r.completed.length === 8 ? r.gateMin - lastEnd : null) +
    ' | ' + pushes)
}

const CAND: { name: string; goals: number[] }[] = [
  { name: 'A', goals: [10.5, 50, 70, 90, 110, 130, 145, 160] },
  { name: 'B', goals: [10.5, 60, 80, 100, 120, 140, 160, 180] },
  { name: 'C', goals: [10.5, 40, 60, 80, 100, 120, 140, 160] },
  { name: 'D', goals: [10.5, 35, 55, 75, 95, 115, 135, 155] }
]
for (const c of CAND) report(c.name, 5.35, c.goals)
