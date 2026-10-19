// Denge sabitleri ve maliyet matematigi: boyut maliyet tablolari, erken-merdiven
// oranlari, challenge denge sabitleri, koloni/offline esikleri ve kova maliyeti
// hesaplayicilari. Saf moduldur; store import etmez.
import { D_0, D_1, Decimal } from '../core/math'
import { getChallengeById } from './challenges'
import type { ResolutionMilestone } from '../models/types'

export const MIRROR_PAIRS: Record<number, { partnerTier: number; label: string }> = {
  1: { partnerTier: 8, label: 'Samanyolu & Karadelik (D8)' },
  2: { partnerTier: 7, label: 'Yıldızlar & Güneş (D7)' },
  3: { partnerTier: 6, label: 'Gezegenler & Dünya (D6)' },
  4: { partnerTier: 5, label: 'Laboratuvar & Şehir (D5)' },
  5: { partnerTier: 4, label: 'Kuark Çorbası (D4)' },
  6: { partnerTier: 3, label: 'Nükleer Çekirdek (D3)' },
  7: { partnerTier: 2, label: 'Elektron Orbitalleri (D2)' },
  8: { partnerTier: 1, label: 'Moleküler Bağlar (D1)' }
}

export const RESOLUTION_MILESTONES: ResolutionMilestone[] = [
  { count: 50, name: 'Kovalent Rezonans', shortName: 'Rezonans', mult: 2, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', desc: '2× Çarpan' },
  { count: 100, name: 'Bohr Yarıçapı', shortName: 'Bohr', mult: 3, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', desc: '3× Çarpan' },
  { count: 200, name: 'Kuantum Tünelleme', shortName: 'Tünelleme', mult: 4, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30', desc: '4× Çarpan + %1 Çekim Payı' },
  { count: 250, name: 'Olay Ufku Yoğunluğu', shortName: 'Olay Ufku', mult: 8, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30', desc: '8× Çarpan' },
  { count: 500, name: 'Tekillik Çekirdeği', shortName: 'Tekillik', mult: 16, colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30', desc: '16× Çarpan' },
  { count: 1000, name: 'Uroboros Çöküşü', shortName: 'Uroboros', mult: 32, colorClass: 'text-white bg-white/20 border-white/40', desc: '32× Çarpan' }
]

// Taban fiyatlar ve 10'alık kova başına çarpanlar (ADR-0051 testleri de okur).
export const BASE_COSTS = [
  new Decimal(10),
  new Decimal(100),
  new Decimal(1e4),
  new Decimal(1e6),
  new Decimal(1e9),
  new Decimal(1e13),
  new Decimal(1e18),
  new Decimal(1e24)
]

export const COST_MULTS = [
  new Decimal(1e3),
  new Decimal(1e4),
  new Decimal(1e5),
  new Decimal(1e6),
  new Decimal(1e8),
  new Decimal(1e10),
  new Decimal(1e12),
  new Decimal(1e15)
]

export const DIMENSION_CHAIN_RATE = 0.060

/** Erken koşu maliyet duvarı: D1/D2 için ×1000/adım yerine yumuşak merdiven (ADR-0026). */
export const EARLY_D1_COST_RATIO = 55
export const EARLY_D1_SOFT_BUCKETS = 4
export const EARLY_D2_COST_RATIO = 42
export const EARLY_D2_SOFT_BUCKETS = 3
/** D3/D4 yumuşak merdiven: milyardan trilyona geçişteki 1e9-1e14 duvarını çözer */
export const EARLY_D3_COST_RATIO = 32
export const EARLY_D3_SOFT_BUCKETS = 3
export const EARLY_D4_COST_RATIO = 28
export const EARLY_D4_SOFT_BUCKETS = 2
/** D5/D6 yumuşak merdiven: Shift 2 ve Shift 3'teki 1e9->1e17 ölümcül uçurumu çözer */
export const EARLY_D5_COST_RATIO = 24
export const EARLY_D5_SOFT_BUCKETS = 2
export const EARLY_D6_COST_RATIO = 20
export const EARLY_D6_SOFT_BUCKETS = 2

/**
 * Yeni koşuda açık format sayısı tabanı: 3 (D1+D2+D3).
 * ADR-0072: bu taban SABİTTİR; D4–D8 artık sıçramadan değil deterministik kütle
 * eşiklerinden (`DIMENSION_UNLOCK_GATES`) açılır. ADR-0033'ün "D4 1. sıçramada
 * açılır" maddesi bu ADR ile süperseeded edildi.
 */
export const BASE_UNLOCKED_DIMENSIONS = 3

/**
 * D4–D8 açılış kapıları — TEK KAYNAK (ADR-0072 §2).
 *
 * Türetme kuralı: eşik = boyutun `BASE_COSTS` taban fiyatının 100 katı.
 * D4 (1e6) → 1e8, D5 (1e9) → 1e11, D6 (1e13) → 1e15, D7 (1e18) → 1e20,
 * D8 (1e24) → 1e26. Sıçrama sayısı bu tabloda YOKTUR.
 *
 * PROVISIONAL: değerler P0 ölçümü ile kilitlenecek
 * (bkz. brain/research/pacing-p0-baseline-2026-10.md); ölçüm öncesi değişebilir.
 */
export const DIMENSION_UNLOCK_GATES: ReadonlyArray<{ tier: number; minMatter: string }> = [
  { tier: 4, minMatter: '1e8' },
  { tier: 5, minMatter: '1e11' },
  { tier: 6, minMatter: '1e15' },
  { tier: 7, minMatter: '1e20' },
  { tier: 8, minMatter: '1e26' }
]

/** Kapı eşiklerinin Decimal ön-derlemesi — sıcak yolda yeni Decimal ayırmamak için. */
const DIMENSION_UNLOCK_GATE_VALUES = DIMENSION_UNLOCK_GATES.map((gate) => ({
  tier: gate.tier,
  minMatter: new Decimal(gate.minMatter)
}))

/** D2+ satın alımında alt kata anında aktarılan “zincir darbesi” (sn); üst sayaçların hissedilir hızlanması için. */
export const PURCHASE_CHAIN_BONUS_SECONDS = 2.5
export const PURCHASE_MATTER_TICK_SECONDS = 0.45

// Satın alınan her 10 adette boyut çarpanı artışı:
// 1.58 iken ilk koşu 4s 11dk sürüyordu. 1.595 değeri kaskadı yumuşak hızlandırarak ilk koşuyu tam 3s 30dk altın standardına kilitler.
export const DIM_PER_TEN_MULT = 1.595

// ---- Gece Kriz Meydan Okumaları (Faz 3: denge sabitleri) ----
// C2: alım sonrası tam durma biter, üretim 60 sn'de lineer rampayla döner.
export const CHALLENGE_HALT_RAMP_SEC = 60
// C8: Sıçrama/Küme bildirim sayacının bu kadarını temizler.
export const CHALLENGE_DOOM_RELIEF = 0.6
// C8: sayaç Sıçrama/Küme sayısıyla ivmelenir (uyuyan oyuncu için offline'da donar).
export const CHALLENGE_DOOM_SHIFT_ACCEL = 0.15
export const CHALLENGE_DOOM_GALAXY_ACCEL = 0.25
// C8 fırtına eğrisi: %100'de ×0.5, her +%25 taşmada ek ×0.75, taban ×0.15.
export const CHALLENGE_STORM_BASE = 0.5
export const CHALLENGE_STORM_STEP = 0.75
export const CHALLENGE_STORM_FLOOR = 0.15
// C7: kilitli tier'lar Sıçrama/Küme gereksinimini D6 formatına göre ölçekler.
export const CHALLENGE_C7_TIER_COST_STEP = 5
export const CHALLENGE_C7_GALAXY_COST_MULT = 1.5

/** Aktif challenge'ın boyut üst sınırı (C7); yoksa tanımsız. Registry üzerinden okunur. */
export function challengeDimensionCap(state: { activeChallenge: string | null }): number | undefined {
  if (!state.activeChallenge) return undefined
  return getChallengeById(state.activeChallenge)?.modifiers.maxDimensions
}

/** Tepe kütlenin aştığı kapı sayısı (0..5). NaN/geçersiz girdi güvenli tarafta 0 döner. */
export function dimensionGateUnlockCount(lifetimePeakMatter?: Decimal): number {
  if (!lifetimePeakMatter) return 0
  if (lifetimePeakMatter.isNan() || Number.isNaN(lifetimePeakMatter.mag)) return 0
  let opened = 0
  for (const gate of DIMENSION_UNLOCK_GATE_VALUES) {
    if (!lifetimePeakMatter.gte(gate.minMatter)) break
    opened++
  }
  return opened
}

/**
 * Açık boyut sayısı — ADR-0072: taban + deterministik kütle kapıları.
 *
 * - Sıçrama terimi (`dimensionShifts` / `lifetimePeakShifts`) artık kullanılmaz;
 *   o alanlar yalnızca istatistik olarak state'te ve kayıtta kalır.
 * - Açılış kaynağı `lifetimePeakMatter`dır: monotoniktir (ADR-0035 "açılış bir
 *   OLAYdır"), böylece yeni kayıt alanı ve migrasyon gerekmez.
 * - `dimensionCapFloor` (save v12 legacy taban) ve `challengeDimensionCap` (C7)
 *   davranışı korunur.
 */
export function resolvedUnlockedDimensionCount(state: {
  dimensionCapFloor: number
  activeChallenge: string | null
  lifetimePeakMatter?: Decimal
}): number {
  const gateCap = Math.min(
    8,
    BASE_UNLOCKED_DIMENSIONS + dimensionGateUnlockCount(state.lifetimePeakMatter)
  )
  const base = Math.max(gateCap, state.dimensionCapFloor)
  const cap = challengeDimensionCap(state)
  return cap === undefined ? base : Math.min(base, cap)
}

/** Aktif C5 koşusunun birikimli maliyet şişmesi (×1.5^sayaç); koşu-dışı ×1. Azami 1e12 softcap. */
export function challengeCostInflationMult(state: {
  activeChallenge: string | null
  challengeCostInflation: number
}): Decimal {
  if (!state.activeChallenge || state.challengeCostInflation <= 0) return D_1
  const step = getChallengeById(state.activeChallenge)?.modifiers.costInflationOnBuy
  if (step === undefined) return D_1
  // Denge: Enflasyon en fazla 1e12 katına kadar şişebilir; aşılamaz kilitlenmeyi (softlock) önler
  const raw = Decimal.pow(step, state.challengeCostInflation)
  return raw.gt(1e12) ? new Decimal(1e12) : raw
}

export const GUILT_NAMES = [
  'Kuantum Radyasyon Paraziti',
  'Olay Ufku Kütle Kaçağı',
  'Gravitasyonel Enerji Emicisi',
  'Hawking Işıması Paraziti',
  'Kozmik Kütleçekim Sülüğü'
]

// ---- Faz 2 Kilometre Taşı: Kolektif Gece Nöbeti (GDD "İkinci Çöküş") ----
// ADR-0032/0033: eşik 1e4000'den 1e308'e taşındı. Özellik merdivenindeki
// `night_watch` basamağı `decadeGate(308)` kullanıyor; iki değer ayrışırsa
// panel "KİLİTLİ" gösterirken merdiven "açıldı" der. Şafak eşiğinin (1.79e308)
// hemen altında tetiklenir, yani güneş doğmadan önceki son nöbet anıdır.
export const NIGHT_WATCH_THRESHOLD = new Decimal('1e308')

// ---- QoL: Çevrimdışı/arka plan yakalama üst sınırı (24 saat) ----
export const OFFLINE_CAP_SECONDS = 24 * 3600

// ---- Nöral İzleme Kolonisi & Toplu Uyku (Synergism: Ant Colony & Sacrifice) ----
export const COLONY_CORE_COST = new Decimal(1e22)
export const COLONY_MIN_NAP_BOTS = 100
export const COLONY_BREED_RATE = 0.008 // %0.8/s baz üreme hızı (~87 sn'de çiftlenme)
export const COLONY_PASSIVE_LOG_FACTOR = 0.5 // pasif çarpan: 1 + log10(bots) × 0.5

// ---- Performans: pahalı kontrollerin seyreltilmesi ----
export const ACH_CHECK_INTERVAL = 0.5 // başarım kontrolü en sık 0.5 sn'de bir
export const UNLOCK_CHECK_INTERVAL = 0.5 // özellik merdiveni en sık 0.5 sn'de bir

/** Önbellek Temizleme'nin açılış eşiği (ADR-0035): hayat boyu 5. Akış Sıçraması. */
export const SACRIFICE_SHIFT_REQ = 5

export const MAX_BUY_PACKS_CAP_FIRST_RUN = 380
export const MAX_BUY_PACKS_CAP_PRESTIGE = 2800

export function maxBuyPacksCap(singularities: number): number {
  return singularities > 0 ? MAX_BUY_PACKS_CAP_PRESTIGE : MAX_BUY_PACKS_CAP_FIRST_RUN
}

// ---- Azalan Getirili Yumuşak Tavan (ADR-0054) ----
// Ölçüm (brain/scratchpad/harness/out/run-fullbuff-active.mjs, "hold" modu): full buff
// aktif oyuncu resetleri tutup 1 saat beklediğinde kütle 1e6.840.000'a ulaştı. Sebep
// üç çarpanın "taban^alım sayısı" ile süresiz büyümesi + D8→D1 zincirinin her çarpanı
// 8 kez uygulaması (log10(kütle) ≈ 8 × log10(1/galaxyBonus) × tickspeed alımı).
// Maliyet ivmesi (ADR-0051) yalnızca maliyeti değil, bu iki üstel gücü de besliyordu.
//
// Kural: eşik ALTINDAHAM davranış byte-identical — erken/orta oyun ve mevcut
// testler kirlenmez. Eşik üstünde etkili alım sayısı logaritmik büyür:
//   eff = threshold + log2(fazlalık + 1) × gain
// Böylece üretim çarpanı tekrar maliyetle yarışır, döngü kazancı 1'in altına iner
// ve koşu sonlu bir denge noktasında (yumuşak tavan) durur.
export const TICKSPEED_CAP_THRESHOLD = 500
export const TICKSPEED_CAP_GAIN = 20
export const BUCKET_CAP_THRESHOLD = 500
export const BUCKET_CAP_GAIN = 20
export const SHIFT_CAP_THRESHOLD = 20
export const SHIFT_CAP_GAIN = 1

/**
 * Ham satın alma/kovasayaçını "azalan getirili" etkili sayıya çevirir.
 * Saf fonksiyon: eşik altı ham değeri aynen döndürür (deterministik, test edilebilir).
 */
export function diminishingPurchaseCount(raw: number, threshold: number, gain: number): number {
  if (!Number.isFinite(raw)) return 0
  if (raw <= threshold) return Math.max(0, raw)
  return threshold + Math.log2(raw - threshold + 1) * gain
}

// ---- Kademeli Maliyet İvmelenmesi (ADR-0051) ----
// Antimatter Dimensions "Break Infinity" adaptasyonu: erken oyunda kova maliyeti
// sabit oranla (COST_MULTS) büyürken geç oyunda oranın KENDİSİ kova sayısıyla
// ivmelenir. Sonuç: bir dekad bütçesiyle giderek daha az alım yapılır, dekad
// başına süre monoton artar ve koşunun sonunda gerçek bir maliyet duvarı doğar.
/**
 * İvmelenmenin başladığı kova eşiği (10 adet = 1 kova).
 * Eşik altındaki tüm kovalarda maliyet ADR-0023 (3s30d altın standardı) ve
 * ADR-0026 (yumuşak erken merdivenler) ile birebir aynı kalır.
 */
export const B0_BUCKET_THRESHOLD = 30
/**
 * Eşiğin her kova üstü için eklenen maliyet ivmesi (ondalık basamak / kova).
 * 0.02 → kova 50'de bir sonraki kova 1 ondalık, kova 80'de 2 ondalık daha pahalı.
 */
export const COST_ACCEL_DECADES_PER_STEP = 0.011

/**
 * Kademeli ivmelenme çarpanı: cost(b) = merdiven_maliyeti × 10^(S·d(d-1)/2), d = b - B0.
 * d = 0 (eşik) ve d = 1 (ilk adım) için çarpan tam 1 olduğundan hem maliyet değeri hem
 * de ilk oran (cost(B0+1)/cost(B0) = fullMult) eski formülle birebir aynıdır — B0'da
 * ani sıçrama yok. Sonraki oranlar fullMult × 10^(S·d) şeklinde doğrusal ivmelenir.
 */
export function dimensionCostAccelerationFactor(bucket: number): Decimal {
  if (bucket <= B0_BUCKET_THRESHOLD) return D_1
  const d = bucket - B0_BUCKET_THRESHOLD
  return Decimal.pow(10, (COST_ACCEL_DECADES_PER_STEP * d * (d - 1)) / 2)
}

/**
 * Kova maliyeti — ivmelenme ÖNCESİ taban formül (ADR-0023/ADR-0026 merdivenleri).
 * Yalnız `dimensionCostForBucket` içinden çağrılır; dışarıdan doğrudan kullanılmaz.
 */
export function dimensionCostWithoutAcceleration(
  tier: number,
  bucket: number,
  baseCost: Decimal,
  fullMult: Decimal
): Decimal {
  if (tier === 1) {
    if (bucket < EARLY_D1_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D1_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D1_COST_RATIO, EARLY_D1_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D1_SOFT_BUCKETS))
  }
  if (tier === 2) {
    if (bucket < EARLY_D2_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D2_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D2_COST_RATIO, EARLY_D2_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D2_SOFT_BUCKETS))
  }
  if (tier === 3) {
    if (bucket < EARLY_D3_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D3_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D3_COST_RATIO, EARLY_D3_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D3_SOFT_BUCKETS))
  }
  if (tier === 4) {
    if (bucket < EARLY_D4_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D4_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D4_COST_RATIO, EARLY_D4_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D4_SOFT_BUCKETS))
  }
  if (tier === 5) {
    if (bucket < EARLY_D5_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D5_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D5_COST_RATIO, EARLY_D5_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D5_SOFT_BUCKETS))
  }
  if (tier === 6) {
    if (bucket < EARLY_D6_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D6_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D6_COST_RATIO, EARLY_D6_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D6_SOFT_BUCKETS))
  }
  return baseCost.times(Decimal.pow(fullMult, bucket))
}

