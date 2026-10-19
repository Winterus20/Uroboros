/** Oyuncu ilerlemesi ve kayit tipleri: istatistikler, basarimlar ve serilestirilmis durum. */
import { Decimal } from "../core/math"
import type { StanceType } from "./dimensions"
import type { LabSeedType, LabMode } from "./lab"
import type { AutobuyerMode } from "./autobuyers"
import type { GameSettings } from "./settings"

export interface SaveSlotMeta {
  slot: number
  exists: boolean
  matter?: string
  singularities?: number
  playtime?: number
  timestamp?: number
}

// Çevrimdışı / arka plan yakalama raporu — "Tekrar hoş geldin" modalı bunu gösterir
export interface OfflineReport {
  seconds: number
  capped: boolean
  dopamineGained: Decimal
}

/** Son 10 Sabah 06:00 Çöküşünün telemetri kaydı (Antimatter Dimensions Past 10 modeli) */
export interface PastSingularityRecord {
  id: number
  duration: number // saniye
  spGained: Decimal
  spPerMinute: Decimal
  peakMatter: Decimal
  timestamp: number
  challengeId?: string | null
}

export interface PlayerStats {
  manualClicks: number // Yukarı Kaydırma Sayısı
  totalMatterProduced: Decimal // Toplam Üretilen Dopamin
  highestMatter: Decimal // En Yüksek Dopamin Zirvesi
  totalPlaytime: number // saniye
  singularityCount: number // Sabah 06:00 Çöküş Sayısı
  fastestSingularity: number // saniye
  highestDps: Decimal // Anlık ulaşılan zirve saniyelik üretim
  totalManualDopamine: Decimal // Başparmak kaydırmasından gelen toplam dopamin
  anomaliesClicked: number // Tıklanan Gece Krizleri
  mythicsClicked: number // Tıklanan Void Reel (nadir 4. tip)
  combosTriggered: number // Süper Rezonans Hipnozları
  slackersFired: number // Susturulan Vicdan Azapları
  labHarvests: number // Algoritma Lab Hasatları
  spellsCast: number // Alınan Gece Kararları
  seedsPlanted: number // Ekilen Lab Trend/Ses Formatları
  challengesCompleted: number // Tamamlanan Gece Kriz Meydan Okumaları
  reactorCollapses?: number // Reaktör Kuantum Çöküş Sayısı (Kozmik Relik Seviyesi)
  clockRewinds: number // Zaman Yayı salgı sayısı (Time Clock)
  clockRewoundSeconds: number // Hayat boyu geri sarılan oyun-zamanı (sn)
  clockBestTension: number // Ulaşılan en iyi yay gerginliği [0, 1]
  clockPerfectReleases: number // v2: %90+ gerginlikte salınan kusursuz salgılar
  clockStreak: number // v2: güncel kârlı salgı serisi (zayıf salgı sıfırlar)
  clockBestStreak: number // v2: ulaşılan en uzun kârlı salgı serisi
}

export type AchievementCategoryId =
  | 'dopamine'
  | 'dimensions'
  | 'automation'
  | 'crisis'
  | 'guilt'
  | 'lab'
  | 'singularity'
  | 'challenges'

export type AchievementRewardKind =
  | 'click_x2'
  | 'tickspeed_discount'
  | 'buff_duration'
  | 'leech_reduction'
  | 'sp_discount'
  | 'lab_yield'
  | 'anomaly_rate'
  | 'caffeine_regen'
  | 'caffeine_boost'
  | 'starting_matter'
  // ADR-0032: 1e308'e kadar uzanan kalıcı başarımlar
  | 'prod_x125'
  | 'dim_cost_x085'
  | 'click_x3'
  | 'shift_power_boost'
  | 'prod_x2'

export interface AchievementReward {
  kind: AchievementRewardKind
  desc: string // Sekmede gösterilen kalıcı ödül metni
}

