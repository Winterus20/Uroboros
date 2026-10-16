import type { Directive } from 'vue'

/**
 * v-tip — Uzun Basış (Long-Press / Hold) Tabanlı Taktil Tooltip Direktifi.
 *
 * Klasik masaüstü "hover" gürültüsünü (ekranı kirleten anlık kutucukları) tamamen engeller.
 * Sadece kullanıcı elemanın üzerine ~380ms basılı tuttuğunda (mouse click-hold veya touch long-press)
 * şık bir Balatro / Cyberpunk cam detay kartı açar.
 *
 * Özellikler:
 * - 380 ms basılı tutma eşiği (yanlışlıkla tıklamaları bozmaz).
 * - >8px parmak/fare hareketi olursa (kaydırma/scroll) anında iptal.
 * - Haptik titreşim desteği (mobil cihazlarda 15ms hafif titreşim).
 * - Sayfa sınırları koruması (ekran dışına taşmaz, otomatik akıllı konumlanır).
 * - Başparmak / fare kalktıktan sonra 1200ms rahat okuma süresi veya dışarı dokununca anında kapanma.
 *
 * Erişilebilirlik (klavye + ekran okuyucu) — mevcut pointer davranışı DEĞİŞMEZ:
 * - Odak (focus) anında açar, odak kaybında (blur) kapanır; hover hâlâ açmaz.
 * - Görünürken konak elemana aria-describedby yazılır, kapanınca kaldırılır.
 *   (Tekil katman, görünümü açan direktif örneğine özel id ile etiketlenir.)
 * - Escape ile kapatılır.
 * - Fare/dokunma kaynaklı odak uzun basma kuralını bozmaz (tıklama anında kutu açılmaz).
 * - Eklenen her dinleyici unmount'ta kaldırılır; 76 örnekte sızıntı olmaz.
 */

interface TipEl extends HTMLElement {
  __tipValue?: string | number | null
  __tipCleanup?: () => void
  __tipInstanceId?: number
}

let tooltipLayer: HTMLDivElement | null = null
let activeHideTimer: number | null = null
let currentActiveEl: HTMLElement | null = null
let isVisible = false
let currentTargetX = 0

// ARIA: katman tekildir ve aynı anda yalnızca bir konak açık olabilir; bu yüzden id,
// görünümü açan direktif örneğine özel üretilir (doomscroll-tooltip-17 gibi).
let instanceSeq = 0
let describedEl: HTMLElement | null = null

function tipIdFor(instanceId: number): string {
  return `doomscroll-tooltip-${instanceId}`
}

/** Konak öğeyi tooltip ile eşleştirir; önceki konaktan ilişkiyi önce temizler. */
function syncDescribedBy(el: HTMLElement, tipId: string): void {
  if (describedEl && describedEl !== el) {
    describedEl.removeAttribute('aria-describedby')
  }
  el.setAttribute('aria-describedby', tipId)
  describedEl = el
}

function clearDescribedBy(el: HTMLElement | null): void {
  if (!el) return
  el.removeAttribute('aria-describedby')
  if (describedEl === el) describedEl = null
}

function ensureLayer(): HTMLDivElement {
  if (!tooltipLayer) {
    tooltipLayer = document.createElement('div')
    tooltipLayer.setAttribute('role', 'tooltip')
    tooltipLayer.id = 'doomscroll-tooltip'
    tooltipLayer.style.cssText = [
      'position: fixed',
      'z-index: 9999',
      'max-width: 290px',
      'min-width: 140px',
      'padding: 8px 12px',
      'border-radius: 12px',
      'background: rgba(12, 15, 24, 0.96)',
      'backdrop-filter: blur(16px)',
      '-webkit-backdrop-filter: blur(16px)',
      'border: 1px solid rgba(168, 85, 247, 0.4)',
      'box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.85), 0 0 16px rgba(168, 85, 247, 0.25)',
      'color: #f1f5f9',
      'font-size: 11px',
      'line-height: 1.45',
      'font-family: "Space Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      'pointer-events: none',
      'opacity: 0',
      'transform: scale(0.95) translateY(4px)',
      'transition: opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1), transform 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
      'will-change: transform, opacity'
    ].join(';')
    document.body.appendChild(tooltipLayer)
  }
  return tooltipLayer
}

