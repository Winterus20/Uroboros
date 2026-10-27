/**
 * SIRALI DOGRULAMA 2: cozulen hedefler + siddetler, fixed mode, iki politika.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

interface Def { id: string; ring: number; unlock: number; goal: number; delta: number; penalty: PenaltyKind; reward: RewardKind; growth?: number; mult?: number }
const defs: Def[] = [
  { id: 'C1', ring: 0, unlock: 10,      goal: 75.08,  delta: 2, penalty: 'fingersCap',      reward: 'fingers10', growth: 1.2147 },
  { id: 'C2', ring: 1, unlock: 75.08,   goal: 78.08,  delta: 2, penalty: 'price145',         reward: 'all5',      mult: 0.591 },
  { id: 'C3', ring: 2, unlock: 78.08,   goal: 136.09, delta: 2, penalty: 'directOff',        reward: 'all3',      growth: 1.2166 },
  { id: 'C4', ring: 3, unlock: 136.09,  goal: 176.09, delta: 2, penalty: 'decay',            reward: 'first3x5',  growth: 1.2106 },
  { id: 'C5', ring: 4, unlock: 176.09,  goal: 216.06, delta: 2, penalty: 'firstFive',        reward: 'direct5',   growth: 1.2078 },
  { id: 'C6', ring: 5, unlock: 216.06,  goal: 232.04, delta: 2, penalty: 'feedFifth',        reward: 'feed15',    growth: 1.2062 },
  { id: 'C7', ring: 6, unlock: 232.04,  goal: 247.92, delta: 2, penalty: 'newestOnly',       reward: 'all4',      growth: 1.2047 },
  { id: 'C8', ring: 7, unlock: 247.92,  goal: 252.92, delta: 2, penalty: 'price135feedHalf', reward: 'finisher',  mult: 13.18 }
]

function challenges(): ChallengeDef[] {
  return defs.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock, planGoalLog: d.goal,
    delta: d.delta, penalty: d.penalty, reward: d.reward, targetMin: 0,
    growthOverride: d.growth, extraMult: d.mult
  }))
}

function run(policy: 'maxall' | 'idle'): void {
  const cfg: SimConfig = {
    B: 5.5, policy,
    tickDt: policy === 'idle' ? 1.0 : 0.5,
    decisionDt: policy === 'idle' ? 1.0 : 0.5,
    tapsPerSec: policy === 'idle' ? 0 : 2,
    tapUntilFirstBuy: policy === 'idle',
    challenges: challenges(),
    penalty: DEFAULT_PENALTY,
    reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'fixed', maxMinutes: 300, sampleEveryMin: 5
  }
  const r = runSim(cfg)
  console.log('\n=== ' + policy + ' | toplam ' + r.totalMin.toFixed(1) + ' | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)) + ' ===')
  let sum = 0
  for (const p of r.phases) {
    sum += p.durationMin
    console.log(p.id + ' | ' + p.startMin.toFixed(1).padStart(5) + '-' + p.endMin.toFixed(1).padStart(5) + ' | ' + p.durationMin.toFixed(1).padStart(5) + ' dk | ' + fmtLog(p.entryLog).padStart(9) + ' -> ' + fmtLog(p.logAtEnd).padStart(9))
  }
  const c8 = r.phases.find((p) => p.id === 'C8')
  const tail = c8 && r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('mucadele ' + sum.toFixed(1) + ' | son itis ' + (tail === null ? '-' : tail.toFixed(1)) + ' | acilis ' + (r.openingMin === null ? '-' : r.openingMin.toFixed(1)))
  if (r.error) console.log('HATA ' + r.error)
}

run('maxall')
run('idle')
