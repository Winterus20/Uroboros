// ============================================================================
// Balatro Sütun 3 — Taktil Kart Fiziği (Saf Çekirdek)
// Bas-bırak lastik gerilmesi (spring damping) ve komşu itme (push dynamics)
// kararlarının DOM'suz, test edilebilir matematiği.
// DOM uygulaması: core/tilt.ts (tilt sertleştirmesi) + DimensionRow.vue
// (squash/release/push sınıf döngüleri) + style.css keyframe'leri.
// ============================================================================

/** Bırakılış yayı (spring overshoot) süresi — CSS `.card-released` ile senkron. */
export const CARD_RELEASE_MS = 420

/** Komşu itme animasyon süresi — CSS `.card-push-*` ile senkron. */
export const CARD_PUSH_MS = 240

/** Bu süreden yeni bir bas-bırak döngüsü, satın alma geri bildiriminin sahibidir. */
export const PRESS_FEEDBACK_WINDOW_MS = 300

export type CardPushDirection = 'up' | 'down' | null

/** Format kartları D1-D8'dir; bu aralık dışı satır YOKTUR (savunma sınırı). */
export const MIN_DIMENSION_TIER = 1
export const MAX_DIMENSION_TIER = 8

/**
 * Bir boyut satırının, komşu tier satın alındığında hangi yöne itileceği.
 * D1 en üstte olacak şekilde dikey dizilim varsayılır: satın alınanın hemen
 * üstündeki satır yukarı, hemen altındaki satır aşağı açılır. Kendisi, iki
 * adım uzaktaki satırlar ve geçersiz tier aralığı itilmez.
 */
export function pushDirectionFor(tier: number, boughtTier: number): CardPushDirection {
  if (tier < MIN_DIMENSION_TIER || tier > MAX_DIMENSION_TIER) return null
  if (tier === boughtTier - 1) return 'up'
  if (tier === boughtTier + 1) return 'down'
  return null
}

/**
 * Satın alma anında bas-bırak geri bildirimi "taze" mi? Taze ise eski
 * buy-bounce animasyonu bastırılır; squash + yay zaten aynı hissi verir
 * (çift hareket yığılması önlenir). Klavye aktivasyonunda damga 0 kaldığı
 * için bounce serbest kalır.
 */
export function isPressFeedbackFresh(pressReleaseAt: number, now: number): boolean {
  if (!Number.isFinite(pressReleaseAt) || pressReleaseAt <= 0) return false
  const age = now - pressReleaseAt
  return age >= 0 && age < PRESS_FEEDBACK_WINDOW_MS
}
