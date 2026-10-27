/**
 * POLITIKA KARSILASTIRMASI: maxall (0.5s, 2 tik/sn) vs idle (1.0s, bootstrap sonrasi tik yok).
 */
import { runSim, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type RewardKind } from './engine'

const LOGS = [10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 250, 260, 275, 300]
const ALL: RewardKind[] = ['fingers10','all5','all3','first3x5','direct5','feed15','all4']

function cfg(policy: 'maxall'|'idle', rewards: RewardKind[]): SimConfig {
  return {
    B: 5.5,
    policy,
    tickDt: policy === 'idle' ? 1.0 : 0.5,
    decisionDt: policy === 'idle' ? 1.0 : 0.5,
    tapsPerSec: policy === 'idle' ? 0 : 2,
    tapUntilFirstBuy: policy === 'idle',
    challenges: [],
    penalty: DEFAULT_PENALTY,
    reward: DEFAULT_REWARD,
    goalMode: 'fixed',
    maxMinutes: 500,
    sampleEveryMin: 1000,
    milestones: LOGS,
    preRewards: rewards
  }
}

for (const policy of ['maxall','idle'] as const) {
  for (const withR of [false, true]) {
    const r = runSim(cfg(policy, withR ? ALL : []))
    console.log('\n' + policy + (withR ? ' +TUM ODUL' : ' odulsuz') + ' | kapi ' + (r.gateMin === null ? 'yok' : r.gateMin.toFixed(1)))
    console.log(r.milestones.map((m) => '1e' + m.log + '=' + m.min.toFixed(1)).join(' '))
    if (r.error) console.log('HATA ' + r.error)
  }
}
