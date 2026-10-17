import { describe, expect, it } from 'vitest'
import { useGameStore } from './game'
import { Decimal } from '../core/math'
import { DIMENSION_CHAIN_RATE } from '../game/balance'
import {
  TIME_CLOCK_MAX_TENSION,
  TIME_CLOCK_SPAN_SECONDS,
  dragFromTension,
  releaseDuration,
  releaseEnergySeconds,
  releasePeakSpeed
} from '../game/clock-data'

/**
 * Zaman Yayı (Time Clock) — store orkestrasyon testleri.
 * Sözleşme: brain/scratchpad/time-clock-spec.md §6 + §10 (Ajan B satırı).
 *
 * Kilitlenen garantiler:
 *  (a) faz makinesi: idle → winding → released → idle,
 *  (b) sarma kütleyi geri sarılan saniye ile DOĞRUSAL eritir (taban 1 güvenli),
 *  (c) salgı hızı üretime yansır, üstel söner ve idle'da tam 1×'e döner,
 *  (d) tam gerginlikte ödül > bedel (tasarımın "ya iyice ger, ya hiç dokunma" dersi),
 *  (e) çevrimdışı simülasyon saati hiç doğurmaz/ilerletmez,
 *  (f) koşu sıfırlama saati idle bırakır.
 */

/**
 * Zaman Yayı açık + D1 üreten zengin bir koşu (mps > 0 olmadan bedel görünmez).
 * Kütle 1e12 seçilir: 1e30 mertebesinde tek bir sarmanın bedeli float64
 * mantissa çözünürlüğünün (ulp ≈ 1e14) ALTINDA kalır ve test yanlış yeşil/yanlış
 * kırmızı verir. 1e12, oyun içi matter ≈ mps ölçeğine de daha yakındır.
 */
function clockStore(matter = '1e12') {
  const store = useGameStore()
  if (!store.unlockedFeatures.includes('time_clock')) store.unlockedFeatures.push('time_clock')
  store.dimensions[0].amount = new Decimal(1000)
  store.dimensions[0].bought = 10
  store.matter = new Decimal(matter)
  store.lifetimePeakMatter = new Decimal(matter)
  store.stats.highestMatter = new Decimal(matter)
  store.stats.totalMatterProduced = new Decimal(matter)
  return store
}

describe('Zaman Yayı — faz makinesi', () => {
  it('spawn: idle → winding, alanlar kurulur ve ikinci spawn reddedilir', () => {
    const store = clockStore()

    expect(store.timeClock.phase).toBe('idle')
    expect(store.spawnTimeClock()).toBe(true)

    expect(store.timeClock.phase).toBe('winding')
    expect(store.timeClock.active).toBe(true)
    expect(store.timeClock.remainingTime).toBe(26)
    expect(store.timeClock.drag).toBe(0)
    expect(store.timeClock.speed).toBe(1)
    expect(store.timeClock.speedRemaining).toBe(0)
    expect(store.clockTimer).toBe(0)
    expect(store.nextClockInterval).toBeGreaterThanOrEqual(240)
    expect(store.timeClockIsWinding).toBe(true)
    expect(store.timeClockIsReleasing).toBe(false)

    // Saat ekrandayken yeniden doğmaz
    expect(store.spawnTimeClock()).toBe(false)
  })

  it('winding fazında geçersiz sürükleme girdileri yok sayılır', () => {
    const store = clockStore()
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.5))
    const drag = store.timeClock.drag

    store.windTimeClock(0)
    store.windTimeClock(-5)
    store.windTimeClock(Number.NaN)
    store.windTimeClock(Number.POSITIVE_INFINITY)

    expect(store.timeClock.drag).toBe(drag)
  })

  it('idle fazında sarma ve salma reddedilir', () => {
    const store = clockStore()
    store.windTimeClock(dragFromTension(0.5))
    expect(store.timeClock.drag).toBe(0)
    expect(store.releaseTimeClock()).toBe(false)
  })

  it('akrep açısı gerginlikle orantılı büyür (tam gerginlikte ≈ -540°)', () => {
    const store = clockStore()
    store.spawnTimeClock()
    expect(store.timeClockHandAngleDeg).toBeCloseTo(0, 9)
    store.windTimeClock(dragFromTension(0.5))
    expect(store.timeClockHandAngleDeg).toBeCloseTo(-270, 6)
    store.windTimeClock(dragFromTension(1) - dragFromTension(0.5))
    expect(store.timeClockHandAngleDeg).toBeCloseTo(-(540 * TIME_CLOCK_MAX_TENSION), 4)
  })
})

