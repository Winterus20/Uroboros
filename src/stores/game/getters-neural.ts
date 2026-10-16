// Noral agac + tiklama/kombo getter parcalari. `this`, StoreApi ile tiplenmistir.
import { format } from '../../core/format'
import { D_0, D_1, Decimal } from '../../core/math'
import { tierClickSyncCapBonus } from '../../game/dimension_identity'
import { COMBO_THRESHOLDS, CPS_SYNC_BASE, CPS_SYNC_CAP, CPS_SYNC_PER_LEVEL, NEURAL_LEGACY_UPGRADE_IDS, NEURAL_TREE } from '../../game/neural-data'
import { memoNeuralEffects } from './cache'
import type { NeuralEffects, StrikeStage } from '../../models/types'
import type { GameState } from './state'
import type { StoreApi } from './store-api'

export const neuralGetters = {
    // QoL: harcanabilir SP ile alınabilir Nöral Ağaç düğümü var mı? (Şafak sekmesi bildirim noktası)
    hasAffordableNeuralNode(this: StoreApi, state: GameState): boolean {
      if (state.singularityPoints.lte(0)) return false
      const bought = state.neuralNodesBought || {}
      return NEURAL_TREE.some((node) => {
        const maxLevel = node.maxLevel ?? 1
        const legacyLvl = NEURAL_LEGACY_UPGRADE_IDS.has(node.id) ? state.singularityUpgrades?.[node.id] || 0 : 0
        const currentLvl = Math.max(bought[node.id] || 0, legacyLvl)
        if (currentLvl >= maxLevel) return false
        for (const reqId of node.requires) {
          if ((bought[reqId] || 0) < 1) return false
        }
        if (node.choiceGroup) {
          const siblingLocked = NEURAL_TREE.some(
            (n) => n.choiceGroup === node.choiceGroup && n.id !== node.id && (bought[n.id] || 0) > 0
          )
          if (siblingLocked) return false
        }
        const cost = Math.floor(node.cost * Math.pow(node.costMult ?? 1, currentLvl) * this.achievementSpDiscount)
        return state.singularityPoints.gte(cost)
      })
    },

    // Telemetri: Aktif vs Pasif Üretim Oranı
    activeVsPassiveRatio(this: StoreApi, state: GameState): { manualPct: number; passivePct: number } {
      const manual = state.stats.totalManualDopamine || D_0
      const total = state.stats.totalMatterProduced || D_0
      if (total.lte(0) || manual.lte(0)) {
        return { manualPct: 0, passivePct: 100 }
      }
      const ratio = manual.div(total).toNumber()
      const manualPct = Math.min(100, Math.max(0, Math.round(ratio * 100)))
      return {
        manualPct,
        passivePct: 100 - manualPct
      }
    },

    // Telemetri: Manuel Kaydırma Gücü (Click Power) Kırılımı
    clickPowerBreakdown(this: StoreApi, state: GameState): Array<{ name: string; value: string; desc: string }> {
      const rows: Array<{ name: string; value: string; desc: string }> = []
      let totalBought = 0
      state.dimensions.forEach((d) => {
        totalBought += d.bought
      })
      rows.push({
        name: 'İstasyon Satın Alımları',
        value: `+${(totalBought * 0.25).toFixed(2)} Taban`,
        desc: 'Satın alınan her istasyon taban dokunuş gücüne +0.25 ekler'
      })
      if (this.shiftPowerMultiplier.gt(1)) {
        rows.push({
          name: 'Akış Sıçraması',
          value: `×${this.shiftPowerMultiplier.toNumber().toFixed(2)}`,
          desc: 'Akış sıçramalarının sağladığı çarpan'
        })
      }
      if (this.stanceMultipliers.click !== 1) {
        rows.push({
          name: 'Gece Duruşu',
          value: `×${this.stanceMultipliers.click.toFixed(1)}`,
          desc: 'Aktif duruşun tıklama çarpanı (Çılgın Kaydırma: 4×)'
        })
      }
      if (this.comboMultiplier > 1) {
        rows.push({
          name: 'Hızlı Kaydırma Komboları',
          value: `×${this.comboMultiplier.toFixed(2)}`,
          desc: '1.5 sn içinde kesintisiz kaydırmalar seriyi güçlendirir'
        })
      }
      if (this.clickBuffMultiplier.gt(1)) {
        rows.push({
          name: 'Aktif Kriz Güçlendirici',
          value: `×${this.clickBuffMultiplier.toNumber().toFixed(1)}`,
          desc: 'Başparmak Histerisi veya Espresso anomali güçlendiricisi'
        })
      }
      if (this.neuralEffects.cpsSyncLevel > 0) {
        const syncCap = CPS_SYNC_CAP + tierClickSyncCapBonus(state.dimensions)
        const syncRate = Math.min(syncCap, CPS_SYNC_BASE + CPS_SYNC_PER_LEVEL * this.neuralEffects.cpsSyncLevel)
        rows.push({
          name: 'Nöral CPS Senkronu',
          value: `+%${Math.round(syncRate * 100)} CPS`,
          desc: 'Saniyelik akışın bir kısmını doğrudan her tıklamaya aktarır'
        })
      }
      if (this.neuralEffects.clickMult > 1) {
        rows.push({
          name: 'Nöral Ağaç',
          value: `×${this.neuralEffects.clickMult.toFixed(2)}`,
          desc: 'Yetenek ağacı tıklama düğümleri çarpanı'
        })
      }
      return rows
    },

    // Üretim Buff Çarpanı (Gece 3 Çılgınlığı vb.)
    productionBuffMultiplier(this: StoreApi, state: GameState): Decimal {
      let mult = D_1
      const fyp = state.activeBuffs.find((b) => b.type === 'fyp')
      if (fyp) {
        mult = mult.times(fyp.multiplier)
      }
      return mult
    },

    // Tıklama Buff Çarpanı (Başparmak Histerisi vb.)
    clickBuffMultiplier(this: StoreApi, state: GameState): Decimal {
      let mult = D_1
      const frenzy = state.activeBuffs.find((b) => b.type === 'heart_frenzy')
      if (frenzy) {
        mult = mult.times(frenzy.multiplier)
      }
      return mult
    },

    // Süper Rezonans Komboları Aktif mi? (Gece 3 7x VE Başparmak Histerisi 300x aynı anda)
    isComboActive(this: StoreApi, state: GameState): boolean {
      const hasFyp = state.activeBuffs.some((b) => b.type === 'fyp')
      const hasFrenzy = state.activeBuffs.some((b) => b.type === 'heart_frenzy')
      return hasFyp && hasFrenzy
    },

    // Nöral Ağaç: satın alınan düğümlerin toplanmış sayısal etkileri (tek kaynak)
    neuralEffects(this: StoreApi, state: GameState): NeuralEffects {
      return memoNeuralEffects(state.neuralNodesBought || {})
    },

    // Combo çarpanı: yalnızca Hipnotik Seri düğümü alındıysa eşiklere göre uygulanır
    comboMultiplier(this: StoreApi, state: GameState): number {
      if ((state.neuralNodesBought?.combo_unlock || 0) < 1) return 1
      let mult = 1
      for (const t of COMBO_THRESHOLDS) {
        if (state.clickCombo.count >= t.count) {
          mult = t.mult
        }
      }
      return mult
    },

    // Toplam Manuel Kaydırma Gücü (Yukarı Kaydır)
    manualClickPower(this: StoreApi, state: GameState): Decimal {
      let totalBought = 0
      state.dimensions.forEach((d) => {
        totalBought += d.bought
      })

      // 1. Taban Tıklama Gücü
      let baseClick = D_1.plus(new Decimal(totalBought).times(0.25))
        .times(this.shiftPowerMultiplier)
        .times(this.labClickMultiplier)
        .times(this.achievementMultiplier)
        .times(this.challengeRewardEffects.clickMult)

      // 2. Temel Senkronizasyon (%CPS to click):
      const syncCap =
        CPS_SYNC_CAP + tierClickSyncCapBonus(state.dimensions)
      const syncRate = Math.min(syncCap, CPS_SYNC_BASE + CPS_SYNC_PER_LEVEL * this.neuralEffects.cpsSyncLevel)
      let power = baseClick.plus(this.matterPerSecond.times(syncRate))

      // 3. 1080p 60fps Milestone Bonusu: 200+ adet satın alınan her açık formatın üretiminin %1'i tıklamaya eklenir
      state.dimensions.forEach((d, idx) => {
        if (d.bought >= 200 && d.amount.gt(0)) {
          const dimPerSec = d.amount.times(this.getDimensionMultiplier(idx + 1)).times(this.tickspeedMultiplier).times(0.01)
          power = power.plus(dimPerSec)
        }
      })

      // 4. Damardan Kafein Serumu: Saniyelik üretimin her seviye %3'ünü ekler
      const caffeineLvl = state.singularityUpgrades?.caffeine_drip || 0
      if (caffeineLvl > 0) {
        const passiveAdd = this.matterPerSecond.times(caffeineLvl * 0.03 * this.achievementCaffeineBoost)
        power = power.plus(passiveAdd)
      }

      // 5. Global Tıklama Çarpanları: 300× Frenzy, 4× Spam duruşu, Nöral Ağaç ve Kombolar toplam tıklamaya uygulanır
      power = power
        .times(this.stanceMultipliers.click)
        .times(this.clickBuffMultiplier)
        .times(this.achievementClickMult)
        .times(this.neuralEffects.clickMult)
        .times(this.comboMultiplier)

      const planckSurge = state.activeBuffs.find((b) => b.type === 'planck_surge')
      if (planckSurge) {
        power = power.times(10)
      }

      return power
    },

    // Balatro Sütun 2: "Reels Vuruşu" Sıralı Nedensellik Basamak Kırılımı (Sequential Triggering)
    swipeBreakdown(this: StoreApi, state: GameState): StrikeStage[] {
      const stages: StrikeStage[] = []

      // 1. Taban İstasyon Tıklaması (Satın alımlardan gelen taban vuruş)
      let totalBought = 0
      state.dimensions.forEach((d) => {
        totalBought += d.bought
      })
      const rawBase = D_1.plus(new Decimal(totalBought).times(0.25))

      stages.push({
        id: 'base',
        label: 'TABAN AKIŞ',
        text: `+${format(rawBase, 2, state.settings.notation)}`,
        color: '#00d2ff',
        bgClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
        borderClass: 'border-cyan-400',
        icon: '⚡'
      })

      // 2. Format Sinerjisi (Akış Sıçraması × Lab × Başarımlar × Meydan Okuma Ödülleri)
      const synergyMult = this.shiftPowerMultiplier
        .times(this.labClickMultiplier)
        .times(this.achievementMultiplier)
        .times(this.challengeRewardEffects.clickMult)

      if (synergyMult.gt(1.05)) {
        stages.push({
          id: 'synergy',
          label: 'SİNERJİ',
          text: `×${format(synergyMult, 2, state.settings.notation)}`,
          color: '#10b981',
          bgClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
          borderClass: 'border-emerald-400',
          icon: '✨',
          multiplier: synergyMult.toNumber()
        })
      }

      // 3. Gece Duruşu & Seri Kombo & Nöral/Başarım Tıklaması (Trimps Stance, Combo, Neural Tree, Ach Click Mult)
      const stanceMult = this.stanceMultipliers.click
      const comboMult = this.comboMultiplier
      const neuralMult = this.neuralEffects.clickMult
      const achClickMult = this.achievementClickMult
      const combinedStanceCombo = stanceMult * comboMult * neuralMult * achClickMult

      if (combinedStanceCombo > 1.05) {
        const stanceLabel = stanceMult > 1.05
          ? 'ÇILGIN KAYDIRMA'
          : comboMult > 1.05
            ? 'HIZLI SERİ'
            : neuralMult > 1.05
              ? 'NÖRAL SERİ'
              : 'BAŞARIM SERİSİ'
        stages.push({
          id: 'stance_combo',
          label: stanceLabel,
          text: `×${combinedStanceCombo.toFixed(1)}`,
          color: '#fe5f55',
          bgClass: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
          borderClass: 'border-rose-400',
          icon: '🔥',
          multiplier: combinedStanceCombo
        })
      }

      // 4. Gece Histerisi / Anomali CRIT / Planck Dalgalanması (10x)
      let buffMult = this.clickBuffMultiplier
      const planckSurge = state.activeBuffs.find((b) => b.type === 'planck_surge')
      if (planckSurge) {
        buffMult = buffMult.times(10)
      }
      if (buffMult.gt(1.05)) {
        const isSuperCrit = buffMult.gte(500)
        const critLabel = isSuperCrit
          ? '777× HİSTERİ CRIT!'
          : planckSurge && this.clickBuffMultiplier.lte(1.05)
            ? 'PLANCK PATLAMASI'
            : 'KRİZ ANOMALİSİ'
        stages.push({
          id: 'crit',
          label: critLabel,
          text: `×${format(buffMult, 1, state.settings.notation)}`,
          color: '#fbbf24',
          bgClass: 'bg-amber-500/25 text-amber-200 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.4)]',
          borderClass: 'border-amber-400',
          icon: '💥',
          multiplier: buffMult.toNumber()
        })
      }

      // 5. Final Toplam Skor (Nihai Slam Down — manualClickPower ile birebir özdeş)
      const finalGain = this.manualClickPower
      stages.push({
        id: 'final',
        label: 'SLAM!',
        text: `+${format(finalGain, 2, state.settings.notation)}`,
        color: '#c084fc',
        bgClass: 'bg-purple-500/25 text-purple-200 border-purple-400/60 shadow-[0_0_20px_rgba(192,132,252,0.5)]',
        borderClass: 'border-purple-400',
        icon: '🌌'
      })

      return stages
    },
}
