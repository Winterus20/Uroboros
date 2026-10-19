// Durus, bot, haber, basarim, sekme, oyun dongusu ve muzik/ayar action parcalari. `this`, StoreApi ile tiplenmistir.
import { sounds } from '../../core/audio'
import { isPageVisible, safeConfetti } from '../../core/celebrate'
import { D_0, D_1, D_INFINITY, Decimal } from '../../core/math'
import { musicEngine } from '../../core/music-engine'
import { ACHIEVEMENTS } from '../../game/achievements'
import { AUTOBUYER_BULK_COST, AUTOBUYER_COSTS, AUTOBUYER_MAX_COST, getAutobuyerInterval } from '../../game/autobuyer-data'
import { ACH_CHECK_INTERVAL, CHALLENGE_DOOM_GALAXY_ACCEL, CHALLENGE_DOOM_SHIFT_ACCEL, DIMENSION_CHAIN_RATE, NIGHT_WATCH_THRESHOLD, UNLOCK_CHECK_INTERVAL } from '../../game/balance'
import { getChallengeById } from '../../game/challenges'
import { applyTensionDecay, dragFromTension, durationFromPeakSpeed, releaseSpeedAt } from '../../game/clock-data'
import { LAB_RECIPES, LAB_SEEDS } from '../../game/lab-data'
import { COMBO_DECAY_MS } from '../../game/neural-data'
import { log10Safe } from '../../game/pacing'
import { FEATURE_UNLOCKS, checkUnlock, raisedLifetimePeak } from '../../game/unlocks'
import { ACHIEVEMENTS_BY_CATEGORY, _dimCostCache } from './cache'
import { sanitizeCustomAudioUrl } from './guards'
import type { AchievementContext, AutobuyerMode, LabCell, LabSeedType, MusicTrackId, StanceType } from '../../models/types'
import type { StoreApi } from './store-api'

