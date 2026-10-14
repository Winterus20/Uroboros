// Boyut/tickspeed/shift/galaxy/uretim getter parcalari. `this`, StoreApi ile tiplenmistir.
import { D_0, D_1, D_INFINITY, Decimal } from '../../core/math'
import { hasAchievementReward } from '../../game/achievements'
import { BASE_UNLOCKED_DIMENSIONS, BUCKET_CAP_GAIN, BUCKET_CAP_THRESHOLD, CHALLENGE_C7_GALAXY_COST_MULT, CHALLENGE_C7_TIER_COST_STEP, DIMENSION_CHAIN_RATE, DIM_PER_TEN_MULT, MIRROR_PAIRS, RESOLUTION_MILESTONES, SHIFT_CAP_GAIN, SHIFT_CAP_THRESHOLD, TICKSPEED_CAP_GAIN, TICKSPEED_CAP_THRESHOLD, challengeCostInflationMult, challengeDimensionCap, dimensionCostForBucket, diminishingPurchaseCount, resolvedUnlockedDimensionCount } from '../../game/balance'
import { ALL_CHALLENGES_COMPLETE_MULT, challengeTimeTierMult, getChallengeById, isAllChallengesComplete } from '../../game/challenges'
import { FORMAT_UNLOCK_BUFF_MULT, FORMAT_UNLOCK_BUFF_SECONDS, formatUnlockBuffMult, getTierIdentity, tierProductionMult, tierShiftReqMult } from '../../game/dimension_identity'
import { dimMultCacheKey, memoChallengeEffects, memoNeuralEffects, _dimCostCache, _dimMultCache } from './cache'
import type { ResolutionMilestone } from '../../models/types'
import type { GameState } from './state'
import type { StoreApi } from './store-api'

