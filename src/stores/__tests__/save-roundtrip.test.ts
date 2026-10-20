import { beforeEach, describe, expect, it } from 'vitest'
import { createFreshStore } from '../../test/helpers'
import { Decimal } from '../../core/math'
import { SaveSystem } from '../../core/save'
import { TIME_CLOCK_MAX_DRAG, TIME_CLOCK_SPAWN_INTERVAL_MIN } from '../../game/clock-data'
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

  describe('C4: timeClock (Zaman Yayı) Round-trip — v18', () => {
    it('keeps live drag in timeClock and lifetime counters in stats', () => {
      const store1 = createFreshStore()
      store1.timeClock = {
        phase: 'released',
        active: false,
        drag: 421.5,
        remainingTime: 0,
        speed: 9.25,
        speedRemaining: 31,
        speedDuration: 31,
        peakSpeed: 9.25
      }
      store1.clockTimer = 88
      store1.stats.clockRewinds = 17
      store1.stats.clockRewoundSeconds = 1234.5
      store1.stats.clockBestTension = 0.9123
      store1.stats.clockPerfectReleases = 4
      store1.stats.clockStreak = 3
      store1.stats.clockBestStreak = 7

      const serialized = store1.serialize()
      // timeClock yalnızca canlı yay durumunu taşır; canlı faz kayda girmez.
      expect(serialized.version).toBe(19)
      expect(serialized.timeClock).toEqual({ drag: 421.5 })
      // Yaşam boyu istatistikler `stats` bloğunda yazılır (prestijden sağ çıkar).
      expect(serialized.stats.clockRewinds).toBe(17)
      expect(serialized.stats.clockRewoundSeconds).toBe(1234.5)
      expect(serialized.stats.clockBestTension).toBeCloseTo(0.9123, 10)
      expect(serialized.stats.clockPerfectReleases).toBe(4)
      expect(serialized.stats.clockStreak).toBe(3)
      expect(serialized.stats.clockBestStreak).toBe(7)

      const store2 = createFreshStore()
      store2.deserialize(serialized)

      expect(store2.timeClock.drag).toBe(421.5)
      expect(store2.stats.clockRewinds).toBe(17)
      expect(store2.stats.clockRewoundSeconds).toBe(1234.5)
      expect(store2.stats.clockBestTension).toBeCloseTo(0.9123, 10)
      expect(store2.stats.clockPerfectReleases).toBe(4)
      expect(store2.stats.clockStreak).toBe(3)
      expect(store2.stats.clockBestStreak).toBe(7)
    })

    it('always loads the live phase back as idle (volatile, like floatingAnomalies)', () => {
      const store1 = createFreshStore()
      store1.timeClock = {
        phase: 'winding',
        active: true,
        drag: 300,
        remainingTime: 12,
        speed: 1,
        speedRemaining: 0,
        speedDuration: 0,
        peakSpeed: 1
      }
      store1.clockTimer = 240

      const store2 = createFreshStore()
      store2.deserialize(store1.serialize())

      expect(store2.timeClock.phase).toBe('idle')
      expect(store2.timeClock.active).toBe(false)
      expect(store2.timeClock.speed).toBe(1)
      expect(store2.timeClock.remainingTime).toBe(0)
      expect(store2.timeClock.speedRemaining).toBe(0)
      // Zamanlayıcı da baştan kurulur: yükleme anında saat doğurmaz.
      expect(store2.clockTimer).toBe(0)
      expect(store2.nextClockInterval).toBe(TIME_CLOCK_SPAWN_INTERVAL_MIN)
    })

    it('falls back to neutral values on a v17 save with no timeClock field', () => {
      const store1 = createFreshStore()
      store1.timeClock.drag = 999
      const serialized = store1.serialize()
      const legacy = { ...serialized } as Record<string, unknown>
      delete legacy.timeClock
      legacy.version = 17

      const store2 = createFreshStore()
      store2.deserialize(legacy as unknown as SerializedPlayerState)

      expect(store2.timeClock.phase).toBe('idle')
      expect(store2.timeClock.drag).toBe(0)
      expect(store2.clockTimer).toBe(0)
      expect(store2.nextClockInterval).toBe(TIME_CLOCK_SPAWN_INTERVAL_MIN)
    })

    it('clamps corrupted saved values instead of leaking them into the run', () => {
      const store1 = createFreshStore()
      const serialized = store1.serialize()
      const corrupted = {
        ...serialized,
        // drag tavanı TIME_CLOCK_MAX_DRAG; stats tarafında sayaçlar >= 0, gerginlik [0,1]
        timeClock: { drag: 1e9 },
        stats: { ...serialized.stats, clockRewinds: -3, clockRewoundSeconds: -50, clockBestTension: 5 }
      } as unknown as SerializedPlayerState

      const store2 = createFreshStore()
      store2.deserialize(corrupted)

      expect(store2.timeClock.drag).toBe(TIME_CLOCK_MAX_DRAG)
      expect(store2.stats.clockRewinds).toBe(0)
      expect(store2.stats.clockRewoundSeconds).toBe(0)
      expect(store2.stats.clockBestTension).toBe(1)
    })
  })
})
