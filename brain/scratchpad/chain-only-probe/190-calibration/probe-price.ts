/**
 * FIYAT ARTISI TEPKISI: g = 1.20..1.45, 20 dk, farkli N'lerde kazanc (dec).
 */
import { runSim, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type RewardKind } from './engine'

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

function gain(startLog: number, dur: number, rw: RewardKind[], g: number): number {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: [{ id: 'P', name: 'P', ring: 0, unlockLog: startLog, planGoalLog: startLog, delta: 0, penalty: 'none', reward: 'none', targetMin: dur, growthOverride: g }],
    penalty: DEFAULT_PENALTY, reward: DEFAULT_REWARD, goalMode: 'duration',
    maxMinutes: 120, sampleEveryMin: 1000, preRewards: rw, stopAfterChallenges: true
  }
  const r = runSim(cfg)
  const p = r.phases[0]
  return p ? p.logAtEnd - p.entryLog : NaN
}

const gs = [1.20, 1.22, 1.24, 1.26, 1.28, 1.30, 1.33, 1.36, 1.40, 1.45]
for (const start of [10, 40, 70, 100, 130, 160, 190, 220]) {
  const idx = start <= 10 ? 0 : start <= 40 ? 1 : start <= 70 ? 2 : start <= 100 ? 3 : start <= 130 ? 4 : start <= 160 ? 5 : start <= 190 ? 6 : 7
  const vals = gs.map((g) => gain(start, 20, sets[idx], g).toFixed(1))
  console.log('1e' + String(start).padStart(3) + ' | ' + gs.map((g, i) => g.toFixed(2) + '=' + vals[i]).join('  '))
}
