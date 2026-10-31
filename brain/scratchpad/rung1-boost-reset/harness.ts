/**
 * RUNG 1 BOOST+RESET HARNESS — GERCEK MOTOR (src/game/number/*).
 *
 * Referans model (model.ts) ile ayni politikayi gercek motorda kosar:
 * tick = advance -> tap (acilis) -> complete -> enter/boost -> maxAll -> gate.
 * Politika: maxAll (en derin halkadan 10'lu bloklar) + acilista 2 tik/sn.
 *
 * Boost politikasi: C_i'ye girmeden once boostTargets[i] kadar boost ister;
 * boost yalnizca "sirası gelmis mucadele hedefe ulasmadiysa" alinir. Bu,
 * oyuncunun mucadele oncesi kosuyu zaten sifirlayacagi gerçegini modeller.
 */
import { Decimal, D } from '../../../src/core/math'
import {
  GATE,
  BLOCK_SIZE
} from '../../../src/game/number/tuning'
import {
  advance,
  applyBoost,
  boostRequirement,
  canBoost,
  checkGate,
  createNumberState,
  manualTap,
  maxAll,
  resetRun,
  type NumberState
} from '../../../src/game/number/economy'
import {
  CHALLENGES,
  isChallengeUnlocked,
  completeChallengeIfReady,
  enterChallenge,
  nextChallenge
} from '../../../src/game/number/challenges'

export interface Policy {
  enterChallenges: boolean
  /** C_i'ye girmeden once istenen KUMULATIF boost sayisi. */
  boostTargets: number[]
  /** Genel boost tavani (boost-only icin). */
  maxBoosts: number
}

export interface Phase {
  id: string
  entryMin: number
  endMin: number
  completed: boolean
  goalLog10: number
  entryBoost: number
}

export interface BoostEvent { min: number; count: number; logBefore: number }

export interface Options {
  policy: Policy
  maxMinutes: number
  dt?: number
  tapsPerSecond?: number
  preCompleted?: string[]
  preBoost?: number
  stopAfter?: string
  stopAfterBoost?: number
  stopAtMinutes?: number
  /** Test hedefi (log10): giris sonrasi state.challenges.goalLog10 ezilir. */
  goalOverride?: number[]
  /** Tek mucadele izolasyonu: bestNumber'i bu log10'a kur. */
  preBestLog10?: number
  /** Tek mucadele izolasyonu: bu mucadeleye girerek basla. */
  startChallenge?: string
}

export interface Result {
  gateMin: number | null
  totalMin: number
  finalLog: number
  boostCount: number
  boostEvents: BoostEvent[]
  phases: Phase[]
  completed: string[]
  maxBought: number[]
  error: string | null
}

function log10(state: NumberState): number {
  if (state.number.lte(0)) return -Infinity
  return state.number.log10().toNumber()
}