function formatTipContent(rawText: string): string {
  // Eğer metin iki parçalıysa (Örn: "D4 Bölünmüş Dikkat: Gece krizi spawn hızı...")
  const colonIndex = rawText.indexOf(':')
  if (colonIndex > 2 && colonIndex < 35) {
    const title = rawText.slice(0, colonIndex).trim()
    const desc = rawText.slice(colonIndex + 1).trim()
    return `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#c084fc;box-shadow:0 0 6px #c084fc;"></span>
        <strong style="color:#e9d5ff;font-size:11.5px;letter-spacing:0.02em;">${escapeHtml(title)}</strong>
      </div>
      <div style="color:#cbd5e1;font-size:10.5px;line-height:1.4;">${escapeHtml(desc)}</div>
    `
  }

  // Standart tek parça metin
  return `
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#38bdf8;box-shadow:0 0 6px #38bdf8;flex-shrink:0;"></span>
      <span style="color:#e2e8f0;font-size:11px;">${escapeHtml(rawText)}</span>
    </div>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Ekran sınırlarını koruyan konumlandırma (yatay merkez + dikey öncelik üstte). */
function positionTooltip(el: HTMLElement, tip: HTMLDivElement, targetX: number): void {
  const tipRect = tip.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()

  // Yatay merkezleme
  let left = targetX - tipRect.width / 2
  left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10))

  // Dikey yerleşim: elemanın üstünde mi altında mı yer var?
  let top: number
  if (elRect.top > tipRect.height + 16) {
    // Üstte göster (öncelikli)
    top = elRect.top - tipRect.height - 8
  } else {
    // Altta göster
    top = elRect.bottom + 8
  }

  // Sayfa alt sınırını aşmasın
  if (top + tipRect.height > window.innerHeight - 8) {
    top = window.innerHeight - tipRect.height - 8
  }
  top = Math.max(8, top)

  tip.style.left = `${Math.round(left)}px`
  tip.style.top = `${Math.round(top)}px`
}

function showTooltip(el: HTMLElement, text: string, targetX: number, instanceId: number): void {
  if (!text) return
  if (activeHideTimer !== null) {
    clearTimeout(activeHideTimer)
    activeHideTimer = null
  }

  const tip = ensureLayer()
  // Örnek kimliği: aynı anda tek konak açık olduğu için id'yi o örneğe bağlıyoruz.
  tip.id = tipIdFor(instanceId)
  tip.innerHTML = formatTipContent(text)
  currentActiveEl = el
  currentTargetX = targetX

  // Görünür kıl
  tip.style.opacity = '1'
  tip.style.transform = 'scale(1) translateY(0)'

  // AT köprüsü: içerik hazır olduğu anda aria-describedby kurulur (kapanınca kaldırılır)
  syncDescribedBy(el, tip.id)
  isVisible = true

  // Boyutları hesapla ve ekran sınırlarını koru
  positionTooltip(el, tip, targetX)
}

function hideTooltip(delay = 0): void {
  if (activeHideTimer !== null) clearTimeout(activeHideTimer)
  // Zamanlayıcı çalışana kadar gösteren konak sabit kalsın (1200ms okuma süresi korunur)
  const hostToClean = currentActiveEl
  activeHideTimer = window.setTimeout(() => {
    if (tooltipLayer) {
      tooltipLayer.style.opacity = '0'
      tooltipLayer.style.transform = 'scale(0.95) translateY(4px)'
    }
    isVisible = false
    clearDescribedBy(hostToClean)
    currentActiveEl = null
    currentTargetX = 0
    activeHideTimer = null
  }, delay)
}

/** Açık tooltip metni değiştiyse (parent yeniden render oldu) içeriği tazeler. */
function refreshTooltip(el: TipEl): void {
  if (!isVisible || currentActiveEl !== el || !tooltipLayer) return
  const text = el.__tipValue ? String(el.__tipValue) : ''
  if (!text) return
  const instanceId = el.__tipInstanceId ?? 0
  tooltipLayer.innerHTML = formatTipContent(text)
  positionTooltip(el, tooltipLayer, currentTargetX)
  syncDescribedBy(el, tipIdFor(instanceId))
}

// Global dışarı tıklama dinleyicisi: ekranda herhangi bir yere dokunulunca hemen kapat
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    if (tooltipLayer && tooltipLayer.style.opacity === '1') {
      const target = e.target as HTMLElement | null
      if (currentActiveEl && !currentActiveEl.contains(target)) {
        hideTooltip(0)
      }
    }
  }, { passive: true })
}

const HOLD_TRIGGER_MS = 380
const CANCEL_MOVE_DISTANCE = 8

// Fare/dokunma ile gelen odak bu süre içinde sayılırsa tooltip açılmaz:
// aksi halde her tıklama anında kutu açılır ve 380ms uzun basma kuralı bozulurdu.
const POINTER_FOCUS_GRACE_MS = 700

function bindLongPressTip(el: TipEl, value: unknown): void {
  el.__tipValue = typeof value === 'string' || typeof value === 'number' ? String(value) : ''

  const instanceId = ++instanceSeq
  el.__tipInstanceId = instanceId

  const getTipText = (): string => {
    return el.__tipValue ? String(el.__tipValue) : ''
  }

  let pressTimer: number | null = null
  let startX = 0
  let startY = 0
  let isHoldTriggered = false
  let lastPointerDownAt = Number.NEGATIVE_INFINITY

  const cancelHold = () => {
    if (pressTimer !== null) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    // Odak kaydı (fare/dokunma) işaretle: klavye ile gelen odak gibi davranılmasın
    lastPointerDownAt = performance.now()

    // Sadece sol tık (mouse button 0) veya dokunmatik ekran
    if (e.button !== 0) return
    const text = getTipText()
    if (!text) return

    startX = e.clientX
    startY = e.clientY
    isHoldTriggered = false

    cancelHold()

    pressTimer = window.setTimeout(() => {
      pressTimer = null
      isHoldTriggered = true

      // Mobil haptik titreşim (destekleniyorsa)
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate(15)
        }
      } catch {
        // yoksay
      }

      showTooltip(el, text, startX, instanceId)
    }, HOLD_TRIGGER_MS)
  }

  // Erişilebilirlik: klavye odağı geldiğinde anında aç (gecikme yok, hover hâlâ açmaz).
  // focusin/focusout kullanılır: konak içindeki odaklanabilir çocuklar da kapsansın.
  const onFocusIn = () => {
    const text = getTipText()
    if (!text) return
    if (performance.now() - lastPointerDownAt < POINTER_FOCUS_GRACE_MS) return
    const rect = el.getBoundingClientRect()
    showTooltip(el, text, rect.left + rect.width / 2, instanceId)
  }

  const onFocusOut = () => {
    // Odak yine konak içindeyse (çocuktan kardeşe geçiş) kapatma
    const next = document.activeElement
    if (next instanceof Node && el.contains(next)) return
    if (currentActiveEl === el) hideTooltip(0)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    // Escape: açık tooltip'i kapat (klavye kullanıcısının çıkış yolu)
    if (e.key !== 'Escape') return
    if (currentActiveEl !== el) return
    hideTooltip(0)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (pressTimer === null && !isHoldTriggered) return
    // Kullanıcı kaydırma (scroll) yapıyorsa iptal et
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY)
    if (dist > CANCEL_MOVE_DISTANCE) {
      cancelHold()
      if (isHoldTriggered) {
        hideTooltip(0)
      }
    }
  }

  const onPointerUp = () => {
    cancelHold()
    if (isHoldTriggered) {
      // Parmağını çektiğinde okumaya fırsat tanı, 1200ms sonra yumuşakça kaybolsun
      hideTooltip(1200)
    }
  }

  const onPointerCancel = () => {
    cancelHold()
    hideTooltip(0)
  }

  const onContextMenu = (e: Event) => {
    // Uzun basma anında mobilde tarayıcı menüsünün ipucunun önüne geçmesini engelle
    if (isHoldTriggered) {
      e.preventDefault()
    }
  }

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove, { passive: true })
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointerleave', onPointerCancel)
  el.addEventListener('pointercancel', onPointerCancel)
  el.addEventListener('contextmenu', onContextMenu)
  el.addEventListener('focusin', onFocusIn)
  el.addEventListener('focusout', onFocusOut)
  el.addEventListener('keydown', onKeyDown)

  el.__tipCleanup = () => {
    cancelHold()
    // Bu örnek ARIA köprüsünün sahibiyse ilişkiyi senkron kaldır (unmount sızıntısı olmasın)
    if (describedEl === el) clearDescribedBy(el)
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointerleave', onPointerCancel)
    el.removeEventListener('pointercancel', onPointerCancel)
    el.removeEventListener('contextmenu', onContextMenu)
    el.removeEventListener('focusin', onFocusIn)
    el.removeEventListener('focusout', onFocusOut)
    el.removeEventListener('keydown', onKeyDown)
  }
}

export const vTip: Directive<TipEl, string | number> = {
  mounted(el, binding) {
    bindLongPressTip(el, binding.value)
  },
  updated(el, binding) {
    const next = typeof binding.value === 'string' || typeof binding.value === 'number' ? String(binding.value) : ''
    const prev = el.__tipValue ? String(el.__tipValue) : ''
    el.__tipValue = next
    // Açık kutu varken metin değiştiyse içeriği tazele (yoksa bayat bilgi görünürdü)
    if (next !== prev) refreshTooltip(el)
  },
  unmounted(el) {
    el.__tipCleanup?.()
    el.__tipCleanup = undefined
    el.__tipInstanceId = undefined
    if (currentActiveEl === el) {
      hideTooltip(0)
    }
  }
}
