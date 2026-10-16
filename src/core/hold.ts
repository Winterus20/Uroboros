import type { Directive } from 'vue'

// QoL: basılı tutunca tekrarlayan buton direktifi.
// v-hold="fn" — ilk 400 ms bekleme, ardından 100 ms aralıkla fn() çağrılır.
// Uzun basmada mobil tarayıcı bağlam menüsü de bastırılır.
interface HoldEl extends HTMLElement {
  __holdCleanup?: () => void
  __vHoldCallback?: (e?: PointerEvent) => void
}

const HOLD_DELAY_MS = 400
const HOLD_REPEAT_MS = 100

export const vHold: Directive<HoldEl, (e?: PointerEvent) => void> = {
  mounted(el, binding) {
    el.__vHoldCallback = binding.value
    let delayTimer: number | undefined
    let repeatTimer: number | undefined

    const stop = () => {
      if (delayTimer !== undefined) {
        clearTimeout(delayTimer)
        delayTimer = undefined
      }
      if (repeatTimer !== undefined) {
        clearInterval(repeatTimer)
        repeatTimer = undefined
      }
    }

    const start = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (repeatTimer !== undefined || delayTimer !== undefined) return
      e.preventDefault()
      delayTimer = window.setTimeout(() => {
        delayTimer = undefined
        el.__vHoldCallback?.(e)
        repeatTimer = window.setInterval(() => el.__vHoldCallback?.(), HOLD_REPEAT_MS)
      }, HOLD_DELAY_MS)
    }

    const suppressMenu = (e: Event) => {
      if (delayTimer !== undefined || repeatTimer !== undefined) e.preventDefault()
    }

    el.addEventListener('pointerdown', start)
    el.addEventListener('pointerup', stop)
    el.addEventListener('pointerleave', stop)
    el.addEventListener('pointercancel', stop)
    el.addEventListener('contextmenu', suppressMenu)

    el.__holdCleanup = () => {
      stop()
      el.removeEventListener('pointerdown', start)
      el.removeEventListener('pointerup', stop)
      el.removeEventListener('pointerleave', stop)
      el.removeEventListener('pointercancel', stop)
      el.removeEventListener('contextmenu', suppressMenu)
    }
  },
  updated(el, binding) {
    el.__vHoldCallback = binding.value
  },
  unmounted(el) {
    el.__holdCleanup?.()
    el.__holdCleanup = undefined
    el.__vHoldCallback = undefined
  }
}
