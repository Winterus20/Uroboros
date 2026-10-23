import { Decimal, D_0, D_1, D_10 } from '../../core/math'
import { NUMBER_TUNING, RING_COUNT, ringCostAt } from './tuning'

/** Tek halka: kaç birim var, kaç kez satın alındı (maliyet için). */
export interface RingState {
  amount: Decimal
  bought: number
}

/**
 * 1. basamağın tüm sayısal durumu. Framework'ten bağımsız: Pinia yok, Vue yok —
 * böylece hem store hem saf testler aynı fonksiyonları kullanır.
 *
 * Kural (S3): `peak` mandallıdır, alım düşürse de geri gitmez; `number` serbest
 * inip çıkar (E2). `bestNumber` hayat boyu rekor.
 */
export interface NumberState {
  number: Decimal
  /** Bu koşudaki en yüksek sayı — boost çarpanının girdisi (E14). */
  peak: Decimal
  rings: RingState[]
  /** Mini boost'ların biriktirdiği kalıcı çarpan (basamak içi). */
  boostMult: Decimal
  boosts: number
  /** Basamak (çapa) 1..11. Dikey dilimde daima 1. */
  rung: number
  /** Harcanabilir prestij para birimi (E7). */
  tanim: Decimal
  /** Hayat boyu kazanılan Tanım (istatistik). */
  tanimTotal: Decimal
  prestiges: number
  bestNumber: Decimal
  totalBuys: number
  totalBoosts: number
  /** Kapı bir kez aşıldı mı (mandal — sahne bir kez oynar, S3). */
  gateReached: boolean
  /** Prestij sonrası başlangıç sayısı — `start` yükseltmesiyle büyür (varsayılan 10). */
  startNumber: Decimal
  /** `chain` yükseltmesinin zincir üretim çarpanı (varsayılan 1). */
  chainMult: Decimal
  /** `boost` yükseltmesinin boost üssü (varsayılan 0,2). */
  boostExp: number
}

export function createNumberState(): NumberState {
  return {
    number: D_10,
    peak: D_10,
    rings: Array.from({ length: RING_COUNT }, () => ({ amount: D_0, bought: 0 })),
    boostMult: D_1,
    boosts: 0,
    rung: 1,
    tanim: D_0,
    tanimTotal: D_0,
    prestiges: 0,
    bestNumber: D_10,
    totalBuys: 0,
    totalBoosts: 0,
    gateReached: false,
    startNumber: D_10,
    chainMult: D_1,
    boostExp: NUMBER_TUNING.boostExponent
  }
}

/** Halka açık mı? Halka 1 daima açık; halka n, n-1'den 10 birim alınınca açılır (E11). */
export function ringUnlocked(state: NumberState, index: number): boolean {
  if (index <= 0) return true
  if (index >= RING_COUNT) return false
  return state.rings[index - 1].bought >= NUMBER_TUNING.unlockThreshold
}

export function unlockedRingCount(state: NumberState): number {
  let count = 1
  for (let i = 1; i < RING_COUNT; i++) {
    if (!ringUnlocked(state, i)) break
    count++
  }
  return count
}

export function ringCost(state: NumberState, index: number): Decimal {
  return ringCostAt(NUMBER_TUNING.rings[index].baseCost, state.rings[index].bought)
}

export function canBuyRing(state: NumberState, index: number): boolean {
  return ringUnlocked(state, index) && state.number.gte(ringCost(state, index))
}

/**
 * Tek havuz: maliyet sayıdan düşülür (E2). Alım sayıyı düşürebilir —
 * `peak` ve `bestNumber` mandallı olduğu için hiçbir eşik geri gitmez (S3).
 *
 * @returns gerçekten alınan birim sayısı (0 = yetersiz sayı / kilitli halka)
 */
export function buyRing(state: NumberState, index: number, count = 1): number {
  if (index < 0 || index >= RING_COUNT) return 0
  let bought = 0
  for (let i = 0; i < count; i++) {
    if (!canBuyRing(state, index)) break
    state.number = state.number.minus(ringCost(state, index))
    state.rings[index].amount = state.rings[index].amount.plus(1)
    state.rings[index].bought += 1
    state.totalBuys += 1
    bought++
  }
  return bought
}

/**
 * Sayı üretimi: yalnızca halka 1 (Parmaklar) sayı üretir (E6).
 * `Birikim` cezası (E7) tüm üretime uygulanır.
 */
export function productionEfficiency(state: NumberState): Decimal {
  const ratio = state.number.div(NUMBER_TUNING.gate)
  if (ratio.lte(1)) return D_1
  return new Decimal(NUMBER_TUNING.efficiencyBase).pow(ratio.log10())
}

/** Tüm üretime uygulanan ortak çarpan: boost × zincir yükseltmesi × verim. */
export function productionMultiplier(state: NumberState): Decimal {
  return state.boostMult.times(state.chainMult).times(productionEfficiency(state))
}

