import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import {
  BLOCK_MULT,
  BOOST_MULT,
  CHALLENGE_BOOST_GATE,
  CHALLENGE_FEED_MULT,
  GATE,
  GATE_LOG10
} from './tuning'
import {
  advance,
  applyBoost,
  blockFactor,
  boostMultiplier,
  boostRequirement,
  checkGate,
  createNumberState,
  manualTap,
  maxAll,
  numberPerSecond,
  type NumberState
} from './economy'
import {
  CHALLENGES,
  challengeById,
  challengeGoalLog,
  completeChallengeIfReady,
  enterChallenge,
  isChallengeUnlocked,
  nextChallenge
} from './challenges'

/**
 * RUNG 1 — HEADLESS INTEGRATION TEST (gerçek src motoru, ADR-0086 reset+boost).
 *
 * Bağlayıcı kaynak: brain/decisions/0086-run-reset-and-boost.md.
 * Kalibrasyon: brain/scratchpad/rung1-boost-reset/ (task-3, 2026-10-31).
 *
 * Ölçülen (dt=1s, gerçek harness, boost kapısı 4):
 *   hedeflenen yol (4..11 boost hedefli)   181.0 dk · 11 boost · C1..C8 17/8/8/9/9/19/11/14 dk
 *   boost-only (optimal k)                 672.6 dk · no-meta base 1031.9 dk
 *   boost kapısı <4                        hiçbir mücadele açılmaz (ADR-0087)
 *
 * Bu dosya motoru KOPYALAMAZ; src/game/number/*.ts'i doğrudan çağırır. Testte
 * dt=2 kullanılır (120 s testTimeout): süreler dt=1 ölçümünden birkaç dk sapabilir,
 * bu yüzden eşikler bant olarak yazılır.
 */

const STEP_SECONDS = 2
const TAPS_PER_SEC = 2

interface Policy {
  enterChallenges: boolean
  /** C_i'ye girmeden önce istenen KUMULATİF boost sayısı. */
  boostTargets: number[]
  maxBoosts: number
}

interface PhaseResult {
  id: string
  entryMin: number
  endMin: number
  completed: boolean
  entryBoost: number
}

interface RunResult {
  gateMin: number | null
  totalMin: number
  finalLog10: number
  boostCount: number
  boostMinutes: number[]
  phases: PhaseResult[]
  completed: string[]
  gateTransitions: number
  nanSeen: boolean
}

interface Options {
  policy: Policy
  maxMinutes: number
  preCompleted?: string[]
  preBoost?: number
  stopAfterBoost?: number
}

function log10(state: NumberState): number {
  if (state.number.lte(0)) return -Infinity
  return state.number.log10().toNumber()
}

/** Depo tick sırası: advance → açılış tıkı → complete → enter/boost → maxAll → gate. */
function run(opts: Options): RunResult {
  const state = createNumberState()
  if (opts.preCompleted) state.challenges.completed = [...opts.preCompleted]
  if (opts.preBoost) state.boostCount = opts.preBoost

  const phases: PhaseResult[] = []
  const boostMinutes: number[] = []
  let t = 0
  let tapAcc = 0
  let gateMin: number | null = null
  let gateTransitions = 0
  let nanSeen = false
  let open: PhaseResult | null = null
  const maxSeconds = opts.maxMinutes * 60

  const targetForNext = (): number => {
    if (!opts.policy.enterChallenges) return Infinity
    const next = nextChallenge(state)
    if (!next) return state.boostCount
    return opts.policy.boostTargets[CHALLENGES.indexOf(next)] ?? 0
  }

  while (t < maxSeconds) {
    state.playTime = t
    advance(state, STEP_SECONDS)
    t += STEP_SECONDS

    // Açılış: her reset sonrası ilk Fingers alımına kadar +1.
    if (state.rings[0].bought === 0 && TAPS_PER_SEC > 0) {
      tapAcc += STEP_SECONDS
      while (tapAcc >= 1 / TAPS_PER_SEC) {
        tapAcc -= 1 / TAPS_PER_SEC
        manualTap(state)
      }
    }

    const finished = completeChallengeIfReady(state)
    if (finished && open !== null && open.id === finished.id) {
      open.endMin = t / 60
      open.completed = true
      phases.push(open)
      open = null
    }

    if (state.challenges.active === null) {
      const next = nextChallenge(state)
      const target = targetForNext()
      const unlocked = next !== null && isChallengeUnlocked(state, next)
      if (opts.policy.enterChallenges && next !== null && unlocked && state.boostCount >= target) {
        if (enterChallenge(state, next.id)) {
          open = {
            id: next.id,
            entryMin: t / 60,
            endMin: t / 60,
            completed: false,
            entryBoost: state.boostCount
          }
        }
      } else if (state.boostCount < opts.policy.maxBoosts && state.boostCount < target && applyBoost(state)) {
        boostMinutes.push(t / 60)
      }
    }

    maxAll(state)
    if (opts.stopAfterBoost !== undefined && state.boostCount >= opts.stopAfterBoost) break

    if (checkGate(state)) {
      gateTransitions++
      gateMin = t / 60
      break
    }
    if (state.number.isNan() || !Number.isFinite(log10(state))) nanSeen = true
    if (nanSeen) break
  }

  if (open !== null) {
    open.endMin = t / 60
    phases.push(open)
  }

  return {
    gateMin,
    totalMin: t / 60,
    finalLog10: log10(state),
    boostCount: state.boostCount,
    boostMinutes,
    phases,
    completed: [...state.challenges.completed],
    gateTransitions,
    nanSeen
  }
}

