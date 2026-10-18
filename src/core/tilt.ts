import type { Directive } from 'vue'

// ============================================================================
// Balatro / Simon Goellner 3D Card Tilt Directive (v-tilt)
// Donanım hızlandırmalı (rAF), reflow yapmayan, CSS custom properties tabanlı
// 3D perspektif ve dinamik ışık yansıtma motoru.
//
// Faz 0 Taktil Cila (Sütun 3) sertleştirmeleri:
// - `updated` kancası: `disabled` seçeneği canlı uygulanır (remount beklemez).
// - Dokunmatik koruması: `pointerType === 'touch'` tilt'i tetiklemez (mobil
//   kaydırma sırasında oluşan tilt jank'ı önlenir; mobilde bas-bırak gerilme
//   geri bildirimi CSS `.card-squash` katmanıyla verilir).
// - Yay bırakışı: overshoot'lu bezier ile fiziksel "geri oturma" hissi.
// - Merkezi hareket kontratı: `.reduce-anim` / `.motion-off` kök sınıfları
//   (useNavigation senkronu) ve OS `prefers-reduced-motion` etkileşim anında
//   okunur; ayar değişimi sayfa yenilemeden etkili olur.
// ============================================================================

export interface TiltOptions {
  max?: number // Maksimum eğilme açısı (varsayılan: 8deg)
  scale?: number // Büyütme katsayısı (varsayılan: 1.015)
  glare?: boolean // Işık koordinatlarını (--pointer-x, --pointer-y) hesapla
  reverse?: boolean // Eğim yönünü tersine çevir
  disabled?: boolean // Direktifi devre dışı bırak
}

interface TiltEl extends HTMLElement {
  __tiltCleanup?: () => void
}

/** Bırakılışta yay (spring overshoot) — tilt'in "geri oturma" fizik hissi. */
const TILT_RELEASE_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const TILT_RELEASE_MS = 500

