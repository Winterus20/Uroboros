import { describe, it, expect } from 'vitest'
import {
  cloudRevision,
  decideSyncAction,
  decimalsEqual,
  evaluateWriteGuard,
  isCloudSavePayload,
  isSameSave,
  toMillis,
  type SyncDecision
} from './cloud-conflict'
import type { CloudSaveMeta, CloudSavePayload } from '../../models/auth-types'

/**
 * ADR-0070 — bulut karar katmanı regresyon testleri.
 *
 * Buradaki testler, bulut kaydetmenin daha önce sessizce bozuk olan üç
 * davranışını kilitler:
 *   1) normal oynanış çakışma üretmemeli (P0-2)
 *   2) bilinçli "bulutu güncelle" yazmayı atlamalı (P0-1)
 *   3) `updatedAt` ne sayı ne nesne olsa da normalize edilebilmeli (P0-3)
 */

function meta(overrides: Partial<CloudSaveMeta> = {}): CloudSaveMeta {
  return {
    matter: '1e50',
    singularities: 2,
    playtime: 3600,
    version: 1,
    activeSlot: 1,
    clientTimestamp: 1_700_000_000_000,
    deviceName: 'Windows PC',
    ...overrides
  }
}

function payload(m: CloudSaveMeta): CloudSavePayload {
  // updatedAt'yi bilerek FIRESTORE TIMESTAMP NESNESİ olarak modelle: canlı
  // yolda fetchFromCloud() tam olarak böyle bir şey döndürüyor.
  return {
    compressedData: 'H4sIAAAAAAAAA6tWKkstKlHSMUbIyNDIxMzOzVslJLAQAJx1LScsFATgZM9Q9mDwAAA',
    meta: m,
    updatedAt: { toMillis: () => m.clientTimestamp + 5 } as unknown as CloudSavePayload['updatedAt']
  }
}

describe('toMillis', () => {
  it('düz sayıyı olduğu gibi döndürür', () => {
    expect(toMillis(1700000000000)).toBe(1700000000000)
  })

  it('Firestore Timestamp nesnesini epoch-ms yapar', () => {
    expect(toMillis({ toMillis: () => 1234 })).toBe(1234)
  })

  it('null / tanımsız / Number olmayan değerlerde null döner', () => {
    expect(toMillis(null)).toBeNull()
    expect(toMillis(undefined)).toBeNull()
    expect(toMillis({} as unknown as number)).toBeNull()
  })

  it('NaN ve sonsuz sayıları reddeder', () => {
    expect(toMillis(NaN)).toBeNull()
    expect(toMillis(Infinity)).toBeNull()
  })
})

describe('decimalsEqual', () => {
  it("aynı Decimal'i farklı metinlerde tanır", () => {
    // Regresyon: dize karşılaştırması "10e999" ile "1e1000" farklı sanıyordu.
    expect(decimalsEqual('10e999', '1e1000')).toBe(true)
  })

  it('gerçekten farklı sayıları ayırır', () => {
    expect(decimalsEqual('1e50', '1e51')).toBe(false)
  })
})

describe('isSameSave', () => {
  it('tüm sinyaller tutarlıysa aynı kayıttır', () => {
    expect(isSameSave(meta(), meta({ clientTimestamp: meta().clientTimestamp + 9000 }))).toBe(true)
  })

  it('dopamin farklıysa çakışmadır', () => {
    expect(isSameSave(meta(), meta({ matter: '1e51' }))).toBe(false)
  })

  it('oynama süresi farklıysa çakışmadır', () => {
    expect(isSameSave(meta(), meta({ playtime: 4000 }))).toBe(false)
  })

  it('15 saniyeden büyük zaman farkı tek başına ayırt edici değildir ama eşleşmez', () => {
    expect(isSameSave(meta(), meta({ clientTimestamp: meta().clientTimestamp + 20000 }))).toBe(false)
  })
})

describe('evaluateWriteGuard', () => {
  const localMeta = meta({ clientTimestamp: 2000 })

  it('force her zaman izin verir — bilinçli oyuncu kararı', () => {
    expect(
      evaluateWriteGuard({ baseline: 1000, cloudMeta: meta({ clientTimestamp: 9999 }), localMeta, force: true })
    ).toBe('allow')
  })

  it('bulutta belge yoksa izin verir (ilk yedek)', () => {
    expect(evaluateWriteGuard({ baseline: null, cloudMeta: null, localMeta, force: false })).toBe('allow')
  })

  it('referansımız hâlâ geçerliyse izin verir — normal arka plan push', () => {
    expect(
      evaluateWriteGuard({ baseline: 1000, cloudMeta: meta({ clientTimestamp: 1000 }), localMeta, force: false })
    ).toBe('allow')
  })

  it('bulut bizim bildiğimizden farklıysa çakışma üretir — başka cihaz yazmış', () => {
    expect(
      evaluateWriteGuard({ baseline: 1000, cloudMeta: meta({ clientTimestamp: 1500 }), localMeta, force: false })
    ).toBe('conflict')
  })

  it('referans yokken eski saat koruması devrede: bulut yeniyse reddet', () => {
    expect(
      evaluateWriteGuard({ baseline: null, cloudMeta: meta({ clientTimestamp: 5000 }), localMeta, force: false })
    ).toBe('conflict')
  })

  it('referans yokken bulut eskiyse izin ver', () => {
    expect(
      evaluateWriteGuard({ baseline: null, cloudMeta: meta({ clientTimestamp: 500 }), localMeta, force: false })
    ).toBe('allow')
  })

  it('regresyon: yanlış saatli bir cihaz artık sessizce eziyor değil', () => {
    // Yerel saat 10 saat İLERİ ama referans geçerli -> yazmak serbest,
    // çünkü karar artık saat sıralamasına değil belge değişimine bakıyor.
    const skewedLocal = meta({ clientTimestamp: 5000 })
    expect(
      evaluateWriteGuard({ baseline: 1000, cloudMeta: meta({ clientTimestamp: 1000 }), localMeta: skewedLocal, force: false })
    ).toBe('allow')
  })
})

