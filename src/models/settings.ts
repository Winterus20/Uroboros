/** Oyun ayarları tipleri ("Hold That Number", ADR-0078 sonrası). */
import type { NotationType } from '../core/format'

export type MusicTrackId = 'lofi_chill' | 'synthwave' | 'ambient_drone' | 'subway_groove' | 'custom'

/** A4 — mizah yoğunluğu: kapalı / ölçülü (varsayılan) / tam. */
export type HumorLevel = 'off' | 'measured' | 'full'

/** ADR-0058 hareket kapısı: ayar + OS tercihi tek kapıdan okunur. */
export type MotionMode = 'full' | 'reduced' | 'off'

export interface GameSettings {
  notation: NotationType
  /** Ondalık hassasiyet (0-6). Hero sayı için 2-3 önerilir. */
  decimalPlaces: number
  humor: HumorLevel
  soundEnabled: boolean
  soundVolume: number
  musicEnabled: boolean
  musicVolume: number
  musicTrack: MusicTrackId
  motionMode: MotionMode
  /** `AlgorithmicSwirl` kalitesi (G2: oyunun tek ortamı). */
  swirlShaderQuality: 'off' | 'balanced' | 'high'
  batterySaver: boolean
  confirmDialogs: boolean
  hotkeysEnabled: boolean
  activeSlot: number
}
