import { Decimal } from '../core/math'
import type { NotationType } from '../core/format'

export type StanceType = 'trend' | 'spam' | 'private_mode'

export type AnomalyType = 'fyp' | 'heart_frenzy' | 'sponsor' | 'void'

export type BuffType = AnomalyType | 'espresso' | 'planck_surge' | 'resonance_boost'

export interface DimensionData {
  tier: number
  amount: Decimal
  bought: number // Toplam satın alınan (çarpan hesaplamak için)
  baseCost: Decimal
  costMult: Decimal
}

export interface ActiveBuff {
  id: string
  type: BuffType
  name: string
  duration: number
  remaining: number
  multiplier: number
}

export interface FloatingAnomaly {
  id: string
  type: AnomalyType
  x: number // Yüzde ekran konumu (10 - 85)
  y: number // Yüzde ekran konumu (15 - 80)
  remainingTime: number // Ekranda kalacağı kalan saniye
  totalTime: number // Spawn anındaki toplam süre (halka/bar yüzdesi için)
  title: string
  desc: string
}

export interface GuiltWrinkler {
  id: string
  name: string
  leechedDopamine: Decimal
  clicksRemaining: number // Susturmak için gereken tıklama
}

/** Geriye dönük tip uyumluluğu */

export type InternetTroll = GuiltWrinkler

export interface AutobuyerConfig {
  id: string
  name: string
  enabled: boolean
  unlocked: boolean
  mode: AutobuyerMode
  interval: number // saniye cinsinden
  timer: number
  minGainSp?: number // Şafak Nöbeti Botu: minimum SP kazancı tabanı (default 1)
  // Kokpit Gelişmiş Kuralları
  customRule?: {
    maxGalaxies?: number // Küme botu için opsiyonel tavan sınırı (0 = sınırsız)
  }
}

export type LabSeedType =
  | 'photon_resonator'
  | 'heavy_nucleon'
  | 'gluon_binder'
  | 'graviton_trap'
  | 'dark_matter_core'
  | 'magnetic_shield'
  | 'tachyon_flux'
  | 'higgs_boson'

export type LabMode = 'overdrive' | 'superconductor' | 'fluctuation'

export interface LabCell {
  id: number
  seedType: LabSeedType | null
  age: number
  matureAge: number
  maxAge: number
  isMature: boolean
}

/** Crisis 2.0: Olay Ufku Kararsızlık Reaktörü Fazları */
export type ReactorPhase = 'dormant' | 'resonance' | 'sweet_spot' | 'meltdown'

/** Crisis 2.0: 4 Taktiksel Müdahale Türü */
export type CrisisInterventionType =
  | 'quantum_compression'
  | 'time_dilation'
  | 'magnetic_vent'
  | 'planck_surge'

export interface CrisisDilemmaOption {
  id: string
  label: string
  desc: string
  effect: string
}

export interface CrisisDilemma {
  id: string
  title: string
  desc: string
  duration: number
  timeLeft: number
  options: CrisisDilemmaOption[]
}

/** Geriye dönük uyumluluk takma adı (Crisis 2.0) */
export type CrisisSpellType =
  | CrisisInterventionType
  | 'fast_charge'
  | 'espresso_shot'
  | 'noise_cancelling'
  | 'sleep_denial'

export type AutobuyerMode = 'single' | 'bulk' | 'max'

export interface ResolutionMilestone {
  count: number
  name: string
  shortName: string
  mult: number
  colorClass: string
  desc: string
}

export type MusicTrackId = 'lofi_chill' | 'synthwave' | 'ambient_drone' | 'subway_groove' | 'custom'

/** Nöral Ağaç dalı: kök, pasif (uyku), aktif (başparmak) ve hibrit köprü */
export type NeuralBranch = 'root' | 'passive' | 'active' | 'hybrid'

/**

 * Nöral Ağaç düğümü (kalıcı SP yetenek ağacı).
 * effect, neuralEffects getter'ında sayısal etkiye çevrilen tanımlayıcı id'dir.
 * Tekrarlanabilir düğümler maxLevel + costMult alanlerini kullanır.
 */
export interface NeuralNode {
  id: string
  name: string
  icon: string
  desc: string
  branch: NeuralBranch
  cost: number // SP cinsinden taban maliyet
  maxLevel?: number // Belirtilmezse 1 (tek seferlik)
  costMult?: number // Seviye başına maliyet çarpanı (belirtilmezse 1)
  requires: string[] // Satın alınması gereken öncül düğüm id'leri
  effect: string // Etki tanımlayıcı id (neuralEffects içinde işlenir)
  choiceGroup?: string // Aynı gruptaki düğümler birbirini hariç tutar (prestijde kilidi açılır)
}

