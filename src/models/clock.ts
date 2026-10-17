/**
 * Zaman Yayi (Time Clock) tipleri: faz makinesi ve saat durumu.
 * Salt tip dosyasidir; mantik `src/game/clock-data.ts` (saf modul) icindedir.
 */

/** Saatin yasam dongusu: ekranda yok → sariliyor → salgi sonuyor. */
export type TimeClockPhase = 'idle' | 'winding' | 'released'

export interface TimeClockState {
  phase: TimeClockPhase
  /** Saat ekranda mi (yalniz `winding` fazinda true). */
  active: boolean
  /** rad — birikmis cevirme miktari (tek dogruluk kaynagi; gerginlik bundan turetilir). */
  drag: number
  /** sn — `winding` fazinda ekranda kalan sure. */
  remainingTime: number
  /** × — aktif zaman hizi carpani (idle'da 1). */
  speed: number
  /** sn — `released` fazinda kalan salgi suresi. */
  speedRemaining: number
  /** `released` baslangic hizi (UI/ozet icin). */
  peakSpeed: number
}

// Not: yasam boyu istatistikler (geri sarilan saniye / salgi sayisi / en iyi gerginlik)
// BILEREK burada tutulmaz. Bu tip kosuya ozel CANLI durumdur ve `applyResetScope`
// ile sifirlanir; istatistiklerin evi `PlayerStats`'tir (`stats.clockRewinds`,
// `stats.clockRewoundSeconds`, `stats.clockBestTension`) ve prestijden sag cikarlar
// (`stats.anomaliesClicked` deseni).
