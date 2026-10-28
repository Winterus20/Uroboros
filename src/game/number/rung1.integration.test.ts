import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import { BLOCK_MULT, CHALLENGE_FEED_MULT, GATE, GATE_LOG10 } from './tuning'
import {
  advance,
  blockFactor,
  buyRing,
  checkGate,
  createNumberState,
  feedMultiplier,
  manualTap,
  maxAll,
  numberPerSecond,
  ringGainPerSecond,
  ringProductionMultiplier,
  type NumberState
} from './economy'
import {
  CHALLENGES,
  challengeById,
  challengeGoalLog,
  completeChallengeIfReady,
  enterChallenge,
  exitChallenge,
  isChallengeUnlocked,
  nextChallenge
} from './challenges'

/**
 * RUNG 1 v2 — HEADLESS INTEGRATION TEST (the real src engine).
 *
 * Binding sources: brain/scratchpad/rung-1-implementation-contract.md §1-3,
 * brain/research/rung-1-plan-2026-10-27.md §11,
 * brain/research/rung-1-190-calibration-2026-10-27.md.
 *
 * This file does NOT copy the engine: it calls src/game/number/*.ts directly.
 * The reference engine under brain/scratchpad is the origin of the calibration,
 * never the subject of the assertion. What is asserted is the SHAPE of the run:
 * no resets, 8 reset-free overlays, the C8 finisher, the 1.79e308 gate.
 * 188.8 minutes is NOT the target here — 150-230 minutes is the whole claim.
 *
 * Deterministic player policy (the maxall arm of the calibration):
 *   - every 0.5 s: rings 7..0, buy in blocks of 10 while affordable (maxAll)
 *   - +2 taps/s during the opening (the only income that funds the first ring)
 *   - step size 0.5 s -> 240 minutes = 28,800 steps
 */

/** Simulation step — same resolution as the calibration (0.5 s). */
const STEP_SECONDS = 0.5

/** Opening tap rate; the game starts at 10 and the first ring costs 25. */
const TAPS_PER_SEC = 2

/**
 * Opening taps stop once the first Fingers block is bought.
 *
 * The opening is the one stretch where the chain cannot feed itself: production is
 * exactly zero until a ring exists, so +1 is the only income. Ten Fingers cost
 * 25 * (1.2^10 - 1) / 0.2 ~= 649, i.e. ~325 s of tapping at 2 taps/s. A fixed
 * shorter window leaves totalBuys at 0 and the whole run stays frozen at 10.
 */
function openingTapDone(state: NumberState): boolean {
  return state.rings[0].bought > 0
}

/** Safety cap — the target is 188.8 min, 240 leaves generous headroom. */
const RUN_CAP_MINUTES = 240

/** C1 plan goal (log10) — contract §1 table. */
const C1_GOAL_LOG10 = 33.242

/** Opening number; falling back to this would mean a reset happened. */
const FRESH_NUMBER = 10

interface PhaseRecord {
  id: string
  entryMinute: number
  endMinute: number
  entryLog10: number
  goalLog10: number
  completed: boolean
}

interface RunReport {
  state: NumberState
  minutes: number
  gateMinute: number | null
  gateTransitions: number
  phases: PhaseRecord[]
  unbackedDrops: number
  boughtRegressions: number
  bestRegressions: number
  freshResets: number
  nanSeen: boolean
  challengeEntries: number
}

interface RunOptions {
  minutes: number
  autoEnter?: boolean
  stopAfter?: string
}

function log10Of(value: { log10(): { toNumber(): number } }): number {
  return value.log10().toNumber()
}

/** Decimals are immutable; sharing references is safe (see core/math.ts). */
function cloneState(state: NumberState): NumberState {
  return {
    ...state,
    rings: state.rings.map((ring) => ({ amount: ring.amount, bought: ring.bought })),
    unlocked: [...state.unlocked],
    challenges: { ...state.challenges, completed: [...state.challenges.completed] }
  }
}

/**
 * Play the calibrated run on the real engine.
 *
 * Step order matches the reference engine: advance -> tap -> complete -> enter ->
 * buy -> gate. completeChallengeIfReady and checkGate are called HERE because
 * contract §3 keeps them out of advance: the pure economic step never ends a
 * challenge, the store raises that event. The test therefore replays the store's
 * tick order rather than inventing one.
 */