describe('Zaman Yayı — sarma bedeli (kütle erimesi)', () => {
  it('geri sarılan saniye ile DOĞRUSAL orantılı kütle eritir', () => {
    const store = clockStore()
    store.spawnTimeClock()
    const mps = store.matterPerSecond
    expect(mps.gt(0)).toBe(true)

    const matterBefore = store.matter
    store.windTimeClock(dragFromTension(0.5))

    // t = 0.5 → drag = 2 rad → 60 geri sarılan saniye
    expect(store.timeClockRewoundSeconds).toBeCloseTo(60, 9)
    const firstCost = matterBefore.minus(store.matter)
    expect(firstCost.div(mps).toNumber()).toBeCloseTo(60, 4)

    // İkinci çeyrek: 60 → 96 saniye, bedel yine saniye başına AYNI (doğrusal)
    const matterMid = store.matter
    store.windTimeClock(dragFromTension(0.8) - dragFromTension(0.5))
    expect(store.timeClockRewoundSeconds).toBeCloseTo(96, 9)
    const secondCost = matterMid.minus(store.matter)
    expect(secondCost.div(mps).toNumber()).toBeCloseTo(36, 4)
  })

  it('monotonist istatistikler sarmadan etkilenmez', () => {
    const store = clockStore()
    const produced = store.stats.totalMatterProduced
    const highest = store.stats.highestMatter
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.9))

    expect(store.stats.totalMatterProduced.eq(produced)).toBe(true)
    expect(store.stats.highestMatter.eq(highest)).toBe(true)
    expect(store.matter.lt(highest)).toBe(true)
  })

  it('kütle 1 tabanının altına inmez', () => {
    const store = clockStore('100')
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(1))

    expect(store.matter.toNumber()).toBe(1)
    expect(store.timeClock.drag).toBeLessThanOrEqual(600)
  })
})