/**
 * Kova maliyeti — tüm satın alma yollarının (buyDimension, buyMaxDimension,
 * buyDimensionUnits, buyOneUnit, botlar, UI fiyat gösterimi) tek darboğazı.
 * B0 eşiği altına dokunmaz; eşik üstüne kademeli ivmelenme çarpanını uygular.
 *
 * PERFORMANS (2026-10-15 ölçümü): Tek çağrı iki Decimal.pow içerdiği için
 * ~18µs sürüyordu; autobuyer'lar her tick aynı kovaları yüzlerce kez yeniden
 * hesaplıyordu (geç oyunda tick ~13ms). Kova maliyeti (tier, kova) girdisiyle
 * deterministiktir ve baseCost/fullMult koşu boyunca modül sabitlerinin
 * referanslarıdır (hiçbir yerde atanmaz). Referans eşitliği koruması sayesinde
 * farklı bir girdi referansı görülürse o tier'ın cache'i sıfırlanır; test ve
 * kayıt göçü senaryolarında her zaman doğru sonuç döner.
 */
interface BucketCostCache {
  baseCost: Decimal
  fullMult: Decimal
  costs: Map<number, Decimal>
}

const bucketCostCache = new Map<number, BucketCostCache>()

function computeBucketCost(
  tier: number,
  bucket: number,
  baseCost: Decimal,
  fullMult: Decimal
): Decimal {
  const cost = dimensionCostWithoutAcceleration(tier, bucket, baseCost, fullMult)
  if (bucket <= B0_BUCKET_THRESHOLD) return cost
  return cost.times(dimensionCostAccelerationFactor(bucket))
}

