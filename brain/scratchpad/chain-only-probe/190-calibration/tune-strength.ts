/**
 * HEDEF EGRISI + SIDDET: her mucadele icin, hedef kazanci (dec) tutan extraMult.
 * Girisler hedef egriden sabit; kazanc monotondur.
 */
import { runSim, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type PenaltyKind, type RewardKind } from './engine'

const sets: RewardKind[][] = [
  [],
  ['fingers10'],
  ['fingers10','all5'],
  ['fingers10','all5','all3'],
  ['fingers10','all5','all3','first3x5'],
  ['fingers10','all5','all3','first3x5','direct5'],
  ['fingers10','all5','all3','first3x5','direct5','feed15'],
  ['fingers10','all5','all3','first3x5','direct5','feed15','all4']
]

const rows: { id: string; penalty: PenaltyKind; start: number; dur: number; rw: RewardKind[]; target: number }[] = [
  { id: 'C1', penalty: 'fingersCap', start: 10, dur: 20, rw: sets[0], target: 55 },
  { id: 'C2', penalty: 'price145', start: 65, dur: 19, rw: sets[1], target: 10 },
  { id: 'C3', penalty: 'directOff', start: 75, dur: 21, rw: sets[2], target: 50 },
  { id: 'C4', penalty: 'decay', start: 125, dur: 21, rw: sets[3], target: 45 },
  { id: 'C5', penalty: 'firstFive', start: 170, dur: 23, rw: sets[4], target: 35 },
  { id: 'C6', penalty: 'feedFifth', start: 205, dur: 23, rw: sets[5], target: 23 },
  { id: 'C7', penalty: 'newestOnly', start: 228, dur: 24, rw: sets[6], target: 17 },
  { id: 'C8', penalty: 'price135feedHalf', start: 245, dur: 20, rw: sets[7], target: 5 }
]

function gainAt(row: typeof rows[number], e: number): number {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: [{ id: row.id, name: row.id, ring: 0, unlockLog: row.start, planGoalLog: row.start, delta: 0, penalty: row.penalty, reward: 'none', targetMin: row.dur, extraMult: e }],
    penalty: DEFAULT_PENALTY, reward: DEFAULT_REWARD, goalMode: 'duration',
    maxMinutes: 120, sampleEveryMin: 1000, preRewards: row.rw, stopAfterChallenges: true
  }
  const r = runSim(cfg)
  const p = r.phases[0]
  return p ? p.logAtEnd - p.entryLog : NaN
}

for (const row of rows) {
  let lo = -7
  let hi = 0.35
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    const g = gainAt(row, Math.pow(10, mid))
    if (!Number.isFinite(g) || g < row.target) lo = mid
    else hi = mid
  }
  const e = Math.pow(10, (lo + hi) / 2)
  const g = gainAt(row, e)
  console.log(row.id + ' | extraMult=' + e.toExponential(3) + ' | kazanc=' + g.toFixed(2) + ' (hedef ' + row.target + ')')
}
