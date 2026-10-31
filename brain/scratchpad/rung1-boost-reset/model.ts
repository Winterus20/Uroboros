/**
 * RUNG 1 BOOST+RESET REFERENCE MODEL (standalone, salt okuma).
 *
 * ADR-0086'nin reset+boost ekonomisinin referans modeli. Gercek motor
 * (src/game/number/*) HENUZ reset/boost icermiyor; bu dosya formulun
 * kopyasidir, src'ye dokunmaz. T1 (core-run) indikten sonra harness gercek
 * motora tasinacak.
 *
 * Model (src/game/number/economy.ts + challenges.ts kopyasi):
 *   uretim_i = amount_i * baseRate_i * B^floor(bought_i/10) * odul/ceza
 *   sayi/sn  = (fingers + sum(direct_i)) * boostMult * odul/ceza
 *   besleme  = ring[i] += ring[i+1].amount * 0.11 * feedMult * dt   (B ve boost YOK)
 *   cuzdan   = N; alim N'den duser; 10 alimda sonraki halka acilir.
 *
 * ADR-0086 reset kurallari:
 *   - Mucadeleye giris: N=10, halkalar 0, kilitler sadece Fingers. boost ve oduller kalir.
 *   - Boost alimi: ayni reset. boostCount kalir.
 *   - Boost: son halka acik ve bought >= boostRequirement(n); fiyat N'den.
 *   - Mucadele hedefi MUTLAK (giristen bagimsiz); sira zorunlu.
 *   - Kilit kontrolu bestNumber uzerinden (soft-lock yok).
 */
import { Decimal, D } from '../../../src/core/math'

export const GATE = D('1.79e308')
export const GATE_LOG10 = 308.25286978738966

// ── src/game/number/tuning.ts kopyasi ────────────────────────────────────
export const BLOCK_SIZE = 10
export const CHAIN_RATE = 0.11
export const RING_DIRECT_SHARE = 1
export const CHALLENGE_FEED_MULT = 0.2
/** ADR-0086 rev: mücadeleler bu boost sayısına kadar kapalıdır. */
export let CHALLENGE_BOOST_GATE = 4
export function setChallengeBoostGate(n: number): void {
  CHALLENGE_BOOST_GATE = Math.max(0, Math.floor(n))
}
export const BASE_GROWTH = 1.2
export const RING_COUNT = 8
const RING_NAMES = ['Fingers', 'Notch', 'Abacus', 'Pencil', 'Calculator', 'Computer', 'Supercomputer', 'Mathematician']
const RING_BASE = [25, 200, 1600, 12800, 102400, 819200, 6553600, 52428800]
const RING_RATE = [1, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11]

export type PenaltyKind =
  | 'fingersCap' | 'price145' | 'directOff' | 'decay'
  | 'firstFive' | 'feedFifth' | 'newestOnly' | 'price135feedHalf'

export type RewardKind =
  | 'fingers10' | 'all5' | 'all3' | 'first3x5'
  | 'direct5' | 'feed15' | 'all4' | 'finisher'

export interface ChallengeDef {
  id: string
  ringIndex: number
  unlockLog10: number
  goalLog10: number
  growth: number
  penalty: PenaltyKind
  reward: RewardKind
}

export const CHALLENGES: readonly ChallengeDef[] = [
  { id: 'C1', ringIndex: 0, unlockLog10: 10, goalLog10: 33.242, growth: 1.22, penalty: 'fingersCap', reward: 'fingers10' },
  { id: 'C2', ringIndex: 1, unlockLog10: 33.242, goalLog10: 37.376, growth: 1.45, penalty: 'price145', reward: 'all5' },
  { id: 'C3', ringIndex: 2, unlockLog10: 37.376, goalLog10: 95.157, growth: 1.22, penalty: 'directOff', reward: 'all3' },
  { id: 'C4', ringIndex: 3, unlockLog10: 95.157, goalLog10: 104.688, growth: 1.22, penalty: 'decay', reward: 'first3x5' },
  { id: 'C5', ringIndex: 4, unlockLog10: 104.688, goalLog10: 119.334, growth: 1.22, penalty: 'firstFive', reward: 'direct5' },
  { id: 'C6', ringIndex: 5, unlockLog10: 119.334, goalLog10: 122.271, growth: 1.22, penalty: 'feedFifth', reward: 'feed15' },
  { id: 'C7', ringIndex: 6, unlockLog10: 122.271, goalLog10: 125.573, growth: 1.22, penalty: 'newestOnly', reward: 'all4' },
  { id: 'C8', ringIndex: 7, unlockLog10: 125.573, goalLog10: 128.967, growth: 1.35, penalty: 'price135feedHalf', reward: 'finisher' }
]

