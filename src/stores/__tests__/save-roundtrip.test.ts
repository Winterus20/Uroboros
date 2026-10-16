import { beforeEach, describe, expect, it } from 'vitest'
import { createFreshStore } from '../../test/helpers'
import { Decimal } from '../../core/math'
import { SaveSystem } from '../../core/save'
import type { SerializedPlayerState } from '../../models/types'

class LocalStorageMock implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = new LocalStorageMock()
}

describe('Save Roundtrip & Slot Isolation Tests', () => {
  beforeEach(() => {
    SaveSystem.hardReset()
  })

  describe('C1: singularityPoints Deserialization', () => {
    it('singularityPoints round-trips correctly through serialize() and deserialize()', () => {
      const store1 = createFreshStore()
      store1.singularityPoints = new Decimal('1.2345e67')
      store1.singularities = 42

      const serialized = store1.serialize()
      expect(serialized.singularityPoints).toBe(new Decimal('1.2345e67').toString())
      expect(serialized.singularities).toBe(42)

      const store2 = createFreshStore()
      expect(store2.singularityPoints.eq(0)).toBe(true)

      store2.deserialize(serialized)

      expect(store2.singularityPoints.eq(new Decimal('1.2345e67'))).toBe(true)
      expect(store2.singularities).toBe(42)
    })

    it('handles missing singularityPoints gracefully with safe Decimal fallback of 0', () => {
      const store = createFreshStore()
      const serialized = store.serialize()
      const dataWithoutSp = { ...serialized } as Record<string, unknown>
      delete dataWithoutSp.singularityPoints

      const store2 = createFreshStore()
      store2.deserialize(dataWithoutSp as unknown as SerializedPlayerState)
      expect(store2.singularityPoints.eq(0)).toBe(true)
    })
  })

  describe('H1: activeBuffs Multiplier & Duration Preservation', () => {
    it('preserves exact multipliers, durations, and names for 777x heart_frenzy and 2x espresso', () => {
      const store1 = createFreshStore()
      store1.activeBuffs = [
        {
          id: 'buff-heart_frenzy-test',
          type: 'heart_frenzy',
          name: '🌌 Kütle Patlaması (777× Çekim)',
          duration: 15,
          remaining: 12,
          multiplier: 777
        },
        {
          id: 'buff-espresso-test',
          type: 'espresso',
          name: '☕ Çift Espresso (2× Frekans)',
          duration: 25,
          remaining: 18,
          multiplier: 2
        }
      ]

      const serialized = store1.serialize()
      expect(serialized.activeBuffs).toBeDefined()
      expect(serialized.activeBuffs?.length).toBe(2)

      const frenzySaved = serialized.activeBuffs?.find((b) => b.type === 'heart_frenzy')
      expect(frenzySaved?.multiplier).toBe(777)
      expect(frenzySaved?.duration).toBe(15)
      expect(frenzySaved?.remaining).toBe(12)
      expect(frenzySaved?.name).toBe('🌌 Kütle Patlaması (777× Çekim)')

      const espressoSaved = serialized.activeBuffs?.find((b) => b.type === 'espresso')
      expect(espressoSaved?.multiplier).toBe(2)
      expect(espressoSaved?.duration).toBe(25)
      expect(espressoSaved?.remaining).toBe(18)
      expect(espressoSaved?.name).toBe('☕ Çift Espresso (2× Frekans)')

      const store2 = createFreshStore()
      store2.deserialize(serialized)

      expect(store2.activeBuffs.length).toBe(2)
      const frenzyLoaded = store2.activeBuffs.find((b) => b.type === 'heart_frenzy')
      expect(frenzyLoaded).toBeDefined()
      expect(frenzyLoaded?.multiplier).toBe(777)
      expect(frenzyLoaded?.duration).toBe(15)
      expect(frenzyLoaded?.remaining).toBe(12)
      expect(frenzyLoaded?.name).toBe('🌌 Kütle Patlaması (777× Çekim)')

      const espressoLoaded = store2.activeBuffs.find((b) => b.type === 'espresso')
      expect(espressoLoaded).toBeDefined()
      expect(espressoLoaded?.multiplier).toBe(2)
      expect(espressoLoaded?.duration).toBe(25)
      expect(espressoLoaded?.remaining).toBe(18)
      expect(espressoLoaded?.name).toBe('☕ Çift Espresso (2× Frekans)')
    })

    it('falls back to default 777x multiplier and name for heart_frenzy when loading legacy save without multiplier', () => {
      const store = createFreshStore()
      const serialized = store.serialize()
      serialized.activeBuffs = [
        {
          type: 'heart_frenzy',
          remaining: 10
        }
      ]

      const store2 = createFreshStore()
      store2.deserialize(serialized)

      const buff = store2.activeBuffs.find((b) => b.type === 'heart_frenzy')
      expect(buff).toBeDefined()
      expect(buff?.multiplier).toBe(777)
      expect(buff?.duration).toBe(15)
      expect(buff?.remaining).toBe(10)
      expect(buff?.name).toBe('🌌 Kütle Patlaması (777× Çekim)')
    })
  })

  describe('C3: switchSaveSlot & State Leakage Prevention', () => {
    it('switches between populated slots without leaking singularityUpgrades or singularityPoints', () => {
      const store = createFreshStore()
      store.settings.activeSlot = 1
      store.singularityPoints = new Decimal('999999')
      // Valid upgrade ids from SINGULARITY_UPGRADES: e.g. insomnia_boost, offline_flow
      store.singularityUpgrades = {
        eye_drops: 3,
        fast_charger: 2
      }

      // Slot 1 save
      SaveSystem.save(store.serialize(), 1)

      // Create Slot 2 save with different SP and upgrades
      const slot2State: SerializedPlayerState = {
        ...store.serialize(),
        singularityPoints: '10',
        singularityUpgrades: {
          caffeine_drip: 1
        }
      }
      SaveSystem.save(slot2State, 2)

      // Switch to slot 2
      store.switchSaveSlot(2)

      // Verify slot 2 is active and clean
      expect(store.settings.activeSlot).toBe(2)
      expect(store.singularityPoints.eq(10)).toBe(true)
      expect(store.singularityUpgrades['eye_drops']).toBeUndefined()
      expect(store.singularityUpgrades['fast_charger']).toBeUndefined()
      expect(store.singularityUpgrades['caffeine_drip']).toBe(1)

      // Switch back to slot 1
      store.switchSaveSlot(1)

      // Verify slot 1 restored its own values
      expect(store.settings.activeSlot).toBe(1)
      expect(store.singularityPoints.eq(999999)).toBe(true)
      expect(store.singularityUpgrades['eye_drops']).toBe(3)
      expect(store.singularityUpgrades['fast_charger']).toBe(2)
      expect(store.singularityUpgrades['caffeine_drip']).toBeUndefined()
    })

    it('resets transient runtime state at the end of deserialize()', () => {
      const store = createFreshStore()
      store.floatingAnomalies = [
        {
          id: 'test-anomaly',
          type: 'fyp',
          x: 50,
          y: 50,
          remainingTime: 10,
          totalTime: 15,
          title: 'Test',
          desc: 'Test'
        }
      ]
      store.crisisBackfireDebuff = 45

      const serialized = store.serialize()
      store.deserialize(serialized)

      expect(store.floatingAnomalies).toEqual([])
      expect(store.activeCrisisDilemma).toBeNull()
      expect(store.crisisBackfireDebuff).toBe(0)
    })
  })
})
