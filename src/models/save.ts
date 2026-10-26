/** Kayıt tipleri — yeni şema (SAVE_VERSION 22). */
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
 * Diske/buluta yazılan tam durum (SAVE_VERSION 22).
 *
 * v22 (2026-10-25): boost/prestij/Tanım yükseltmeleri kaldırıldı; kayıttan
 * `boostMult`, `boosts`, `tanim`, `prestiges`, `upgrades` ve `gateReached`
 * alanları düştü. Eski kayıtlar (v20/v21) yine açılır: bilinmeyen alanlar yok
 * sayılır, sayı ve zincir korunur.
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
  taps: number
  uselessTaps: number
  playTime: number
  startedAt: number
  lastSeenAt: number
  settings: SerializedSettings
  seenVoice: string[]
  latched: string[]
}

export type SerializedGameState = SerializedPlayerState