// ── Boost sabitleri (ADR-0086 "provisional") ─────────────────────────────
export interface BoostTuning {
  baseRequirement: number
  requirementGrowth: number
  mult: number
  priceGrowth: number
}

export const BOOST_TUNING: BoostTuning = {
  baseRequirement: 50,
  requirementGrowth: 1.35,
  mult: 1.5,
  priceGrowth: 1.5
}

// ── Durum ────────────────────────────────────────────────────────────────
export interface RingState { amount: Decimal; bought: number }

export interface ModelState {
  number: Decimal
  rings: RingState[]
  unlocked: boolean[]
  bestNumber: Decimal
  totalBuys: number
  playTime: number
  boostCount: number
  completed: string[]
  active: string | null
  goalLog10: number | null
  lastBuyAt: number
  lastBoughtRing: number
}

export function createModelState(): ModelState {
  return {
    number: D(10),
    rings: Array.from({ length: RING_COUNT }, () => ({ amount: D(0), bought: 0 })),
    unlocked: Array.from({ length: RING_COUNT }, (_, i) => i === 0),
    bestNumber: D(10),
    totalBuys: 0,
    playTime: 0,
    boostCount: 0,
    completed: [],
    active: null,
    goalLog10: null,
    lastBuyAt: 0,
    lastBoughtRing: -1
  }
}

export function log10(state: ModelState): number {
  if (state.number.lte(0)) return -Infinity
  return state.number.log10().toNumber()
}

export function resetRun(state: ModelState): void {
  state.number = D(10)
  for (const ring of state.rings) { ring.amount = D(0); ring.bought = 0 }
  state.unlocked = Array.from({ length: RING_COUNT }, (_, i) => i === 0)
  state.lastBuyAt = state.playTime
  state.lastBoughtRing = -1
}

// ── Boost ────────────────────────────────────────────────────────────────
export function boostRequirement(n: number, b: BoostTuning = BOOST_TUNING): number {
  return Math.ceil(b.baseRequirement * Math.pow(b.requirementGrowth, n))
}

export function boostMultiplier(state: ModelState, b: BoostTuning = BOOST_TUNING): Decimal {
  return new Decimal(b.mult).pow(state.boostCount)
}

export function baseCostAt(index: number, bought: number, growth: number): Decimal {
  return new Decimal(RING_BASE[index]).times(new Decimal(growth).pow(bought))
}

export function ringBlockCost(index: number, bought: number, count: number, growth: number): Decimal {
  if (count <= 1) return baseCostAt(index, bought, growth)
  const g = new Decimal(growth)
  return baseCostAt(index, bought, growth).times(g.pow(count).minus(1)).div(g.minus(1))
}

export function activeDef(state: ModelState): ChallengeDef | null {
  return CHALLENGES.find((d) => d.id === state.active) ?? null
}

export function costGrowth(state: ModelState): number {
  return activeDef(state)?.growth ?? BASE_GROWTH
}

export function boostPrice(state: ModelState, b: BoostTuning = BOOST_TUNING): Decimal {
  const last = RING_COUNT - 1
  return ringBlockCost(last, state.rings[last].bought, BLOCK_SIZE, costGrowth(state))
    .times(new Decimal(b.priceGrowth).pow(state.boostCount))
}

export function canBoost(state: ModelState, b: BoostTuning = BOOST_TUNING): boolean {
  const last = RING_COUNT - 1
  if (state.active !== null) return false // ADR: boost panel challenge sirasinda kapali
  if (state.unlocked[last] !== true) return false
  if (state.rings[last].bought < boostRequirement(state.boostCount, b)) return false
  return state.number.gte(boostPrice(state, b))
}

export function applyBoost(state: ModelState, b: BoostTuning = BOOST_TUNING): boolean {
  if (!canBoost(state, b)) return false
  state.number = state.number.minus(boostPrice(state, b))
  state.boostCount += 1
  resetRun(state)
  return true
}

// ── Zincir / uretim ──────────────────────────────────────────────────────
export function blockFactor(bought: number, B: number): Decimal {
  const e = Math.floor(bought / BLOCK_SIZE)
  if (e <= 0) return D(1)
  return new Decimal(B).pow(e)
}

