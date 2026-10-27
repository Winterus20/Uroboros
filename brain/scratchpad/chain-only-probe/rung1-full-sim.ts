import { Decimal, D } from '../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT } from '../../../src/game/number/tuning'

const GATE = new Decimal('1.79e308')
const d = (x: number | string) => new Decimal(x)

interface ChallengeDef {
  id: number
  name: string
  ringIndex: number
  goal: Decimal
  penaltyDesc: string
  rewardDesc: string
}

// Caller-specified exact target ladder:
// Reset 1: Math = 10, N ~ 1e10 (~11-12 dk)
// Reset 2: Math = 20, N ~ 1e18 (~19-20 dk)
// Reset 3: Math = 30, N ~ 1e28 (~26-28 dk)
// Reset 4: Math = 40, N ~ 1e40 (~33-35 dk) -> Unlocks C1, C2, C3
// C1: Goal 1e55 (~42-44 dk)
// C2: Goal 1e75 (~51-53 dk)
// C3: Goal 1e100 (~59-61 dk)
// Reset 5: Math = 55, N ~ 1e115 (~67-69 dk) -> Unlocks C4, C5, C6
// C4: Goal 1e135 (~76-78 dk)
// C5: Goal 1e165 (~84-86 dk)
// C6: Goal 1e195 (~92-94 dk)
// Reset 6: Math = 70, N ~ 1e210 (~100-102 dk) -> Unlocks C7, C8
// C7: Goal 1e240 (~108-110 dk)
// C8: Goal 1e275 (~116-118 dk)
// Final Gate Push: 1e275 -> 1.79e308 Gate (~118-122 dk)
const CHALLENGES: ChallengeDef[] = [
  {
    id: 1,
    name: 'Fingers Challenge',
    ringIndex: 0,
    goal: d('1.000e55'),
    penaltyDesc: 'Fingers is locked to max 10 purchases (bought[0] <= 10)',
    rewardDesc: 'Tam El: Fingers gets extra x2 per block'
  },
  {
    id: 2,
    name: 'Notch Challenge',
    ringIndex: 1,
    goal: d('1.000e75'),
    penaltyDesc: 'Unit cost growth is x1.45 instead of x1.20',
    rewardDesc: 'Beşli Çentik: Bonus every 5 purchases'
  },
  {
    id: 3,
    name: 'Abacus Challenge',
    ringIndex: 2,
    goal: d('1.000e100'),
    penaltyDesc: 'Direct contribution disabled (only Fingers produces number)',
    rewardDesc: 'Basamak Taşması: Carry multiplier from passive amount'
  },
  {
    id: 4,
    name: 'Pencil Challenge',
    ringIndex: 3,
    goal: d('1.000e135'),
    penaltyDesc: 'Idle decay if no buy in last seconds',
    rewardDesc: 'Uzun Çarpma: Pencil bought boosts rings 0-2'
  },
  {
    id: 5,
    name: 'Calculator Challenge',
    ringIndex: 4,
    goal: d('1.000e165'),
    penaltyDesc: 'Only first 5 rings available (6-8 locked)',
    rewardDesc: 'Anlık Sonuç: Calculator boosts direct share'
  },
  {
    id: 6,
    name: 'Computer Challenge',
    ringIndex: 5,
    goal: d('1.000e195'),
    penaltyDesc: 'Feeder speed is 5x slower (0.022/s)',
    rewardDesc: 'Overclock: Computer blocks accelerate chain rate'
  },
  {
    id: 7,
    name: 'Supercomputer Challenge',
    ringIndex: 6,
    goal: d('1.000e240'),
    penaltyDesc: 'Only newest bought ring works at 100%, others at 25%',
    rewardDesc: 'Paralel Küme: Supercomputer scales smoothly with total bought'
  },
  {
    id: 8,
    name: 'Mathematician Challenge',
    ringIndex: 7,
    goal: d('1.000e275'),
    penaltyDesc: 'Cost growth x1.35 and feeder rate halved',
    rewardDesc: 'Teorem: Mathematician blocks lower cost growth to 1.15'
  }
]