export function dimensionCostForBucket(
  tier: number,
  bucket: number,
  baseCost: Decimal,
  fullMult: Decimal
): Decimal {
  let entry = bucketCostCache.get(tier)
  if (!entry || entry.baseCost !== baseCost || entry.fullMult !== fullMult) {
    entry = { baseCost, fullMult, costs: new Map() }
    bucketCostCache.set(tier, entry)
  }
  const cached = entry.costs.get(bucket)
  if (cached !== undefined) return cached
  const value = computeBucketCost(tier, bucket, baseCost, fullMult)
  entry.costs.set(bucket, value)
  return value
}

export function calcDimensionExactTotal(
  tier: number,
  baseCost: Decimal,
  fullMult: Decimal,
  bought: number,
  packs: number,
  flat: Decimal
): Decimal {
  if (packs <= 0) return D_0
  let total = D_0
  let remaining = 10 * packs
  let cursor = bought
  while (remaining > 0) {
    const bucket = Math.floor(cursor / 10)
    const take = Math.min(10 - (cursor % 10), remaining)
    const bucketCost = dimensionCostForBucket(tier, bucket, baseCost, fullMult)
    // Performans: hizalı tam kovalarda birim fiyat (kova/10) yeniden çarpılmaz;
    // kova fiyatının kendisi toplanır. Kısmi kovalarda eski yol birebir korunur.
    total = take === 10
      ? total.plus(bucketCost)
      : total.plus(bucketCost.div(10).times(take))
    cursor += take
    remaining -= take
  }
  return total.times(flat)
}

