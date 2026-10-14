// Lab hucre/reaktor action parcalari. `this`, StoreApi ile tiplenmistir.
import { sounds } from '../../core/audio'
import { safeConfetti } from '../../core/celebrate'
import { D_0 } from '../../core/math'
import { FLUCTUATION_HARVEST_DOUBLE_CHANCE, FLUCTUATION_HARVEST_DOUBLE_MULT, LAB_SEEDS, labEffectiveSeedCost } from '../../game/lab-data'
import type { LabMode, LabSeedType } from '../../models/types'
import type { StoreApi } from './store-api'

export const labActions = {
    // Algoritma Stüdyosu: Modülü Matrise Yerleştir (Boş hücreye ek veya mevcut olanı değiştir)
    plantSeed(this: StoreApi, cellId: number, seedType: LabSeedType): boolean {
      const cell = this.labCells[cellId]
      if (!cell) return false
      if (cell.seedType === seedType && cell.isMature) return false

      const seedDef = LAB_SEEDS.find((s) => s.type === seedType)
      if (!seedDef) return false
      // P1: taban maliyet sabittir; efektif maliyet tepe-noktayla yumuşak artar.
      const effectiveCost = labEffectiveSeedCost(seedDef.cost, this.lifetimePeakMatter)
      if (this.matter.lt(effectiveCost)) return false

      this.matter = this.matter.minus(effectiveCost)
      cell.seedType = seedType
      cell.age = 0
      cell.matureAge = seedDef.growthSeconds
      cell.maxAge = Infinity
      cell.isMature = false
      this.stats.seedsPlanted = (this.stats.seedsPlanted || 0) + 1

      sounds.playPlant()
      return true
    },

    // Algoritma Stüdyosu: Olgun Hücreden Anlık Verim & Hype Topla (Modülü silmez, tekrar ısınır!)
    harvestCell(this: StoreApi, cellId: number): boolean {
      const cell = this.labCells[cellId]
      if (!cell || !cell.seedType || !cell.isMature) return false

      let reward = D_0
      const currentPerSec = this.matterPerSecond
      const clickPwr = this.manualClickPower

      if (cell.seedType === 'photon_resonator') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(10) : clickPwr.times(50)
      } else if (cell.seedType === 'heavy_nucleon') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(20) : clickPwr.times(200)
      } else if (cell.seedType === 'gluon_binder') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(30) : clickPwr.times(500)
      } else if (cell.seedType === 'graviton_trap') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(40) : clickPwr.times(1500)
      } else if (cell.seedType === 'dark_matter_core') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(50) : clickPwr.times(2500)
      } else if (cell.seedType === 'magnetic_shield') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(60) : clickPwr.times(3500)
      } else if (cell.seedType === 'tachyon_flux') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(90) : clickPwr.times(4500)
      } else if (cell.seedType === 'higgs_boson') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(120) : clickPwr.times(10000)
      }

      reward = reward.times(this.achievementLabYield)

      // P1: Dalgalanma Rejimi hasat ikilemesi (%15 şansla ×2, sessiz)
      if (this.labMode === 'fluctuation' && Math.random() < FLUCTUATION_HARVEST_DOUBLE_CHANCE) {
        reward = reward.times(FLUCTUATION_HARVEST_DOUBLE_MULT)
      }

      this.addMatter(reward, true)
      this.stats.labHarvests = (this.stats.labHarvests || 0) + 1

      // Plazma barına +2.5% taktil katkı (Superconductor modunda durur)
      if (this.labMode !== 'superconductor' && !this.isViralActive) {
        this.labHype = Math.min(100, this.labHype + 2.5)
      }

      // Modül silinmez! Rezonansını tazeleyip tekrar ısınır
      cell.age = 0
      cell.isMature = false

      sounds.playHarvest()
      safeConfetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#ec4899']
      })
      return true
    },

    // Algoritma Stüdyosu: Hücreyi Boşalt
    clearCell(this: StoreApi, cellId: number): void {
      const cell = this.labCells[cellId]
      if (!cell) return
      cell.seedType = null
      cell.age = 0
      cell.isMature = false
      sounds.playGuiltClick()
    },

    // Algoritma Stüdyosu: Plazma Besleme Rejimini Değiştir
    setLabMode(this: StoreApi, mode: LabMode): void {
      if (this.labMode === mode) return
      this.labMode = mode
      sounds.playHapticTap()
    },

    triggerSupercriticalVent(this: StoreApi): boolean {
      return this.triggerViralDrop()
    },

    // Kuantum Reaktörü: Süperkritik Boşalım! (Supercritical Venting)
    triggerViralDrop(this: StoreApi): boolean {
      if (!this.canTriggerViralDrop) return false

      let reward = this.matterPerSecond.gt(0)
        ? this.matterPerSecond.times(60)
        : this.manualClickPower.times(200)

      if (this.labMode === 'overdrive') {
        reward = reward.times(2.0)
      }
      reward = reward.times(this.achievementLabYield)

      this.addMatter(reward, true)
      this.stats.labHarvests = (this.stats.labHarvests || 0) + 3

      this.isViralActive = true
      this.viralTimeRemaining = 25
      this.viralViews = 65000
      this.labHype = 0
      // P1: bekleme damgası kurulur (totalPlaytime tabanlı, kalıcı sayaç).
      this.lastViralAt = this.stats.totalPlaytime || 0

      sounds.playViralDrop()
      safeConfetti({
        particleCount: 160,
        spread: 110,
        origin: { y: 0.55 },
        colors: ['#00d2ff', '#9d4edd', '#10b981', '#f59e0b', '#ffffff']
      })
      return true
    },

    // Meta-İlerleme: Reaktör Çöküşü & Kozmik Relikler (Reactor Collapse)
    collapseReactor(this: StoreApi): boolean {
      if (!this.canCollapseReactor) return false

      this.reactorCollapseCount = (this.reactorCollapseCount || 0) + 1
      this.stats.reactorCollapses = (this.stats.reactorCollapses || 0) + 1

      // Matrisi temizle
      this.labCells.forEach((c) => {
        c.seedType = null
        c.age = 0
        c.isMature = false
      })
      this.labHype = 0
      this.isViralActive = false
      this.viralTimeRemaining = 0
      // Formülleri sıfırla (sadece temel foton rezonatörü kalsın)
      this.discoveredFormulas = ['photon_resonator']

      if (typeof window !== 'undefined') {
        sounds.playSingularity()
        safeConfetti({
          particleCount: 200,
          spread: 140,
          origin: { y: 0.5 },
          colors: ['#00d2ff', '#9d4edd', '#f59e0b', '#ffffff']
        })
      }

      return true
    },

    // Crisis 3.0: Olay Ufku Reaktörü Meltdown Tetiklemesi
    triggerReactorMeltdown(this: StoreApi): void {
      this.reactorMeltdownTimer = 10
      this.reactorHeat = 100
      this.caffeineEnergy = 100
      this.reactorMomentum = 1.0 // Meltdown anında tüm birikmiş rezonans momenti buharlaşır
      sounds.playMeltdownWarning()
    },
}