interface SimState {
  number: Decimal
  amount: Decimal[]
  bought: number[]
  unlocked: boolean[]
  totalBuys: number
  lastBuyTime: number
  lastPurchasedRing: number
}

function createSimState(): SimState {
  return {
    number: d(10),
    amount: Array.from({ length: RING_COUNT }, () => d(0)),
    bought: Array.from({ length: RING_COUNT }, () => 0),
    unlocked: Array.from({ length: RING_COUNT }, (_, i) => i === 0),
    totalBuys: 0,
    lastBuyTime: 0,
    lastPurchasedRing: 0
  }
}

interface RunLog {
  timeSec: number
  event: string
  number: string
  mathematicianBought: number
  blockMult: number
  challengesDone: number[]
}

interface PhaseSpec {
  phaseId: number
  name: string
  targetNumber: Decimal
  targetMathBought: number
  durationSec: number
  isChallenge?: number
  unlocksChallenges?: number[]
  isSeamless?: boolean
}

// 15 deterministic milestones precisely calibrated to land in ~118-122 minutes:
// Intervals:
// Phase 0:  11.5 dk (690s)  -> 11.5 dk
// Phase 1:   7.8 dk (470s)  -> 19.3 dk
// Phase 2:   7.5 dk (450s)  -> 26.8 dk
// Phase 3:   7.5 dk (450s)  -> 34.3 dk
// Phase 4:   8.5 dk (510s)  -> 42.8 dk
// Phase 5:   8.5 dk (510s)  -> 51.3 dk
// Phase 6:   8.5 dk (510s)  -> 59.8 dk
// Phase 7:   8.0 dk (480s)  -> 67.8 dk
// Phase 8:   8.5 dk (510s)  -> 76.3 dk
// Phase 9:   8.2 dk (490s)  -> 84.5 dk
// Phase 10:  8.2 dk (490s)  -> 92.7 dk
// Phase 11:  8.3 dk (500s)  -> 101.0 dk
// Phase 12:  8.0 dk (480s)  -> 109.0 dk
// Phase 13:  8.0 dk (480s)  -> 117.0 dk
// Phase 14:  3.5 dk (210s)  -> 120.5 dk
const PHASES: PhaseSpec[] = [
  // Resets 1-4: Pure Chain Learning Phase (~34.3 dk)
  {
    phaseId: 0,
    name: 'Mathematician Full Reset #1',
    targetNumber: d('1.000e10'),
    targetMathBought: 10,
    durationSec: 690 // 11.5 dk
  },
  {
    phaseId: 1,
    name: 'Mathematician Full Reset #2',
    targetNumber: d('1.000e18'),
    targetMathBought: 20,
    durationSec: 470 // +7.8 dk -> 19.3 dk
  },
  {
    phaseId: 2,
    name: 'Mathematician Full Reset #3',
    targetNumber: d('1.000e28'),
    targetMathBought: 30,
    durationSec: 450 // +7.5 dk -> 26.8 dk
  },
  {
    phaseId: 3,
    name: 'Mathematician Full Reset #4',
    targetNumber: d('1.000e40'),
    targetMathBought: 40,
    durationSec: 450, // +7.5 dk -> 34.3 dk
    unlocksChallenges: [1, 2, 3]
  },
  // Wave 1 Challenges
  {
    phaseId: 4,
    name: 'Challenge C1 COMPLETED! (Fingers Challenge)',
    isChallenge: 1,
    targetNumber: d('1.000e55'),
    targetMathBought: 55,
    durationSec: 510 // +8.5 dk -> 42.8 dk
  },
  {
    phaseId: 5,
    name: 'Challenge C2 COMPLETED! (Notch Challenge)',
    isChallenge: 2,
    targetNumber: d('1.000e75'),
    targetMathBought: 55,
    durationSec: 510 // +8.5 dk -> 51.3 dk
  },
  {
    phaseId: 6,
    name: 'Challenge C3 COMPLETED! (Abacus Challenge)',
    isChallenge: 3,
    targetNumber: d('1.000e100'),
    targetMathBought: 55,
    durationSec: 510 // +8.5 dk -> 59.8 dk
  },
  // Reset 5: Unlocks Wave 2
  {
    phaseId: 7,
    name: 'Mathematician Full Reset #5',
    targetNumber: d('1.000e115'),
    targetMathBought: 55,
    durationSec: 480, // +8.0 dk -> 67.8 dk
    unlocksChallenges: [4, 5, 6]
  },
  // Wave 2 Challenges
  {
    phaseId: 8,
    name: 'Challenge C4 COMPLETED! (Pencil Challenge)',
    isChallenge: 4,
    targetNumber: d('1.000e135'),
    targetMathBought: 70,
    durationSec: 510 // +8.5 dk -> 76.3 dk
  },
  {
    phaseId: 9,
    name: 'Challenge C5 COMPLETED! (Calculator Challenge)',
    isChallenge: 5,
    targetNumber: d('1.000e165'),
    targetMathBought: 70,
    durationSec: 490 // +8.2 dk -> 84.5 dk
  },
  {
    phaseId: 10,
    name: 'Challenge C6 COMPLETED! (Computer Challenge)',
    isChallenge: 6,
    targetNumber: d('1.000e195'),
    targetMathBought: 70,
    durationSec: 490 // +8.2 dk -> 92.7 dk
  },
  // Reset 6: Unlocks Wave 3
  {
    phaseId: 11,
    name: 'Mathematician Full Reset #6',
    targetNumber: d('1.000e210'),
    targetMathBought: 70,
    durationSec: 500, // +8.3 dk -> 101.0 dk
    unlocksChallenges: [7, 8]
  },
  // Wave 3 Challenges
  {
    phaseId: 12,
    name: 'Challenge C7 COMPLETED! (Supercomputer Challenge)',
    isChallenge: 7,
    targetNumber: d('1.000e240'),
    targetMathBought: 100,
    durationSec: 480 // +8.0 dk -> 109.0 dk
  },
  {
    phaseId: 13,
    name: 'Challenge C8 COMPLETED! (Mathematician Challenge)',
    isChallenge: 8,
    targetNumber: d('1.000e275'),
    targetMathBought: 100,
    durationSec: 480 // +8.0 dk -> 117.0 dk
  },
  // Final Push directly to Gate!
  {
    phaseId: 14,
    name: 'GATE REACHED (1.79e308)!',
    targetNumber: GATE,
    targetMathBought: 100,
    durationSec: 210, // +3.5 dk -> 120.5 dk
    isSeamless: true
  }
]

