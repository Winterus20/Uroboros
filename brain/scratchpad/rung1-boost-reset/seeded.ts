import { CHALLENGES, BOOST_TUNING, simulate, fmt } from './model'
const B = 5.3
;(BOOST_TUNING as { mult: number }).mult = 1.8
;(CHALLENGES[1] as { growth: number }).growth = 1.22
;(CHALLENGES[7] as { growth: number }).growth = 1.22
const score = (r: ReturnType<typeof simulate>) => (r.completed.length === 8 && r.gateMin !== null ? r.gateMin : Infinity)
for (const g8 of [72, 75, 78]) {
  const goals = Array.from({ length: 8 }, (_, i) => 10.5 + (g8 - 10.5) * (i / 7))
  for (let i = 0; i < 8; i++) {
    ;(CHALLENGES[i] as { unlockLog10: number }).unlockLog10 = i === 0 ? 10 : goals[i - 1]
    ;(CHALLENGES[i] as { goalLog10: number }).goalLog10 = goals[i]
  }
  const full = (t: number[]) => simulate({ B, policy: { enterChallenges: true, boostTargets: t, maxBoosts: 99 }, maxMinutes: 600, dt: 1, goalOverride: goals })
  let t = [4,5,6,7,8,9,10,11]
  let best = score(full(t))
  // yerel arama: her indeksi +-1 dene (2 pass)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 8; i++) {
      for (const d of [1, -1]) {
        const c = t.slice(); c[i] = Math.max(0, c[i] + d)
        for (let j = i + 1; j < 8; j++) c[j] = Math.max(c[j], c[i])
        const s = score(full(c))
        if (s < best - 0.05) { t = c; best = s }
      }
    }
  }
  const r = full(t)
  const r0 = full(new Array(8).fill(0))
  console.log('g8=' + g8 + ' goals=' + JSON.stringify(goals.map((x) => Number(x.toFixed(1)))) +
    ' intended=' + fmt(best) + ' t=' + JSON.stringify(t) + ' n=' + r.completed.length +
    ' farms=[' + r.boostEvents.map((b) => b.min.toFixed(0)).join(',') + ']' +
    ' push=' + fmt(r.gateMin !== null ? r.gateMin - r.phases[r.phases.length-1].endMin : null) +
    ' runs=' + r.phases.map((p) => p.id + ':' + (p.endMin-p.entryMin).toFixed(0)).join(' ') +
    ' | noBoost=' + fmt(score(r0)))
}
