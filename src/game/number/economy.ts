import { Decimal, D_0, D_1, D_10 } from '../../core/math'
import {
  BLOCK_MULT,
  BLOCK_SIZE,
  CHAIN_RATE,
  CHALLENGE_FEED_MULT,
  GATE,
  NUMBER_TUNING,
  RING_COUNT,
  RING_DIRECT_SHARE,
  maxAffordableCount,
  ringBlockCost,
  ringCostAt
} from './tuning'
import { activeChallenge, createChallengeState, type ChallengeState } from './challenges'

/** Tek halka: kaç birim var, bu koşuda kaç kez satın alındı (maliyet için). */
export interface RingState {
  amount: Decimal
  bought: number
}

/**
 * 1. basamağın tüm sayısal durumu. Framework'ten bağımsız: Pinia yok, Vue yok —
 * böylece hem store hem saf testler aynı fonksiyonları kullanır.
 *
 * v2 (2026-10-27): tek koşu, sıfırlama yok. Sayı yalnız alımlarla düşer;
 * `unlocked` mandallıdır (D6). Blok çarpanı (`blockFactor`) ÜRETİME girer,
 * BESLEMEYE girmez (contract §0). Mücadeleler sıfırlamasız katmanlardır:
 * giriş, çıkış ve tamamlama sayıyı, halkaları ve blok çarpanını DEĞİŞTİRMEZ.
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
  /** 8 mücadelenin durumu (contract §2). */
  challenges: ChallengeState
  /** Kapı (`1.79e308`) bir kez geçildi mi — mandal. */
  gateReached: boolean
  /** Kazanılan Tanım sayısı (prestij para birimi). */
  tanim: number
  /** Oyun zamanı (sn). Store doldurur; `decay` cezası bunu okur. */
  playTime?: number
}

export function createNumberState(): NumberState {
  return {
    number: D_10,
    rings: Array.from({ length: RING_COUNT }, () => ({ amount: D_0, bought: 0 })),
    unlocked: Array.from({ length: RING_COUNT }, (_, i) => i === 0),
    rung: 1,
    bestNumber: D_10,
    totalBuys: 0,
    challenges: createChallengeState(),
    gateReached: false,
    tanim: 0,
    playTime: 0
  }
}

/** Önbellek üst sınırı: bunun ötesinde üs doğrudan hesaplanır (bellek koruması). */
const MAX_CACHED_BLOCK_EXP = 20000

/** `BLOCK_MULT^k` önbelleği — tick sıcak yolunda Decimal üssü almayı önler. */
const BLOCK_POWERS: Decimal[] = [D_1]

/**
 * Blok çarpanı: `5,5 ^ floor(bought / 10)`.
 *
 * 190 dk kalibrasyonunun ana kolu. Her 10 alım üretimi ×5,5 yapar. Yalnız ÜRETİME
 * uygulanır: Fingers'ın sayı üretimi ve halka 2–8'in doğrudan katkısı. Zincir
 * BESLEMESİNE uygulanmaz (contract §0).
 *
 * 0–9 alım ×1 · 10–19 ×5,5 · 20–29 ×30,25 … `bought` negatif veya NaN ise ×1.
 * Dönen Decimal paylaşımlıdır: DEĞİŞTİRİLMEMELİDİR (math.ts kuralı).
 */
