/**
 * ILK SIRALI KOSU (duration mode): cezalar varsayilan siddette.
 * Hedef sureler 171 dk; N egrisini ve C8 hedefini goruruz.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

const ALL: RewardKind[] = ['fingers10','all5','all3','first3x5','direct5','feed15','all4']

const defs: { id: string; ring: number; penalty: PenaltyKind; reward: RewardKind; target: number }[] = [
  { id: 'C1', ring: 0, penalty: 'fingersCap', reward: 'fingers10', target: 18 },
  { id: 'C2', ring: 1, penalty: 'price145', reward: 'all5', target: 19 },
  { id: 'C3', ring: 2, penalty: 'directOff', reward: 'all3', target: 20 },
  { id: 'C4', ring: 3, penalty: 'decay', reward: 'first3x5', target: 21 },
  { id: 'C5', ring: 4, penalty: 'firstFive', reward: 'direct5', target: 22 },
  { id: 'C6', ring: 5, penalty: 'feedFifth', reward: 'feed15', target: 23 },
  { id: 'C7', ring: 6, penalty: 'newestOnly', reward: 'all4', target: 24 },
  { id: 'C8', ring: 7, penalty: 'price135feedHalf', reward: 'finisher', target: 24 }
]

const challenges: ChallengeDef[] = defs.map((d, i) => ({
  id: d.id, name: d.id, ring: d.ring,
  unlockLog: i === 0 ? 10 : 0,
  planGoalLog: 0, delta: 0,
  penalty: d.penalty, reward: d.reward, targetMin: d.target
}))

const cfg: SimConfig = {
  B: 5.5,
  policy: 'maxall',
  tickDt: 0.5,
  decisionDt: 0.5,
  tapsPerSec: 2,
  challenges,
  penalty: DEFAULT_PENALTY,
  reward: { ...DEFAULT_REWARD, c8: 100 },
  goalMode: 'duration',
  maxMinutes: 400,
  sampleEveryMin: 1000
}

const r = runSim(cfg)
console.log('toplam ' + r.totalMin.toFixed(1) + ' dk | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)))
console.log('id | baslangic | bitis | sure | giris | cikis | kazanc | bought')
for (const p of r.phases) {
  console.log(
    p.id + ' | ' + p.startMin.toFixed(1).padStart(5) + ' | ' + p.endMin.toFixed(1).padStart(5) +
    ' | ' + p.durationMin.toFixed(1).padStart(5) + ' | ' + fmtLog(p.entryLog).padStart(9) +
    ' | ' + fmtLog(p.logAtEnd).padStart(9) + ' | ' + (p.logAtEnd - p.entryLog).toFixed(1).padStart(5) +
    ' | ' + p.boughtAtEnd.join(',')
  )
}
if (r.error) console.log('HATA ' + r.error)