export function run(opts: Options): Result {
  const dt = opts.dt ?? 0.5
  const taps = opts.tapsPerSecond ?? 2
  const state = createNumberState()
  if (opts.preCompleted) state.challenges.completed = [...opts.preCompleted]
  if (opts.preBoost) state.boostCount = opts.preBoost
  if (opts.preBestLog10 !== undefined) state.bestNumber = D('1e' + opts.preBestLog10)

  const phases: Phase[] = []
  let presetOpen = false
  if (opts.startChallenge) {
    if (!enterChallenge(state, opts.startChallenge)) throw new Error('startChallenge failed: ' + opts.startChallenge)
    const idx = CHALLENGES.findIndex((c) => c.id === opts.startChallenge)
    if (opts.goalOverride?.[idx] !== undefined) state.challenges.goalLog10 = opts.goalOverride[idx]
    presetOpen = true
  }
  const boostEvents: BoostEvent[] = []
  const maxBought = new Array<number>(8).fill(0)
  let t = 0
  let tapAcc = 0
  let gateMin: number | null = null
  let error: string | null = null
  let open: Phase | null = null
  const presetPhase: Phase | null = presetOpen ? {
    id: opts.startChallenge as string,
    entryMin: 0,
    endMin: 0,
    completed: false,
    goalLog10: state.challenges.goalLog10 ?? 0,
    entryBoost: state.boostCount
  } : null
  const maxSeconds = opts.maxMinutes * 60
  const stopSeconds = opts.stopAtMinutes !== undefined ? opts.stopAtMinutes * 60 : Infinity

  const targetForNext = (): number => {
    if (!opts.policy.enterChallenges) return Infinity
    const next = nextChallenge(state)
    if (!next) return state.boostCount
    return opts.policy.boostTargets[CHALLENGES.indexOf(next)] ?? 0
  }

  while (t < maxSeconds && t < stopSeconds) {
    state.playTime = t
    advance(state, dt)
    t += dt

    if (state.rings[0].bought === 0 && taps > 0) {
      tapAcc += dt
      while (tapAcc >= 1 / taps) {
        tapAcc -= 1 / taps
        manualTap(state)
      }
    }

    const done = completeChallengeIfReady(state)
    if (done && open === null && presetPhase !== null && presetPhase.id === done.id) {
      presetPhase.endMin = t / 60
      presetPhase.completed = true
      phases.push(presetPhase)
      if (opts.stopAfter === done.id) break
    } else if (done && open !== null && open.id === done.id) {
      open.endMin = t / 60
      open.completed = true
      phases.push(open)
      open = null
      if (opts.stopAfter === done.id) break
    }

    if (state.challenges.active === null) {
      const next = nextChallenge(state)
      const target = targetForNext()
      const unlocked = next !== null && isChallengeUnlocked(state, next)
      if (opts.policy.enterChallenges && next !== null && unlocked && state.boostCount >= target) {
        if (enterChallenge(state, next.id)) {
          const idx = CHALLENGES.indexOf(next)
          if (opts.goalOverride?.[idx] !== undefined) state.challenges.goalLog10 = opts.goalOverride[idx]
          open = {
            id: next.id,
            entryMin: t / 60,
            endMin: t / 60,
            completed: false,
            goalLog10: state.challenges.goalLog10 ?? 0,
            entryBoost: state.boostCount
          }
        }
      } else if (state.boostCount < opts.policy.maxBoosts && state.boostCount < target && canBoost(state)) {
        // Not: canBoost fiyat dahil; fiyat sayidan duser, sonra reset.
        const before = log10(state)
        // applyBoost fiyati okur; once fiyati hesapla ki logBefore anlamli olsun.
        if (applyBoost(state)) boostEvents.push({ min: t / 60, count: state.boostCount, logBefore: before })
      }
    }

    maxAll(state)
    for (let i = 0; i < 8; i++) if (state.rings[i].bought > maxBought[i]) maxBought[i] = state.rings[i].bought

    if (opts.stopAfterBoost !== undefined && state.boostCount >= opts.stopAfterBoost) break

    if (checkGate(state)) { gateMin = t / 60; break }
    if (state.number.isNan() || !Number.isFinite(log10(state))) { error = 'NaN at ' + (t / 60).toFixed(1); break }
  }

  if (open !== null) { open.endMin = t / 60; phases.push(open) }

  return {
    gateMin,
    totalMin: t / 60,
    finalLog: log10(state),
    boostCount: state.boostCount,
    boostEvents,
    phases,
    completed: [...state.challenges.completed],
    maxBought,
    error
  }
}

export function fmt(v: number | null): string {
  return v === null ? '-' : v.toFixed(1)
}

export function brief(r: Result): string {
  const ph = r.phases.map((p) => p.id + ':' + p.entryMin.toFixed(0) + '-' + p.endMin.toFixed(0) + (p.completed ? '' : '(x)')).join(' ')
  const bs = r.boostEvents.map((b) => b.min.toFixed(0)).join(',')
  return 'gate=' + fmt(r.gateMin).padStart(6) + ' log=' + r.finalLog.toFixed(1).padStart(6) + ' boost=' + r.boostCount + ' [' + bs + '] ' + ph + (r.error ? ' ERR=' + r.error : '')
}

export { CHALLENGES, boostRequirement, D, GATE, BLOCK_SIZE }