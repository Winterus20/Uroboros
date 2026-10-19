import { describe, expect, it, vi } from 'vitest'

import { Decimal } from '../core/math'
import { createFreshStore } from '../test/helpers'

/**
 * ADR-0072 §A — Kütle kapısı açılış kutlaması.
 *
 * Açılış artık Ölçek Sıçraması olayından değil, `lifetimePeakMatter` kütle
 * eşiklerinden (DIMENSION_UNLOCK_GATES) gelir. Eski kutlama
 * performScaleJump('shift') dalındaydı ve bu yolla hiç tetiklenmiyordu.
 *
 * Üç garanti:
 *  (a) canlı tick'te açık boyut sayısı ARTINCA BİR kutlama ateşlenir,
 *  (b) aynı tick'te birden çok boyut açılsa bile TEK çağrı, EN YÜKSEK tier ile,
 *  (c) kayıt yükleme (deserialize) kutlama ATEŞLEMEZ — sayaç sessizce hizalanır.
 */
describe('ADR-0072 kütle kapısı kutlaması', () => {
  it('tick içinde yeni boyut açılınca kutlamayı ateşler (buff + seen cap)', () => {
    const store = createFreshStore()
    expect(store.unlockedDimensionsCount).toBe(3)
    expect(store.formatDiscoverSeenCap).toBe(3)

    // D4 kapısı (1e8) aşılır; syncUnlocks bu tick'te çalışsın diye accumulator dolu.
    store.matter = new Decimal('1e8')
    store.lifetimePeakMatter = new Decimal('1e8')
    store.unlockCheckAcc = 0.5
    store.update(0.1)

    expect(store.unlockedDimensionsCount).toBe(4)
    expect(store.formatDiscoverSeenCap).toBe(4)
    expect(store.formatUnlockBuffTier).toBe(4)
    expect(store.formatUnlockBuffUntil).toBeGreaterThan(0)
  })

  it('aynı tick içinde çoklu açılışta TEK çağrı, en yüksek tier ile', () => {
    const store = createFreshStore()
    const spy = vi.spyOn(store, 'celebrateFormatUnlock')

    // 1e21 → D4+D5+D6+D7 kapıları (1e8/1e11/1e15/1e20) aynı tick'te açılır.
    store.matter = new Decimal('1e21')
    store.lifetimePeakMatter = new Decimal('1e21')
    store.unlockCheckAcc = 0.5
    store.update(0.1)

    expect(store.unlockedDimensionsCount).toBe(7)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(7)
    spy.mockRestore()
  })

  it('kayıt yükleme kutlama ateşlemez, sayaç sessizce hizalanır', () => {
    const saver = createFreshStore()
    saver.matter = new Decimal('1e30')
    saver.lifetimePeakMatter = new Decimal('1e30')
    const saved = saver.serialize()

    const store = createFreshStore()
    const spy = vi.spyOn(store, 'celebrateFormatUnlock')
    store.deserialize(saved)

    // Geçmiş açılışlar geri kazanıldı ama kutlanmadı.
    expect(store.unlockedDimensionsCount).toBe(8)
    expect(store.celebratedDimensionCap).toBe(8)
    expect(spy).not.toHaveBeenCalled()

    // Yükleme sonrası ilk canlı tick de telafi kutlaması üretmez.
    store.update(0.1)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('çevrimdışı simülasyonda kutlama susar ama sayaç ilerler', () => {
    const store = createFreshStore()
    store.matter = new Decimal('1e11')
    store.lifetimePeakMatter = new Decimal('1e11')
    store.unlockCheckAcc = 0.5
    store.offlineSimActive = true
    store.update(0.1)

    expect(store.unlockedDimensionsCount).toBe(5)
    expect(store.celebratedDimensionCap).toBe(5)
    expect(store.formatDiscoverSeenCap).toBe(3) // ses/konfeti yok

    // Oyuncu döndüğünde gecikmeli patlama olmaz.
    store.offlineSimActive = false
    store.update(0.1)
    expect(store.formatDiscoverSeenCap).toBe(3)
  })
})
