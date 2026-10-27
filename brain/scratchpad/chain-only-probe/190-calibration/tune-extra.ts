/**
 * extraMult bisection: her ceza icin hedef kazanci (dec) tutturan uretim carpani.
 * Tek kosu, onerilen giris N'i sabit; kazanc monoton artar.
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

const rows: { id: string; penalty: PenaltyKind; startLog: number; dur: number; rewards: RewardKind[]; target: number }[] = [
  { id: 'C1', penalty: 'fingersCap', startLog: 10, dur: 21, rewards: sets[0], target: 55 },
  { id: 'C2', penalty: 'price145', startLog: 65, dur: 19, rewards: sets[1], target: 10 },
  { id: 'C3', penalty: 'directOff', startLog: 75, dur: 21, rewards: sets[2], target: 50 },
  { id: 'C4', penalty: 'decay', startLog: 125, dur: 21, rewards: sets[3], target: 45 },
  { id: 'C5', penalty: 'firstFive', startLog: 170, dur: 22, rewards: sets[4], target: 35 },
  { id: 'C6', penalty: 'feedFifth', startLog: 205, dur: 23, rewards: sets[5], target: 23 },
  { id: 'C7', penalty: 'newestOnly', startLog: 228, dur: 24, rewards: sets[6], target: 17 },
  { id: 'C8', penalty: 'price135feedHalf', startLog: 245, dur: 24, rewards: sets[7], target: 5 }
]

function gainAt(row: typeof rows[number], extraMult: number): number {
  const cfg: SimConfig = {
    B: 5.5,
    policy: 'maxall',
    tickDt: 0.5,
    decisionDt: 0.5,
    tapsPerSec: 2,
    challenges: [{
      id: row.id, name: row.id, ring: 0,
      unlockLog: row.startLog, planGoalLog: row.startLog, delta: 0,
      penalty: row.penalty, reward: 'none', targetMin: row.dur, extraMult
    }],
    penalty: DEFAULT_PENALTY,
    reward: DEFAULT_REWARD,
    goalMode: 'duration',
    maxMinutes: 120,
    sampleEveryMin: 1000,
    preRewards: row.rewards,
    stopAfterChallenges: true
  }
  const r = runSim(cfg)
  const p = r.phases[0]
  return p ? p.logAtEnd - p.entryLog : NaN
}

for (const row of rows) {
  let lo = -5
  let hi = 0.3
  let best = 1
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    const g = gainAt(row, Math.pow(10, mid))
    if (!Number.isFinite(g)) { hi = mid; continue }
    if (g < row.target) lo = mid
    else hi = mid
    best = Math.pow(10, mid)
  }
  const g = gainAt(row, best)
  console.log(row.id + ' | extraMult=' + best.toExponential(3) + ' | kazanc=' + g.toFixed(2) + ' (hedef ' + row.target + ')')
}
