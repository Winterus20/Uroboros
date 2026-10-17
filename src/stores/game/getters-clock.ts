// Zaman Yayi (Time Clock) getter parcasi. `this`, StoreApi ile tiplenmistir.
//
// NOT (onemli): `timeClockProductionMult` BILEREK memoize/cache EDILMEZ. Ayrica
// `_dimMultCache` gibi bir ic-fonksiyon memo'sunun anahtarina da konmaz: saat
// hizi saniyede degisen bir ucucu degerdir ve memo anahtari guncellenmedigi
// surece bayat carpan dondururdu. Burada yalnizca `timeClock.speed` okunur.
import { Decimal } from '../../core/math'
import {
  TIME_CLOCK_SPAN_SECONDS,
  releaseDuration,
  releasePeakSpeed,
  rewoundSecondsForTension,
  tensionFromDrag
} from '../../game/clock-data'
import type { StoreApi } from './store-api'

export const clockGetters = {
    // Yayın gerginliği (0-1): birikmiş çevirme miktarından hiperbolik doyum.
    timeClockTension(this: StoreApi): number {
      return tensionFromDrag(this.timeClock.drag)
    },

    // Bu gerginliğin karşılığı geri sarılan oyun-zamanı (sn).
    timeClockRewoundSeconds(this: StoreApi): number {
      return rewoundSecondsForTension(this.timeClockTension)
    },

    // Aktif zaman hızı çarpanı: YALNIZCA uretime uygulanır (buff/lab/bot saatleri
    // normal akar). idle fazinda speed = 1 oldugu icin notr'dur.
    timeClockProductionMult(this: StoreApi): Decimal {
      return new Decimal(this.timeClock.speed)
    },

    timeClockIsWinding(this: StoreApi): boolean {
      return this.timeClock.phase === 'winding'
    },

    timeClockIsReleasing(this: StoreApi): boolean {
      return this.timeClock.phase === 'released'
    },

    // Akrep acisi (derece): tam gerginlikte -540 (1.5 tam tur geri).
    timeClockHandAngleDeg(this: StoreApi): number {
      return -(this.timeClockRewoundSeconds / TIME_CLOCK_SPAN_SECONDS) * 360 * 1.5
    },

    // Sarma sirasinda tahmin: "su an birakirsan" peak hiz ve salgi suresi.
    timeClockPreviewPeakSpeed(this: StoreApi): number {
      return releasePeakSpeed(this.timeClockTension)
    },

    timeClockPreviewDuration(this: StoreApi): number {
      return releaseDuration(this.timeClockTension)
    }
}
