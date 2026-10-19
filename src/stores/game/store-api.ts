// Store uyelerinin (state + getter + action) `this` tipi. Getter/action
// parcalari bu arayuzu `this` olarak kullanir; Pinia metod eslesmesi
// (bivariance) sayesinde defineStore ile uyumludur.
import type { calculateCosmicPreyLadder, calculateEventHorizon, calculateWritingParadox } from '../../core/cosmic-scale'
import type { Decimal } from '../../core/math'
import type { ChallengeDef, ChallengeRewardEffects } from '../../game/challenges'
import type { CorruptionLevel } from '../../game/corruption'
import type { ScaleLayerId } from '../../game/layers'
import type { UnlockContext } from '../../game/unlocks'
import type { AutobuyerMode, CrisisInterventionType, CrisisSpellType, LabMode, LabSeedType, MusicTrackId, NeuralEffects, OfflineReport, ReactorPhase, ResolutionMilestone, SerializedPlayerState, StanceType, StrikeStage } from '../../models/types'
import type { GameState } from './state'

export interface StoreApi extends GameState {
  dopamine: Decimal
  unlockedDimensionsCount: number
  formatUnlockBuffActive: boolean
  formatUnlockBuffSecondsRemaining: number
  primaryFeedTier: number
  tickspeedMultiplier: Decimal
  tickspeedCost: Decimal
  getDimensionSynergyMultiplier: (tier: number) => Decimal
  getPartnerInfo: (tier: number) => { partnerTier: number; label: string; partnerBought: number; mult: number }
  getDimensionMilestone: (tier: number) => {
      current: ResolutionMilestone | null
      next: ResolutionMilestone | null
      progress: number
    }
  getDimensionMilestoneMultiplier: (tier: number) => Decimal
  canSacrifice: boolean
  currentSacrificeReward: Decimal
  singleShiftPower: number
  shiftPowerMultiplier: Decimal
  shiftRequirement: { tier: number; amount: Decimal }
  canShift: boolean
  galaxyRequirement: number
  galaxyRequirementTier: number
  canBuyGalaxy: boolean
  canSingularity: boolean
  challengeGoalReached: boolean
  hasBreakSingularity: boolean
  isMatterCapped: boolean
  isCockpitMode: boolean
  isAutobuyerCockpitMode: boolean
  activeAutobuyersCount: number
  totalAutobuyersCount: number
  autobuyerFleetSpeedMult: number
  autobuyerEffectiveInterval: (id: string) => number
  hasAffordableNeuralNode: boolean
  hasAffordableLockedBot: boolean
  multiplierBreakdown: Array<{ name: string; value: number; desc: string }>
  currentRunSeconds: number
  activeVsPassiveRatio: { manualPct: number; passivePct: number }
  clickPowerBreakdown: Array<{ name: string; value: string; desc: string }>
  tickspeedBreakdown: Array<{ name: string; value: string; desc: string }>
  pastSingularitiesAverage: { avgDuration: number; avgSpPerMinute: Decimal }
  biometrics: {
      thumbDistanceMeters: number
      thumbDistanceKm: number
      lostSleepHours: number
      mentalBatteryPct: number
      blueLightPhotons: Decimal
      zombieRank: string
      zombieRankColor: string
      milestoneHint: string
      cosmicPrey: ReturnType<typeof calculateCosmicPreyLadder>
      eventHorizon: ReturnType<typeof calculateEventHorizon>
      writingParadox: ReturnType<typeof calculateWritingParadox>
    }
  singularityGain: Decimal
  nextSingularityPointAt: Decimal
  getDimensionMultiplier: (tier: number) => Decimal
  getDimensionBreakdown: (tier: number) => Array<{ source: string; mult: Decimal }>
  getDimensionCost: (tier: number) => Decimal
  previewDimensionBuy: (tier: number) => { units: number; cost: Decimal } | null
  passiveBadges: { d1Sync: boolean; d3Leech: boolean; d4Anomaly: boolean; d5Shift: boolean; d6Offline: boolean }
  stanceMultipliers: { production: number; click: number; anomalyRate: number }
  productionBuffMultiplier: Decimal
  clickBuffMultiplier: Decimal
  isComboActive: boolean
  slackerLeechPercent: number
  unlockContext: UnlockContext
  dopamineGateReached: (amount: string) => boolean
  isFeatureUnlocked: (id: string) => boolean
  labUnlocked: boolean
  crisisUnlocked: boolean
  reactorPhase: ReactorPhase
  reactorMassMult: number
  reactorTickRateMult: number
  reactorAnomalyRateMult: number
  autobuyersUnlocked: boolean
  activeChallengeDef: ChallengeDef | null
  challengeRewardEffects: ChallengeRewardEffects
  challengesUnlocked: boolean
  challengeProdMult: Decimal
  challengeHalted: boolean
  challengeProgress01: number
  canUnlockBulk: boolean
  canUnlockMax: boolean
  isAutobuyerRequirementMet: (id: string) => boolean
  singularityUnlocked: boolean
  sacrificeUnlocked: boolean
  colonyUnlocked: boolean
  botBreedRate: number
  colonyMultiplier: Decimal
  minNapBots: Decimal
  canPowerNap: boolean
  powerNapGain: Decimal
  labPassiveMultiplier: Decimal
  labClickMultiplier: Decimal
  labAnomalyMultiplier: number
  labViralMultiplier: number
  viralCooldownRemaining: number
  canTriggerViralDrop: boolean
  labSeedEffectiveCost: (seedType: LabSeedType) => Decimal
  labCodexDiscoveredCount: number
  labCodexBonusPercent: number
  canCollapseReactor: boolean
  reactorRelicBonuses: {
      tickspeedBase: number
      crisisDuration: number
      spGainMult: number
      dimensionalBoostPerCell: number
      universalMassMult: Decimal
    }
  neuralEffects: NeuralEffects
  comboMultiplier: number
  manualClickPower: Decimal
  swipeBreakdown: StrikeStage[]
  matterPerSecond: Decimal
  matterProductionBreakdown: Array<{ source: string; mult: Decimal }>
  dopaminePerSecond: Decimal
  matterPerSecondGrowth: Decimal
  timeClockTension: number
  timeClockRewoundSeconds: number
  timeClockProductionMult: Decimal
  timeClockIsWinding: boolean
  timeClockIsReleasing: boolean
  timeClockHandAngleDeg: number
  timeClockPreviewPeakSpeed: number
  timeClockPreviewDuration: number
  achievementCount: number
  achievementFullRows: number
  achievementMultiplier: Decimal
  hasUnseenAchievements: boolean
  achievementClickMult: number
  achievementTickspeedDiscount: number
  achievementAnomalyFactor: number
  achievementLeechFactor: number
  achievementCaffeineBoost: number
  achievementSpDiscount: number
  achievementCaffeineRegen: number
  achievementLabYield: number
  achievementBuffDuration: number
  startingMatter: Decimal
  achievementStartingMatter: Decimal
  achievementProductionMult: number
  achievementDimCostMult: number
  achievementShiftPowerBase: number
  corruptionLevel: CorruptionLevel
  registerChallengeBuy(units?: number): void;
  relieveChallengeOnPrestige(): void;
  setStance(stance: StanceType): void;
  getDimensionChainFeedPerSecond(tier: number): Decimal;
  emitProductionSurge(beforeMatterPerSec: Decimal, playSound?: boolean): void;
  applyPurchaseChainPulse(tier: number): void;
  finalizeDimensionPurchase(tier: number, mpsBefore: Decimal, playSound?: boolean): void;
  buyDimension(tier: number, playSound?: boolean): boolean;
  buyMaxDimension(tier: number, playSound?: boolean, feedbackSurge?: boolean): boolean;
  buyTickspeed(playSound?: boolean): boolean;
  buyMaxTickspeed(playSound?: boolean, feedbackSurge?: boolean): boolean;
  maxAll(): void;
  addMatter(amount: Decimal, trackTotal?: boolean): void;
  manualClick(coords?: { x: number; y: number }): void;
  sacrificeDimensions(playSound?: boolean): boolean;
  celebrateFormatUnlock(tier: number): void;
  celebrateDimensionUnlocks(): void;
  snapshotJump(layer: ScaleLayerId, spGained: Decimal): void;
  performScaleJump(layer: ScaleLayerId, playSound?: boolean): boolean;
  dimensionShift(playSound?: boolean): boolean;
  buyGalaxy(playSound?: boolean): boolean;
  resetRunState(refundChoiceNodes?: boolean): void;
  singularityReset(playSound?: boolean): boolean;
  enterChallenge(id: string): boolean;
  exitChallenge(): boolean;
  completeChallenge(celebrate?: boolean): boolean;
  shouldAutoSingularity(): boolean;
  plantSeed(cellId: number, seedType: LabSeedType): boolean;
  harvestCell(cellId: number): boolean;
  clearCell(cellId: number): void;
  setLabMode(mode: LabMode): void;
  triggerSupercriticalVent(): boolean;
  triggerViralDrop(): boolean;
  collapseReactor(): boolean;
  triggerReactorMeltdown(): void;
  castCrisisIntervention(interventionType: CrisisInterventionType): boolean;
  castSpell(spellId: CrisisSpellType): boolean;
  triggerCrisisDilemma(): void;
  chooseCrisisDilemmaOption(optionId: string): void;
  toggleAutobuyer(id: string): void;
  toggleAllAutobuyers(enable?: boolean): void;
  setAllAutobuyerModes(mode: AutobuyerMode): boolean;
  ensureAutobuyersPreserved(): void;
  unlockAutobuyer(id: string): boolean;
  unlockBulkMode(): boolean;
  unlockMaxMode(): boolean;
  setAutobuyerMode(id: string, mode: AutobuyerMode): boolean;
  buySingularityUpgrade(id: string): boolean;
  buyNeuralNode(id: string): boolean;
  spawnAnomaly(forceGolden?: boolean): boolean;
  clickAnomaly(anomalyId: string): void;
  spawnSlacker(): void;
  clickSlacker(slackerId: string): void;
  recordNewsSeen(newsId: string): void;
  recordNewsClick(isSecret?: boolean): void;
  checkAchievements(): void;
  markAchievementsSeen(): void;
  dismissAchievementToast(id: string): void;
  setActiveGameTab(tab: string): void;
  syncUnlocks(): void;
  spawnTimeClock(): boolean;
  windTimeClock(dragDeltaRadians: number): void;
  releaseTimeClock(): boolean;
  resetTimeClock(): void;
  update(deltaSeconds: number): void;
  hatchCore(): boolean;
  powerNap(): boolean;
  simulateOfflineProgress(offlineSeconds: number): OfflineReport | null;
  dismissOfflineReport(): void;
  buyDimensionUnits(tier: number, playSound?: boolean): boolean;
  buyOneUnit(tier: number, playSound?: boolean): boolean;
  toggleMusic(): void;
  setMusicVolume(vol: number): void;
  setMusicTrack(track: MusicTrackId): void;
  toggleVinylCrackle(): void;
  toggleRain(): void;
  setRainLevel(val: number): void;
  setMusicIntensity(val: number): void;
  setSleepTimer(minutes: number): void;
  nextMusicTrack(): void;
  setCustomAudioUrl(url: string): void;
  switchSaveSlot(targetSlot: number): void;
  copySaveSlot(fromSlot: number, toSlot: number): boolean;
  deleteSaveSlot(slot: number): void;
  restoreFromBackup(): boolean;
  serialize(): SerializedPlayerState;
  deserialize(data: SerializedPlayerState): void;
}
