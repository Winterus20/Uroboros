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
  /**
   * Store'un bıraktığı son OLAY satırı (uçucu — kayda yazılmaz).
   *
   * Mücadele girişi/bitişi ve kapı gibi olaylarda doldurulur. Ticker havuzundan
   * bağımsızdır: havuz rastgele konuşur, bu satır OLAN şeyi söyler (V4).
   */
  tickerLine: string | null
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
  /** Blok çarpanı: 5.3 ^ floor(bought / 10) — yalnız üretime uygulanır. */
  blockFactor: Decimal
  /** Ekranda okunan biçim: "x5.30", "x1.2e30" vb. (V4: sayısal etiket yalan söylemez). */
  blockFactorText: string
}
/** Mücadelenin paneldeki durumu (UI türetimi, kayda yazılmaz). */
export type ChallengeStatus = 'locked' | 'available' | 'active' | 'completed'

/**
 * Mücadele panelinde tek satır (contract §4).
 *
 * `goal` Decimal olarak, `goalText` aynı hedefin biçimlenmiş hâlidir: UI hangisini
 * isterse okur, ikisi de TEK kaynaktan (`challengeGoalLog`) türer — ekrandaki sayı
 * ile mekanik aynı şeyi söyler (V4).
 */
export interface ChallengeRow {
  id: string
  /** Ödül adı (C1 → "Full Hand"); ödül satırının iki nokta öncesi. */
  name: string
  ringName: string
  status: ChallengeStatus
  /** Hedef sayı; aktif mücadelede girişte kilitlenen hedef. */
  goal: Decimal
  /** Aynı hedefin biçimlenmiş hâli (oyuncunun seçtiği notasyon). */
  goalText: string
  /**
   * Açılma eşiği: sayı bu değere ulaşınca mücadele girilebilir (`unlockLog10`).
   * Kilitli satır gerekçesini bununla yazar; renk tek başına bilgi taşımaz (§8.4).
   */
  unlockAt: Decimal
  /** Aynı eşiğin biçimlenmiş hâli (oyuncunun seçtiği notasyon). */
  unlockText: string
  /** 0–100; tamamlanmış 100, aktif olanda girişten hedefe oran. */
  progress: number
  /**
   * UI "Enter" düğmesini yalnız bu satırda gösterir: sıradaki tamamlanmamış
   * mücadele, açık ve aktif mücadele yok. Sıra zorunludur (ADR-0086 §5).
   */
  enterable: boolean
  penaltyLabel: string
  rewardLabel: string
}

/** GoalBar'ın aktif mücadele için okuduğu satır. */
export interface ActiveChallengeRow {
  id: string
  name: string
  ringName: string
  goal: Decimal
  goalText: string
  progress: number
  penaltyLabel: string
  rewardLabel: string
}