export interface AchievementDef {
  id: string
  name: string
  desc: string // Kazanma koşulu metni
  icon: string // emoji
  category: AchievementCategoryId
  secret?: boolean // Gizli (shadow): kilitliyken adı/ipucu gizlenir, ödül vermez
  reward?: AchievementReward
  check: (ctx: AchievementContext) => boolean
}

export interface AchievementContext {
  manualClicks: number
  totalMatter: Decimal
  highestMatter: Decimal
  matter: Decimal
  playtime: number
  singularityCount: number
  anomaliesClicked: number
  mythicsClicked: number
  combosTriggered: number
  slackersFired: number
  labHarvests: number
  spellsCast: number
  seedsPlanted: number
  tickspeedBought: number
  shifts: number
  galaxies: number
  sp: Decimal
  spUpgradesTotal: number
  guiltImmunityLvl: number
  dimBoughtTotal: number
  dimBought0: number
  unlockedBots: string[]
  bulkUnlocked: boolean
  maxUnlocked: boolean
  neuralBots: Decimal
  napCount: number
  matureCells: number
  hasBrainrot: boolean
  hasMatureBrainrot: boolean
  activeSlackers: number
  leechedTotal: Decimal
  wallHour: number
  completedChallenges: string[]
  seenNewsCount: number
  hasClickedSecretNews: boolean
}