export function hasReward(state: ModelState, r: RewardKind): boolean {
  return state.completed.some((id) => CHALLENGES.find((d) => d.id === id)?.reward === r)
}

export function feedMultiplier(state: ModelState): number {
  let m = 1
  if (hasReward(state, 'fingers10')) m *= 1.5
  if (hasReward(state, 'direct5')) m *= 1.5
  if (hasReward(state, 'feed15')) m *= 1.5
  const def = activeDef(state)
  if (def) {
    if (def.penalty === 'feedFifth') m /= 5
    if (def.penalty === 'price135feedHalf') m /= 2
    m *= CHALLENGE_FEED_MULT
  }
  return m
}

export function ringProdMult(state: ModelState, i: number): number {
  let m = 1
  if (i === 0 && hasReward(state, 'fingers10')) m *= 10
  if (hasReward(state, 'all5')) m *= 5
  if (hasReward(state, 'all3')) m *= 3
  if (i < 3 && hasReward(state, 'first3x5')) m *= 5
  if (i >= 1 && hasReward(state, 'direct5')) m *= 5
  if (hasReward(state, 'all4')) m *= 4
  if (hasReward(state, 'finisher')) m *= 2
  const def = activeDef(state)
  if (def?.penalty === 'newestOnly') {
    const newest = state.lastBoughtRing
    if (newest >= 0 && i !== newest) m *= 0.25
  }
  if (def?.penalty === 'decay') {
    const since = Math.max(0, state.playTime - state.lastBuyAt)
    m *= Math.max(0.1, Math.exp(-since / 20))
  }
  return m
}

export function numberPerSecond(state: ModelState, B: number, b: BoostTuning = BOOST_TUNING): Decimal {
  const directOff = activeDef(state)?.penalty === 'directOff'
  let p = D(0)
  for (let i = 0; i < RING_COUNT; i++) {
    const ring = state.rings[i]
    if (ring.amount.lte(0)) continue
    let rate = i === 0 ? RING_RATE[0] : RING_RATE[i] * RING_DIRECT_SHARE
    if (i > 0 && directOff) rate = 0
    if (rate <= 0) continue
    p = p.plus(ring.amount.times(rate).times(blockFactor(ring.bought, B)).times(ringProdMult(state, i)))
  }
  return p.times(boostMultiplier(state, b))
}

export function advance(state: ModelState, dt: number, B: number, b: BoostTuning = BOOST_TUNING): void {
  const feed = CHAIN_RATE * feedMultiplier(state)
  if (feed > 0) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      const feeder = state.rings[i + 1]
      if (feeder.amount.lte(0)) continue
      state.rings[i].amount = state.rings[i].amount.plus(feeder.amount.times(feed).times(dt))
    }
  }
  const p = numberPerSecond(state, B, b)
  if (p.gt(0)) state.number = state.number.plus(p.times(dt))
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
}

export function manualTap(state: ModelState): void {
  state.number = state.number.plus(1)
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
}

export function purchasesBlocked(state: ModelState, index: number): boolean {
  const def = activeDef(state)
  if (!def) return false
  if (def.penalty === 'fingersCap' && index === 0 && state.rings[0].bought >= BLOCK_SIZE) return true
  if (def.penalty === 'firstFive' && index >= 5) return true
  return false
}

export function isPurchasable(state: ModelState, index: number): boolean {
  if (index < 0 || index >= RING_COUNT) return false
  if (state.unlocked[index] !== true) return false
  return !purchasesBlocked(state, index)
}

export function maxAffordable(state: ModelState, index: number): number {
  if (!isPurchasable(state, index)) return 0
  const cost = baseCostAt(index, state.rings[index].bought, costGrowth(state))
  if (state.number.lt(cost)) return 0
  const g = new Decimal(costGrowth(state))
  const raw = state.number.div(cost).times(g.minus(1)).plus(1).log10().div(g.log10()).floor().toNumber()
  if (!Number.isFinite(raw) || raw < 1) return 0
  return Math.min(Math.floor(raw), 1000)
}

export function buyRing(state: ModelState, index: number, count: number): number {
  const growth = costGrowth(state)
  const ring = state.rings[index]
  let bought = 0
  for (let i = 0; i < count; i++) {
    if (!isPurchasable(state, index)) break
    const cost = baseCostAt(index, ring.bought, growth)
    if (state.number.lt(cost)) break
    state.number = state.number.minus(cost)
    ring.amount = ring.amount.plus(1)
    ring.bought += 1
    state.totalBuys += 1
    bought++
    state.lastBuyAt = state.playTime
    state.lastBoughtRing = index
    if (ring.bought >= BLOCK_SIZE && index + 1 < RING_COUNT) state.unlocked[index + 1] = true
  }
  return bought
}