export const dimensionGetters = {
    // Dopamin Alias'ı
    dopamine(this: StoreApi, state: GameState): Decimal {
      return state.matter
    },

    // Kaç adet istasyonun açık olduğu (ADR-0025: başta 2, her sıçrama +1, legacy floor korunur)
    // C7 (Hesap Kısıtlaması): registry'deki maxDimensions üst sınırı uygulanır.
    unlockedDimensionsCount(this: StoreApi, state: GameState): number {
      return resolvedUnlockedDimensionCount(state)
    },

    formatUnlockBuffActive(this: StoreApi, state: GameState): boolean {
      return state.formatUnlockBuffUntil > Date.now() && state.formatUnlockBuffTier > 0
    },

    formatUnlockBuffSecondsRemaining(this: StoreApi, state: GameState): number {
      if (state.formatUnlockBuffUntil <= Date.now() || state.formatUnlockBuffTier <= 0) return 0
      return Math.max(0, Math.ceil((state.formatUnlockBuffUntil - Date.now()) / 1000))
    },

    /** En yüksek açık tier'dan gelen D→D-1 besleme hızı (UI ipucu). */

    primaryFeedTier(this: StoreApi, state: GameState): number {
      const unlocked = resolvedUnlockedDimensionCount(state)
      const speed = this.tickspeedMultiplier
      const achMult = this.achievementMultiplier
      let bestTier = 0
      let bestFeed = 0
      for (let t = 2; t <= unlocked; t++) {
        const dim = state.dimensions[t - 1]
        if (!dim || dim.amount.lte(0)) continue
        const feed = dim.amount
          .times(this.getDimensionMultiplier(t))
          .times(speed)
          .times(achMult)
          .times(DIMENSION_CHAIN_RATE)
          .toNumber()
        if (feed > bestFeed) {
          bestFeed = feed
          bestTier = t
        }
      }
      return bestTier
    },

    // Algoritma Frekansı (Tickspeed) indirim oranı (Hızlı Şarj Adaptörü ile güçlenir)
    // C6 (Göz Kuruluğu): taban %40, alım ölçeği yarıya iner (registry üzerinden).
    // C2 ödülü (Şarj Aleti Temassızlığı): frekans etkisi +%15 (kalıcı).
    tickspeedMultiplier(this: StoreApi, state: GameState): Decimal {
      const chargerBonus = (state.singularityUpgrades?.fast_charger || 0) * 0.02
      const relicBase = this.reactorRelicBonuses.tickspeedBase
      const baseReduction = Math.max(0.7, 0.89 - chargerBonus - relicBase)
      const galaxyBonus = Math.max(0.35, baseReduction - state.galaxies * 0.008)
      const activeMods = state.activeChallenge ? getChallengeById(state.activeChallenge)?.modifiers : undefined
      const buyScale = activeMods?.tickspeedBuyMultScale ?? 1
      const baseMult = activeMods?.tickspeedBaseMult ?? 1
      // ADR-0054: eşik altı ham sayı, üstü logaritmik azalan getiri (döngü kazancı < 1)
      let mult = Decimal.pow(
        1 / galaxyBonus,
        diminishingPurchaseCount(state.tickspeedBought * buyScale, TICKSPEED_CAP_THRESHOLD, TICKSPEED_CAP_GAIN)
      ).times(baseMult)
      const espresso = state.activeBuffs.find((b) => b.type === 'espresso')
      if (espresso) {
        mult = mult.times(espresso.multiplier)
      }
      if (this.reactorTickRateMult !== 1) {
        mult = mult.times(this.reactorTickRateMult)
      }
      const planckSurge = state.activeBuffs.find((b) => b.type === 'planck_surge')
      if (planckSurge) {
        mult = mult.times(planckSurge.multiplier)
      }
      const challengeEff = memoChallengeEffects(state.completedChallenges)
      if (challengeEff.tickspeedEffectMult !== 1) {
        mult = mult.times(challengeEff.tickspeedEffectMult)
      }
      return mult
    },

    // Algoritma Frekansı Satın Alma Maliyeti (Düşük Parlaklık modunda %15 indirimli)
    // C5 koşu-içi şişmesi buraya da işler; C5 (-%10) ve C6 (-%15) ödülleri kalıcı indirimdir.
    tickspeedCost(this: StoreApi, state: GameState): Decimal {
      let cost = new Decimal(1000).times(Decimal.pow(16, state.tickspeedBought))
      cost = cost.times(challengeCostInflationMult(state))
      if (state.currentStance === 'private_mode') {
        cost = cost.times(0.85).floor()
      }
      if (hasAchievementReward(state.achievements, 'tickspeed_discount')) {
        cost = cost.times(0.95).floor()
      }
      const challengeEff = memoChallengeEffects(state.completedChallenges)
      if (challengeEff.tickspeedCostMult !== 1) {
        cost = cost.times(challengeEff.tickspeedCostMult).floor()
      }
      return cost
    },

    // Algoritmik Ayna Sinerjisi (D1 <-> D8, D2 <-> D7, D3 <-> D6, D4 <-> D5)
    getDimensionSynergyMultiplier: (state: GameState) => (tier: number): Decimal => {
      const partnerTier = 9 - tier
      const partnerDim = state.dimensions[partnerTier - 1]
      if (!partnerDim || partnerDim.bought <= 0) return D_1
      const mult = 1 + Math.sqrt(partnerDim.bought) * 0.15
      return new Decimal(mult)
    },

    // Formatın partner bilgisi ve sağladığı yakıt çarpanı
    getPartnerInfo: (state: GameState) => (tier: number): { partnerTier: number; label: string; partnerBought: number; mult: number } => {
      const partnerTier = 9 - tier
      const partnerDim = state.dimensions[partnerTier - 1]
      const bought = partnerDim ? partnerDim.bought : 0
      const mult = 1 + Math.sqrt(bought) * 0.15
      return {
        partnerTier,
        label: MIRROR_PAIRS[tier]?.label || `D${partnerTier}`,
        partnerBought: bought,
        mult
      }
    },

    // Boyutun ulaştığı en yüksek çözünürlük seviyesi ve sonraki hedef
    getDimensionMilestone: (state: GameState) => (tier: number): {
      current: ResolutionMilestone | null
      next: ResolutionMilestone | null
      progress: number
    } => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return { current: null, next: RESOLUTION_MILESTONES[0], progress: 0 }

      let current: ResolutionMilestone | null = null
      let next: ResolutionMilestone | null = null

      for (let i = 0; i < RESOLUTION_MILESTONES.length; i++) {
        const m = RESOLUTION_MILESTONES[i]
        if (dim.bought >= m.count) {
          current = m
        } else {
          next = m
          break
        }
      }

      let progress = 100
      if (next) {
        const prevCount = current ? current.count : 0
        const needed = next.count - prevCount
        const currentCount = dim.bought - prevCount
        progress = Math.min(100, Math.max(0, (currentCount / needed) * 100))
      }

      return { current, next, progress }
    },

    // Boyutun ulaştığı en yüksek çözünürlük milestone çarpanı.
    getDimensionMilestoneMultiplier: (state: GameState) => (tier: number): Decimal => {
      const dim = state.dimensions[tier - 1]
      if (!dim || dim.bought < 25) return D_1

      let mult = D_1
      for (const m of RESOLUTION_MILESTONES) {
        if (dim.bought >= m.count) {
          mult = new Decimal(m.mult)
        } else {
          break
        }
      }
      return mult
    },

    // Önbellek temizleme açık mı ve değer kazancı yeterli mi? (ADR-0035: açılış
    // kalıcı; koşu içi `dimensionShifts` yerine `lifetimePeakShifts`)
    canSacrifice(this: StoreApi, state: GameState): boolean {
      if (!this.sacrificeUnlocked) return false
      const dim1 = state.dimensions[0]
      if (!dim1 || dim1.amount.lt(10)) return false
      return this.currentSacrificeReward.gt(state.sacrificeMultiplier.times(1.15))
    },

    // Temizleme yapılırsa kazanılacak yeni D8 çarpanı: (1 + log10(D1)/4)^2.5
    currentSacrificeReward(this: StoreApi, state: GameState): Decimal {
      const dim1 = state.dimensions[0]
      if (!dim1 || dim1.amount.lt(10)) return D_1
      const logD1 = dim1.amount.log10().toNumber()
      if (logD1 <= 0) return D_1
      const base = 1 + logD1 / 4
      return Decimal.pow(base, 2.5)
    },

    // Akış Sıçraması (Shift / Boost) Gücü ve Çarpanı (C7 ve 'shift_power_boost' başarımı güçlendirir)
    singleShiftPower(this: StoreApi, state: GameState): number {
      const eff = memoChallengeEffects(state.completedChallenges)
      const achBase = hasAchievementReward(state.achievements, 'shift_power_boost') ? 1.9 : 1.66
      return Math.max(eff.shiftPower, achBase)
    },

    shiftPowerMultiplier(this: StoreApi, state: GameState): Decimal {
      // ADR-0054: sıçrama gücü üssü de yumuşak tavanlı (parite: getDimensionMultiplier)
      return Decimal.pow(
        this.singleShiftPower,
        diminishingPurchaseCount(state.dimensionShifts, SHIFT_CAP_THRESHOLD, SHIFT_CAP_GAIN)
      )
    },

    // C7 (Hesap Kısıtlaması): kilitli tier yerine D6 istenir; ADR-0025 erken tier hedefi
    shiftRequirement(this: StoreApi, state: GameState): { tier: number; amount: Decimal } {
      const cap = challengeDimensionCap(state)
      const unlocked = resolvedUnlockedDimensionCount(state)
      const shiftMult = tierShiftReqMult(state.dimensions, unlocked)
      if (state.dimensionShifts < 6) {
        let tier = Math.min(8, BASE_UNLOCKED_DIMENSIONS + state.dimensionShifts)
        if (state.dimensionCapFloor > tier) {
          tier = Math.min(unlocked, state.dimensionCapFloor)
        }
        tier = Math.min(tier, unlocked)
        // Erken sıçramalarda yeni açılan boyuttan tek paket (10 adet) yeterlidir; akışı pürüzsüzleştirir
        const baseReq = state.dimensionShifts <= 1 ? 10 : (state.dimensionShifts <= 2 ? 15 : 25)
        let amount = new Decimal(baseReq).times(shiftMult).floor()
        if (amount.lt(1)) amount = D_1
        if (cap === undefined || tier <= cap) {
          return { tier, amount }
        }
        let capAmount = new Decimal(25 + CHALLENGE_C7_TIER_COST_STEP * (tier - cap)).times(shiftMult).floor()
        if (capAmount.lt(1)) capAmount = D_1
        return {
          tier: cap,
          amount: capAmount
        }
      }
      if (cap === undefined || 8 <= cap) {
        let amount = new Decimal(26 + 16 * (state.dimensionShifts - 6)).times(shiftMult).floor()
        if (amount.lt(1)) amount = D_1
        return {
          tier: 8,
          amount
        }
      }
      let capAmount = new Decimal(30 + 15 * (state.dimensionShifts - 3)).times(shiftMult).floor()
      if (capAmount.lt(1)) capAmount = D_1
      return {
        tier: cap,
        amount: capAmount
      }
    },

    canShift(this: StoreApi): boolean {
      const req = this.shiftRequirement
      const dim = this.dimensions[req.tier - 1]
      return dim ? dim.amount.gte(req.amount) : false
    },

    // Sonsuz Akış Kümesi Gereksinimi (8. İstasyon miktarı, C7'de D6)
    // 60 galaksiden sonra Distant Galaxies kuadratik freni devreye girer.
    galaxyRequirement(this: StoreApi, state: GameState): number {
      let base = 40 + state.galaxies * 20
      if (state.galaxies > 60) {
        const over = state.galaxies - 60
        base += Math.floor(over * over * 2.5)
      }
      return challengeDimensionCap(state) === undefined ? base : Math.floor(base * CHALLENGE_C7_GALAXY_COST_MULT)
    },

    galaxyRequirementTier(this: StoreApi, state: GameState): number {
      const cap = challengeDimensionCap(state)
      return cap !== undefined ? Math.min(8, cap) : 8
    },

    canBuyGalaxy(this: StoreApi, state: GameState): boolean {
      const tier = this.galaxyRequirementTier
      const dim = state.dimensions[tier - 1]
      return dim ? dim.amount.gte(this.galaxyRequirement) : false
    },

    // Sabah 06:00 Çöküşü Hazır mı? (1.79e308 Dopamin)
    canSingularity(this: StoreApi, state: GameState): boolean {
      return state.matter.gte(D_INFINITY)
    },

    // QoL: üretimi oluşturan global çarpan kaynakları (Rapor sekmesi kırılım paneli)
    multiplierBreakdown(this: StoreApi, state: GameState): Array<{ name: string; value: number; desc: string }> {
      const rows: Array<{ name: string; value: number; desc: string }> = []
      const push = (name: string, value: Decimal | number, desc: string) => {
        const v = typeof value === 'number' ? value : value.toNumber()
        if (Math.abs(v - 1) > 0.0001) rows.push({ name, value: v, desc })
      }

      push('Başarımlar', this.achievementMultiplier, 'Plaket ödülü global kalıcı çarpan')
      push('Nöral Koloni', this.colonyMultiplier, 'Nöral bot sayısından gelen logaritmik çarpan')
      push('Toplu Uyku', state.napMultiplier, 'Power Nap fedakarlıklarının kalıcı kök çarpanı')
      push('Gece Duruşu', this.stanceMultipliers.production, 'Aktif duruşun pasif üretim etkisi')
      push('Aktif Buff', this.productionBuffMultiplier, 'Gece Krizi / Espresso / Viral Zirve çarpanı')
      push('Lab Rezonansı', this.labPassiveMultiplier, 'Algoritma Stüdyosu olgun hücre pasif bonusu')
      const unlocked = resolvedUnlockedDimensionCount(state)
      if (state.formatUnlockBuffUntil > Date.now() && state.formatUnlockBuffTier > 0) {
        push(
          `Format Keşfi (D${state.formatUnlockBuffTier})`,
          FORMAT_UNLOCK_BUFF_MULT,
          `${FORMAT_UNLOCK_BUFF_SECONDS}s ×1.25 yalnız o tier üretimi`
        )
      }
      const tierProd = tierProductionMult(2, state.dimensions[1]?.bought ?? 0, unlocked >= 2)
      if (Math.abs(tierProd - 1) > 0.0001) {
        push('Format D2 Pasifi', tierProd, getTierIdentity(2)?.passive.desc ?? '')
      }
      push('Önbellek Silme (D8)', state.sacrificeMultiplier.gt(1) ? state.sacrificeMultiplier : 1, 'Sacrifice çarpanı yalnızca D8 üretimine uygulanır')
      return rows
    },

    // Telemetri: Algoritma Frekansı (Hz & Tickspeed) Kırılımı
    tickspeedBreakdown(this: StoreApi, state: GameState): Array<{ name: string; value: string; desc: string }> {
      const rows: Array<{ name: string; value: string; desc: string }> = []
      rows.push({
        name: 'Satın Alınan Frekans Kademeleri',
        value: `${state.tickspeedBought} Adet`,
        desc: 'Satın alınan her kademe algoritma frekansını hızlandırır'
      })
      if (state.galaxies > 0) {
        rows.push({
          name: 'Sonsuz Akış Kümeleri',
          value: `${state.galaxies} Küme (-%${state.galaxies * 2} İndirim)`,
          desc: 'Kümeler frekans başına taban aralık maliyetini kalıcı olarak düşürür'
        })
      }
      const chargerLvl = state.singularityUpgrades?.fast_charger || 0
      if (chargerLvl > 0) {
        rows.push({
          name: 'GaN Şarj Adaptörü',
          value: `-%${chargerLvl * 2}`,
          desc: 'Uykusuzluk dükkanından gelen kademe başına frekans hızlandırması'
        })
      }
      const espresso = state.activeBuffs.find((b) => b.type === 'espresso')
      if (espresso) {
        rows.push({
          name: 'Espresso Shot',
          value: `×${espresso.multiplier.toFixed(1)}`,
          desc: 'Gece kriz kararı anlık frekans patlaması'
        })
      }
      return rows
    },

    // İstasyon Çarpanı Hesabı (Göz Damlası, Milestone, Sacrifice ve Bass Boost ile güçlenir)
    getDimensionMultiplier: (state: GameState) => (tier: number): Decimal => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return D_1

      const eyeDropsLvl = state.singularityUpgrades?.eye_drops || 0
      const partnerDim = state.dimensions[9 - tier - 1]
      const partnerBought = partnerDim ? partnerDim.bought : 0
      const neuralProd = memoNeuralEffects(state.neuralNodesBought || {}).productionMult
      const completedJoin = state.completedChallenges.join(',')
      const sacStr = tier === 8 ? state.sacrificeMultiplier.toString() : '1'
      const dim1GrowthStr = tier === 1 ? state.challengeDim1Growth.toString() : '1'
      const unlocked = resolvedUnlockedDimensionCount(state)
      // Türev bağımlılıklar: ikisi de aşağıda çarpana olarak giriyor, dolayısıyla
      // cache anahtarına da girmeli (yoksa süresi dolan bonus bayat kalır).
      const formatBuffActive = state.formatUnlockBuffUntil > Date.now() && state.formatUnlockBuffTier > 0
      const challengeTimeMult = state.activeChallenge ? challengeTimeTierMult(state.challengeBestTimes) : 1
      const relicCount = state.reactorCollapseCount || 0
      const matureCellsCount = relicCount >= 4 ? state.labCells.filter((c) => c.isMature && c.seedType !== null).length : 0
      const cacheKey = dimMultCacheKey(
        tier, dim.bought, state.dimensionShifts, eyeDropsLvl, sacStr,
        partnerBought, neuralProd, 1,
        state.activeChallenge, dim1GrowthStr, completedJoin,
        state.dimensionCapFloor, state.lifetimePeakShifts, state.formatUnlockBuffTier,
        state.formatUnlockBuffUntil, challengeTimeMult, formatBuffActive,
        relicCount, matureCellsCount
      )
      const cached = _dimMultCache.get(tier)
      if (cached && cached.key === cacheKey) return cached.val

      // Satın alınan her 10 adet için DIM_PER_TEN_MULT katı (ADR-0054: üstünde yumuşak tavan)
      let mult = Decimal.pow(
        DIM_PER_TEN_MULT,
        diminishingPurchaseCount(Math.floor(dim.bought / 10), BUCKET_CAP_THRESHOLD, BUCKET_CAP_GAIN)
      )

      // Video Çözünürlük Kademesi (Resolution Milestones: 360p, 720p, 1080p, 4K...)
      let resolutionMult = D_1
      for (const m of RESOLUTION_MILESTONES) {
        if (dim.bought >= m.count) {
          resolutionMult = new Decimal(m.mult)
        } else {
          break
        }
      }
      mult = mult.times(resolutionMult)

      // Akış Sıçraması (Shift/Boost) bonusu (C7 ve başarım güçlendirir; ADR-0054: üs yumuşak tavanlı)
      if (state.dimensionShifts > 0) {
        const eff = memoChallengeEffects(state.completedChallenges)
        const achBase = hasAchievementReward(state.achievements, 'shift_power_boost') ? 1.9 : 1.66
        const shiftBase = Math.max(eff.shiftPower, achBase)
        mult = mult.times(
          Decimal.pow(
            shiftBase,
            diminishingPurchaseCount(state.dimensionShifts, SHIFT_CAP_THRESHOLD, SHIFT_CAP_GAIN)
          )
        )
      }

      // Göz Damlası Yükseltmesi (soft cap)
      if (eyeDropsLvl > 0) {
        const effEyeDropsLvl = eyeDropsLvl <= 3
          ? eyeDropsLvl
          : 3 + Math.log2(Math.max(1, eyeDropsLvl - 2))
        mult = mult.times(Decimal.pow(2, effEyeDropsLvl))
      }

      // Önbellek Temizleme (Sacrifice) Bonusu: Sadece D8 Saf Beyin Çürümesine devasa çarpan!
      if (tier === 8 && state.sacrificeMultiplier.gt(1)) {
        mult = mult.times(state.sacrificeMultiplier)
      }

      // Algoritmik Ayna Sinerjisi (D1 <-> D8, D2 <-> D7, D3 <-> D6, D4 <-> D5 yakıt pompası)
      // Soft cap: partner etkisi üst sınır 4× ile sınırlanır.
      if (partnerDim && partnerBought > 0) {
        const partnerFactor = Math.min(4, 1 + Math.sqrt(partnerBought) * 0.15)
        mult = mult.times(partnerFactor)
      }

      // Kozmik Relik Seviye 4: Rezonanstaki hücre başına boyutlara evrensel ivme
      if (relicCount >= 4 && matureCellsCount > 0) {
        const boostPerCell = 0.10 + (relicCount - 4) * 0.05
        mult = mult.times(1 + matureCellsCount * boostPerCell)
      }

      // Nöral Ağaç pasif dalı: kalıcı üretim çarpanı (tüm istasyonlar)
      // Soft cap: 25× üstü logaritmik azalan getiriye döner.
      const effNeuralProd = neuralProd <= 25
        ? neuralProd
        : 25 + Math.log2(Math.max(1, neuralProd / 25)) * 3
      mult = mult.times(effNeuralProd)
      // NOT: offlineSimBoost burada her boyuta çarparak 1800x katlanmaması için
      // doğrudan update() içindeki son dopamin adımında tekil olarak uygulanır.

      // — Gece Krizi kuralları + kalıcı ödülleri (id hardcode yok; registry üzerinden) —
      const activeChallengeMods = state.activeChallenge
        ? getChallengeById(state.activeChallenge)?.modifiers
        : undefined
      // C4 (Sansür Matrisi): çift boyutlar susar.
      if (activeChallengeMods?.oddTiersOnly && tier % 2 === 0) {
        return D_0
      }
      const challengeEff = memoChallengeEffects(state.completedChallenges)
      // C1 ödülü (Uçak Modu): tüm boyutlar ×1.5
      if (challengeEff.dimMult !== 1) {
        mult = mult.times(challengeEff.dimMult)
      }
      // C4 ödülü (Sansür Matrisi): çift boyutlar ×2
      if (tier % 2 === 0 && challengeEff.evenDimMult !== 1) {
        mult = mult.times(challengeEff.evenDimMult)
      }
      // C3 (Önbellekteki Videolar): D1 %1 taban, koşu-içi üstel sayaçla büyür.
      if (tier === 1 && activeChallengeMods?.dim1BasePowerMult !== undefined) {
        mult = mult.times(activeChallengeMods.dim1BasePowerMult).times(state.challengeDim1Growth)
      }
      // 8/8 rozeti (Zombi Bakışı): tüm boyutlar +%25
      if (isAllChallengesComplete(state.completedChallenges)) {
        mult = mult.times(ALL_CHALLENGES_COMPLETE_MULT)
      }
      // Kademeli süre-metas: YALNIZCA challenge koşularında üretim bonusu (replay döngüsü)
      // (challengeTimeMult yukarıda hesaplandı ve cache anahtarına girdi — tekrar hesaplama)
      if (challengeTimeMult !== 1) {
        mult = mult.times(challengeTimeMult)
      }

      const tierProd = tierProductionMult(tier, dim.bought, tier <= unlocked)
      if (tierProd !== 1) {
        mult = mult.times(tierProd)
      }
      const discoverMult = formatUnlockBuffMult(
        tier,
        state.formatUnlockBuffTier,
        state.formatUnlockBuffUntil,
        Date.now()
      )
      if (discoverMult !== 1) {
        mult = mult.times(discoverMult)
      }

      _dimMultCache.set(tier, { key: cacheKey, val: mult })
      return mult
    },

    /**
     * ADR-0052: Boyut çarpanının kaynak etiketli dökümü (UI breakdown + test).
     * getDimensionMultiplier ile AYNI sırada AYNI çarpanlar; çarpımları birebir
     * eşittir (parite testi: scale-jumps.test.ts). Sıcak yolda kullanılmaz
     * (önbelleksiz) — getDimensionMultiplier performant yol olarak kalır.
     */

    getDimensionBreakdown: (state: GameState) => (tier: number): Array<{ source: string; mult: Decimal }> => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return [{ source: 'missing-tier', mult: D_1 }]

      const eyeDropsLvl = state.singularityUpgrades?.eye_drops || 0
      const partnerDim = state.dimensions[9 - tier - 1]
      const partnerBought = partnerDim ? partnerDim.bought : 0
      const neuralProd = memoNeuralEffects(state.neuralNodesBought || {}).productionMult
      const unlocked = resolvedUnlockedDimensionCount(state)
      const challengeTimeMult = state.activeChallenge ? challengeTimeTierMult(state.challengeBestTimes) : 1
      const relicCount = state.reactorCollapseCount || 0
      const matureCellsCount = relicCount >= 4 ? state.labCells.filter((c) => c.isMature && c.seedType !== null).length : 0

      const parts: Array<{ source: string; mult: Decimal }> = []
      parts.push({ source: 'per-ten', mult: Decimal.pow(DIM_PER_TEN_MULT, diminishingPurchaseCount(Math.floor(dim.bought / 10), BUCKET_CAP_THRESHOLD, BUCKET_CAP_GAIN)) })

      let resolutionMult = D_1
      for (const m of RESOLUTION_MILESTONES) {
        if (dim.bought >= m.count) {
          resolutionMult = new Decimal(m.mult)
        } else {
          break
        }
      }
      parts.push({ source: 'resolution', mult: resolutionMult })

      if (state.dimensionShifts > 0) {
        const eff = memoChallengeEffects(state.completedChallenges)
        const achBase = hasAchievementReward(state.achievements, 'shift_power_boost') ? 1.9 : 1.66
        const shiftBase = Math.max(eff.shiftPower, achBase)
        parts.push({ source: 'shift', mult: Decimal.pow(shiftBase, diminishingPurchaseCount(state.dimensionShifts, SHIFT_CAP_THRESHOLD, SHIFT_CAP_GAIN)) })
      }

      if (eyeDropsLvl > 0) {
        parts.push({ source: 'eye-drops', mult: Decimal.pow(2, eyeDropsLvl) })
      }

      if (tier === 8 && state.sacrificeMultiplier.gt(1)) {
        parts.push({ source: 'sacrifice', mult: state.sacrificeMultiplier })
      }

      if (partnerDim && partnerBought > 0) {
        parts.push({ source: 'mirror', mult: new Decimal(1 + Math.sqrt(partnerBought) * 0.15) })
      }

      if (relicCount >= 4 && matureCellsCount > 0) {
        const boostPerCell = 0.10 + (relicCount - 4) * 0.05
        parts.push({ source: 'relic', mult: new Decimal(1 + matureCellsCount * boostPerCell) })
      }

      parts.push({ source: 'neural', mult: new Decimal(neuralProd) })

      const activeChallengeMods = state.activeChallenge
        ? getChallengeById(state.activeChallenge)?.modifiers
        : undefined
      if (activeChallengeMods?.oddTiersOnly && tier % 2 === 0) {
        return [{ source: 'c4-silenced', mult: D_0 }]
      }
      const challengeEff = memoChallengeEffects(state.completedChallenges)
      if (challengeEff.dimMult !== 1) {
        parts.push({ source: 'c1-reward', mult: new Decimal(challengeEff.dimMult) })
      }
      if (tier % 2 === 0 && challengeEff.evenDimMult !== 1) {
        parts.push({ source: 'c4-reward', mult: new Decimal(challengeEff.evenDimMult) })
      }
      if (tier === 1 && activeChallengeMods?.dim1BasePowerMult !== undefined) {
        parts.push({
          source: 'c3-base',
          mult: new Decimal(activeChallengeMods.dim1BasePowerMult).times(state.challengeDim1Growth)
        })
      }
      if (isAllChallengesComplete(state.completedChallenges)) {
        parts.push({ source: 'all-challenges', mult: new Decimal(ALL_CHALLENGES_COMPLETE_MULT) })
      }
      if (challengeTimeMult !== 1) {
        parts.push({ source: 'challenge-time', mult: new Decimal(challengeTimeMult) })
      }

      const tierProd = tierProductionMult(tier, dim.bought, tier <= unlocked)
      if (tierProd !== 1) {
        parts.push({ source: 'tier-passive', mult: new Decimal(tierProd) })
      }
      const discoverMult = formatUnlockBuffMult(
        tier,
        state.formatUnlockBuffTier,
        state.formatUnlockBuffUntil,
        Date.now()
      )
      if (discoverMult !== 1) {
        parts.push({ source: 'format-buff', mult: new Decimal(discoverMult) })
      }

      return parts
    },

    // İstasyon Maliyet Hesabı (Getter)
    // C5 koşu-içi şişmesi (×1.5 birikimli) + C5 kalıcı indirimi (-%10) uygulanır.
    getDimensionCost: (state: GameState) => (tier: number): Decimal => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return D_INFINITY
      const bucket = Math.floor(dim.bought / 10)
      const infl = challengeCostInflationMult(state).toString()
      const eff = memoChallengeEffects(state.completedChallenges)
      // dim_cost_x085 bayrağı anahtarın parçası: başarım kazanılınca indirimli
      // maliyet bayat cache'ten dönmez (checkAchievements ayrıca cache'i düşürür).
      const hasDimDiscount = hasAchievementReward(state.achievements, 'dim_cost_x085')
      const cacheKey = bucket + '|' + infl + '|' + eff.dimCostMult + '|' + (hasDimDiscount ? 'D' : 'n')
      const cached = _dimCostCache.get(tier)
      if (cached && cached.key === cacheKey) return cached.val
      let cost = dimensionCostForBucket(tier, bucket, dim.baseCost, dim.costMult)
      cost = cost.times(challengeCostInflationMult(state))
      if (eff.dimCostMult !== 1) {
        cost = cost.times(eff.dimCostMult)
      }
      if (hasDimDiscount) {
        cost = cost.times(0.85)
      }
      _dimCostCache.set(tier, { key: cacheKey, val: cost })
      return cost
    },

    // Manuel alım önizlemesi (kuru koşu): tıklanınca kaç adet alınacak ve toplam maliyeti.
    // buyDimensionUnits ile birebir aynı semantiği yansıtır (paket atlarken maliyet adımı da değişir).
    previewDimensionBuy(this: StoreApi, state: GameState): (tier: number) => { units: number; cost: Decimal } | null {
      return (tier: number): { units: number; cost: Decimal } | null => {
        const dim = state.dimensions[tier - 1]
        if (!dim || tier > this.unlockedDimensionsCount) return null

        const infl = challengeCostInflationMult(state)
        const eff = memoChallengeEffects(state.completedChallenges)
        const dimDiscount = hasAchievementReward(state.achievements, 'dim_cost_x085') ? 0.85 : 1
        const flat = infl.times(eff.dimCostMult).times(dimDiscount)

        let units = 0
        let spent = D_0
        let bucket = Math.floor(dim.bought / 10)
        let remainingInBucket = 10 - (dim.bought % 10)

        // Üst sınır güvenlik: maliyet geometrik büyüdüğü için pratikte tur sayısı küçük kalır
        for (let guard = 0; guard < 300; guard++) {
          const packPrice = dimensionCostForBucket(tier, bucket, dim.baseCost, dim.costMult).times(flat)
          const unitCost = packPrice.div(10)
          const remaining = state.matter.minus(spent)
          if (remaining.lt(unitCost)) break

          if (remaining.gte(packPrice)) {
            spent = spent.plus(packPrice)
            units += 10
            bucket += 1
            remainingInBucket = 10
            continue
          }

          const affordable = Math.min(remainingInBucket, remaining.div(unitCost).floor().toNumber())
          if (affordable <= 0) break
          spent = spent.plus(unitCost.times(affordable))
          units += affordable
          // buyDimensionUnits ile birebir aynı semantik: mevcut kova ad-adet
          // sınırına takılınca döngü biter (yeni kovaya geçilmez). Aksi halde
          // önizleme, kova-kova ivmelendiğinde gerçek alımdan fazla birim gösterir.
          break
        }

        if (units <= 0) return null
        return { units, cost: spent }
      }
    },

    // Saniyedeki Efektif Dopamin Üretimi
    matterPerSecond(this: StoreApi, state: GameState): Decimal {
      if (this.challengeHalted) return D_0
      const dim1 = state.dimensions[0]
      if (!dim1 || dim1.amount.eq(0)) return D_0

      let baseProd = dim1.amount
        .times(this.getDimensionMultiplier(1))
        .times(this.tickspeedMultiplier)

      baseProd = baseProd.times(this.colonyMultiplier)
      baseProd = baseProd.times(state.napMultiplier)

      const stanceMult = this.stanceMultipliers.production
      const buffMult = this.productionBuffMultiplier
      const labMult = this.labPassiveMultiplier
      const reactorMult = this.reactorMassMult
      const debuffMult = state.crisisBackfireDebuff > 0 ? 0.5 : 1.0
      const netRatio = Math.max(0.01, 1 - this.slackerLeechPercent)

      return baseProd
        .times(stanceMult)
        .times(buffMult)
        .times(labMult)
        .times(this.achievementMultiplier)
        .times(this.achievementProductionMult)
        .times(reactorMult)
        .times(this.reactorRelicBonuses.universalMassMult)
        .times(debuffMult)
        .times(netRatio)
        .times(this.challengeProdMult)
    },

    /**
     * ADR-0052: Üretim çarpanlarının kaynak etiketli dökümü (UI breakdown + test).
     * matterPerSecond ile AYNI sırada AYNI çarpanlar; çarpımları birebir eşittir.
     */

    matterProductionBreakdown(this: StoreApi): Array<{ source: string; mult: Decimal }> {
      if (this.challengeHalted) return [{ source: 'challenge-halt', mult: D_0 }]
      const dim1 = this.dimensions[0]
      if (!dim1 || dim1.amount.eq(0)) return [{ source: 'empty-d1', mult: D_0 }]

      return [
        { source: 'd1-amount', mult: new Decimal(dim1.amount) },
        { source: 'd1-multiplier', mult: new Decimal(this.getDimensionMultiplier(1)) },
        { source: 'tickspeed', mult: new Decimal(this.tickspeedMultiplier) },
        { source: 'colony', mult: new Decimal(this.colonyMultiplier) },
        { source: 'nap', mult: new Decimal(this.napMultiplier) },
        { source: 'stance', mult: new Decimal(this.stanceMultipliers.production) },
        { source: 'buff', mult: new Decimal(this.productionBuffMultiplier) },
        { source: 'lab', mult: new Decimal(this.labPassiveMultiplier) },
        { source: 'achievement', mult: new Decimal(this.achievementMultiplier) },
        { source: 'achievement-production', mult: new Decimal(this.achievementProductionMult) },
        { source: 'reactor', mult: new Decimal(this.reactorMassMult) },
        { source: 'relic', mult: new Decimal(this.reactorRelicBonuses.universalMassMult) },
        { source: 'crisis-backfire', mult: new Decimal(this.crisisBackfireDebuff > 0 ? 0.5 : 1.0) },
        { source: 'slacker-leech', mult: new Decimal(Math.max(0.01, 1 - this.slackerLeechPercent)) },
        { source: 'challenge', mult: new Decimal(this.challengeProdMult) }
      ]
    },

    dopaminePerSecond(this: StoreApi): Decimal {
      return this.matterPerSecond
    },

    /**
     * Ham zincir büyüme tahmini (UI besleme ipucu): açık tier'lardan D1'e akan
     * ham zincir beslemesinin, tam üretim oranıyla ölçeklenmiş kaba üst sınırı.
     * Bilinçli olarak HAMDIR — colony/nap/duruş/buff/lab/reaktör/challenge gibi
     * global çarpanların tamamını tek tek uygulamaz; bunun yerine o anki
     * matterPerSecond/d1.amount oranını ölçek olarak kullanır. Kesin üretim
     * hesabı için değil, "hangi üst tier D1'i en hızlı büyütür" ipucu için okunur.
     */

    matterPerSecondGrowth(this: StoreApi, state: GameState): Decimal {
      const d1 = state.dimensions[0]
      if (!d1 || d1.amount.lte(0) || this.matterPerSecond.lte(0)) return D_0
      const unlocked = resolvedUnlockedDimensionCount(state)
      let best = D_0
      for (let t = 2; t <= unlocked; t++) {
        const higher = state.dimensions[t - 1]
        const lower = state.dimensions[t - 2]
        if (!higher || !lower || higher.amount.lte(0)) continue
        const feedToLower = higher.amount
          .times(this.getDimensionMultiplier(t))
          .times(this.tickspeedMultiplier)
          .times(this.achievementMultiplier)
          .times(DIMENSION_CHAIN_RATE)
        if (feedToLower.lte(0)) continue
        const growth = feedToLower.times(this.matterPerSecond.div(d1.amount))
        if (growth.gt(best)) best = growth
      }
      return best
    },
}