const intendedPolicy: Policy = {
  enterChallenges: true,
  boostTargets: [4, 5, 6, 7, 8, 9, 10, 11],
  maxBoosts: 99
}
const boostOnlyPolicy: Policy = { enterChallenges: false, boostTargets: [], maxBoosts: 8 }

/** Bir tam koşu paylaşılır: iki politika da aynı dosyada bir kez ölçülür. */
let cachedIntended: RunResult | null = null
function intended(): RunResult {
  if (cachedIntended === null) cachedIntended = run({ policy: intendedPolicy, maxMinutes: 360 })
  return cachedIntended
}
let cachedBoostOnly: RunResult | null = null
function boostOnly(): RunResult {
  if (cachedBoostOnly === null) cachedBoostOnly = run({ policy: boostOnlyPolicy, maxMinutes: 900 })
  return cachedBoostOnly
}

describe('rung 1 — fresh state, reset and boost contract', () => {
  it('starts at 10 with 8 sequential challenges and the calibrated constants', () => {
    const state = createNumberState()
    expect(state.number.toString()).toBe('10')
    expect(state.boostCount).toBe(0)
    expect(state.challenges.active).toBeNull()
    expect(state.challenges.completed).toEqual([])
    expect(state.gateReached).toBe(false)
    expect(CHALLENGES).toHaveLength(8)
    expect(CHALLENGES.map((def) => def.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'])

    // ADR-0086 kalibrasyonu (task-3).
    expect(BLOCK_MULT).toBe(5.3)
    expect(BOOST_MULT).toBe(1.8)
    expect(CHALLENGE_FEED_MULT).toBe(0.2)
    expect(blockFactor(0).toNumber()).toBe(1)
    expect(blockFactor(9).toNumber()).toBe(1)
    expect(blockFactor(10).toNumber()).toBeCloseTo(5.3, 12)
    expect(blockFactor(20).toNumber()).toBeCloseTo(5.3 ** 2, 9)

    // Mutlak hedef zinciri: her mücadelenin kilidi öncekinin hedefidir (C1 = 1e10).
    expect(CHALLENGES[0].unlockLog10).toBe(10)
    for (let i = 1; i < CHALLENGES.length; i++) {
      expect(CHALLENGES[i].unlockLog10).toBeCloseTo(CHALLENGES[i - 1].goalLog10, 12)
      expect(CHALLENGES[i].goalLog10).toBeGreaterThan(CHALLENGES[i].unlockLog10)
    }
  })

  it('entering a challenge resets number + chain + unlocks but keeps boost and rewards', () => {
    const state = createNumberState()
    state.bestNumber = D('1e60')
    state.number = D('1e60')
    state.boostCount = CHALLENGE_BOOST_GATE
    state.challenges.completed = ['C1']
    state.totalBuys = 120
    state.rings[7].bought = 40
    state.rings[0].amount = D(500)
    state.unlocked = state.unlocked.map(() => true)
    const best = state.bestNumber.toString()

    expect(enterChallenge(state, 'C2')).toBe(true)
    expect(state.number.toString()).toBe('10')
    expect(state.rings.every((ring) => ring.amount.eq(0) && ring.bought === 0)).toBe(true)
    expect(state.unlocked).toEqual([true, false, false, false, false, false, false, false])
    expect(state.boostCount).toBe(CHALLENGE_BOOST_GATE)
    expect(state.challenges.completed).toEqual(['C1'])
    expect(state.bestNumber.toString()).toBe(best)
    expect(state.challenges.goalLog10).toBeCloseTo(challengeById('C2')!.goalLog10, 12)
    expect(challengeGoalLog(CHALLENGES[1], 999)).toBeCloseTo(CHALLENGES[1].goalLog10, 12)
  })

  it('enforces sequence and keeps unlocks readable through bestNumber', () => {
    const state = createNumberState()
    state.number = D('1e70')
    state.bestNumber = D('1e70')
    state.boostCount = CHALLENGE_BOOST_GATE
    // C1 is the only enterable challenge, even at 1e70.
    expect(enterChallenge(state, 'C2')).toBe(false)
    expect(enterChallenge(state, 'C1')).toBe(true)
    expect(state.number.toString()).toBe('10')
    // Current number is 10 again; the unlock check must still see 1e70.
    expect(isChallengeUnlocked(state, CHALLENGES[1])).toBe(true)
  })

  it('buying a boost resets the run, increments the counter and preserves rewards', () => {
    const state = createNumberState()
    state.unlocked[7] = true
    state.rings[7].bought = boostRequirement(0)
    state.number = D('1e100')
    state.challenges.completed = ['C1', 'C2']
    expect(boostRequirement(0)).toBe(50)
    expect(boostRequirement(1)).toBe(68)
    expect(boostRequirement(2)).toBe(92)
    expect(boostMultiplier(1).toNumber()).toBeCloseTo(1.8, 12)

    expect(applyBoost(state)).toBe(true)
    expect(state.boostCount).toBe(1)
    expect(state.number.toString()).toBe('10')
    expect(state.unlocked).toEqual([true, false, false, false, false, false, false, false])
    expect(state.challenges.completed).toEqual(['C1', 'C2'])
  })
})

describe('rung 1 — intended path (boost + 8 challenges)', () => {
  it('reaches the gate in 160-230 minutes with all 8 challenges and no NaN', () => {
    const result = intended()
    expect(result.nanSeen).toBe(false)
    expect(result.gateMin).not.toBeNull()
    expect(result.gateMin as number).toBeGreaterThanOrEqual(160)
    expect(result.gateMin as number).toBeLessThanOrEqual(230)
    expect(result.completed).toEqual(CHALLENGES.map((def) => def.id))
    expect(result.phases).toHaveLength(8)
    expect(result.phases.every((phase) => phase.completed)).toBe(true)
    expect(result.gateTransitions).toBe(1)
    expect(result.finalLog10).toBeGreaterThanOrEqual(GATE_LOG10 - 1e-6)
  })

  it('keeps every challenge run inside the sanity band', () => {
    for (const phase of intended().phases) {
      const duration = phase.endMin - phase.entryMin
      expect(duration, phase.id).toBeGreaterThanOrEqual(6)
      expect(duration, phase.id).toBeLessThanOrEqual(40)
    }
    // C1 is the tutorial wall: it is not skipped, it is the longest early run.
    const c1 = intended().phases[0]
    expect(c1.id).toBe('C1')
    expect(c1.endMin - c1.entryMin).toBeGreaterThanOrEqual(10)
  })

  it('chooses boosts on the optimal path and farms the first one before C1', () => {
    const result = intended()
    expect(result.boostCount).toBeGreaterThanOrEqual(9)
    expect(result.boostMinutes.length).toBe(result.boostCount)
    expect(result.boostMinutes[0]).toBeLessThan(45)
    expect(intendedPolicy.boostTargets).toEqual([...intendedPolicy.boostTargets].sort((a, b) => a - b))
  })

  it('latches the gate exactly once and never fires twice', () => {
    const result = intended()
    const state = createNumberState()
    state.number = GATE
    expect(checkGate(state)).toBe(true)
    expect(checkGate(state)).toBe(false)
    expect(result.gateTransitions).toBe(1)
  })
})

describe('rung 1 — boost-only vs intended', () => {
  it('boost-only is dramatically slower than the intended path', () => {
    const intendedMinutes = intended().gateMin as number
    const boost = boostOnly()
    expect(boost.gateMin).not.toBeNull()
    expect(boost.gateMin as number).toBeGreaterThanOrEqual(540)
    expect(boost.gateMin as number).toBeGreaterThan(intendedMinutes * 2.5)
    expect(boost.completed).toEqual([])
  })

  it('never opens a challenge below the 4-boost gate, even past the number unlock', () => {
    const blocked = run({
      // C1 hedefi 4; maxBoosts 3 onu hiçbir zaman karşılayamaz.
      policy: { enterChallenges: true, boostTargets: [CHALLENGE_BOOST_GATE, 0, 0, 0, 0, 0, 0, 0], maxBoosts: 3 },
      maxMinutes: 90
    })
    expect(blocked.boostCount).toBe(3)
    expect(blocked.finalLog10).toBeGreaterThan(CHALLENGES[0].unlockLog10)
    expect(blocked.phases).toHaveLength(0)
    expect(blocked.completed).toEqual([])
  })

  it('opens C1 exactly at the 4-boost gate', () => {
    const state = createNumberState()
    state.bestNumber = D('1e11')
    for (let n = 0; n < CHALLENGE_BOOST_GATE; n++) {
      state.boostCount = n
      expect(isChallengeUnlocked(state, CHALLENGES[0])).toBe(false)
      expect(enterChallenge(state, 'C1')).toBe(false)
    }
    state.boostCount = CHALLENGE_BOOST_GATE
    expect(isChallengeUnlocked(state, CHALLENGES[0])).toBe(true)
    expect(enterChallenge(state, 'C1')).toBe(true)
  })

  it('a fresh state produces nothing, so the opening tap is the only income', () => {
    expect(numberPerSecond(createNumberState()).toNumber()).toBe(0)
  })
})
