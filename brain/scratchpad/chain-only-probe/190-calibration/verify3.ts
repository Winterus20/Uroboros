/**
 * FINAL ADAY: feed 0.2, g=1.22 (C2/C8 kimlik fiyati), fixed mode, iki politika.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

interface Def { id: string; ring: number; unlock: number; goal: number; delta: number; penalty: PenaltyKind; reward: RewardKind; growth?: number }
const defs: Def[] = [
  { id: 'C1', ring: 0, unlock: 10,      goal: 32.75,  delta: 2, penalty: 'fingersCap',      reward: 'fingers10', growth: 1.22 },
  { id: 'C2', ring: 1, unlock: 32.75,   goal: 37.02,  delta: 2, penalty: 'price145',         reward: 'all5' },
  { id: 'C3', ring: 2, unlock: 37.02,   goal: 88.09,  delta: 2, penalty: 'directOff',        reward: 'all3',      growth: 1.22 },
  { id: 'C4', ring: 3, unlock: 88.09,   goal: 96.79,  delta: 2, penalty: 'decay',            reward: 'first3x5',  growth: 1.22 },
  { id: 'C5', ring: 4, unlock: 96.79,   goal: 111.64, delta: 2, penalty: 'firstFive',        reward: 'direct5',   growth: 1.22 },
  { id: 'C6', ring: 5, unlock: 111.64,  goal: 113.85, delta: 2, penalty: 'feedFifth',        reward: 'feed15',    growth: 1.22 },
  { id: 'C7', ring: 6, unlock: 113.85,  goal: 116.05, delta: 2, penalty: 'newestOnly',       reward: 'all4',      growth: 1.22 },
  { id: 'C8', ring: 7, unlock: 116.05,  goal: 119.13, delta: 2, penalty: 'price135feedHalf', reward: 'finisher' }
]

function challenges(): ChallengeDef[] {
  return defs.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock, planGoalLog: d.goal,
    delta: d.delta, penalty: d.penalty, reward: d.reward, targetMin: 0,
    growthOverride: d.growth, feedMult: 0.2
  }))
}

function run(policy: 'maxall' | 'idle'): void {
  const cfg: SimConfig = {
    B: 5.5, policy,
    tickDt: policy === 'idle' ? 1.0 : 0.5,
    decisionDt: policy === 'idle' ? 1.0 : 0.5,
    tapsPerSec: policy === 'idle' ? 0 : 2,
    tapUntilFirstBuy: policy === 'idle',
    challenges: challenges(), penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'fixed', maxMinutes: 300, sampleEveryMin: 5
  }
  const r = runSim(cfg)
  console.log('\n=== ' + policy + ' | toplam ' + r.totalMin.toFixed(1) + ' | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)) + ' ===')
  for (const p of r.phases) {
    console.log(p.id + ' | ' + p.startMin.toFixed(1).padStart(5) + '-' + p.endMin.toFixed(1).padStart(5) + ' | ' + p.durationMin.toFixed(1).padStart(5) + ' dk | ' + fmtLog(p.entryLog).padStart(9) + ' -> ' + fmtLog(p.logAtEnd).padStart(9) + ' | ' + p.boughtAtEnd[7])
  }
  const c8 = r.phases.find((p) => p.id === 'C8')
  const tail = c8 && r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('son itis ' + (tail === null ? '-' : tail.toFixed(1)) + ' | acilis ' + (r.openingMin === null ? '-' : r.openingMin.toFixed(1)))
  if (r.error) console.log('HATA ' + r.error)
}

run('maxall')
run('idle')
