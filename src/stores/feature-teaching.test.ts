import { describe, expect, it } from 'vitest'

import { Decimal } from '../core/math'
import { FEATURE_TEACHINGS, getFeatureTeaching } from '../game/feature-teachings'
import { FEATURE_UNLOCKS } from '../game/unlocks'
import { createFreshStore } from '../test/helpers'
import type { SerializedPlayerState } from '../models/types'

/**
 * P4a — Özellik Öğretimi (plan §7.3 "İlk karşılaşmada anlat, sonrasında göster")
 *
 * Sözleşme:
 *  - Her GÖZLEMLENEBİLİR özellik için tek cümlelik bir anlatım vardır.
 *  - Boş kapılar (mercek / rezonatör / iplikçik) anlatılmaz: oyuncu hiçbir
 *    şey görmeyeceği için var olmayan bir yüzeyden bahsedilmez.
 *  - Öğretim, özellik AÇILDIĞI ANDA bir kez gösterilir; reload sonrası veya
 *    ikinci açılışta tekrar gösterilmez.
 *  - Aynı anda birden fazla özellik açılırsa ekranda TEK öğretim durur.
 */

/** UI'a bağlı olmayan (boş) kapılar — bunlar için öğretim YAZILMAZ. */
const DEAD_DOORS = ['event_horizon_lens', 'hawking_resonator', 'cosmic_filament'] as const

/** Merdivendeki gerçek özellik id'leri. */
const UNLOCK_IDS = FEATURE_UNLOCKS.map((f) => f.id)

/** Gözlemlenebilir özellikler = merdiven − boş kapılar. */
const OBSERVABLE_IDS = UNLOCK_IDS.filter((id) => !(DEAD_DOORS as readonly string[]).includes(id))

/**
 * Bir özelliğin dopamin kapısını aşacak kadar kütle verir ve kilitleri
 * günceller. `syncUnlocks()` TEK YAZIM YOLUDUR (ADR-0035).
 */
function openUpTo(store: ReturnType<typeof createFreshStore>, matter: string): void {
  store.matter = new Decimal(matter)
  store.lifetimePeakMatter = new Decimal(matter)
  store.syncUnlocks()
}

describe('P4a özellik öğretimi — içerik', () => {
  it('her kaydın featureId\'si FEATURE_UNLOCKS\'ta GERÇEKTEN var', () => {
    const ids = Object.keys(FEATURE_TEACHINGS)
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(UNLOCK_IDS).toContain(id)
      expect(FEATURE_TEACHINGS[id].featureId).toBe(id)
    }
  })

  it('gözlemlenebilir her özellik için kayıt var', () => {
    for (const id of OBSERVABLE_IDS) {
      expect(getFeatureTeaching(id)).not.toBeNull()
      expect(FEATURE_TEACHINGS[id]).toBeDefined()
    }
    expect(OBSERVABLE_IDS.length).toBeGreaterThan(0)
  })

  it('boş kapılar (mercek / rezonatör / iplikçik) KAYIT DEĞİL', () => {
    for (const id of DEAD_DOORS) {
      expect(UNLOCK_IDS).toContain(id)
      expect(FEATURE_TEACHINGS[id]).toBeUndefined()
      expect(getFeatureTeaching(id)).toBeNull()
    }
    // Bilinmeyen id de null döner.
    expect(getFeatureTeaching('bilinmeyen_ozellik')).toBeNull()
  })

  it('her body 90-140 karakter, TEK cümle ve boş değil', () => {
    for (const teaching of Object.values(FEATURE_TEACHINGS)) {
      const body = teaching.body
      expect(body.trim().length).toBeGreaterThan(0)
      expect(body.length).toBeGreaterThanOrEqual(90)
      expect(body.length).toBeLessThanOrEqual(140)
      // Tek cümle: tam olarak bir nokta (sonda) ve başka nokta yok.
      expect((body.match(/\./g) || []).length).toBe(1)
      expect(body.endsWith('.')).toBe(true)
    }
  })

  it('başlık 1-3 kelime, glif tek karakter', () => {
    for (const teaching of Object.values(FEATURE_TEACHINGS)) {
      expect(teaching.title.trim().split(/\s+/).length).toBeGreaterThanOrEqual(1)
      expect(teaching.title.trim().split(/\s+/).length).toBeLessThanOrEqual(3)
      expect(teaching.glyph.length).toBe(1)
    }
  })
})

