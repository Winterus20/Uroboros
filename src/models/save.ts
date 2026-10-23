/** Kayıt tipleri — yeni şema (SAVE_VERSION 20). */
import type { NotationType } from '../core/format'
import type { HumorLevel, MotionMode, MusicTrackId } from './settings'

export interface SaveSlotMeta {
  slot: number
  exists: boolean
  /** Slot kartında gösterilen sayı (ham string). */
  number?: string
  /** Prestij (kapı) sayısı. */
  prestiges?: number
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
 * Diske/buluta yazılan tam durum (SAVE_VERSION 20).
 * P5: pivot öncesi kayıtlar (v19 ve altı) açılmaz — sürüm artırıldı, eski kayıt "uyumsuz".
 */
export interface SerializedPlayerState {
  version: number
  number: string
  peak: string
  bestNumber: string
  rings: SerializedRing[]
  boostMult: string
  boosts: number
  rung: number
  tanim: string
  tanimTotal: string
  prestiges: number
  totalBuys: number
  totalBoosts: number
  gateReached: boolean
  taps: number
  uselessTaps: number
  playTime: number
  startedAt: number
  lastSeenAt: number
  upgrades: Record<string, number>
  settings: SerializedSettings
  seenVoice: string[]
  latched: string[]
}

export type SerializedGameState = SerializedPlayerState