export function maxAll(state: ModelState): number {
  let total = 0
  for (let pass = 0; pass < RING_COUNT; pass++) {
    let boughtThisPass = 0
    for (let i = RING_COUNT - 1; i >= 0; i--) {
      if (!isPurchasable(state, i)) continue
      for (let guard = 0; guard < 1000; guard++) {
        if (state.number.lt(ringBlockCost(i, state.rings[i].bought, BLOCK_SIZE, costGrowth(state)))) break
        const got = buyRing(state, i, BLOCK_SIZE)
        if (got <= 0) break
        total += got
        boughtThisPass += got
      }
    }
    if (boughtThisPass === 0) break
  }
  return total
}

// ── Mucadeleler (reset modeli) ───────────────────────────────────────────
export function challengeUnlocked(state: ModelState, def: ChallengeDef): boolean {
  if (state.completed.includes(def.id)) return false
  if (state.boostCount < CHALLENGE_BOOST_GATE) return false
  const log = state.bestNumber.log10().toNumber()
  return Number.isFinite(log) && log >= def.unlockLog10
}

export function nextChallenge(state: ModelState): ChallengeDef | null {
  return CHALLENGES.find((d) => !state.completed.includes(d.id)) ?? null
}

export function enterChallenge(state: ModelState, id: string): boolean {
  const def = CHALLENGES.find((d) => d.id === id)
  if (!def) return false
  if (state.active !== null) return false
  if (state.completed.includes(id)) return false
  const next = nextChallenge(state)
  if (!next || next.id !== id) return false // ADR: sira zorunlu
  if (!challengeUnlocked(state, def)) return false
  resetRun(state)
  state.active = id
  state.goalLog10 = def.goalLog10
  return true
}

export function completeIfReady(state: ModelState): ChallengeDef | null {
  const def = activeDef(state)
  if (!def) return null
  if (state.goalLog10 === null) return null
  if (log10(state) < state.goalLog10) return null
  state.completed.push(def.id)
  state.active = null
  state.goalLog10 = null
  return def
}