function runCalibrated(opts: RunOptions): RunReport {
  const autoEnter = opts.autoEnter ?? true
  const state = createNumberState()
  const phases: PhaseRecord[] = []

  let t = 0
  let tapsIssued = 0
  let gateMinute: number | null = null
  let gateTransitions = 0
  let challengeEntries = 0
  let unbackedDrops = 0
  let boughtRegressions = 0
  let bestRegressions = 0
  let freshResets = 0
  let nanSeen = false
  let escapedOpening = false

  let prevNumber = state.number
  let prevBest = state.bestNumber
  const prevBought = state.rings.map((ring) => ring.bought)
  let open: { id: string; entryMinute: number; entryLog10: number; goalLog10: number } | null = null

  const stepCount = Math.round((opts.minutes * 60) / STEP_SECONDS)
  for (let step = 0; step < stepCount; step++) {
    state.playTime = t
    advance(state, STEP_SECONDS)
    t += STEP_SECONDS

    // Opening taps: deterministic, and they stop at the first purchase.
    if (!openingTapDone(state)) {
      const tapTarget = Math.floor(t * TAPS_PER_SEC + 1e-9)
      while (tapsIssued < tapTarget) {
        manualTap(state)
        tapsIssued++
      }
    }

    const finished = completeChallengeIfReady(state)
    if (finished) {
      if (open !== null && open.id === finished.id) {
        phases.push({
          id: open.id,
          entryMinute: open.entryMinute,
          endMinute: t / 60,
          entryLog10: open.entryLog10,
          goalLog10: open.goalLog10,
          completed: true
        })
        open = null
      }
      if (opts.stopAfter === finished.id) break
    }

    if (autoEnter && state.challenges.active === null) {
      const next = nextChallenge(state)
      if (next !== null && isChallengeUnlocked(state, next) && enterChallenge(state, next.id)) {
        challengeEntries++
        open = {
          id: next.id,
          entryMinute: t / 60,
          entryLog10: state.challenges.entryLog10 ?? 0,
          goalLog10: state.challenges.goalLog10 ?? 0
        }
      }
    }

    const buysBefore = state.totalBuys
    maxAll(state)
    const buys = state.totalBuys - buysBefore

    // --- invariants -------------------------------------------------
    if (state.number.lt(prevNumber) && buys === 0) unbackedDrops++
    if (state.bestNumber.lt(prevBest)) bestRegressions++
    for (let i = 0; i < state.rings.length; i++) {
      if (state.rings[i].bought < prevBought[i]) boughtRegressions++
      prevBought[i] = state.rings[i].bought
    }
    if (!escapedOpening && state.number.gt(D(1000))) escapedOpening = true
    if (escapedOpening && state.number.lte(D(FRESH_NUMBER))) freshResets++
    if (state.number.isNan() || !Number.isFinite(log10Of(state.number))) nanSeen = true

    prevNumber = state.number
    prevBest = state.bestNumber

    if (checkGate(state)) {
      gateTransitions++
      if (gateMinute === null) gateMinute = t / 60
    }
    if (gateMinute !== null) break
    if (nanSeen) break
  }

  if (open !== null) {
    phases.push({
      id: open.id,
      entryMinute: open.entryMinute,
      endMinute: t / 60,
      entryLog10: open.entryLog10,
      goalLog10: open.goalLog10,
      completed: false
    })
  }

  return {
    state,
    minutes: t / 60,
    gateMinute,
    gateTransitions,
    phases,
    unbackedDrops,
    boughtRegressions,
    bestRegressions,
    freshResets,
    nanSeen,
    challengeEntries
  }
}

/** One full run is shared by the suites below to keep the runtime budget. */
let cachedFullRun: RunReport | null = null
function fullRun(): RunReport {
  if (cachedFullRun === null) cachedFullRun = runCalibrated({ minutes: RUN_CAP_MINUTES })
  return cachedFullRun
}

/** C1 scenario: the run stops the moment C1 completes. */
let cachedC1Run: RunReport | null = null
function c1Run(): RunReport {
  if (cachedC1Run === null) cachedC1Run = runCalibrated({ minutes: RUN_CAP_MINUTES, stopAfter: 'C1' })
  return cachedC1Run
}

