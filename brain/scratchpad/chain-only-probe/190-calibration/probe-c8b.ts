/**
 * C8 ceza siddeti: C1-C7 sabit surelerle, C8 22 dk duration mode.
 * C8 bitis N'i ve son itis olculur.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

const defs: { id: string; penalty: PenaltyKind; reward: RewardKind; dur: number; growth?: number }[] = [
  { id: 'C1', penalty: 'fingersCap', reward: 'fingers10', dur: 21.1, growth: 1.22 },
  { id: 'C2', penalty: 'price145', reward: 'all5', dur: 21 },
  { id: 'C3', penalty: 'directOff', reward: 'all3', dur: 21, growth: 1.22 },
  { id: 'C4', penalty: 'decay', reward: 'first3x5', dur: 22, growth: 1.22 },
  { id: 'C5', penalty: 'firstFive', reward: 'direct5', dur: 21, growth: 1.22 },
  { id: 'C6', penalty: 'feedFifth', reward: 'feed15', dur: 21.1, growth: 1.22 },
  { id: 'C7', penalty: 'newestOnly', reward: 'all4', dur: 22, growth: 1.22 }
]

function run(g8: number, m8: number): void {
  const challenges: ChallengeDef[] = defs.map((d, i) => ({
    id: d.id, name: d.id, ring: i, unlockLog: i === 0 ? 10 : 0, planGoalLog: 0, delta: 0,
    penalty: d.penalty, reward: d.reward, targetMin: d.dur, growthOverride: d.growth, feedMult: 0.2
  }))
  challenges.push({ id: 'C8', name: 'C8', ring: 7, unlockLog: 0, planGoalLog: 0, delta: 0, penalty: 'price135feedHalf', reward: 'finisher', targetMin: 22, growthOverride: g8, extraMult: m8, feedMult: 0.2 })
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges, penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'duration', maxMinutes: 400, sampleEveryMin: 1000
  }
  const r = runSim(cfg)
  const c8 = r.phases.find((p) => p.id === 'C8')
  if (!c8) { console.log('g8=' + g8 + ' C8 yok'); return }
  const tail = r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('g8=' + g8.toFixed(2) + ' m=' + m8 + ' | C8 kazanc ' + (c8.logAtEnd - c8.entryLog).toFixed(1) + ' | bitis ' + fmtLog(c8.logAtEnd) + ' | son itis ' + (tail === null ? 'yok' : tail.toFixed(1)) + ' | toplam ' + r.totalMin.toFixed(1) + ' | bought ' + c8.boughtAtEnd[7])
}

for (const [g, m] of [[1.35,1],[1.32,1],[1.30,1],[1.28,1],[1.25,1],[1.22,1],[1.28,3],[1.30,3]] as [number,number][]) run(g, m)
