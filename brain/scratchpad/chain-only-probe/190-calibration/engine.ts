/**
 * 190-DK KALIBRASYON MOTORU (salt okuma; src/ degismez).
 *
 * Tek kosu, sifirlama yok, B blok carpani, 8 sifirlamasiz mucadele.
 * Gercek sabitler: src/game/number/tuning.ts + src/core/math.ts.
 *
 * Model:
 *   uretim_i = amount_i * baseRate_i * B^floor(bought_i/10) * odul/ceza
 *   baseRate_0 = 1, baseRate_i = 0.11 * RING_DIRECT_SHARE (C3'te 0)
 *   besleme: ring i += ring[i+1].amount * 0.11 * feedMult * dt   (B uygulanmaz)
 *   cuzdan = N; alim N'den duser; ring i+1, ring i'de 10 alimda acilir (mandalli).
 */
import { Decimal, D } from '../../../../src/core/math'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT, ringBlockCost } from '../../../../src/game/number/tuning'
import { createNumberState } from '../../../../src/game/number/economy'

export const GATE = D('1.79e308')
export const GATE_LOG = 308.25286978738966
const BASE_GROWTH = 1.2
const CHAIN_RATE = 0.11
const MAX_BLOCK_EXP = 6000

export type PenaltyKind =
  | 'none'
  | 'fingersCap'
  | 'price145'
  | 'directOff'
  | 'decay'
  | 'firstFive'
  | 'feedFifth'
  | 'newestOnly'
  | 'price135feedHalf'

export type RewardKind =
  | 'none'
  | 'fingers10'
  | 'all5'
  | 'all3'
  | 'first3x5'
  | 'direct5'
  | 'feed15'
  | 'all4'
  | 'finisher'

export interface ChallengeDef {
  id: string
  name: string
  ring: number
  /** N esigi (log10). Girmeden once ulasilmis olmali. */
  unlockLog: number
  /** Sabit plan hedefi (log10). */
  planGoalLog: number
  /** Anti-abuse: goal >= entry * 10^delta. */
  delta: number
  penalty: PenaltyKind
  reward: RewardKind
  /** Hedef sure (dk) - sadece goalMode='duration' icin. */
  targetMin: number
  /** Kalibrasyon: ceza siddetini olceklendiren ek uretim carpani (varsayilan 1). */
  extraMult?: number
  /** Kalibrasyon: fiyat artisini gecersiz kilan deger (varsayilan: cezadan). */
  growthOverride?: number
  /** Kalibrasyon: besleme hizini carpan ek deger (varsayilan 1). */
  feedMult?: number
}

export interface PenaltyParams {
  /** C4: alim yoksa uretim curumesi; tau saniye, taban. */
  c4TauSec: number
  c4Floor: number
  /** C7: en son alinan halka disindakilerin carpani. */
  c7OtherMult: number
}

export interface RewardParams {
  fingers10: number
  all5: number
  all3: number
  first3x5: number
  direct5: number
  feed15: number
  all4: number
  c8: number
  /** R1 "Tam El" ek besleme carpani (Fingers uretimi tek basina olceklenmiyor). */
  feedR1: number
  /** R5 "Anlik Sonuc" ek besleme carpani. */
  feedR5: number
}

export const DEFAULT_PENALTY: PenaltyParams = {
  c4TauSec: 20,
  c4Floor: 0.1,
  c7OtherMult: 0.25
}

export const DEFAULT_REWARD: RewardParams = {
  fingers10: 10,
  all5: 5,
  all3: 3,
  first3x5: 5,
  direct5: 5,
  feed15: 1.5,
  all4: 4,
  c8: 100,
  feedR1: 1.5,
  feedR5: 1.5
}

export interface SimConfig {
  B: number
  policy: 'maxall' | 'idle'
  tickDt: number
  decisionDt: number
  tapsPerSec: number
  challenges: ChallengeDef[]
  penalty: PenaltyParams
  reward: RewardParams
  goalMode: 'fixed' | 'duration'
  maxMinutes: number
  sampleEveryMin?: number
  /** log10(N) esikleri; gecis sureleri kaydedilir. */
  milestones?: number[]
  /** Deney icin onceden acilmis oduller. */
  preRewards?: RewardKind[]
  /** Son mucadele bitince dur (kalibrasyon kosulari icin). */
  stopAfterChallenges?: boolean
  /** Idle bootstrap: ilk alima kadar tik at (oyun 10 sayisindan baslar, ilk halka 25). */
  tapUntilFirstBuy?: boolean
  /** Odul hissedilirlik testi: bu oduller kazanilsa da aktif edilmez. */
  skipRewards?: RewardKind[]
}

