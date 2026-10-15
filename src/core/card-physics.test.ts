import { describe, it, expect } from 'vitest'
import {
  pushDirectionFor,
  isPressFeedbackFresh,
  PRESS_FEEDBACK_WINDOW_MS,
  CARD_PUSH_MS,
  CARD_RELEASE_MS
} from './card-physics'

describe('Balatro Sütun 3 — kart fiziği saf çekirdeği', () => {
  it('komşu satırlar doğru yöne itilir, uzak satırlar itilmez', () => {
    // Kendisi itilmez
    expect(pushDirectionFor(3, 3)).toBeNull()
    // Hemen üstündeki satır (küçük tier) yukarı açılır
    expect(pushDirectionFor(2, 3)).toBe('up')
    // Hemen altındaki satır (büyük tier) aşağı açılır
    expect(pushDirectionFor(4, 3)).toBe('down')
    // İki adım uzaktakiler sabit kalır
    expect(pushDirectionFor(1, 3)).toBeNull()
    expect(pushDirectionFor(5, 3)).toBeNull()
  })

  it('D1/D8 sınırlarında taşma yok', () => {
    expect(pushDirectionFor(1, 2)).toBe('up')
    expect(pushDirectionFor(0, 1)).toBeNull()
    expect(pushDirectionFor(8, 7)).toBe('down')
    expect(pushDirectionFor(9, 8)).toBeNull()
  })

  it('bas-bırak geri bildirimi yalnız pencere içinde taze sayılır', () => {
    // Hiç basılmadı (klavye aktivasyonu) → taze değil, eski bounce serbest
    expect(isPressFeedbackFresh(0, 1000)).toBe(false)
    expect(isPressFeedbackFresh(Number.NaN, 1000)).toBe(false)
    // Aynı anda bırakıldı → taze
    expect(isPressFeedbackFresh(1000, 1000)).toBe(true)
    // Pencere bitmeden → taze
    expect(isPressFeedbackFresh(1000, 1000 + PRESS_FEEDBACK_WINDOW_MS - 1)).toBe(true)
    // Pencere doldu → taze değil
    expect(isPressFeedbackFresh(1000, 1000 + PRESS_FEEDBACK_WINDOW_MS)).toBe(false)
    // Gelecekten gelen damga (saat kayması) taze sayılmaz
    expect(isPressFeedbackFresh(2000, 1000)).toBe(false)
  })

  it('yay bırakışı itme animasyonundan uzun sürer (fiziksel öncelik)', () => {
    expect(CARD_RELEASE_MS).toBeGreaterThan(CARD_PUSH_MS)
    expect(CARD_PUSH_MS).toBeGreaterThan(0)
    expect(PRESS_FEEDBACK_WINDOW_MS).toBeGreaterThan(0)
  })
})
