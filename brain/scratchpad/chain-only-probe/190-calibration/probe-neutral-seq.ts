/**
 * SIRALI NOTR EGRISI: tum mucadelelerde fiyat artisi 1.22 (kimlik cezalari ustune).
 * Duration mode, hedef sureler 21-22 dk. Kazanclari goruruz.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

const defs: { id: string; penalty: PenaltyKind; reward: RewardKind; dur: number }[] = [
  { id: 'C1', penalty: 'fingersCap', reward: 'fingers10', dur: 22 },
  { id: 'C2', penalty: 'price145', reward: 'all5', dur: 22 },
  { id: 'C3', penalty: 'directOff', reward: 'all3', dur: 22 },
  { id: 'C4', penalty: 'decay', reward: 'first3x5', dur: 21 },
  { id: 'C5', penalty: 'firstFive', reward: 'direct5', dur: 21 },
  { id: 'C6', penalty: 'feedFifth', reward: 'feed15', dur: 21 },
  { id: 'C7', penalty: 'newestOnly', reward: 'all4', dur: 21 },
  { id: 'C8', penalty: 'price135feedHalf', reward: 'finisher', dur: 21 }
]

const challenges: ChallengeDef[] = defs.map((d, i) => ({
  id: d.id, name: d.id, ring: i,
  unlockLog: i === 0 ? 10 : 0,
  planGoalLog: 0, delta: 0,
  penalty: d.penalty, reward: d.reward, targetMin: d.dur,
  growthOverride: d.penalty === 'price145' || d.penalty === 'price135feedHalf' ? undefined : 1.22
}))

const cfg: SimConfig = {
  B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
  challenges, penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
  goalMode: 'duration', maxMinutes: 400, sampleEveryMin: 1000
}
const r = runSim(cfg)
console.log('toplam ' + r.totalMin.toFixed(1) + ' | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)))
for (const p of r.phases) {
  console.log(p.id + ' | ' + p.startMin.toFixed(1).padStart(5) + '-' + p.endMin.toFixed(1).padStart(5) + ' | ' + p.durationMin.toFixed(1).padStart(5) + ' dk | ' + fmtLog(p.entryLog).padStart(9) + ' -> ' + fmtLog(p.logAtEnd).padStart(9) + ' | kazanc ' + (p.logAtEnd - p.entryLog).toFixed(1))
}
if (r.error) console.log('HATA ' + r.error)
