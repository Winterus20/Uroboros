/**
 * feed taban taramasi: oduller sabit (R1/R5/R6 feed 1.5), hedefler sabit.
 * Son itis ve toplam olculur.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

const defs: { id: string; ring: number; unlock: number; goal: number; penalty: PenaltyKind; reward: RewardKind; growth?: number }[] = [
  { id: 'C1', ring: 0, unlock: 10,      goal: 33.242, penalty: 'fingersCap',      reward: 'fingers10', growth: 1.22 },
  { id: 'C2', ring: 1, unlock: 33.242,  goal: 37.376, penalty: 'price145',         reward: 'all5' },
  { id: 'C3', ring: 2, unlock: 37.376,  goal: 95.157, penalty: 'directOff',        reward: 'all3',      growth: 1.22 },
  { id: 'C4', ring: 3, unlock: 95.157,  goal: 104.688,penalty: 'decay',            reward: 'first3x5',  growth: 1.22 },
  { id: 'C5', ring: 4, unlock: 104.688, goal: 119.334,penalty: 'firstFive',        reward: 'direct5',   growth: 1.22 },
  { id: 'C6', ring: 5, unlock: 119.334, goal: 122.271,penalty: 'feedFifth',        reward: 'feed15',    growth: 1.22 },
  { id: 'C7', ring: 6, unlock: 122.271, goal: 125.573,penalty: 'newestOnly',       reward: 'all4',      growth: 1.22 },
  { id: 'C8', ring: 7, unlock: 125.573, goal: 128.967,penalty: 'price135feedHalf', reward: 'finisher' }
]

function challenges(feed: number): ChallengeDef[] {
  return defs.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock, planGoalLog: d.goal,
    delta: 2, penalty: d.penalty, reward: d.reward, targetMin: 0,
    growthOverride: d.growth, feedMult: feed
  }))
}

for (const feed of [0.08, 0.1, 0.12, 0.15, 0.18, 0.2]) {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: challenges(feed), penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'fixed', maxMinutes: 400, sampleEveryMin: 1000
  }
  const r = runSim(cfg)
  const c8 = r.phases.find((p) => p.id === 'C8')
  const tail = c8 && r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('feed=' + feed + ' | toplam ' + r.totalMin.toFixed(1) + ' | C8 ' + (c8 ? fmtLog(c8.logAtEnd) : '-') + ' | son itis ' + (tail === null ? 'yok' : tail.toFixed(1)))
}
