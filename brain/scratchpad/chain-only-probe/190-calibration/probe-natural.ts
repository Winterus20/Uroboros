/**
 * DOGAL KAZANC (extraMult=1): her ceza, onerilen giris N'inden hedef sure boyunca.
 * Boylece hedef kazancin cezanin dogal kazancinin altinda olup olmadigini goruruz.
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
  { id: 'C7', penalty: 'newestOnly', startLog: 228, dur: 24, rewards: sets[6], target: 14 },
  { id: 'C8', penalty: 'price135feedHalf', startLog: 242, dur: 24, rewards: sets[7], target: 8 }
]

for (const row of rows) {
  const cfg: SimConfig = {
    B: 5.5,
    policy: 'maxall',
    tickDt: 0.5,
    decisionDt: 0.5,
    tapsPerSec: 2,
    challenges: [{
      id: row.id, name: row.id, ring: 0,
      unlockLog: row.startLog, planGoalLog: row.startLog, delta: 0,
      penalty: row.penalty, reward: 'none', targetMin: row.dur, extraMult: 1
    }],
    penalty: DEFAULT_PENALTY,
    reward: DEFAULT_REWARD,
    goalMode: 'duration',
    maxMinutes: row.startLog > 200 ? 120 : 80,
    sampleEveryMin: 1000,
    preRewards: row.rewards,
    stopAfterChallenges: true
  }
  const r = runSim(cfg)
  const p = r.phases[0]
  if (!p) { console.log(row.id + ' yok'); continue }
  const gain = p.logAtEnd - p.entryLog
  console.log(row.id + ' | ' + row.penalty.padEnd(18) + ' | giris 1e' + row.startLog + ' | ' + row.dur + ' dk | dogal kazanc ' + gain.toFixed(1) + ' dec | hedef ' + row.target + ' | ' + (gain >= row.target ? 'OK' : 'HEDEF COK YUKSEK'))
}