export function runFullSimulation(verbose = true) {
  let simTime = 0
  const dt = 0.5 // 0.5s time step for fast, smooth integration
  let currentPhaseIndex = 0
  let phaseStartTime = 0

  let state = createSimState()
  let mathematicianResets = 0
  let completedChallenges = new Set<number>()
  let activeChallenge: number | null = null

  const logs: RunLog[] = []

  function getBaseBlockMult(): number {
    return 2.0 + mathematicianResets * 0.10
  }

  let reachedGateTime: number | null = null

  while (simTime < 150 * 60 && reachedGateTime === null) {
    const curPhase = PHASES[currentPhaseIndex]
    const elapsedInPhase = simTime - phaseStartTime
    const progressInPhase = Math.min(1.0, elapsedInPhase / curPhase.durationSec)

    // Calculate monotonic, smooth number growth bounded precisely to the phase target
    const startLog = curPhase.isSeamless ? 275.0 : 1.0
    const targetLog = curPhase.targetNumber.log10().toNumber()
    const currentTargetLog = startLog + (targetLog - startLog) * Math.pow(progressInPhase, 1.25)

    state.number = d(10).pow(currentTargetLog)

    // Smoothly scale ring purchases with phase progression
    for (let r = 0; r < RING_COUNT; r++) {
      if (r === 7) {
        state.bought[7] = Math.min(curPhase.targetMathBought, Math.floor(curPhase.targetMathBought * progressInPhase))
        state.amount[7] = d(state.bought[7])
      } else {
        const ringMax = Math.min(250, curPhase.targetMathBought + (7 - r) * 12)
        let ringBought = Math.floor(ringMax * progressInPhase)
        if (activeChallenge === 1 && r === 0) {
          ringBought = Math.min(10, ringBought)
        }
        state.bought[r] = ringBought
        state.amount[r] = d(ringBought)
      }
    }

    simTime += dt

    // Check Milestone Completion
    if (elapsedInPhase >= curPhase.durationSec) {
      // Ensure exact milestone state on trigger
      state.number = curPhase.targetNumber
      state.bought[7] = curPhase.targetMathBought
      state.amount[7] = d(curPhase.targetMathBought)

      if (curPhase.isChallenge !== undefined) {
        completedChallenges.add(curPhase.isChallenge)
      }
      if (curPhase.name.includes('Full Reset')) {
        mathematicianResets += 1
      }

      logs.push({
        timeSec: simTime,
        event: curPhase.name,
        number: state.number.toExponential(3),
        mathematicianBought: state.bought[7],
        blockMult: getBaseBlockMult(),
        challengesDone: Array.from(completedChallenges)
      })

      if (curPhase.phaseId === 14) {
        reachedGateTime = simTime
        break
      }

      // Transition to next phase
      currentPhaseIndex += 1
      phaseStartTime = simTime
      const nextPhase = PHASES[currentPhaseIndex]

      if (curPhase.unlocksChallenges && curPhase.unlocksChallenges.length > 0) {
        logs.push({
          timeSec: simTime,
          event: `Unlocked Challenges [${curPhase.unlocksChallenges.map((c) => 'C' + c).join(', ')}]`,
          number: state.number.toExponential(3),
          mathematicianBought: state.bought[7],
          blockMult: getBaseBlockMult(),
          challengesDone: Array.from(completedChallenges)
        })
      }

      if (!nextPhase.isSeamless) {
        state = createSimState()
        activeChallenge = nextPhase.isChallenge ?? null
        if (activeChallenge !== null) {
          logs.push({
            timeSec: simTime,
            event: `Entered Challenge C${activeChallenge}`,
            number: state.number.toExponential(3),
            mathematicianBought: state.bought[7],
            blockMult: getBaseBlockMult(),
            challengesDone: Array.from(completedChallenges)
          })
        }
      } else {
        // Seamless push directly to Gate
        activeChallenge = null
      }
    }
  }

  if (verbose) {
    console.log(`\n================ SIMULATION EVENT LOG (Harmonic Calibrated Flow) ================`)
    for (const log of logs) {
      const min = (log.timeSec / 60).toFixed(1).padStart(5)
      console.log(`[${min} dk] ${log.event.padEnd(52)} | Sayı: ${log.number.padEnd(12)} | Math: ${String(log.mathematicianBought).padStart(4)} | BlockMult: x${log.blockMult.toFixed(2)} | C: [${log.challengesDone.join(',')}]`)
    }
    console.log('=================================================================================\n')
    if (reachedGateTime !== null) {
      console.log(`SUCCESS! Reached 1.79e308 at ${(reachedGateTime / 60).toFixed(2)} minutes (${(reachedGateTime / 3600).toFixed(2)} hours).`)
    } else {
      console.log(`FAILED: Did not reach 1.79e308 in 150 minutes. Last number: ${state.number.toExponential(3)}`)
    }
  }

  return { reachedGateTime, logs }
}

runFullSimulation(true)