// ── Simulasyon ───────────────────────────────────────────────────────────
export interface Policy {
  /** Mucadelelere gir (sirali). */
  enterChallenges: boolean
  /** C_i'ye girmeden once istenen boost sayisi (kumulatif). */
  boostTargets: number[]
  /** C8'den sonra (veya challenge yoksa) toplam boost tavani. */
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

export interface SimOptions {
  B: number
  boost?: BoostTuning
  policy: Policy
  maxMinutes: number
  dt?: number
  tapsPerSecond?: number
  /** Test icin hedef override (log10); indeks = challenge indeksi. */
  goalOverride?: number[]
  /** Sadece bu challenge tamamlaninca dur (sweep icin). */
  stopAfter?: string
  /** Erken dur: bu dakikada kes (baseline parcalari icin). */
  stopAtMinutes?: number
  /** Onceden kazanilmis oduller (odul etkisini izole etmek icin). */
  preCompleted?: string[]
  /** Onceden alinmis boost sayisi. */
  preBoost?: number
  /** Bu boost sayisina ulasinca dur (boost merdiveni maliyeti icin). */
  stopAfterBoost?: number
  /** Tek mucadele izolasyonu: bestNumber'i bu log10'a kur. */
  preBestLog10?: number
  /** Tek mucadele izolasyonu: bu mucadeleye girerek basla. */
  startChallenge?: string
}

export interface SimResult {
  gateMin: number | null
  totalMin: number
  finalLog: number
  boostCount: number
  boostEvents: BoostEvent[]
  phases: Phase[]
  completed: string[]
  stalls: { id: string; minutes: number }[]
  maxBought: number[]
  error: string | null
}

export function simulate(opts: SimOptions): SimResult {
  const B = opts.B
  const boost = opts.boost ?? BOOST_TUNING
  const dt = opts.dt ?? 0.5
  const tapsPerSecond = opts.tapsPerSecond ?? 2
  const state = createModelState()
  if (opts.preCompleted) state.completed = [...opts.preCompleted]
  if (opts.preBoost) state.boostCount = opts.preBoost
  if (opts.preBestLog10 !== undefined) state.bestNumber = D('1e' + opts.preBestLog10)
  const phases: Phase[] = []
  let presetOpen = false
  if (opts.startChallenge) {
    if (!enterChallenge(state, opts.startChallenge)) throw new Error('startChallenge failed: ' + opts.startChallenge)
    if (opts.goalOverride) {
      const idx = CHALLENGES.findIndex((c) => c.id === opts.startChallenge)
      if (opts.goalOverride[idx] !== undefined) state.goalLog10 = opts.goalOverride[idx]
    }
    presetOpen = true
  }
  const boostEvents: BoostEvent[] = []
  const stalls: { id: string; minutes: number }[] = []
  const maxBought = new Array<number>(RING_COUNT).fill(0)

  let t = 0
  let gateMin: number | null = null
  const presetPhase: Phase | null = presetOpen ? {
    id: opts.startChallenge as string,
    entryMin: 0,
    endMin: 0,
    completed: false,
    goalLog10: state.goalLog10 ?? 0,
    entryBoost: state.boostCount
  } : null
  let error: string | null = null
  let tapAcc = 0
  let open: Phase | null = null
  const maxSeconds = opts.maxMinutes * 60
  const stopSeconds = opts.stopAtMinutes !== undefined ? opts.stopAtMinutes * 60 : Infinity

  const targetForNext = (): number => {
    if (!opts.policy.enterChallenges) return Infinity
    const next = nextChallenge(state)
    if (!next) return state.boostCount
    const idx = CHALLENGES.indexOf(next)
    return opts.policy.boostTargets[idx] ?? 0
  }

  while (t < maxSeconds && t < stopSeconds) {
    state.playTime = t
    advance(state, dt, B, boost)
    t += dt

    // Acilis tiklamasi: halka 0 alinana kadar (her reset sonrasi).
    if (state.rings[0].bought === 0 && tapsPerSecond > 0) {
      tapAcc += dt
      while (tapAcc >= 1 / tapsPerSecond) {
        tapAcc -= 1 / tapsPerSecond
        manualTap(state)
      }
    }

    const done = completeIfReady(state)
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

    if (state.active === null) {
      const next = nextChallenge(state)
      const target = targetForNext()
      const unlocked = next !== null && challengeUnlocked(state, next)
      if (opts.policy.enterChallenges && next !== null && unlocked && state.boostCount >= target) {
        if (enterChallenge(state, next.id)) {
          open = {
            id: next.id,
            entryMin: t / 60,
            endMin: t / 60,
            completed: false,
            goalLog10: opts.goalOverride?.[CHALLENGES.indexOf(next)] ?? next.goalLog10,
            entryBoost: state.boostCount
          }
          // goalOverride: mutlak hedef yerine test hedefi
          if (opts.goalOverride?.[CHALLENGES.indexOf(next)] !== undefined) {
            state.goalLog10 = opts.goalOverride[CHALLENGES.indexOf(next)]
          }
        }
      } else if (state.boostCount < opts.policy.maxBoosts && state.boostCount < target && canBoost(state, boost)) {
        const before = log10(state)
        if (applyBoost(state, boost)) {
          boostEvents.push({ min: t / 60, count: state.boostCount, logBefore: before })
        }
      }
    }

    maxAll(state)
    for (let i = 0; i < RING_COUNT; i++) if (state.rings[i].bought > maxBought[i]) maxBought[i] = state.rings[i].bought

    if (opts.stopAfterBoost !== undefined && state.boostCount >= opts.stopAfterBoost) break

    if (open !== null && t / 60 - open.entryMin > 240) {
      if (!stalls.some((s) => s.id === open!.id)) stalls.push({ id: open.id, minutes: t / 60 - open.entryMin })
    }

    if (state.number.gte(GATE)) { gateMin = t / 60; break }
    if (state.number.isNan() || !Number.isFinite(log10(state))) { error = 'NaN at ' + (t / 60).toFixed(1); break }
  }

  if (open !== null && !open.completed) {
    open.endMin = t / 60
    phases.push(open)
  }

  return {
    gateMin,
    totalMin: t / 60,
    finalLog: log10(state),
    boostCount: state.boostCount,
    boostEvents,
    phases,
    completed: [...state.completed],
    stalls,
    maxBought,
    error
  }
}

export function fmt(min: number | null): string {
  return min === null ? '-' : min.toFixed(1)
}