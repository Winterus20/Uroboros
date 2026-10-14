// Tiklama/anomali/parazit + noral dugum action parcalari. `this`, StoreApi ile tiplenmistir.
import { sounds } from '../../core/audio'
import { safeConfetti } from '../../core/celebrate'
import { Decimal } from '../../core/math'
import { GUILT_NAMES } from '../../game/balance'
import { tierAnomalyRateMult } from '../../game/dimension_identity'
import { COMBO_DECAY_MS, NEURAL_LEGACY_UPGRADE_IDS, NEURAL_TREE } from '../../game/neural-data'
import type { AnomalyType } from '../../models/types'
import type { StoreApi } from './store-api'

export const neuralActions = {
    // Yukarı Kaydır (Manuel Tıklama)
    manualClick(this: StoreApi, coords?: { x: number; y: number }): void {
      // Combo serisi: 1.5 sn içinde gelen tıklamalar seriyi uzatır, aksi halde seri 1'den başlar
      const now = Date.now()
      // Tıklama throttle: insanüstü CPS istismarını (boşluk tuşu key-repeat vb.)
      // engeller; aktif/passif parite korunur. Max 10 tıklama/sn.
      if (this.clickCombo.lastClickAt !== 0 && now - this.clickCombo.lastClickAt < 100) return

      if (now - this.clickCombo.lastClickAt <= COMBO_DECAY_MS) {
        this.clickCombo.count++
      } else {
        this.clickCombo.count = 1
      }
      this.clickCombo.lastClickAt = now

      const gain = this.manualClickPower
      this.matter = this.matter.plus(gain)
      this.stats.manualClicks++
      this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(gain)
      this.stats.totalManualDopamine = this.stats.totalManualDopamine.plus(gain)

      // Kuantum Reaktör Plazma Şarjı (Superconductor modu hariç ve canlı akışta değilken)
      if (this.isFeatureUnlocked('lab') && this.labMode !== 'superconductor' && !this.isViralActive) {
        this.labHype = Math.min(100, this.labHype + 0.4)
      }

      // Balatro Sütun 2: Sıralı Nedensellik (Sequential Triggering)
      const shouldReduce = this.settings.reduceAnimations || this.settings.batterySaver
      const isSequentialEnabled = this.settings.sequentialStrike !== false && !shouldReduce

      if (!isSequentialEnabled) {
        sounds.playClick()
        return
      }

      const stages = this.swipeBreakdown
      const isCrit = this.clickBuffMultiplier.gte(500)
      sounds.playSequentialStrike(stages.length, isCrit)

      if (typeof window !== 'undefined') {
        const x = coords?.x ?? window.innerWidth / 2
        const y = coords?.y ?? window.innerHeight / 2

        // Balatro Sıralı Reels Vuruşu Olayı
        window.dispatchEvent(
          new CustomEvent('doomscroll:sequential-strike', {
            detail: {
              x,
              y,
              stages,
              finalAmount: gain,
              isCrit,
              comboCount: this.clickCombo.count
            }
          })
        )
      }
    },

    // Nöral Ağaç: Düğüm Satın Al (SP harcar, öncül zinciri ve hariç seçim kilidini denetler)
    buyNeuralNode(this: StoreApi, id: string): boolean {
      const node = NEURAL_TREE.find((n) => n.id === id)
      if (!node) return false

      const bought = this.neuralNodesBought || {}
      const maxLevel = node.maxLevel ?? 1
      // Eski dükkân id'lerinde iki kayıt birleşik seviye taşır; maliyet birleşik seviyeye göre hesaplanır
      const legacyLvl = NEURAL_LEGACY_UPGRADE_IDS.has(id) ? this.singularityUpgrades?.[id] || 0 : 0
      const currentLvl = Math.max(bought[id] || 0, legacyLvl)
      if (currentLvl >= maxLevel) return false

      // Öncül zinciri: tüm requires düğümleri satın alınmış olmalı
      for (const reqId of node.requires) {
        if ((bought[reqId] || 0) < 1) return false
      }

      // Hariç seçim kilidi: aynı choiceGroup'tan kardeş alınmışsa satış kapalıdır
      if (node.choiceGroup) {
        const siblingLocked = NEURAL_TREE.some(
          (n) => n.choiceGroup === node.choiceGroup && n.id !== id && (bought[n.id] || 0) > 0
        )
        if (siblingLocked) return false
      }

      const cost = Math.floor(node.cost * Math.pow(node.costMult ?? 1, currentLvl) * this.achievementSpDiscount)
      if (this.singularityPoints.lt(cost)) return false

      this.singularityPoints = this.singularityPoints.minus(cost)
      this.neuralNodesBought = { ...bought, [id]: currentLvl + 1 }
      // Eski dükkân id'leri: etki bağlantıları singularityUpgrades okuduğu için kayıt senkronlanır
      if (NEURAL_LEGACY_UPGRADE_IDS.has(id)) {
        this.singularityUpgrades[id] = currentLvl + 1
      }
      sounds.playBuy(4)
      return true
    },

    // Gece Krizi Doğur (Spawn Anomaly) — ağırlıklı RNG + pity + mobil güvenli konum
    spawnAnomaly(this: StoreApi, forceGolden: boolean = false): boolean {
      if (!forceGolden && this.floatingAnomalies.length >= 2) {
        // Ekran doygunken timer'ı sıfırla; slot açılınca anlık pop-up yağmuru başlamasın
        this.anomalyTimer = 0
        return false
      }
      if (forceGolden && this.floatingAnomalies.length >= 4) {
        return false
      }

      // Ağırlıklı tablo: fyp %42 / heart %32 / sponsor %21 / void %5
      // Pity: 25 void'suz spawn sonrası void garanti (koleksiyon hissi korunur)
      let chosenType: AnomalyType
      if (forceGolden) {
        const roll = Math.random()
        chosenType = roll < 0.45 ? 'fyp' : roll < 0.8 ? 'heart_frenzy' : 'void'
      } else if ((this.mythicPity || 0) >= 25) {
        chosenType = 'void'
      } else {
        const roll = Math.random() * 100
        if (roll < 42) chosenType = 'fyp'
        else if (roll < 74) chosenType = 'heart_frenzy'
        else if (roll < 95) chosenType = 'sponsor'
        else chosenType = 'void'
      }
      if (chosenType === 'void') {
        this.mythicPity = 0
      } else {
        this.mythicPity = (this.mythicPity || 0) + 1
      }

      let title = ''
      let desc = ''
      let lifetime = 14
      if (chosenType === 'fyp') {
        title = 'Süpernova Patlaması!'
        desc = '60 saniyeliğine tüm kütle çekimini 7× katlar!'
      } else if (chosenType === 'heart_frenzy') {
        title = 'Kütle Patlaması!'
        desc = '15 saniyeliğine Manuel Yutma gücünü 777× fırlatır!'
      } else if (chosenType === 'void') {
        title = 'Kozmik Tekillik Dalgalanması!'
        desc = 'Garanti kombo: 30sn 7× + 15sn 777× aynı anda!'
        lifetime = 9
      } else {
        title = 'Hawking Işıması Zirvesi!'
        desc = 'Anında 2 dakikalık saf kütle tekilliğe akar!'
      }

      // Mobil güvenli spawn: dar ekranda kart (max 86vw) taşmasın
      const isNarrow = typeof window !== 'undefined' && window.innerWidth < 640
      const x = isNarrow
        ? Math.floor(Math.random() * 32) + 30
        : Math.floor(Math.random() * 48) + 26
      const y = Math.floor(Math.random() * 50) + 24

      this.floatingAnomalies.push({
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: chosenType,
        x,
        y,
        remainingTime: lifetime,
        totalTime: lifetime,
        title,
        desc
      })

      sounds.playAnomalySpawn(chosenType)

      const baseInterval = 65 + Math.random() * 30
      const mutedLvl = this.singularityUpgrades?.muted_alerts || 0
      const alertDiscount = Math.max(0.4, 1 - mutedLvl * 0.12)
      // Lab/stance çarpanları birikerek saniyeler aralığı kaydırmıştı; rate çarpanını
      // 2.5× ile sınırla ve minimum aralık koy ki pop-up yağmuru oluşmasın
      const rateMult = Math.min(
        2.5,
        this.stanceMultipliers.anomalyRate *
          this.labAnomalyMultiplier *
          tierAnomalyRateMult(this.dimensions, this.unlockedDimensionsCount)
      )
      this.nextAnomalyInterval = Math.max(40, (baseInterval * alertDiscount * this.achievementAnomalyFactor) / rateMult)
      this.anomalyTimer = 0
      return true
    },

    // Gece Krizine Tıkla (Collect Golden Buff)
    clickAnomaly(this: StoreApi, anomalyId: string): void {
      const index = this.floatingAnomalies.findIndex((a) => a.id === anomalyId)
      if (index === -1) return

      const anomaly = this.floatingAnomalies[index]
      this.floatingAnomalies.splice(index, 1)
      this.stats.anomaliesClicked++
      if (anomaly.type === 'void') {
        this.stats.mythicsClicked = (this.stats.mythicsClicked || 0) + 1
      }
      const durMult = this.achievementBuffDuration

      if (anomaly.type === 'fyp') {
        const existing = this.activeBuffs.find((b) => b.type === 'fyp')
        if (existing) {
          existing.remaining = Math.min(existing.remaining + 60 * durMult, 180 * durMult)
        } else {
          this.activeBuffs.push({
            id: `buff-fyp-${Date.now()}`,
            type: 'fyp',
            name: '🔥 Süpernova Patlaması (7× Kütle)',
            duration: Math.floor(60 * durMult),
            remaining: Math.floor(60 * durMult),
            multiplier: 7
          })
        }
      } else if (anomaly.type === 'heart_frenzy') {
        const existing = this.activeBuffs.find((b) => b.type === 'heart_frenzy')
        if (existing) {
          existing.remaining = Math.min(existing.remaining + 15 * durMult, 45 * durMult)
        } else {
          this.activeBuffs.push({
            id: `buff-frenzy-${Date.now()}`,
            type: 'heart_frenzy',
            name: '🌌 Kütle Patlaması (777× Çekim)',
            duration: Math.floor(15 * durMult),
            remaining: Math.floor(15 * durMult),
            multiplier: 777
          })
        }
      } else if (anomaly.type === 'void') {
        // Void Tekillik: garanti kombo — 30sn 7× üretim + 15sn 777× çekim
        const fyp = this.activeBuffs.find((b) => b.type === 'fyp')
        if (fyp) {
          fyp.remaining = Math.min(fyp.remaining + 30 * durMult, 90 * durMult)
        } else {
          this.activeBuffs.push({
            id: `buff-fyp-void-${Date.now()}`,
            type: 'fyp',
            name: '🔥 Süpernova Patlaması (7× Kütle)',
            duration: Math.floor(30 * durMult),
            remaining: Math.floor(30 * durMult),
            multiplier: 7
          })
        }
        const frenzy = this.activeBuffs.find((b) => b.type === 'heart_frenzy')
        if (frenzy) {
          frenzy.remaining = Math.min(frenzy.remaining + 15 * durMult, 45 * durMult)
        } else {
          this.activeBuffs.push({
            id: `buff-frenzy-void-${Date.now()}`,
            type: 'heart_frenzy',
            name: '🌌 Kütle Patlaması (777× Çekim)',
            duration: Math.floor(15 * durMult),
            remaining: Math.floor(15 * durMult),
            multiplier: 777
          })
        }
      } else if (anomaly.type === 'sponsor') {
        const currentPerSec = this.matterPerSecond
        const instantReward = currentPerSec.gt(0)
          ? currentPerSec.times(120)
          : this.manualClickPower.times(300)

        this.matter = this.matter.plus(instantReward)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(instantReward)
      }

      if (this.isComboActive) {
        this.stats.combosTriggered++
        sounds.playCombo()
        safeConfetti({
          particleCount: anomaly.type === 'void' ? 160 : 130,
          spread: 100,
          origin: { y: 0.4 },
          colors: anomaly.type === 'void'
            ? ['#c084fc', '#22d3ee', '#f0abfc', '#ffffff']
            : ['#a855f7', '#ec4899', '#06b6d4', '#f59e0b']
        })
      } else if (anomaly.type === 'void') {
        sounds.playMythicCollect()
        safeConfetti({
          particleCount: 90,
          spread: 85,
          origin: { x: anomaly.x / 100, y: anomaly.y / 100 },
          colors: ['#c084fc', '#22d3ee', '#ffffff']
        })
      } else {
        sounds.playCrisisCollect(anomaly.type)
        safeConfetti({
          particleCount: 40,
          spread: 60,
          origin: { x: anomaly.x / 100, y: anomaly.y / 100 },
          colors: ['#a855f7', '#ec4899']
        })
      }
    },

    // Vicdan Azabı Doğur (Spawn Guilt / Wrinkler)
    spawnSlacker(this: StoreApi): void {
      if (this.slackers.length >= 5) return

      const randomName = GUILT_NAMES[Math.floor(Math.random() * GUILT_NAMES.length)]
      this.slackers.push({
        id: `guilt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: randomName,
        leechedDopamine: new Decimal(0),
        clicksRemaining: 3
      })
    },

    // Vicdan Azabına Tıkla ("Sadece 1 Video Daha!")
    clickSlacker(this: StoreApi, slackerId: string): void {
      const index = this.slackers.findIndex((s) => s.id === slackerId)
      if (index === -1) return

      const slacker = this.slackers[index]
      slacker.clicksRemaining--

      if (slacker.clicksRemaining <= 0) {
        const immunityLvl = this.singularityUpgrades?.guilt_immunity || 0
        // Nöral Ağaç: Kriz Ganimeti / Demir Sabır düğümleri prim çarpanını büyütür
        const refundRatio = (1.20 + immunityLvl * 0.15) * this.neuralEffects.crisisRewardMult
        const refund = slacker.leechedDopamine.times(refundRatio)

        this.matter = this.matter.plus(refund)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
        this.stats.slackersFired++

        this.slackers.splice(index, 1)
        sounds.playSilenceGuilt()

        safeConfetti({
          particleCount: 45,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#a855f7', '#06b6d4', '#ffffff']
        })
      } else {
        sounds.playGuiltClick()
      }
    },
}
