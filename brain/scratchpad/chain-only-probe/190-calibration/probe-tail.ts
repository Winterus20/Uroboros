/**
 * SON ITIS EGRISI: tum oduller acikken C8 duz carpani 1eX'te devreye girerse
 * kapiya ne kadar kalir? C8 hedefini 8-12 dk'ya oturtmak icin.
 */
import { runSim, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type RewardKind } from './engine'

const ALL: RewardKind[] = ['fingers10','all5','all3','first3x5','direct5','feed15','all4']

function cfg(atLog: number, mult: number, B = 5.5): SimConfig {
  return {
    B,
    policy: 'maxall',
    tickDt: 0.5,
    decisionDt: 0.5,
    tapsPerSec: 2,
    challenges: [{
      id: 'C8', name: 'finisher', ring: 7,
      unlockLog: atLog, planGoalLog: atLog, delta: 0,
      penalty: 'none', reward: 'finisher', targetMin: 0
    }],
    penalty: DEFAULT_PENALTY,
    reward: { ...DEFAULT_REWARD, c8: mult },
    goalMode: 'fixed',
    maxMinutes: 400,
    sampleEveryMin: 100,
    preRewards: ALL,
    stopAfterChallenges: false
  }
}

for (const mult of [100, 300]) {
  const rows: string[] = []
  for (const x of [100, 130, 150, 170, 190, 210, 230, 250, 260, 270, 275, 280, 290]) {
    const r = runSim(cfg(x, mult))
    const p = r.phases[0]
    const tail = r.gateMin !== null && p ? r.gateMin - p.endMin : null
    rows.push('1e' + x + ':' + (tail === null ? '-' : tail.toFixed(1)))
  }
  console.log('x' + mult + ' son itis | ' + rows.join('  '))
}

console.log('\n=== Ayni egri, odulsuz (karsilastirma) ===')
for (const x of [190, 210, 230, 250, 270]) {
  const c = cfg(x, 100)
  c.preRewards = []
  const r = runSim(c)
  const p = r.phases[0]
  const tail = r.gateMin !== null && p ? r.gateMin - p.endMin : null
  console.log('1e' + x + ' | ' + (tail === null ? '-' : tail.toFixed(1)) + ' dk')
}