/** Satın alınan Nöral Ağaç düğümlerinin toplanmış sayısal etkileri */
export interface NeuralEffects {
  productionMult: number // Tüm istasyon üretim çarpanı
  clickMult: number // Manuel tıklama gücü çarpanı
  offlineGainBonus: number // Çevrimdışı ilerleme ek oranı (additif, 0.25 = +%25)
  crisisRewardMult: number // Vicdan Azabı prim çarpanı
  breedRateMult: number // Koloni üreme hızı çarpanı
  botFrequencyMult: number // Otomatik bot frekans çarpanı
  dawnSpeedMult: number // Şafak (tekillik) kazancı çarpanı
  cpsSyncLevel: number // CPS-to-click senkron düğümü seviyesi (0-4)
  comboUnlocked: boolean // Combo sistemi açıldı mı
}

export interface SaveSlotMeta {
  slot: number
  exists: boolean
  matter?: string
  singularities?: number
  playtime?: number
  timestamp?: number
}

export interface GameSettings {
  notation: NotationType
  decimalPlaces: number // Ondalık hassasiyet (2 veya 3)
  soundEnabled: boolean
  soundVolume: number
  theme: 'cyberpunk' | 'dark'
  musicEnabled: boolean
  musicVolume: number
  musicTrack: MusicTrackId
  vinylCrackle: boolean
  rainEnabled: boolean
  rainLevel: number
  musicIntensity: number
  sleepTimerMinutes: number
  customAudioUrl?: string
  // QoL ayarları (v10)
  confirmDialogs: boolean // Prestij/sıfırlama onay diyaloğu göster
  reduceAnimations: boolean // Animasyonları ve parçacıkları azalt
  motionMode?: 'full' | 'reduced' | 'off' // 3 durumlu hareket kontrolü (reduceAnimations ile senkron)
  screenShake?: boolean // Taktil ekran sarsıntısı / titremesi açık/kapalı
  crtEffect: boolean // Gece 3 CRT: scanline + vinyet zemin efekti
  juiceMode: 'calm' | 'balanced' | 'tilt' // Balatro juice yoğunluğu
  screenOverlayEffects: boolean // Doomscroll ekran dokuları (parmak izi lekesi ve kriz çatlağı)
  holoCardsEnabled: boolean // Balatro tarzı 3D kart tilt ve holo kaplamalar
  swirlShaderQuality: 'off' | 'balanced' | 'high' // Balatro tarzı dinamik arka plan girdap shader'ı
  sequentialStrike: boolean // Balatro Sütun 2: Sıralı Reels Vuruşu (Pop-chain cascade)
  // Sistem & Performans QoL (v22 - En İyi Ayarlar)
  batterySaver: boolean // Düşük CPU/GPU tasarruf modu
  floatingTexts: boolean // Tıklama ve kritik uçan yazıları
  newsTickerEnabled: boolean // Üst haber bandı açık/kapalı
  swipeSensitivity?: 'balanced' | 'low' | 'off' // Mobil ekran kaydırma / fiske jesti hassasiyeti
  offlineProgressModal: boolean // Çevrimdışı rapor modalı
  hotkeysEnabled: boolean // Klavye kısayolları (1-9, M vb.)
  activeSlot: number // 1, 2 veya 3
}

/** Balatro Sütun 2: Sıralı Nedensellik (Sequential Triggering) Basamak Tipleri */
export type StrikeStageId = 'base' | 'synergy' | 'stance_combo' | 'crit' | 'final'

export interface StrikeStage {
  id: StrikeStageId
  label: string
  text: string
  color: string
  bgClass: string
  borderClass: string
  icon?: string
  multiplier?: number
}

export interface SequentialStrikePayload {
  x: number
  y: number
  stages: StrikeStage[]
  finalAmount: Decimal
  isCrit: boolean
  comboCount: number
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

/** Ölçek sıçrama günlüğü kaydı (ADR-0052; shift/galaxy/singularity — son 100) */
export interface ScaleJumpRecord {
  id: number
  layer: 'shift' | 'galaxy' | 'singularity'
  timestamp: number
  runSeconds: number
  peakLogMatter: number
  shifts: number
  galaxies: number
  singularities: number
  spGained: Decimal
}

/** Kayıtlı hâli (Decimal'lar string) */
export interface SerializedScaleJumpRecord {
  id: number
  layer: 'shift' | 'galaxy' | 'singularity'
  timestamp: number
  runSeconds: number
  peakLogMatter: number
  shifts: number
  galaxies: number
  singularities: number
  spGained: string
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
  activeBuffs: Array<{
    type: BuffType
    remaining: number
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
  nightWatchUnlocked?: boolean // Faz 2 kilometre taşı (1e308 Dopamin — ADR-0033)
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
