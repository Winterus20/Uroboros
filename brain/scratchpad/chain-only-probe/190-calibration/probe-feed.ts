/**
 * BESLEME SIDDETI TARAMASI: tum mucadelelerde feed carpani.
 * Duration mode, 22 dk/mucadele. C8 sonu ve son itis olculur.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

const defs: { id: string; penalty: PenaltyKind; reward: RewardKind }[] = [
  { id: 'C1', penalty: 'fingersCap', reward: 'fingers10' },
  { id: 'C2', penalty: 'price145', reward: 'all5' },
  { id: 'C3', penalty: 'directOff', reward: 'all3' },
  { id: 'C4', penalty: 'decay', reward: 'first3x5' },
  { id: 'C5', penalty: 'firstFive', reward: 'direct5' },
  { id: 'C6', penalty: 'feedFifth', reward: 'feed15' },
  { id: 'C7', penalty: 'newestOnly', reward: 'all4' },
  { id: 'C8', penalty: 'price135feedHalf', reward: 'finisher' }
]

function run(feed: number, g: number, dur: number): void {
  const challenges: ChallengeDef[] = defs.map((d, i) => ({
    id: d.id, name: d.id, ring: i, unlockLog: i === 0 ? 10 : 0, planGoalLog: 0, delta: 0,
    penalty: d.penalty, reward: d.reward, targetMin: dur,
    growthOverride: d.penalty === 'price145' || d.penalty === 'price135feedHalf' ? undefined : g,
    feedMult: feed
  }))
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges, penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'duration', maxMinutes: 500, sampleEveryMin: 1000
  }
  const r = runSim(cfg)
  const c8 = r.phases.find((p) => p.id === 'C8')
  if (!c8) { console.log('feed=' + feed + ' C8 yok, kapi ' + r.totalMin.toFixed(1)); return }
  const tail = r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('feed=' + feed + ' g=' + g + ' | C8 ' + fmtLog(c8.entryLog) + '->' + fmtLog(c8.logAtEnd) + ' | son itis ' + (tail === null ? 'yok' : tail.toFixed(1)) + ' | toplam ' + r.totalMin.toFixed(1) + ' | bought ' + c8.boughtAtEnd[7] + ' | amt0 ' + c8.amountsLogAtEnd[0].toFixed(1))
}

for (const feed of [1, 0.5, 0.2, 0.1, 0.05, 0.02]) run(feed, 1.22, 22)
