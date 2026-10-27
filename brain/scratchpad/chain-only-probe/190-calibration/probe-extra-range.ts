/**
 * extraMult araligi: her zayif ceza icin kazancin tabani nerede?
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

function gain(penalty: PenaltyKind, startLog: number, dur: number, rewards: RewardKind[], extraMult: number): number {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: [{ id: 'P', name: 'P', ring: 0, unlockLog: startLog, planGoalLog: startLog, delta: 0, penalty, reward: 'none', targetMin: dur, extraMult }],
    penalty: DEFAULT_PENALTY, reward: DEFAULT_REWARD, goalMode: 'duration',
    maxMinutes: 120, sampleEveryMin: 1000, preRewards: rewards, stopAfterChallenges: true
  }
  const r = runSim(cfg)
  const p = r.phases[0]
  return p ? p.logAtEnd - p.entryLog : NaN
}

const cases: { id: string; penalty: PenaltyKind; start: number; dur: number; rw: RewardKind[] }[] = [
  { id: 'C1 fingersCap', penalty: 'fingersCap', start: 10, dur: 21, rw: sets[0] },
  { id: 'C3 directOff', penalty: 'directOff', start: 135, dur: 21, rw: sets[2] },
  { id: 'C4 decay', penalty: 'decay', start: 165, dur: 21, rw: sets[3] },
  { id: 'C5 firstFive', penalty: 'firstFive', start: 190, dur: 22, rw: sets[4] },
  { id: 'C7 newestOnly', penalty: 'newestOnly', start: 220, dur: 24, rw: sets[6] }
]

for (const c of cases) {
  const vals: string[] = []
  for (const e of [1, 1e-2, 1e-4, 1e-6, 1e-8, 1e-10, 1e-14, 1e-20]) {
    vals.push('1e' + Math.log10(e) + '=' + gain(c.penalty, c.start, c.dur, c.rw, e).toFixed(1))
  }
  console.log(c.id + ' @1e' + c.start + ' | ' + vals.join('  '))
}