export function blockFactor(bought: number): Decimal {
  if (!Number.isFinite(bought) || bought < BLOCK_SIZE) return D_1
  const exp = Math.floor(bought / BLOCK_SIZE)
  if (exp <= 0) return D_1
  if (exp > MAX_CACHED_BLOCK_EXP) return new Decimal(BLOCK_MULT).pow(exp)
  while (BLOCK_POWERS.length <= exp) {
    BLOCK_POWERS.push(BLOCK_POWERS[BLOCK_POWERS.length - 1].times(BLOCK_MULT))
  }
  return BLOCK_POWERS[exp]
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

/**
 * Aktif mücadelenin fiyat çarpanı (g); mücadele yoksa normal 1,20.
 * Contract §1: her mücadele kendi fiyat artışını dayatır (C2 1,45 · C8 1,35 ·
 * diğerleri 1,22).
 */
export function costGrowth(state: NumberState): number {
  const def = activeChallenge(state)
  return def ? def.growth : NUMBER_TUNING.costGrowth
}

/** Bir halkanın tek birim fiyatı (aktif mücadelenin fiyat çarpanıyla). */
export function ringCost(state: NumberState, index: number): Decimal {
  return ringCostAt(NUMBER_TUNING.rings[index].baseCost, state.rings[index].bought, costGrowth(state))
}

/** `count` birimin toplam fiyatı — AD'nin "Buy 10"ı: geometrik toplam. */
export function ringBlockPrice(state: NumberState, index: number, count: number): Decimal {
  return ringBlockCost(NUMBER_TUNING.rings[index].baseCost, state.rings[index].bought, count, costGrowth(state))
}

/**
 * Mücadele cezaları alımı yasaklıyor mu?
 * C1 `fingersCap`: Fingers 10 alımdan sonra alınamaz (mevcut üretim sayılır).
 * C5 `firstFive`: 5–7. halkalar alınamaz (mevcut üretim sayılır).
 */
export function purchasesBlocked(state: NumberState, index: number): boolean {
  const def = activeChallenge(state)
  if (!def) return false
  if (def.penalty === 'fingersCap' && index === 0 && state.rings[0].bought >= BLOCK_SIZE) return true
  if (def.penalty === 'firstFive' && index >= 5) return true
  return false
}

/**
 * Halka satın alınabilir durumda mı? Açık VE aktif mücadele cezası alımı
 * yasaklamıyor. Bütçeye BAKMAZ (fiyat okuması ayrı).
 */
export function isRingPurchasable(state: NumberState, index: number): boolean {
  if (index < 0 || index >= RING_COUNT) return false
  if (!ringUnlocked(state, index)) return false
  return !purchasesBlocked(state, index)
}

/** Halka açık, ceza izin veriyor ve bütçe yetiyor mu? (özgün sözleşme) */
export function canBuyRing(state: NumberState, index: number): boolean {
  if (!isRingPurchasable(state, index)) return false
  return state.number.gte(ringCost(state, index))
}

/** "Max" modunda bütçenin alabileceği birim sayısı (0 = alamaz). */
export function maxAffordableRing(state: NumberState, index: number): number {
  if (!isRingPurchasable(state, index)) return 0
  return maxAffordableCount(
    NUMBER_TUNING.rings[index].baseCost,
    state.rings[index].bought,
    state.number,
    costGrowth(state)
  )
}

/**
 * Tek havuz: maliyet sayıdan düşülür (E2). Alım sayıyı düşürebilir —
 * `bestNumber` ve kilitler mandallı olduğu için hiçbir eşik geri gitmez (S3).
 *
 * Her alım `challenges.lastBuyAt` (oyun zamanı) ve `challenges.lastBoughtRing`
 * alanlarını günceller: C4 `decay` ve C7 `newestOnly` bunları okur.
 *
 * @returns gerçekten alınan birim sayısı (0 = yetersiz sayı / kilitli / ceza)
 */
export function buyRing(state: NumberState, index: number, count = 1): number {
  if (index < 0 || index >= RING_COUNT) return 0
  const growth = costGrowth(state)
  const ring = state.rings[index]
  const base = NUMBER_TUNING.rings[index].baseCost
  let bought = 0
  for (let i = 0; i < count; i++) {
    if (purchasesBlocked(state, index)) break
    if (!ringUnlocked(state, index)) break
    const cost = ringCostAt(base, ring.bought, growth)
    if (state.number.lt(cost)) break
    state.number = state.number.minus(cost)
    ring.amount = ring.amount.plus(1)
    ring.bought += 1
    state.totalBuys += 1
    bought++
    // C4: çürüme zamanı · C7: en son alınan halka
    state.challenges.lastBuyAt = state.playTime ?? 0
    state.challenges.lastBoughtRing = index
    // E11 + D6: eşik aşılınca sonraki halka KALICI olarak açılır
    if (ring.bought >= NUMBER_TUNING.unlockThreshold && index + 1 < RING_COUNT) {
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
 * `Max All`: en derin halkadan başlayarak 10'lu bloklar hâlinde alım.
 *
 * Contract §3: her halkada bütçe bitene kadar blok alınır, sonra bir alt halkaya
 * geçilir. Alt halkayı almak yeni bir halkayı açabildiği için geçişler
 * yinelenir (en fazla RING_COUNT geçiş; her geçiş en az bir blok almalı).
 *
 * @returns toplam alınan birim sayısı
 */
export function maxAll(state: NumberState): number {
  let total = 0
  for (let pass = 0; pass < RING_COUNT; pass++) {
    let boughtThisPass = 0
    for (let i = RING_COUNT - 1; i >= 0; i--) {
      if (!isRingPurchasable(state, i)) continue
      for (let guard = 0; guard < 1000; guard++) {
        if (state.number.lt(ringBlockPrice(state, i, BLOCK_SIZE))) break
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

/**
 * C4 çürüme çarpanı: alım yoksa üretim `exp(-Δ/20)` ile düşer, taban 0,10.
 * Mücadele aktif değilse (veya başka ceza) 1 döner.
 */
export function decayMultiplier(state: NumberState): number {
  if (activeChallenge(state)?.penalty !== 'decay') return 1
  const now = state.playTime ?? 0
  const since = Math.max(0, now - state.challenges.lastBuyAt)
  return Math.max(0.1, Math.exp(-since / 20))
}

/**
 * Bir halkanın ÜRETİM çarpanı: kazanılmış ödüller + aktif cezalar.
 * Blok çarpanı (`blockFactor`) buraya GİRMEZ — ayrı ve halkaya özgüdür.
 *
 * Ödüller (contract §1, sabit değerler — B'ye bağlı üs yok):
 *   C1 fingers10 → Fingers ×10 · C2 all5 → hepsi ×5 · C3 all3 → hepsi ×3
 *   C4 first3x5 → halka 0–2 ×5 · C5 direct5 → halka 1–7 ×5
 *   C7 all4 → hepsi ×4 · C8 finisher → hepsi ×2
 * C6 `feed15` üretime değil beslemeye yazar (bkz. `feedMultiplier`).
 */
export function ringProductionMultiplier(state: NumberState, index: number): number {
  const completed = state.challenges.completed
  let m = 1
  if (index === 0 && completed.includes('C1')) m *= 10
  if (completed.includes('C2')) m *= 5
  if (completed.includes('C3')) m *= 3
  if (index < 3 && completed.includes('C4')) m *= 5
  if (index >= 1 && completed.includes('C5')) m *= 5
  if (completed.includes('C7')) m *= 4
  if (completed.includes('C8')) m *= 2
  const def = activeChallenge(state)
  if (def?.penalty === 'newestOnly') {
    // `-1` / `undefined` = bu koşuda hiç alım yok: ceza uygulanmaz (engine `newest = -1`).
    const newest = state.challenges.lastBoughtRing ?? -1
    if (newest >= 0 && index !== newest) m *= 0.25
  }
  if (def?.penalty === 'decay') m *= decayMultiplier(state)
  return m
}

/**
 * Zincir besleme çarpanı — `CHAIN_RATE`e biner. Blok çarpanı BURAYA GİRMEZ.
 *
 * Ödüller: C1 feed ×1,5 · C5 feed ×1,5 · C6 feed ×1,5.
 * Cezalar: C6 feed ÷5 · C8 feed ÷2.
 * Global: mücadele aktifken ×0,2 (açılış ve final itişi tam besleme).
 */
export function feedMultiplier(state: NumberState): number {
  const completed = state.challenges.completed
  let m = 1
  if (completed.includes('C1')) m *= 1.5
  if (completed.includes('C5')) m *= 1.5
  if (completed.includes('C6')) m *= 1.5
  const def = activeChallenge(state)
  if (def) {
    if (def.penalty === 'feedFifth') m /= 5
    if (def.penalty === 'price135feedHalf') m /= 2
    m *= CHALLENGE_FEED_MULT
  }
  return m
}

/**
 * Halka `index`in SAYIYA doğrudan katkısı (birim başına /sn).
 * Halka 1 zaten sayının kendisidir (`p₀ = 1`), ona ikinci bir katkı eklenmez (E6).
 */
export function ringDirectRate(index: number): Decimal {
  if (index <= 0 || index >= RING_COUNT) return D_0
  return NUMBER_TUNING.rings[index].baseRate.times(RING_DIRECT_SHARE)
}

/**
 * Halka `index`in sayıya doğrudan kattığı miktar. Halka 1 için 0 —
 * onun katkısı zaten `ringGainPerSecond(state, 0)`.
 * C3 `directOff` cezası bu kanalı tamamen kapatır.
 */
export function ringNumberRate(state: NumberState, index: number): Decimal {
  if (index <= 0 || index >= RING_COUNT) return D_0
  if (activeChallenge(state)?.penalty === 'directOff') return D_0
  const amount = state.rings[index].amount
  if (amount.lte(0)) return D_0
  const base = NUMBER_TUNING.rings[index].baseRate.times(RING_DIRECT_SHARE)
  return amount
    .times(base)
    .times(blockFactor(state.rings[index].bought))
    .times(ringProductionMultiplier(state, index))
}

/** Halka 2–8'in sayıya doğrudan katkılarının toplamı. */
export function directNumberPerSecond(state: NumberState): Decimal {
  let total = D_0
  for (let i = 1; i < RING_COUNT; i++) {
    total = total.plus(ringNumberRate(state, i))
  }
  return total
}

/**
 * Sayı üretimi: halka 1 (Fingers) sayıyı üretir (E6); halka 2–8 de sayıya doğrudan
 * yazar (`RING_DIRECT_SHARE`). Blok çarpanı yalnız bu iki üretim kanalına uygulanır.
 */
export function numberPerSecond(state: NumberState): Decimal {
  return ringGainPerSecond(state, 0).plus(directNumberPerSecond(state))
}

/**
 * Halka `index`in ÜRETTİĞİ miktar (sn başına).
 *
 * - Halka 0 (Fingers): sayıya kattığı — blok çarpanı ve üretim çarpanları dahil.
 * - Halka 1–7: bir altındaki halkayı besleme hızı — `CHAIN_RATE × feedMultiplier`.
 *   Blok çarpanı burada YOKTUR (contract §0).
 */
export function ringGainPerSecond(state: NumberState, index: number): Decimal {
  if (index <= 0) {
    const fingers = state.rings[0]
    return fingers.amount
      .times(NUMBER_TUNING.rings[0].baseRate)
      .times(blockFactor(fingers.bought))
      .times(ringProductionMultiplier(state, 0))
  }
  if (index >= RING_COUNT) return D_0
  return state.rings[index].amount
    .times(NUMBER_TUNING.rings[index].baseRate)
    .times(feedMultiplier(state))
}

/**
 * Bir tick ilerlet (20 TPS → dt = 0,05 sn).
 *
 * Sıra: önce zincir beslenir (halka i+1 → i, `CHAIN_RATE × feedMultiplier`,
 * blok çarpanı YOK), sonra sayı üretilir (`numberPerSecond`). Mücadele örtüsü
 * ikisinde de geçerlidir. Sayı sıfırlanmaz; `bestNumber` mandallıdır.
 */
export function advance(state: NumberState, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return
  const feed = CHAIN_RATE * feedMultiplier(state)
  if (feed > 0) {
    for (let i = 0; i < RING_COUNT - 1; i++) {
      const feeder = state.rings[i + 1]
      if (feeder.amount.lte(0)) continue
      state.rings[i].amount = state.rings[i].amount.plus(feeder.amount.times(feed).times(dt))
    }
  }
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

/**
 * Kapı geçişi: sayı `1.79e308`e ulaştıysa mandalı bir kez kurar.
 * Store her tick sonunda çağırır (`advance` saf kalır; olay store'da doğar).
 * @returns bu tick'te kapı ilk kez açıldıysa `true`
 */
export function checkGate(state: NumberState): boolean {
  if (state.gateReached) return false
  // Prestij bir kez alındıysa kapı bir daha açılmaz: 2. basamak bu build'de yok
  // ve aynı koşuda kapıyı tekrar tetiklemek modalı sonsuz döngüye sokardı.
  if (state.tanim > 0) return false
  if (state.rung !== 1) return false
  if (state.number.lt(GATE)) return false
  state.gateReached = true
  return true
}