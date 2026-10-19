/**
 * Faz B — Bozulma altyapısı ("Aç Kumarhane" GIC faz-temelli bozulma merdiveni).
 *
 * Sözleşme: brain/context/visual-language.md §4 + ADR-0060 §2.2
 * Plan: brain/research/visual-language-hungry-parlor-implementation-plan-2026-10.md §2/§5
 *
 * Kurallar:
 * - SAF MODÜLDÜR: store/Vue import etmez, Decimal kullanmaz (sade sayılar).
 * - Kayıt formatına YENİ ALAN EKLEMEZ — mevcut monotonik sinyallerden türetir:
 *   `unlockedDimensionsCount` (lifetimePeakMatter tabanlı kütle kapıları; ADR-0072),
 *   `singularities` (kalıcı sayaç), `nightWatchUnlocked` (kalıcı boolean).
 * - Monotoniktir: prestij/sıçrama resetlerinde geriye DÜŞMEZ (sinyallerin hepsi monotonik).
 * - K5 tavanı: Faz 3 içeriği yok → derive son dönüşü min(level, 4). K5 açılınca kaldırılır.
 * - Okunabilirlik kanonu: bu modül yalnız ambient token değerleri üretir;
 *   sayı/etiket/ramp/tooltip asla bozulmaz (tüketici: style.css + Faz C/D).
 */

/** Bozulma seviyesi: K0 (steril) → K5 (kadim oburluk, şimdilik tavanlı). */
export type CorruptionLevel = 0 | 1 | 2 | 3 | 4 | 5

/** Türetme girdisi — üçü de monotonik kalıcı sinyaldir. */
export interface CorruptionInput {
  /** Monotonik açık boyut sayısı (resolvedUnlockedDimensionCount → lifetimePeakMatter tabanlı). */
  unlockedDimensionsCount: number
  /** Kalıcı prestij sayacı. */
  singularities: number
  /** Kalıcı Faz 2 bayrağı. */
  nightWatchUnlocked: boolean
}

/** K5 henüz içeriksiz olduğu için türetmenin dönebildiği üst sınır. */
export const MAX_CORRUPTION_LEVEL: CorruptionLevel = 4

export const CORRUPTION_STAMPS = ['K0', 'K1', 'K2', 'K3', 'K4', 'K5'] as const
export type CorruptionStamp = (typeof CORRUPTION_STAMPS)[number]

export interface CorruptionMeta {
  /** Türkçe görünen ad (debug/log/gelecekteki tooltip için; oyuncuya rozet olarak basılmaz). */
  label: string
  /** Substrat (L2) — Faz C tüketir (O5 tavanı: K2 %25, K4 %40). */
  substrateOpacity: number
  /** Motif bandı (L3) — Faz C tüketir (K4'te sürekli akış). */
  motifBandOpacity: number
  /** Bölgesel glitch şiddeti (0..1) — Faz C tüketir, yalnız dekoratif kenarda. */
  glitchIntensity: number
}

/**
 * Seviye → görsel şiddet tablosu.
 *
 * Tasarım notları (dış araştırma sentezi):
 * - ADR-0069: CRT (scanline/curvature/fosfor) katmanı kaldırıldı; bu tablo artık
 *   yalnız substrat + motif bandı + bölgesel glitch şiddetini taşır (statik, flaşsız).
 * - GIC: her cadının tek teması vardır; burada her FAZ tek motif grubudur.
 *   Substrat K2'de %25 ile başlar, K4'te %40 tavan yapar (okunabilirlik tavanı).
 * - VS: şölen ayrı katmandır (Faz D); buradaki değerler yalnız ambient tabandır.
 */
export const CORRUPTION_META: Record<CorruptionLevel, CorruptionMeta> = {
  0: {
    label: 'Steril Kumarhane',
    substrateOpacity: 0,
    motifBandOpacity: 0,
    glitchIntensity: 0
  },
  1: {
    label: 'Planck Aşınması',
    substrateOpacity: 0.06,
    motifBandOpacity: 0.08,
    glitchIntensity: 0.05
  },
  2: {
    label: 'Kozmik Yutuş',
    substrateOpacity: 0.25,
    motifBandOpacity: 0.25,
    glitchIntensity: 0.12
  },
  3: {
    label: 'Çöküş Sonrası',
    substrateOpacity: 0.32,
    motifBandOpacity: 0.45,
    glitchIntensity: 0.3
  },
  4: {
    label: 'Gece Nöbeti Substratı',
    substrateOpacity: 0.4,
    motifBandOpacity: 0.85,
    glitchIntensity: 0.45
  },
  5: {
    label: 'Kadim Oburluk',
    substrateOpacity: 0.55,
    motifBandOpacity: 1,
    glitchIntensity: 0.6
  }
}

function sanitizeUnlockedDimensionsCount(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.NaN
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(8, Math.floor(n)))
}

function sanitizeSingularities(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.NaN
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

/**
 * Bozulma seviyesini türet (deterministik + monotonik).
 *
 * Merdiven (plan §2.1 + O1 kararı — test kilitli):
 * - K0: unlocked < 5 (D5 kilitli, Faz 0 ilk yarısı)
 * - K1: unlocked >= 5 (D5 açılır — kütle kapısı 1e11, ADR-0072; mikro-karadelik doğar)
 * - K2: unlocked >= 6 (D6–D8 — Dünya → Güneş → Samanyolu; ilk eşik 1e15)
 * - K3: singularities >= 1 (ilk Big Crunch — Faz 1)
 * - K4: nightWatchUnlocked && singularities >= 1 (Faz 2)
 *
 * §2.2 çakışma notu: NIGHT_WATCH_THRESHOLD (1e308) şafak eşiğinden (1.79e308)
 * ÖNCE tetiklenir; naive `K4 = nightWatchUnlocked` K4'ü K3'ten önce doğururdu.
 * Bu yüzden K4, K3'ün ÜSTÜNE gate'lenir (nightWatch && singularities>=1).
 * K5 için gate yok → tavan uygulanır (şu an max K4).
 */
export function deriveCorruptionLevel(input: CorruptionInput): CorruptionLevel {
  const unlocked = sanitizeUnlockedDimensionsCount(input.unlockedDimensionsCount)
  const singularities = sanitizeSingularities(input.singularities)
  const nightWatch = input.nightWatchUnlocked === true

  let level = 0
  if (unlocked >= 5) level = 1
  if (unlocked >= 6) level = 2
  if (singularities >= 1) level = Math.max(level, 3)
  if (nightWatch && singularities >= 1) level = Math.max(level, 4)

  // Faz 3 gelince K5 gate'i buraya eklenecek ve tavan kaldırılacak.
  return Math.min(level, MAX_CORRUPTION_LEVEL) as CorruptionLevel
}

/** Seviye → kök mühür (`data-corruption="K0"..`"K5"`). */
export function corruptionStamp(level: CorruptionLevel): CorruptionStamp {
  const n = sanitizeSingularities(level)
  const clamped = Math.max(0, Math.min(5, n)) as CorruptionLevel
  return CORRUPTION_STAMPS[clamped]
}

/** Mühür → seviye (defansif ayrıştırma; bilinmeyen mühür K0'a düşer). */
export function parseCorruptionStamp(stamp: unknown): CorruptionLevel {
  if (typeof stamp !== 'string') return 0
  const idx = CORRUPTION_STAMPS.indexOf(stamp as CorruptionStamp)
  if (idx < 0) return 0
  return idx as CorruptionLevel
}
