import { computed, ref } from 'vue'
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
    return 'full'
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

// --- Faz E (E3): tek kaynak indirgenmiş-hareket kapısı ---------------------------
// ADR-0058 NIT'i kapatır: CommentTicker/MusicControls kök-mührü setup'ta bir kez
// okuyor + reaktif modu ayrı okuyordu (iki kaynak). Bu helper ÜÇ kaynağı tek
// computed'da birleştirir: ayar modu + kök mühür + OS tercihi.
// OS terimi kritiktir: ticker marquee scoped CSS'tedir — global
// `@media (prefers-reduced-motion)` onu öldüremez; kapı JS'te olmalıdır.
// Vitest `node` ortamında window/matchMedia yoktur → korumalı (hepsi false).
const osReducedMotion = ref(false)
let osMotionListenerInit = false

function ensureOsMotionListener(): void {
  if (osMotionListenerInit) return
  osMotionListenerInit = true
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  try {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    osReducedMotion.value = query.matches
    const onChange = (e: MediaQueryListEvent): void => {
      osReducedMotion.value = e.matches
    }
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange)
    }
  } catch {
    /* yoksay — kapı kapalı varsayılır */
  }
}

/**
 * Reaktif tek-kaynak kapı: `true` = tam efekt çalıştırma (sadeleş/statik).
 * Okur: `useMotionMode()` (ayar) + `isMotionReduced()` (kök mühür, savunma) +
 * OS `prefers-reduced-motion` (canlı). Sıcak rAF döngülerinde DEĞİL;
 * karar noktalarında (marquee kurulumu, interval seçimi) kullanılır.
 */
export function useMotionReduced(): ComputedRef<boolean> {
  ensureOsMotionListener()
  const mode = useMotionMode()
  return computed<boolean>(() => {
    return mode.value !== 'full' || osReducedMotion.value || isMotionReduced()
  })
}
