import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ScreenShakeController,
  SHAKE_CLASSES,
  SHAKE_COOLDOWN_MS,
  SHAKE_DURATION_MS,
  ALL_SHAKE_CLASSES,
  normalizeShakeLevel,
  type ShakeTarget
} from './screen-shake'

describe('Screen Shake ve Sabit Arayüz İzolasyonu (ADR-0044 + F3.11)', () => {
  let mockElement: ShakeTarget

  beforeEach(() => {
    vi.useFakeTimers()
    const classes = new Set<string>()
    mockElement = {
      classList: {
        contains: (cls: string) => classes.has(cls),
        add: (cls: string) => classes.add(cls),
        remove: (...clss: string[]) => clss.forEach((c) => classes.delete(c))
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sabitler sözleşmeye uygun tanımlanmıştır', () => {
    expect(SHAKE_CLASSES.soft).toBe('shake-soft')
    expect(SHAKE_CLASSES.medium).toBe('screen-shake')
    expect(SHAKE_CLASSES.hard).toBe('shake-hard')

    expect(SHAKE_DURATION_MS.soft).toBe(200)
    expect(SHAKE_DURATION_MS.medium).toBe(250)
    expect(SHAKE_DURATION_MS.hard).toBe(400)

    expect(SHAKE_COOLDOWN_MS.soft).toBe(600)
    expect(SHAKE_COOLDOWN_MS.medium).toBe(400)
    expect(SHAKE_COOLDOWN_MS.hard).toBe(200)

    expect(ALL_SHAKE_CLASSES).toContain('screen-shake')
    expect(ALL_SHAKE_CLASSES).toContain('shake-soft')
    expect(ALL_SHAKE_CLASSES).toContain('shake-hard')

    expect(normalizeShakeLevel('shake-soft')).toBe('soft')
    expect(normalizeShakeLevel('screen-shake')).toBe('medium')
    expect(normalizeShakeLevel('shake-hard')).toBe('hard')
  })

  it('sarsıntı aktifken gelen ardışık yumuşak sarsıntılar sınıfı silip tekrar eklemeden süreyi uzatır', () => {
    const controller = new ScreenShakeController(() => mockElement)

    // İlk sarsıntı
    controller.trigger('shake-soft', { ignoreCooldown: true })
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // 50ms sonra tekrar tetiklendiğinde sınıf silinmemeli
    vi.advanceTimersByTime(50)
    controller.trigger('shake-soft', { ignoreCooldown: true })
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // Toplam 200ms dolduğunda hâlâ aktif olmalı (çünkü 50ms'de yenilendi, bitiş 250ms)
    vi.advanceTimersByTime(160)
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // 250ms'de tamamen temizlenmeli
    vi.advanceTimersByTime(50)
    expect(mockElement.classList.contains('shake-soft')).toBe(false)
  })

  it('yumuşak sarsıntı aktifken sert sarsıntı geldiğinde sınıf yükseltilir', () => {
    const controller = new ScreenShakeController(() => mockElement)

    // Yumuşak başla (200ms)
    controller.trigger('shake-soft', { durationMs: 200 })
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // Sert gelince yüksel (400ms)
    controller.trigger('shake-hard', { durationMs: 400 })
    expect(mockElement.classList.contains('shake-soft')).toBe(false)
    expect(mockElement.classList.contains('shake-hard')).toBe(true)

    // 400ms sonra temizlen
    vi.advanceTimersByTime(400)
    expect(mockElement.classList.contains('shake-hard')).toBe(false)
  })

  it('ekran sarsıntısı ayarı kapalıyken (screenShake: false) hiçbir sınıf eklenmez', () => {
    const controller = new ScreenShakeController(() => mockElement)
    const result = controller.trigger('screen-shake', { enabled: false })
    expect(result).toBe(false)
    expect(mockElement.classList.contains('screen-shake')).toBe(false)
  })

  it('anti-spam koruması hızlı ardışık sarsıntılarda minimum aralık dolmadan tetiklemeyi önler', () => {
    const controller = new ScreenShakeController(() => mockElement)

    // İlk sarsıntı başarılı
    const t1 = controller.trigger('shake-soft', { now: 1000 })
    expect(t1).toBe(true)
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // 200ms sonra gelen sarsıntı engellenir (bot döngüsü koruması: soft minInterval 600ms)
    const t2 = controller.trigger('shake-soft', { now: 1200 })
    expect(t2).toBe(false)

    // 700ms sonra gelen sarsıntı kabul edilir (1700 - 1000 = 700 >= 600ms)
    const t3 = controller.trigger('shake-soft', { now: 1700 })
    expect(t3).toBe(true)
  })

  it('clear() çağrısı zamanlayıcıyı iptal eder ve sarsıntı sınıflarını temizler', () => {
    const controller = new ScreenShakeController(() => mockElement)
    controller.trigger('shake-hard')
    expect(mockElement.classList.contains('shake-hard')).toBe(true)

    controller.clear()
    expect(mockElement.classList.contains('shake-hard')).toBe(false)

    // Zamanlayıcı iptal edilmiş olmalı
    vi.advanceTimersByTime(500)
    expect(mockElement.classList.contains('shake-hard')).toBe(false)
  })
})
