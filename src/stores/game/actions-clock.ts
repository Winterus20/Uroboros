// Zaman Yayi (Time Clock) action parcasi. `this`, StoreApi ile tiplenmistir.
//
// Denge sozlesmesi (bkz. brain/scratchpad/time-clock-spec.md §6.3):
//   - bedel geri sarilan saniye ile DOGRUSAL (matter kaybi),
//   - odul yay enerjisi gibi KUADRATIK buyur (peak hiz x sure).
// Bu yuzden az sarmak net zarardir; yay iyice gerilmeden salmak anlamsizdir
// (TIME_CLOCK_MIN_TENSION altinda salmak da YINE salinir — ceza oyuncunun).
import { sounds } from '../../core/audio'
import { D_1 } from '../../core/math'
import {
  TIME_CLOCK_LIFETIME_SECONDS,
  TIME_CLOCK_MAX_DRAG,
  TIME_CLOCK_PERFECT_DURATION_MULT,
  createIdleTimeClock,
  isPerfectRelease,
  isProfitableRelease,
  nextClockInterval,
  releaseDuration,
  releasePeakSpeed,
  streakPeakBonus
} from '../../game/clock-data'
import type { StoreApi } from './store-api'

export const clockActions = {
    /**
     * Saati dogurur (idle -> winding). Zaten ekrandaysa veya faz idle degilse
     * false doner. `clockTimer` sifirlanip bir sonraki aralik yeniden kurulur.
     */
    spawnTimeClock(this: StoreApi): boolean {
      if (this.timeClock.phase !== 'idle' || this.timeClock.active) return false

      this.timeClock.phase = 'winding'
      this.timeClock.active = true
      this.timeClock.remainingTime = TIME_CLOCK_LIFETIME_SECONDS
      this.timeClock.drag = 0
      this.timeClock.speed = 1
      this.timeClock.speedRemaining = 0
      this.timeClock.speedDuration = 0
      this.clockTimer = 0
      this.nextClockInterval = nextClockInterval()
      sounds.playClockSpawn()
      return true
    },

    /**
     * Ibrenin dairesel suruklemesinden gelen aci farkini (rad) yaya aktarir.
     * Sarma = ZAMAN YOLCULUGU: kalinan her oyun-saniyesi kadar kutle GERCEKTEN
     * erir (bugunku matterPerSecond ile olculur). Taban 1'in altina inilmez;
     * `stats.totalMatterProduced` / `stats.highestMatter` monotonist kalir.
     */
    windTimeClock(this: StoreApi, dragDeltaRadians: number): void {
      if (this.timeClock.phase !== 'winding') return
      if (!Number.isFinite(dragDeltaRadians) || dragDeltaRadians <= 0) return

      const prevRewound = this.timeClockRewoundSeconds
      this.timeClock.drag = Math.min(TIME_CLOCK_MAX_DRAG, this.timeClock.drag + dragDeltaRadians)
      const nextRewound = this.timeClockRewoundSeconds
      const deltaRewound = nextRewound - prevRewound
      if (deltaRewound <= 0) return

      // Sarma sirasinda speed = 1 oldugu icin matterPerSecond notr carpanla okunur
      // (timeClockProductionMult = 1) — geri besleme dongusu yok.
      // Taban kurali (§6.3): kutle 1'in altina inmez. Not: `Decimal.max` static'i
      // bu projedeki break_eternity tip yuzeyinde YOK; taban `D_1` ile kurulur.
      const drain = this.matterPerSecond.times(deltaRewound)
      const remaining = this.matter.minus(drain)
      this.matter = remaining.lt(1) ? D_1 : remaining
    },

    /**
     * Yayi birakir (winding -> released): hiz peak degerine firar ve tick
     * dongusunde ustel olarak 1x'e soner. Yasam boyu istatistikler
     * (`stats.clockRewinds` / `clockRewoundSeconds` / `clockBestTension`)
     * burada islenir — `stats` altinda yasadiklari icin prestijden sag cikarlar.
     */
    releaseTimeClock(this: StoreApi): boolean {
      if (this.timeClock.phase !== 'winding') return false

      const tension = this.timeClockTension
      const prevRewound = this.timeClockRewoundSeconds

      // v2 Seri: kârlı salgı seriyi büyütür, zayıf salgı (net zarar) sıfırlar.
      // Seri bonusu tepe hıza çarpan olarak eklenir (tavan +%50).
      const nextStreak = isProfitableRelease(tension) ? this.stats.clockStreak + 1 : 0
      const perfect = isPerfectRelease(tension)

      this.timeClock.peakSpeed = releasePeakSpeed(tension) * streakPeakBonus(nextStreak)
      // v2: salgı süresi ARTIK açıkça taşınır — kusursuz bonusu peak'ten ters
      // çözümle geri getirilemez (durationFromPeakSpeed yalnızca yedek).
      this.timeClock.speedDuration = releaseDuration(tension) * (perfect ? TIME_CLOCK_PERFECT_DURATION_MULT : 1)
      this.timeClock.speedRemaining = this.timeClock.speedDuration
      this.timeClock.phase = 'released'
      this.timeClock.active = false
      this.timeClock.drag = 0
      this.timeClock.speed = this.timeClock.peakSpeed
      this.stats.clockRewinds += 1
      this.stats.clockRewoundSeconds += prevRewound
      if (tension > this.stats.clockBestTension) this.stats.clockBestTension = tension
      this.stats.clockStreak = nextStreak
      if (nextStreak > this.stats.clockBestStreak) this.stats.clockBestStreak = nextStreak
      if (perfect) this.stats.clockPerfectReleases += 1

      sounds.playClockRelease(tension)
      if (perfect) sounds.playClockPerfect()
      return true
    },

    /** Saati tamamen sokup idle'a dondurur (koşu sifirlama / guvenlik). */
    resetTimeClock(this: StoreApi): void {
      this.timeClock = createIdleTimeClock()
      this.clockTimer = 0
    }
}