export interface SerializedPlayerState {
  version: number
  matter: string // Dopamin
  dimensions: Array<{
    amount: string
    bought: number
  }>
  tickspeedBought: number
  dimensionShifts: number
  dimensionCapFloor?: number
  formatDiscoverSeenCap?: number
  formatUnlockBuffTier?: number
  formatUnlockBuffUntil?: number
  galaxies: number
  singularityPoints: string
  currentStance: StanceType
  activeBuffs?: Array<{
    type: string
    remaining: number
    multiplier?: number
    duration?: number
    name?: string
  }>
  slackers: Array<{
    name: string
    leechedDopamine?: string
    leechedKpi?: string // Eski kayıt geriye dönük uyumluluk
  }>
  caffeineEnergy?: number
  /** Crisis 2.0: Olay Ufku Reaktörü Isı Seviyesi (0-100) */
  reactorHeat?: number
  reactorMeltdownTimer?: number
  dilemmaCooldown?: number
  /** Crisis 3.0: Kriyojenik Rezerv, Momentum ve Cooldown Sayaçları */
  reactorCoolantCharges?: number
  reactorCoolantTimer?: number
  reactorMomentum?: number
  reactorCooldowns?: Record<string, number>
  /** v13: enerji tavanı (v12'de kaydedilmiyordu, yüklemede clamp tavanı olarak kullanılıyordu) */
  maxCaffeineEnergy?: number
  /** v13: Viral Zirve koşu ilerlemesi (daha önce kaydedilmiyordu) */
  isViralActive?: boolean
  viralTimeRemaining?: number
  viralViews?: number
  labCells?: Array<{
    id: number
    seedType: LabSeedType | null
    age: number
    matureAge: number
    // JSON Infinity'yi taşıyamaz: çürümesiz hücre kayda null düşer, yüklemede null->Infinity olur
    maxAge: number | null
  }>
  labHype?: number
  labMode?: LabMode
  discoveredFormulas?: LabSeedType[]
  reactorCollapseCount?: number
  autobuyers?: Record<string, { enabled: boolean; unlocked: boolean; mode?: AutobuyerMode; minGainSp?: number; customRule?: { maxGalaxies?: number } }>
  autobuyerBulkUnlocked?: boolean
  autobuyerMaxUnlocked?: boolean
  singularities?: number // Tekillik sayısı (v10: bot unlock koşulu için kalıcı)
  nightWatchUnlocked?: boolean // Faz 2 kilometre taşı (1e308 Dopamin — ADR-0013; o ADR'deki 1e4000 notu bayat)
  singularityUpgrades?: Record<string, number>
  neuralNodesBought?: Record<string, number> // Nöral Ağaç satın alımları (v9)
  clickCombo?: { count: number; lastClickAt: number } // Tıklama serisi (geçici, güvenli varsayılanla yüklenir)
  activeChallenge?: string | null // Aktif Gece Krizi (v10)
  completedChallenges?: string[] // Tamamlanan Gece Krizleri (v10)
  challengeBestTimes?: Record<string, number> // Challenge en iyi süreleri, sn (v10)
  /** Aktif challenge koşu-içi sayaçları (koşuya özel geçici durum; yüklemede clamp'lenir) */
  challengeElapsed?: number
  challengeHaltUntil?: number
  challengeCostInflation?: number
  challengeNotificationDoom?: number
  challengeDim1Growth?: string
  mythicPity?: number // Void Reel garanti sayacı (v11: 25 spawn'da 1 garanti)
  claimedBounties?: number[] // Hayat boyu açılan dekad basamakları (ADR-0032)
  decadeSurgeMult?: number // Koşu içi Dekad Yükselişi çarpanı (ADR-0034, v14)
  sacrificeCount?: number
  sacrificeMultiplier?: string
  neuralBots?: string // Nöral İzleme Kolonisi (v8)
  napCount?: number
  napMultiplier?: string
  lastUpdate: number
  settings: GameSettings
  stats: {
    manualClicks: number
    totalMatterProduced: string
    highestMatter: string
    totalPlaytime: number
    singularityCount: number
    fastestSingularity: number
    anomaliesClicked: number
    mythicsClicked?: number
    combosTriggered: number
    slackersFired: number
    labHarvests?: number
    spellsCast?: number
    seedsPlanted?: number
    challengesCompleted?: number
    reactorCollapses?: number
    clockRewinds?: number
    clockRewoundSeconds?: number
    clockBestTension?: number
    clockPerfectReleases?: number
    clockStreak?: number
    clockBestStreak?: number
    highestDps?: string
    totalManualDopamine?: string
  }
  pastSingularities?: Array<{
    id: number
    duration: number
    spGained: string
    spPerMinute: string
    peakMatter: string
    timestamp: number
    challengeId?: string | null
  }>
  /** Ölçek sıçrama günlüğü (ADR-0052, v17) */
  jumpLog?: Array<{
    id: number
    layer: 'shift' | 'galaxy' | 'singularity'
    timestamp: number
    runSeconds: number
    peakLogMatter: number
    shifts: number
    galaxies: number
    singularities: number
    spGained: string
  }>
  /** Zaman Yayı (Time Clock) canlı yay durumu (v18). Faz/hız uçucudur; burada yalnızca
   *  birikmiş çevirme miktarı yaşar. Yaşam boyu istatistikler `stats` bloğundadır. */
  timeClock?: { drag?: number }
  achievements?: string[]
  achievementsSeenCount?: number
  seenNewsIds?: string[]
  uselessNewsClicks?: number
  hasClickedSecretNews?: boolean
  unlockedFeatures?: string[] // Özellik Merdiveni (v0.11.0) — yapışkan (sticky) kilit açılışları
  /** ADR-0035 (v15): hayat boyu ulaşılan en yüksek dopamin. Açılış kalıcılığının
   *  asıl kaydı — Sıçrama/Küme/şafak `matter`'ı sıfırlasa da kapılar buradan açılır.
   *  Eski kayıtlarda yok: yükleme sırasında `stats.highestMatter` + mevcut dopaminden türetilir. */
  lifetimePeakMatter?: string
  /** ADR-0035 (v15): hayat boyu en çok yapılan Akış Sıçraması sayısı. Akış Kümesi
   *  `dimensionShifts`'i 0'a indirdiği için sıçrama sayacına bağlı açılışlar
   *  (Önbellek Temizleme) bu kalıcı tepe noktadan okur. */
  lifetimePeakShifts?: number
}

export type SerializedGameState = SerializedPlayerState
