// Kayit slot + serialize/deserialize + cevrimdisi simulasyon action parcalari. `this`, StoreApi ile tiplenmistir.
import { sounds } from '../../core/audio'
import { D_0, D_1, D_INFINITY, Decimal } from '../../core/math'
import { musicEngine } from '../../core/music-engine'
import { SaveSystem } from '../../core/save'
import { MIN_SUPPORTED_SAVE_VERSION, SAVE_VERSION, SaveVersionError } from '../../core/save-version'
import { getAutobuyerInterval } from '../../game/autobuyer-data'
import { BASE_UNLOCKED_DIMENSIONS, OFFLINE_CAP_SECONDS, SACRIFICE_SHIFT_REQ, resolvedUnlockedDimensionCount } from '../../game/balance'
import { getChallengeById } from '../../game/challenges'
import { TIME_CLOCK_MAX_DRAG, TIME_CLOCK_SPAWN_INTERVAL_MIN, createIdleTimeClock } from '../../game/clock-data'
import { tierOfflineSimMult } from '../../game/dimension_identity'
import { LAB_SEEDS, VIRAL_DROP_COOLDOWN_SECONDS } from '../../game/lab-data'
import { JUMP_LOG_CAP } from '../../game/layers'
import { NEURAL_LEGACY_UPGRADE_IDS, NEURAL_TREE, SINGULARITY_UPGRADES } from '../../game/neural-data'
import { FEATURE_UNLOCKS, lifetimeUnlockDopamine, raisedLifetimePeak } from '../../game/unlocks'
import { ACHIEVEMENT_IDS, FEATURE_IDS, resetAchievementCache } from './cache'
import { clampSavedNumber, isValidBuffType, isValidLabSeedType, isValidStanceType, parseSavedDecimal, sanitizeCustomAudioUrl } from './guards'
import type { AutobuyerMode, BuffType, LabSeedType, OfflineReport, SerializedPlayerState } from '../../models/types'
import type { StoreApi } from './store-api'

interface StoreWithReset extends StoreApi {
  $reset: () => void
}

function safeDecimal(val: string | number | undefined, fallback: Decimal): Decimal {
  return parseSavedDecimal(val, fallback)
}

