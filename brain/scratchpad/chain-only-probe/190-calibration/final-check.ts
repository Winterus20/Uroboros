/**
 * FINAL KONTROL: hedefler + feed 0.2, iki politika, faz logu ve odul hissedilirligi.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

interface Def { id: string; ring: number; unlock: number; goal: number; delta: number; penalty: PenaltyKind; reward: RewardKind; growth?: number }
const defs: Def[] = [
  { id: 'C1', ring: 0, unlock: 10,      goal: 33.242, delta: 2, penalty: 'fingersCap',      reward: 'fingers10', growth: 1.22 },
  { id: 'C2', ring: 1, unlock: 33.242,  goal: 37.376, delta: 2, penalty: 'price145',         reward: 'all5' },
  { id: 'C3', ring: 2, unlock: 37.376,  goal: 95.157, delta: 2, penalty: 'directOff',        reward: 'all3',      growth: 1.22 },
  { id: 'C4', ring: 3, unlock: 95.157,  goal: 104.688, delta: 2, penalty: 'decay',            reward: 'first3x5',  growth: 1.22 },
  { id: 'C5', ring: 4, unlock: 104.688,  goal: 119.334,delta: 2, penalty: 'firstFive',        reward: 'direct5',   growth: 1.22 },
  { id: 'C6', ring: 5, unlock: 119.334, goal: 122.271,delta: 2, penalty: 'feedFifth',        reward: 'feed15',    growth: 1.22 },
  { id: 'C7', ring: 6, unlock: 122.271, goal: 125.573,delta: 2, penalty: 'newestOnly',       reward: 'all4',      growth: 1.22 },
  { id: 'C8', ring: 7, unlock: 125.573, goal: 128.967,delta: 2, penalty: 'price135feedHalf', reward: 'finisher' }
]

function challenges(): ChallengeDef[] {
  return defs.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock, planGoalLog: d.goal,
    delta: d.delta, penalty: d.penalty, reward: d.reward, targetMin: 0,
    growthOverride: d.growth, feedMult: 0.2
  }))
}

function cfg(policy: 'maxall' | 'idle', skip?: RewardKind[]): SimConfig {
  return {
    B: 5.5, policy,
    tickDt: policy === 'idle' ? 1.0 : 0.5,
    decisionDt: policy === 'idle' ? 1.0 : 0.5,
    tapsPerSec: policy === 'idle' ? 0 : 2,
    tapUntilFirstBuy: policy === 'idle',
    challenges: challenges(), penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 2 },
    goalMode: 'fixed', maxMinutes: 600, sampleEveryMin: 5, skipRewards: skip
  }
}

for (const policy of ['maxall', 'idle'] as const) {
  const r = runSim(cfg(policy))
  const c8 = r.phases.find((p) => p.id === 'C8')
  const tail = c8 && r.gateMin !== null ? r.gateMin - c8.endMin : null
  console.log('\n=== ' + policy + ' | toplam ' + r.totalMin.toFixed(1) + ' | son itis ' + (tail === null ? '-' : tail.toFixed(1)) + ' ===')
  for (const p of r.phases) {
    console.log(p.id + ' | ' + p.startMin.toFixed(1).padStart(5) + '-' + p.endMin.toFixed(1).padStart(5) + ' | ' + p.durationMin.toFixed(1).padStart(5) + ' dk | ' + fmtLog(p.entryLog).padStart(9) + ' -> ' + fmtLog(p.logAtEnd).padStart(9) + ' | bought7 ' + p.boughtAtEnd[7])
  }
  if (policy === 'maxall') {
    console.log('ORNEKLER (5 dk): t | N | mucadele | alim7 | /sn')
    for (const s of r.samples) console.log(s.min.toFixed(0).padStart(3) + ' | ' + fmtLog(s.log) + ' | ' + s.challenge + ' | ' + s.bought[7] + ' | ' + fmtLog(s.perSecLog))
  }
  if (r.error) console.log('HATA ' + r.error)
}

console.log('\n=== ODUL HISSEDILIRLIGI (maxall, odul atlanir) ===')
const base = runSim(cfg('maxall'))
for (let k = 0; k < 8; k++) {
  const rw = defs[k].reward
  const r = runSim(cfg('maxall', [rw]))
  if (k < 7) {
    const nextId = defs[k + 1].id
    const b = base.phases.find((p) => p.id === nextId)
    const w = r.phases.find((p) => p.id === nextId)
    if (b && w) {
      const pct = ((w.durationMin - b.durationMin) / b.durationMin) * 100
      console.log(defs[k].id + ' odulu (' + rw + ') -> ' + nextId + ': ' + b.durationMin.toFixed(1) + ' -> ' + w.durationMin.toFixed(1) + ' dk (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)')
    }
  } else {
    const b8 = base.phases.find((p) => p.id === 'C8')
    const w8 = r.phases.find((p) => p.id === 'C8')
    const bTail = b8 && base.gateMin !== null ? base.gateMin - b8.endMin : null
    const wTail = w8 && r.gateMin !== null ? r.gateMin - w8.endMin : null
    console.log('C8 odulu (finisher) -> son itis: ' + (bTail === null ? '-' : bTail.toFixed(1)) + ' -> ' + (wTail === null ? 'yok' : wTail.toFixed(1)) + ' dk')
  }
}