// Boyut/tickspeed/shift/galaxy/olcek-sicrama action parcalari. `this`, StoreApi ile tiplenmistir.
import { sounds } from '../../core/audio'
import { safeConfetti } from '../../core/celebrate'
import { format } from '../../core/format'
import { D_0, Decimal } from '../../core/math'
import { hasAchievementReward } from '../../game/achievements'
import { DIMENSION_CHAIN_RATE, PURCHASE_CHAIN_BONUS_SECONDS, PURCHASE_MATTER_TICK_SECONDS, calcDimensionExactTotal, calcMaxDimensionPacks, calcMaxPacks, calcTickspeedExactTotal, challengeCostInflationMult, dimensionCostForBucket, maxBuyPacksCap, resolvedUnlockedDimensionCount } from '../../game/balance'
import { FORMAT_UNLOCK_BUFF_SECONDS, getTierIdentity } from '../../game/dimension_identity'
import { SCALE_LAYERS, applyResetScope, recordJump } from '../../game/layers'
import { NEURAL_TREE } from '../../game/neural-data'
import { log10Safe } from '../../game/pacing'
import { CHIP_MAX_LEVEL, speedChipCost as computeSpeedChipCost } from "../../game/speed-chip"
import { memoChallengeEffects, _dimMultCache } from './cache'
import type { JumpSnapshot, ScaleLayerId } from '../../game/layers'
import type { StoreApi } from './store-api'

