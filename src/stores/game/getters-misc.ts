// Koloni, bot, basarim, kilit, tekillik ve diger getter parcalari. `this`, StoreApi ile tiplenmistir.
import { calculateCosmicPreyLadder, calculateEventHorizon, calculateWritingParadox } from '../../core/cosmic-scale'
import { D_0, D_1, D_INFINITY, Decimal } from '../../core/math'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, calcAchievementMultiplier, hasAchievementReward } from '../../game/achievements'
import { AUTOBUYER_BULK_COST, AUTOBUYER_BULK_SHIFT_REQ, AUTOBUYER_COSTS, AUTOBUYER_MAX_COST, AUTOBUYER_MAX_GALAXY_REQ, AUTOBUYER_PROGRESS_REQ } from '../../game/autobuyer-data'
import { COLONY_BREED_RATE, COLONY_PASSIVE_LOG_FACTOR, SACRIFICE_SHIFT_REQ, resolvedUnlockedDimensionCount } from '../../game/balance'
import { deriveCorruptionLevel } from '../../game/corruption'
import type { CorruptionLevel } from '../../game/corruption'
import { tierAnomalyRateMult, tierClickSyncCapBonus, tierOfflineSimMult, tierShiftReqMult, tierSlackerLeechMult } from '../../game/dimension_identity'
import { buildUnlockContext, checkUnlock, getFeatureById, meetsDopamineGate } from '../../game/unlocks'
import { getAchMultCache, memoChallengeEffects, memoNeuralEffects, setAchMultCache } from './cache'
import type { UnlockContext } from '../../game/unlocks'
import type { GameState } from './state'
import type { StoreApi } from './store-api'

