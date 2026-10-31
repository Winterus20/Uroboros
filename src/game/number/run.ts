import { D_0, D_10 } from '../../core/math'
import { RING_COUNT } from './tuning'
import type { NumberState } from './economy'

/**
 * Koşu sıfırlama — ADR-0086'nın tek sıfırlama kuralı.
 *
 * Mücadele girişi ve boost satın alımı aynı şeyi yapar: sayı 10'a, zincir sıfıra,
 * kilitler yalnız Fingers'a döner. Sayı ve zincir DIŞINDA hiçbir şey kaybolmaz:
 * bestNumber (hayat boyu zirve), totalBuys, playTime, Tanım, kapı mandalı,
 * tamamlanmış mücadeleler ve boost sayısı korunur.
 *
 * Aktif mücadele alanlarına DOKUNMAZ: çağıran taraf (mücadele girişi) resetten
 * sonra kendi örtüsünü kurar; boost ise yalnız mücadele yokken satın alınabilir.
 */
export function resetRun(state: NumberState): void {
  state.number = D_10
  for (const ring of state.rings) {
    ring.amount = D_0
    ring.bought = 0
  }
  for (let i = 0; i < RING_COUNT; i++) state.unlocked[i] = i === 0
  state.challenges.lastBuyAt = state.playTime ?? 0
  state.challenges.lastBoughtRing = -1
}
