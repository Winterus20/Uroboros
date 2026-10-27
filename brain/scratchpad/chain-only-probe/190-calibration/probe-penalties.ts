/**
 * CEZA GUCLERI: her ceza, verilen N esiginden itibaren 18 dk uygulanir.
 * Cikti: 18 dk'da kazanilan basamak (dogal hizla karsilastirma icin).
 */
import { runSim, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type PenaltyKind, type RewardKind } from './engine'

const ALL: RewardKind[] = ['fingers10','all5','all3','first3x5','direct5','feed15','all4']

function cfg(startLog: number, penalty: PenaltyKind, rewards: RewardKind[]): SimConfig {
  return {
    B: 5.5,
    policy: 'maxall',
    tickDt: 0.5,
    decisionDt: 0.5,
    tapsPerSec: 2,
    challenges: [{
      id: 'P', name: penalty, ring: 0,
      unlockLog: startLog, planGoalLog: startLog, delta: 0,
      penalty, reward: 'none', targetMin: 18
    }],
    penalty: DEFAULT_PENALTY,
    reward: DEFAULT_REWARD,
    goalMode: 'duration',
    maxMinutes: 130,
    sampleEveryMin: 100,
    preRewards: rewards,
    stopAfterChallenges: true
  }
}

const penalties: PenaltyKind[] = ['none','fingersCap','price145','directOff','decay','firstFive','feedFifth','newestOnly','price135feedHalf']

for (const withR of [false, true]) {
  console.log('\n=== ' + (withR ? 'TUM ODULLER ACIK' : 'ODULSUZ') + ' | 18 dk ceza ===')
  for (const startLog of [10, 55, 100, 135, 165]) {
    const rows: string[] = []
    for (const p of penalties) {
      const r = runSim(cfg(startLog, p, withR ? ALL : []))
      const ph = r.phases[0]
      if (!ph) { rows.push(p + '=yok'); continue }
      const dec = ph.logAtEnd - ph.entryLog
      rows.push(p + '=' + dec.toFixed(1))
    }
    console.log('1e' + startLog + ' | ' + rows.join(' | '))
  }
}