export const saveActions = {
    // Çevrimdışı İlerleme Simülatörü — 24 saat ile sınırlı, kademeli adımlı yakalama.
    // Kademeli adımlar tek dev delta'nın üstel boyut zincirini aşağılamasını engeller.
    // Rapor döndürür ve store.offlineReport'a yazar (Welcome Back modalı bunu gösterir).
    simulateOfflineProgress(this: StoreApi, offlineSeconds: number): OfflineReport | null {
      if (offlineSeconds <= 1) return null

      sounds.suppressed = true
      const cappedSeconds = Math.min(offlineSeconds, OFFLINE_CAP_SECONDS)
      const startProduced = this.stats.totalMatterProduced

      // Nöral Ağaç çevrimdışı kazanç düğümleri yalnızca bu simülasyon boyunca etkindir
      const previousBoost = this.offlineSimBoost
      this.offlineSimBoost =
        (1 + this.neuralEffects.offlineGainBonus) *
        tierOfflineSimMult(this.dimensions, this.unlockedDimensionsCount)
      this.offlineSimActive = true
      this.offlineAchTick = 0

      try {
        // Kademeli kaba-adım merdiveni (senkron kalır; 24h cap korunur):
        // ilk 60 sn 0.1 sn hassasiyet (botlar, buff süreleri, lab doğru işler),
        // sonra 10 dk'ya kadar 1 sn, ~50 dk'ya kadar 10 sn, kalanı 300 sn kaba adım.
        // 24 saatte toplam ≈600+600+300+275 ≈ 2k iterasyon (önceki 60 sn kaba
        // adımla ≈8k idi; donma şikayeti bu merdivenle çözülür).
        const detailedSeconds = Math.min(60, cappedSeconds)
        const steps = Math.floor(detailedSeconds / 0.1)
        let iterations = steps
        for (let s = 0; s < steps; s++) {
          this.update(0.1)
        }

        // Kalan süre: 1 sn adımları (10 dk'ya kadar), sonrasında 10 sn (~50 dk'ya kadar), ardından 300 sn
        let remainingSeconds = cappedSeconds - detailedSeconds
        const fineSteps = Math.min(remainingSeconds, 600)
        iterations += fineSteps
        for (let s = 0; s < fineSteps; s++) {
          this.update(1)
        }
        remainingSeconds -= fineSteps
        const mediumBudget = Math.min(remainingSeconds, 3000)
        const mediumSteps = Math.floor(mediumBudget / 10)
        iterations += mediumSteps
        for (let s = 0; s < mediumSteps; s++) {
          this.update(10)
        }
        remainingSeconds -= mediumSteps * 10
        const coarseSteps = Math.floor(remainingSeconds / 300)
        iterations += coarseSteps
        for (let s = 0; s < coarseSteps; s++) {
          this.update(300)
        }
        const leftover = remainingSeconds - coarseSteps * 300
        if (leftover > 0) {
          this.update(leftover)
          iterations++
        }
        console.info(`[offline] ${cappedSeconds}sn simüle edildi (${iterations} iterasyon)`)
      } finally {
        this.offlineSimBoost = previousBoost
        this.offlineSimActive = false
        sounds.suppressFor(300)
      }

      const gained = this.stats.totalMatterProduced.minus(startProduced)
      if (gained.lte(0)) return null

      this.offlineReport = {
        seconds: cappedSeconds,
        capped: offlineSeconds > OFFLINE_CAP_SECONDS,
        dopamineGained: gained
      }
      return this.offlineReport
    },

    dismissOfflineReport(this: StoreApi): void {
      this.offlineReport = null
    },

    // QoL Çoklu Kayıt Slotları (v22)
    switchSaveSlot(this: StoreApi, targetSlot: number): void {
      if (![1, 2, 3].includes(targetSlot)) return
      const currentSlot = this.settings.activeSlot
      // 1. Önce aktif slotu diske yaz
      SaveSystem.save(this.serialize(), currentSlot)
      SaveSystem.setActiveSlot(targetSlot)
      // 2. Hedef slotu yükle
      const loaded = SaveSystem.loadDetailed(targetSlot)
      if (loaded.state) {
        (this as unknown as StoreWithReset).$reset()
        this.settings.activeSlot = targetSlot
        this.deserialize(loaded.state)
        this.settings.activeSlot = targetSlot
        SaveSystem.save(this.serialize(), targetSlot)
      } else {
        // Hedef slotta henüz kayıt yoksa yeni oyun durumuna resetle ve kaydet
        (this as unknown as StoreWithReset).$reset()
        this.settings.activeSlot = targetSlot
        SaveSystem.save(this.serialize(), targetSlot)
        if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
          try {
            window.location.reload()
          } catch {
            // Test ortamında jsdom navigasyon kısıtını yut
          }
        }
      }
    },

    copySaveSlot(this: StoreApi, fromSlot: number, toSlot: number): boolean {
      if (fromSlot === toSlot) return false
      // Önce kaynak slot aktifse hafızadaki son durumu diske yaz
      if (this.settings.activeSlot === fromSlot) {
        SaveSystem.save(this.serialize(), fromSlot)
      }
      return SaveSystem.copySlot(fromSlot, toSlot)
    },

    deleteSaveSlot(this: StoreApi, slot: number): void {
      SaveSystem.deleteSlot(slot)
      if (this.settings.activeSlot === slot) {
        window.location.reload()
      }
    },

    restoreFromBackup(this: StoreApi): boolean {
      const restored = SaveSystem.restoreFromBackup()
      if (restored) {
        this.deserialize(restored)
        return true
      }
      return false
    },

    // State Serialization (Kayıt)
    serialize(this: StoreApi): SerializedPlayerState {
      const serializedAutobuyers: Record<string, { enabled: boolean; unlocked: boolean; mode?: AutobuyerMode; minGainSp?: number; customRule?: { maxGalaxies?: number } }> = {}
      Object.keys(this.autobuyers).forEach((k) => {
        serializedAutobuyers[k] = {
          enabled: this.autobuyers[k].enabled,
          unlocked: this.autobuyers[k].unlocked,
          mode: this.autobuyers[k].mode || 'single',
          minGainSp: this.autobuyers[k].minGainSp,
          // 0 = sınırsız tavan; tanımsızsa alan yazılmaz (eski kayıtlarla uyumlu)
          ...(this.autobuyers[k].customRule
            ? { customRule: { maxGalaxies: this.autobuyers[k].customRule?.maxGalaxies } }
            : {})
        }
      })

      return {
        version: SAVE_VERSION,
        matter: this.matter.toString(),
        dimensions: this.dimensions.map((d) => ({
          amount: d.amount.toString(),
          bought: d.bought
        })),
        tickspeedBought: this.tickspeedBought,
        dimensionShifts: this.dimensionShifts,
        dimensionCapFloor: this.dimensionCapFloor,
        formatDiscoverSeenCap: this.formatDiscoverSeenCap,
        formatUnlockBuffTier: this.formatUnlockBuffTier,
        formatUnlockBuffUntil: this.formatUnlockBuffUntil,
        galaxies: this.galaxies,
        singularityPoints: this.singularityPoints.toString(),
        singularities: this.singularities,
        nightWatchUnlocked: this.nightWatchUnlocked,
        currentStance: this.currentStance,
        activeBuffs: this.activeBuffs.map((b) => ({
          type: b.type,
          remaining: b.remaining,
          multiplier: b.multiplier,
          duration: b.duration,
          name: b.name
        })),
        slackers: this.slackers.map((s) => ({
          name: s.name,
          leechedDopamine: s.leechedDopamine.toString(),
          leechedKpi: s.leechedDopamine.toString()
        })),
        caffeineEnergy: this.reactorHeat,
        reactorHeat: this.reactorHeat,
        reactorMeltdownTimer: this.reactorMeltdownTimer,
        dilemmaCooldown: this.dilemmaCooldown,
        reactorCoolantCharges: this.reactorCoolantCharges,
        reactorCoolantTimer: this.reactorCoolantTimer,
        reactorMomentum: this.reactorMomentum,
        reactorCooldowns: { ...(this.reactorCooldowns || {}) },
        // ADR-0029: bu dört alan v12'de kaydedilmiyordu. maxCaffeineEnergy yükleme
        // sırasında clamp tavanı olarak kullanıldığı için (clampSavedNumber) kayıp
        // her zaman 100'e düşüyordu; viral üçlüsü ise canlı koşu ilerlemesiydi.
        maxCaffeineEnergy: this.maxCaffeineEnergy,
        isViralActive: this.isViralActive,
        viralTimeRemaining: this.viralTimeRemaining,
        viralViews: this.viralViews,
        // P1: boşalım bekleme damgası (yoksa eski kayıt varsayımıyla hazır başlar)
        lastViralAt: this.lastViralAt,
        labCells: this.labCells.map((c) => ({
          id: c.id,
          seedType: c.seedType,
          age: c.age,
          matureAge: c.matureAge,
          // JSON Infinity'yi saklayamaz (null'a dönüşür); çürümesiz hücreyi null yaz,
          // yüklemede null->Infinity olarak geri alınır.
          maxAge: Number.isFinite(c.maxAge) ? c.maxAge : null
        })),
        labHype: this.labHype,
        labMode: this.labMode,
        discoveredFormulas: [...this.discoveredFormulas],
        reactorCollapseCount: this.reactorCollapseCount || 0,
        autobuyers: serializedAutobuyers,
        autobuyerBulkUnlocked: this.autobuyerBulkUnlocked,
        autobuyerMaxUnlocked: this.autobuyerMaxUnlocked,
        singularityUpgrades: { ...this.singularityUpgrades },
        neuralNodesBought: { ...this.neuralNodesBought },
        clickCombo: { ...this.clickCombo },
        activeChallenge: this.activeChallenge,
        completedChallenges: [...this.completedChallenges],
        challengeBestTimes: { ...this.challengeBestTimes },
        // Aktif challenge koşu sayaçları (koşu-içi geçici durum; yüklemede clamp'lenir)
        challengeElapsed: this.challengeElapsed,
        challengeHaltUntil: this.challengeHaltUntil,
        challengeCostInflation: this.challengeCostInflation,
        challengeNotificationDoom: this.challengeNotificationDoom,
        challengeDim1Growth: this.challengeDim1Growth.toString(),
        claimedBounties: [...(this.claimedBounties || [])],
        decadeSurgeMult: this.decadeSurgeMult,
        sacrificeCount: this.sacrificeCount,
        sacrificeMultiplier: this.sacrificeMultiplier.toString(),
        neuralBots: this.neuralBots.toString(),
        napCount: this.napCount,
        napMultiplier: this.napMultiplier.toString(),
        mythicPity: this.mythicPity || 0,
        achievements: [...this.achievements],
        achievementsSeenCount: this.achievementsSeenCount,
        seenNewsIds: [...(this.seenNewsIds || [])],
        uselessNewsClicks: this.uselessNewsClicks || 0,
        hasClickedSecretNews: this.hasClickedSecretNews || false,
        unlockedFeatures: [...this.unlockedFeatures],
        // ADR-0035 (v15): açılış kalıcılığının asıl kaydı.
        lifetimePeakMatter: this.lifetimePeakMatter.toString(),
        lifetimePeakShifts: this.lifetimePeakShifts,
        lastUpdate: this.lastUpdate,
        settings: { ...this.settings },
        pastSingularities: this.pastSingularities.map((p) => ({
          id: p.id,
          duration: p.duration,
          spGained: p.spGained.toString(),
          spPerMinute: p.spPerMinute.toString(),
          peakMatter: p.peakMatter.toString(),
          timestamp: p.timestamp,
          challengeId: p.challengeId || null
        })),
        jumpLog: this.jumpLog.map((j) => ({
          id: j.id,
          layer: j.layer,
          timestamp: j.timestamp,
          runSeconds: j.runSeconds,
          peakLogMatter: j.peakLogMatter,
          shifts: j.shifts,
          galaxies: j.galaxies,
          singularities: j.singularities,
          spGained: j.spGained.toString()
        })),
        // Zaman Yayı (v18): yalnızca canlı yay durumu. `phase`/`speed`/`remainingTime`
        // uçucudur — kayıt yüklendiğinde saat nötr doğar (aşağıdaki deserialize).
        // Yaşam boyu istatistikler `stats` bloğunda taşınır (clockRewinds vb.).
        timeClock: {
          drag: this.timeClock.drag
        },
        stats: {
          manualClicks: this.stats.manualClicks,
          totalMatterProduced: this.stats.totalMatterProduced.toString(),
          highestMatter: this.stats.highestMatter.toString(),
          totalPlaytime: this.stats.totalPlaytime,
          singularityCount: this.stats.singularityCount,
          fastestSingularity: this.stats.fastestSingularity,
          highestDps: this.stats.highestDps.toString(),
          totalManualDopamine: this.stats.totalManualDopamine.toString(),
          anomaliesClicked: this.stats.anomaliesClicked || 0,
          mythicsClicked: this.stats.mythicsClicked || 0,
          combosTriggered: this.stats.combosTriggered || 0,
          slackersFired: this.stats.slackersFired || 0,
          labHarvests: this.stats.labHarvests || 0,
          spellsCast: this.stats.spellsCast || 0,
          seedsPlanted: this.stats.seedsPlanted || 0,
          challengesCompleted: this.stats.challengesCompleted || 0,
          reactorCollapses: this.stats.reactorCollapses || 0,
          clockRewinds: this.stats.clockRewinds || 0,
          clockRewoundSeconds: this.stats.clockRewoundSeconds || 0,
          clockBestTension: this.stats.clockBestTension || 0,
          clockPerfectReleases: this.stats.clockPerfectReleases || 0,
          clockStreak: this.stats.clockStreak || 0,
          clockBestStreak: this.stats.clockBestStreak || 0
        }
      }
    },

    // State Deserialization (Yükleme)
    deserialize(this: StoreApi, data: SerializedPlayerState): void {
      // Gelecek sürüm koruması: try bloğunun DIŞINDA ve ilk adımda. Daha yeni bir
      // build'in kaydı burada açılırsa, o build'in eklediği alanlar sessizce düşer
      // ve kayıt yeniden v12 olarak damgalanır (geriye dönük veri kaybı). Bu yüzden
      // reddediyoruz; çağıranlar SaveVersionError'ı yakalayıp oyuncuyu bilgilendirir.
      const declaredVersion = typeof data.version === 'number' ? data.version : 1
      if (declaredVersion > SAVE_VERSION) {
        throw new SaveVersionError(declaredVersion, SAVE_VERSION)
      }
      if (declaredVersion < MIN_SUPPORTED_SAVE_VERSION) {
        throw new Error(
          `Kayıt sürümü v${declaredVersion} desteklenmiyor (asgari v${MIN_SUPPORTED_SAVE_VERSION}). İlerleme sıfırlandı.`
        )
      }
      try {
        // Save versiyonu: sıralı migration kancası. Kırıcı değişikliklerde
        // "if (saveVersion < N) { ... }" blokları buraya eklenir.
        const saveVersion = declaredVersion

        this.neuralBots = D_0
        this.napCount = 0
        this.napMultiplier = D_1

        // v9- kayıt göçü: singularities alanı kaydedilmiyordu; çöküş sayacı istatistikten alınır
        if (saveVersion < 10 && typeof data.singularities !== 'number') {
          this.singularities = data.stats?.singularityCount || 0
        }

        this.matter = parseSavedDecimal(data.matter, new Decimal(10))
        if (Array.isArray(data.dimensions)) {
          data.dimensions.forEach((savedDim, i) => {
            // ADR-0029: bozuk kayıtta null eleman deserialize'un tamamını
            // yarı uygulanmış bırakıyordu (tek throw, stats + offline kaybı).
            if (this.dimensions[i] && savedDim && typeof savedDim === 'object') {
              this.dimensions[i].amount = parseSavedDecimal(savedDim.amount, D_0)
              this.dimensions[i].bought = clampSavedNumber(savedDim.bought, 0, 0, 1e12)
            }
          })
        }
        this.tickspeedBought = Math.floor(clampSavedNumber(data.tickspeedBought, 0, 0, 1e6))
        this.dimensionShifts = Math.floor(clampSavedNumber(data.dimensionShifts, 0, 0, 1e6))
        this.galaxies = Math.floor(clampSavedNumber(data.galaxies, 0, 0, 1e6))

        this.dimensionCapFloor = BASE_UNLOCKED_DIMENSIONS
        this.formatDiscoverSeenCap = BASE_UNLOCKED_DIMENSIONS
        this.formatUnlockBuffTier = 0
        this.formatUnlockBuffUntil = 0
        if (saveVersion < 12) {
          let progressCap = 2
          this.dimensions.forEach((d, i) => {
            if (d.bought > 0 || d.amount.gt(0)) {
              progressCap = Math.max(progressCap, i + 1)
            }
          })
          const legacyFloor = Math.max(4, Math.min(8, progressCap))
          this.dimensionCapFloor = legacyFloor
          // ADR-0072: açılış artık tepe kütleye bağlı. Bu göç bloğu, asıl tepe nokta
          // (lifetimePeakMatter) restore edilmeden ÖNCE çalışır; bu yüzden henüz
          // yüklenmiş olan `matter` geçici tepe kabul edilir. Sonuç `legacyFloor`
          // (>= 4) ile tabanlandığı için eski kayıtların açık tier sayısı düşmez.
          this.formatDiscoverSeenCap = Math.max(
            this.formatDiscoverSeenCap,
            resolvedUnlockedDimensionCount({
              lifetimePeakMatter: this.matter,
              dimensionCapFloor: legacyFloor,
              activeChallenge: null
            })
          )
        } else {
          if (typeof data.dimensionCapFloor === 'number') {
            this.dimensionCapFloor = clampSavedNumber(
              data.dimensionCapFloor,
              BASE_UNLOCKED_DIMENSIONS,
              2,
              8
            )
          }
          if (typeof data.formatDiscoverSeenCap === 'number') {
            this.formatDiscoverSeenCap = clampSavedNumber(
              data.formatDiscoverSeenCap,
              BASE_UNLOCKED_DIMENSIONS,
              2,
              8
            )
          }
          if (typeof data.formatUnlockBuffTier === 'number') {
            this.formatUnlockBuffTier = clampSavedNumber(data.formatUnlockBuffTier, 0, 0, 8)
          }
          if (typeof data.formatUnlockBuffUntil === 'number') {
            this.formatUnlockBuffUntil = Math.max(0, data.formatUnlockBuffUntil)
          }
        }

        if (typeof data.singularities === 'number') {
          this.singularities = Math.floor(clampSavedNumber(data.singularities, 0, 0, 1e6))
        }
        this.singularityPoints = data.singularityPoints
          ? safeDecimal(data.singularityPoints, new Decimal(0))
          : new Decimal(0)
        if (typeof data.nightWatchUnlocked === 'boolean') {
          this.nightWatchUnlocked = data.nightWatchUnlocked
        }
        this.mythicPity = typeof data.mythicPity === 'number' && Number.isFinite(data.mythicPity)
          ? Math.max(0, Math.min(25, Math.floor(data.mythicPity)))
          : 0

        // Geçersiz duruş değeri kayıttan sızmasın: default 'trend' duruşunda kal
        if (isValidStanceType(data.currentStance)) {
          this.currentStance = data.currentStance
        } else {
          this.currentStance = 'trend'
        }

        if (Array.isArray(data.activeBuffs)) {
          this.activeBuffs = data.activeBuffs
            .filter((b) => isValidBuffType(b.type) && b.type !== 'void' && b.type !== 'sponsor')
            .map((b) => {
              const remaining = clampSavedNumber(b.remaining, 0, 0, 86400)
              const defaultDuration =
                b.type === 'fyp'
                  ? 60
                  : b.type === 'espresso'
                    ? 30
                    : b.type === 'planck_surge'
                      ? 20
                      : b.type === 'resonance_boost'
                        ? 30
                        : 15
              const defaultMultiplier =
                b.type === 'fyp'
                  ? 7
                  : b.type === 'espresso'
                    ? 3
                    : b.type === 'planck_surge'
                      ? 4
                      : b.type === 'resonance_boost'
                        ? 5
                        : 777
              const defaultName =
                b.type === 'fyp'
                  ? '🔥 Gece 3 Çılgınlığı (7× Dopamin)'
                  : b.type === 'espresso'
                    ? '☕ Çift Espresso (3× Frekans)'
                    : b.type === 'planck_surge'
                      ? '💥 Planck Patlaması (4× Hz, 10× Yutma)'
                      : b.type === 'resonance_boost'
                        ? '🌌 Boyut Sıkışması (5× Boyutlar)'
                        : '🌌 Kütle Patlaması (777× Çekim)'

              const duration =
                typeof b.duration === 'number' && Number.isFinite(b.duration) && b.duration > 0
                  ? b.duration
                  : defaultDuration
              const multiplier =
                typeof b.multiplier === 'number' && Number.isFinite(b.multiplier) && b.multiplier > 0
                  ? b.multiplier
                  : defaultMultiplier
              const name =
                typeof b.name === 'string' && b.name.trim().length > 0
                  ? b.name
                  : defaultName

              return {
                id: `buff-${b.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: b.type as BuffType,
                name,
                duration,
                remaining,
                multiplier
              }
            })
            .filter((b) => b.remaining > 0)
        }

        if (Array.isArray(data.slackers)) {
          this.slackers = data.slackers.map((s) => ({
            id: `guilt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: s.name,
            leechedDopamine: parseSavedDecimal(s.leechedDopamine || s.leechedKpi, D_0),
            clicksRemaining: 3
          }))
        }

        if (typeof data.reactorHeat === 'number') {
          this.reactorHeat = clampSavedNumber(data.reactorHeat, 0, 0, 100)
        } else if (typeof data.caffeineEnergy === 'number') {
          this.reactorHeat = clampSavedNumber(data.caffeineEnergy, 0, 0, 100)
        } else {
          this.reactorHeat = 0
        }
        this.caffeineEnergy = this.reactorHeat

        this.reactorMeltdownTimer = typeof data.reactorMeltdownTimer === 'number'
          ? Math.max(0, data.reactorMeltdownTimer)
          : 0
        this.dilemmaCooldown = typeof data.dilemmaCooldown === 'number'
          ? Math.max(0, data.dilemmaCooldown)
          : 0

        this.reactorCoolantCharges = typeof data.reactorCoolantCharges === 'number'
          ? clampSavedNumber(data.reactorCoolantCharges, 3, 0, 3)
          : 3
        this.reactorCoolantTimer = typeof data.reactorCoolantTimer === 'number'
          ? Math.max(0, data.reactorCoolantTimer)
          : 0
        this.reactorMomentum = typeof data.reactorMomentum === 'number'
          ? clampSavedNumber(data.reactorMomentum, 1.0, 1.0, 5.0)
          : 1.0
        this.reactorCooldowns = data.reactorCooldowns && typeof data.reactorCooldowns === 'object'
          ? { ...data.reactorCooldowns }
          : {}

        if (typeof data.maxCaffeineEnergy === 'number') {
          this.maxCaffeineEnergy = clampSavedNumber(data.maxCaffeineEnergy, 100, 1, 100000)
        }

        // Viral Zirve koşu ilerlemesi (daha önce kaydedilmiyordu)
        this.isViralActive = data.isViralActive === true
        this.viralTimeRemaining = clampSavedNumber(data.viralTimeRemaining, 0, 0, 3600)
        this.viralViews = clampSavedNumber(data.viralViews, 0, 0, 1e15)
        // P1: eksikse hazır başlar (negatif başlangıç = bekleme yok)
        this.lastViralAt = clampSavedNumber(data.lastViralAt, -VIRAL_DROP_COOLDOWN_SECONDS, -1e12, 1e15)

        if (Array.isArray(data.labCells)) {
          data.labCells.forEach((savedCell, i) => {
            if (this.labCells[i]) {
              const seedType = isValidLabSeedType(savedCell.seedType) ? savedCell.seedType : null
              const age = clampSavedNumber(savedCell.age, 0, 0, 31536000)
              const seedGrowth = seedType
                ? LAB_SEEDS.find((seed) => seed.type === seedType)?.growthSeconds || 0
                : 0
              const savedMatureAge = clampSavedNumber(savedCell.matureAge, 0, 0, 31536000)
              const matureAge = seedType && savedMatureAge > 0 ? savedMatureAge : seedGrowth
              // JSON Infinity'yi taşıyamaz: plantSeed/update Infinity yazar ama
              // kayda null düşer. null->Infinity (çürümesiz hücre), sayıysa clamp'le.
              const maxAge = savedCell.maxAge == null ? Infinity : clampSavedNumber(savedCell.maxAge, 0, 0, 31536000)
              this.labCells[i].seedType = seedType
              this.labCells[i].age = age
              this.labCells[i].matureAge = matureAge
              this.labCells[i].maxAge = maxAge
              this.labCells[i].isMature = seedType !== null && age >= matureAge
            }
          })
        }

        if (typeof data.labHype === 'number') {
          this.labHype = clampSavedNumber(data.labHype, 0, 0, 100)
        }
        if (data.labMode === 'overdrive' || data.labMode === 'superconductor' || data.labMode === 'fluctuation') {
          this.labMode = data.labMode
        } else {
          this.labMode = 'overdrive'
        }
        if (Array.isArray(data.discoveredFormulas) && data.discoveredFormulas.length > 0) {
          const validFormulas = data.discoveredFormulas.filter((id): id is LabSeedType => isValidLabSeedType(id))
          this.discoveredFormulas = Array.from(new Set(['photon_resonator', ...validFormulas]))
        } else {
          const present = this.labCells.map((c) => c.seedType).filter((s): s is LabSeedType => s !== null)
          this.discoveredFormulas = Array.from(new Set(['photon_resonator', ...present]))
        }
        if (typeof data.reactorCollapseCount === 'number') {
          this.reactorCollapseCount = Math.max(0, data.reactorCollapseCount)
        }

        if (data.autobuyers) {
          Object.keys(data.autobuyers).forEach((k) => {
            if (this.autobuyers[k]) {
              this.autobuyers[k].enabled = data.autobuyers![k].enabled === true
              this.autobuyers[k].unlocked = data.autobuyers![k].unlocked === true
              const savedMode = data.autobuyers![k].mode
              this.autobuyers[k].mode = savedMode === 'bulk' || savedMode === 'max' ? savedMode : 'single'
              this.autobuyers[k].interval = getAutobuyerInterval(k, this.autobuyers[k].mode || 'single')
              this.autobuyers[k].timer = 0
              const savedMinGain = data.autobuyers![k].minGainSp
              if (typeof savedMinGain === 'number') {
                this.autobuyers[k].minGainSp = clampSavedNumber(savedMinGain, 1, 1, 1e6)
              }
              // Kokpit kuralı: Küme botu tavanı (0 = sınırsız korunur)
              const savedRule = data.autobuyers![k].customRule
              if (savedRule && typeof savedRule === 'object') {
                const savedMaxGalaxies = (savedRule as { maxGalaxies?: unknown }).maxGalaxies
                if (typeof savedMaxGalaxies === 'number') {
                  this.autobuyers[k].customRule = {
                    maxGalaxies: clampSavedNumber(savedMaxGalaxies, 0, 0, 1e6)
                  }
                }
              }
            }
          })
        }

        this.autobuyerBulkUnlocked = data.autobuyerBulkUnlocked ?? false
        this.autobuyerMaxUnlocked = data.autobuyerMaxUnlocked ?? false

        // Prestijli kayıt kalıcılık onarımı (Save migration guarantee)
        if (this.singularities >= 1) {
          this.ensureAutobuyersPreserved()
        }

        if (!this.autobuyerBulkUnlocked) {
          Object.values(this.autobuyers).forEach((b) => {
            if (b.mode === 'bulk' || b.mode === 'max') {
              b.mode = 'single'
              b.interval = getAutobuyerInterval(b.id, 'single')
            }
          })
        } else if (!this.autobuyerMaxUnlocked) {
          Object.values(this.autobuyers).forEach((b) => {
            if (b.mode === 'max') {
              b.mode = 'single'
              b.interval = getAutobuyerInterval(b.id, 'single')
            }
          })
        }

        // ADR-0029: singularityUpgrades da beyaz listeye alındı — nöral ağaç
        // (aşağıdaki blok) zaten böyle yapıyordu; dükkân kaydı ham merge ediliyordu.
        this.singularityUpgrades = {}
        if (data.singularityUpgrades && typeof data.singularityUpgrades === 'object') {
          for (const [upgId, rawLvl] of Object.entries(data.singularityUpgrades)) {
            const def = SINGULARITY_UPGRADES.find((u) => u.id === upgId)
            if (!def) continue
            if (typeof rawLvl !== 'number' || !Number.isFinite(rawLvl) || rawLvl <= 0) continue
            this.singularityUpgrades[upgId] = Math.min(Math.floor(rawLvl), def.maxLevel)
          }
        }

        // Nöral Ağaç (v9): eksik alanlarda güvenli varsayılan; yalnızca tanımlı düğüm id'leri kabul edilir
        const loadedNeuralNodes: Record<string, number> = {}
        if (data.neuralNodesBought && typeof data.neuralNodesBought === 'object') {
          Object.entries(data.neuralNodesBought).forEach(([nodeId, lvl]) => {
            const def = NEURAL_TREE.find((n) => n.id === nodeId)
            if (!def || typeof lvl !== 'number' || !Number.isFinite(lvl) || lvl <= 0) return
            loadedNeuralNodes[nodeId] = Math.min(Math.floor(lvl), def.maxLevel ?? 1)
          })
        }
        // Eski kayıt göçü: düz dükkân seviyeleri ağaçtaki karşılık düğümlere yansıtılır
        NEURAL_LEGACY_UPGRADE_IDS.forEach((legacyId) => {
          const shopLvl = this.singularityUpgrades?.[legacyId] || 0
          if (shopLvl > (loadedNeuralNodes[legacyId] || 0)) {
            loadedNeuralNodes[legacyId] = shopLvl
          }
        })
        // Kayıt şişmesine karşı toplam düğüm sayısını caple (ağaç ~25 düğüm; 40 güvenli tavan)
        for (const key of Object.keys(loadedNeuralNodes).slice(40)) {
          delete loadedNeuralNodes[key]
        }
        this.neuralNodesBought = loadedNeuralNodes

        // Gece Krizi (v10): whitelist doğrulaması — kayıtlı id registry'de yoksa geçersiz sayılır
        if (typeof data.activeChallenge === 'string' && getChallengeById(data.activeChallenge)) {
          this.activeChallenge = data.activeChallenge
          // Koşu-içi sayaçlar kayıttan yüklenir (yoksa koşu başı varsayılanı)
          this.challengeElapsed = clampSavedNumber(data.challengeElapsed, 0, 0, 1e9)
          this.challengeHaltUntil = clampSavedNumber(data.challengeHaltUntil, 0, 0, 3600)
          this.challengeSinceBuy = 9999
          this.challengeCostInflation = clampSavedNumber(data.challengeCostInflation, 0, 0, 1e9)
          this.challengeNotificationDoom = clampSavedNumber(data.challengeNotificationDoom, 0, 0, 1e9)
          this.challengeDim1Growth = parseSavedDecimal(data.challengeDim1Growth, new Decimal(1))
        } else {
          // Güvenli bitir (exitChallenge eşdeğeri): deserialize ortasında gerçek
          // exitChallenge() çağrılmaz çünkü resetRunState() az önce yüklenen
          // koşu durumunu (matter/boyutlar) sıfırlardı. Sayaçlar temizlenir, koşu düşer.
          this.activeChallenge = null
          this.challengeElapsed = 0
          this.challengeHaltUntil = 0
          this.challengeSinceBuy = 9999
          this.challengeCostInflation = 0
          this.challengeNotificationDoom = 0
          this.challengeDim1Growth = new Decimal(1)
        }
        if (Array.isArray(data.completedChallenges)) {
          this.completedChallenges = data.completedChallenges.filter(
            (id): id is string => typeof id === 'string' && !!getChallengeById(id)
          )
        } else {
          this.completedChallenges = []
        }
        const loadedBestTimes: Record<string, number> = {}
        if (data.challengeBestTimes && typeof data.challengeBestTimes === 'object') {
          Object.entries(data.challengeBestTimes).forEach(([id, secs]) => {
            if (getChallengeById(id) && typeof secs === 'number' && Number.isFinite(secs) && secs >= 0) {
              loadedBestTimes[id] = secs
            }
          })
        }
        this.challengeBestTimes = loadedBestTimes
        // Not: challenge koşu sayaçları yukarıdaki activeChallenge bloğunda
        // kayıttan yüklenir (veya güvenli bitirişle sıfırlanır); burada ezilmez.

        // Combo serisi geçicidir: kayıttan yüklense bile bayat lastClickAt decay ile sıfırlanır
        if (
          data.clickCombo &&
          typeof data.clickCombo.count === 'number' &&
          Number.isFinite(data.clickCombo.count) &&
          typeof data.clickCombo.lastClickAt === 'number'
        ) {
          this.clickCombo = {
            count: Math.floor(clampSavedNumber(data.clickCombo.count, 0, 0, 100000)),
            lastClickAt: data.clickCombo.lastClickAt
          }
        } else {
          this.clickCombo = { count: 0, lastClickAt: 0 }
        }

        if (Array.isArray(data.claimedBounties)) {
          this.claimedBounties = data.claimedBounties
            .filter((e): e is number => typeof e === 'number' && Number.isFinite(e))
            .slice(0, 200)
        } else {
          this.claimedBounties = []
        }
        // ADR-0034: Koşu içi Dekad Yükselişi çarpanı. v14- kayıtlarda bu alan yok;
        // o kayıtlar SP olarak ödedikleri primleri korur, yükseliş 1'den başlar.
        this.decadeSurgeMult =
          typeof data.decadeSurgeMult === 'number' && Number.isFinite(data.decadeSurgeMult)
            ? clampSavedNumber(data.decadeSurgeMult, 1, 1, 1000)
            : 1
        this.sacrificeCount = Math.floor(clampSavedNumber(data.sacrificeCount, 0, 0, 1e6))
        if (data.sacrificeMultiplier) {
          this.sacrificeMultiplier = parseSavedDecimal(data.sacrificeMultiplier, D_1)
        }

        if (data.neuralBots) {
          this.neuralBots = parseSavedDecimal(data.neuralBots, D_0)
        }
        if (typeof data.napCount === 'number') {
          this.napCount = Math.floor(clampSavedNumber(data.napCount, 0, 0, Number.MAX_SAFE_INTEGER))
        }
        if (data.napMultiplier) {
          this.napMultiplier = parseSavedDecimal(data.napMultiplier, D_1)
        }

        if (Array.isArray(data.achievements)) {
          this.achievements = data.achievements.filter(
          (id) => typeof id === 'string' && ACHIEVEMENT_IDS.has(id)
        )
        // Başarım listesi değiştiğinde çarpan memo'su düşmeli.
        resetAchievementCache()
        }
        if (typeof data.achievementsSeenCount === 'number') {
          this.achievementsSeenCount = Math.floor(clampSavedNumber(data.achievementsSeenCount, 0, 0, 1e6))
        }

        if (Array.isArray(data.seenNewsIds)) {
          this.seenNewsIds = data.seenNewsIds
            .filter((id) => typeof id === 'string')
            .slice(0, 500)
        }
        if (typeof data.uselessNewsClicks === 'number') {
          this.uselessNewsClicks = clampSavedNumber(data.uselessNewsClicks, 0, 0, 1000000)
        }
        if (typeof data.hasClickedSecretNews === 'boolean') {
          this.hasClickedSecretNews = data.hasClickedSecretNews
        }

        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings }
          // Kayıttan gelen enum ayarlar beyaz listeden geçer (bozuk/gelecek
          // sürüm değeri UI'yı kırmasın); sayısal olan clamp'lenir.
          if (!['standard', 'scientific', 'engineering', 'logarithm'].includes(this.settings.notation)) {
            this.settings.notation = 'standard'
          }
          if (this.settings.decimalPlaces !== 2 && this.settings.decimalPlaces !== 3) {
            this.settings.decimalPlaces = 2
          }
          if (!['cyberpunk', 'dark'].includes(this.settings.theme)) {
            this.settings.theme = 'cyberpunk'
          }
          if (!['calm', 'balanced', 'tilt'].includes(this.settings.juiceMode)) {
            this.settings.juiceMode = 'balanced'
          }
          this.settings.customAudioUrl = sanitizeCustomAudioUrl(this.settings.customAudioUrl)
          sounds.enabled = this.settings.soundEnabled
          sounds.volume = this.settings.soundVolume
          musicEngine.enabled = this.settings.musicEnabled ?? true
          musicEngine.volume = this.settings.musicVolume ?? 0.35
          musicEngine.currentTrack = this.settings.musicTrack ?? 'lofi_chill'
          musicEngine.vinylCrackle = this.settings.vinylCrackle ?? true
          musicEngine.rainEnabled = this.settings.rainEnabled ?? true
          musicEngine.rainLevel = this.settings.rainLevel ?? 0.5
          musicEngine.intensity = this.settings.musicIntensity ?? 0.5
          // P0 Balatro: eski kayıtlarda eksik alanlar varsayılanla dolar
          // (ADR-0069: crtEffect alanı kaldırıldı — eski kayıtlardaki değer yok sayılır)
          if (this.settings.screenShake === undefined) this.settings.screenShake = true
          if (this.settings.juiceMode === undefined) this.settings.juiceMode = 'balanced'
          if (this.settings.screenOverlayEffects === undefined) this.settings.screenOverlayEffects = true
          if (this.settings.sideHands === undefined) this.settings.sideHands = true
          if (this.settings.holoCardsEnabled === undefined) this.settings.holoCardsEnabled = true
          if (this.settings.swirlShaderQuality === undefined) this.settings.swirlShaderQuality = 'balanced'
          if (this.settings.decimalPlaces === undefined) this.settings.decimalPlaces = 2
          if (this.settings.batterySaver === undefined) this.settings.batterySaver = false
          // Hareket 3-durum kontratı: legacy kayıt (motionMode alanı yok) reduceAnimations'tan
          // türetilir ve iki alan senkron tutulur — eski RA okuyucuları 'off' kararını da görsün.
          if (data.settings.motionMode === undefined) {
            this.settings.motionMode = data.settings.reduceAnimations === true ? 'reduced' : 'full'
          }
          if (this.settings.motionMode !== 'full' && this.settings.motionMode !== 'reduced' && this.settings.motionMode !== 'off') {
            this.settings.motionMode = 'full'
          }
          this.settings.reduceAnimations = this.settings.motionMode !== 'full'
          if (this.settings.floatingTexts === undefined) this.settings.floatingTexts = true
          if (this.settings.newsTickerEnabled === undefined) this.settings.newsTickerEnabled = true
          if (this.settings.swipeSensitivity === undefined) this.settings.swipeSensitivity = 'balanced'
          if (this.settings.offlineProgressModal === undefined) this.settings.offlineProgressModal = true
          if (this.settings.hotkeysEnabled === undefined) this.settings.hotkeysEnabled = true
          if (this.settings.activeSlot === undefined) this.settings.activeSlot = SaveSystem.getActiveSlot()
          if (this.settings.customAudioUrl) {
            musicEngine.customUrl = this.settings.customAudioUrl
          }
        }

        if (Array.isArray(data.pastSingularities)) {
          this.pastSingularities = data.pastSingularities
            .map((p) => ({
              id: p.id,
              duration: p.duration,
              spGained: parseSavedDecimal(p.spGained, D_0),
              spPerMinute: parseSavedDecimal(p.spPerMinute, D_0),
              peakMatter: parseSavedDecimal(p.peakMatter, D_0),
              timestamp: p.timestamp || Date.now(),
              challengeId: p.challengeId || null
            }))
            .slice(0, 50)
        } else {
          this.pastSingularities = []
        }

        if (Array.isArray(data.jumpLog)) {
          const validLayers = ['shift', 'galaxy', 'singularity'] as const
          this.jumpLog = data.jumpLog
            .filter((j) => j && validLayers.includes(j.layer))
            .map((j) => ({
              id: Math.floor(clampSavedNumber(j.id, 0, 0, 1e9)),
              layer: j.layer,
              timestamp: j.timestamp || Date.now(),
              runSeconds: clampSavedNumber(j.runSeconds, 0, 0, 1e10),
              peakLogMatter: clampSavedNumber(j.peakLogMatter, 0, -1e9, 1e9),
              shifts: Math.floor(clampSavedNumber(j.shifts, 0, 0, 1e6)),
              galaxies: Math.floor(clampSavedNumber(j.galaxies, 0, 0, 1e6)),
              singularities: Math.floor(clampSavedNumber(j.singularities, 0, 0, 1e6)),
              spGained: parseSavedDecimal(j.spGained, D_0)
            }))
            .slice(0, JUMP_LOG_CAP)
        } else {
          this.jumpLog = []
        }

        if (data.stats) {
          this.stats = {
            manualClicks: Math.floor(clampSavedNumber(data.stats.manualClicks, 0, 0, 1e12)),
            totalMatterProduced: parseSavedDecimal(data.stats.totalMatterProduced, new Decimal(10)),
            highestMatter: parseSavedDecimal(data.stats.highestMatter, new Decimal(10)),
            totalPlaytime: clampSavedNumber(data.stats.totalPlaytime, 0, 0, 1e10),
            singularityCount: Math.floor(clampSavedNumber(data.stats.singularityCount, 0, 0, 1e6)),
            fastestSingularity:
              typeof data.stats.fastestSingularity === 'number' && Number.isFinite(data.stats.fastestSingularity)
                ? clampSavedNumber(data.stats.fastestSingularity, Infinity, 0, 1e10)
                : Infinity,
            highestDps: parseSavedDecimal(data.stats.highestDps, D_0),
            totalManualDopamine: parseSavedDecimal(data.stats.totalManualDopamine, D_0),
            anomaliesClicked: Math.floor(clampSavedNumber(data.stats.anomaliesClicked, 0, 0, 1e12)),
            mythicsClicked: Math.floor(clampSavedNumber(data.stats.mythicsClicked, 0, 0, 1e12)),
            combosTriggered: Math.floor(clampSavedNumber(data.stats.combosTriggered, 0, 0, 1e12)),
            slackersFired: Math.floor(clampSavedNumber(data.stats.slackersFired, 0, 0, 1e12)),
            labHarvests: Math.floor(clampSavedNumber(data.stats.labHarvests, 0, 0, 1e12)),
            spellsCast: Math.floor(clampSavedNumber(data.stats.spellsCast, 0, 0, 1e12)),
            seedsPlanted: Math.floor(clampSavedNumber(data.stats.seedsPlanted, 0, 0, 1e12)),
            challengesCompleted: Math.floor(clampSavedNumber(data.stats.challengesCompleted, 0, 0, 1e6)),
            reactorCollapses: Math.floor(clampSavedNumber(data.stats.reactorCollapses, 0, 0, 1e6)),
            // Zaman Yayı yaşam boyu istatistikleri (v18): `stats` alanları prestijden sağ çıkar.
            clockRewinds: Math.floor(clampSavedNumber(data.stats.clockRewinds, 0, 0, 1e9)),
            clockRewoundSeconds: clampSavedNumber(data.stats.clockRewoundSeconds, 0, 0, 1e15),
            clockBestTension: clampSavedNumber(data.stats.clockBestTension, 0, 0, 1),
            clockPerfectReleases: Math.floor(clampSavedNumber(data.stats.clockPerfectReleases, 0, 0, 1e9)),
            clockStreak: Math.floor(clampSavedNumber(data.stats.clockStreak, 0, 0, 1e9)),
            clockBestStreak: Math.floor(clampSavedNumber(data.stats.clockBestStreak, 0, 0, 1e9))
          }
          // Eski kayıt göçü (v9-): yukarıdaki version kancası atlandıysa (bozuk versiyon alanı) yine de güvence altına al
          if (typeof this.singularities !== 'number' || Number.isNaN(this.singularities)) {
            this.singularities = this.stats.singularityCount || 0
          }
        }

        // Özellik Merdiveni (v0.11.0): yapışkan kilitlemeleri yükle, eksikleri hesapla
        // Kayıt beyaz listeden geçer: FEATURE_UNLOCKS'ta olmayan id düşer, liste merdiven boyuyla cap'lenir.
        if (Array.isArray(data.unlockedFeatures)) {
          this.unlockedFeatures = data.unlockedFeatures
            .filter((id): id is string => typeof id === 'string' && FEATURE_IDS.has(id))
            .slice(0, FEATURE_UNLOCKS.length)
        }

        // ADR-0035 (v15) — geriye dönük uyumlu yükleme, veri KAYBI YOK.
        // Alan yoksa (v14 ve öncesi kayıtlar) tepe noktalar mevcut veriden türetilir:
        //   • lifetimePeakMatter ← max(kayıtlı tepe, stats.highestMatter, mevcut dopamin).
        //     `stats.highestMatter` zaten hayat boyu zirvedir; dopamin kapısını geçmiş
        //     her oyuncu böylece açılışlarını aynı oturumda geri kazanır — hiçbir
        //     özellik "kayıtta yoktu" diye yeniden kilitlenmez.
        //   • lifetimePeakShifts ← max(kayıtlı tepe, dimensionShifts, eski D8 satın alımı).
        // syncUnlocks() ve simulateOfflineProgress() bundan SONRA çağrılır; sıralama önemli.
        const restoredPeak = parseSavedDecimal(data.lifetimePeakMatter, new Decimal(10))
        this.lifetimePeakMatter = lifetimeUnlockDopamine(
          this.stats.highestMatter,
          raisedLifetimePeak(this.matter, restoredPeak)
        )
        let restoredShifts = clampSavedNumber(data.lifetimePeakShifts, 0, 0, 1e9)
        if (this.dimensionShifts > restoredShifts) restoredShifts = this.dimensionShifts
        if (this.dimensions[7] && this.dimensions[7].bought > 0) {
          restoredShifts = Math.max(restoredShifts, SACRIFICE_SHIFT_REQ)
        }
        this.lifetimePeakShifts = Math.floor(restoredShifts)
        if (!this.hasBreakSingularity && this.matter.gte(D_INFINITY)) {
          this.matter = D_INFINITY
        }
        this.syncUnlocks()

        const now = Date.now()
        const savedLastUpdate = clampSavedNumber(data.lastUpdate, now, 0, now)
        const diffSeconds = Math.max(0, (now - savedLastUpdate) / 1000)
        if (diffSeconds > 3) {
          this.simulateOfflineProgress(diffSeconds)
        }

        // Zaman Yayı (v18): kayıttan yalnızca birikmiş çevirme miktarı okunur — CANLI FAZ her
        // zaman `idle`'a döner (createIdleTimeClock tabanı: active=false, speed=1,
        // remainingTime=0, speedRemaining=0). `floatingAnomalies = []` ile aynı uçucu
        // muamele: yarıda kalmış bir sarma/salgı oturuma taşınmaz. Yaşam boyu istatistikler
        // `stats` bloğundan okunur (yukarıda). v17 ve öncesi kayıtlarda alan yok → nötr
        // varsayılan, veri kaybı yok.
        const savedClock = data.timeClock
        this.timeClock = {
          ...createIdleTimeClock(),
          drag: clampSavedNumber(savedClock?.drag, 0, 0, TIME_CLOCK_MAX_DRAG)
        }
        this.clockTimer = 0
        this.nextClockInterval = TIME_CLOCK_SPAWN_INTERVAL_MIN

        this.floatingAnomalies = []
        this.activeCrisisDilemma = null
        this.crisisBackfireDebuff = 0

        // ADR-0072 §A: kutlama sayacını yüklenen duruma SESSİZCE hizala. Bu satır,
        // restore sonrası ilk canlı tick'in "artış" görüp geçmiş açılışları yeniden
        // kutlamasını engeller. Çevrimdışı simülasyon bu noktadan ÖNCE çalıştığı için
        // sayaç nihai (post-offline) değere hizalanır; dönüşte gecikmeli patlama olmaz.
        this.celebratedDimensionCap = this.unlockedDimensionsCount
      } catch (err) {
        console.error('Save yüklenirken hata:', err)
      }
    }
}
