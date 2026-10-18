import { describe, expect, it } from 'vitest'

import {
  TIME_CLOCK_DECAY_BASE_PER_SEC,
  TIME_CLOCK_LIFETIME_SECONDS,
  TIME_CLOCK_MAX_DRAG,
  TIME_CLOCK_MAX_TENSION,
  TIME_CLOCK_MIN_TENSION,
  TIME_CLOCK_PEAK_SPEED_MAX,
  TIME_CLOCK_PEAK_SPEED_MIN,
  TIME_CLOCK_RELEASE_DECAY_EXP,
  TIME_CLOCK_RELEASE_SECONDS_MAX,
  TIME_CLOCK_RELEASE_SECONDS_MIN,
  TIME_CLOCK_SPAN_SECONDS,
  TIME_CLOCK_SPAWN_INTERVAL_MIN,
  TIME_CLOCK_SPAWN_JITTER,
  TIME_CLOCK_STIFFNESS_K,
  createIdleTimeClock,
  dragFromTension,
  durationFromPeakSpeed,
  nextClockInterval,
  releaseDuration,
  releaseEnergySeconds,
  releasePeakSpeed,
  releaseProfitRatio,
  tensionFromDrag
} from '../src/game/clock-data'

/**
 * ZAMAN YAYI (TIME CLOCK) SOZLESME SPEC'I (ADR-0068 hazirlik).
 *
 * Not: `src/stores/game/*` ve `src/components/TimeClockOverlay.vue` paralel
 * ajanlar tarafindan degistiriliyor; bu dosya gercek store'u import etmez,
 * bozmaz. Asagidaki saf yardimcilar oyunun saglamasi gereken SOZLESMEYI pinler:
 * denge sayilari, risk/odul orani ve yasam dongusu bantlari.
 *
 * Tasarim niyeti (tek cumlede): bedel geri sarilan saniye ile DOGRUSAL,
 * odul yay enerjisiyle KUADRATIKTEN DIK buyur; bu yuzden az sarmak zarar,
 * iyice germek buyuk kardir. Oyuncu "ya iyice ger, ya hic dokunma" dersini
 * kendi kesfeder.
 */

describe('Zaman Yayi: denge sayilari sozlesmesi (§2)', () => {
  it('kadran penceresi ve yasam dongusu sabitleri sabittir', () => {
    expect(TIME_CLOCK_SPAN_SECONDS).toBe(120)
    expect(TIME_CLOCK_LIFETIME_SECONDS).toBe(26)
    expect(TIME_CLOCK_STIFFNESS_K).toBe(2.0)
    expect(TIME_CLOCK_MAX_DRAG).toBe(600)
    expect(TIME_CLOCK_DECAY_BASE_PER_SEC).toBe(0.035)
  })

  it('salgi egrileri ve sinirlari sabittir', () => {
    expect(TIME_CLOCK_PEAK_SPEED_MIN).toBe(1.5)
    expect(TIME_CLOCK_PEAK_SPEED_MAX).toBe(16)
    expect(TIME_CLOCK_RELEASE_SECONDS_MIN).toBe(16)
    expect(TIME_CLOCK_RELEASE_SECONDS_MAX).toBe(75)
    expect(TIME_CLOCK_RELEASE_DECAY_EXP).toBe(1.6)
    expect(TIME_CLOCK_MIN_TENSION).toBe(0.05)
  })

  it('dogus ritmi sabittir (180 sn taban + 0..60 sn sapma — v2)', () => {
    expect(TIME_CLOCK_SPAWN_INTERVAL_MIN).toBe(180)
    expect(TIME_CLOCK_SPAWN_JITTER).toBe(60)
  })

  it('turetilen tavan gerginlik 1in altinda kalir (yay asla tam gerilmez)', () => {
    expect(TIME_CLOCK_MAX_TENSION).toBeCloseTo(TIME_CLOCK_MAX_DRAG / (TIME_CLOCK_MAX_DRAG + TIME_CLOCK_STIFFNESS_K), 12)
    expect(TIME_CLOCK_MAX_TENSION).toBeLessThan(1)
    expect(dragFromTension(1)).toBe(TIME_CLOCK_MAX_DRAG)
  })

  it('kurma penceresi kisadir (26 sn); salgi sureleri bunun uzerine kurulur', () => {
    expect(TIME_CLOCK_LIFETIME_SECONDS).toBeGreaterThan(0)
    expect(TIME_CLOCK_LIFETIME_SECONDS).toBeLessThan(60)
    expect(TIME_CLOCK_RELEASE_SECONDS_MIN).toBeLessThan(TIME_CLOCK_RELEASE_SECONDS_MAX)
    // Tam gerginlikte salgi, ekranda kalis suresinden uzun surer (odul zamani).
    expect(releaseDuration(1)).toBeGreaterThan(TIME_CLOCK_LIFETIME_SECONDS)
  })
})