export function numberPerSecond(state: NumberState): Decimal {
  return state.rings[0].amount.times(NUMBER_TUNING.rings[0].baseRate).times(productionMultiplier(state))
}

/** Halka n'in saniyede ürettiği miktar (indeks 0 için: sayı/sn). */
export function ringGainPerSecond(state: NumberState, index: number): Decimal {
  if (index === 0) return numberPerSecond(state)
  return state.rings[index].amount.times(NUMBER_TUNING.rings[index].baseRate).times(productionMultiplier(state))
}

/** Mini boost açık mı? Zincirin son halkası alınmış olmalı (E13). */
export function canBoost(state: NumberState): boolean {
  return state.rings[RING_COUNT - 1].bought > 0
}

/** Boost ödülü: zirveye bağlı (E14). Zirve başlangıcın altındaysa 1 (nötr). */
export function boostMultiplier(state: NumberState): Decimal {
  if (state.peak.lte(state.startNumber) || state.startNumber.lte(0)) return D_1
  return state.peak.div(state.startNumber).pow(state.boostExp)
}

/**
 * Mini boost: 8 halka da, sayı da sıfırlanır (başlangıç sayısına); karşılığında
 * basamak içi KALICI üretim çarpanı verilir (E12). Tanım VERMEZ.
 *
 * @returns uygulanan çarpan (uygulanamadıysa 1)
 */
export function applyBoost(state: NumberState): Decimal {
  if (!canBoost(state)) return D_1
  const gain = boostMultiplier(state)
  state.boostMult = state.boostMult.times(gain)
  state.boosts += 1
  state.totalBoosts += 1
  resetRun(state)
  return gain
}

/** Kapı aşıldı mı (prestij hazır)? */
export function gateReady(state: NumberState): boolean {
  return state.number.gte(NUMBER_TUNING.gate)
}

/** Aşım oranı: sayı / kapı (prestij ödülünün girdisi, E7). */
export function overflowRatio(state: NumberState): Decimal {
  return state.number.div(NUMBER_TUNING.gate)
}

/** Prestij ödülü: Tanım = log10(1 + A), A = sayı / kapı (E7). */
export function tanimReward(state: NumberState): Decimal {
  if (!gateReady(state)) return D_0
  return overflowRatio(state).plus(1).log10()
}

/**
 * Prestij: Tanım kazanılır, sayı başlangıca döner, zincir yeniden kurulur (S2).
 *
 * Dikey dilim notu: 2. basamak henüz tasarlanmadı (E5) — bu yüzden `rung`
 * ŞİMDİLİK 1'de kalır ve oyuncu Tanım yükseltmeleriyle 1. basamağı tekrar oynar.
 * Basamak geçişi 2. basamak yazıldığında buraya bağlanacak.
 *
 * @returns kazanılan Tanım (kapı kapalıysa 0)
 */
export function applyPrestige(state: NumberState): Decimal {
  const reward = tanimReward(state)
  if (reward.lte(0)) return D_0
  state.tanim = state.tanim.plus(reward)
  state.tanimTotal = state.tanimTotal.plus(reward)
  state.prestiges += 1
  state.boostMult = D_1
  state.boosts = 0
  resetRun(state)
  return reward
}

/** Koşu sıfırlama (boost ve prestij aynı sıfırlamayı kullanır). */
function resetRun(state: NumberState): void {
  state.number = state.startNumber
  state.peak = state.startNumber
  for (const ring of state.rings) {
    ring.amount = D_0
    ring.bought = 0
  }
  state.gateReached = false
}

/**
 * Bir tick ilerlet (20 TPS → dt = 0,05 sn).
 * Üretim zinciri: halka i+1 → halka i, halka 1 → sayı (E6).
 */
export function advance(state: NumberState, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return
  const mult = productionMultiplier(state)
  for (let i = 0; i < RING_COUNT - 1; i++) {
    const ring = state.rings[i]
    const feeder = state.rings[i + 1]
    if (feeder.amount.lte(0)) continue
    const gain = feeder.amount.times(NUMBER_TUNING.rings[i + 1].baseRate).times(mult).times(dt)
    ring.amount = ring.amount.plus(gain)
  }
  const perSecond = state.rings[0].amount.times(NUMBER_TUNING.rings[0].baseRate).times(mult)
  if (perSecond.gt(0)) {
    state.number = state.number.plus(perSecond.times(dt))
  }
  if (state.number.gt(state.peak)) state.peak = state.number
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
  if (!state.gateReached && state.number.gte(NUMBER_TUNING.gate)) state.gateReached = true
}

/** `+1` butonu: S9 — gerçekten 1 ekler, hiçbir çarpan uygulanmaz. */
export function manualTap(state: NumberState): Decimal {
  state.number = state.number.plus(1)
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
  return state.number
}