export const dimensionActions = {
    getDimensionChainFeedPerSecond(this: StoreApi, tier: number): Decimal {
      if (tier <= 1) return D_0
      const dim = this.dimensions[tier - 1]
      if (!dim || dim.amount.lte(0)) return D_0
      return dim.amount
        .times(this.getDimensionMultiplier(tier))
        .times(this.tickspeedMultiplier)
        .times(this.achievementMultiplier)
        .times(DIMENSION_CHAIN_RATE)
    },

    emitProductionSurge(this: StoreApi, beforeMatterPerSec: Decimal, playSound = true): void {
      if (this.offlineSimActive || !playSound) return
      const after = this.matterPerSecond
      if (!after.gt(beforeMatterPerSec.times(1.001))) return
      const delta = after.minus(beforeMatterPerSec)
      if (delta.lte(0)) return
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('doomscroll:production-bump', {
            detail: { delta: delta.toString() }
          })
        )
      }
      sounds.playProductionSurge()
    },

    /** Satın alım sonrası zinciri birkaç saniye “hemen” akıtır; D2→D1 Dopamin/s’yi ve sayacı yükseltir. */

    applyPurchaseChainPulse(this: StoreApi, tier: number): void {
      if (tier < 2 || this.challengeHalted) return
      let hopTier = tier
      let seconds = PURCHASE_CHAIN_BONUS_SECONDS
      while (hopTier >= 2 && seconds >= 0.05) {
        const higher = this.dimensions[hopTier - 1]
        const lower = this.dimensions[hopTier - 2]
        if (!higher || !lower || higher.amount.lte(0)) break
        const produced = higher.amount
          .times(this.getDimensionMultiplier(hopTier))
          .times(this.tickspeedMultiplier)
          .times(this.achievementMultiplier)
          .times(DIMENSION_CHAIN_RATE)
          .times(seconds)
        lower.amount = lower.amount.plus(produced)
        hopTier -= 1
        seconds *= 0.42
      }
      const d1 = this.dimensions[0]
      if (d1 && d1.amount.gt(0) && this.matterPerSecond.gt(0)) {
        this.addMatter(this.matterPerSecond.times(PURCHASE_MATTER_TICK_SECONDS), true)
      }
    },

    finalizeDimensionPurchase(this: StoreApi, tier: number, mpsBefore: Decimal, playSound = false): void {
      if (tier >= 2) {
        this.applyPurchaseChainPulse(tier)
      }
      this.emitProductionSurge(mpsBefore, playSound)
    },

    // 10'luk İstasyon Satın Alımı (kısmi kova-aware: 5/10 dolu kovadan alımda sınır doğru fiyatlanır)
    buyDimension(this: StoreApi, tier: number, playSound = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      if (!dim) return false
      const infl = challengeCostInflationMult({
        activeChallenge: this.activeChallenge,
        challengeCostInflation: this.challengeCostInflation
      })
      const eff = memoChallengeEffects(this.completedChallenges)
      const flat = infl.times(eff.dimCostMult).times(this.achievementDimCostMult)
      const cost = calcDimensionExactTotal(tier, dim.baseCost, dim.costMult, dim.bought, 1, flat)

      if (this.matter.gte(cost)) {
        const mpsBefore = this.matterPerSecond
        this.matter = this.matter.minus(cost)
        dim.amount = dim.amount.plus(10)
        dim.bought += 10
        this.registerChallengeBuy(1)

        if (playSound) {
          sounds.playBuy(tier)
        }
        this.finalizeDimensionPurchase(tier, mpsBefore, playSound)
        return true
      }
      return false
    },

    // Bir İstasyondan Alınabildiği Kadar Satın Al (kısmi kova-aware: hizalı tahmin + net toplamla düzeltme)
    buyMaxDimension(this: StoreApi, tier: number, playSound = true, feedbackSurge = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      if (!dim) return false
      const startBucket = Math.floor(dim.bought / 10)
      const infl = challengeCostInflationMult({
        activeChallenge: this.activeChallenge,
        challengeCostInflation: this.challengeCostInflation
      })
      const eff = memoChallengeEffects(this.completedChallenges)
      const flat = infl.times(eff.dimCostMult).times(this.achievementDimCostMult)
      const budget = this.matter.div(flat)
      const cap = maxBuyPacksCap(this.singularities)
      let packs = calcMaxDimensionPacks(
        tier,
        dim.baseCost,
        dim.costMult,
        startBucket,
        budget,
        cap
      )
      let total = packs > 0
        ? calcDimensionExactTotal(tier, dim.baseCost, dim.costMult, dim.bought, packs, flat)
        : D_0
      while (packs > 0 && this.matter.lt(total)) {
        packs--
        total = packs > 0
          ? calcDimensionExactTotal(tier, dim.baseCost, dim.costMult, dim.bought, packs, flat)
          : D_0
      }
      // Performans (2026-10-15): bot yolları (feedbackSurge=false) bu değeri hiç
      // tüketmez — finalizeDimensionPurchase yalnızca feedbackSurge'de çağrılır.
      // Erken okuma, her bot alımında pahalı matterPerSecond getter'ını boşuna
      // yeniden hesaplıyordu (geç oyunda tick bütçesinin ~%6'sı).
      const mpsBefore = feedbackSurge ? this.matterPerSecond : D_0
      if (packs > 0) {
        this.matter = this.matter.minus(total)
        dim.amount = dim.amount.plus(10 * packs)
        dim.bought += 10 * packs
        this.registerChallengeBuy(packs)
      }
      // Kalanla alınabilen tekiller de süpürülür (en fazla 9 adet: sonraki paket zaten karşılanamıyor)
      let swept = 0
      for (let guard = 0; guard < 9; guard++) {
        const bucket = Math.floor(dim.bought / 10)
        const unitCost = dimensionCostForBucket(tier, bucket, dim.baseCost, dim.costMult).div(10).times(flat)
        if (this.matter.lt(unitCost)) break
        this.matter = this.matter.minus(unitCost)
        dim.amount = dim.amount.plus(1)
        dim.bought += 1
        swept++
      }
      if (swept > 0) this.registerChallengeBuy(swept / 10)
      if (packs <= 0 && swept <= 0) return false

      if (playSound) {
        sounds.playBuy(tier)
      }
      if (feedbackSurge) {
        this.finalizeDimensionPurchase(tier, mpsBefore, playSound)
      } else if (tier >= 2) {
        this.applyPurchaseChainPulse(tier)
      }
      return true
    },

    // Algoritma Frekansı (Tickspeed) Yükselt
    buyTickspeed(this: StoreApi, playSound = true): boolean {
      const cost = this.tickspeedCost
      if (this.matter.gte(cost)) {
        const mpsBefore = this.matterPerSecond
        this.matter = this.matter.minus(cost)
        this.tickspeedBought++
        this.registerChallengeBuy(1)
        if (playSound) {
          sounds.playBuy(0)
        }
        this.emitProductionSurge(mpsBefore, playSound)
        return true
      }
      return false
    },

    // M1 — Üretim Çipi satın al.
    // Etki: boyut üretim çarpanı ×(1.1^level) — getDimensionMultiplier üzerinden
    // tüm boyutlara uygulanır (bkz. getters-dimensions.ts).
    // Maliyet: CHIP_BASE_COST × CHIP_COST_MULT^level (koşu içi, kayıtta tutulmaz).
    // Sözleşme: cüzdan yetersizse veya CHIP_MAX_LEVEL aşıldıysa NO-OP —
    // state DEĞİŞMEZ, oyuncuya hata fırlatılmaz (sessiz red).
    buySpeedChip(this: StoreApi, playSound = true): boolean {
        if (this.speedChipLevel >= CHIP_MAX_LEVEL) return false
        const cost = computeSpeedChipCost(this.speedChipLevel)
        if (this.matter.lt(cost)) return false
        this.matter = this.matter.minus(cost)
        this.speedChipLevel += 1
        if (playSound) sounds.playUpgrade()
        return true
    },

    // Frekanstan alınabildiği kadar al (matematiksel: 1000×16^n geometrik seri)
    buyMaxTickspeed(this: StoreApi, playSound = true, feedbackSurge = true): boolean {
      const start = this.tickspeedBought
      const base = new Decimal(1000)
      const ratio = new Decimal(16)
      const infl = challengeCostInflationMult({
        activeChallenge: this.activeChallenge,
        challengeCostInflation: this.challengeCostInflation
      })
      const isPrivate = this.currentStance === 'private_mode'
      const hasDiscount = hasAchievementReward(this.achievements, 'tickspeed_discount')
      const eff = memoChallengeEffects(this.completedChallenges)
      const effMult = eff.tickspeedCostMult
      let flat = infl
      if (isPrivate) {
        flat = flat.times(0.85)
      }
      if (hasDiscount) {
        flat = flat.times(0.95)
      }
      if (effMult !== 1) {
        flat = flat.times(effMult)
      }
      const budget = this.matter.div(flat)
      const cap = maxBuyPacksCap(this.singularities)
      let n = calcMaxPacks(base, ratio, start, budget, cap)
      if (n <= 0) return false
      let total = calcTickspeedExactTotal(start, n, base, ratio, infl, isPrivate, hasDiscount, effMult)
      while (n > 0 && this.matter.lt(total)) {
        n--
        total = calcTickspeedExactTotal(start, n, base, ratio, infl, isPrivate, hasDiscount, effMult)
      }
      if (n <= 0) return false
      while (n < cap) {
        const nextTotal = calcTickspeedExactTotal(start, n + 1, base, ratio, infl, isPrivate, hasDiscount, effMult)
        if (nextTotal.lte(this.matter)) {
          n++
          total = nextTotal
        } else break
      }
      if (this.matter.lt(total)) return false
      // Performans: bot yolu (feedbackSurge=false) mpsBefore'ı tüketmez (yukarı bkz.)
      const mpsBefore = feedbackSurge ? this.matterPerSecond : D_0
      this.matter = this.matter.minus(total)
      this.tickspeedBought += n
      this.registerChallengeBuy(n)
      if (playSound) {
        sounds.playBuy(0)
      }
      if (feedbackSurge) {
        this.emitProductionSurge(mpsBefore, playSound)
      }
      return true
    },

    // Tüm İstasyonları ve Frekansı Optimize Al (Max All)
    // Sıra: ucuz üreticiden pahalıya (D1 -> D8), küresel çarpan (Tickspeed) en son.
    // Tersi sıra pahalı üst kademenin kasayı eritip D1'i aç bırakıyordu.
    maxAll(this: StoreApi): void {
      const mpsBefore = this.matterPerSecond
      let boughtAny = false
      for (let t = 1; t <= this.unlockedDimensionsCount; t++) {
        if (this.buyMaxDimension(t, false, false)) {
          boughtAny = true
        }
      }
      if (this.buyMaxTickspeed(false, false)) {
        boughtAny = true
      }

      if (boughtAny) {
        sounds.playBuy(1)
        this.emitProductionSurge(mpsBefore)
      }
    },

    // Önbelleği Temizleme / Geçmişi Sıfırla (Dimension Sacrifice - Antimatter Dimensions)
    sacrificeDimensions(this: StoreApi, playSound = true): boolean {
      if (!this.canSacrifice) return false

      const newMult = this.currentSacrificeReward
      this.sacrificeMultiplier = newMult
      // AD-accurate: alt boyutlar sıfırlanmaz, üretim kesintisiz devam eder.
      // Sadece mevcut D1 miktarı kalıcı D8 çarpanına dönüştürülür (1.15x kuralı spam'ı engeller).
      this.sacrificeCount++

      if (playSound) {
        sounds.playSacrifice()
        safeConfetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#06b6d4', '#f59e0b']
        })
      }
      return true
    },

    /** ADR-0025: yeni format tier açıldığında kısa üretim buff + juice. */

    celebrateFormatUnlock(this: StoreApi, tier: number): void {
      if (tier <= this.formatDiscoverSeenCap) return
      this.formatDiscoverSeenCap = tier
      this.formatUnlockBuffTier = tier
      this.formatUnlockBuffUntil = Date.now() + FORMAT_UNLOCK_BUFF_SECONDS * 1000
      _dimMultCache.clear()
      sounds.playUpgrade()
      const identity = getTierIdentity(tier)
      const label = identity?.label ?? `D${tier}`
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('doomscroll:tap', {
            detail: {
              x: window.innerWidth / 2,
              y: window.innerHeight * 0.35,
              text: `📺 ${label}`,
              color: '#22d3ee',
              big: true
            }
          })
        )
        window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))
      }
    },

    /**
     * ADR-0072 §A: Kütle kapılarından açılan boyutların TICK kutlaması.
     *
     * Neden ayrı bir yol: açılış artık Sıçrama olayından değil, `lifetimePeakMatter`
     * eşiklerinden gelir (tick içinde sessizce olur). Eski kutlama
     * `performScaleJump('shift')` dalındaydı ve bu yüzden hiç tetiklenmiyordu.
     *
     * Garantiler:
     *  - Yalnızca `update()` içinden çağrılır. Kayıt yükleme/deserialize bu action'ı
     *    ÇAĞIRMAZ; orada sayaç sessizce hizalanır. Böylece restore kutlama ateşlemez.
     *  - Aynı tick'te birden çok boyut açılırsa TEK kutlama, EN YÜKSEK tier ile
     *    yapılır (spam yok); `celebrateFormatUnlock` buff'ı ve efekti o tier'a kurar.
     *  - Çevrimdışı simülasyonda (offlineSimActive) ses/konfeti susar; sayaç yine de
     *    ilerletilir ki oyuncu döndüğünde gecikmeli bir kutlama patlaması olmasın.
     */
    celebrateDimensionUnlocks(this: StoreApi): void {
      const unlocked = this.unlockedDimensionsCount
      if (unlocked <= this.celebratedDimensionCap) return
      this.celebratedDimensionCap = unlocked
      if (this.offlineSimActive) return
      this.celebrateFormatUnlock(unlocked)
    },

    // Akış Sıçraması (Dimension Shift / Boost)
    // ---- Ölçek Sıçrama Motoru (ADR-0052) ----
    // dimensionShift / buyGalaxy / singularityReset ince sarmalayıcılardır.
    // Kapsamlar (ne sıfırlanır / ne korunur) src/game/layers.ts SCALE_LAYERS'tadır;
    // davranış değişikliği için tek doğru adres orasıdır. Yan etkiler
    // (ses/konfeti/olay) burada kalır — layers.ts saf matematik bölgesidir.

    /** Sıçrama anlık görüntüsünü günlüğe işler (sıfırlamadan ÖNCE çağrılır). */

    snapshotJump(this: StoreApi, layer: ScaleLayerId, spGained: Decimal): void {
      const snapshot: JumpSnapshot = {
        runSeconds: this.singularityRunSeconds,
        peakLogMatter: log10Safe(this.matter),
        shifts: this.dimensionShifts,
        galaxies: this.galaxies,
        singularities: this.singularities,
        spGained
      }
      recordJump(this, layer, snapshot)
    },

    performScaleJump(this: StoreApi, layer: ScaleLayerId, playSound = true): boolean {
      const spec = SCALE_LAYERS[layer]
      if (layer === 'shift') {
        if (!this.canShift) return false

        this.dimensionShifts++
        // ADR-0035: açılışları ve yüksek su seviyelerini dopamin sıfırlanmadan hemen
        // önce kaydet. `syncUnlocks()` sayacı da okuduğu için 5. sıçrama eşiği de
        // burada kalıcılaşır; son 0.5 sn'de aşılan basamaklar yeniden kilitlenmez.
        this.syncUnlocks()
        const capAfter = resolvedUnlockedDimensionCount(this)
        this.snapshotJump('shift', D_0)
        applyResetScope(this, spec.scope, NEURAL_TREE)
        // Challenge sayaç kancaları (salt-okunur: koşu mantığına dokunmaz) —
        // C3 üstel sayaç sıfırlanır, C8 bildirim sayacı %40 temizlenir.
        this.relieveChallengeOnPrestige()

        // ADR-0072: Açılış kutlaması artık burada DEĞİL. Açılışlar kütle
        // kapılarından geldiği için performScaleJump('shift') çoğu zaman hiç
        // tetiklenmez; kutlama update() tick'indedir (celebrateDimensionUnlocks).
        // Burada bırakılsaydı aynı açılış için İKİ kez kutlama olurdu.
        if (playSound) {
          sounds.playShift()
          safeConfetti({ ...spec.fx.confetti, origin: { y: spec.fx.confetti.originY } })
        }

        // Otomatik botlar çalışırken makro sarsıntı ve arpej zincirini tetikleme (sadece manuel basışta)
        if (typeof window !== 'undefined' && playSound) {
          window.dispatchEvent(
            new CustomEvent('doomscroll:macro-surge', {
              detail: {
                type: 'shift',
                title: `AKIŞ SIÇRAMASI #${this.dimensionShifts}`,
                unlockedDims: capAfter,
                multiplierText: `×${format(this.shiftPowerMultiplier, 1, this.settings.notation)} GÜÇ`
              }
            })
          )
        }
        return true
      }
      if (layer === 'galaxy') {
        if (!this.canBuyGalaxy) return false

        // ADR-0035: küme dopamini ve sıçrama sayacını sıfırlar — önce açılışları kaydet.
        this.syncUnlocks()

        this.galaxies++
        this.snapshotJump('galaxy', D_0)
        applyResetScope(this, spec.scope, NEURAL_TREE)
        // Challenge sayaç kancaları (C3 sıfırlama + C8 %40 temizleme).
        this.relieveChallengeOnPrestige()

        if (playSound) {
          sounds.playGalaxy()
          safeConfetti({ ...spec.fx.confetti, origin: { y: spec.fx.confetti.originY } })
        }

        if (typeof window !== 'undefined' && playSound) {
          window.dispatchEvent(
            new CustomEvent('doomscroll:macro-surge', {
              detail: {
                type: 'galaxy',
                title: `SONSUZ AKIŞ KÜMESİ #${this.galaxies}`,
                unlockedDims: resolvedUnlockedDimensionCount(this),
                multiplierText: `-%${this.galaxies * 2} FREKANS MALİYETİ`
              }
            })
          )
        }
        return true
      }
      return false
    },

    dimensionShift(this: StoreApi, playSound = true): boolean {
      return this.performScaleJump('shift', playSound)
    },

    // Sonsuz Akış Kümeleri Yaratımı
    buyGalaxy(this: StoreApi, playSound = true): boolean {
      return this.performScaleJump('galaxy', playSound)
    },

    // Koşu sıfırlama alt-kümesi: SP bloğu hariç her şey — challenge giriş/çıkış/
    // tamamlama SP vermeden yalnızca bunu çağırır. Kapsamın tek kaynağı
    // SCALE_LAYERS.singularity.scope'tur (src/game/layers.ts).
    resetRunState(this: StoreApi, refundChoiceNodes: boolean = true): void {
      // ADR-0035: şafak çöküşü / meydan okuma girişi de dopamini sıfırlar.
      // Tek burada çağrıldığı için dört yol (singularityReset, enterChallenge,
      // exitChallenge, completeChallenge) tek kancayla korunur.
      // K2 fix: meydan okuma giriş/çıkış/tamamlama koşusunda choice SP iadesi
      // engellenir; iade yalnızca gerçek singularity (prestige) koşusunda uygulanır.
      this.syncUnlocks()

      // ADR-0036 / Kokpit Garantisi: Prestijli oyuncuların botları asla sıfırlanmaz
      this.ensureAutobuyersPreserved()

      const scope = refundChoiceNodes
        ? SCALE_LAYERS.singularity.scope
        : { ...SCALE_LAYERS.singularity.scope, refundChoiceNodes: false }
      applyResetScope(this, scope, NEURAL_TREE)
    },

    // Manuel satın alma: ad bazlı maks — param 1 adete yetiyorsa buton aktiftir
    // tek tıkla alabildiği kadar adet alır (botların interval'i basış sıklığını belirler).

    // x1 modu: tek tıkla alabildiği kadar adet alır. Paket fiyatını karşılayabiliyorsa
    // 10'luk paketi paket fiyatına alır (aynı sonuç), karşılayamıyorsa kalan para ile
    // ad-adet devam eder. Maliyet geometrik büyüdüğü için tur sayısı küçük kalır.
    // Guard tavanı: en fazla 1000 tur × tur başına ≤10 adet (≈10k birim). previewDimensionBuy
    // ile aynı semantik (paket atlarken maliyet adımı değişir); önizlemenin guard'ı
    // daha sıkıdır (300 tur) çünkü sadece fiyat toplar, state'e yazmaz.
    buyDimensionUnits(this: StoreApi, tier: number, playSound = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      if (!dim) return false

      let unitsBought = 0
      const mpsBefore = this.matterPerSecond

      for (let guard = 0; guard < 1000; guard++) {
        const packPrice = this.getDimensionCost(tier)
        const unitCost = packPrice.div(10)
        if (this.matter.lt(unitCost)) break

        if (this.matter.gte(packPrice)) {
          this.matter = this.matter.minus(packPrice)
          dim.amount = dim.amount.plus(10)
          dim.bought += 10
          unitsBought += 10
          continue
        }

        // Paket yetmiyor: mevcut kovada kalan adet sınırı ile ad-adet al
        const remainingInBucket = 10 - (dim.bought % 10)
        const affordable = Math.min(remainingInBucket, this.matter.div(unitCost).floor().toNumber())
        if (affordable <= 0) break
        this.matter = this.matter.minus(unitCost.times(affordable))
        dim.amount = dim.amount.plus(affordable)
        dim.bought += affordable
        unitsBought += affordable
      }

      if (unitsBought <= 0) return false
      this.registerChallengeBuy(unitsBought / 10)
      if (playSound) sounds.playBuy(tier)
      this.finalizeDimensionPurchase(tier, mpsBefore, playSound)
      return true
    },

    // Bot ×1 modu: tek basışta 1 adet alır (maliyet güncel paket fiyatının 1/10'u)
    buyOneUnit(this: StoreApi, tier: number, playSound = false): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      if (!dim) return false

      const unitCost = this.getDimensionCost(tier).div(10)
      if (this.matter.lt(unitCost)) return false

      const mpsBefore = this.matterPerSecond
      this.matter = this.matter.minus(unitCost)
      dim.amount = dim.amount.plus(1)
      dim.bought += 1
      this.registerChallengeBuy(0.1)
      if (playSound) sounds.playBuy(tier)
      this.finalizeDimensionPurchase(tier, mpsBefore, playSound)
      return true
    },
}
