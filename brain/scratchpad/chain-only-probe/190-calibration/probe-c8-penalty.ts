/**
 * C8 CEZA TARAMASI: C1-C7 sabit, C8 23 dk duration mode.
 * C8 kazanci, bitis N'i ve son itis (odul sonrasi kapiya kadar) olculur.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

interface Def { id: string; ring: number; unlock: number; goal: number; delta: number; penalty: PenaltyKind; reward: RewardKind; growth?: number; mult?: number }
const base: Def[] = [
  { id: 'C1', ring: 0, unlock: 10,      goal: 75.08,  delta: 2, penalty: 'fingersCap',      reward: 'fingers10', growth: 1.2147 },
  { id: 'C2', ring: 1, unlock: 75.08,   goal: 78.08,  delta: 2, penalty: 'price145',         reward: 'all5',      mult: 0.591 },
  { id: 'C3', ring: 2, unlock: 78.08,   goal: 136.09, delta: 2, penalty: 'directOff',        reward: 'all3',      growth: 1.2166 },
  { id: 'C4', ring: 3, unlock: 136.09,  goal: 176.09, delta: 2, penalty: 'decay',            reward: 'first3x5',  growth: 1.2106 },
  { id: 'C5', ring: 4, unlock: 176.09,  goal: 216.06, delta: 2, penalty: 'firstFive',        reward: 'direct5',   growth: 1.2078 },
  { id: 'C6', ring: 5, unlock: 216.06,  goal: 232.04, delta: 2, penalty: 'feedFifth',        reward: 'feed15',    growth: 1.2062 },
  { id: 'C7', ring: 6, unlock: 232.04,  goal: 247.92, delta: 2, penalty: 'newestOnly',       reward: 'all4',      growth: 1.2047 }
]

function challenges(g8: number, mult8: number, c8dur: number): ChallengeDef[] {
  const out = base.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock, planGoalLog: d.goal,
    delta: d.delta, penalty: d.penalty, reward: d.reward, targetMin: 0,
    growthOverride: d.growth, extraMult: d.mult
  }))
  out.push({ id: 'C8', name: 'C8', ring: 7, unlockLog: 247.92, planGoalLog: 0, delta: 0, penalty: 'price135feedHalf', reward: 'finisher', targetMin: c8dur, growthOverride: g8, extraMult: mult8 })
  return out
}

for (const [g8, m8] of [[1.22,1],[1.24,1],[1.26,1],[1.28,1],[1.30,1],[1.32,1],[1.35,1],[1.35,13.18],[1.28,5]] as [number,number][]) {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: challenges(g8, m8, 23), penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'duration', maxMinutes: 400, sampleEveryMin: 1000
  }
  const r = runSim(cfg)
  const c8 = r.phases.find((p) => p.id === 'C8')
  if (!c8) { console.log('g8=' + g8 + ' C8 yok, kapi ' + r.totalMin.toFixed(1)); continue }
  const tail = r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('g8=' + g8.toFixed(2) + ' m=' + m8 + ' | C8 kazanc ' + (c8.logAtEnd - c8.entryLog).toFixed(1) + ' | bitis ' + fmtLog(c8.logAtEnd) + ' | son itis ' + (tail === null ? 'yok' : tail.toFixed(1)) + ' | toplam ' + r.totalMin.toFixed(1))
}
