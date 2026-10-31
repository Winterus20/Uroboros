/** Kayıt tipleri — yeni şema (SAVE_VERSION 24). */
import type { NotationType } from '../core/format'
import type { HumorLevel, MotionMode, MusicTrackId } from './settings'

export interface SaveSlotMeta {
  slot: number
  exists: boolean
  /** Slot kartında gösterilen sayı (ham string). */
  number?: string
  playtime?: number
  timestamp?: number
}

/** Çevrimdışı rapor — "Tekrar hoş geldin" modalı bunu gösterir. */
export interface OfflineReport {
  seconds: number
  capped: boolean
  gained: string
}

/** Tek halkanın kayıt şekli (kısa anahtarlar: kayıt boyutu önemli). */
export interface SerializedRing {
  /** amount */
  a: string
  /** bought */
  b: number
}

export interface SerializedSettings {
  notation: NotationType
  decimalPlaces: number
  humor: HumorLevel
  soundEnabled: boolean
  soundVolume: number
  musicEnabled: boolean
  musicVolume: number
  musicTrack: MusicTrackId
  motionMode: MotionMode
  swirlShaderQuality: 'off' | 'balanced' | 'high'
  batterySaver: boolean
  confirmDialogs: boolean
  hotkeysEnabled: boolean
  activeSlot: number
}

/**
 * 8 mücadelenin kayda yazılan durumu (v23; v24'te ADR-0086 ile anlamı değişti).
 *
 * Mücadele bir KOŞUDUR: giriş sayıyı 10'a, halkaları 0'a çeker (ADR-0086).
 * Hedef MUTLAKTIR; `entryLog10` yalnız ilerleme çubuğunun başlangıcıdır, hedefi
 * kaydırmaz. `lastBuyAt` çürüme cezasının okuduğu oyun saatidir.
 */
export interface SerializedChallenges {
  /** Tamamlanmış mücadele kimlikleri (`C1`…`C8`) — mandal, ödül kalıcı. */
  completed: string[]
  /** Aktif mücadele kimliği; yoksa `null`. */
  active: string | null
  /** Girişteki sayının log10 değeri (ilerleme çubuğu); mücadele yoksa `null`. */
  entryLog10: number | null
  /** Aktif mücadelenin MUTLAK hedefi (log10); mücadele yoksa `null`. */
  goalLog10: number | null
  /** Son alımın oyun zamanı (sn) — çürüme cezasının okuduğu saat. */
  lastBuyAt: number
  /**
   * En son satın alınan halka (0–7) — C7 "newestOnly" cezası okur.
   *
   * `-1` = bu koşuda henüz alım yapılmadı; o durumda C7 cezası hiçbir halkayı
   * tam saymaz (motorun `newestBoughtRing = -1` davranışı, engine.ts).
   */
  lastBoughtRing: number
}

/**
 * Diske/buluta yazılan tam durum (SAVE_VERSION 24).
 *
 * v22 (2026-10-25): boost/prestij/Tanım yükseltmeleri kaldırıldı; kayıttan
 * `boostMult`, `boosts`, `tanim`, `prestiges`, `upgrades` ve `gateReached`
 * alanları düştü. Eski kayıtlar (v20/v21) yine açılır: bilinmeyen alanlar yok
 * sayılır, sayı ve zincir korunur.
 *
 * v23 (2026-10-27, ADR-0083): tek koşu + 8 sıfırlamasız mücadele. Kayıt
 * `challenges` (mücadele durumu), `gateReached` (`1.79e308` mandalı) ve `tanim`
 * (prestij sayacı) alanlarını geri kazandı. v22 kayıtları bu üç alan olmadan da
 * açılır: deserialize onları VARSAYILANLA doldurur, oyuncu ilerlemesi korunur.
 *
 * v24 (2026-10-31, ADR-0086): AD tarzı sıfırlama + boost. Kayıt `boostCount`
 * alanını kazandı. v20-v23 kayıtları bu alan olmadan da açılır: deserialize
 * 0 ile doldurur; negatif/ondalıklı/NaN değerler temizlenir.
 */
export interface SerializedPlayerState {
  version: number
  number: string
  bestNumber: string
  rings: SerializedRing[]
  /** Halka kilitleri — mandallı (D6). */
  unlocked: boolean[]
  rung: number
  totalBuys: number
  /** v24 — satın alınmış boost sayısı; mücadele girişinde korunur, prestijde sıfırlanır. */
  boostCount: number
  taps: number
  uselessTaps: number
  playTime: number
  startedAt: number
  lastSeenAt: number
  settings: SerializedSettings
  seenVoice: string[]
  latched: string[]
  /** v23 — 8 mücadele durumu. v22 kayıtlarında yoktur. */
  challenges: SerializedChallenges
  /** v23 — `1.79e308` kapısı bir kez açıldı mı (mandal). */
  gateReached: boolean
  /** v23 — prestij sayacı (`Tanım`); yalnız kapıda artar. */
  tanim: number
}

export type SerializedGameState = SerializedPlayerState