export const miscGetters = {
    // Planck Duvarı kırıldı mı? (Break Singularity yükseltmesi veya Nöral Ağaç düğümü)
    hasBreakSingularity(this: StoreApi, state: GameState): boolean {
      return (
        (state.singularityUpgrades?.break_singularity || 0) >= 1 ||
        (state.neuralNodesBought?.break_singularity || 0) >= 1
      )
    },

    // Olay Ufku Doyumu / Kütle Tavanı aktif mi? (Planck Duvarı kırılmadıysa ve kütle D_INFINITY'e dayandıysa)
    isMatterCapped(this: StoreApi, state: GameState): boolean {
      return !this.hasBreakSingularity && state.matter.gte(D_INFINITY)
    },

    activeAutobuyersCount(this: StoreApi, state: GameState): number {
      return Object.values(state.autobuyers).filter((b) => b.unlocked && b.enabled).length
    },

    totalAutobuyersCount(this: StoreApi, state: GameState): number {
      return Object.values(state.autobuyers).filter((b) => b.unlocked).length
    },

    // Bot filosunun toplam hiz carpani (UI: "Bot Islem Hizi" / bot tetiklenme araligi).
    // M1 v2: Uretim Cipi bu carpanda YER ALMAZ - cip bot temposunu degil, boyut
    // uretim carpanini etkiler (bkz. getters-dimensions.ts getDimensionMultiplier).
    // NOT: fonksiyonel etki TICK DONGUSUNDE (bot.timer += delta x botSpeedMult);
    // bu getter YALNIZCA GOSTERIM icindir, ikinci kez uygulanmaz -
    // carpma tek yerde (burada) yapilir.
    autobuyerFleetSpeedMult(this: StoreApi): number {
      const chipBonus = Math.pow(1.5, this.singularityUpgrades?.neural_chip || 0)
      const overclock = this.neuralEffects?.botFrequencyMult || 1
      return chipBonus * overclock
    },

    autobuyerEffectiveInterval(this: StoreApi): (id: string) => number {
      return (id: string): number => {
        const bot = this.autobuyers[id]
        if (!bot) return 1
        const speed = this.autobuyerFleetSpeedMult
        return speed > 0 ? bot.interval / speed : bot.interval
      }
    },

    // QoL: şartı sağlanmış ve dopaminle alınabilir kilitli bot var mı? (Botlar sekmesi bildirim noktası)
    hasAffordableLockedBot(this: StoreApi, state: GameState): boolean {
      if (state.singularities >= 1) return false // Prestij sonrası dükkan kapalı; tüm botlar kokpitte
      return Object.values(state.autobuyers).some((bot) => {
        if (bot.unlocked) return false
        if (!this.isAutobuyerRequirementMet(bot.id)) return false
        const cost = AUTOBUYER_COSTS[bot.id] || new Decimal(1e6)
        return state.matter.gte(cost)
      })
    },

    // Telemetri: Aktif koşuda geçen süre
    currentRunSeconds(this: StoreApi, state: GameState): number {
      return state.singularityRunSeconds
    },

    // Telemetri: Son 10 Koşunun Ortalamaları (Antimatter Dimensions Past 10 Averages)
    pastSingularitiesAverage(this: StoreApi, state: GameState): { avgDuration: number; avgSpPerMinute: Decimal } {
      if (state.pastSingularities.length === 0) {
        return { avgDuration: 0, avgSpPerMinute: D_0 }
      }
      const totalDuration = state.pastSingularities.reduce((acc, r) => acc + r.duration, 0)
      const avgDuration = totalDuration / state.pastSingularities.length
      let totalSpMin = D_0
      state.pastSingularities.forEach((r) => {
        totalSpMin = totalSpMin.plus(r.spPerMinute)
      })
      const avgSpPerMinute = totalSpMin.div(state.pastSingularities.length)
      return { avgDuration, avgSpPerMinute }
    },

    // Telemetri: Doomscroll Gece Teşhisi ve Biyometrisi (Hiciv & Eğlenceli İstatistikler)
    biometrics(this: StoreApi, state: GameState): {
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
    } {
      const clicks = state.stats.manualClicks || 0
      const meters = clicks * 0.05
      const km = meters / 1000
      const playtime = state.stats.totalPlaytime || 0
      const lostHours = playtime / 3600
      const mentalBattery = Math.max(5, Math.min(100, Math.round(100 - (lostHours * 9.5))))
      const bluePhotons = new Decimal(playtime).times(1.25e15)

      let milestoneHint = 'Henüz başındasın — olay ufku yeni ısınıyor.'
      if (meters >= 8848) {
        milestoneHint = 'Everest Dağı Zirvesi (8,848 m) aşıldı! Atmosferik gazlar tekilliğe çekiliyor.'
      } else if (meters >= 3776) {
        milestoneHint = 'Fuji Dağı (3,776 m) seviyesi! Kütleçekimsel dalga boyu genişliyor.'
      } else if (meters >= 828) {
        milestoneHint = 'Burç Halife (828 m) aşıldı! Tekillik gökdelen ölçeğini yutuyor.'
      } else if (meters >= 330) {
        milestoneHint = 'Eyfel Kulesi (330 m) aşıldı! Metalik kafes bağları parçalandı.'
      } else if (meters >= 67) {
        milestoneHint = 'Galata Kulesi (67 m) aşıldı! Laboratuvar çevresi tekilliğe gömülüyor.'
      } else if (meters >= 10) {
        milestoneHint = '3 katlı laboratuvar binası ölçeği tekilliğe çekildi.'
      }

      let rank = 'Moleküler Ayrıştırıcı'
      let rankColor = 'text-emerald-400'
      const singularities = state.singularities || 0
      if (singularities >= 50 || clicks >= 50000) {
        rank = 'UROBOROS (Kozmik Tekillik)'
        rankColor = 'text-rose-400 font-extrabold animate-pulse'
      } else if (singularities >= 15 || clicks >= 20000) {
        rank = 'Olay Ufku Mühendisi'
        rankColor = 'text-purple-400 font-bold'
      } else if (singularities >= 5 || clicks >= 7500) {
        rank = 'Kuantum Karadelik Mimarı'
        rankColor = 'text-amber-400 font-bold'
      } else if (singularities >= 1 || clicks >= 2500) {
        rank = 'Mikro-Karadelik Tetikleyicisi'
        rankColor = 'text-cyan-400'
      } else if (clicks >= 500) {
        rank = 'Laboratuvar Asistanı'
        rankColor = 'text-blue-400'
      }

      const matterForScale = state.stats.totalMatterProduced.gt(state.matter)
        ? state.stats.totalMatterProduced
        : state.matter
      const notation = state.settings.notation
      const cosmicPrey = calculateCosmicPreyLadder(matterForScale, notation)
      const eventHorizon = calculateEventHorizon(matterForScale, notation)
      const writingParadox = calculateWritingParadox(matterForScale, notation)

      return {
        thumbDistanceMeters: meters,
        thumbDistanceKm: km,
        lostSleepHours: lostHours,
        mentalBatteryPct: mentalBattery,
        blueLightPhotons: bluePhotons,
        zombieRank: rank,
        zombieRankColor: rankColor,
        milestoneHint,
        cosmicPrey,
        eventHorizon,
        writingParadox
      }
    },

    singularityGain(this: StoreApi, state: GameState): Decimal {
      if (state.activeChallenge) return D_0
      if (state.matter.lt(D_INFINITY)) return D_0

      const hasBreak = this.hasBreakSingularity
      const dawnSpeedMult = memoNeuralEffects(state.neuralNodesBought || {}).dawnSpeedMult
      const spMult = memoChallengeEffects(state.completedChallenges).spMult
      const relicSpMult = this.reactorRelicBonuses.spGainMult
      const totalMult = dawnSpeedMult * spMult * relicSpMult

      // Planck Duvarı kırılmadıysa kütle D_INFINITY eşiğinde kilitlidir. Plan
      // bölüm 8A "Şafak Merdiveni" (ADR-0071): taban sabit 1 kalırken
      // break_singularity (4 SP) 4 tam koşu (~10-14 saat) bekletiyordu. Taban
      // artık 1 + singularities: 1. şafak 1 SP (kasa 1), 2. şafak 2 SP (kasa 3),
      // 3. şafak 3 SP (kasa 6) → kırılma duvarı 3 koşuya iner. Taban yine
      // totalMult ile çarpılır ve min 1 korunur.
      if (!hasBreak) {
        const baseDawn = 1 + state.singularities
        const baseGain = Decimal.floor(new Decimal(baseDawn).times(totalMult))
        return baseGain.gte(1) ? baseGain : D_1
      }

      // Break Singularity alındığında: Antimatter Dimensions tarzı kütle büyüdükçe SP üstel katlanır
      const logMatter = state.matter.log10().toNumber()
      const logDiff = Math.max(0, logMatter - 308)
      const divisor = 45
      const basePoints = 3

      const rawGain = Decimal.pow(10, logDiff / divisor).times(basePoints).times(totalMult)
      const floored = Decimal.floor(rawGain)
      return floored.gte(3) ? floored : new Decimal(3)
    },

    /**
     * Bir sonraki Tekillik Puanı (SP) için gereken hedef kütle (Antimatter Dimensions tarzı).
     */

    nextSingularityPointAt(this: StoreApi, state: GameState): Decimal {
      if (state.activeChallenge) return D_INFINITY
      const hasBreak = this.hasBreakSingularity

      // Planck Duvarı kırılmadığı sürece kütle tavanı aşılamaz, sonraki SP hedefi kilitlidir
      if (!hasBreak) {
        return D_INFINITY
      }

      const dawnSpeedMult = memoNeuralEffects(state.neuralNodesBought || {}).dawnSpeedMult
      const spMult = memoChallengeEffects(state.completedChallenges).spMult
      const relicSpMult = this.reactorRelicBonuses.spGainMult
      const totalMult = Math.max(0.001, dawnSpeedMult * spMult * relicSpMult)

      const divisor = 45
      const basePoints = 3

      const currentGain = this.singularityGain
      const nextTarget = currentGain.plus(1)
      const ratio = nextTarget.div(basePoints * totalMult)
      if (ratio.lte(1)) {
        return D_INFINITY
      }
      const logRatio = ratio.log10().toNumber()
      const neededLog = 308 + divisor * logRatio
      return Decimal.pow(10, neededLog)
    },

    // Bağlamsal pasif rozetleri — dimension_identity fonksiyonlarıyla aynı koşullar (etki = aktif)
    passiveBadges(this: StoreApi, state: GameState): { d1Sync: boolean; d3Leech: boolean; d4Anomaly: boolean; d5Shift: boolean; d6Offline: boolean } {
      return {
        d1Sync: tierClickSyncCapBonus(state.dimensions) > 0,
        d3Leech: tierSlackerLeechMult(state.dimensions, this.unlockedDimensionsCount) !== 1,
        d4Anomaly: tierAnomalyRateMult(state.dimensions, this.unlockedDimensionsCount) !== 1,
        d5Shift: tierShiftReqMult(state.dimensions, this.unlockedDimensionsCount) !== 1,
        d6Offline: tierOfflineSimMult(state.dimensions, this.unlockedDimensionsCount) !== 1
      }
    },

    // Gece Duruşu (Stance) Çarpanları
    stanceMultipliers(this: StoreApi, state: GameState): { production: number; click: number; anomalyRate: number } {
      switch (state.currentStance) {
        case 'trend': // 🛌 Yorgan Altı Modu
          return { production: 2.0, click: 1.0, anomalyRate: 1.0 }
        case 'spam': // ⚡ Çılgın Kaydırma
          return { production: 1.0, click: 4.0, anomalyRate: 1.5 }
        case 'private_mode': // 🕶️ Düşük Parlaklık
          return { production: 1.0, click: 1.0, anomalyRate: 1.0 }
        default:
          return { production: 1.0, click: 1.0, anomalyRate: 1.0 }
      }
    },

    // ---- Özellik Merdiveni (v0.11.0) ----
    unlockContext(this: StoreApi, state: GameState): UnlockContext {
      // P3.1: başarım listesi bağlama GERÇEKTEN iletilir — `achievements` field'ı
      // yapısal olarak da akardı ama çağrıda açıkça yazmak niyeti görünür kılar;
      // akmasaydı tüm dal kapıları üretimde sessizce kapalı kalırdı.
      return buildUnlockContext({ ...state, achievements: state.achievements })
    },

    // ADR-0035: bir dopamin eşiği hiçbir koşuda "yeniden kilitlenmez".
    // Ham dopamin kapıları buradan okur; hiçbir bileşen `matter.gte(...)` yazmaz.
    dopamineGateReached(this: StoreApi, state: GameState): (amount: string) => boolean {
      return (amount: string) =>
        meetsDopamineGate(state.matter, state.lifetimePeakMatter, amount)
    },

    isFeatureUnlocked: (state: GameState) => (id: string): boolean => {
      if (state.unlockedFeatures.includes(id)) return true
      const feature = getFeatureById(id)
      if (!feature) return false
      // P3.1: aynı bağlam `unlockContext` getter'ındaki gibidir — başarım listesi
      // bilinçli olarak iletilir (dal kapıları state.achievements'tan beslenir).
      return checkUnlock(buildUnlockContext({ ...state, achievements: state.achievements }), feature)
    },

    autobuyersUnlocked(this: StoreApi): boolean {
      return this.isFeatureUnlocked('autobuyers')
    },

    canUnlockBulk(this: StoreApi, state: GameState): boolean {
      if (state.autobuyerBulkUnlocked) return false
      return state.matter.gte(AUTOBUYER_BULK_COST) && state.dimensionShifts >= AUTOBUYER_BULK_SHIFT_REQ
    },

    canUnlockMax(this: StoreApi, state: GameState): boolean {
      if (state.autobuyerMaxUnlocked) return false
      if (!state.autobuyerBulkUnlocked) return false
      return state.matter.gte(AUTOBUYER_MAX_COST) && state.galaxies >= AUTOBUYER_MAX_GALAXY_REQ
    },

    // Bot ilerleme kilidi: maliyet yetse bile shift/küme/boyut şartı aranır
    isAutobuyerRequirementMet: (state: GameState) => (id: string): boolean => {
      const req = AUTOBUYER_PROGRESS_REQ[id]
      if (!req) return true
      if (req.shifts !== undefined && state.dimensionShifts < req.shifts) return false
      if (req.galaxies !== undefined && state.galaxies < req.galaxies) return false
      if (req.singularities !== undefined && state.singularities < req.singularities) return false
      if (req.needTier !== undefined) {
        const dim = state.dimensions[req.needTier - 1]
        if (!dim || dim.amount.lt(1)) return false
      }
      return true
    },

    singularityUnlocked(this: StoreApi, state: GameState): boolean {
      // ADR-0035: 1e30 eşiği koşu içi dopaminden değil, hayat boyu tepe noktadan
      // okunur. Sıçrama sonrası Şafak sekmesi kaybolmaz.
      return state.singularities > 0 || meetsDopamineGate(state.matter, state.lifetimePeakMatter, '1e30')
    },

    // Önbellek Temizleme açık mı? ADR-0035: Akış Kümesi `dimensionShifts`'i 0'a
    // indirdiği için koşu içi sayaç yerine hayat boyu en yüksek sıçrama sayısı
    // okunur. Saf okuyucudur; tepe noktayı yalnızca syncUnlocks() yükseltir.
    sacrificeUnlocked(this: StoreApi, state: GameState): boolean {
      return (
        state.lifetimePeakShifts >= SACRIFICE_SHIFT_REQ ||
        (!!state.dimensions[7] && state.dimensions[7].amount.gt(0))
      )
    },

    // ---- Nöral İzleme Kolonisi & Toplu Uyku ----
    colonyUnlocked(this: StoreApi, state: GameState): boolean {
      return state.neuralBots.gt(0) || state.napCount > 0 || this.isFeatureUnlocked('colony')
    },

    botBreedRate(this: StoreApi): number {
      // Nöral Ağaç: Nöral Yuva seviyeleri (eski bağlantı) + Sinaptik Köprü çarpanı
      return COLONY_BREED_RATE * (1 + 0.1 * (this.singularityUpgrades?.neural_nest || 0)) * this.neuralEffects.breedRateMult
    },

    colonyMultiplier(this: StoreApi, state: GameState): Decimal {
      if (state.neuralBots.lte(0)) return D_1
      return D_1.plus(state.neuralBots.plus(1).log10().times(COLONY_PASSIVE_LOG_FACTOR))
    },

    minNapBots(this: StoreApi, state: GameState): Decimal {
      // Dinamik Nap Eşiği: Her Toplu Uyku ile asgari bot ihtiyacı artar; 4 dakikalık spam'i engeller
      const count = Math.min(60, state.napCount || 0)
      return new Decimal(100).times(Decimal.pow(1.8, count))
    },

    canPowerNap(this: StoreApi): boolean {
      return this.neuralBots.gte(this.minNapBots)
    },

    powerNapGain(this: StoreApi): Decimal {
      if (!this.canPowerNap) return D_1
      const logBots = this.neuralBots.log10().toNumber()
      const logMin = this.minNapBots.log10().toNumber()
      const ratio = Math.max(1, logBots / Math.max(1, logMin))
      // Beklemeyi ve derin koloniyi ödüllendirir
      const gain = 1 + Math.pow(ratio, 1.2) * 0.85
      return new Decimal(gain)
    },

    // ---- Başarım Çarpanları & Kalıcı Ödüller (prestij dahil kalıcı) ----
    achievementCount(this: StoreApi, state: GameState): number {
      return state.achievements.length
    },

    achievementFullRows(this: StoreApi, state: GameState): number {
      return ACHIEVEMENT_CATEGORIES.filter((c) =>
        ACHIEVEMENTS.filter((a) => a.category === c.id).every((a) => state.achievements.includes(a.id))
      ).length
    },

    // Global kalıcı çarpan. Bilinçli olarak singularityGain'e uygulanmaz.
    //
    // ADR-0029: bu getter tick başına birden çok kez çağrılıyordu ve
    // calcAchievementMultiplier her çağrıda 7 kategori × 66 tanım tarıyordu.
    // Başarım listesi yalnızca EKLENEREK büyür (prestij/hard reset'te düşmez)
    // dolayısıyla uzunluk geçerli bir cache anahtarıdır. Yüklemede ve hard
    // reset'te cache düşürülür.
    achievementMultiplier(this: StoreApi, state: GameState): Decimal {
      const len = state.achievements.length
      const cached = getAchMultCache()
      if (cached && cached.len === len) return cached.val
      const val = calcAchievementMultiplier(state.achievements)
      setAchMultCache({ len, val })
      return val
    },

    hasUnseenAchievements(this: StoreApi, state: GameState): boolean {
      return state.achievements.length > state.achievementsSeenCount
    },

    achievementClickMult(this: StoreApi, state: GameState): number {
      let m = 1
      if (hasAchievementReward(state.achievements, 'click_x2')) m *= 2
      if (hasAchievementReward(state.achievements, 'click_x3')) m *= 3
      return m
    },

    achievementTickspeedDiscount(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'tickspeed_discount') ? 0.95 : 1
    },

    achievementAnomalyFactor(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'anomaly_rate') ? 0.9 : 1
    },

    achievementLeechFactor(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'leech_reduction') ? 0.85 : 1
    },

    achievementCaffeineBoost(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'caffeine_boost') ? 1.25 : 1
    },

    achievementSpDiscount(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'sp_discount') ? 0.95 : 1
    },

    achievementCaffeineRegen(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'caffeine_regen') ? 1.25 : 1
    },

    achievementLabYield(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'lab_yield') ? 1.1 : 1
    },

    achievementBuffDuration(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'buff_duration') ? 1.2 : 1
    },

    startingMatter(this: StoreApi, state: GameState): Decimal {
      // 1. Öncelik: Nöral Ağaç kök düğümü (Uykusuzluğun Kalbi) -> 10.000 g
      if ((state.neuralNodesBought?.insomnia_heart || 0) >= 1) {
        return new Decimal(10000)
      }

      // 2. Öncelik: 3 Tekillik Başarımı ('starting_matter') -> 1.000 g
      if (hasAchievementReward(state.achievements, 'starting_matter')) {
        return new Decimal(1000)
      }

      // 3. Varsayılan erken oyun kütlesi -> 10 g
      return new Decimal(10)
    },

    achievementStartingMatter(this: StoreApi): Decimal {
      return this.startingMatter
    },

    achievementProductionMult(this: StoreApi, state: GameState): number {
      let m = 1
      if (hasAchievementReward(state.achievements, 'prod_x125')) m *= 1.25
      if (hasAchievementReward(state.achievements, 'prod_x2')) m *= 2.0
      return m
    },

    achievementDimCostMult(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'dim_cost_x085') ? 0.85 : 1
    },

    achievementShiftPowerBase(this: StoreApi, state: GameState): number {
      return hasAchievementReward(state.achievements, 'shift_power_boost') ? 1.9 : 1.66
    },

    // Faz B — Bozulma seviyesi (K0..K4, K5 tavanlı). Store'a YENİ STATE eklenmez;
    // mevcut monotonik sinyallerden türetilir (sözleşme: visual-language.md §4).
    // resolvedUnlockedDimensionCount lifetimePeakMatter tabanlıdır (ADR-0072) → reset sonrası düşmez.
    corruptionLevel(this: StoreApi, state: GameState): CorruptionLevel {
      return deriveCorruptionLevel({
        unlockedDimensionsCount: resolvedUnlockedDimensionCount(state),
        singularities: state.singularities,
        nightWatchUnlocked: state.nightWatchUnlocked
      })
    }
}
