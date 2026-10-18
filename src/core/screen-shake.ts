/**
 * Ekran Sarsıntısı ve İzolasyon Modülü (ADR-0044 + F3.11).
 *
 * JuiceLayer ve testler tarafından paylaşılan tek üretim kodudur.
 * Sabit arayüz öğelerinin titremesini önlemek için sarsıntı yalnızca
 * hedef içeriğe (örn. #game-main-content) uygulanır.
 */

export type ShakeLevel = 'soft' | 'medium' | 'hard'
export type ShakeClass = 'shake-soft' | 'screen-shake' | 'shake-hard'
export type ShakeLevelInput = ShakeLevel | ShakeClass

export const SHAKE_CLASSES: Record<ShakeLevel, ShakeClass> = {
  soft: 'shake-soft',
  medium: 'screen-shake',
  hard: 'shake-hard'
} as const

export const SHAKE_DURATION_MS: Record<ShakeLevel, number> = {
  soft: 200,
  medium: 250,
  hard: 400
} as const

export const SHAKE_COOLDOWN_MS: Record<ShakeLevel, number> = {
  soft: 600,
  medium: 400,
  hard: 200
} as const

export const ALL_SHAKE_CLASSES: readonly ShakeClass[] = [
  'screen-shake',
  'shake-soft',
  'shake-hard'
] as const

export interface ShakeTarget {
  classList: {
    contains(cls: string): boolean
    add(cls: string): void
    remove(...cls: string[]): void
  }
}

export interface TriggerShakeOptions {
  now?: number
  ignoreCooldown?: boolean
  enabled?: boolean
  durationMs?: number
  target?: ShakeTarget | null
}

export function normalizeShakeLevel(input: ShakeLevelInput): ShakeLevel {
  if (input === 'hard' || input === 'shake-hard') return 'hard'
  if (input === 'soft' || input === 'shake-soft') return 'soft'
  return 'medium'
}

export class ScreenShakeController {
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private lastShakeAt = 0

  constructor(private readonly getTarget?: () => ShakeTarget | null) {}

  public getLastShakeAt(): number {
    return this.lastShakeAt
  }

  public setLastShakeAt(time: number): void {
    this.lastShakeAt = time
  }

  public clear(explicitTarget?: ShakeTarget | null): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    const target = explicitTarget ?? this.getTarget?.()
    if (target) {
      target.classList.remove(...ALL_SHAKE_CLASSES)
    }
  }

  public trigger(
    levelInput: ShakeLevelInput = 'medium',
    options: TriggerShakeOptions = {},
    explicitTarget?: ShakeTarget | null
  ): boolean {
    if (options.enabled === false) {
      return false
    }

    const target = explicitTarget ?? options.target ?? this.getTarget?.()
    if (!target) return false

    const level = normalizeShakeLevel(levelInput)
    const cls = SHAKE_CLASSES[level]
    const ms = options.durationMs ?? SHAKE_DURATION_MS[level]
    const minInterval = SHAKE_COOLDOWN_MS[level]

    const now = options.now ?? Date.now()
    const isUpgradingToHard = level === 'hard' && !target.classList.contains(SHAKE_CLASSES.hard)

    if (!options.ignoreCooldown && now - this.lastShakeAt < minInterval && !isUpgradingToHard) {
      return false
    }
    this.lastShakeAt = now

    const hasHard = target.classList.contains(SHAKE_CLASSES.hard)
    const hasMedium = target.classList.contains(SHAKE_CLASSES.medium)

    // Zaten aynı veya daha üst kademede sarsıntı aktifse: reflow tetiklemek yerine süreyi uzat
    if (
      target.classList.contains(cls) ||
      (cls === SHAKE_CLASSES.soft && (hasMedium || hasHard)) ||
      (cls === SHAKE_CLASSES.medium && hasHard)
    ) {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId)
      }
      this.timeoutId = setTimeout(() => {
        target.classList.remove(...ALL_SHAKE_CLASSES)
        this.timeoutId = null
      }, ms)
      return true
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }

    target.classList.remove(...ALL_SHAKE_CLASSES)
    target.classList.add(cls)

    this.timeoutId = setTimeout(() => {
      target.classList.remove(...ALL_SHAKE_CLASSES)
      this.timeoutId = null
    }, ms)
    return true
  }
}

export const defaultScreenShakeController = new ScreenShakeController()

export function createScreenShakeController(getTarget?: () => ShakeTarget | null): ScreenShakeController {
  return new ScreenShakeController(getTarget)
}

export function triggerScreenShake(
  target: ShakeTarget,
  level: ShakeLevelInput = 'medium',
  options?: TriggerShakeOptions
): boolean {
  return defaultScreenShakeController.trigger(level, options, target)
}
