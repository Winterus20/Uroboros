// Pahali saf-fonksiyon sonuclarinin modul-seviyesi memo cacheleri. Vue computed
// ic fonksiyonlari her cagrida yeniden hesapladigi icin burada tutulur.
import { Decimal } from '../../core/math'
import { ACHIEVEMENTS } from '../../game/achievements'
import { challengeRewardEffects as computeChallengeRewardEffects } from '../../game/challenges'
import { computeNeuralEffects } from '../../game/neural-data'
import { FEATURE_UNLOCKS } from '../../game/unlocks'
import type { ChallengeRewardEffects } from '../../game/challenges'
import type { NeuralEffects } from '../../models/types'

// ---- Performans: saf-fonksiyon memo'ları (Vue computed iç fonksiyonları her çağrıda yeniden hesaplar) ----
export let _challengeEffKey = ''
export let _challengeEffVal: ChallengeRewardEffects | null = null

// completedChallenges join'u: getDimensionMultiplier ve memoChallengeEffects aynı
// diziyi tick başına onlarca kez birleştiriyordu (2026-10-15 ölçümü). Dizi ya
// push ile büyür (uzunluk değişir) ya da yeni referansla değiştirilir (reset/kayıt
// yükleme) — (referans, uzunluk) anahtarı bu iki mutasyon biçimini de yakalar.
let _completedJoinSrc: readonly string[] | null = null
let _completedJoinLen = -1
let _completedJoinVal = ''
export function memoCompletedJoin(completed: readonly string[]): string {
  if (_completedJoinSrc === completed && _completedJoinLen === completed.length) {
    return _completedJoinVal
  }
  _completedJoinSrc = completed
  _completedJoinLen = completed.length
  _completedJoinVal = completed.join(',')
  return _completedJoinVal
}

export function memoChallengeEffects(completed: readonly string[]): ChallengeRewardEffects {
  const key = memoCompletedJoin(completed)
  if (_challengeEffVal && _challengeEffKey === key) return _challengeEffVal
  _challengeEffKey = key
  _challengeEffVal = computeChallengeRewardEffects(completed)
  return _challengeEffVal
}

export let _neuralEffKey = ''
export let _neuralEffVal: NeuralEffects | null = null
export function memoNeuralEffects(bought: Record<string, number>): NeuralEffects {
  const keys = Object.keys(bought).sort()
  let key = ''
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    key += k + ':' + (bought[k] || 0) + ';'
  }
  if (_neuralEffVal && _neuralEffKey === key) return _neuralEffVal
  _neuralEffKey = key
  _neuralEffVal = computeNeuralEffects(bought)
  return _neuralEffVal
}

// Boyut çarpanı iç-fonksiyon memo'su (tier başına tek girdi)
export const _dimMultCache = new Map<number, { key: string; val: Decimal }>()

// Başarım çarpanı memo'su (ADR-0029). Başarımlar kalıcıdır ve yalnızca eklenir.
export let _achMultCache: { len: number; val: Decimal } | null = null

/**
 * Kayıttan gelen başarım id'lerini beyaz listeye karşı süzmek için.
 * calcAchievementMultiplier() yalnızca listenin UZUNLUĞUNA bakar; bozuk bir
 * kayıt bilinmeyen bir id enjekte ederse küresel çarpan sessizce şişerdi.
 */
export const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id))

/** Kayıttan gelen unlockedFeatures id'lerini süzmek için özellik merdiveni beyaz listesi. */
export const FEATURE_IDS = new Set(FEATURE_UNLOCKS.map((f) => f.id))

/** achievementMultiplier memo'sunu düşürür — kayıt yüklendiğinde çağrılmalı. */
export function resetAchievementCache(): void {
  _achMultCache = null
}

/** Basarim carpan memo okuma/yazma erisimi (modul disi atama ESM'de yasak oldugu icin). */
export function getAchMultCache(): { len: number; val: Decimal } | null {
  return _achMultCache
}

export function setAchMultCache(v: { len: number; val: Decimal } | null): void {
  _achMultCache = v
}

// ADR-0029: kategori -> başarım tanımları indeksi. Modül yükünde bir kez kurulur;
// checkAchievements() içinde ACHIEVEMENTS.filter() çağırmak O(n²) idi (her aday
// için 66 kayıt taranıyordu).
export const ACHIEVEMENTS_BY_CATEGORY = new Map<string, typeof ACHIEVEMENTS>()
for (const def of ACHIEVEMENTS) {
  const bucket = ACHIEVEMENTS_BY_CATEGORY.get(def.category)
  if (bucket) bucket.push(def)
  else ACHIEVEMENTS_BY_CATEGORY.set(def.category, [def])
}
export function dimMultCacheKey(
  tier: number,
  bought: number,
  shifts: number,
  eyeLvl: number,
  sac: string,
  partnerBought: number,
  neuralProd: number,
  offlineBoost: number,
  activeChallenge: string | null,
  dim1Growth: string,
  completedJoin: string,
  capFloor: number,
  peakMatter: string,
  formatBuffTier: number,
  formatBuffUntil: number,
  challengeTimeMult: number,
  formatBuffActive: boolean,
  relicCount = 0,
  matureCellsCount = 0,
  speedChipLevel = 0
): string {
  // NOT (ADR-0029): formatBuffActive ve challengeTimeMult TÜREV alanlardır. Ham
  // formatBuffUntil zaman damgası tek başına yeterli değildir: süre dolduğunda damga
  // değişmez, anahtar değişmez ve bayat (süresiz) çarpan cache'ten geri döner.
  // Sürüm 12'de bu, geçici "Format Keşfi" bonusunun kalıcılaşmasına yol açıyordu.
  // NOT (ADR-0072): boyut açılışı tepe kütleye bağlıdır; `shifts` sayacı artık
  // açılışı değiştirmez ama `peakMatter` bir kapıyı aştığında tier pasifi
  // (tierProductionMult) değişebildiği için anahtarda yer almalı.
  // NOT (M1 v2): `speedChipLevel` ÜRETİM ÇARPANI'nı değiştirir (1.1^seviye).
  // Anahtarda YER ALMASI ZORUNLU: çip alındıktan sonra çarpan bayat kalırsa
  // üretim sessizce eski değerle çalışır (sessiz hata) — bkz. speed-chip.test.ts.
  return (
    tier + '|' + bought + '|' + shifts + '|' + eyeLvl + '|' + sac + '|' + partnerBought + '|' +
    neuralProd + '|' + offlineBoost + '|' + (activeChallenge || '') + '|' +
    dim1Growth + '|' + completedJoin + '|' + capFloor + '|' + peakMatter + '|' + formatBuffTier +
    '|' + formatBuffUntil + '|' + challengeTimeMult + '|' + (formatBuffActive ? 'A' : 'X') +
    '|' + relicCount + '|' + matureCellsCount + '|' + speedChipLevel
  )
}

// Boyut maliyeti iç-fonksiyon memo'su (paket başına değil, kova başına)
export const _dimCostCache = new Map<number, { key: string; val: Decimal }>()
