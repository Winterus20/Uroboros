/**
 * R1/R5 guc testi: Fingers ve dogrudan katki odulleri kac kat olmali?
 */
import { runSim, DEFAULT_PENALTY, DEFAULT_REWARD, type SimConfig, type ChallengeDef, type PenaltyKind, type RewardKind } from './engine'

const defs: { id: string; ring: number; unlock: number; goal: number; penalty: PenaltyKind; reward: RewardKind; growth?: number }[] = [
  { id: 'C1', ring: 0, unlock: 10,      goal: 33.242, penalty: 'fingersCap',      reward: 'fingers10', growth: 1.22 },
  { id: 'C2', ring: 1, unlock: 33.242,  goal: 37.030, penalty: 'price145',         reward: 'all5' },
  { id: 'C3', ring: 2, unlock: 37.030,  goal: 88.562, penalty: 'directOff',        reward: 'all3',      growth: 1.22 },
  { id: 'C4', ring: 3, unlock: 88.562,  goal: 97.277, penalty: 'decay',            reward: 'first3x5',  growth: 1.22 },
  { id: 'C5', ring: 4, unlock: 97.277,  goal: 111.656,penalty: 'firstFive',        reward: 'direct5',   growth: 1.22 },
  { id: 'C6', ring: 5, unlock: 111.656, goal: 114.421,penalty: 'feedFifth',        reward: 'feed15',    growth: 1.22 },
  { id: 'C7', ring: 6, unlock: 114.421, goal: 116.107,penalty: 'newestOnly',       reward: 'all4',      growth: 1.22 },
  { id: 'C8', ring: 7, unlock: 116.107, goal: 119.114,penalty: 'price135feedHalf', reward: 'finisher' }
]

function challenges(): ChallengeDef[] {
  return defs.map((d) => ({
    id: d.id, name: d.id, ring: d.ring, unlockLog: d.unlock, planGoalLog: d.goal,
    delta: 0, penalty: d.penalty, reward: d.reward, targetMin: 0,
    growthOverride: d.growth, feedMult: 0.2
  }))
}

function run(r1: number, r5: number, skip?: RewardKind[]): ReturnType<typeof runSim> {
  const cfg: SimConfig = {
    B: 5.5, policy: 'maxall', tickDt: 0.5, decisionDt: 0.5, tapsPerSec: 2,
    challenges: challenges(), penalty: DEFAULT_PENALTY,
    reward: { ...DEFAULT_REWARD, c8: 100, fingers10: r1, direct5: r5 },
    goalMode: 'fixed', maxMinutes: 600, sampleEveryMin: 1000, skipRewards: skip
  }
  return runSim(cfg)
}

for (const [r1, r5] of [[10,5],[50,20],[100,50],[100,100]] as [number,number][]) {
  const base = run(r1, r5)
  const noR1 = run(r1, r5, ['fingers10'])
  const noR5 = run(r1, r5, ['direct5'])
  const c2b = base.phases.find((p) => p.id === 'C2')!
  const c2n = noR1.phases.find((p) => p.id === 'C2')!
  const c6b = base.phases.find((p) => p.id === 'C6')!
  const c6n = noR5.phases.find((p) => p.id === 'C6')!
  const p1 = ((c2n.durationMin - c2b.durationMin) / c2b.durationMin) * 100
  const p5 = ((c6n.durationMin - c6b.durationMin) / c6b.durationMin) * 100
  console.log('R1=x' + r1 + ' R5=x' + r5 + ' | C2 felt ' + p1.toFixed(1) + '% | C6 felt ' + p5.toFixed(1) + '%')
}