describe('rung 1 v2 — fresh state and the challenge table', () => {
  it('starts at 10 with no active challenge and exactly 8 challenges', () => {
    const state = createNumberState()
    expect(state.number.toString()).toBe('10')
    expect(state.challenges.active).toBeNull()
    expect(state.challenges.completed).toEqual([])
    expect(state.challenges.entryLog10).toBeNull()
    expect(state.challenges.goalLog10).toBeNull()
    expect(state.gateReached).toBe(false)
    expect(state.tanim).toBe(0)
    expect(CHALLENGES).toHaveLength(8)
    expect(CHALLENGES.map((def) => def.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'])
    // The v2 non-negotiables live in tuning, and every def must be well formed.
    expect(BLOCK_MULT).toBe(5.5)
    expect(CHALLENGE_FEED_MULT).toBe(0.2)
    for (const def of CHALLENGES) {
      expect(def.delta).toBe(2)
      expect(Number.isFinite(def.goalLog10)).toBe(true)
      expect(def.growth).toBeGreaterThan(1)
      expect(challengeById(def.id)).toBe(def)
    }
    // The B ladder is what makes the block multiplier a real multiplier.
    expect(blockFactor(0).toNumber()).toBe(1)
    expect(blockFactor(9).toNumber()).toBe(1)
    expect(blockFactor(10).toNumber()).toBe(5.5)
    expect(blockFactor(20).toNumber()).toBeCloseTo(5.5 ** 2, 6)
  })

  it('unlocks C1 at 1e10 and entering it changes no number, no bought value, no block multiplier', () => {
    const state = createNumberState()
    const c1 = challengeById('C1')
    expect(c1).not.toBeNull()

    // Just below the rung: not yet available.
    state.number = D('1e9')
    expect(isChallengeUnlocked(state, c1!)).toBe(false)

    // At 1e10 the row opens, and only the row.
    state.number = D('1e10')
    expect(isChallengeUnlocked(state, c1!)).toBe(true)
    expect(nextChallenge(state)?.id).toBe('C1')

    // Give the run some real holdings so the C1 cap has something to preserve.
    state.rings[0].bought = 30
    state.rings[0].amount = D('1e4')
    const before = cloneState(state)
    const beforePerSecond = numberPerSecond(state).toString()
    const beforeBlock = blockFactor(state.rings[0].bought).toString()

    expect(enterChallenge(state, 'C1')).toBe(true)

    // The overlay is an overlay: nothing is reset, nothing is refunded.
    expect(state.number.toString()).toBe(before.number.toString())
    for (let i = 0; i < state.rings.length; i++) {
      expect(state.rings[i].bought).toBe(before.rings[i].bought)
      expect(state.rings[i].amount.toString()).toBe(before.rings[i].amount.toString())
    }
    expect(state.totalBuys).toBe(before.totalBuys)
    expect(blockFactor(state.rings[0].bought).toString()).toBe(beforeBlock)
    expect(state.unlocked).toEqual(before.unlocked)

    // The entry locks the goal and leaves the wallet alone.
    expect(state.challenges.active).toBe('C1')
    expect(state.challenges.entryLog10).toBeCloseTo(10, 6)

    // C1's penalty is a purchase cap (Fingers <= 10 bought) plus the global feed
    // cut. Production from the rings already owned is untouched — that is exactly
    // why the overlay needs no reset: nothing already earned is taken away.
    expect(numberPerSecond(state).toString()).toBe(beforePerSecond)
    expect(feedMultiplier(state)).toBeCloseTo(CHALLENGE_FEED_MULT, 9)
    expect(state.number.toString()).toBe(before.number.toString())

    // The cap is real: Fingers cannot exceed 10 bought while C1 is open.
    const capped = createNumberState()
    capped.number = D('1e10')
    capped.rings[0].bought = 10
    expect(enterChallenge(capped, 'C1')).toBe(true)
    const buysAtCap = buyRing(capped, 0, 10)
    expect(buysAtCap).toBe(0)
    expect(capped.rings[0].bought).toBe(10)

    // A second entry is refused while one overlay is active.
    expect(enterChallenge(state, 'C2')).toBe(false)

    exitChallenge(state)
    expect(state.challenges.active).toBeNull()
    expect(state.number.toString()).toBe(before.number.toString())
  })
})

describe('rung 1 v2 — C1 goal, completion and the fingers10 reward', () => {
  it('locks the C1 goal to max(1e33.242, entryLog10 + 2)', () => {
    const c1 = challengeById('C1')!
    // Entry below the plan goal: the plan goal wins.
    expect(challengeGoalLog(c1, 10)).toBeCloseTo(C1_GOAL_LOG10, 9)
    // Entry above it (anti-abuse): entry + delta wins instead.
    expect(challengeGoalLog(c1, 40)).toBeCloseTo(42, 9)

    const state = createNumberState()
    state.number = D('1e10')
    expect(enterChallenge(state, 'C1')).toBe(true)
    expect(state.challenges.goalLog10).toBeCloseTo(C1_GOAL_LOG10, 9)

    // Anti-abuse path on a real state.
    const late = createNumberState()
    late.number = D('1e40')
    expect(enterChallenge(late, 'C1')).toBe(true)
    expect(late.challenges.goalLog10).toBeCloseTo(42, 9)
  })

  it('completes C1 at its goal, keeps the number and activates fingers10', () => {
    const run = c1Run()
    const c1 = run.phases.find((phase) => phase.id === 'C1')
    expect(c1).toBeDefined()
    expect(c1!.completed).toBe(true)
    expect(run.state.challenges.completed).toContain('C1')
    expect(run.state.challenges.active).toBeNull()

    // Completion is at the locked goal, never below it.
    expect(log10Of(run.state.number)).toBeGreaterThanOrEqual(c1!.goalLog10 - 1e-9)
    expect(c1!.goalLog10).toBeCloseTo(Math.max(C1_GOAL_LOG10, c1!.entryLog10 + 2), 9)

    // The number survived completion: it never fell back to the opening.
    expect(run.freshResets).toBe(0)
    expect(log10Of(run.state.number)).toBeGreaterThan(C1_GOAL_LOG10 - 1)

    // fingers10: Fingers x10 AND feed x1.5. Compare the same state with and
    // without the reward by removing C1 from the completed ladder.
    const withReward = cloneState(run.state)
    const withoutReward = cloneState(run.state)
    withoutReward.challenges.completed = withoutReward.challenges.completed.filter((id) => id !== 'C1')

    // The reward is asserted in its own channels, not in aggregate numberPerSecond.
    //
    // Why: C1's penalty caps Fingers at 10 purchases, so by the time C1 completes
    // ring 0 produces ~2e-17 of the total (direct share from rings 1-7 dominates by
    // ~16 orders of magnitude). A x10 on 2e-17 of the total is below double
    // precision: the aggregate numberPerSecond is bit-identical with and without
    // the reward. Asserting an increase there would encode a rounding artefact
    // rather than the contract, and would break the moment ring 0's share shifts.
    // The contract's claim is 'Fingers production x10, feed x1.5' (section 1), and
    // those two channels are exactly what is measured here.
    const rewardedFingers = ringGainPerSecond(withReward, 0)
    const plainFingers = ringGainPerSecond(withoutReward, 0)
    expect(rewardedFingers.gt(plainFingers)).toBe(true)
    expect(rewardedFingers.div(plainFingers).toNumber()).toBeCloseTo(10, 9)
    expect(ringProductionMultiplier(withReward, 0) / ringProductionMultiplier(withoutReward, 0)).toBeCloseTo(10, 9)

    // The feed side of the same reward.
    expect(feedMultiplier(withReward) / feedMultiplier(withoutReward)).toBeCloseTo(1.5, 9)

    // And the aggregate is unchanged to double precision — documented, not asserted
    // as zero so a future rebalance that makes Fingers matter again still passes.
    expect(numberPerSecond(withReward).gte(numberPerSecond(withoutReward))).toBe(true)
  })
})

describe('rung 1 v2 — C8 finisher and the gate transition', () => {
  it('fires the finisher on C8 completion and the gate exactly once', () => {
    const run = fullRun()
    expect(run.state.challenges.completed).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'])

    // The finisher is a production x2 on every ring, not a price trick.
    const withFinisher = cloneState(run.state)
    const withoutFinisher = cloneState(run.state)
    withoutFinisher.challenges.completed = withoutFinisher.challenges.completed.filter((id) => id !== 'C8')
    expect(numberPerSecond(withFinisher).gt(numberPerSecond(withoutFinisher))).toBe(true)

    // Gate reached, and the latch held: exactly one transition.
    expect(run.gateMinute).not.toBeNull()
    expect(run.gateTransitions).toBe(1)
    expect(run.state.gateReached).toBe(true)
    expect(run.state.number.gte(GATE)).toBe(true)
    expect(log10Of(run.state.number)).toBeGreaterThanOrEqual(GATE_LOG10 - 1e-6)

    // checkGate is a latch, not a level test: it never fires twice.
    expect(checkGate(run.state)).toBe(false)
    expect(checkGate(run.state)).toBe(false)

    // And a state below the gate never latches it.
    const unlatched = createNumberState()
    unlatched.number = D('1e307')
    expect(checkGate(unlatched)).toBe(false)
    expect(unlatched.gateReached).toBe(false)
  })
})

describe('rung 1 v2 — full calibrated run', () => {
  it('reaches the gate inside the sanity window with no resets and no NaN', () => {
    const run = fullRun()

    // 1. The gate is reached at all, inside the safety cap.
    expect(run.gateMinute).not.toBeNull()
    expect(run.gateMinute!).toBeLessThanOrEqual(RUN_CAP_MINUTES)

    // 2. The sanity band. NOT the 188.8 target: the calibration number is a
    //    measurement of one policy, this test only claims the shape holds.
    expect(run.minutes).toBeGreaterThanOrEqual(150)
    expect(run.minutes).toBeLessThanOrEqual(230)

    // 3. All eight overlays ran, in order, and every one completed.
    expect(run.phases).toHaveLength(8)
    expect(run.phases.every((phase) => phase.completed)).toBe(true)
    expect(run.phases.map((phase) => phase.id)).toEqual(CHALLENGES.map((def) => def.id))

    // 4. No NaN and no runaway at any point of the run.
    expect(run.nanSeen).toBe(false)
    expect(run.state.number.isNan()).toBe(false)

    // 5. Monotone except purchases: the only drops are block purchases, the
    //    bought counters never go backwards and bestNumber is a ratchet.
    expect(run.unbackedDrops).toBe(0)
    expect(run.boughtRegressions).toBe(0)
    expect(run.bestRegressions).toBe(0)
    expect(run.state.bestNumber.gte(run.state.number)).toBe(true)

    // 6. Never reset after a challenge entry, and every entry was recorded.
    expect(run.freshResets).toBe(0)
    expect(run.challengeEntries).toBe(8)
    expect(run.state.totalBuys).toBeGreaterThan(0)

    // 7. Each overlay's goal was the locked max(plan, entry + delta).
    for (const phase of run.phases) {
      const def = challengeById(phase.id)!
      expect(phase.goalLog10).toBeCloseTo(Math.max(def.goalLog10, phase.entryLog10 + def.delta), 6)
      // A challenge can only end at or above its own goal.
      expect(phase.endMinute).toBeGreaterThanOrEqual(phase.entryMinute)
    }

    // 8. The block multiplier actually accumulated: deep rings were bought.
    expect(run.state.rings[7].bought).toBeGreaterThanOrEqual(10)
    expect(run.state.rings[0].bought).toBeGreaterThanOrEqual(10)
  })
})

describe('rung 1 v2 — offline equivalent', () => {
  it('grows for 60 offline minutes without auto-completing an inactive challenge', () => {
    // Offline replay is the same advance() loop with no UI in between. autoEnter
    // is off here on purpose: an unattended run must never open or close a
    // challenge on its own — that is the store's job.
    const offline = runCalibrated({ minutes: 60, autoEnter: false })

    // The number grew, and it grew because the chain produced, not because a
    // challenge was silently resolved.
    expect(offline.state.number.gt(D(FRESH_NUMBER))).toBe(true)
    expect(log10Of(offline.state.number)).toBeGreaterThan(1)

    // Nothing was entered, so nothing could be completed.
    expect(offline.challengeEntries).toBe(0)
    expect(offline.state.challenges.active).toBeNull()
    expect(offline.state.challenges.completed).toEqual([])
    expect(offline.phases).toHaveLength(0)

    // An offline stretch does not latch the gate either (the run is far below it).
    expect(offline.state.gateReached).toBe(false)
    expect(offline.nanSeen).toBe(false)

    // And the same no-accidental-drop invariant holds.
    expect(offline.unbackedDrops).toBe(0)
    expect(offline.freshResets).toBe(0)
  })
})
