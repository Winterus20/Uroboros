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
  applyTensionDecay,
  createIdleTimeClock,
  dragFromTension,
  durationFromPeakSpeed,
  nextClockInterval,
  releaseDuration,
  releaseEnergySeconds,
  releasePeakSpeed,
  releaseProfitRatio,
  releaseSpeedAt,
  rewoundSecondsForTension,
  tensionFromDrag
} from './clock-data'

/**
 * Zaman Yayi (Time Clock) saf matematik testleri (ADR sözleşmesi §4 / §10 Ajan A).
 *
 * Not: Bu modul saf; store, audio ve DOM'a dokunmaz. Testler §2 tablosunun
 * niceliklerini formullerin urettigi kesin degerlerle kilitler.
 *
 * §2 tablosu sapmasi (rapor edildi): tablodaki peak/sure sutunlari §4
 * formullerinden sapar (ornegin t=0.5: tablo 43.0 sn / 5.92×, formul 45.5 sn / 6.63×).
 * Sozlesme satir 4 "celiski gorursen uygulama, sozlesmeye uy" dedigi icin tek
 * dogruluk kaynagi §4 formuludur; tablonun nitel iddialari (az sarma = zarar,
 * tam germe = buyuk kar) asagida ayrica test edilir. Tablo degerleri yorumda kalir.
 */

// ---------------------------------------------------------------------------
// 1. §2 denge sabitleri (sozlesmedeki isimler ve degerler)
// ---------------------------------------------------------------------------