export function calcMaxDimensionPacks(
  tier: number,
  baseCost: Decimal,
  fullMult: Decimal,
  startBucket: number,
  budget: Decimal,
  cap: number
): number {
  if (budget.lte(0)) return 0
  const first = dimensionCostForBucket(tier, startBucket, baseCost, fullMult)
  if (budget.lt(first)) return 0
  let n = 0
  let spent = D_0
  while (n < cap) {
    const next = dimensionCostForBucket(tier, startBucket + n, baseCost, fullMult)
    if (spent.plus(next).gt(budget)) break
    spent = spent.plus(next)
    n++
  }
  return n
}

// ---- Performans: geometrik seri yardımcıları (buyMax döngüsüz) ----
export function calcGeometricTotal(base: Decimal, ratio: Decimal, startBucket: number, packs: number): Decimal {
  if (packs <= 0) return D_0
  const denom = ratio.minus(1)
  if (denom.eq(0)) {
    return base.times(Decimal.pow(ratio, startBucket)).times(packs)
  }
  const ratioPowStart = Decimal.pow(ratio, startBucket)
  const ratioPowPacks = Decimal.pow(ratio, packs)
  return base.times(ratioPowStart).times(ratioPowPacks.minus(1)).div(denom)
}

export function calcMaxPacks(
  base: Decimal,
  ratio: Decimal,
  startBucket: number,
  budget: Decimal,
  cap = MAX_BUY_PACKS_CAP_FIRST_RUN
): number {
  if (budget.lte(0)) return 0
  const first = base.times(Decimal.pow(ratio, startBucket))
  if (budget.lt(first)) return 0
  const ratioNum = ratio.toNumber()
  if (!Number.isFinite(ratioNum) || ratioNum <= 1) {
    const linear = budget.div(first).floor().toNumber()
    if (!Number.isFinite(linear)) return 0
    return Math.max(0, Math.min(cap, Math.floor(linear)))
  }
  const budgetLog = budget.log10().toNumber()
  const firstLog = first.log10().toNumber()
  const ratioLog = Math.log10(ratioNum)
  if (!Number.isFinite(budgetLog) || !Number.isFinite(firstLog) || !Number.isFinite(ratioLog) || ratioLog <= 0) return 0
  const rMinus1 = ratioNum - 1
  let est: number
  const diff = budgetLog - firstLog
  if (diff > 15) {
    est = Math.floor((diff + Math.log10(rMinus1)) / ratioLog)
  } else {
    const approx = budget.div(first).toNumber() * rMinus1 + 1
    if (!Number.isFinite(approx) || approx <= 1) return 0
    est = Math.floor(Math.log10(approx) / ratioLog)
  }
  if (!Number.isFinite(est)) return 0
  let n = Math.max(0, Math.min(cap, est))
  for (let guard = 0; guard < 8; guard++) {
    if (n <= 0) break
    if (calcGeometricTotal(base, ratio, startBucket, n).lte(budget)) break
    n--
  }
  for (let guard = 0; guard < 8; guard++) {
    if (n >= cap) break
    if (calcGeometricTotal(base, ratio, startBucket, n + 1).lte(budget)) n++
    else break
  }
  return n
}

