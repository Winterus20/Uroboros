/**
 * SIRALI DOGRULAMA: hedef egri + siddet carpanlari, fixed mode.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

interface Def { id: string; ring: number; unlock: number; goal: number; delta: number; penalty: PenaltyKind; reward: RewardKind; extraMult: number }
const defs: Def[] = [
  { id: 'C1', ring: 0, unlock: 10,  goal: 65,  delta: 2, penalty: 'fingersCap',       reward: 'fingers10', extraMult: 2.823e-4 },
  { id: 'C2', ring: 1, unlock: 65,  goal: 75,  delta: 2, penalty: 'price145',          reward: 'all5',      extraMult: 1.747 },
  { id: 'C3', ring: 2, unlock: 75,  goal: 125, delta: 2, penalty: 'directOff',         reward: 'all3',      extraMult: 1.226e-6 },
  { id: 'C4', ring: 3, unlock: 125, goal: 170, delta: 2, penalty: 'decay',             reward: 'first3x5',  extraMult: 1.230e-4 },
  { id: 'C5', ring: 4, unlock: 170, goal: 205, delta: 2, penalty: 'firstFive',         reward: 'direct5',   extraMult: 3.765e-4 },
  { id: 'C6', ring: 5, unlock: 205, goal: 228, delta: 2, penalty: 'feedFifth',         reward: 'feed15',    extraMult: 5.279e-1 },
  { id: 'C7', ring: 6, unlock: 228, goal: 245, delta: 2, penalty: 'newestOnly',        reward: 'all4',      extraMult: 8.094e-3 },
  { id: 'C8', ring: 7, unlock: 245, goal: 249, delta: 2, penalty: 'price135feedHalf',  reward: 'finisher',  extraMult: 1 }
]

function challenges(): ChallengeDef[] {
  return defs.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock, planGoalLog: d.goal,
    delta: d.delta, penalty: d.penalty, reward: d.reward, targetMin: 0, extraMult: d.extraMult
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
  console.log('\n=== ' + policy + ' | toplam ' + r.totalMin.toFixed(1) + ' dk | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)) + ' ===')
  console.log('id | baslangic | bitis | sure | giris | hedef | cikis | bought')
  let sum = 0
  for (const p of r.phases) {
    sum += p.durationMin
    console.log(p.id + ' | ' + p.startMin.toFixed(1).padStart(5) + ' | ' + p.endMin.toFixed(1).padStart(5) + ' | ' + p.durationMin.toFixed(1).padStart(5) + ' | ' + fmtLog(p.entryLog).padStart(9) + ' | ' + fmtLog(p.goalLog).padStart(9) + ' | ' + fmtLog(p.logAtEnd).padStart(9) + ' | ' + p.boughtAtEnd.join(','))
  }
  const c8 = r.phases.find((p) => p.id === 'C8')
  const tail = c8 && r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('mucadele toplami ' + sum.toFixed(1) + ' | son itis ' + (tail === null ? '-' : tail.toFixed(1)) + ' | acilis ' + (r.openingMin === null ? '-' : r.openingMin.toFixed(1)))
  if (r.error) console.log('HATA ' + r.error)
}

run('maxall')
run('idle')