export interface PhaseRecord {
  id: string
  name: string
  startMin: number
  endMin: number
  entryLog: number
  goalLog: number
  durationMin: number
  completed: boolean
  penalty: PenaltyKind
  reward: RewardKind
  boughtAtEnd: number[]
  amountsLogAtEnd: number[]
  logAtEnd: number
}

export interface Sample {
  min: number
  log: number
  challenge: string
  bought: number[]
  perSecLog: number
}

export interface SimResult {
  totalMin: number
  gateMin: number | null
  phases: PhaseRecord[]
  samples: Sample[]
  finalLog: number
  error: string | null
  rewardTimes: Record<string, number>
  maxBought: number[]
  openingMin: number | null
  milestones: { log: number; min: number }[]
}

function buildMultCache(B: number): Decimal[] {
  const cache: Decimal[] = [D(1)]
  let cur = D(1)
  const b = D(B)
  for (let i = 1; i <= MAX_BLOCK_EXP; i++) {
    cur = cur.times(b)
    cache.push(cur)
  }
  return cache
}

export function runSim(cfg: SimConfig): SimResult {
  const B = cfg.B
  const multCache = buildMultCache(B)
  const blockMult = (bought: number): Decimal => {
    const e = Math.floor(bought / BLOCK_SIZE)
    if (e <= 0) return D(1)
    return multCache[Math.min(e, MAX_BLOCK_EXP)]
  }

  const state = createNumberState()
  const lastBuyTime = new Array<number>(RING_COUNT).fill(-1)
  let lastAnyBuyT = 0
  let t = 0
  let tapAcc = 0
  let buyAcc = 0
  let perSec = D(0)

  const phases: PhaseRecord[] = []
  const samples: Sample[] = []
  const rewardTimes: Record<string, number> = {}
  const rewards = new Set<RewardKind>(cfg.preRewards ?? [])
  let active: ChallengeDef | null = null
  let activeStartT = 0
  let activeEntryLog = 0
  let activeGoalLog = 0
  let activeTargetEndT = 0
  let nextChallenge = 0
  let gateMin: number | null = null
  let error: string | null = null
  let openingMin: number | null = null
  let sampleAcc = 0
  const sampleEvery = cfg.sampleEveryMin ?? 5
  let maxBought = new Array<number>(RING_COUNT).fill(0)
  const milestoneLogs = (cfg.milestones ?? []).slice().sort((a, b) => a - b)
  const milestoneHits: { log: number; min: number }[] = []
  let nextMilestone = 0

  const log10N = (): number => {
    const v = state.number
    if (v.lte(0)) return -Infinity
    return v.log10().toNumber()
  }

  const hasReward = (r: RewardKind): boolean => rewards.has(r)

  const growthNow = (): number => {
    if (active?.growthOverride !== undefined) return active.growthOverride
    if (active?.penalty === 'price145') return 1.45
    if (active?.penalty === 'price135feedHalf') return 1.35
    return BASE_GROWTH
  }

  const feedMultNow = (): number => {
    let m = 1
    if (hasReward('feed15')) m *= cfg.reward.feed15
    if (hasReward('fingers10')) m *= cfg.reward.feedR1
    if (hasReward('direct5')) m *= cfg.reward.feedR5
    if (active?.penalty === 'feedFifth') m /= 5
    if (active?.penalty === 'price135feedHalf') m /= 2
    if (active?.feedMult !== undefined) m *= active.feedMult
    return m
  }

  const directShareNow = (): number => (active?.penalty === 'directOff' ? 0 : 1)

  const ringProdMult = (i: number, decay: number): number => {
    let m = 1
    if (i === 0 && hasReward('fingers10')) m *= cfg.reward.fingers10
    if (hasReward('all5')) m *= cfg.reward.all5
    if (hasReward('all3')) m *= cfg.reward.all3
    if (i < 3 && hasReward('first3x5')) m *= cfg.reward.first3x5
    if (i >= 1 && hasReward('direct5')) m *= cfg.reward.direct5
    if (hasReward('all4')) m *= cfg.reward.all4
    if (hasReward('finisher')) m *= cfg.reward.c8
    if (active?.penalty === 'newestOnly') {
      let newest = -1
      let bestT = -1
      for (let k = 0; k < RING_COUNT; k++) {
        if (lastBuyTime[k] > bestT) {
          bestT = lastBuyTime[k]
          newest = k
        }
      }
      if (newest >= 0 && i !== newest) m *= cfg.penalty.c7OtherMult
    }
    if (active?.penalty === 'decay') m *= decay
    if (active?.extraMult !== undefined) m *= active.extraMult
    return m
  }

  const newestBoughtRing = (): number => {
    let newest = -1
    let bestT = -1
    for (let k = 0; k < RING_COUNT; k++) {
      if (lastBuyTime[k] > bestT) {
        bestT = lastBuyTime[k]
        newest = k
      }
    }
    return newest
  }

  const tick = (dt: number): void => {
    const feed = CHAIN_RATE * feedMultNow()
    if (feed > 0) {
      for (let i = 0; i < RING_COUNT - 1; i++) {
        const feeder = state.rings[i + 1]
        if (feeder.amount.gt(0)) {
          state.rings[i].amount = state.rings[i].amount.plus(feeder.amount.times(feed).times(dt))
        }
      }
    }
    const share = directShareNow()
    let decay = 1
    if (active?.penalty === 'decay') {
      const since = t - lastAnyBuyT
      decay = Math.max(cfg.penalty.c4Floor, Math.exp(-since / cfg.penalty.c4TauSec))
    }
    let p = D(0)
    for (let i = 0; i < RING_COUNT; i++) {
      const amount = state.rings[i].amount
      if (amount.lte(0)) continue
      let baseRate = i === 0 ? 1 : CHAIN_RATE * share
      if (baseRate <= 0) continue
      const bm = blockMult(state.rings[i].bought)
      p = p.plus(amount.times(baseRate).times(bm).times(ringProdMult(i, decay)))
    }
    perSec = p
    if (p.gt(0)) state.number = state.number.plus(p.times(dt))
    if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
  }

  const canBuyRing = (i: number): boolean => {
    if (i < 0 || i >= RING_COUNT) return false
    if (state.unlocked[i] !== true) return false
    if (active?.penalty === 'firstFive' && i >= 5) return false
    if (active?.penalty === 'fingersCap' && i === 0 && state.rings[0].bought >= 10) return false
    return true
  }

  const buyUnits = (i: number, count: number, g: number): number => {
    let n = 0
    for (let k = 0; k < count; k++) {
      if (!canBuyRing(i)) break
      const base = NUMBER_TUNING.rings[i].baseCost
      const cost = base.times(new Decimal(g).pow(state.rings[i].bought))
      if (state.number.lt(cost)) break
      state.number = state.number.minus(cost)
      state.rings[i].amount = state.rings[i].amount.plus(1)
      state.rings[i].bought += 1
      state.totalBuys += 1
      n++
      lastBuyTime[i] = t
      lastAnyBuyT = t
      if (state.rings[i].bought > maxBought[i]) maxBought[i] = state.rings[i].bought
      if (state.rings[i].bought >= NUMBER_TUNING.unlockThreshold && i + 1 < RING_COUNT) {
        state.unlocked[i + 1] = true
      }
    }
    return n
  }

  const doBuy = (): void => {
    const g = growthNow()
    for (let i = RING_COUNT - 1; i >= 0; i--) {
      if (!canBuyRing(i)) continue
      for (let guard = 0; guard < 1000; guard++) {
        const price = ringBlockCost(NUMBER_TUNING.rings[i].baseCost, state.rings[i].bought, BLOCK_SIZE, g)
        if (state.number.lt(price)) break
        const got = buyUnits(i, BLOCK_SIZE, g)
        if (got === 0) break
      }
    }
  }

  const completeChallenge = (): void => {
    if (!active) return
    const log = log10N()
    phases.push({
      id: active.id,
      name: active.name,
      startMin: activeStartT / 60,
      endMin: t / 60,
      entryLog: activeEntryLog,
      goalLog: activeGoalLog,
      durationMin: (t - activeStartT) / 60,
      completed: true,
      penalty: active.penalty,
      reward: active.reward,
      boughtAtEnd: state.rings.map((r) => r.bought),
      amountsLogAtEnd: state.rings.map((r) => (r.amount.lte(0) ? -Infinity : r.amount.log10().toNumber())),
      logAtEnd: log
    })
    if (active.reward !== 'none' && !(cfg.skipRewards ?? []).includes(active.reward)) {
      rewards.add(active.reward)
      rewardTimes[active.reward] = t / 60
    }
    active = null
  }

  const enterChallenge = (): void => {
    const def = cfg.challenges[nextChallenge]
    if (!def) return
    const log = log10N()
    if (log < def.unlockLog) return
    active = def
    activeStartT = t
    activeEntryLog = log
    if (cfg.goalMode === 'duration') {
      activeGoalLog = Infinity
      activeTargetEndT = t + def.targetMin * 60
    } else {
      activeGoalLog = Math.max(def.planGoalLog, log + def.delta)
      activeTargetEndT = Infinity
    }
    lastAnyBuyT = t
    if (openingMin === null && nextChallenge === 0) openingMin = t / 60
    nextChallenge++
  }

  const maxSeconds = cfg.maxMinutes * 60
  while (t < maxSeconds) {
    tick(cfg.tickDt)
    t += cfg.tickDt

    const tapRate = cfg.tapsPerSec > 0 ? cfg.tapsPerSec : cfg.tapUntilFirstBuy && state.totalBuys === 0 ? 2 : 0
    if (tapRate > 0) {
      tapAcc += cfg.tickDt
      while (tapAcc >= 1 / tapRate) {
        tapAcc -= 1 / tapRate
        state.number = state.number.plus(1)
        if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
      }
    }

    buyAcc += cfg.tickDt
    const decisionDue = buyAcc >= cfg.decisionDt - 1e-9
    if (decisionDue) {
      buyAcc = 0
      if (active) {
        const done =
          cfg.goalMode === 'duration'
            ? t >= activeTargetEndT
            : log10N() >= activeGoalLog
        if (done) {
          if (cfg.goalMode === 'duration') activeGoalLog = log10N()
          completeChallenge()
        }
      }
      if (!active) enterChallenge()
      doBuy()
      if (cfg.stopAfterChallenges && !active && nextChallenge >= cfg.challenges.length) break
    }

    sampleAcc += cfg.tickDt
    if (sampleAcc >= sampleEvery * 60) {
      sampleAcc = 0
      samples.push({
        min: t / 60,
        log: log10N(),
        challenge: active ? active.id : '-',
        bought: state.rings.map((r) => r.bought),
        perSecLog: perSec.lte(0) ? -Infinity : perSec.log10().toNumber()
      })
    }

    while (nextMilestone < milestoneLogs.length && log10N() >= milestoneLogs[nextMilestone]) {
      milestoneHits.push({ log: milestoneLogs[nextMilestone], min: t / 60 })
      nextMilestone++
    }

    if (state.number.gte(GATE)) {
      gateMin = t / 60
      break
    }
    if (state.number.isNan() || !Number.isFinite(state.number.log10().toNumber())) {
      error = 'NaN/overflow at ' + (t / 60).toFixed(2) + ' min'
      break
    }
  }

  // Kapanmayan mucadele kaydi (gate'e ulasildiysa)
  if (active) {
    phases.push({
      id: active.id,
      name: active.name,
      startMin: activeStartT / 60,
      endMin: t / 60,
      entryLog: activeEntryLog,
      goalLog: activeGoalLog,
      durationMin: (t - activeStartT) / 60,
      completed: false,
      penalty: active.penalty,
      reward: active.reward,
      boughtAtEnd: state.rings.map((r) => r.bought),
      amountsLogAtEnd: state.rings.map((r) => (r.amount.lte(0) ? -Infinity : r.amount.log10().toNumber())),
      logAtEnd: log10N()
    })
  }

  return {
    totalMin: t / 60,
    gateMin,
    phases,
    samples,
    finalLog: log10N(),
    error,
    rewardTimes,
    maxBought,
    openingMin,
    milestones: milestoneHits
  }
}

export function fmtLog(v: number): string {
  if (!Number.isFinite(v)) return '-'
  return '1e' + v.toFixed(2)
}