// ---- Tickspeed tekil maliyet: tickspeedCost getter ile birebir (floor sırası dahil) ----
export function tickspeedStepCost(
  step: number,
  base: Decimal,
  ratio: Decimal,
  infl: Decimal,
  isPrivate: boolean,
  hasDiscount: boolean,
  effMult: number
): Decimal {
  let c = base.times(Decimal.pow(ratio, step)).times(infl)
  if (isPrivate) c = c.times(0.85).floor()
  if (hasDiscount) c = c.times(0.95).floor()
  if (effMult !== 1) c = c.times(effMult).floor()
  return c
}

export function calcTickspeedExactTotal(
  start: number,
  count: number,
  base: Decimal,
  ratio: Decimal,
  infl: Decimal,
  isPrivate: boolean,
  hasDiscount: boolean,
  effMult: number
): Decimal {
  if (count <= 0) return D_0
  // Performans (2026-10-15 ölçümü: 120 adımda ~0.5ms): indirim/floor katmanları
  // devrede değilken toplam saf geometrik seridir; adım adım toplamak yerine
  // kapalı form kullanılır. Bu, buyMaxTickspeed'in tahmin (calcMaxPacks) ile
  // birebir aynı formülü olduğundan ileri/geri düzeltme döngüleri de kısalır.
  // floor katmanı varken (özel mod/başarım/meydan okuma) her adım değeri
  // değiştirdiği için eski döngü birebir korunur — maliyet matematiği değişmez.
  if (!isPrivate && !hasDiscount && effMult === 1) {
    return calcGeometricTotal(base.times(infl), ratio, start, count)
  }
  let total = D_0
  for (let i = 0; i < count; i++) {
    total = total.plus(tickspeedStepCost(start + i, base, ratio, infl, isPrivate, hasDiscount, effMult))
  }
  return total
}
