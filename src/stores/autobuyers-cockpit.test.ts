import { describe, it, expect } from 'vitest'
import { useGameStore } from './game'
import { Decimal } from '../core/math'
import type { SerializedPlayerState } from '../models/types'

describe('Autobuyers Hybrid Lifecycle & Cosmic Cockpit', () => {
  it('Faz 0: Başlangıçta tüm botlar kilitli ve single moddadır', () => {
    const store = useGameStore()
    expect(store.singularities).toBe(0)
    expect(store.isAutobuyerCockpitMode).toBe(false)
    expect(store.isCockpitMode).toBe(false)
    expect(store.autobuyers.dim1.unlocked).toBe(false)
    expect(store.autobuyerBulkUnlocked).toBe(false)
    expect(store.autobuyerMaxUnlocked).toBe(false)
  })

  it('Faz 0: Yeterli kütle ve şart sağlandığında bot satın alınabilir', () => {
    const store = useGameStore()
    store.matter = new Decimal(1e9)
    const success = store.unlockAutobuyer('dim1')
    expect(success).toBe(true)
    expect(store.autobuyers.dim1.unlocked).toBe(true)
    expect(store.autobuyers.dim1.enabled).toBe(true)
    expect(store.autobuyers.dim1.mode).toBe('single')
  })

  it('Prestij Sonrası (singularities >= 1): isAutobuyerCockpitMode true olur ve temel botlar kalıcı açılır', () => {
    const store = useGameStore()
    store.singularities = 1
    store.resetRunState()

    expect(store.isAutobuyerCockpitMode).toBe(true)
    expect(store.isCockpitMode).toBe(true)
    expect(store.autobuyerBulkUnlocked).toBe(true)
    expect(store.autobuyerMaxUnlocked).toBe(true)
    expect(store.autobuyers.dim1.unlocked).toBe(true)
    expect(store.autobuyers.dim8.unlocked).toBe(true)
    expect(store.autobuyers.tickspeed.unlocked).toBe(true)
    expect(store.autobuyers.shift.unlocked).toBe(true)
    expect(store.autobuyers.galaxy.unlocked).toBe(true)
  })

  it('Prestij Sonrası: resetRunState botların enabled veya mod ayarlarını sıfırlamaz', () => {
    const store = useGameStore()
    store.singularities = 2
    store.resetRunState()

    // Kullanıcı tercihi: D1 maks mod ve kapalı
    store.autobuyers.dim1.mode = 'max'
    store.autobuyers.dim1.enabled = false

    // Yeni bir koşu sıfırlaması yaşanır (örneğin challenge girişi veya yeni çöküş)
    store.resetRunState()

    expect(store.autobuyers.dim1.unlocked).toBe(true)
    expect(store.autobuyers.dim1.mode).toBe('max')
    expect(store.autobuyers.dim1.enabled).toBe(false)
  })

  it('Hızlı Filo Kontrolü: setAllAutobuyerModes tek hamlede tüm filoyu günceller', () => {
    const store = useGameStore()
    store.singularities = 1
    store.resetRunState()

    store.setAllAutobuyerModes('max')
    expect(store.autobuyers.dim1.mode).toBe('max')
    expect(store.autobuyers.dim8.mode).toBe('max')
    expect(store.autobuyers.tickspeed.mode).toBe('max')
    expect(store.autobuyers.shift.mode).toBe('max')

    store.setAllAutobuyerModes('single')
    expect(store.autobuyers.dim1.mode).toBe('single')
    expect(store.autobuyers.tickspeed.mode).toBe('single')
  })

  it('Şafak Nöbeti Botu: 3. Tekillikten sonra kalıcı açılır', () => {
    const store = useGameStore()
    store.singularities = 2
    store.resetRunState()
    expect(store.autobuyers.singularity.unlocked).toBe(false)

    store.singularities = 3
    store.resetRunState()
    expect(store.autobuyers.singularity.unlocked).toBe(true)
  })

  it('Deserialize Garantisi: Prestijli kayıt yüklendiğinde kokpit onarılır (v17)', () => {
    const store = useGameStore()
    const mockSave: Partial<SerializedPlayerState> = {
      version: 17,
      singularities: 5,
      matter: '100',
      autobuyers: {
        dim1: { enabled: true, unlocked: false, mode: 'single' }
      }
    }
    store.deserialize(mockSave as unknown as SerializedPlayerState)
    expect(store.isAutobuyerCockpitMode).toBe(true)
    expect(store.autobuyers.dim1.unlocked).toBe(true)
    expect(store.autobuyers.dim8.unlocked).toBe(true)
    expect(store.autobuyerMaxUnlocked).toBe(true)
  })

  it('Sessizlik Garantisi: Bot alımlarında (playSound=false) ses veya surge olayları yayılmaz', () => {
    const store = useGameStore()
    store.matter = new Decimal(1e12)
    store.dimensionShifts = 4

    const eventsDispatched: string[] = []
    const dispatchMock = (e: { type: string }) => {
      eventsDispatched.push(e.type)
      return true
    }

    const g = globalThis as Record<string, unknown>
    const originalWindow = g.window
    const originalCustomEvent = g.CustomEvent
    g.window = {
      innerWidth: 1000,
      innerHeight: 800,
      dispatchEvent: dispatchMock
    }
    g.CustomEvent = class<T = unknown> {
      type: string
      detail: T | undefined
      constructor(type: string, params?: { detail?: T }) {
        this.type = type
        this.detail = params?.detail
      }
    }

    try {
      // 1. Boyut bot alımları (playSound=false)
      store.buyDimension(1, false)
      store.buyOneUnit(1, false)
      store.buyMaxDimension(1, false, false)
      expect(eventsDispatched).not.toContain('doomscroll:production-bump')

      // 2. Tickspeed bot alımları (playSound=false)
      store.buyTickspeed(false)
      store.buyMaxTickspeed(false, false)
      expect(eventsDispatched).not.toContain('doomscroll:production-bump')

      // 3. Galaxy bot alımı (playSound=false)
      store.galaxies = 0
      store.dimensions[3].amount = new Decimal(100)
      store.buyGalaxy(false)
      expect(eventsDispatched).not.toContain('doomscroll:macro-surge')
    } finally {
      g.window = originalWindow
      g.CustomEvent = originalCustomEvent
    }
  })
})