describe('§2 denge sabitleri', () => {
  it('tum sabitler sozlesmedeki degerlerle birebir eslesir', () => {
    expect(TIME_CLOCK_SPAN_SECONDS).toBe(120)
    expect(TIME_CLOCK_LIFETIME_SECONDS).toBe(26)
    expect(TIME_CLOCK_STIFFNESS_K).toBe(2.0)
    expect(TIME_CLOCK_MAX_DRAG).toBe(600)
    expect(TIME_CLOCK_DECAY_BASE_PER_SEC).toBe(0.035)
    expect(TIME_CLOCK_PEAK_SPEED_MIN).toBe(1.5)
    expect(TIME_CLOCK_PEAK_SPEED_MAX).toBe(16)
    expect(TIME_CLOCK_RELEASE_SECONDS_MIN).toBe(16)
    expect(TIME_CLOCK_RELEASE_SECONDS_MAX).toBe(75)
    expect(TIME_CLOCK_RELEASE_DECAY_EXP).toBe(1.6)
    expect(TIME_CLOCK_SPAWN_INTERVAL_MIN).toBe(240)
    expect(TIME_CLOCK_SPAWN_JITTER).toBe(90)
    expect(TIME_CLOCK_MIN_TENSION).toBe(0.05)
  })

  it('turetilen tavan gerginlik ≈ 0.9966 (asla 1 degil)', () => {
    expect(TIME_CLOCK_MAX_TENSION).toBeCloseTo(TIME_CLOCK_MAX_DRAG / (TIME_CLOCK_MAX_DRAG + TIME_CLOCK_STIFFNESS_K), 12)
    expect(TIME_CLOCK_MAX_TENSION).toBeGreaterThan(0.99)
    expect(TIME_CLOCK_MAX_TENSION).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// 2. §2 sonuc tablosu — formullerin urettigi degerler
// ---------------------------------------------------------------------------

interface ClockRow {
  tension: number
  /** §2 tablosundaki hali (karsilastirma icin; formul degeri degil). */
  table: { peak: number; duration: number; energy: number; ratio: number }
  /** §4 formullerinin urettigi deger. */
  expect: { peak: number; duration: number; energy: number; ratio: number }
}

const TABLE_ROWS: ClockRow[] = [
  { tension: 0.25, table: { peak: 3.06, duration: 29.5, energy: 23, ratio: 0.78 }, expect: { peak: 3.3125, duration: 30.75, energy: 27.35, ratio: 0.912 } },
  { tension: 0.5, table: { peak: 5.92, duration: 43.0, energy: 81, ratio: 1.35 }, expect: { peak: 6.626524, duration: 45.5, energy: 98.464, ratio: 1.641 } },
  { tension: 0.8, table: { peak: 10.4, duration: 59.2, energy: 214, ratio: 2.23 }, expect: { peak: 11.875355, duration: 63.2, energy: 264.355, ratio: 2.754 } },
  { tension: 1.0, table: { peak: 16.0, duration: 75.0, energy: 432, ratio: 3.60 }, expect: { peak: 16.0, duration: 75.0, energy: 432.692, ratio: 3.606 } }
]

describe('§2 sonuc tablosu (peak hiz, sure, enerji, oran)', () => {
  for (const row of TABLE_ROWS) {
    it(`gerginlik ${row.tension}: peak ${row.expect.peak}× / sure ${row.expect.duration} sn / enerji +${row.expect.energy} sn / oran ${row.expect.ratio}×`, () => {
      const peak = releasePeakSpeed(row.tension)
      const duration = releaseDuration(row.tension)
      const energy = releaseEnergySeconds(peak, duration)
      const ratio = releaseProfitRatio(row.tension)

      expect(peak).toBeCloseTo(row.expect.peak, 4)
      expect(duration).toBeCloseTo(row.expect.duration, 6)
      expect(energy).toBeCloseTo(row.expect.energy, 2)
      expect(ratio).toBeCloseTo(row.expect.ratio, 2)

      // Enerji tanimi geregi (peak - 1) * duration / (exp + 1) olmali.
      expect(energy).toBeCloseTo(((peak - 1) * duration) / (TIME_CLOCK_RELEASE_DECAY_EXP + 1), 10)
      // Oran = enerji / geri sarilan saniye (§4 tanimi).
      expect(ratio).toBeCloseTo(energy / rewoundSecondsForTension(row.tension), 10)
    })
  }

  it('risk/odul egrisi monoton artar: her satir bir oncekinden karli', () => {
    const ratios = TABLE_ROWS.map((row) => releaseProfitRatio(row.tension))
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeGreaterThan(ratios[i - 1])
    }
    // Tasarimin cekirdegi: az sarma zarar, tam germe buyuk kar.
    expect(ratios[0]).toBeLessThan(1)
    expect(ratios[ratios.length - 1]).toBeGreaterThan(3)
  })

  it('tam germe, kadran penceresinden fazla enerji uretir (bedeli karsilar)', () => {
    const full = releaseEnergySeconds(releasePeakSpeed(1), releaseDuration(1))
    expect(full).toBeGreaterThan(TIME_CLOCK_SPAN_SECONDS)
    // t=1'de bedel tam 120 sn: net kazanc pozitif olmali.
    expect(full - rewoundSecondsForTension(1)).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Gerginlik: hiperbolik doyum + ters fonksiyon
// ---------------------------------------------------------------------------

describe('gerginlik formulleri (hiperbolik yay sertlesmesi)', () => {
  it('drag <= 0 → 0; monoton artar ve doyuma yaklasir', () => {
    expect(tensionFromDrag(0)).toBe(0)
    expect(tensionFromDrag(-50)).toBe(0)
    expect(tensionFromDrag(Number.NaN)).toBe(0)

    let prev = -1
    for (const drag of [0, 1, 2, 5, 10, 25, 50, 100, 250, TIME_CLOCK_MAX_DRAG]) {
      const t = tensionFromDrag(drag)
      expect(t).toBeGreaterThanOrEqual(prev)
      prev = t
    }
    expect(tensionFromDrag(TIME_CLOCK_MAX_DRAG)).toBeCloseTo(TIME_CLOCK_MAX_TENSION, 12)
    expect(tensionFromDrag(1e9)).toBeLessThan(1)
  })

  it('marjinal kazanc azalir (son ceyrekte tur basina gerginlik duser)', () => {
    const first = tensionFromDrag(10) - tensionFromDrag(0)
    const second = tensionFromDrag(20) - tensionFromDrag(10)
    const third = tensionFromDrag(100) - tensionFromDrag(90)
    expect(first).toBeGreaterThan(second)
    expect(second).toBeGreaterThan(third)
    expect(third).toBeGreaterThan(0)
  })

  it('dragFromTension tensionFromDrag ile round-trip yapar (0.1 / 0.5 / 0.9 / 0.98)', () => {
    for (const tension of [0.1, 0.5, 0.9, 0.98]) {
      expect(tensionFromDrag(dragFromTension(tension))).toBeCloseTo(tension, 10)
    }
  })

  it('dragFromTension uclari: 0 → 0, >= 1 → MAX_DRAG', () => {
    expect(dragFromTension(0)).toBe(0)
    expect(dragFromTension(-1)).toBe(0)
    expect(dragFromTension(1)).toBe(TIME_CLOCK_MAX_DRAG)
    expect(dragFromTension(5)).toBe(TIME_CLOCK_MAX_DRAG)
    expect(dragFromTension(TIME_CLOCK_MAX_TENSION)).toBeCloseTo(TIME_CLOCK_MAX_DRAG, 6)
  })

  it('rewoundSecondsForTension dogrusal: tam gerginlik = kadran penceresi', () => {
    expect(rewoundSecondsForTension(0)).toBe(0)
    expect(rewoundSecondsForTension(0.5)).toBe(TIME_CLOCK_SPAN_SECONDS / 2)
    expect(rewoundSecondsForTension(1)).toBe(TIME_CLOCK_SPAN_SECONDS)
    expect(rewoundSecondsForTension(TIME_CLOCK_MAX_TENSION)).toBeLessThan(TIME_CLOCK_SPAN_SECONDS)
  })
})

// ---------------------------------------------------------------------------
// 4. Sonum (yay kendiliginden gevser)
// ---------------------------------------------------------------------------

describe('applyTensionDecay', () => {
  it('gerginligi azaltir, alt sinir 0dir', () => {
    expect(applyTensionDecay(0.5, 1)).toBeCloseTo(0.5 - TIME_CLOCK_DECAY_BASE_PER_SEC * 0.75, 12)
    expect(applyTensionDecay(0.5, 1)).toBeLessThan(0.5)
    expect(applyTensionDecay(0, 10)).toBe(0)
    expect(applyTensionDecay(0.1, 1e6)).toBe(0)
    expect(applyTensionDecay(1, 1e6)).toBe(0)
  })

  it('dt <= 0 veya bozuk girdi gerginligi degistirmez', () => {
    expect(applyTensionDecay(0.4, 0)).toBe(0.4)
    expect(applyTensionDecay(0.4, -5)).toBe(0.4)
    expect(applyTensionDecay(0.4, Number.NaN)).toBe(0.4)
  })

  it('gergin yay daha hizli soner (taban hiz + gerginlige orantili terim)', () => {
    const lowDrop = 0.1 - applyTensionDecay(0.1, 1)
    const highDrop = 0.9 - applyTensionDecay(0.9, 1)
    expect(highDrop).toBeGreaterThan(lowDrop)
    expect(lowDrop).toBeCloseTo(TIME_CLOCK_DECAY_BASE_PER_SEC * 0.55, 12)
    expect(highDrop).toBeCloseTo(TIME_CLOCK_DECAY_BASE_PER_SEC * 0.95, 12)
  })
})

// ---------------------------------------------------------------------------
// 5. Salgi hizi / sure / enerji
// ---------------------------------------------------------------------------

describe('salgi (release) formulleri', () => {
  it('releaseSpeedAt uclari: elapsed 0 → peak, duration → 1, disi kirpilir', () => {
    const peak = releasePeakSpeed(1)
    const duration = releaseDuration(1)
    expect(releaseSpeedAt(peak, 0, duration)).toBeCloseTo(peak, 12)
    expect(releaseSpeedAt(peak, duration, duration)).toBe(1)
    expect(releaseSpeedAt(peak, duration * 3, duration)).toBe(1)
    expect(releaseSpeedAt(peak, -10, duration)).toBeCloseTo(peak, 12)
    expect(releaseSpeedAt(peak, 0, 0)).toBe(1)
    expect(releaseSpeedAt(peak, 0, Number.NaN)).toBe(1)
  })

  it('sonum monoton azalir ve DECAY_EXP sekline uyar', () => {
    const peak = releasePeakSpeed(0.8)
    const duration = releaseDuration(0.8)
    let prev = Number.POSITIVE_INFINITY
    for (const elapsed of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const speed = releaseSpeedAt(peak, elapsed * duration, duration)
      expect(speed).toBeLessThanOrEqual(prev)
      prev = speed
    }
    const halfway = releaseSpeedAt(peak, duration / 2, duration)
    expect(halfway).toBeCloseTo(1 + (peak - 1) * Math.pow(0.5, TIME_CLOCK_RELEASE_DECAY_EXP), 12)
    expect(halfway).toBeGreaterThan(1)
  })

  it('durationFromPeakSpeed, releasePeakSpeedin tersidir', () => {
    for (const tension of [0, 0.25, 0.5, 0.8, 1]) {
      expect(durationFromPeakSpeed(releasePeakSpeed(tension))).toBeCloseTo(releaseDuration(tension), 10)
    }
    expect(durationFromPeakSpeed(0)).toBe(TIME_CLOCK_RELEASE_SECONDS_MIN)
    expect(durationFromPeakSpeed(TIME_CLOCK_PEAK_SPEED_MIN)).toBe(TIME_CLOCK_RELEASE_SECONDS_MIN)
    expect(durationFromPeakSpeed(TIME_CLOCK_PEAK_SPEED_MAX)).toBe(TIME_CLOCK_RELEASE_SECONDS_MAX)
    expect(durationFromPeakSpeed(1e9)).toBe(TIME_CLOCK_RELEASE_SECONDS_MAX)
    expect(durationFromPeakSpeed(Number.NaN)).toBe(TIME_CLOCK_RELEASE_SECONDS_MIN)
  })

  it('releaseProfitRatio: 0.25 net zarar, 1.0 tam germe kârli', () => {
    expect(releaseProfitRatio(0)).toBe(0)
    expect(releaseProfitRatio(0.25)).toBeLessThan(1)
    expect(releaseProfitRatio(1)).toBeGreaterThan(1)
    expect(releaseProfitRatio(1)).toBeGreaterThan(3)
    // Esik: 0.3 civarinda oran 1i gecer (UI kirmizi uyarisi bu bandi isaretler).
    expect(releaseProfitRatio(0.25)).toBeLessThan(releaseProfitRatio(0.3))
    expect(releaseProfitRatio(0.3)).toBeLessThan(releaseProfitRatio(0.35))
  })

  it('releaseEnergySeconds bozuk girdide 0 doner', () => {
    expect(releaseEnergySeconds(1, 100)).toBe(0)
    expect(releaseEnergySeconds(0.5, 100)).toBe(0)
    expect(releaseEnergySeconds(16, 0)).toBe(0)
    expect(releaseEnergySeconds(Number.NaN, 10)).toBe(0)
  })

  it('MIN_TENSION altindaki salgi neredeyse notr ve net zarardir', () => {
    const ratio = releaseProfitRatio(TIME_CLOCK_MIN_TENSION)
    expect(ratio).toBeGreaterThan(0)
    expect(ratio).toBeLessThan(1)
    expect(releasePeakSpeed(TIME_CLOCK_MIN_TENSION)).toBeLessThan(TIME_CLOCK_PEAK_SPEED_MIN + 0.2)
  })

  it('oran egrisi minimuma sahiptir: cok kucuk sarmalar da net zarar bandinda kalir', () => {
    // Matematiksel uyari (rapor edildi): rewound → 0 iken oran tanim geregi
    // buyur (0.0256 / t davranisi), yani "az sarmak zarar" dersi [0.1, 0.35]
    // bandinda gecerlidir. Tasarim bu bandi MIN_TENSION + UI uyarisiyla korur.
    const band = [0.1, 0.15, 0.2, 0.25]
    for (const tension of band) {
      const ratio = releaseProfitRatio(tension)
      expect(ratio).toBeGreaterThan(0)
      expect(ratio).toBeLessThan(1)
    }
    expect(releaseProfitRatio(0.15)).toBeLessThan(releaseProfitRatio(0.25))
    expect(releaseProfitRatio(0.25)).toBeLessThan(releaseProfitRatio(0.35))
    // 0.05 civari dip → zarar, 0.6+ → belirgin kar.
    expect(releaseProfitRatio(TIME_CLOCK_MIN_TENSION)).toBeLessThan(1)
    expect(releaseProfitRatio(0.6)).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// 6. Durum yardimcilari
// ---------------------------------------------------------------------------

describe('createIdleTimeClock / nextClockInterval', () => {
  it('her cagride yeni nesne doner (paylasilan referans yok)', () => {
    const a = createIdleTimeClock()
    const b = createIdleTimeClock()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
    a.drag = 42
    a.phase = 'winding'
    expect(b.drag).toBe(0)
    expect(b.phase).toBe('idle')
  })

  it('notr durum: idle faz, 1× hiz, sifir yay durumu (istatistik tasimaz)', () => {
    const idle = createIdleTimeClock()
    expect(idle.phase).toBe('idle')
    expect(idle.active).toBe(false)
    expect(idle.drag).toBe(0)
    expect(idle.remainingTime).toBe(0)
    expect(idle.speed).toBe(1)
    expect(idle.speedRemaining).toBe(0)
    expect(idle.peakSpeed).toBe(1)
    // Yasam boyu istatistikler PlayerStats'tadir, TimeClockState'te DEGIL.
    expect(Object.keys(idle).sort()).toEqual(
      ['active', 'drag', 'peakSpeed', 'phase', 'remainingTime', 'speed', 'speedRemaining']
    )
  })

  it('nextClockInterval [MIN, MIN + JITTER] bandinda kalir', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 64; i++) {
      const interval = nextClockInterval()
      expect(interval).toBeGreaterThanOrEqual(TIME_CLOCK_SPAWN_INTERVAL_MIN)
      expect(interval).toBeLessThanOrEqual(TIME_CLOCK_SPAWN_INTERVAL_MIN + TIME_CLOCK_SPAWN_JITTER)
      seen.add(interval)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})
