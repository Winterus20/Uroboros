import confetti from 'canvas-confetti'

/**
 * Kutlama kapısı — tek doğruluk kaynağı.
 *
 * Kural: sayfa gizliyken (başka tarayıcı sekmesi / minimize) ASLA konfeti yok.
 * canvas-confetti rAF tabanlı olduğu için gizli sekmede birikir ve dönüşte
 * patlama olarak görünür; ayrıca `update()` offline yakalamaya devredilir.
 * Tüm kutlamalar bu fonksiyondan geçmelidir.
 */
export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return false
  return !document.hidden
}

/**
 * Hareket kapısı — 'reduced' / 'off' modunda ya da pil tasarrufunda ağır parçacık kutlaması atlanır.
 * Kök sınıf mührü okunur (useNavigation yazar); core katmanı store'a bağlanmaz.
 * `force` yalnız bilinçli vitrin anları için istisnadır.
 */
function motionAllowsConfetti(): boolean {
  if (typeof document === 'undefined') return false
  const root = document.documentElement
  return (
    !root.classList.contains('motion-off') &&
    !root.classList.contains('reduce-anim') &&
    !root.classList.contains('battery-saver')
  )
}

/** Juice moduna göre parçacık üst tavanı (ekranı parçacık seline boğmaz). */
function getJuiceParticleCap(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const mode = localStorage.getItem('doomscroll-juice-mode')
      if (mode === 'off') return 0
      if (mode === 'low' || mode === 'minimal') return 20
    }
  } catch {
    /* yoksay */
  }
  return 50
}

export interface SafeConfettiOptions extends confetti.Options {
  /** Hareket kısıtını bilinçli olarak aş (yalnız vitrin anları). */
  force?: boolean
}

/** Görünür sayfada konfeti patlatır; gizliyken ya da hareket kısıtlıyken sessizce vazgeçer. */
export function safeConfetti(opts?: SafeConfettiOptions): boolean {
  if (!isPageVisible()) return false
  const { force, ...confettiOpts } = opts ?? {}
  if (!force && !motionAllowsConfetti()) return false
  const cap = getJuiceParticleCap()
  if (!force && cap <= 0) return false
  try {
    const rawCount = confettiOpts.particleCount ?? 35
    const clampedCount = Math.max(1, Math.min(rawCount, cap))
    confetti({ ...confettiOpts, particleCount: clampedCount })
    return true
  } catch {
    return false
  }
}

/**
 * Oyun-içi sekme kapısı.
 * Otomatik olaylar (lab oto-sentezi gibi) yalnızca ilgili sekme açıkken kutlar;
 * yoksa durum yine ilerler, sadece efekt atlanır (rozet/toast kalır).
 */
export function shouldCelebrateOnTab(activeTab: string | null | undefined, requiredTab: string): boolean {
  if (!isPageVisible()) return false
  if (!activeTab) return true
  return activeTab === requiredTab
}