describe('Zaman Yayi: risk/odul bandi (dogrusal bedel, kuadratikten dik odul)', () => {
  /**
   * §2 tablosunun nitel iddialari. Not: tablodaki mutlak degerler §4
   * formullerinden sapar (bkz. `src/game/clock-data.test.ts` basligi); burada
   * dogrulanan sey bandin kendisidir: az sarma = net zarar, tam germe = >3× kar.
   */
  const ROWS = [0.25, 0.5, 0.8, 1.0]

  it('oran egrisi 0.25 → 1.0 arasinda kesin artar', () => {
    const ratios = ROWS.map((tension) => releaseProfitRatio(tension))
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeGreaterThan(ratios[i - 1])
    }
  })

  it('%25 sarma net zarardir (oran < 1)', () => {
    expect(releaseProfitRatio(0.25)).toBeLessThan(1)
  })

  it('tam gerginlikte oran 3u asar (oran > 3)', () => {
    expect(releaseProfitRatio(1.0)).toBeGreaterThan(3)
  })

  it('tam gerginligin enerjisi kadran penceresini (120 sn) asar → tam kurma kârli', () => {
    const energy = releaseEnergySeconds(releasePeakSpeed(1), releaseDuration(1))
    expect(energy).toBeGreaterThan(TIME_CLOCK_SPAN_SECONDS)
    expect(energy - TIME_CLOCK_SPAN_SECONDS).toBeGreaterThan(TIME_CLOCK_SPAN_SECONDS)
  })

  it('enerji quadratikten dik buyur: gerginligi ikiye katlamak enerjiyi ikiden fazla katlar', () => {
    const energyAt = (tension: number) => releaseEnergySeconds(releasePeakSpeed(tension), releaseDuration(tension))
    expect(energyAt(0.5) / energyAt(0.25)).toBeGreaterThan(2)
    expect(energyAt(1) / energyAt(0.5)).toBeGreaterThan(2)
  })

  it('salgi suresi tepe hizla tutarlidir (ters cozum)', () => {
    for (const tension of ROWS) {
      expect(durationFromPeakSpeed(releasePeakSpeed(tension))).toBeCloseTo(releaseDuration(tension), 10)
    }
  })

  it('geri sarilan saniye dogrusal, gerginlik hiperbolik (sertlesme kaniti)', () => {
    // Esit tur artislari azalan gerginlik uretir → son ceyrek cok daha pahali.
    const firstQuarter = tensionFromDrag(dragFromTension(0.25))
    const lastQuarter = tensionFromDrag(dragFromTension(1)) - tensionFromDrag(dragFromTension(0.75))
    expect(firstQuarter).toBeGreaterThan(lastQuarter)
    // Ayni 0.25 gerginlik artisi son ceyrekte 9 kat fazla cevirme ister.
    const cheapStep = dragFromTension(0.5) - dragFromTension(0.25)
    const priceyStep = dragFromTension(0.9) - dragFromTension(0.75)
    expect(priceyStep).toBeGreaterThan(cheapStep * 5)
  })
})

describe('Zaman Yayi: durum sozlesmesi (store entegrasyonu icin)', () => {
  it('createIdleTimeClock tum TimeClockState alanlarini sifirlanmis dondurur', () => {
    const idle = createIdleTimeClock()
    // Yasam boyu istatistikler (geri sarilan saniye / salgi sayisi / en iyi gerginlik)
    // TimeClockState'te DEGIL, PlayerStats'ta yasar (prestijden sag cikarlar).
    expect(Object.keys(idle).sort()).toEqual(
      [
        'active',
        'drag',
        'peakSpeed',
        'phase',
        'remainingTime',
        'speed',
        'speedDuration',
        'speedRemaining'
      ].sort()
    )
    expect(idle.phase).toBe('idle')
    expect(idle.active).toBe(false)
    expect(idle.speed).toBe(1)
    expect(idle.drag).toBe(0)
  })

  it('her cagride bagimsiz nesne doner (state.ts + layers.ts reset yollari guvenli)', () => {
    const a = createIdleTimeClock()
    const b = createIdleTimeClock()
    expect(a).not.toBe(b)
    a.drag = 10
    expect(b.drag).toBe(0)
  })

  it('dogus araligi [180, 240] sn bandinda kalir (v2)', () => {
    for (let i = 0; i < 16; i++) {
      const interval = nextClockInterval()
      expect(interval).toBeGreaterThanOrEqual(TIME_CLOCK_SPAWN_INTERVAL_MIN)
      expect(interval).toBeLessThanOrEqual(TIME_CLOCK_SPAWN_INTERVAL_MIN + TIME_CLOCK_SPAWN_JITTER)
    }
  })
})
