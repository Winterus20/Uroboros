import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useGameStore } from '../stores/game'

/**
 * Hareket (motion) kontratı — 3 durumlu tek kapı: 'full' | 'reduced' | 'off'.
 *
 * - Reaktif UI/sekme kararları için `useMotionMode()` kullanılır (ayar değişince güncellenir).
 * - rAF / pointerdown gibi sıcak yollarda reaktif olmayan kök-sınıf mührü okunur:
 *   `isMotionReduced()` / `isMotionOff()` — kök sınıfları `useNavigation.syncEffectClasses()`
 *   yazar; `core/tilt.ts` da aynı mührü okur (tek kontrat, ikinci kaynak yok).
 * - Legacy uyum: `motionMode` yoksa `reduceAnimations`'tan türetilir; kayıt migrasyonu
 *   (`actions-save.ts`) eski kayıtlarda iki alanı senkronlar, böylece eski RA okuyucuları
 *   'off' kararını da görür.
 */

export type MotionMode = 'full' | 'reduced' | 'off'

/** Reaktif çözümlenmiş hareket modu (GameplaySettings seçicisiyle aynı formül). */
export function useMotionMode(): ComputedRef<MotionMode> {
  const store = useGameStore()
  return computed<MotionMode>(() => {
    const m = store.settings.motionMode
    if (m === 'full' || m === 'reduced' || m === 'off') return m
    return store.settings.reduceAnimations ? 'reduced' : 'full'
  })
}

/** Kök sınıf mührü: 'off' aktif mi? (reaktif değil — rAF/pointerdown sıcak yolu) */
export function isMotionOff(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('motion-off')
}

/**
 * Kök sınıf mührü: 'reduced' veya 'off' aktif mi? (reaktif değil)
 * "Tam efekti çalıştırma" kapısı: yoğun JS animasyonları bu kontrolle atlanır/sadeleşir.
 * Yalnız 'off' hedefliyorsan `isMotionOff()` kullan.
 */
export function isMotionReduced(): boolean {
  if (typeof document === 'undefined') return false
  const root = document.documentElement
  return root.classList.contains('motion-off') || root.classList.contains('reduce-anim')
}
