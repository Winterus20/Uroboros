import { describe, expect, it } from 'vitest'
import { D_0, D_1, Decimal } from '../core/math'
import {
  JUMP_LOG_CAP,
  SCALE_LAYERS,
  SCALE_LAYER_ORDER,
  applyResetScope,
  recordJump,
  type ScaleJumpHost
} from './layers'
import type { NeuralNode } from '../models/types'

/**
 * ADR-0052 — Ölçek Sıçrama Motoru (saf çekirdek) testleri.
 * Pinia yok: sahte port + sahte nöral ağaçla kapsam ve günlük doğrulanır.
 */

function makeHost(): ScaleJumpHost {
  return {
    startingMatter: new Decimal(10),
    matter: new Decimal('1e50'),
    dimensions: Array.from({ length: 8 }, () => ({ amount: new Decimal(5), bought: 12 })),
    tickspeedBought: 9,
    dimensionShifts: 4,
    galaxies: 2,
    slackers: [{ name: 'x' }],
    sacrificeCount: 1,
    sacrificeMultiplier: new Decimal(3),
    activeBuffs: [{ type: 'x', remaining: 5 }],
    floatingAnomalies: [{ a: 1 }],
    anomalyTimer: 7,
    crisisBackfireDebuff: 1,
    isViralActive: true,
    viralTimeRemaining: 11,
    viralViews: 3,
    decadeSurgeMult: 2.5,
    timeClock: {
      phase: 'released',
      active: false,
      drag: 321,
      remainingTime: 0,
      speed: 7.5,
      speedRemaining: 12,
      peakSpeed: 7.5
    },
    clockTimer: 42,
    neuralNodesBought: { choice_a: 2, plain_b: 1 },
    singularityPoints: new Decimal(5),
    singularityBotSamples: [1, 2],
    singularityDecelStreak: 2,
    singularityRunSeconds: 100,
    singularitySampleAcc: 4,
    jumpLog: []
  }
}

const FAKE_TREE = [
  { id: 'choice_a', choiceGroup: 'g1', cost: 7 },
  { id: 'plain_b', cost: 3 }
] as unknown as NeuralNode[]

describe('ADR-0052 katman kayıt defteri', () => {
  it('üç katman sıralı ve eksiksizdir (shift 0, galaxy 1, singularity 2)', () => {
    expect(SCALE_LAYER_ORDER).toEqual(['shift', 'galaxy', 'singularity'])
    expect(SCALE_LAYERS.shift.order).toBe(0)
    expect(SCALE_LAYERS.galaxy.order).toBe(1)
    expect(SCALE_LAYERS.singularity.order).toBe(2)
    for (const id of SCALE_LAYER_ORDER) {
      expect(SCALE_LAYERS[id].scope).toBeDefined()
      expect(SCALE_LAYERS[id].fx).toBeDefined()
    }
  })

  it('kapsam derinliği monoton artar: shift ⊂ galaxy ⊂ singularity', () => {
    expect(SCALE_LAYERS.shift.scope.zeroCounters).toEqual([])
    expect(SCALE_LAYERS.galaxy.scope.zeroCounters).toEqual(['dimensionShifts'])
    expect(SCALE_LAYERS.singularity.scope.zeroCounters).toEqual(['dimensionShifts', 'galaxies'])
    expect(SCALE_LAYERS.shift.scope.clearPrestigeEphemerals).toBe(false)
    expect(SCALE_LAYERS.singularity.scope.clearPrestigeEphemerals).toBe(true)
    expect(SCALE_LAYERS.shift.scope.clearRunFx).toBe(false)
    expect(SCALE_LAYERS.singularity.scope.clearRunFx).toBe(true)
  })
})

