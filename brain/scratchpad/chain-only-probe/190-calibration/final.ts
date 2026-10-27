/**
 * 190-DK KALIBRASYONU — NIHAI KOSU (salt okuma; src/ degismez).
 *
 * Calistirma:
 *   npx esbuild brain/scratchpad/chain-only-probe/190-calibration/final.ts --bundle --platform=node --format=esm --outfile=brain/scratchpad/chain-only-probe/190-calibration/final.mjs
 *   node brain/scratchpad/chain-only-probe/190-calibration/final.mjs
 *
 * ONEMLI: onerilen C8 carpani x2'dir. Plan x100 diyor; x100 ile son itis 2.1 dk'ya
 * dusuyor (rezervuar). Karsilastirma icin x100 de kosulur.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

export const B = 5.5
export const FEED_SEVERITY = 0.2
export const C8_RECOMMENDED = 2
export const C8_PLAN = 100

interface Def {
  id: string
  ring: number
  unlock: number
  goal: number
  delta: number
  penalty: PenaltyKind
  reward: RewardKind
  growth?: number
  penaltyLabel: string
  rewardLabel: string
}

export const DEFS: Def[] = [
  { id: 'C1', ring: 0, unlock: 10,      goal: 33.242, delta: 2, penalty: 'fingersCap',      reward: 'fingers10', growth: 1.22, penaltyLabel: 'Fingers <=10 alim + fiyat 1.22 + besleme x0.2', rewardLabel: 'Tam El: Fingers x10 + besleme x1.5' },
  { id: 'C2', ring: 1, unlock: 33.242,  goal: 37.376, delta: 2, penalty: 'price145',         reward: 'all5',                   penaltyLabel: 'fiyat 1.45 + besleme x0.2', rewardLabel: 'Besli Centik: tum halkalar x5' },
  { id: 'C3', ring: 2, unlock: 37.376,  goal: 95.157, delta: 2, penalty: 'directOff',        reward: 'all3',      growth: 1.22, penaltyLabel: 'dogrudan katki kapali + fiyat 1.22 + besleme x0.2', rewardLabel: 'Basamak Tasmasi: tum halkalar x3' },
  { id: 'C4', ring: 3, unlock: 95.157,  goal: 104.688,delta: 2, penalty: 'decay',            reward: 'first3x5',  growth: 1.22, penaltyLabel: 'alim yoksa curume (tau 20s, taban %10) + fiyat 1.22 + besleme x0.2', rewardLabel: 'Uzun Carpma: ilk 3 halka x5' },
  { id: 'C5', ring: 4, unlock: 104.688, goal: 119.334,delta: 2, penalty: 'firstFive',        reward: 'direct5',   growth: 1.22, penaltyLabel: 'yalniz ilk 5 halka + fiyat 1.22 + besleme x0.2', rewardLabel: 'Anlik Sonuc: dogrudan x5 + besleme x1.5' },
  { id: 'C6', ring: 5, unlock: 119.334, goal: 122.271,delta: 2, penalty: 'feedFifth',        reward: 'feed15',    growth: 1.22, penaltyLabel: 'besleme /5 + fiyat 1.22 + besleme x0.2', rewardLabel: 'Overclock: besleme x1.5' },
  { id: 'C7', ring: 6, unlock: 122.271, goal: 125.573,delta: 2, penalty: 'newestOnly',       reward: 'all4',      growth: 1.22, penaltyLabel: 'yalniz son alinan halka %100 (digerleri x0.25) + fiyat 1.22 + besleme x0.2', rewardLabel: 'Paralel Kume: tum halkalar x4' },
  { id: 'C8', ring: 7, unlock: 125.573, goal: 128.967,delta: 2, penalty: 'price135feedHalf', reward: 'finisher',               penaltyLabel: 'fiyat 1.35 + besleme /2 + besleme x0.2', rewardLabel: 'Teorem: uretim x2 (onerilen) / x100 (plan)' }
]

function challenges(): ChallengeDef[] {
  return DEFS.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock, planGoalLog: d.goal,
    delta: d.delta, penalty: d.penalty, reward: d.reward, targetMin: 0,
    growthOverride: d.growth, feedMult: FEED_SEVERITY
  }))
}

export function makeConfig(policy: 'maxall' | 'idle', c8: number): SimConfig {
  return {
    B, policy,
    tickDt: policy === 'idle' ? 1.0 : 0.5,
    decisionDt: policy === 'idle' ? 1.0 : 0.5,
    tapsPerSec: policy === 'idle' ? 0 : 2,
    tapUntilFirstBuy: policy === 'idle',
    challenges: challenges(),
    penalty: DEFAULT_PENALTY,
    reward: { ...DEFAULT_REWARD, c8 },
    goalMode: 'fixed',
    maxMinutes: 400,
    sampleEveryMin: 5
  }
}

function report(policy: 'maxall' | 'idle', c8: number): void {
  const r = runSim(makeConfig(policy, c8))
  const c8p = r.phases.find((p) => p.id === 'C8')
  const tail = c8p && r.gateMin !== null ? r.gateMin - c8p.endMin : null
  console.log('\n=== ' + policy + ' | B=' + B + ' | C8 x' + c8 + ' | toplam ' + r.totalMin.toFixed(1) + ' dk | son itis ' + (tail === null ? '-' : tail.toFixed(1)) + ' dk ===')
  console.log('faz | baslangic-bitis | sure | giris -> hedef | ceza | odul')
  for (const p of r.phases) {
    const d = DEFS.find((x) => x.id === p.id)!
    console.log(p.id + ' | ' + p.startMin.toFixed(1) + '-' + p.endMin.toFixed(1) + ' | ' + p.durationMin.toFixed(1) + ' | ' + fmtLog(p.entryLog) + ' -> ' + fmtLog(p.logAtEnd) + ' | ' + d.penaltyLabel + ' | ' + d.rewardLabel)
  }
  console.log('SON ITIS: ' + (tail === null ? '-' : tail.toFixed(1)) + ' dk | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)))
  console.log('5 dk log: t | N | mucadele | alim7 | /sn')
  for (const s of r.samples) console.log('  ' + s.min.toFixed(0).padStart(3) + ' | ' + fmtLog(s.log) + ' | ' + s.challenge + ' | ' + s.bought[7] + ' | ' + fmtLog(s.perSecLog))
  if (r.error) console.log('HATA ' + r.error)
}

report('maxall', C8_RECOMMENDED)
report('idle', C8_RECOMMENDED)
report('maxall', C8_PLAN)
