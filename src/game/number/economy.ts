import { Decimal, D_0, D_1, D_10 } from '../../core/math'
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
 * Kural (S3): `peak` mandallıdır, alım düşürse de geri gitmez; `number` serbest
 * inip çıkar (E2). `bestNumber` hayat boyu rekor. `unlocked` de mandallıdır (D6).
 */
export interface NumberState {
  number: Decimal
  /** Bu koşudaki en yüksek sayı — boost çarpanının girdisi (E14). */
  peak: Decimal
  rings: RingState[]
  /** Halka kilitleri — bir kez açılır, boost/prestij kapatmaz (D6/S3). */
  unlocked: boolean[]
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
    unlocked: Array.from({ length: RING_COUNT }, (_, i) => i === 0),
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
 * `peak`, `bestNumber` ve kilitler mandallı olduğu için hiçbir eşik geri gitmez (S3).
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
 * `Birikim` cezası (E7): kapı aşımı arttıkça üretim verimi düşer.
 * Yalnız SAYI üretimine uygulanır (D1 ile aynı gerekçe).
 */
export function productionEfficiency(state: NumberState): Decimal {
  const ratio = state.number.div(NUMBER_TUNING.gate)
  if (ratio.lte(1)) return D_1
  return new Decimal(NUMBER_TUNING.efficiencyBase).pow(ratio.log10())
}

/**
 * Halka `index`in SAYIYA doğrudan katkısı (birim başına /sn).
 * Halka 1 zaten sayının kendisidir (`p₀ = 1`), ona ikinci bir katkı eklenmez (E6).
 */
export function ringDirectRate(index: number): Decimal {
  if (index <= 0 || index >= RING_COUNT) return D_0
  return NUMBER_TUNING.rings[index].baseRate.times(RING_DIRECT_SHARE)
}

/** Halka 2–8'in sayıya doğrudan katkılarının toplamı — çarpanlar ve verim hariç. */
export function directNumberPerSecond(state: NumberState): Decimal {
  let total = D_0
  for (let i = 1; i < RING_COUNT; i++) {
    total = total.plus(state.rings[i].amount.times(ringDirectRate(i)))
  }
  return total
}

/**
 * Sayı üretimi: halka 1 (Fingers) sayıyı üretir (E6); halka 2–8 de sayıya doğrudan
 * yazar (`RING_DIRECT_SHARE`). Çarpanlar: boost (D1) × zincir yükseltmesi × Birikim verimi.
 */
export function numberPerSecond(state: NumberState): Decimal {
  const base = state.rings[0].amount.times(NUMBER_TUNING.rings[0].baseRate).plus(directNumberPerSecond(state))
  return base.times(state.boostMult).times(state.chainMult).times(productionEfficiency(state))
}

/**
 * Halka n'in saniyede ürettiği miktar — BESLEME (indeks 0 için: Fingers'ın sayıya kattığı).
 * D1: boost çarpanı halka beslemesine UYGULANMAZ — zincir kendi hızında akar.
 *
 * Halka 1 kendi başına `/s`nin tamamı DEĞİLDİR: halka 2–8 de sayıya doğrudan yazar
 * (`ringNumberRate`). Toplam okuma `numberPerSecond`.
 */
export function ringGainPerSecond(state: NumberState, index: number): Decimal {
  if (index === 0) {
    return state.rings[0].amount
      .times(NUMBER_TUNING.rings[0].baseRate)
      .times(state.boostMult)
      .times(state.chainMult)
      .times(productionEfficiency(state))
  }
  return state.rings[index].amount.times(NUMBER_TUNING.rings[index].baseRate).times(state.chainMult)
}

/**
 * Halka `index`in sayıya DOĞRUDAN kattığı miktar (çarpanlar dahil). Halka 1 için 0 —
 * onun katkısı zaten `ringGainPerSecond(state, 0)`.
 */
export function ringNumberRate(state: NumberState, index: number): Decimal {
  const rate = ringDirectRate(index)
  if (rate.lte(0)) return D_0
  return state.rings[index].amount
    .times(rate)
    .times(state.boostMult)
    .times(state.chainMult)
    .times(productionEfficiency(state))
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
 * Mini boost: sayı başlangıca döner, her halka 1 birime iner (D3 — zincir canlı kalır),
 * kilitler AÇIK kalır (D6). Karşılığında basamak içi KALICI üretim çarpanı (E12).
 * Tanım VERMEZ.
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
    ring.amount = D_1
    ring.bought = 0
  }
  state.gateReached = false
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
    const gain = feeder.amount.times(NUMBER_TUNING.rings[i + 1].baseRate).times(state.chainMult).times(dt)
    state.rings[i].amount = state.rings[i].amount.plus(gain)
  }
  // Tek kaynak: `/s` okuması ile tick aynı formülü kullanır (Fingers + doğrudan katkı).
  const perSecond = numberPerSecond(state)
  if (perSecond.gt(0)) state.number = state.number.plus(perSecond.times(dt))
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
