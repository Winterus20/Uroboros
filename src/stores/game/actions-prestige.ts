// Tekillik/koloni sifirlama ve SP harcama action parcalari. `this`, StoreApi ile tiplenmistir.
import { sounds } from '../../core/audio'
import { safeConfetti } from '../../core/celebrate'
import { Decimal } from '../../core/math'
import { COLONY_CORE_COST } from '../../game/balance'
import { SCALE_LAYERS } from '../../game/layers'
import { NEURAL_LEGACY_UPGRADE_IDS, SINGULARITY_UPGRADES } from '../../game/neural-data'
import type { StoreApi } from './store-api'

export const prestigeActions = {
    // Sabah 06:00 Çöküşü (Tekillik Prestiji)
    // playSound=false → Şafak Nöbeti Botu sessiz çöküşü (confeti/ses yok)
    singularityReset(this: StoreApi, playSound = true): boolean {
      if (this.activeChallenge) {
        return this.completeChallenge(playSound)
      }
      if (!this.canSingularity) return false

      const gain = this.singularityGain
      const duration = this.singularityRunSeconds
      this.singularityPoints = this.singularityPoints.plus(gain)
      this.singularities++
      this.stats.singularityCount++

      // Bug Fix: en hızlı çöküş süresini kaydet
      if (!Number.isFinite(this.stats.fastestSingularity) || duration < this.stats.fastestSingularity) {
        this.stats.fastestSingularity = duration
      }

      // Telemetri: Son 10 Gece Günlüğü (Past 10)
      const spPerMin = duration > 0 ? gain.div(duration / 60) : gain
      this.pastSingularities.unshift({
        id: this.singularities,
        duration,
        spGained: gain,
        spPerMinute: spPerMin,
        peakMatter: this.stats.highestMatter,
        timestamp: Date.now(),
        challengeId: null
      })
      if (this.pastSingularities.length > 10) {
        this.pastSingularities.pop()
      }

      this.snapshotJump('singularity', gain)
      this.resetRunState()

      if (playSound) {
        sounds.playSingularity()
        const fx = SCALE_LAYERS.singularity.fx.confetti
        safeConfetti({ ...fx, origin: { y: fx.originY } })
      }
      return true
    },

    // Şafak Nöbeti Botu tetik koşulu (marjinal kazanç optimizatörü):
    // tekillik eşiği aşıldı + kazanç tabanı geçti + koşu yeterince uzun
    // ve marjinal log10(matter) büyümesi 3 saniyedir koşu ortalamasına oturmuş
    // (rampa tükendi — beklemenin getirisi kalmadı).
    shouldAutoSingularity(this: StoreApi): boolean {
      const bot = this.autobuyers.singularity
      if (!bot || !bot.unlocked || !bot.enabled) return false
      if (!this.canSingularity) return false
      const minGain = bot.minGainSp && bot.minGainSp > 0 ? bot.minGainSp : 1
      if (this.singularityGain.lt(minGain)) return false
      if (this.singularityRunSeconds < 10) return false
      return this.singularityDecelStreak >= 3
    },

    // Kalıcı Uykusuzluk Dükkanı: Yükseltme Satın Al
    buySingularityUpgrade(this: StoreApi, id: string): boolean {
      const upg = SINGULARITY_UPGRADES.find((u) => u.id === id)
      if (!upg) return false

      const currentLvl = this.singularityUpgrades[id] || 0
      if (currentLvl >= upg.maxLevel) return false

      const cost = Math.floor(upg.baseCost * Math.pow(upg.costMult, currentLvl) * this.achievementSpDiscount)
      if (this.singularityPoints.gte(cost)) {
        this.singularityPoints = this.singularityPoints.minus(cost)
        this.singularityUpgrades[id] = currentLvl + 1
        // Nöral Ağaç'a yerleştirilen eski id'lerde iki kayıt senkron tutulur
        if (NEURAL_LEGACY_UPGRADE_IDS.has(id)) {
          this.neuralNodesBought = { ...this.neuralNodesBought, [id]: currentLvl + 1 }
        }
        sounds.playBuy(4)
        safeConfetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#a855f7', '#06b6d4']
        })
        return true
      }
      return false
    },

    // Nöral Çekirdek Aktif Et (koloni başlatma — tek seferlik)
    hatchCore(this: StoreApi): boolean {
      if (this.neuralBots.gt(0)) return false
      if (this.matter.lt(COLONY_CORE_COST)) return false
      this.matter = this.matter.minus(COLONY_CORE_COST)
      this.neuralBots = new Decimal(1)
      sounds.playUpgrade()
      return true
    },

    // Toplu Uyku (Power Nap / Ant Sacrifice): koloniyi feda et, kalıcı kök çarpan katla
    powerNap(this: StoreApi): boolean {
      if (!this.canPowerNap) return false
      const gain = this.powerNapGain
      // Power Nap tavansız kalıcı çarpanını engeller: 20× üstüne çıkamaz.
      const nextNap = this.napMultiplier.times(gain)
      this.napMultiplier = nextNap.gt(20) ? new Decimal(20) : nextNap
      this.napCount++
      this.neuralBots = new Decimal(1) // Nöral çekirdek korunur
      sounds.playSacrifice()
      safeConfetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#a78bfa', '#06b6d4', '#f59e0b', '#ffffff']
      })
      return true
    },
}
