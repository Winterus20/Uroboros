/** Yeni ekonominin çalışma zamanı tipleri. */
import type { Decimal } from '../core/math'
import type { NumberState } from '../game/number/economy'
import type { UpgradeId } from '../game/number/upgrades'
import type { GameSettings } from './settings'
import type { OfflineReport } from './save'

export type { OfflineReport }

/** Oyunun tam çalışma zamanı durumu: sayı ekonomisi + meta + ayarlar. */
export interface GameState extends NumberState {
  /** `+1` basış sayısı (gösterim çözünürlüğünün üstünde kalanlar dahil). */
  taps: number
  /** Gösterim çözünürlüğünün altında kalan basışlar (S9: gizli başarım eşikleri). */
  uselessTaps: number
  playTime: number
  startedAt: number
  lastSeenAt: number
  upgrades: Record<UpgradeId, number>
  settings: GameSettings
  /** Ticker'ın son gösterdiği satır kimlikleri (tekrar önleme, T4). */
  seenVoice: string[]
  /** Bir kez tetiklenen sahne/başarım kimlikleri (S3 mandal). */
  latched: string[]
  /** Otomasyon sayacı (sn) — uçucu, kayda yazılmaz. */
  autobuyTimer: number
  /** Son çevrimdışı rapor (uçucu — kayda yazılmaz). */
  offlineReport: OfflineReport | null
}

/** Halkanın ekranda okunması için hazır satır (UI türetimi). */
export interface RingRow {
  index: number
  name: string
  amount: Decimal
  bought: number
  unlocked: boolean
  cost: Decimal
  affordable: boolean
  unlockedNextAt: number
  producesPerSecond: Decimal
}
