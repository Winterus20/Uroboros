/**
 * TABAN DOGRULAMA: challengesiz B taramasi + C8 duz carpan.
 * Mevcut probe'larin olctugu sayilari yeniden uretir.
 */
import { runSim, fmtLog, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type RewardKind } from './engine'

const LOGS = [10, 18, 28, 40, 55, 75, 100, 135, 165, 195, 210, 240, 275]

function baseCfg(B: number): SimConfig {
  return {
    B,
    policy: 'maxall',
    tickDt: 0.5,
    decisionDt: 0.5,
    tapsPerSec: 2,
    challenges: [],
    penalty: DEFAULT_PENALTY,
    reward: DEFAULT_REWARD,
    goalMode: 'fixed',
    maxMinutes: 600,
    sampleEveryMin: 20,
    milestones: LOGS
  }
}

function finisher(atLog: number, mult: number): ChallengeDef {
  return {
    id: 'C8', name: 'finisher', ring: 7,
    unlockLog: atLog, planGoalLog: atLog, delta: 0,
    penalty: 'none', reward: 'finisher', targetMin: 0
  }
}

const ALL: RewardKind[] = ['fingers10','all5','all3','first3x5','direct5','feed15','all4']

console.log('=== A) Challengesiz B taramasi (maxall, 2 tik/sn) ===')
for (const B of [5.4, 5.45, 5.5, 5.55, 5.6]) {
  const r = runSim(baseCfg(B))
  const ms = r.milestones.map((m) => fmtLog(m.log) + '=' + m.min.toFixed(1)).join(' ')
  console.log('B=' + B.toFixed(2) + ' | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1) + ' dk') + ' | ' + ms)
  if (r.error) console.log('  HATA ' + r.error)
}

console.log('\n=== B) C8 duz carpan (1e275 sonrasi), odulsuz ===')
for (const mult of [1, 100, 300]) {
  const cfg = baseCfg(5.5)
  cfg.challenges = [finisher(275, mult)]
  cfg.reward = { ...DEFAULT_REWARD, c8: mult }
  const r = runSim(cfg)
  const p = r.phases[0]
  const tail = r.gateMin !== null && p ? r.gateMin - p.endMin : null
  console.log('x' + String(mult).padStart(3) + ' | 1e275 ' + (p ? p.endMin.toFixed(1) : '-') + ' | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)) + ' | son itis ' + (tail === null ? '-' : tail.toFixed(1)) + ' dk')
}

console.log('\n=== C) Tum oduller onceden acik + C8 (1e275) ===')
for (const mult of [100, 300]) {
  const cfg = baseCfg(5.5)
  cfg.preRewards = ALL
  cfg.challenges = [finisher(275, mult)]
  cfg.reward = { ...DEFAULT_REWARD, c8: mult }
  const r = runSim(cfg)
  const p = r.phases[0]
  const tail = r.gateMin !== null && p ? r.gateMin - p.endMin : null
  console.log('x' + String(mult).padStart(3) + ' | 1e275 ' + (p ? p.endMin.toFixed(1) : '-') + ' | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)) + ' | son itis ' + (tail === null ? '-' : tail.toFixed(1)) + ' dk')
}

console.log('\n=== D) Tum oduller, 1e275 hedefi, C8 yok ===')
{
  const cfg = baseCfg(5.5)
  cfg.preRewards = ALL
  const r = runSim(cfg)
  console.log('kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1) + ' dk'))
}
