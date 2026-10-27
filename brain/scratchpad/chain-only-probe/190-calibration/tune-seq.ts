/**
 * SIRALI COZUM: hedef kazanc + hedef sure -> ceza siddeti (fiyat artisi veya extraMult).
 * Onceki mucadeleler sabit; her aday icin bastan kosulur.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

interface Row { id: string; penalty: PenaltyKind; reward: RewardKind; dur: number; gain: number; knob: 'growth' | 'mult' }
const rows: Row[] = [
  { id: 'C1', penalty: 'fingersCap', reward: 'fingers10', dur: 22, gain: 65, knob: 'growth' },
  { id: 'C2', penalty: 'price145', reward: 'all5', dur: 16, gain: 3, knob: 'mult' },
  { id: 'C3', penalty: 'directOff', reward: 'all3', dur: 22, gain: 58, knob: 'growth' },
  { id: 'C4', penalty: 'decay', reward: 'first3x5', dur: 22, gain: 40, knob: 'growth' },
  { id: 'C5', penalty: 'firstFive', reward: 'direct5', dur: 23, gain: 40, knob: 'growth' },
  { id: 'C6', penalty: 'feedFifth', reward: 'feed15', dur: 22, gain: 16, knob: 'growth' },
  { id: 'C7', penalty: 'newestOnly', reward: 'all4', dur: 23, gain: 16, knob: 'growth' },
  { id: 'C8', penalty: 'price135feedHalf', reward: 'finisher', dur: 22, gain: 5, knob: 'mult' }
]

const growths: number[] = []
const mults: number[] = []
const goals: number[] = []

function build(upto: number, candIdx: number, candVal: number): ChallengeDef[] {
  const out: ChallengeDef[] = []
  for (let i = 0; i <= upto; i++) {
    const r = rows[i]
    const growth = i === candIdx && r.knob === 'growth' ? candVal : growths[i]
    const mult = i === candIdx && r.knob === 'mult' ? candVal : mults[i]
    out.push({
      id: r.id, name: r.id, ring: i,
      unlockLog: i === 0 ? 10 : goals[i - 1],
      planGoalLog: i === candIdx ? 0 : goals[i],
      delta: 0,
      penalty: r.penalty, reward: r.reward, targetMin: r.dur,
      growthOverride: r.knob === 'growth' ? growth : undefined,
      extraMult: r.knob === 'mult' ? mult : undefined
    })
  }
  return out
}

function gainOf(upto: number, candIdx: number, candVal: number): { gain: number; endLog: number } {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: build(upto, candIdx, candVal),
    penalty: DEFAULT_PENALTY, reward: { ...DEFAULT_REWARD, c8: 100 },
    goalMode: 'duration', maxMinutes: 400, sampleEveryMin: 1000, stopAfterChallenges: true
  }
  const r = runSim(cfg)
  const p = r.phases[upto]
  if (!p) return { gain: NaN, endLog: NaN }
  return { gain: p.logAtEnd - p.entryLog, endLog: p.logAtEnd }
}

for (let k = 0; k < rows.length; k++) {
  const row = rows[k]
  let best = 1
  if (row.knob === 'growth') {
    let lo = 1.20
    let hi = 1.70
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2
      const g = gainOf(k, k, mid).gain
      if (!Number.isFinite(g) || g > row.gain) lo = mid
      else hi = mid
    }
    best = (lo + hi) / 2
    growths[k] = best
    mults[k] = 1
  } else {
    let lo = -2
    let hi = 3
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2
      const g = gainOf(k, k, Math.pow(10, mid)).gain
      if (!Number.isFinite(g) || g < row.gain) lo = mid
      else hi = mid
    }
    best = Math.pow(10, (lo + hi) / 2)
    mults[k] = best
    growths[k] = 1
  }
  const res = gainOf(k, k, best)
  goals[k] = res.endLog
  console.log(row.id + ' | ' + (row.knob === 'growth' ? 'g=' + best.toFixed(4) : 'mult=' + best.toExponential(3)) + ' | kazanc ' + res.gain.toFixed(2) + ' (hedef ' + row.gain + ') | hedef ' + fmtLog(res.endLog))
}
console.log('\nGOWTHS ' + growths.map((g) => g.toFixed(4)).join(', '))
console.log('MULTS ' + mults.map((m) => m.toExponential(3)).join(', '))
console.log('GOALS ' + goals.map((g) => g.toFixed(2)).join(', '))