export const miscActions = {
    // Kütle Ekleme ve Planck Duvarı (Hard-Cap) Güvencesi
    addMatter(this: StoreApi, amount: Decimal, trackTotal = true): void {
      if (amount.lte(0)) return
      if (!this.hasBreakSingularity && this.matter.gte(D_INFINITY)) {
        this.matter = D_INFINITY
        return
      }
      this.matter = this.matter.plus(amount)
      if (trackTotal) {
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(amount)
      }
      if (!this.hasBreakSingularity && this.matter.gte(D_INFINITY)) {
        this.matter = D_INFINITY
      }
      if (this.matter.gt(this.stats.highestMatter)) {
        this.stats.highestMatter = this.matter
      }
    },

    // Gece Duruşunu Değiştir (Çılgın Kaydırma / Düşük Parlaklık: D1×50 ile açılır)
    setStance(this: StoreApi, stance: StanceType): void {
      if (this.currentStance === stance) return
      if (stance === 'spam' && !this.isFeatureUnlocked('stance_spam')) return
      if (stance === 'private_mode' && !this.isFeatureUnlocked('stance_private')) return
      this.currentStance = stance
      sounds.playStance()
    },

    /** D2+ satırında: alt formata saniyelik besleme (miktar arttığında anında yükselir). */

    // Otomatik Bot Aç/Kapa
    toggleAutobuyer(this: StoreApi, id: string): void {
      const bot = this.autobuyers[id]
      if (!bot || !bot.unlocked) return
      bot.enabled = !bot.enabled
      sounds.playToggleBot()
    },

    // Tüm açılmış botları tek tıkla aç / kapat
    toggleAllAutobuyers(this: StoreApi, enable?: boolean): void {
      const unlockedBots = Object.values(this.autobuyers).filter((b) => b.unlocked)
      if (unlockedBots.length === 0) return

      const targetState = enable !== undefined ? enable : !unlockedBots.every((b) => b.enabled)
      unlockedBots.forEach((b) => {
        b.enabled = targetState
      })
      sounds.playToggleBot()
    },

    // Tüm açılmış botların modunu tek tıkla değiştir ('single' | 'bulk' | 'max')
    setAllAutobuyerModes(this: StoreApi, mode: AutobuyerMode): boolean {
      if (mode === 'bulk' && !this.autobuyerBulkUnlocked) return false
      if (mode === 'max' && !this.autobuyerMaxUnlocked) return false

      Object.keys(this.autobuyers).forEach((id) => {
        const bot = this.autobuyers[id]
        if (bot && bot.unlocked && id !== 'singularity') {
          bot.mode = mode
          bot.interval = getAutobuyerInterval(id, mode)
          bot.timer = 0
        }
      })
      sounds.playToggleBot()
      return true
    },

    // Prestij / Deserialize Kalıcılık Garantisi
    ensureAutobuyersPreserved(this: StoreApi): void {
      if (this.singularities >= 1) {
        // 1. Kademe kilitleri kalıcı açılır
        this.autobuyerBulkUnlocked = true
        this.autobuyerMaxUnlocked = true

        // 2. Temel 11 bot kalıcı olarak açılır
        const permanentIds = [
          'dim1', 'dim2', 'dim3', 'dim4', 'dim5', 'dim6', 'dim7', 'dim8',
          'tickspeed', 'shift', 'galaxy'
        ]
        permanentIds.forEach((id) => {
          if (this.autobuyers[id]) {
            this.autobuyers[id].unlocked = true
          }
        })

        // 3. Şafak Nöbeti Botu: 3. çöküşten sonra kalıcı açılır
        if (this.singularities >= 3 && this.autobuyers.singularity) {
          this.autobuyers.singularity.unlocked = true
        }
      }
    },

    // Otomatik Bot Kilidini Aç (her zaman tekli modda başlar)
    unlockAutobuyer(this: StoreApi, id: string): boolean {
      if (this.singularities >= 1) return false
      const bot = this.autobuyers[id]
      if (!bot || bot.unlocked) return false
      if (!this.isAutobuyerRequirementMet(id)) return false

      const cost = AUTOBUYER_COSTS[id] || new Decimal(1e6)
      if (this.matter.gte(cost)) {
        this.matter = this.matter.minus(cost)
        bot.unlocked = true
        bot.enabled = true
        bot.mode = 'single'
        bot.interval = getAutobuyerInterval(id, 'single')
        bot.timer = 0
        sounds.playBuy(3)
        return true
      }
      return false
    },

    // Toplu modu global aç (tüm botlar için bulk seçilebilir olur)
    // Açık olan botlar otomatik ×10'a geçer (kapalılara dokunulmaz).
    unlockBulkMode(this: StoreApi): boolean {
      if (this.autobuyerBulkUnlocked) return false
      if (!this.canUnlockBulk) return false
      this.matter = this.matter.minus(AUTOBUYER_BULK_COST)
      this.autobuyerBulkUnlocked = true
      Object.keys(this.autobuyers).forEach((id) => {
        const bot = this.autobuyers[id]
        if (bot && bot.unlocked && bot.enabled && id !== 'singularity') {
          bot.mode = 'bulk'
          bot.interval = getAutobuyerInterval(id, 'bulk')
          bot.timer = 0
        }
      })
      sounds.playBuy(3)
      return true
    },

    // Max modu global aç (bulk açık olmalı + galaxy ister)
    // Açık olan botlar otomatik MAKS'a geçer (kapalılara dokunulmaz).
    unlockMaxMode(this: StoreApi): boolean {
      if (this.autobuyerMaxUnlocked) return false
      if (!this.canUnlockMax) return false
      this.matter = this.matter.minus(AUTOBUYER_MAX_COST)
      this.autobuyerMaxUnlocked = true
      Object.keys(this.autobuyers).forEach((id) => {
        const bot = this.autobuyers[id]
        if (bot && bot.unlocked && bot.enabled && id !== 'singularity') {
          bot.mode = 'max'
          bot.interval = getAutobuyerInterval(id, 'max')
          bot.timer = 0
        }
      })
      sounds.playBuy(4)
      safeConfetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#a855f7', '#ffffff']
      })
      return true
    },

    // Bot modunu değiştir (bulk/max kilitliyse izin verme)
    setAutobuyerMode(this: StoreApi, id: string, mode: AutobuyerMode): boolean {
      const bot = this.autobuyers[id]
      if (!bot || !bot.unlocked) return false
      if (mode === 'bulk' && !this.autobuyerBulkUnlocked) return false
      if (mode === 'max' && !this.autobuyerMaxUnlocked) return false
      bot.mode = mode
      bot.interval = getAutobuyerInterval(id, mode)
      bot.timer = 0
      sounds.playToggleBot()
      return true
    },

    // ---- Kozmik Haber Bandı Takibi (ADR-0045) ----
    recordNewsSeen(this: StoreApi, newsId: string): void {
      if (!this.seenNewsIds.includes(newsId)) {
        this.seenNewsIds.push(newsId)
        if (this.seenNewsIds.length >= 50) {
          this.checkAchievements()
        }
      }
    },

    recordNewsClick(this: StoreApi, isSecret = false): void {
      this.uselessNewsClicks++
      if (isSecret) {
        this.hasClickedSecretNews = true
      }
      this.checkAchievements()
    },

    // ---- Başarım Kontrol Motoru (update() sonunda çalışır; offline'da da tetiklenir) ----
    checkAchievements(this: StoreApi): void {
      if (this.achievements.length >= ACHIEVEMENTS.length) return
      const unlocked = new Set(this.achievements)
      const ctx: AchievementContext = {
        manualClicks: this.stats.manualClicks,
        totalMatter: this.stats.totalMatterProduced,
        highestMatter: this.stats.highestMatter,
        matter: this.matter,
        playtime: this.stats.totalPlaytime,
        singularityCount: this.stats.singularityCount,
        anomaliesClicked: this.stats.anomaliesClicked,
        mythicsClicked: this.stats.mythicsClicked || 0,
        combosTriggered: this.stats.combosTriggered,
        slackersFired: this.stats.slackersFired,
        labHarvests: this.stats.labHarvests || 0,
        spellsCast: this.stats.spellsCast || 0,
        seedsPlanted: this.stats.seedsPlanted || 0,
        tickspeedBought: this.tickspeedBought,
        shifts: this.dimensionShifts,
        galaxies: this.galaxies,
        sp: this.singularityPoints,
        spUpgradesTotal: (() => {
          const allKeys = new Set([
            ...Object.keys(this.singularityUpgrades || {}),
            ...Object.keys(this.neuralNodesBought || {})
          ])
          let total = 0
          for (const k of allKeys) {
            total += Math.max(this.singularityUpgrades[k] || 0, this.neuralNodesBought[k] || 0)
          }
          return total
        })(),
        guiltImmunityLvl: Math.max(
          this.singularityUpgrades?.guilt_immunity || 0,
          this.neuralNodesBought?.guilt_immunity || 0
        ),
        dimBoughtTotal: this.dimensions.reduce((a, d) => a + d.bought, 0),
        dimBought0: this.dimensions[0]?.bought || 0,
        unlockedBots: Object.values(this.autobuyers).filter((b) => b.unlocked).map((b) => b.id),
        bulkUnlocked: this.autobuyerBulkUnlocked,
        maxUnlocked: this.autobuyerMaxUnlocked,
        neuralBots: this.neuralBots,
        napCount: this.napCount,
        matureCells: this.labCells.filter((c) => c.isMature && !!c.seedType).length,
        hasBrainrot: this.labCells.some((c) => c.seedType === 'higgs_boson'),
        hasMatureBrainrot: this.labCells.some((c) => c.seedType === 'higgs_boson' && c.isMature),
        activeSlackers: this.slackers.length,
        leechedTotal: this.slackers.reduce((a, s) => a.plus(s.leechedDopamine), D_0),
        wallHour: new Date().getHours(),
        completedChallenges: [...this.completedChallenges],
        seenNewsCount: this.seenNewsIds.length,
        hasClickedSecretNews: this.hasClickedSecretNews
      }

      let newCount = 0
      let unlockedAnyReward = false
      let completedRow = false

      ACHIEVEMENTS.forEach((def) => {
        if (unlocked.has(def.id)) return
        if (!def.check(ctx)) return
        this.achievements.push(def.id)
        unlocked.add(def.id)
        newCount++
        this.achievementToastQueue.push(def.id)
        if (this.achievementToastQueue.length > 5) {
          this.achievementToastQueue.shift()
        }
        if (def.reward) unlockedAnyReward = true
        // ADR-0029: kategori indeksi modül yükünde bir kez kurulur. Önceden
        // ACHIEVEMENTS.filter() her adayın İÇİNDE çalışıyordu (O(n²) ≈ 4.4k
        // karşılaştırma, 0.5 sn'de bir).
        const catDefs = ACHIEVEMENTS_BY_CATEGORY.get(def.category) ?? [def]
        if (catDefs.every((a) => a.id === def.id || unlocked.has(a.id))) {
          completedRow = true
        }
      })

      if (newCount === 0) return
      // Maliyet memo'su başarım bayrağını anahtarında taşır; yine de yeni
      // başarım (öz. dim_cost_x085) sonrası cache'i düşürmek güvenli taraftır.
      _dimCostCache.clear()
      // QoL: çevrimdışı simülasyonda ses/konfeti çalmaz (yükleme ekranında patlamasın)
      // + gizli tarayıcı sekmesinde kutlama yok (toast kuyruğu yine birikir).
      if (this.offlineSimActive) return
      if (!isPageVisible()) return
      if (completedRow) {
        sounds.playSingularity()
        safeConfetti({
          particleCount: 130,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#a855f7', '#06b6d4', '#ffffff']
        })
      } else if (unlockedAnyReward) {
        sounds.playCombo()
        safeConfetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#a855f7', '#06b6d4']
        })
      } else {
        sounds.playAnomaly()
      }
    },

    markAchievementsSeen(this: StoreApi): void {
      this.achievementsSeenCount = this.achievements.length
    },

    dismissAchievementToast(this: StoreApi, id: string): void {
      const i = this.achievementToastQueue.indexOf(id)
      if (i !== -1) this.achievementToastQueue.splice(i, 1)
    },

    // Aktif oyun sekmesi takibi (App.vue switchTab'den beslenir, kayıt edilmez).
    // Otomatik kutlamalar bu alana bakarak ilgili sekmede değilken sessiz geçer.
    setActiveGameTab(this: StoreApi, tab: string): void {
      this.activeGameTab = tab
    },

    // Özellik Merdiveni: hayat boyu yüksek su seviyelerini yükselt ve
    // sağlanan kilitleri yapışkan (sticky) olarak kaydet.
    //
    // ADR-0035 — bu action TEK YAZIM YOLUDUR. Üç yerden çağrılır:
    //   1) update() döngüsünde UNLOCK_CHECK_INTERVAL seyreltisiyle
    //   2) dimensionShift() / buyGalaxy() — dopamin sıfırlanmadan hemen önce
    //   3) resetRunState() — şafak çöküşü, meydan okuma giriş/çıkış/tamamlama.
    // (2) ve (3) olmazsa Şafak Nöbeti Botu'nun otomatik sıçraması ya da 0.5 sn'lik
    // senkron penceresi, kapı eşiği aşıldığı anda listeyi yazmadan reseti
    // tetikleyebilir ve açılım kaybolurdu.
    syncUnlocks(this: StoreApi): void {
      // Su seviyeleri yükselir (monotonik, asla inmez).
      this.lifetimePeakMatter = raisedLifetimePeak(this.lifetimePeakMatter, this.matter)
      if (this.dimensionShifts > this.lifetimePeakShifts) {
        this.lifetimePeakShifts = this.dimensionShifts
      }
      if (this.unlockedFeatures.length >= FEATURE_UNLOCKS.length) return
      for (const feature of FEATURE_UNLOCKS) {
        if (this.unlockedFeatures.includes(feature.id)) continue
        if (checkUnlock(this.unlockContext, feature)) {
          this.unlockedFeatures.push(feature.id)
        }
      }
    },

    // Çekirdek Simülasyon Döngüsü
    update(this: StoreApi, deltaSeconds: number): void {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return

      // Planck Duvarı Sert Kilit Güvencesi: Break Singularity yoksa kütle D_INFINITY değerini geçemez
      if (!this.hasBreakSingularity && this.matter.gte(D_INFINITY)) {
        this.matter = D_INFINITY
      }

      // 0. Özellik Merdiveni senkronizasyonu (yapışkan kilitlemeler — 0.5 sn seyreltilir).
      // ADR-0035: tepe noktalar merdiven tamamlandıktan sonra da yükselmeye devam eder,
      // bu yüzden "hepsi açıldı" durumunda erken çıkma YOK.
      this.unlockCheckAcc += deltaSeconds
      if (this.unlockCheckAcc >= UNLOCK_CHECK_INTERVAL) {
        this.unlockCheckAcc = 0
        this.syncUnlocks()
      }

      // ADR-0072 §A: kütle kapılarından açılan boyutların kutlaması. syncUnlocks()
      // tepe kütleyi yükselttikten SONRA okunur; aynı tick'te birden çok boyut
      // açılsa bile TEK kutlama (en yüksek tier) yapılır. Çevrimdışı simülasyonda
      // ses/konfeti susar, sayaç sessizce ilerler — ayrıntı action'ın içindedir.
      this.celebrateDimensionUnlocks()

      // G2: Challenge hedefi sağlandığında otomatik tamamla (sessiz — kullanıcı eylemi değil).
      if (this.activeChallenge && this.challengeGoalReached) {
        this.completeChallenge(false)
        return
      }
      // Aktif challenge koşu sayacı (offline süre dahil — sayaç dürüsttür)
      if (this.activeChallenge) {
        this.challengeElapsed += deltaSeconds
      }

      // G3: challenge koşu-içi sayaçlar (C2 durma+rampa, C3 üstel büyüme, C8 bildirim sayacı).
      // C8 offline'da DONAR (uyuyan oyuncu cezalandırılmaz); diğerleri offline simülasyonda
      // gerçek update() üzerinden otomatik işler.
      {
        const mods = this.activeChallengeDef?.modifiers
        if (mods?.productionHaltOnBuySec !== undefined) {
          if (this.challengeHaltUntil > 0) {
            this.challengeHaltUntil = Math.max(0, this.challengeHaltUntil - deltaSeconds)
          }
          this.challengeSinceBuy += deltaSeconds
        }
        if (mods?.dim1ExpoGrowthPerSec !== undefined) {
          this.challengeDim1Growth = this.challengeDim1Growth.times(
            Math.pow(1 + mods.dim1ExpoGrowthPerSec, deltaSeconds)
          )
        }
        if (mods?.notificationDoomRatePerSec !== undefined && !this.offlineSimActive) {
          const rate =
            mods.notificationDoomRatePerSec *
            (1 + CHALLENGE_DOOM_SHIFT_ACCEL * this.dimensionShifts + CHALLENGE_DOOM_GALAXY_ACCEL * this.galaxies)
          this.challengeNotificationDoom += rate * deltaSeconds
        }
      }

      // 0.5 Combo sönümü: 1.5 sn hareketsizlikte tıklama serisi sıfırlanır
      if (this.clickCombo.count > 0 && Date.now() - this.clickCombo.lastClickAt > COMBO_DECAY_MS) {
        this.clickCombo.count = 0
      }

      // 2. Aktif Buff Sürelerini Azalt
      for (let b = this.activeBuffs.length - 1; b >= 0; b--) {
        this.activeBuffs[b].remaining -= deltaSeconds
        if (this.activeBuffs[b].remaining <= 0) {
          this.activeBuffs.splice(b, 1)
        }
      }

      // 2.5 Zaman Yayı (Time Clock): doğuş → geri sarma → salgı.
      // Çevrimdışı simülasyonda saat HİÇ doğmaz ve HİÇ ilerlemez: oyuncu
      // uyurken kaçırdığı bir olayı ne kazanır ne kaybeder (adil davranış).
      if (!this.offlineSimActive && this.isFeatureUnlocked('time_clock')) {
        if (this.timeClock.phase === 'idle') {
          this.clockTimer += deltaSeconds
          if (this.clockTimer >= this.nextClockInterval) this.spawnTimeClock()
        } else if (this.timeClock.phase === 'winding') {
          this.timeClock.remainingTime -= deltaSeconds
          // Sönüm: yay kendiliğinden gevşer → zaman ileri akar → kütle geri gelir.
          // deltaRewound negatiftir, bu yüzden minus() kütleyi GERİ VERİR.
          const prevRewound = this.timeClockRewoundSeconds
          this.timeClock.drag = dragFromTension(applyTensionDecay(this.timeClockTension, deltaSeconds))
          const nextRewound = this.timeClockRewoundSeconds
          const deltaRewound = nextRewound - prevRewound
          if (deltaRewound !== 0) {
            // Taban kuralı: kütle 1'in altına inmez (bkz. §6.3). `Decimal.max`
            // static'i tip yüzeyinde olmadığı için karşılaştırma elle kurulur.
            const remaining = this.matter.minus(this.matterPerSecond.times(deltaRewound))
            this.matter = remaining.lt(1) ? D_1 : remaining
          }
          if (this.timeClock.remainingTime <= 0) this.releaseTimeClock()
        } else if (this.timeClock.phase === 'released') {
          this.timeClock.speedRemaining -= deltaSeconds
          // v2: salgı süresi açıkça taşınır (kusursuz bonusu); alan sıfırsa
          // (eski kayıt / güvenlik) peak hızdan ters çözüm yedeği kullanılır.
          const releaseDurationForState = this.timeClock.speedDuration > 0
            ? this.timeClock.speedDuration
            : durationFromPeakSpeed(this.timeClock.peakSpeed)
          const elapsed = releaseDurationForState - this.timeClock.speedRemaining
          this.timeClock.speed = releaseSpeedAt(this.timeClock.peakSpeed, elapsed, releaseDurationForState)
          if (this.timeClock.speedRemaining <= 0) {
            this.timeClock.phase = 'idle'
            this.timeClock.speed = 1
            this.timeClock.speedRemaining = 0
          }
        }
      } else if (this.timeClock.speed !== 1) {
        // Özellik kilitli / offline simülasyon: hız çarpanı nötr'e çekilir
        // (bayat hızla üretim çarpanı kilitli kalmasın).
        this.timeClock.speed = 1
      }

      // 3. Yüzen Anomali Sürelerini Azalt
      for (let a = this.floatingAnomalies.length - 1; a >= 0; a--) {
        this.floatingAnomalies[a].remainingTime -= deltaSeconds
        if (this.floatingAnomalies[a].remainingTime <= 0) {
          this.floatingAnomalies.splice(a, 1)
        }
      }

      // 4. Anomali Doğurma Sayacı (Gece Krizleri: 100 Dopamin ile açılır, Reaktör hızıyla ölçeklenir)
      if (this.isFeatureUnlocked('crisis_spawn')) {
        this.anomalyTimer += deltaSeconds * this.reactorAnomalyRateMult
        if (this.anomalyTimer >= this.nextAnomalyInterval) {
          this.spawnAnomaly()
        }
      }

      // 5. Vicdan Azabı Doğurma Sayacı (Vicdan Azapları: 1M Dopamin ile açılır)
      if (this.isFeatureUnlocked('guilt_slackers')) {
        this.slackerTimer += deltaSeconds
        if (this.slackerTimer >= 40) {
          this.slackerTimer = 0
          if (Math.random() < 0.6) {
            this.spawnSlacker()
          }
        }
      }

      // 6. Algoritma Stüdyosu: Format Isınması & Rezonans (Çürüme yok!)
      this.labCells.forEach((cell) => {
        if (cell.seedType) {
          cell.age += deltaSeconds
          if (cell.age >= cell.matureAge) {
            cell.isMature = true
          }
        }
      })

      if (this.isFeatureUnlocked('lab')) {
        const matureCount = this.labCells.filter((c) => c.isMature && !!c.seedType).length

        // Plazma Şarjı (Superconductor modu hariç ve canlı akışta değilken)
        if (this.labMode !== 'superconductor' && !this.isViralActive) {
          const modeMult = this.labMode === 'overdrive' ? 1.8 : 1.0
          const rate = (0.35 + matureCount * 0.3) * modeMult
          this.labHype = Math.min(100, this.labHype + deltaSeconds * rate)
        }

        // Canlı Süperkritik Boşalım Dalgası
        if (this.isViralActive) {
          this.viralTimeRemaining -= deltaSeconds
          const viewsPerSec = 45000 + matureCount * 35000 + (this.labMode === 'overdrive' ? 40000 : 0)
          this.viralViews += Math.floor(viewsPerSec * deltaSeconds)

          if (this.viralTimeRemaining <= 0) {
            this.isViralActive = false
            this.viralTimeRemaining = 0
          }
        }

        // Hibrit Formül Sentezleme & Kuantum Dalgalanma Kontrolü
        const synthChance = (this.labMode === 'fluctuation' ? 0.12 : 0.04) * (this.isViralActive ? 3.0 : 1.0) * deltaSeconds

        // A. Boş hücreye yeni format filizlenmesi
        this.labCells.forEach((cell, idx) => {
          if (cell.seedType === null) {
            const row = Math.floor(idx / 3)
            const col = idx % 3
            const neighborTypes: (LabSeedType | null)[] = []
            const checkNeighbor = (c: LabCell) => (c.isMature ? c.seedType : null)
            if (row > 0) neighborTypes.push(checkNeighbor(this.labCells[idx - 3]))
            if (row < 2) neighborTypes.push(checkNeighbor(this.labCells[idx + 3]))
            if (col > 0) neighborTypes.push(checkNeighbor(this.labCells[idx - 1]))
            if (col < 2) neighborTypes.push(checkNeighbor(this.labCells[idx + 1]))

            for (const recipe of LAB_RECIPES) {
              if (neighborTypes.includes(recipe.parent1) && neighborTypes.includes(recipe.parent2)) {
                if (Math.random() < synthChance) {
                  const seedDef = LAB_SEEDS.find((s) => s.type === recipe.result)
                  cell.seedType = recipe.result
                  cell.age = 0
                  cell.matureAge = seedDef?.growthSeconds || 60
                  cell.maxAge = Infinity
                  cell.isMature = false

                  if (!this.discoveredFormulas.includes(recipe.result)) {
                    this.discoveredFormulas.push(recipe.result)
                    // Oto-sentez kutlaması yalnızca Lab sekmesinde + görünür sayfada.
                    // Başka sekmedeyken formül yine keşfedilir, rozet kalır, efekt atlanır.
                    if (!this.offlineSimActive && isPageVisible() && this.activeGameTab === 'lab') {
                      sounds.playCombo()
                      safeConfetti({
                        particleCount: 75,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899']
                      })
                    }
                  }
                  break
                }
              }
            }
          }
        })

        // B. Yan yana olgunlaşmış ebeveynlerin rezonansla doğrudan Kodekse keşif eklemesi
        for (let i = 0; i < 9; i++) {
          const c1 = this.labCells[i]
          if (!c1.seedType || !c1.isMature) continue
          const row = Math.floor(i / 3)
          const col = i % 3
          const neighborIndices: number[] = []
          if (row < 2) neighborIndices.push(i + 3)
          if (col < 2) neighborIndices.push(i + 1)

          for (const nIdx of neighborIndices) {
            const c2 = this.labCells[nIdx]
            if (!c2.seedType || !c2.isMature) continue

            for (const recipe of LAB_RECIPES) {
              if (!this.discoveredFormulas.includes(recipe.result)) {
                const match = (c1.seedType === recipe.parent1 && c2.seedType === recipe.parent2) ||
                              (c1.seedType === recipe.parent2 && c2.seedType === recipe.parent1)
                if (match && Math.random() < synthChance * 0.75) {
                  this.discoveredFormulas.push(recipe.result)
                  if (!this.offlineSimActive && isPageVisible() && this.activeGameTab === 'lab') {
                    sounds.playCombo()
                    safeConfetti({
                      particleCount: 90,
                      spread: 80,
                      origin: { y: 0.55 },
                      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899']
                    })
                  }
                }
              }
            }
          }
        }
      }

      // 7. Crisis 3.0: Olay Ufku Kararsızlık Reaktörü Isı Fiziği, Momentum & Kartuş Döngüsü
      if (this.reactorMeltdownTimer > 0) {
        this.reactorMeltdownTimer -= deltaSeconds
        this.reactorMomentum = 1.0 // Meltdown süresince momentum sıfır
        if (this.reactorMeltdownTimer <= 0) {
          this.reactorMeltdownTimer = 0
          this.reactorHeat = 25 // Meltdown bittiğinde 25'e stabilizasyon
        }
      } else {
        const currentPhase = this.reactorPhase
        // Doğal Soğuma: saniyede -1.2 ısı
        this.reactorHeat = Math.max(0, this.reactorHeat - 1.2 * deltaSeconds)

        // Tatlı Nokta (%61-90) Momentum Dinamiği:
        if (currentPhase === 'sweet_spot') {
          // Tatlı noktada kaldıkça saniyede +%2 momentum birikir (1.0x -> 5.0x)
          this.reactorMomentum = Math.min(5.0, (this.reactorMomentum || 1.0) + 0.02 * deltaSeconds)
        } else if (currentPhase === 'meltdown') {
          this.reactorMomentum = 1.0
        } else {
          // Durgun veya rezonans fazında momentum yavaşça (%5/sn) erir
          if ((this.reactorMomentum || 1.0) > 1.0) {
            this.reactorMomentum = Math.max(1.0, (this.reactorMomentum || 1.0) - 0.05 * deltaSeconds)
          }
        }
      }
      this.caffeineEnergy = this.reactorHeat

      // Kriyojenik Soğutucu Kartuş Dolumu (35 sn per kartuş, max 3)
      if (typeof this.reactorCoolantCharges !== 'number') {
        this.reactorCoolantCharges = 3
      }
      if (this.reactorCoolantCharges < 3) {
        this.reactorCoolantTimer = (this.reactorCoolantTimer || 35) - deltaSeconds
        if (this.reactorCoolantTimer <= 0) {
          this.reactorCoolantCharges = Math.min(3, this.reactorCoolantCharges + 1)
          this.reactorCoolantTimer = this.reactorCoolantCharges < 3 ? 35 : 0
        }
      } else {
        this.reactorCoolantTimer = 0
      }

      // Müdahale Cooldown sayaçlarının düşürülmesi
      if (this.reactorCooldowns) {
        for (const spellKey of Object.keys(this.reactorCooldowns)) {
          if (this.reactorCooldowns[spellKey] > 0) {
            this.reactorCooldowns[spellKey] = Math.max(0, this.reactorCooldowns[spellKey] - deltaSeconds)
          }
        }
      }

      if (this.crisisBackfireDebuff > 0) {
        this.crisisBackfireDebuff = Math.max(0, this.crisisBackfireDebuff - deltaSeconds)
      }

      // Canlı İkilem (Dilemma) sayacı ve tetiklemesi
      if (this.activeCrisisDilemma) {
        this.activeCrisisDilemma.timeLeft -= deltaSeconds
        if (this.activeCrisisDilemma.timeLeft <= 0) {
          this.activeCrisisDilemma = null
          this.dilemmaCooldown = 45 // Zaman aşımında 45 sn cooldown
        }
      } else {
        if (this.dilemmaCooldown > 0) {
          this.dilemmaCooldown = Math.max(0, this.dilemmaCooldown - deltaSeconds)
        } else if (this.reactorPhase === 'sweet_spot' && !this.offlineSimActive) {
          // Tatlı Noktadayken ara sıra (%2.5/sn şansla) tetiklenir
          if (Math.random() < 0.025 * deltaSeconds) {
            this.triggerCrisisDilemma()
          }
        }
      }

      // 8. Otomatik Kaydırma Botları (Autobuyer - tekli/toplu/max)
      // Nöral Ağaç: Otonom Kaydırma Çipi (eski bağlantı) + Bot Aşırı Yüklemesi çarpanı
      const botSpeedMult = Math.pow(1.5, this.singularityUpgrades?.neural_chip || 0) * this.neuralEffects.botFrequencyMult
      const challengeBotsDisabled = this.activeChallengeDef?.modifiers.autobuyersDisabled === true
      Object.keys(this.autobuyers).forEach((key) => {
        const bot = this.autobuyers[key]
        if (bot && bot.unlocked && bot.enabled) {
          // C1 (Uçak Modu): Şafak botu hariç tüm botlar atlanır
          if (challengeBotsDisabled && key !== 'singularity') return
          // C2 (Şarj Aleti Temassızlığı): Üretim durma süresi aktifken botlar bekler; kalıcı sıfır üretim kilidini (softlock) önler
          if (this.challengeHaltUntil > 0 && key !== 'singularity') return
          bot.timer += deltaSeconds * botSpeedMult
          if (bot.timer >= bot.interval) {
            const triggers = bot.interval > 0 ? Math.floor(bot.timer / bot.interval) : 1
            bot.timer = bot.interval > 0 ? bot.timer % bot.interval : 0
            const effectiveMode: AutobuyerMode = bot.mode || 'single'
            // Çevrimdışı veya büyük adımlarda (deltaSeconds > bot.interval) botları birikim kadar çalıştır
            const runCount = effectiveMode === 'max' ? Math.min(triggers, 3) : Math.min(triggers, 30)

            for (let r = 0; r < runCount; r++) {
              if (key.startsWith('dim')) {
                const tier = parseInt(key.replace('dim', ''), 10)
                // Bot modları ×1 / ×10 / Maks: tek basışta 1 adet, 1 paket (10 adet), ya da alabildiği kadar
                if (effectiveMode === 'max' && this.autobuyerMaxUnlocked) {
                  if (!this.buyMaxDimension(tier, false, false)) break
                } else if (effectiveMode === 'bulk' && this.autobuyerBulkUnlocked) {
                  if (!this.buyDimension(tier, false)) break
                } else {
                  if (!this.buyOneUnit(tier, false)) break
                }
              } else if (key === 'tickspeed') {
                if (effectiveMode === 'max' && this.autobuyerMaxUnlocked) {
                  if (!this.buyMaxTickspeed(false, false)) break
                } else if (effectiveMode === 'bulk' && this.autobuyerBulkUnlocked) {
                  // ×10 tutarlılığı: Hz botu da her basışta 10 adet alır
                  let boughtAny = false
                  for (let i = 0; i < 10; i++) {
                    if (this.buyTickspeed(false)) boughtAny = true
                    else break
                  }
                  if (!boughtAny) break
                } else {
                  if (!this.buyTickspeed(false)) break
                }
              } else if (key === 'shift') {
                if (this.canShift) this.dimensionShift(false)
                else break
              } else if (key === 'galaxy') {
                if (this.canBuyGalaxy) this.buyGalaxy(false)
                else break
              }
            }

            if (key === 'singularity') {
              // G1 (kritik): challenge içinde bot SP basıp koşuyu baypas edemez —
              // eşik aşılınca challenge tamamlanır.
              if (this.shouldAutoSingularity()) {
                if (this.activeChallenge) this.completeChallenge(false)
                else this.singularityReset(false)
              }
            }
          }
        }
      })

      // 8.2 Şafak Nöbeti örnekleyici: saniyede bir log10(matter) örneği alır.
      // Marjinal kazanç optimizatörü (ExponentialIdle modeli) — runtime-only state.
      this.singularityRunSeconds += deltaSeconds
      this.singularitySampleAcc += deltaSeconds
      if (this.singularitySampleAcc >= 1) {
        this.singularitySampleAcc = 0
        const logMatter = this.matter.lt(1) ? 0 : this.matter.log10().toNumber()
        const samples = this.singularityBotSamples
        samples.push(logMatter)
        if (samples.length > 60) samples.shift()
        // Marjinal büyüme (son 3 sn eğimi) koşu ortalamasına yakınsa/düşerse streak birikir:
        // üretim ivmelenirken eğim > ortalama → streak sıfırlanır (beklemek hâlâ optimal);
        // rampa bittiğinde eğim ortalamaya oturur → 3 sn içinde çök. Sabit eğimde
        // (autobuyer'larla lineer üretim) beklemenin getirisi sıfırdır → çökmek doğrudur.
        if (samples.length >= 7) {
          const rate = (samples[samples.length - 1] - samples[samples.length - 4]) / 3
          const avgRate = (samples[samples.length - 1] - samples[0]) / (samples.length - 1)
          if (rate <= avgRate * 1.02 + 0.02) this.singularityDecelStreak++
          else this.singularityDecelStreak = 0
        }
      }

      // 8.5 Nöral İzleme Kolonisi Üremesi (kendi kendini üreyen alt-botlar, 1e308 yaklaşımında lojistik fren)
      if (this.neuralBots.gt(0)) {
        const breedRate = this.botBreedRate
        const logBots = log10Safe(this.neuralBots)
        const capacityFactor = Math.max(0.01, 1 - logBots / 308)
        this.neuralBots = this.neuralBots.plus(this.neuralBots.times(breedRate * capacityFactor * deltaSeconds))
      }

      // 9. Boyut Zinciri Simülasyonu (tick başına çarpanlar bir kez hesaplanır)
      const unlocked = this.unlockedDimensionsCount
      const speed = this.tickspeedMultiplier
      const achMultForChain = this.achievementMultiplier
      const dimMults: Decimal[] = []
      for (let t = 1; t <= unlocked; t++) {
        dimMults[t] = this.getDimensionMultiplier(t)
      }
      const activeChallengeMods = this.activeChallenge
        ? getChallengeById(this.activeChallenge)?.modifiers
        : undefined

      if (activeChallengeMods?.oddTiersOnly) {
        // C4 (Sansür Matrisi): çift boyutlar susar; tek boyutlar iki basamak alttaki tek boyutu besler (D7->D5->D3->D1)
        for (let i = unlocked - 1; i >= 2; i--) {
          if ((i + 1) % 2 === 1) {
            const higherDim = this.dimensions[i]
            const lowerDim = this.dimensions[i - 2]
            if (higherDim && lowerDim && higherDim.amount.gt(0)) {
              const mult = dimMults[i + 1]
              const produced = higherDim.amount
                .times(mult)
                .times(speed)
                .times(achMultForChain)
                .times(DIMENSION_CHAIN_RATE)
                .times(deltaSeconds)
              lowerDim.amount = lowerDim.amount.plus(produced)
            }
          }
        }
      } else {
        for (let i = unlocked - 1; i >= 1; i--) {
          const higherDim = this.dimensions[i]
          const lowerDim = this.dimensions[i - 1]
          if (higherDim && lowerDim && higherDim.amount.gt(0)) {
            const mult = dimMults[i + 1]
            const produced = higherDim.amount
              .times(mult)
              .times(speed)
              .times(achMultForChain)
              .times(DIMENSION_CHAIN_RATE)
              .times(deltaSeconds)
            lowerDim.amount = lowerDim.amount.plus(produced)
          }
        }
      }

      // 1. İstasyon -> Dopamin üretir
      const dim1 = this.dimensions[0]
      if (dim1 && dim1.amount.gt(0) && !this.challengeHalted) {
        let rawProduced = dim1.amount
          .times(dimMults[1])
          .times(speed)
          .times(this.stanceMultipliers.production)
          .times(this.productionBuffMultiplier)
          // Zaman Yayı salgısı YALNIZCA D1→Dopamin hattına uygulanır (D2→D1
          // zincir beslemelerine kasten dokunulmaz — katlanarak patlardı).
          .times(this.timeClockProductionMult)
          .times(this.labPassiveMultiplier)
          .times(achMultForChain)
          .times(this.achievementProductionMult)
          .times(this.colonyMultiplier)
          .times(this.napMultiplier)
          .times(this.reactorMassMult)
          .times(this.reactorRelicBonuses.universalMassMult)
          .times(this.offlineSimBoost > 1 ? this.offlineSimBoost : 1)
          .times(this.crisisBackfireDebuff > 0 ? 0.5 : 1.0)
          .times(this.challengeProdMult)
          .times(deltaSeconds)

        const totalLeechRatio = this.slackerLeechPercent
        const leechedAmount = rawProduced.times(totalLeechRatio)
        const netProduced = rawProduced.minus(leechedAmount)

        if (this.slackers.length > 0 && leechedAmount.gt(0)) {
          const perSlacker = leechedAmount.div(this.slackers.length)
          this.slackers.forEach((s) => {
            s.leechedDopamine = s.leechedDopamine.plus(perSlacker)
          })
        }

        if (!this.hasBreakSingularity && this.matter.gte(D_INFINITY)) {
          this.matter = D_INFINITY
        } else {
          this.matter = this.matter.plus(netProduced)
          this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(netProduced)
          if (!this.hasBreakSingularity && this.matter.gte(D_INFINITY)) {
            this.matter = D_INFINITY
          }
        }

        if (this.matter.gt(this.stats.highestMatter)) {
          this.stats.highestMatter = this.matter
        }
      }

      this.stats.totalPlaytime += deltaSeconds

      // 10. Faz 2 kilometre taşı: Kolektif Gece Nöbeti eşiği (kalıcı, tek seferlik)
      if (!this.nightWatchUnlocked && this.matter.gte(NIGHT_WATCH_THRESHOLD)) {
        this.nightWatchUnlocked = true
        if (!this.offlineSimActive) {
          safeConfetti({
            particleCount: 220,
            spread: 140,
            origin: { y: 0.4 },
            colors: ['#a855f7', '#06b6d4', '#f59e0b', '#ffffff']
          })
        }
      }

      // QoL: saniyelik üretim örneklemesi (Rapor sparkline; offline simülasyonda örneklenmez)
      if (!this.offlineSimActive) {
        this.dpsSampleAcc += deltaSeconds
        if (this.dpsSampleAcc >= 1) {
          this.dpsSampleAcc %= 1
          const curDps = this.matterPerSecond
          // Rekor üretim hızı buradan güncellenir (ADR-0029): getter her tick çağrılırsa
          // zincir boyunca ~40 Decimal tahsisi yapılıp sonuç atılıyordu. Zirve
          // değişkeni 1 Hz çözünürlükte ve salt görüntüleme amaçlı olduğu için
          // bu, yalnızca anlık tepe noktalarını kaçırır; ekonomiye dokunmaz.
          if (curDps.gt(this.stats.highestDps)) {
            this.stats.highestDps = curDps
          }
          const numDps = curDps.lt(0) ? 0 : (curDps.gte(Number.MAX_VALUE) ? Number.MAX_VALUE : curDps.toNumber())
          this.dpsHistory.push(numDps)
          if (this.dpsHistory.length > 600) this.dpsHistory.shift()
        }
      }

      // Başarım kontrolü: canlı oyunda 0.5 sn seyreltilir; offline simülasyonda 120 adımda bir
      if (this.offlineSimActive) {
        this.offlineAchTick++
        if (this.offlineAchTick >= 120) {
          this.offlineAchTick = 0
          this.checkAchievements()
        }
      } else {
        this.achCheckAcc += deltaSeconds
        if (this.achCheckAcc >= ACH_CHECK_INTERVAL) {
          this.achCheckAcc = 0
          this.checkAchievements()
        }
      }
      this.lastUpdate = Date.now()
    },

    toggleMusic(this: StoreApi): void {
      this.settings.musicEnabled = !this.settings.musicEnabled
      musicEngine.setEnabled(this.settings.musicEnabled)
    },

    setMusicVolume(this: StoreApi, vol: number): void {
      this.settings.musicVolume = vol
      musicEngine.setVolume(vol)
    },

    setMusicTrack(this: StoreApi, track: MusicTrackId): void {
      this.settings.musicTrack = track
      musicEngine.setTrack(track)
    },

    toggleVinylCrackle(this: StoreApi): void {
      this.settings.vinylCrackle = !this.settings.vinylCrackle
      musicEngine.setVinylCrackle(this.settings.vinylCrackle)
    },

    toggleRain(this: StoreApi): void {
      this.settings.rainEnabled = !this.settings.rainEnabled
      musicEngine.setRainEnabled(this.settings.rainEnabled)
    },

    setRainLevel(this: StoreApi, val: number): void {
      this.settings.rainLevel = Math.max(0, Math.min(1, val))
      musicEngine.setRainLevel(this.settings.rainLevel)
    },

    setMusicIntensity(this: StoreApi, val: number): void {
      this.settings.musicIntensity = Math.max(0, Math.min(1, val))
      musicEngine.setIntensity(this.settings.musicIntensity)
    },

    setSleepTimer(this: StoreApi, minutes: number): void {
      this.settings.sleepTimerMinutes = minutes
      musicEngine.setSleepTimer(minutes)
    },

    nextMusicTrack(this: StoreApi): void {
      const next = musicEngine.nextTrack()
      this.settings.musicTrack = next.id
    },

    setCustomAudioUrl(this: StoreApi, url: string): void {
      const safe = sanitizeCustomAudioUrl(url)
      this.settings.customAudioUrl = safe
      musicEngine.customUrl = safe
      if (this.settings.musicTrack === 'custom') {
        musicEngine.setTrack('custom')
      }
    },
}