describe('Zaman Yayı — salgı (ödül)', () => {
  it('release: hız > 1, süre biter ve idle\'da tam 1× döner', () => {
    const store = clockStore()
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.9))

    expect(store.releaseTimeClock()).toBe(true)
    expect(store.timeClock.phase).toBe('released')
    expect(store.timeClock.active).toBe(false)
    expect(store.timeClock.drag).toBe(0)
    expect(store.timeClock.speed).toBe(releasePeakSpeed(0.9))
    expect(store.timeClock.speed).toBeGreaterThan(1)
    expect(store.timeClock.speedRemaining).toBe(releaseDuration(0.9))
    expect(store.timeClockProductionMult.gt(1)).toBe(true)
    // Yaşam boyu istatistikler `stats` altında tutulur (prestijden sağ çıkar).
    expect(store.stats.clockRewinds).toBe(1)
    expect(store.stats.clockBestTension).toBeCloseTo(0.9, 9)
    expect(store.stats.clockRewoundSeconds).toBeCloseTo(108, 6)

    // Salma ikinci kez çağrılamaz (faz artık winding değil)
    expect(store.releaseTimeClock()).toBe(false)

    // Üstel sönüm: yarı yolda hâlâ > 1 ama tepe hızdan küçük
    const peak = store.timeClock.speed
    store.update(store.timeClock.speedRemaining / 2)
    expect(store.timeClock.speed).toBeLessThan(peak)
    expect(store.timeClock.speed).toBeGreaterThan(1)

    // Süre bitince idle + hız nötr
    store.update(store.timeClock.speedRemaining + 0.001)
    expect(store.timeClock.phase).toBe('idle')
    expect(store.timeClock.speed).toBe(1)
    expect(store.timeClock.speedRemaining).toBe(0)
    expect(store.timeClockProductionMult.eq(1)).toBe(true)
  })

  it('salma kütleyi gerçekten hızlandırır (aynı pencere, nötr saatten fazla)', () => {
    const store = clockStore()
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.5))
    store.releaseTimeClock()

    // Salgı penceresinin ilk çeyreği: hız hâlâ tepede
    const window = store.timeClock.speedRemaining / 4
    const beforeBoosted = store.matter
    store.update(window)
    const boosted = store.matter.minus(beforeBoosted)

    // Aynı pencere, saat nötr: karşılaştırma taban çizgisi
    store.timeClock.phase = 'idle'
    store.timeClock.speed = 1
    const beforePlain = store.matter
    store.update(window)
    const plain = store.matter.minus(beforePlain)

    expect(boosted.gt(plain)).toBe(true)
    expect(boosted.div(plain).toNumber()).toBeGreaterThan(3)
  })

  it('tam gerginlikte net ekonomi POZİTİF (ödül > bedel)', () => {
    const store = clockStore()
    store.spawnTimeClock()
    const mps = store.matterPerSecond
    const matterBefore = store.matter

    // Kadran tavanı: drag = 600 rad → gerginlik ≈ 0.9966
    expect(store.timeClockTension).toBeCloseTo(0, 9)
    store.windTimeClock(dragFromTension(TIME_CLOCK_MAX_TENSION))
    expect(store.timeClockTension).toBeCloseTo(TIME_CLOCK_MAX_TENSION, 9)

    const tension = store.timeClockTension
    const windCost = matterBefore.minus(store.matter)
    const energySeconds = releaseEnergySeconds(releasePeakSpeed(tension), releaseDuration(tension))
    const gain = mps.times(energySeconds)

    expect(gain.gt(windCost)).toBe(true)
    expect(gain.div(windCost).toNumber()).toBeGreaterThan(3)
  })

  it('yarım gerginlikte ödül zayıftır; tam gerginliğin çok altında kalır', () => {
    const half = releaseEnergySeconds(releasePeakSpeed(0.5), releaseDuration(0.5)) / (0.5 * TIME_CLOCK_SPAN_SECONDS)
    const full = releaseEnergySeconds(releasePeakSpeed(TIME_CLOCK_MAX_TENSION), releaseDuration(TIME_CLOCK_MAX_TENSION)) / (TIME_CLOCK_MAX_TENSION * TIME_CLOCK_SPAN_SECONDS)

    expect(half).toBeLessThan(full)
    expect(full / half).toBeGreaterThan(2)
  })
})

