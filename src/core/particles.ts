/**
 * Faz D — VS şöleni paylaşılan fizik/bütçe/sahne tablosu ("Aç Kumarhane" L4).
 *
 * Sözleşme: brain/context/visual-language.md §1/L4 + ADR-0060 §2.1/§2.5
 * Plan: brain/research/visual-language-hungry-parlor-implementation-plan-2026-10.md §7
 * Derin spec: brain/research/phase-d-feast-shower-deep-spec-2026-10.md §2
 *
 * Kurallar:
 * - SAF MODÜLDÜR: store/Vue/DOM/Canvas import etmez (Vitest `node` ortamında test edilir).
 * - Fizik JuiceLayer'da yaşar; bu modül yalnız REÇETE + BÜTÇE + PENCERE kararları verir.
 * - Renkler rezerve durum dilini ezmez (mor=katman, cyan=bonus, amber=prestij,
 *   feast=olay enerjisi). Sayı/etiket/ramp/tooltip seçicisi YOK (okunabilirlik kanonu).
 * - `any` YOK (strict).
 */

export type FeastSceneId =
  | 'supernova'
  | 'mass_burst'
  | 'hawking'
  | 'resonance'
  | 'crunch'
  | 'decade'
  | 'yut'

export type FeastShakeLevel = 'soft' | 'medium' | 'hard' | null

export interface FeastShockSpec {
  color: string
  maxRadius: number
  /** Bu katmandan kaç halka doğar (çekirdek katmanı dahil). */
  count: number
}

export interface FeastSceneSpec {
  id: FeastSceneId
  /** Toplam kıvılcım emisyonu (havuz cap'i öncesi istek). */
  sparks: number
  /** Halka katmanları (sırayla doğar; ilk ikisi ana+çekirdek disiplinindedir). */
  shocks: FeastShockSpec[]
  /** Yüzen yazı emisyonu (havuz cap'i öncesi istek). */
  texts: number
  shake: FeastShakeLevel
  /** Zemin knock-down süresi (ms; 0 = yok). */
  knockMs: number
  /** Bu sahnenin koyduğu suppression penceresi (ms; 0 = koymaz). */
  suppressionMs: number
  /** Yüzen yazı `big` bayrağı (boyut + dağılım). */
  big: boolean
}

/**
 * Sahne reçeteleri — renkler mevcut anomali diliyle birebir:
 * fyp mor (#a855f7), heart_frenzy cyan (#22d3ee), hawking açık-cyan (#67e8f9),
 * dekad amber (#fbbf24), crunch amber+feast imza, rezonans katmanlı.
 */
export const FEAST_SCENES: Record<FeastSceneId, FeastSceneSpec> = {
  supernova: {
    id: 'supernova',
    sparks: 40,
    shocks: [
      { color: '#a855f7', maxRadius: 200, count: 1 },
      { color: '#ffffff', maxRadius: 144, count: 1 }
    ],
    texts: 2,
    shake: 'medium',
    knockMs: 140,
    suppressionMs: 400,
    big: false
  },
  mass_burst: {
    id: 'mass_burst',
    sparks: 64,
    shocks: [
      { color: '#22d3ee', maxRadius: 230, count: 1 },
      { color: '#ffffff', maxRadius: 165, count: 1 }
    ],
    texts: 2,
    shake: 'hard',
    knockMs: 140,
    suppressionMs: 400,
    big: false
  },
  hawking: {
    id: 'hawking',
    sparks: 28,
    shocks: [{ color: '#67e8f9', maxRadius: 180, count: 1 }],
    texts: 1,
    shake: 'soft',
    knockMs: 0,
    suppressionMs: 0,
    big: false
  },
  resonance: {
    id: 'resonance',
    sparks: 96,
    shocks: [
      { color: '#a855f7', maxRadius: 220, count: 1 },
      { color: '#22d3ee', maxRadius: 230, count: 1 },
      { color: '#ff3355', maxRadius: 260, count: 1 },
      { color: '#ffffff', maxRadius: 170, count: 1 }
    ],
    texts: 3,
    shake: 'hard',
    knockMs: 140,
    suppressionMs: 400,
    big: true
  },
  crunch: {
    id: 'crunch',
    sparks: 110,
    shocks: [
      { color: '#f59e0b', maxRadius: 260, count: 1 },
      { color: '#ff3355', maxRadius: 300, count: 1 },
      { color: '#a855f7', maxRadius: 240, count: 1 },
      { color: '#ffffff', maxRadius: 180, count: 1 }
    ],
    texts: 3,
    shake: 'hard',
    knockMs: 200,
    suppressionMs: 600,
    big: true
  },
  decade: {
    id: 'decade',
    sparks: 24,
    shocks: [{ color: '#fbbf24', maxRadius: 220, count: 1 }],
    texts: 1,
    shake: 'medium',
    knockMs: 0,
    suppressionMs: 0,
    big: false
  },
  yut: {
    id: 'yut',
    sparks: 4,
    shocks: [],
    texts: 0,
    shake: null,
    knockMs: 0,
    suppressionMs: 0,
    big: false
  }
}

