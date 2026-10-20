import { describe, expect, it, vi } from 'vitest'

import { Decimal } from '../core/math'
import { createFreshStore } from '../test/helpers'

/**
 * ADR-0076 - Satin alma tabanli boyut acilisi: kutlama.
 *
 * Acilis artik kitle kapilarindan degil, SATIN ALMAdan gelir: bir boyuttan
 * 1 paket alindiginda bir sonraki boyut acilir. Eski kutlama
 * performScaleJump('shift') dalindaydi ve bu yolla hic tetiklenmiyordu.
 *
 * Uc garanti:
 *  (a) canli tick'te acilan boyut sayisi ARTINCA BIR kutlama ateslenir,
 *  (b) ayni tick'te birden cok boyut acilsa bile TEK cagri, EN YUKSEK tier ile,
 *  (c) kayit yukleme (deserialize) kutlama ATESLEMEZ - sayac sessizce hizalanir.
 */
describe('ADR-0076 satin alma acilisi kutlamasi', () => {
  it('paket satin alinca yeni boyut acilir ve tick icinde kutlanir', () => {
    const store = createFreshStore()
    expect(store.unlockedDimensionsCount).toBe(3)
    expect(store.formatDiscoverSeenCap).toBe(3)

    // D3'un ilk paketi (10 adet) alinir -> D4 acilir.
    store.matter = new Decimal('1e6')
    expect(store.buyDimension(3, false)).toBe(true)
    expect(store.dimensions[2].bought).toBe(10)
    expect(store.lifetimeMaxDimensionTier).toBe(3)
    expect(store.unlockedDimensionsCount).toBe(4)

    // Kutlama tick icinde ateslenir (syncUnlocks accumulator'u dolu).
    store.unlockCheckAcc = 0.5
    store.update(0.1)

    expect(store.formatDiscoverSeenCap).toBe(4)
    expect(store.formatUnlockBuffTier).toBe(4)
    expect(store.formatUnlockBuffUntil).toBeGreaterThan(0)
  })

  it('paket satin alinmadan boyut acilmaz', () => {
    const store = createFreshStore()
    store.matter = new Decimal('1e6')
    // x1 alim (1 adet) tek basina acmaz: acilis 1 paket (10 adet) ile olur.
    expect(store.buyOneUnit(3, false)).toBe(true)
    expect(store.dimensions[2].bought).toBe(1)
    expect(store.unlockedDimensionsCount).toBe(3)
  })

  it('ayni tick icinde coklu acilista TEK cagri, en yuksek tier ile', () => {
    const store = createFreshStore()
    const spy = vi.spyOn(store, 'celebrateFormatUnlock')

    // D3, D4 ve D5 paketleri alinir -> D4, D5, D6 ayni anda acilir.
    store.matter = new Decimal('1e12')
    for (const tier of [3, 4, 5]) {
      expect(store.buyDimension(tier, false)).toBe(true)
    }
    expect(store.unlockedDimensionsCount).toBe(6)

    store.unlockCheckAcc = 0.5
    store.update(0.1)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(6)
    spy.mockRestore()
  })

  it('kayit yukleme kutlama ateslemez, sayac sessizce hizalanir', () => {
    const saver = createFreshStore()
    saver.matter = new Decimal('1e12')
    saver.buyDimension(3, false)
    saver.buyDimension(4, false)
    saver.buyDimension(5, false)
    const saved = saver.serialize()

    const store = createFreshStore()
    const spy = vi.spyOn(store, 'celebrateFormatUnlock')
    store.deserialize(saved)

    // Gecmis acilislar geri kazanildi ama kutlanmadi.
    expect(store.unlockedDimensionsCount).toBe(6)
    expect(store.celebratedDimensionCap).toBe(6)
    expect(spy).not.toHaveBeenCalled()

    // Yukleme sonrasi ilk canli tick de telafi kutlamasi uretmez.
    store.update(0.1)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('cevrimdisi simulasyonda kutlama susar ama sayac ilerler', () => {
    const store = createFreshStore()
    store.matter = new Decimal('1e12')
    store.buyDimension(3, false)
    store.buyDimension(4, false)
    store.buyDimension(5, false)
    store.unlockCheckAcc = 0.5
    store.offlineSimActive = true
    store.update(0.1)

    expect(store.unlockedDimensionsCount).toBe(6)
    expect(store.celebratedDimensionCap).toBe(6)
    expect(store.formatDiscoverSeenCap).toBe(3) // ses/konfeti yok

    // Oyuncu dondugunde gecikmeli patlama olmaz.
    store.offlineSimActive = false
    store.update(0.1)
    expect(store.formatDiscoverSeenCap).toBe(3)
  })
})
