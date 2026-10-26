/** Zincir ekonominin çalışma zamanı tipleri. */
import type { Decimal } from '../core/math'
import type { NumberState } from '../game/number/economy'
import type { GameSettings } from './settings'
import type { OfflineReport } from './save'

export type { OfflineReport }

/** Oyunun tam çalışma zamanı durumu: sayı zinciri + meta + ayarlar. */
export interface GameState extends NumberState {
  /** `+1` basış sayısı (gösterim çözünürlüğünün üstünde kalanlar dahil). */
  taps: number
  /** Gösterim çözünürlüğünün altında kalan basışlar (S9: gizli başarım eşikleri). */
  uselessTaps: number
  playTime: number
  startedAt: number
  lastSeenAt: number
  settings: GameSettings
  /** Ticker'ın son gösterdiği satır kimlikleri (tekrar önleme, T4). */
  seenVoice: string[]
  /** Bir kez tetiklenen sahne/başarım kimlikleri (S3 mandal). */
  latched: string[]
  /** Seçili satın alma modu — uçucu, kayda yazılmaz. */
  buyMode: BuyMode
  /** Son çevrimdışı rapor (uçucu — kayda yazılmaz). */
  offlineReport: OfflineReport | null
}

/** Satın alma modu — AD'nin ×1 / ×10 / Max düğmeleri (uçucu, kayda yazılmaz). */
export type BuyMode = 1 | 10 | 'max'

/** Halkanın ekranda okunması için hazır satır (UI türetimi). */
export interface RingRow {
  index: number
  name: string
  amount: Decimal
  bought: number
  unlocked: boolean
  /** Tek birim fiyatı (×1 modu). */
  cost: Decimal
  /** 10'lu blok toplam fiyatı — AD'nin "Buy 10"ı (×10 modu). */
  cost10: Decimal
  /** "Max" modunda alınabilecek birim sayısı (0 = alamaz). */
  maxCount: number
  /** "Max" modunun toplam fiyatı. */
  costMax: Decimal
  affordable: boolean
  affordable10: boolean
  unlockedNextAt: number
  /** Bir altındaki halkaya (halka 1 için: sayıya) saniyede verdiği miktar. */
  producesPerSecond: Decimal
  /** Sayıya DOĞRUDAN kattığı miktar (halka 1 için 0 — o zaten sayının kendisi). */
  addsPerSecond: Decimal
}