/** Havuz tavanları + zamanlama sabitleri (test kilitli). */
export const PARTICLE_BUDGET = {
  MAX_PARTICLES: 60,
  MAX_SHOCKWAVES: 8,
  MAX_SPARKS: 220,
  SUPPRESSION_WINDOW_MS: 400,
  KNOCK_DOWN_MS: 140
} as const

/** Suppression koyan (kareyi sessizleştiren) büyük sahneler. */
const BIG_SCENES: ReadonlySet<FeastSceneId> = new Set([
  'supernova',
  'mass_burst',
  'resonance',
  'crunch'
])

export function feastScene(id: FeastSceneId): FeastSceneSpec {
  return FEAST_SCENES[id]
}

export function isBigScene(id: FeastSceneId): boolean {
  return BIG_SCENES.has(id)
}

/**
 * Suppression penceresi: son büyük sahneden bu yana `windowMs` geçmediyse
 * yeni büyük sahne yarı emisyona iner (kare sessizleşir).
 * `crunch` bu pencereyi DELER (imza sahnesi hep tam oynar) — karar tüketici
 * tarafında verilir; bu fonksiyon yalnız zaman sorusunu yanıtlar.
 */
export function shouldSuppressFeast(
  nowMs: number,
  lastBigAtMs: number,
  windowMs: number = PARTICLE_BUDGET.SUPPRESSION_WINDOW_MS
): boolean {
  if (!Number.isFinite(nowMs) || !Number.isFinite(lastBigAtMs)) return false
  if (!Number.isFinite(windowMs) || windowMs <= 0) return false
  if (lastBigAtMs <= 0) return false
  return nowMs - lastBigAtMs < windowMs
}

export type FeastMotionMode = 'full' | 'reduced' | 'off'

/**
 * Motion ölçeği: full → tam; reduced → %35 (en az 1, crunch/resonance'ta
 * halka katmanı korunur ama tüketici ≤1'e indirir); off → 0.
 */
export function scaleCountForMode(count: number, mode: FeastMotionMode): number {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (mode === 'off') return 0
  if (mode === 'reduced') return n === 0 ? 0 : Math.max(1, Math.ceil(n * 0.35))
  return n
}

/**
 * Havuz emisyon kıskaçı: `want` istek, `live` canlı sayısı, `max` tavan.
 * Negatif/NaN girdiler 0'a iner; dönüş her zaman 0..(max-live) aralığındadır.
 */
export function clampEmission(want: number, live: number, max: number): number {
  const w = Number.isFinite(want) ? Math.max(0, Math.floor(want)) : 0
  const l = Number.isFinite(live) ? Math.max(0, Math.floor(live)) : 0
  const m = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 0
  return Math.max(0, Math.min(w, Math.max(0, m - l)))
}
