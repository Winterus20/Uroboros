import { Decimal, D_0, D_10 } from '../../core/math'
import {
  NUMBER_TUNING,
  RING_COUNT,
  RING_DIRECT_SHARE,
  maxAffordableCount,
  ringBlockCost,
  ringCostAt
} from './tuning'

/** Tek halka: kaç birim var, bu koşuda kaç kez satın alındı (maliyet için). */
export interface RingState {
  amount: Decimal
  bought: number
}

/**
 * 1. basamağın tüm sayısal durumu. Framework'ten bağımsız: Pinia yok, Vue yok —
 * böylece hem store hem saf testler aynı fonksiyonları kullanır.
 *
 * 2026-10-25: mini boost, prestij ve Tanım yükseltmeleri kaldırıldı. Oyun yalnız
 * zinciri büyütür: sıfırlama yoktur, sayı yalnız alımlarla düşer. `unlocked`
 * mandallıdır (D6): bir kez açılan halka kapanmaz.
 */
export interface NumberState {
  number: Decimal
  rings: RingState[]
  /** Halka kilitleri — bir kez açılır, kapanmaz (D6/S3). */
  unlocked: boolean[]
  /** Basamak (çapa) 1..11. Dikey dilimde daima 1. */
  rung: number
  /** Hayat boyu kazanılan en yüksek sayı. */
  bestNumber: Decimal
  totalBuys: number
}

export function createNumberState(): NumberState {
  return {
    number: D_10,
    rings: Array.from({ length: RING_COUNT }, () => ({ amount: D_0, bought: 0 })),
    unlocked: Array.from({ length: RING_COUNT }, (_, i) => i === 0),
    rung: 1,
    bestNumber: D_10,
    totalBuys: 0
  }
}

/** Halka açık mı? Kilitler mandallıdır (D6). */
export function ringUnlocked(state: NumberState, index: number): boolean {
  if (index <= 0) return true
  if (index >= RING_COUNT) return false
  return state.unlocked[index] === true
}

export function unlockedRingCount(state: NumberState): number {
  let count = 0
  for (let i = 0; i < RING_COUNT; i++) if (state.unlocked[i]) count++
  return count
}

export function ringCost(state: NumberState, index: number): Decimal {
  return ringCostAt(NUMBER_TUNING.rings[index].baseCost, state.rings[index].bought)
}

/** `count` birimin toplam fiyatı — AD'nin "Buy 10"ı: geometrik toplam. */
export function ringBlockPrice(state: NumberState, index: number, count: number): Decimal {
  return ringBlockCost(NUMBER_TUNING.rings[index].baseCost, state.rings[index].bought, count)
}

/** "Max" modunda bütçenin alabileceği birim sayısı (0 = alamaz). */
export function maxAffordableRing(state: NumberState, index: number): number {
  if (!ringUnlocked(state, index)) return 0
  return maxAffordableCount(NUMBER_TUNING.rings[index].baseCost, state.rings[index].bought, state.number)
}

export function canBuyRing(state: NumberState, index: number): boolean {
  return ringUnlocked(state, index) && state.number.gte(ringCost(state, index))
}

/**
 * Tek havuz: maliyet sayıdan düşülür (E2). Alım sayıyı düşürebilir —
 * `bestNumber` ve kilitler mandallı olduğu için hiçbir eşik geri gitmez (S3).
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
    // E11 + D6: eşik aşılınca sonraki halka KALICI olarak açılır
    if (state.rings[index].bought >= NUMBER_TUNING.unlockThreshold && index + 1 < RING_COUNT) {
      state.unlocked[index + 1] = true
    }
  }
  return bought
}

/** "Max" modu: bütçenin alabildiği kadar birim (tek tıkta, üst sınır 1000). */
export function buyRingMax(state: NumberState, index: number): number {
  return buyRing(state, index, maxAffordableRing(state, index))
}

/**
 * Halka `index`in SAYIYA doğrudan katkısı (birim başına /sn).
 * Halka 1 zaten sayının kendisidir (`p₀ = 1`), ona ikinci bir katkı eklenmez (E6).
 */
export function ringDirectRate(index: number): Decimal {
  if (index <= 0 || index >= RING_COUNT) return D_0
  return NUMBER_TUNING.rings[index].baseRate.times(RING_DIRECT_SHARE)
}

/** Halka 2–8'in sayıya doğrudan katkılarının toplamı. */
export function directNumberPerSecond(state: NumberState): Decimal {
  let total = D_0
  for (let i = 1; i < RING_COUNT; i++) {
    total = total.plus(state.rings[i].amount.times(ringDirectRate(i)))
  }
  return total
}

/**
 * Sayı üretimi: halka 1 (Fingers) sayıyı üretir (E6); halka 2–8 de sayıya doğrudan
 * yazar (`RING_DIRECT_SHARE`).
 */
export function numberPerSecond(state: NumberState): Decimal {
  return state.rings[0].amount.times(NUMBER_TUNING.rings[0].baseRate).plus(directNumberPerSecond(state))
}

/**
 * Halka n'in saniyede ürettiği miktar — BESLEME (indeks 0 için: Fingers'ın sayıya kattığı).
 *
 * Halka 1 kendi başına `/s`nin tamamı DEĞİLDİR: halka 2–8 de sayıya doğrudan yazar
 * (`ringNumberRate`). Toplam okuma `numberPerSecond`.
 */
export function ringGainPerSecond(state: NumberState, index: number): Decimal {
  if (index === 0) {
    return state.rings[0].amount.times(NUMBER_TUNING.rings[0].baseRate)
  }
  return state.rings[index].amount.times(NUMBER_TUNING.rings[index].baseRate)
}

/**
 * Halka `index`in sayıya DOĞRUDAN kattığı miktar. Halka 1 için 0 —
 * onun katkısı zaten `ringGainPerSecond(state, 0)`.
 */
export function ringNumberRate(state: NumberState, index: number): Decimal {
  const rate = ringDirectRate(index)
  if (rate.lte(0)) return D_0
  return state.rings[index].amount.times(rate)
}

/**
 * Bir tick ilerlet (20 TPS → dt = 0,05 sn).
 * Önce zincir beslenir (halka i+1 → halka i), sonra sayı üretilir: halka 1 (E6) + halka 2–8'in
 * doğrudan katkısı (`RING_DIRECT_SHARE`).
 */
export function advance(state: NumberState, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return
  for (let i = 0; i < RING_COUNT - 1; i++) {
    const feeder = state.rings[i + 1]
    const gain = feeder.amount.times(NUMBER_TUNING.rings[i + 1].baseRate).times(dt)
    state.rings[i].amount = state.rings[i].amount.plus(gain)
  }
  // Tek kaynak: `/s` okuması ile tick aynı formülü kullanır (Fingers + doğrudan katkı).
  const perSecond = numberPerSecond(state)
  if (perSecond.gt(0)) state.number = state.number.plus(perSecond.times(dt))
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
}

/** `+1` butonu: S9 — gerçekten 1 ekler, hiçbir çarpan uygulanmaz. */
export function manualTap(state: NumberState): Decimal {
  state.number = state.number.plus(1)
  if (state.number.gt(state.bestNumber)) state.bestNumber = state.number
  return state.number
}
