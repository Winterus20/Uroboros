import { describe, expect, it } from 'vitest'
import {
  COMBO_DECAY_MS,
  COMBO_THRESHOLDS,
  CPS_SYNC_BASE,
  CPS_SYNC_CAP,
  CPS_SYNC_PER_LEVEL,
  NEURAL_LEGACY_UPGRADE_IDS,
  NEURAL_TREE,
  SINGULARITY_UPGRADES,
  computeNeuralEffects
} from './neural-data'

describe('Nöral Veri & SP Dükkânı Tutarlılığı (H5)', () => {
  it('guilt_immunity: SINGULARITY_UPGRADES ve NEURAL_TREE maliyet/çarpan değerleri eşleşir', () => {
    const shopUpg = SINGULARITY_UPGRADES.find((u) => u.id === 'guilt_immunity')
    const treeNode = NEURAL_TREE.find((n) => n.id === 'guilt_immunity')

    expect(shopUpg).toBeDefined()
    expect(treeNode).toBeDefined()
    expect(shopUpg?.baseCost).toBe(4)
    expect(shopUpg?.costMult).toBe(2)
    expect(treeNode?.cost).toBe(4)
    expect(treeNode?.costMult).toBe(2)
  })

  it('caffeine_drip: açıklama gerçek formülle (%3) uyuşur', () => {
    const shopUpg = SINGULARITY_UPGRADES.find((u) => u.id === 'caffeine_drip')
    const treeNode = NEURAL_TREE.find((n) => n.id === 'caffeine_drip')

    expect(shopUpg?.desc).toContain('%3')
    expect(treeNode?.desc).toContain('%3')
    expect(shopUpg?.desc).not.toContain('%5')
    expect(treeNode?.desc).not.toContain('%5')
  })

  it('cps_sync: açıklama CPS_SYNC_BASE, CPS_SYNC_PER_LEVEL ve CPS_SYNC_CAP ile uyuşur', () => {
    const treeNode = NEURAL_TREE.find((n) => n.id === 'cps_sync')

    expect(CPS_SYNC_BASE).toBe(0.01)
    expect(CPS_SYNC_PER_LEVEL).toBe(0.01)
    expect(CPS_SYNC_CAP).toBe(0.05)
    expect(treeNode?.desc).toContain('+%1')
    expect(treeNode?.desc).toContain('taban %1, tavan %5')
  })

  it('eski dükkân id senkronu eksiksizdir', () => {
    for (const upg of SINGULARITY_UPGRADES) {
      expect(NEURAL_LEGACY_UPGRADE_IDS.has(upg.id)).toBe(true)
      const treeNode = NEURAL_TREE.find((n) => n.id === upg.id)
      expect(treeNode).toBeDefined()
    }
  })
})

describe('computeNeuralEffects (H3 & Mekanik)', () => {
  it('boş satın alım taban çarpanları döndürür', () => {
    const eff = computeNeuralEffects({})
    expect(eff.productionMult).toBe(1)
    expect(eff.clickMult).toBe(1)
    expect(eff.offlineGainBonus).toBe(0)
    expect(eff.crisisRewardMult).toBe(1)
    expect(eff.breedRateMult).toBe(1)
    expect(eff.botFrequencyMult).toBe(1)
    expect(eff.dawnSpeedMult).toBe(1)
    expect(eff.cpsSyncLevel).toBe(0)
    expect(eff.comboUnlocked).toBe(false)
  })

  it('productionMult 25 üstünde logaritmik yumuşak tavan (softcap) uygular', () => {
    // prod_echo (5 lvl = 1.25^5 ≈ 3.051), dream_lucid (1.75x), apex_doomscroll (10x)
    // ham: 3.0517578 * 1.75 * 10 ≈ 53.405
    // softcap: 25 + Math.log2(53.405 / 25) * 3 ≈ 25 + Math.log2(2.136) * 3 ≈ 25 + 3.28 = 28.28
    const eff = computeNeuralEffects({
      prod_echo: 5,
      dream_lucid: 1,
      apex_doomscroll: 1
    })

    const rawMult = Math.pow(1.25, 5) * 1.75 * 10
    expect(rawMult).toBeGreaterThan(25)
    const expected = 25 + Math.log2(rawMult / 25) * 3
    expect(eff.productionMult).toBeCloseTo(expected, 4)
    expect(eff.productionMult).toBeLessThan(rawMult)
  })

  it('productionMult 25 altında yumuşak tavansız tam çarpan verir', () => {
    const eff = computeNeuralEffects({
      prod_echo: 2 // 1.25^2 = 1.5625
    })
    expect(eff.productionMult).toBeCloseTo(1.5625, 4)
  })

  it('clickMult çarpanları doğru hesaplar', () => {
    const eff = computeNeuralEffects({
      click_momentum: 1, // 1.3x
      neural_symphony: 1, // 3.0x
      frenzy_thumb: 1 // 2x
    })
    expect(eff.clickMult).toBeCloseTo(1.3 * 3.0 * 2, 4)
  })

  it('cpsSyncLevel en fazla 4 ile sınırlandırılır', () => {
    expect(computeNeuralEffects({ cps_sync: 2 }).cpsSyncLevel).toBe(2)
    expect(computeNeuralEffects({ cps_sync: 4 }).cpsSyncLevel).toBe(4)
    expect(computeNeuralEffects({ cps_sync: 10 }).cpsSyncLevel).toBe(4)
  })

  it('combo_unlock bayrağını doğru okur', () => {
    expect(computeNeuralEffects({}).comboUnlocked).toBe(false)
    expect(computeNeuralEffects({ combo_unlock: 1 }).comboUnlocked).toBe(true)
    expect(COMBO_DECAY_MS).toBe(1500)
    expect(COMBO_THRESHOLDS.length).toBe(3)
  })
})
