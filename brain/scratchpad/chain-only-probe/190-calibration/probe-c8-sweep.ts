/**
 * C8 SONU REZERVUARI + C8 hedef taramasi.
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
  { id: 'C7', ring: 6, unlock: 232.04,  goal: 247.92, delta: 2, penalty: 'newestOnly',       reward: 'all4',      growth: 1.2047 },
  { id: 'C8', ring: 7, unlock: 247.92,  goal: 252.92, delta: 2, penalty: 'price135feedHalf', reward: 'finisher',  mult: 13.18 }
]

function challenges(c8goal: number): ChallengeDef[] {
  return base.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock,
    planGoalLog: d.id === 'C8' ? c8goal : d.goal,
    delta: d.delta, penalty: d.penalty, reward: d.reward, targetMin: 0,
    growthOverride: d.growth, extraMult: d.mult
  }))
}

function run(c8goal: number): void {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: challenges(c8goal), penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'fixed', maxMinutes: 400, sampleEveryMin: 1000
  }
  const r = runSim(cfg)
  const c8 = r.phases.find((p) => p.id === 'C8')
  if (!c8) { console.log('C8 yok, kapi ' + r.totalMin.toFixed(1)); return }
  const tail = r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('C8 hedef 1e' + c8goal.toFixed(0) + ' | sure ' + c8.durationMin.toFixed(1) + ' | cikis ' + fmtLog(c8.logAtEnd) + ' | son itis ' + (tail === null ? 'yok' : tail.toFixed(1)) + ' | toplam ' + r.totalMin.toFixed(1))
  if (c8goal === 252.92) {
    console.log('  bought ' + c8.boughtAtEnd.join(','))
    console.log('  amounts log ' + c8.amountsLogAtEnd.map((a) => a.toFixed(1)).join(','))
  }
}

for (const g of [200, 220, 240, 252.92, 260, 270, 280, 290, 300]) run(g)