describe('decideSyncAction', () => {
  const localMeta = meta({ clientTimestamp: 5000, matter: '1e60', playtime: 7200 })

  it('bulutta kayıt yoksa ilk yedek', () => {
    expect(decideSyncAction({ cloudPayload: null, localMeta, baseline: null })).toBe('first-backup')
  })

  // ADR-0070'in ana regresyonu: 5 dakika oynayıp senkron isteyen oyuncu artık
  // çakışma ekranı görmüyor.
  it('normal oynanış çakışma üretmez, yalnızca push üretir', () => {
    const cloud = payload(meta({ clientTimestamp: 1000, matter: '1e50', playtime: 3600 }))
    expect(decideSyncAction({ cloudPayload: cloud, localMeta, baseline: 1000 })).toBe('push')
  })

  it('başka cihaz bulutu değiştirdiyse çakışma üretir', () => {
    const cloud = payload(meta({ clientTimestamp: 1001, matter: '1e70' }))
    expect(decideSyncAction({ cloudPayload: cloud, localMeta, baseline: 1000 })).toBe('conflict')
  })

  it('referans yokken aynı kayıt "in-sync" sayılır (spurious çakışma yok)', () => {
    // Aynı içerik, yalnızca 9 saniye eski bir zaman damgası: aynı kayıttır.
    const cloud = payload({ ...localMeta, clientTimestamp: localMeta.clientTimestamp + 9000 })
    expect(decideSyncAction({ cloudPayload: cloud, localMeta, baseline: null })).toBe('in-sync')
  })

  it('referans yokken farklı kayıt çakışmadır (ADR-0029 koruması yaşar)', () => {
    const cloud = payload({ ...localMeta, clientTimestamp: localMeta.clientTimestamp + 9000, matter: '1e999' })
    expect(decideSyncAction({ cloudPayload: cloud, localMeta, baseline: null })).toBe('conflict')
  })

  it('referans yokken YENİ cihazdaki boş oyun iyi bulut kaydını ezmez', () => {
    // Yeni cihaz: yerelde taze oyun (matter 10, süre 0). Bulutta ilerleme var.
    const freshLocal = meta({ matter: '10', playtime: 0, singularities: 0, clientTimestamp: 9000 })
    const goodCloud = payload(meta({ matter: '1e80', playtime: 99999, singularities: 9, clientTimestamp: 8000 }))
    expect(decideSyncAction({ cloudPayload: goodCloud, localMeta: freshLocal, baseline: null })).toBe('conflict')
  })

  it('dört kararın hepsi üretilebilir', () => {
    const decisions: SyncDecision[] = [
      decideSyncAction({ cloudPayload: null, localMeta, baseline: null }),
      decideSyncAction({ cloudPayload: payload(meta({ clientTimestamp: 1000 })), localMeta, baseline: 1000 }),
      decideSyncAction({ cloudPayload: payload(meta({ clientTimestamp: 1000 })), localMeta, baseline: 999 }),
      decideSyncAction({ cloudPayload: payload(meta({ clientTimestamp: 1000, matter: '1e999' })), localMeta, baseline: null })
    ]
    expect(new Set(decisions)).toEqual(new Set(['first-backup', 'push', 'conflict']))
    expect(decisions.length).toBe(4)
  })
})

describe('cloudRevision', () => {
  it('belgenin meta.clientTimestamp değerini döndürür', () => {
    expect(cloudRevision(payload(meta({ clientTimestamp: 424242 })))).toBe(424242)
  })
})

describe('isCloudSavePayload', () => {
  it('geçerli bir belgeyi kabul eder', () => {
    expect(isCloudSavePayload(payload(meta()))).toBe(true)
  })

  it("meta alanı eksik ya da bozuk belgeyi reddeder", () => {
    expect(isCloudSavePayload(null)).toBe(false)
    expect(isCloudSavePayload({ compressedData: 'abcdefgh' })).toBe(false)
    expect(isCloudSavePayload({ compressedData: 'kısa', meta: meta() })).toBe(false)
    expect(isCloudSavePayload({ compressedData: 'abcdefgh', meta: { matter: '1' } })).toBe(false)
    expect(isCloudSavePayload({ compressedData: 'abcdefgh', meta: meta({ clientTimestamp: 'x' as unknown as number }) })).toBe(false)
  })
})
