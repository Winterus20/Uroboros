// Kriz mudahale + challenge action parcalari. `this`, StoreApi ile tiplenmistir.
import { sounds } from '../../core/audio'
import { isPageVisible, safeConfetti } from '../../core/celebrate'
import { D_0, Decimal } from '../../core/math'
import { CHALLENGE_DOOM_RELIEF } from '../../game/balance'
import { getChallengeById } from '../../game/challenges'
import { checkUnlock } from '../../game/unlocks'
import type { CrisisDilemmaOption, CrisisInterventionType, CrisisSpellType } from '../../models/types'
import type { StoreApi } from './store-api'

export const crisisActions = {
    // C2/C5 kancası: HER başarılı alım birimi buradan geçer (manuel, bot, Maks, paket).
    // C2: üretim durma sayacı kurulur + rampa saati sıfırlanır. C5: şişme sayacı birikir.
    registerChallengeBuy(this: StoreApi, units = 1): void {
      const mods = this.activeChallengeDef?.modifiers
      if (!mods) return
      if (mods.productionHaltOnBuySec !== undefined) {
        this.challengeHaltUntil = mods.productionHaltOnBuySec
        this.challengeSinceBuy = 0
      }
      if (mods.costInflationOnBuy !== undefined) {
        this.challengeCostInflation += units
      }
    },

    // Sıçrama/Küme sonu challenge rahatlaması (salt-okunur kanca):
    // C3 üstel sayaç sıfırlanır; C8 bildirim sayacı %40 temizlenir. Koşu silinmez, fail-state yok.
    relieveChallengeOnPrestige(this: StoreApi): void {
      const mods = this.activeChallengeDef?.modifiers
      if (!mods) return
      if (mods.dim1ExpoGrowthPerSec !== undefined) {
        this.challengeDim1Growth = new Decimal(1)
      }
      if (mods.notificationDoomRatePerSec !== undefined) {
        this.challengeNotificationDoom *= CHALLENGE_DOOM_RELIEF
      }
      if (mods.costInflationOnBuy !== undefined) {
        this.challengeCostInflation = 0
      }
    },

    // ---- Gece Kriz Meydan Okumaları (Faz 1: Motor) ----
    // ConfirmModal onayı Faz 2'de eklenecek; şimdilik doğrudan giriş.
    enterChallenge(this: StoreApi, id: string): boolean {
      const def = getChallengeById(id)
      if (!def) return false
      if (this.activeChallenge === id) return false
      if (this.completedChallenges.includes(id)) return false
      if (def.unlock && !checkUnlock(this.unlockContext, { id, name: def.name, hint: '', req: def.unlock, order: def.order })) {
        return false
      }
      this.resetRunState(false)
      this.activeChallenge = id
      this.challengeElapsed = 0
      this.challengeHaltUntil = 0
      this.challengeSinceBuy = 9999
      this.challengeCostInflation = 0
      this.challengeNotificationDoom = 0
      this.challengeDim1Growth = new Decimal(1)
      sounds.playUpgrade()
      return true
    },

    // Cezasız vazgeç: koşu sıfırlanır, sayaçlar temizlenir, ödül yok.
    exitChallenge(this: StoreApi): boolean {
      if (!this.activeChallenge) return false
      this.resetRunState(false)
      this.activeChallenge = null
      this.challengeElapsed = 0
      this.challengeHaltUntil = 0
      this.challengeSinceBuy = 9999
      this.challengeCostInflation = 0
      this.challengeNotificationDoom = 0
      this.challengeDim1Growth = new Decimal(1)
      return true
    },

    // Hedefe ulaşınca (challengeGoalReached) çağrılır: süre kaydı + ödül + temiz fresh koşu.
    // celebrate=false → update() içinden otomatik tamamlama sessiz geçer (kullanıcı eylemi değil).
    completeChallenge(this: StoreApi, celebrate = true): boolean {
      if (!this.activeChallenge) return false
      if (!this.challengeGoalReached) return false
      const id = this.activeChallenge
      const elapsed = this.challengeElapsed
      if (!this.completedChallenges.includes(id)) {
        this.completedChallenges.push(id)
      }
      const prevBest = this.challengeBestTimes[id]
      if (typeof prevBest !== 'number' || elapsed < prevBest) {
        this.challengeBestTimes[id] = elapsed
      }
      this.stats.challengesCompleted = (this.stats.challengesCompleted || 0) + 1

      // Telemetri: Meydan okuma çöküşünü geçmişe kaydet
      this.pastSingularities.unshift({
        id: this.singularities,
        duration: elapsed,
        spGained: D_0,
        spPerMinute: D_0,
        peakMatter: this.stats.highestMatter,
        timestamp: Date.now(),
        challengeId: id
      })
      if (this.pastSingularities.length > 10) {
        this.pastSingularities.pop()
      }

      this.resetRunState(false)
      this.activeChallenge = null
      this.challengeElapsed = 0
      this.challengeHaltUntil = 0
      this.challengeSinceBuy = 9999
      this.challengeCostInflation = 0
      this.challengeNotificationDoom = 0
      this.challengeDim1Growth = new Decimal(1)
      if (celebrate && isPageVisible() && !this.offlineSimActive) {
        sounds.playSingularity()
        safeConfetti({
          particleCount: 180,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#06b6d4', '#ec4899', '#ffffff']
        })
      }
      return true
    },

    // Crisis 3.0: 4 Taktiksel Müdahale (Cooldown & Kartuş Korumalı)
    castCrisisIntervention(this: StoreApi, interventionType: CrisisInterventionType): boolean {
      if (this.reactorMeltdownTimer > 0) return false // Meltdown kilitlenmesi

      if (!this.reactorCooldowns) {
        this.reactorCooldowns = {}
      }

      // 1. Cooldown kontrolü
      if ((this.reactorCooldowns[interventionType] || 0) > 0) {
        return false
      }

      // 2. Manyetik Tahliye özel kartuş kontrolü
      if (interventionType === 'magnetic_vent') {
        const currentCharges = typeof this.reactorCoolantCharges === 'number' ? this.reactorCoolantCharges : 3
        if (currentCharges <= 0) {
          return false // Soğutucu rezervi boş!
        }
        this.reactorCoolantCharges = Math.max(0, currentCharges - 1)
        if (this.reactorCoolantCharges < 3 && (this.reactorCoolantTimer || 0) <= 0) {
          this.reactorCoolantTimer = 35 // Bir sonraki kartuş için 35 sn sayacı
        }
        this.reactorCooldowns[interventionType] = 2 // Çift tıklama spam koruması
        this.reactorHeat = Math.max(0, this.reactorHeat - 35)

        if (this.slackers.length > 0) {
          this.slackers.forEach((s) => {
            const refund = s.leechedDopamine.times(1.75)
            this.matter = this.matter.plus(refund)
            this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
            this.stats.slackersFired++
          })
          this.slackers = []
        }
        sounds.playVentCooling()
      } else if (interventionType === 'quantum_compression') {
        this.reactorCooldowns[interventionType] = 20
        this.spawnAnomaly(true)
        this.reactorHeat = Math.min(100, this.reactorHeat + 25)
        sounds.playCrisisDecision()
      } else if (interventionType === 'time_dilation') {
        this.reactorCooldowns[interventionType] = 25
        // Azami 120s tavan koruması (buff cap)
        this.activeBuffs.forEach((b) => {
          const headroom = Math.max(0, 120 - b.remaining)
          const addition = Math.min(15, headroom)
          b.remaining += addition
          b.duration += addition
        })
        this.reactorHeat = Math.min(100, this.reactorHeat + 20)
        sounds.playCrisisDecision()
      } else if (interventionType === 'planck_surge') {
        this.reactorCooldowns[interventionType] = 45
        const existing = this.activeBuffs.find((b) => b.type === 'planck_surge')
        if (existing) {
          const headroom = Math.max(0, 120 - existing.remaining)
          const addition = Math.min(20, headroom)
          existing.remaining += addition
          existing.duration += addition
        } else {
          this.activeBuffs.push({
            id: `buff-planck-${Date.now()}`,
            type: 'planck_surge',
            name: '💥 Planck Patlaması (4× Hz, 10× Yutma)',
            duration: 20,
            remaining: 20,
            multiplier: 4
          })
        }
        this.reactorHeat = Math.min(100, this.reactorHeat + 45)
        sounds.playCrisisDecision()
      }

      this.stats.spellsCast = (this.stats.spellsCast || 0) + 1
      this.caffeineEnergy = this.reactorHeat

      if (this.reactorHeat >= 100) {
        this.triggerReactorMeltdown()
      }

      safeConfetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#06b6d4', '#ec4899', '#f59e0b']
      })
      return true
    },

    // Geriye dönük uyumluluk takma metodu
    castSpell(this: StoreApi, spellId: CrisisSpellType): boolean {
      const aliasMap: Record<string, CrisisInterventionType> = {
        fast_charge: 'quantum_compression',
        espresso_shot: 'time_dilation',
        noise_cancelling: 'magnetic_vent',
        sleep_denial: 'planck_surge'
      }
      const targetType = (aliasMap[spellId] || spellId) as CrisisInterventionType
      return this.castCrisisIntervention(targetType)
    },

    // Crisis 2.0: Canlı Fırsat İkilemi (Dilemma) Tetikle
    triggerCrisisDilemma(this: StoreApi): void {
      if (this.activeCrisisDilemma) return
      const dilemmaList: Array<{
        id: string
        title: string
        desc: string
        options: CrisisDilemmaOption[]
      }> = [
        {
          id: 'plasma_surge',
          title: '⚠️ Plazma Kararsızlık Sızıntısı',
          desc: 'Reaktör çekirdeğinde kontrolsüz gravitasyonel basınç birikiyor. Alanı stabilize et veya aşırı rezonansa sürükle!',
          options: [
            {
              id: 'vent',
              label: 'Tahliye Valfini Aç',
              desc: '-25 Isı düşür ve anında 30 saniyelik kütle üretimi çek.',
              effect: 'vent'
            },
            {
              id: 'overcharge',
              label: 'Aşırı Rezonans Besle',
              desc: '+20 Isı yükselt ve 20 sn boyunca Çekim Hızını 2× katla.',
              effect: 'overcharge'
            }
          ]
        },
        {
          id: 'quantum_foam_rupture',
          title: '🌌 Kuantum Köpüğü Yırtılması',
          desc: 'Olay ufkunda mikro-tekillik yarıkları oluştu! Nasıl karşılık vereceksin?',
          options: [
            {
              id: 'stabilize',
              label: 'Alanı Sabitle',
              desc: '-20 Isı düşür ve ekrana anında 1 Altın Anomali fırlat.',
              effect: 'stabilize'
            },
            {
              id: 'collapse',
              label: 'Yırtığı Genişlet',
              desc: '+25 Isı ekle ve 30 sn boyunca Çekim Boyutlarını 5× katla.',
              effect: 'collapse'
            }
          ]
        },
        {
          id: 'event_horizon_split',
          title: '⚡ Olay Ufku Rezonans Tepe Noktası',
          desc: 'Termal enerji kritik sınıra ulaştı. Kütle akışını optimize et.',
          options: [
            {
              id: 'absorb_parasites',
              label: 'Parazitleri Sentezle',
              desc: '-15 Isı soğut ve mevcut tüm parazitleri %200 primle temizle.',
              effect: 'absorb_parasites'
            },
            {
              id: 'hyper_surge',
              label: 'Hiper Dalga Patlaması',
              desc: '+20 Isı yükselt ve anında 2 dakikalık kütle patlaması kazan.',
              effect: 'hyper_surge'
            }
          ]
        }
      ]
      const chosen = dilemmaList[Math.floor(Math.random() * dilemmaList.length)]
      this.activeCrisisDilemma = {
        id: chosen.id + '_' + Date.now(),
        title: chosen.title,
        desc: chosen.desc,
        duration: 15,
        timeLeft: 15,
        options: chosen.options
      }
      sounds.playCrisisDecision()
    },

    // Crisis 2.0: Canlı İkilem Seçeneği Uygula
    chooseCrisisDilemmaOption(this: StoreApi, optionId: string): void {
      if (!this.activeCrisisDilemma) return
      const opt = this.activeCrisisDilemma.options.find((o) => o.id === optionId)
      if (!opt) return

      if (opt.effect === 'vent') {
        this.reactorHeat = Math.max(0, this.reactorHeat - 25)
        const gain = this.matterPerSecond.times(30)
        if (gain.gt(0)) {
          this.matter = this.matter.plus(gain)
          this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(gain)
        }
      } else if (opt.effect === 'overcharge') {
        this.reactorHeat = Math.min(100, this.reactorHeat + 20)
        this.activeBuffs.push({
          id: `buff-dilemma-overcharge-${Date.now()}`,
          type: 'espresso',
          name: '⚡ Aşırı Rezonans (2× Frekans)',
          duration: 20,
          remaining: 20,
          multiplier: 2
        })
      } else if (opt.effect === 'stabilize') {
        this.reactorHeat = Math.max(0, this.reactorHeat - 20)
        this.spawnAnomaly(true)
      } else if (opt.effect === 'collapse') {
        this.reactorHeat = Math.min(100, this.reactorHeat + 25)
        this.activeBuffs.push({
          id: `buff-dilemma-collapse-${Date.now()}`,
          type: 'resonance_boost',
          name: '🌌 Boyut Sıkışması (5× Boyutlar)',
          duration: 30,
          remaining: 30,
          multiplier: 5
        })
      } else if (opt.effect === 'absorb_parasites') {
        this.reactorHeat = Math.max(0, this.reactorHeat - 15)
        if (this.slackers.length > 0) {
          this.slackers.forEach((s) => {
            const refund = s.leechedDopamine.times(2.0)
            this.matter = this.matter.plus(refund)
            this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
            this.stats.slackersFired++
          })
          this.slackers = []
        }
      } else if (opt.effect === 'hyper_surge') {
        this.reactorHeat = Math.min(100, this.reactorHeat + 20)
        const blast = this.matterPerSecond.gt(0) ? this.matterPerSecond.times(120) : this.manualClickPower.times(2000)
        this.matter = this.matter.plus(blast)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(blast)
      }

      this.caffeineEnergy = this.reactorHeat
      if (this.reactorHeat >= 100) {
        this.triggerReactorMeltdown()
      }

      this.activeCrisisDilemma = null
      this.dilemmaCooldown = 60
      sounds.playCrisisDecision()
      safeConfetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      })
    },
}
