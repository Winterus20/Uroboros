import { beforeEach, describe, expect, it } from 'vitest'
import { SaveSystem } from '../save'
import { resolveBackupKey, resolveSlotKey } from '../save/slots'
import { SAVE_VERSION } from '../save-version'
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

function makeMockState(overrides: Partial<SerializedPlayerState> = {}): SerializedPlayerState {
  return {
    version: SAVE_VERSION,
    matter: '1e50',
    dimensions: [
      { amount: '10', bought: 5 },
      { amount: '0', bought: 0 }
    ],
    tickspeedBought: 10,
    dimensionShifts: 2,
    galaxies: 1,
    singularityPoints: '500',
    singularities: 3,
    currentStance: 'trend',
    activeBuffs: [],
    slackers: [],
    lastUpdate: Date.now(),
    settings: {
      notation: 'scientific',
      decimalPlaces: 2,
      soundEnabled: true,
      soundVolume: 0.5,
      theme: 'cyberpunk',
      musicEnabled: false,
      musicVolume: 0.5,
      musicTrack: 'lofi_chill',
      vinylCrackle: false,
      rainEnabled: false,
      rainLevel: 0,
      musicIntensity: 1,
      sleepTimerMinutes: 0,
      confirmDialogs: true,
      reduceAnimations: false,
      crtEffect: false,
      juiceMode: 'balanced',
      screenOverlayEffects: false,
      holoCardsEnabled: false,
      swirlShaderQuality: 'balanced',
      sequentialStrike: false,
      batterySaver: false,
      floatingTexts: true,
      newsTickerEnabled: true,
      offlineProgressModal: true,
      hotkeysEnabled: true,
      activeSlot: 1
    },
    stats: {
      manualClicks: 100,
      totalMatterProduced: '1e52',
      highestMatter: '1e50',
      totalPlaytime: 1200,
      singularityCount: 3,
      fastestSingularity: 300,
      anomaliesClicked: 5,
      combosTriggered: 2,
      slackersFired: 1
    },
    ...overrides
  }
}

describe('SaveSystem — Core & Persistence Tests', () => {
  beforeEach(() => {
    SaveSystem.hardReset()
  })

  describe('C2: Corrupted Main Save Recovery', () => {
    it('corrupted main save recovers from _BAK instead of wiping it', () => {
      const slot = 1
      const validState = makeMockState({ matter: '9.99e99', singularityPoints: '1234' })

      // 1. Write valid backup directly to slot's backup key
      const exportedValid = SaveSystem.exportSave(validState)
      localStorage.setItem(resolveBackupKey(slot), exportedValid)

      // 2. Put corrupted, unparseable junk in the main slot key
      localStorage.setItem(resolveSlotKey(slot), '{ corrupt: json string !!!')

      // 3. Load detailed for slot
      const result = SaveSystem.loadDetailed(slot)

      // 4. Assert: should recover from backup, not wipe it!
      expect(result.state).not.toBeNull()
      expect(result.fromBackup).toBe(true)
      expect(result.corrupted).toBe(true)
      expect(result.state?.matter).toBe('9.99e99')
      expect(result.state?.singularityPoints).toBe('1234')

      // Verify backup key is still preserved in localStorage
      expect(localStorage.getItem(resolveBackupKey(slot))).toBe(exportedValid)
    })

    it('quarantines corrupted main save and reports quarantined: true', () => {
      const slot = 2
      const validState = makeMockState({ matter: '5e20' })
      localStorage.setItem(resolveBackupKey(slot), SaveSystem.exportSave(validState))
      localStorage.setItem(resolveSlotKey(slot), '###NON_JSON_CORRUPTED_DATA###')

      const result = SaveSystem.loadDetailed(slot)
      expect(result.fromBackup).toBe(true)
      expect(result.quarantined).toBe(true)
      expect(SaveSystem.hasQuarantinedSave(slot)).toBe(true)
    })
  })

  describe('H8: SaveSystem.hardReset() Complete Cleanup', () => {
    it('cleans uroboros-stance-seen, DOOMSCROLL_MOCK_AUTH_USER, and all mock cloud & rev keys', () => {
      localStorage.setItem('uroboros-stance-seen', '1')
      localStorage.setItem('DOOMSCROLL_MOCK_AUTH_USER', '{"uid":"test-user"}')
      localStorage.setItem('DOOMSCROLL_MOCK_CLOUD_SAVE_user123_slot_1', '{"data":"mock"}')
      localStorage.setItem('DOOMSCROLL_MOCK_CLOUD_SAVE_custom_4', '{"data":"mock4"}')
      localStorage.setItem('DOOMSCROLL_CLOUD_REV_SLOT_1', '100')
      localStorage.setItem('DOOMSCROLL_CLOUD_REV_SLOT_2', '200')
      localStorage.setItem('DOOMSCROLL_CLOUD_REV_CUSTOM', '999')

      SaveSystem.hardReset()

      expect(localStorage.getItem('uroboros-stance-seen')).toBeNull()
      expect(localStorage.getItem('DOOMSCROLL_MOCK_AUTH_USER')).toBeNull()
      expect(localStorage.getItem('DOOMSCROLL_MOCK_CLOUD_SAVE_user123_slot_1')).toBeNull()
      expect(localStorage.getItem('DOOMSCROLL_MOCK_CLOUD_SAVE_custom_4')).toBeNull()
      expect(localStorage.getItem('DOOMSCROLL_CLOUD_REV_SLOT_1')).toBeNull()
      expect(localStorage.getItem('DOOMSCROLL_CLOUD_REV_SLOT_2')).toBeNull()
      expect(localStorage.getItem('DOOMSCROLL_CLOUD_REV_CUSTOM')).toBeNull()
    })
  })
})
