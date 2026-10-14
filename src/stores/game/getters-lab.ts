// Lab + reaktor getter parcalari. `this`, StoreApi ile tiplenmistir.
import { D_0, D_1, Decimal } from '../../core/math'
import { EXOTIC_LONE_PENALTY_DIVISOR, EXOTIC_LONE_PENALTY_SEEDS, LAB_CENTER_CLICK_BONUS, LAB_RECIPES, LAB_SEEDS, VIRAL_DROP_COOLDOWN_SECONDS, hasMatureParentSupport, labEffectiveSeedCost, labExoticParents, labNeighborCells } from '../../game/lab-data'
import type { LabCell, LabSeedType, ReactorPhase } from '../../models/types'
import type { GameState } from './state'
import type { StoreApi } from './store-api'

export const labGetters = {
    // Kilit Açılma Durumları (Sekmeler için — merdivene bağlı)
    labUnlocked(this: StoreApi): boolean {
      return this.isFeatureUnlocked('lab')
    },

    // Crisis 2.0: Olay Ufku Kararsızlık Reaktörü Getter'ları
    reactorPhase(this: StoreApi, state: GameState): ReactorPhase {
      if (state.reactorMeltdownTimer > 0) return 'meltdown'
      if (state.reactorHeat <= 30) return 'dormant'
      if (state.reactorHeat <= 60) return 'resonance'
      if (state.reactorHeat < 100) return 'sweet_spot'
      return 'meltdown'
    },

    reactorMassMult(this: StoreApi): number {
      const phase = this.reactorPhase
      if (phase === 'sweet_spot') return 8.0 * (this.reactorMomentum || 1.0)
      if (phase === 'meltdown') return 0.5
      return 1.0
    },

    reactorTickRateMult(this: StoreApi): number {
      const phase = this.reactorPhase
      if (phase === 'resonance' || phase === 'sweet_spot') return 1.5
      return 1.0
    },

    reactorAnomalyRateMult(this: StoreApi): number {
      const phase = this.reactorPhase
      if (phase === 'sweet_spot') return 2.0
      if (phase === 'resonance') return 1.3
      return 1.0
    },

    // Kuantum Sentez Reaktörü: Akı Matrisi Pasif Çarpanı (Sinerjiler, Merkez Çekirdek, Satır/Sütun ve Rejimler)
    labPassiveMultiplier(this: StoreApi, state: GameState): Decimal {
      let mult = D_1
      const isHeavy = (t: LabSeedType | null) => t === 'heavy_nucleon' || t === 'dark_matter_core' || t === 'magnetic_shield'

      // Hücre bazlı temel çarpan ve komşuluk sinerjileri
      state.labCells.forEach((c, idx) => {
        if (!c.isMature || !c.seedType) return

        let cellBoost = 1.0
        if (c.seedType === 'photon_resonator') cellBoost = 1.20
        else if (c.seedType === 'heavy_nucleon') cellBoost = 1.35
        else if (c.seedType === 'dark_matter_core') cellBoost = 1.50
        else if (c.seedType === 'magnetic_shield') cellBoost = 1.40
        else if (c.seedType === 'higgs_boson') cellBoost = 3.00

        // Komşuları bul (3x3 grid)
        const row = Math.floor(idx / 3)
        const col = idx % 3
        const neighborCells: LabCell[] = []
        if (row > 0) neighborCells.push(state.labCells[idx - 3])
        if (row < 2) neighborCells.push(state.labCells[idx + 3])
        if (col > 0) neighborCells.push(state.labCells[idx - 1])
        if (col < 2) neighborCells.push(state.labCells[idx + 1])

        const matureNeighbors = neighborCells.filter((n) => n.isMature && n.seedType)

        // 1. Foton Komşuluğu: +%15 rezonans
        if (matureNeighbors.some((n) => n.seedType === 'photon_resonator')) {
          cellBoost *= 1.15
        }

        // 2. Graviton Komşuluğu: Gravitasyonel Şok (×1.25)
        if (matureNeighbors.some((n) => n.seedType === 'graviton_trap')) {
          cellBoost *= 1.25
        }

        // 3. Kararlı Nükleer Sinerji: İki kararlı parçacık (+%30)
        if (isHeavy(c.seedType) && matureNeighbors.some((n) => isHeavy(n.seedType))) {
          cellBoost *= 1.30
        }

        // 4. Merkez Odak Çekirdeği (Hücre 4): Kendisi 1.5×, komşularına +%20 yayar
        if (idx === 4) {
          cellBoost *= 1.50
        } else if (matureNeighbors.some((n) => n.id === 4)) {
          cellBoost *= 1.20
        }

        // 5. Egzotik tek-meta kırma: ebeveyn desteksiz egzotik yarı bonus
        if (EXOTIC_LONE_PENALTY_SEEDS.includes(c.seedType)) {
          const parents = labExoticParents(c.seedType)
          if (!hasMatureParentSupport(matureNeighbors, parents)) {
            cellBoost = 1 + (cellBoost - 1) / EXOTIC_LONE_PENALTY_DIVISOR
          }
        }

        mult = mult.times(cellBoost)
      })

      // Satır Uyumları (Satır 0, 1, 2)
      for (let r = 0; r < 3; r++) {
        const rowCells = [state.labCells[r * 3], state.labCells[r * 3 + 1], state.labCells[r * 3 + 2]]
        if (rowCells.every((c) => c.isMature && c.seedType !== null)) {
          mult = mult.times(1.12)
          // Mono-izotop uyumu (3'ü de aynı)
          if (rowCells[0].seedType === rowCells[1].seedType && rowCells[1].seedType === rowCells[2].seedType) {
            mult = mult.times(1.2)
          }
        }
      }

      // Sütun Uyumları (Sütun 0, 1, 2)
      for (let cl = 0; cl < 3; cl++) {
        const colCells = [state.labCells[cl], state.labCells[cl + 3], state.labCells[cl + 6]]
        if (colCells.every((c) => c.isMature && c.seedType !== null)) {
          mult = mult.times(1.12)
        }
      }

      // Plazma Besleme Rejimi (Superconductor: Sabit 2.5× Pasif Kütle)
      if (state.labMode === 'superconductor') {
        mult = mult.times(2.5)
      }

      // Parçacık Atlası Keşif Bonusu (Her keşfedilen formül kalıcı +%3)
      const recipeResults = new Set(LAB_RECIPES.map((recipe) => recipe.result))
      const codexCount = (state.discoveredFormulas || []).filter((id) => recipeResults.has(id)).length
      mult = mult.times(1 + codexCount * 0.03)

      // Canlı Süperkritik Boşalım Dalgası
      if (state.isViralActive) {
        const matureCount = state.labCells.filter((c) => c.isMature && !!c.seedType).length
        const viralSurge = (5.0 + matureCount * 1.0) * (state.labMode === 'overdrive' ? 2.0 : 1.0)
        mult = mult.times(viralSurge)
      }

      return mult
    },

    // Kuantum Matrisi: Manuel Yutma Çarpanı (Gluon, Karanlık Madde, Takyon)
    labClickMultiplier(this: StoreApi, state: GameState): Decimal {
      let mult = D_1
      state.labCells.forEach((c, idx) => {
        if (!c.isMature || !c.seedType) return

        let cellFactor = 1
        if (c.seedType === 'gluon_binder') cellFactor = 2.0
        else if (c.seedType === 'dark_matter_core') cellFactor = 1.5
        else if (c.seedType === 'tachyon_flux') cellFactor = 2.0
        else return

        // Merkez hücre bonusu
        if (idx === 4) {
          cellFactor *= LAB_CENTER_CLICK_BONUS
        }

        // Egzotik tek-meta kırma: ebeveyn desteksiz egzotik yarı bonus
        if (EXOTIC_LONE_PENALTY_SEEDS.includes(c.seedType)) {
          const parents = labExoticParents(c.seedType)
          if (!hasMatureParentSupport(labNeighborCells(state.labCells, idx), parents)) {
            cellFactor = 1 + (cellFactor - 1) / EXOTIC_LONE_PENALTY_DIVISOR
          }
        }

        mult = mult.times(cellFactor)
      })

      if (state.isViralActive) {
        mult = mult.times(2.5)
      }

      return mult
    },

    // Kuantum Matrisi: Kozmik Dalgalanma / Kriz Sıklığı (Graviton, Takyon, Higgs)
    labAnomalyMultiplier(this: StoreApi, state: GameState): number {
      let bonus = 1.0
      state.labCells.forEach((c) => {
        if (c.isMature && c.seedType) {
          if (c.seedType === 'graviton_trap') bonus *= 1.5
          else if (c.seedType === 'tachyon_flux') bonus *= 1.3
          else if (c.seedType === 'higgs_boson') bonus *= 1.4
        }
      })

      if (state.isViralActive) {
        bonus *= 3.0
      }

      return bonus
    },

    // Reaktörün Süperkritik Boşalım Çarpanı
    labViralMultiplier(this: StoreApi, state: GameState): number {
      const matureCount = state.labCells.filter((c) => c.isMature && !!c.seedType).length
      return (5.0 + matureCount * 1.0) * (state.labMode === 'overdrive' ? 2.0 : 1.0)
    },

    // P1: Boşalım bekleme sayacı (sn). Kurcalanmış gelecek damgaya karşı tavanlıdır.
    viralCooldownRemaining(this: StoreApi, state: GameState): number {
      const last = typeof state.lastViralAt === 'number' && Number.isFinite(state.lastViralAt)
        ? state.lastViralAt
        : -VIRAL_DROP_COOLDOWN_SECONDS
      const played = state.stats.totalPlaytime || 0
      const remaining = VIRAL_DROP_COOLDOWN_SECONDS - (played - last)
      return Math.max(0, Math.min(VIRAL_DROP_COOLDOWN_SECONDS, remaining))
    },

    // P1: Boşalım butonu etkinliği — LabTab bu getter'a bağlanır.
    canTriggerViralDrop(this: StoreApi): boolean {
      return this.labHype >= 100 && !this.isViralActive && this.viralCooldownRemaining <= 0
    },

    // P1: Tohumun tepe-noktaya göre efektif maliyeti (LabTab fiyat gösterimi için).
    labSeedEffectiveCost(this: StoreApi, state: GameState): (seedType: LabSeedType) => Decimal {
      return (seedType: LabSeedType): Decimal => {
        const seedDef = LAB_SEEDS.find((s) => s.type === seedType)
        if (!seedDef) return D_0
        return labEffectiveSeedCost(seedDef.cost, state.lifetimePeakMatter)
      }
    },

    // Parçacık Atlası Keşif Yüzdesi / Global Çarpanı
    labCodexDiscoveredCount(this: StoreApi, state: GameState): number {
      const recipeResults = new Set(LAB_RECIPES.map((recipe) => recipe.result))
      return (state.discoveredFormulas || []).filter((id) => recipeResults.has(id)).length
    },

    labCodexBonusPercent(this: StoreApi): number {
      return this.labCodexDiscoveredCount * 3
    },

    // Kozmik Relik ve Reaktör Çöküşü Getters
    canCollapseReactor(this: StoreApi, state: GameState): boolean {
      const exoticFormulas: LabSeedType[] = ['dark_matter_core', 'magnetic_shield', 'tachyon_flux', 'higgs_boson']
      return exoticFormulas.every((formula) => state.discoveredFormulas.includes(formula))
    },

    reactorRelicBonuses(this: StoreApi, state: GameState): {
      tickspeedBase: number
      crisisDuration: number
      spGainMult: number
      dimensionalBoostPerCell: number
      universalMassMult: Decimal
    } {
      const count = state.reactorCollapseCount || 0
      return {
        // Seviye 1: Çekim Hızı (Hz) tabanına kalıcı bonus
        tickspeedBase: count >= 1 ? Math.min(0.15, count * 0.03) : 0,
        // Seviye 2: Kozmik Kriz etki sürelerine kalıcı bonus (saniye)
        crisisDuration: count >= 2 ? (count - 1) * 5 : 0,
        // Seviye 3: Tekillik Çöküşü (Big Crunch) SP kazancına kalıcı çarpan
        spGainMult: count >= 3 ? 1 + (count - 2) * 0.5 : 1,
        // Seviye 4: Rezonanstaki hücre başına boyutlara evrensel ivme
        dimensionalBoostPerCell: count >= 4 ? 0.10 + (count - 4) * 0.05 : 0,
        // Seviye 5+: Ölçeklenen evrensel kütle relik çarpanı (soft cap: 8 güçten sonra
        // logaritmik azalan getiri; per-tier zincir patlamasını engeller)
        universalMassMult: count >= 5
          ? Decimal.pow(2, count - 4 <= 4
              ? count - 4
              : 4 + Math.log2(Math.max(1, count - 7)))
          : D_1
      }
    },
}