describe('Zaman Yayı — döngü entegrasyonu', () => {
  it('clockTimer hedefe ulaşınca update() saati doğurur', () => {
    const store = clockStore()
    store.nextClockInterval = 1
    store.update(0.5)
    expect(store.timeClock.phase).toBe('idle')
    store.update(0.6)
    expect(store.timeClock.phase).toBe('winding')
    expect(store.clockTimer).toBe(0)
  })

  it('winding sırasında yay sönümü kütleyi geri verir (zaman ileri akar)', () => {
    const store = clockStore()
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.5))
    const tensionBefore = store.timeClockTension
    const matterBefore = store.matter

    store.update(1)

    expect(store.timeClockTension).toBeLessThan(tensionBefore)
    expect(store.matter.gt(matterBefore)).toBe(true)
    expect(store.timeClock.remainingTime).toBeCloseTo(25, 6)
  })

  it('winding süresi biterse otomatik salınır (ceza yok, ödül var)', () => {
    const store = clockStore()
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.5))

    store.update(26)

    expect(store.timeClock.phase).toBe('released')
    expect(store.timeClock.active).toBe(false)
    expect(store.timeClock.speed).toBeGreaterThan(1)
    expect(store.stats.clockRewinds).toBe(1)
  })

  it('offlineSimActive: saat doğmaz, ilerlemez ve hız nötr\'e çekilir', () => {
    const store = clockStore()
    store.offlineSimActive = true
    store.nextClockInterval = 1

    store.update(5)
    expect(store.timeClock.phase).toBe('idle')
    expect(store.clockTimer).toBe(0)

    // Bayat bir salgı varsa offline simülasyon onu nötr'e indirir
    store.timeClock.phase = 'released'
    store.timeClock.speed = 4
    store.timeClock.speedRemaining = 30
    store.update(0.1)
    expect(store.timeClock.speed).toBe(1)

    // Offline bitince saat normal doğar
    store.resetTimeClock()
    store.offlineSimActive = false
    store.update(2)
    expect(store.timeClock.phase).toBe('winding')
  })

  it('resetRunState saati idle bırakır', () => {
    const store = clockStore()
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.5))
    store.releaseTimeClock()
    expect(store.timeClock.phase).toBe('released')

    store.resetRunState()

    expect(store.timeClock.phase).toBe('idle')
    expect(store.timeClock.speed).toBe(1)
    expect(store.timeClock.active).toBe(false)
    expect(store.timeClock.speedRemaining).toBe(0)
    expect(store.clockTimer).toBe(0)
  })

  it('resetTimeClock saati ve zamanlayıcıyı sıfırlar', () => {
    const store = clockStore()
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.8))
    store.resetTimeClock()

    expect(store.timeClock.phase).toBe('idle')
    expect(store.timeClock.drag).toBe(0)
    expect(store.timeClock.speed).toBe(1)
    expect(store.clockTimer).toBe(0)
  })
})

describe('Zaman Yayı — üretim çarpanı paritesi', () => {
  it('timeClockProductionMult üretim dökümünde görünür ve idle\'da 1×', () => {
    const store = clockStore()
    expect(store.timeClockProductionMult.eq(1)).toBe(true)

    const idleSources = store.matterProductionBreakdown.map((p) => p.source)
    expect(idleSources).toContain('time-clock')

    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.9))
    store.releaseTimeClock()
    expect(store.timeClockProductionMult.gt(1)).toBe(true)

    const expected = store.matterPerSecond
    const actual = store.matterProductionBreakdown.reduce((acc, p) => acc.times(p.mult), new Decimal(1))
    expect(actual.eq(expected)).toBe(true)
  })

  it('salgı hızı D2→D1 zincir beslemesine UYGULANMAZ (katlanma yok)', () => {
    const store = clockStore()
    store.dimensions[1].amount = new Decimal(1000)
    store.dimensions[1].bought = 10
    store.spawnTimeClock()
    store.windTimeClock(dragFromTension(0.9))
    store.releaseTimeClock()
    expect(store.timeClockProductionMult.gt(10)).toBe(true)

    // D1 üretimini kapat → geriye yalnızca D2→D1 zincir beslemesi kalır
    store.dimensions[0].amount = new Decimal(0)
    // Beklenen değerleri update() ÖNCESİNDE yakala: update() sonunda
    // checkAchievements() yeni başarım açıp achievementMultiplier'ı büyütebilir
    // ve sonradan okunan değer yanlış referans verir.
    const d2Before = store.dimensions[1].amount
    const d1Before = store.dimensions[0].amount
    const dim2Mult = store.getDimensionMultiplier(2)
    const tickMult = store.tickspeedMultiplier
    const achMult = store.achievementMultiplier
    store.update(0.5)

    // Saat çarpanı İÇERMEYEN saf zincir formülü (update() ile aynı terimler)
    const feed = d2Before
      .times(dim2Mult)
      .times(tickMult)
      .times(achMult)
      .times(DIMENSION_CHAIN_RATE)
      .times(0.5)

    expect(store.dimensions[1].amount.eq(d2Before)).toBe(true)
    expect(store.dimensions[0].amount.minus(d1Before).div(feed).toNumber()).toBeCloseTo(1, 9)
  })
})