describe('ADR-0052 applyResetScope', () => {
  it('shift: koşuyu sıfırlar, sayaçları ve kalıcıları korur', () => {
    const host = makeHost()
    applyResetScope(host, SCALE_LAYERS.shift.scope, FAKE_TREE)

    expect(host.matter.eq(host.startingMatter)).toBe(true)
    expect(host.dimensions.every((d) => d.amount.eq(0) && d.bought === 0)).toBe(true)
    expect(host.tickspeedBought).toBe(0)
    expect(host.singularityRunSeconds).toBe(0)
    expect(host.singularityBotSamples).toEqual([])

    expect(host.dimensionShifts).toBe(4)
    expect(host.galaxies).toBe(2)
    expect(host.slackers.length).toBe(1)
    expect(host.activeBuffs.length).toBe(1)
    expect(host.decadeSurgeMult).toBe(2.5)
    expect(host.neuralNodesBought).toEqual({ choice_a: 2, plain_b: 1 })
    expect(host.singularityPoints.eq(5)).toBe(true)
    // Zaman Yayı koşu-içi canlı durumdur; shift sıfırlaması koşuyu bitirir ama
    // clearRunFx false olduğu için saate dokunulmaz (bkz. kapsam bayrakları).
    expect(SCALE_LAYERS.shift.scope.clearRunFx).toBe(false)
    expect(host.timeClock.phase).toBe('released')
    expect(host.timeClock.drag).toBe(321)
    expect(host.clockTimer).toBe(42)
  })

  it('galaxy: shift sayacını sıfırlar, galaksiyi korur', () => {
    const host = makeHost()
    applyResetScope(host, SCALE_LAYERS.galaxy.scope, FAKE_TREE)

    expect(host.dimensionShifts).toBe(0)
    expect(host.galaxies).toBe(2)
    expect(host.matter.eq(host.startingMatter)).toBe(true)
    expect(host.slackers.length).toBe(1)
    // galaxy de clearRunFx: false → saat canlı kalır
    expect(SCALE_LAYERS.galaxy.scope.clearRunFx).toBe(false)
    expect(host.timeClock.phase).toBe('released')
    expect(host.clockTimer).toBe(42)
  })

  it('singularity: tam sıfırlama + hariç-seçim SP iadesi', () => {
    const host = makeHost()
    applyResetScope(host, SCALE_LAYERS.singularity.scope, FAKE_TREE)

    expect(host.dimensionShifts).toBe(0)
    expect(host.galaxies).toBe(0)
    expect(host.slackers).toEqual([])
    expect(host.sacrificeCount).toBe(0)
    expect(host.sacrificeMultiplier.eq(D_1)).toBe(true)
    expect(host.activeBuffs).toEqual([])
    expect(host.isViralActive).toBe(false)
    expect(host.decadeSurgeMult).toBe(1)
    // choice_a (2 lvl × 7 maliyet) iade edilir: 5 + 14 = 19
    expect(host.neuralNodesBought).toEqual({ plain_b: 1 })
    expect(host.singularityPoints.eq(19)).toBe(true)
  })

  it('singularity: clearRunFx ile Zaman Yayı idle duruma döner ve zamanlayıcı sıfırlanır', () => {
    const host = makeHost()
    expect(host.timeClock.phase).toBe('released')

    applyResetScope(host, SCALE_LAYERS.singularity.scope, FAKE_TREE)

    expect(SCALE_LAYERS.singularity.scope.clearRunFx).toBe(true)
    expect(host.timeClock.phase).toBe('idle')
    expect(host.timeClock.active).toBe(false)
    expect(host.timeClock.drag).toBe(0)
    expect(host.timeClock.remainingTime).toBe(0)
    expect(host.timeClock.speed).toBe(1)
    expect(host.timeClock.speedRemaining).toBe(0)
    expect(host.clockTimer).toBe(0)
  })

  it('singularity: ach_26 %5 indirim ile alınan seçim düğümlerinde tam harcanan SP iade edilir (exploit önleme)', () => {
    // 1) spCostDiscount parametresi üzerinden (0.95 indirim)
    // choice_a (cost: 7, 2 lvl): lvl 0 -> floor(7 * 0.95) = 6, lvl 1 -> floor(7 * 0.95) = 6 => toplam 12 SP
    const host1 = makeHost()
    applyResetScope(host1, SCALE_LAYERS.singularity.scope, FAKE_TREE, 0.95)
    expect(host1.singularityPoints.eq(5 + 12)).toBe(true)

    // 2) host.achievementSpDiscount üzerinden
    const host2: ScaleJumpHost & { achievementSpDiscount?: number } = makeHost()
    host2.achievementSpDiscount = 0.95
    applyResetScope(host2, SCALE_LAYERS.singularity.scope, FAKE_TREE)
    expect(host2.singularityPoints.eq(5 + 12)).toBe(true)
  })
})

describe('ADR-0052 recordJump', () => {
  it('kayıtlar başa eklenir, id artar, kapak uygulanır', () => {
    const host = makeHost()
    const snapshot = {
      runSeconds: 100,
      peakLogMatter: 50,
      shifts: 4,
      galaxies: 2,
      singularities: 0,
      spGained: D_0
    }
    const first = recordJump(host, 'shift', snapshot, 1000)
    const second = recordJump(host, 'galaxy', snapshot, 2000)

    expect(first.id).toBe(1)
    expect(second.id).toBe(2)
    expect(host.jumpLog[0].layer).toBe('galaxy')
    expect(host.jumpLog[1].timestamp).toBe(1000)

    for (let i = 0; i < JUMP_LOG_CAP + 5; i++) {
      recordJump(host, 'shift', snapshot, 3000 + i)
    }
    expect(host.jumpLog.length).toBe(JUMP_LOG_CAP)
    expect(host.jumpLog[0].id).toBe(JUMP_LOG_CAP + 7)
  })
})