/** Oyun içi hareket kısıtları ya da OS tercihi tilt'i engelliyor mu? */
function motionBlocked(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true
  const root = document.documentElement.classList
  // useNavigation.ts kök elemana .reduce-anim (OS prefers-reduced-motion dahil), .motion-off ve .battery-saver damgalar.
  if (root.contains('motion-off') || root.contains('reduce-anim') || root.contains('battery-saver')) {
    return true
  }
  // Kök sınıflar henüz damgalanmadıysa (erken bağlama) OS tercihine geri dön:
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function parseOptions(binding: { value: TiltOptions | boolean | undefined }): TiltOptions {
  const value = binding.value
  if (typeof value === 'object' && value !== null) {
    return value
  }
  if (value === false) {
    return { disabled: true }
  }
  return {}
}

function resetTiltStyles(el: TiltEl) {
  el.style.setProperty('--pointer-x', '50%')
  el.style.setProperty('--pointer-y', '50%')
  el.style.setProperty('--tilt-rx', '0deg')
  el.style.setProperty('--tilt-ry', '0deg')
  el.style.setProperty('--pointer-angle', '0deg')
  el.style.setProperty('--pointer-from-center', '0')
  el.style.transform = ''
  el.style.transition = ''
}

function attachTilt(el: TiltEl, options: TiltOptions) {
  const maxTilt = options.max ?? 8
  const scale = options.scale ?? 1.015
  const reverse = options.reverse ? -1 : 1

  let rafId: number | null = null
  let targetX = 0.5
  let targetY = 0.5
  let isHovering = false

  el.style.setProperty('--pointer-x', '50%')
  el.style.setProperty('--pointer-y', '50%')
  el.style.setProperty('--tilt-rx', '0deg')
  el.style.setProperty('--tilt-ry', '0deg')
  el.style.setProperty('--pointer-angle', '0deg')
  el.style.setProperty('--pointer-from-center', '0')

  const updateTilt = () => {
    if (!isHovering) {
      el.style.setProperty('--pointer-x', '50%')
      el.style.setProperty('--pointer-y', '50%')
      el.style.setProperty('--tilt-rx', '0deg')
      el.style.setProperty('--tilt-ry', '0deg')
      el.style.setProperty('--pointer-from-center', '0')
      el.style.transform = ''
      rafId = null
      return
    }

    const dx = targetX - 0.5
    const dy = targetY - 0.5
    const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2)

    const rx = (dy * maxTilt * -1 * reverse).toFixed(2)
    const ry = (dx * maxTilt * reverse).toFixed(2)

    // Açı hesabı (derece cinsinden: 0 - 360)
    const rad = Math.atan2(dy, dx)
    const deg = (((rad * 180) / Math.PI + 360 + 90) % 360).toFixed(1)

    el.style.setProperty('--pointer-x', `${(targetX * 100).toFixed(1)}%`)
    el.style.setProperty('--pointer-y', `${(targetY * 100).toFixed(1)}%`)
    el.style.setProperty('--tilt-rx', `${rx}deg`)
    el.style.setProperty('--tilt-ry', `${ry}deg`)
    el.style.setProperty('--pointer-angle', `${deg}deg`)
    el.style.setProperty('--pointer-from-center', dist.toFixed(3))

    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(${scale}, ${scale}, 1)`
    rafId = null
  }

  const onPointerMove = (e: PointerEvent) => {
    // Dokunmatik: tilt hover metaforudur; parmak kaydırırken tetiklenmez.
    if (e.pointerType === 'touch') return
    if (motionBlocked()) {
      // Ayarlar hover sırasında değiştiyse tilt'i anında geri oturt.
      if (isHovering) {
        isHovering = false
        el.style.transition = 'transform 0.2s ease-out'
        if (!rafId) rafId = requestAnimationFrame(updateTilt)
      }
      return
    }

    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const clientX = e.clientX
    const clientY = e.clientY

    targetX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    targetY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    isHovering = true

    if (!rafId) {
      rafId = requestAnimationFrame(updateTilt)
    }
  }

  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (motionBlocked()) return
    isHovering = true
    el.style.transition = 'transform 0.12s ease-out'
  }

  const onPointerLeave = () => {
    if (!isHovering && !el.style.transform) return
    isHovering = false
    el.style.transition = `transform ${TILT_RELEASE_MS}ms ${TILT_RELEASE_EASING}`
    if (!rafId) {
      rafId = requestAnimationFrame(updateTilt)
    }
  }

  el.addEventListener('pointerenter', onPointerEnter, { passive: true })
  el.addEventListener('pointermove', onPointerMove, { passive: true })
  el.addEventListener('pointerleave', onPointerLeave, { passive: true })
  el.addEventListener('pointercancel', onPointerLeave, { passive: true })

  el.__tiltCleanup = () => {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
    el.removeEventListener('pointerenter', onPointerEnter)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerleave', onPointerLeave)
    el.removeEventListener('pointercancel', onPointerLeave)
    resetTiltStyles(el)
  }
}

export const vTilt: Directive<TiltEl, TiltOptions | boolean | undefined> = {
  mounted(el, binding) {
    const options = parseOptions(binding)
    if (!options.disabled) attachTilt(el, options)
  },
  // `disabled` canlı değişir (örn. Ayarlar → Holo Kartlar): remount beklemeden
  // bağlan/çöz. Seçeneklerin diğer alanları yaşam boyunca sabit varsayılır.
  updated(el, binding) {
    const options = parseOptions(binding)
    const attached = typeof el.__tiltCleanup === 'function'
    if (options.disabled && attached) {
      el.__tiltCleanup?.()
      el.__tiltCleanup = undefined
    } else if (!options.disabled && !attached) {
      attachTilt(el, options)
    }
  },
  unmounted(el) {
    el.__tiltCleanup?.()
    el.__tiltCleanup = undefined
  }
}