describe('P4a özellik öğretimi — yakalama (syncUnlocks)', () => {
  it('yeni özellik açılınca pendingTeaching dolu + taughtFeatures\'e ekleniyor', () => {
    const store = createFreshStore()
    expect(store.currentTeaching).toBeNull()
    expect(store.taughtFeatures).toEqual([])

    openUpTo(store, '1e3') // crisis_spawn kapısı (1e3)

    expect(store.unlockedFeatures).toContain('crisis_spawn')
    expect(store.taughtFeatures).toContain('crisis_spawn')
    expect(store.currentTeaching).not.toBeNull()
    expect(store.currentTeaching?.featureId).toBe('crisis_spawn')
    expect(store.currentTeaching?.title.length).toBeGreaterThan(0)
  })

  it('aynı özelliğin İKİNCİ açılmasında tekrar öğretilmiyor (taughtFeatures kontrolü)', () => {
    const store = createFreshStore()
    openUpTo(store, '1e3')
    expect(store.taughtFeatures.filter((id) => id === 'crisis_spawn').length).toBe(1)

    // İlk öğretim ekrandan kapatılır.
    store.dismissTeaching()
    expect(store.currentTeaching).toBeNull()

    // Özellik listeden düşürülür (yeniden açılma simülasyonu) ve merdiven
    // yeniden tarandığında özellik yine açılır — ama ANLATILMAZ.
    store.unlockedFeatures = store.unlockedFeatures.filter((id) => id !== 'crisis_spawn')
    store.syncUnlocks()

    expect(store.unlockedFeatures).toContain('crisis_spawn')
    expect(store.currentTeaching).toBeNull()
    expect(store.taughtFeatures.filter((id) => id === 'crisis_spawn').length).toBe(1)
  })

  it('kayıtlı listede olan özellik yeniden öğretilmiyor', () => {
    const store = createFreshStore()
    // Kayıttan gelen "anlatılmış" listesi — özellik henüz açık değil.
    store.taughtFeatures = ['crisis_spawn']

    openUpTo(store, '1e3')

    // Özellik merdiven tarafından AÇILIR ...
    expect(store.unlockedFeatures).toContain('crisis_spawn')
    // ... ama artık öğretilmiş sayılır, ekrana ikinci kez anlatım gelmez.
    expect(store.currentTeaching).toBeNull()
    expect(store.taughtFeatures).toEqual(['crisis_spawn'])
  })

  it('aynı tick\'te 2 özellik açılırsa pendingTeaching TEK (ilk açılan) — yığın olmuyor', () => {
    const store = createFreshStore()
    // 1e12 → crisis_spawn (1e3) VE autobuyers (1e12) aynı tarama da açılır.
    openUpTo(store, '1e12')

    expect(store.unlockedFeatures).toContain('crisis_spawn')
    expect(store.unlockedFeatures).toContain('autobuyers')

    // İkisi de kayda geçer ...
    expect(store.taughtFeatures).toContain('crisis_spawn')
    expect(store.taughtFeatures).toContain('autobuyers')

    // ... ama ekranda TEK öğretim durur: merdiven sırasındaki İLK açılan.
    expect(store.currentTeaching).not.toBeNull()
    expect(store.currentTeaching?.featureId).toBe('crisis_spawn')
    expect(Array.isArray(store.currentTeaching)).toBe(false)
  })

  it('dismissTeaching() pendingTeaching\'i temizliyor', () => {
    const store = createFreshStore()
    openUpTo(store, '1e3')
    expect(store.currentTeaching).not.toBeNull()

    store.dismissTeaching()
    expect(store.currentTeaching).toBeNull()
    expect(store.pendingTeaching).toBeNull()

    // Kapatmak öğretimi geri getirmez: "bir kez anlat, sonra bir daha asla".
    store.syncUnlocks()
    expect(store.currentTeaching).toBeNull()
  })
})

describe('P4a özellik öğretimi — kayıt round-trip', () => {
  it('taughtFeatures serialize payload\'ında var ve yükleniyor', () => {
    const saver = createFreshStore()
    saver.taughtFeatures = ['crisis_spawn', 'autobuyers']
    const payload = saver.serialize()

    expect(payload.taughtFeatures).toEqual(['crisis_spawn', 'autobuyers'])

    const store = createFreshStore()
    store.deserialize(payload)
    expect(store.taughtFeatures).toEqual(['crisis_spawn', 'autobuyers'])
  })

  it('eski kayıt (alan yok) → []', () => {
    const saver = createFreshStore()
    saver.taughtFeatures = ['crisis_spawn']
    const payload = saver.serialize()

    const legacy: Partial<SerializedPlayerState> = { ...payload }
    delete legacy.taughtFeatures

    const store = createFreshStore()
    store.deserialize(legacy as SerializedPlayerState)
    expect(store.taughtFeatures).toEqual([])
  })

  it('pendingTeaching kaydedilmez (uçucu)', () => {
    const store = createFreshStore()
    openUpTo(store, '1e3')
    expect(store.currentTeaching).not.toBeNull()

    const payload = store.serialize()
    expect(payload.taughtFeatures).toContain('crisis_spawn')

    const fresh = createFreshStore()
    fresh.deserialize(payload)
    // Anlatım kayıttan taşınmaz — yalnızca AÇILIŞ ANINDA gösterilir.
    expect(fresh.currentTeaching).toBeNull()
    // Ama "anlatıldı" bilgisi korunur: yeniden anlatılmaz.
    expect(fresh.taughtFeatures).toContain('crisis_spawn')
  })
})
