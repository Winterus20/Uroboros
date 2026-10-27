/**
 * SIRALI HEDEF COZUMU: her mucadele icin, hedef sureyi tutan N hedefini bul.
 * Onceki hedefler sabit; her aday icin bastan kosulur (deterministik).
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

const defs: { id: string; penalty: PenaltyKind; reward: RewardKind; target: number }[] = [
  { id: 'C1', penalty: 'fingersCap', reward: 'fingers10', target: 18.5 },
  { id: 'C2', penalty: 'price145', reward: 'all5', target: 19 },
  { id: 'C3', penalty: 'directOff', reward: 'all3', target: 21 },
  { id: 'C4', penalty: 'decay', reward: 'first3x5', target: 21 },
  { id: 'C5', penalty: 'firstFive', reward: 'direct5', target: 22 },
  { id: 'C6', penalty: 'feedFifth', reward: 'feed15', target: 23 },
  { id: 'C7', penalty: 'newestOnly', reward: 'all4', target: 24 },
  { id: 'C8', penalty: 'price135feedHalf', reward: 'finisher', target: 24 }
]

function build(goals: number[], upto: number): ChallengeDef[] {
  const out: ChallengeDef[] = []
  for (let i = 0; i <= upto; i++) {
    out.push({
      id: defs[i].id, name: defs[i].id, ring: i,
      unlockLog: i === 0 ? 10 : goals[i - 1],
      planGoalLog: goals[i], delta: 0,
      penalty: defs[i].penalty, reward: defs[i].reward, targetMin: defs[i].target
    })
  }
  return out
}

function durationOf(goals: number[], upto: number): number {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: build(goals, upto),
    penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'fixed', maxMinutes: 300, sampleEveryMin: 1000,
    stopAfterChallenges: true
  }
  const r = runSim(cfg)
  const p = r.phases[upto]
  return p ? p.durationMin : NaN
}

const goals: number[] = []
for (let k = 0; k < defs.length; k++) {
  const entry = k === 0 ? 10 : goals[k - 1]
  let lo = entry + 0.2
  let hi = 307
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    goals[k] = mid
    const d = durationOf(goals, k)
    if (!Number.isFinite(d) || d < defs[k].target) lo = mid
    else hi = mid
  }
  goals[k] = (lo + hi) / 2
  const d = durationOf(goals, k)
  console.log(defs[k].id + ' | giris ' + fmtLog(entry) + ' | hedef ' + fmtLog(goals[k]) + ' | sure ' + d.toFixed(1) + ' dk (hedef ' + defs[k].target + ')')
}
console.log('\nHEDEFLER: ' + goals.map((g) => g.toFixed(2)).join(', '))