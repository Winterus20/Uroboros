import { describe, expect, it } from 'vitest'

import {
  FEATURE_UNLOCKS,
  buildUnlockContext,
  checkUnlock,
  checkVisibility,
  getFeatureById,
  lifetimeUnlockDopamine,
  meetsDopamineGate,
  nextLocked,
  raisedLifetimePeak,
  unlockProgress,
  unlockProgressFraction
} from './unlocks'
import { isSpineFeature } from './branches'
import { ACHIEVEMENTS } from './achievements'
import { createFreshStore } from '../test/helpers'
import {
  FORMAT_UNLOCK_BUFF_MULT,
  FORMAT_UNLOCK_BUFF_SECONDS,
  TIER_IDENTITIES,
  formatUnlockBuffMult,
  getTierIdentity,
  tierAnomalyRateMult,
  tierClickSyncCapBonus,
  tierOfflineSimMult,
  tierProductionMult,
  tierShiftReqMult,
  tierSlackerLeechMult
} from './dimension_identity'
import { Decimal } from '../core/math'
import type {
  FeatureUnlock,
  UnlockContext,
  UnlockReq
} from './unlocks'
import type { TierPassiveKind } from './dimension_identity'

/** Compile-time exhaustive mirror of the `UnlockReq` union. */
const UNLOCK_REQ_KINDS: Record<UnlockReq['kind'], true> = {
  dimBought: true,
  dopamine: true,
  shifts: true,
  galaxies: true,
  singularities: true,
  anomalies: true,
  spellsCast: true
}

const COUNT_REQ_KINDS = [
  'shifts',
  'galaxies',
  'singularities',
  'anomalies',
  'spellsCast'
] as const

const ALL_IDS: readonly string[] = FEATURE_UNLOCKS.map((f) => f.id)
// P3.1: "tamamlanmış" bağlam, başarım kapılı dalları da kapsar.
const ALL_ACHIEVEMENT_IDS: readonly string[] = ACHIEVEMENTS.map((a) => a.id)
const DIMENSION_TIER_COUNT = TIER_IDENTITIES.length

/** The degenerate context a brand-new (or half-migrated) save produces. */
function emptyContext(): UnlockContext {
  return {
    matter: new Decimal(0),
    dimensions: [],
    dimensionShifts: 0,
    galaxies: 0,
    singularities: 0,
    spellsCast: 0,
    anomaliesClicked: 0
  }
}

/** A late-game context where every ladder rung is satisfied at once. */
function saturatedContext(): UnlockContext {
  return {
    matter: new Decimal('1e310'),
    dimensions: Array.from({ length: DIMENSION_TIER_COUNT }, () => ({
      amount: new Decimal('1e100'),
      bought: 10_000
    })),
    dimensionShifts: 50,
    galaxies: 10,
    singularities: 20,
    spellsCast: 50,
    anomaliesClicked: 500,
    // P3.1: "her basamak açık" hâli başarım kapılı dalları da kapsar.
    achievements: ALL_ACHIEVEMENT_IDS
  }
}

describe('feature unlock ladder', () => {
  it('has unique, non-empty ids and unique positive integer orders', () => {
    const ids = new Set<string>()
    const orders = new Set<number>()
    for (const f of FEATURE_UNLOCKS) {
      expect(typeof f.id).toBe('string')
      expect(f.id.trim()).not.toBe('')
      expect(ids.has(f.id)).toBe(false)
      ids.add(f.id)
      expect(Number.isInteger(f.order)).toBe(true)
      expect(f.order).toBeGreaterThan(0)
      // Ties would make nextLocked()'s choice arbitrary.
      expect(orders.has(f.order)).toBe(false)
      orders.add(f.order)
    }
    expect(ids.size).toBe(FEATURE_UNLOCKS.length)
    expect(ALL_IDS.length).toBeGreaterThan(0)
  })

  it('declares orders in strictly ascending ladder order', () => {
    FEATURE_UNLOCKS.forEach((f, index) => {
      if (index === 0) return
      expect(f.order).toBeGreaterThan(FEATURE_UNLOCKS[index - 1].order)
    })
  })

  it('gives every entry non-empty name and hint text', () => {
    for (const f of FEATURE_UNLOCKS) {
      expect(typeof f.name).toBe('string')
      expect(f.name.trim()).not.toBe('')
      expect(typeof f.hint).toBe('string')
      expect(f.hint.trim()).not.toBe('')
    }
  })

  it('uses only declared UnlockReq kinds', () => {
    const declared = Object.keys(UNLOCK_REQ_KINDS)
    for (const f of FEATURE_UNLOCKS) {
      expect(declared.includes(f.req.kind)).toBe(true)
      expect(f.req).toBeDefined()
    }
  })

  it('asks for a positive integer on every count-based requirement', () => {
    for (const f of FEATURE_UNLOCKS) {
      const req = f.req
      if (req.kind === 'dopamine') {
        expect(new Decimal(req.amount).isNan()).toBe(false)
        expect(new Decimal(req.amount).gt(0)).toBe(true)
        continue
      }
      if (req.kind === 'dimBought') {
        expect(Number.isInteger(req.count)).toBe(true)
        expect(req.count).toBeGreaterThan(0)
        expect(Number.isInteger(req.tier)).toBe(true)
        expect(req.tier).toBeGreaterThanOrEqual(1)
        expect(req.tier).toBeLessThanOrEqual(DIMENSION_TIER_COUNT)
        continue
      }
      const kind = req.kind as (typeof COUNT_REQ_KINDS)[number]
      expect(COUNT_REQ_KINDS.includes(kind)).toBe(true)
      expect(Number.isInteger(req.count)).toBe(true)
      expect(req.count).toBeGreaterThan(0)
    }
  })

  it('keeps each dimBought hint consistent with the tier it actually gates on', () => {
    for (const f of FEATURE_UNLOCKS) {
      if (f.req.kind !== 'dimBought') continue
      expect(f.hint).toContain(`D${f.req.tier}`)
      expect(f.hint).toContain(String(f.req.count))
    }
  })

  it('keeps features that share a requirement distinguishable', () => {
    // stance_spam / stance_private deliberately share one requirement.
    const byReq = new Map<string, FeatureUnlock[]>()
    for (const f of FEATURE_UNLOCKS) {
      const key = JSON.stringify(f.req)
      byReq.set(key, [...(byReq.get(key) ?? []), f])
    }
    for (const group of byReq.values()) {
      if (group.length < 2) continue
      expect(new Set(group.map((f) => f.id)).size).toBe(group.length)
      expect(new Set(group.map((f) => f.name)).size).toBe(group.length)
      expect(new Set(group.map((f) => f.order)).size).toBe(group.length)
    }
  })

  it('resolves known ids and returns null otherwise', () => {
    for (const f of FEATURE_UNLOCKS) {
      expect(getFeatureById(f.id)).toEqual(f)
    }
    expect(getFeatureById('not_a_feature')).toBeNull()
    expect(getFeatureById('')).toBeNull()
  })
})

describe('checkUnlock / unlockProgress against an empty context', () => {
  it('never throws and reports everything as locked', () => {
    const ctx = emptyContext()
    for (const f of FEATURE_UNLOCKS) {
      let unlocked: boolean | undefined
      expect(() => {
        unlocked = checkUnlock(ctx, f)
      }).not.toThrow()
      expect(unlocked).toBe(false)
      expect(typeof unlocked).toBe('boolean')
    }
  })

  it('reports zero progress against a target rather than throwing', () => {
    const ctx = emptyContext()
    for (const f of FEATURE_UNLOCKS) {
      let progress: { current: number; target: number } | undefined
      expect(() => {
        progress = unlockProgress(ctx, f)
      }).not.toThrow()
      expect(progress).toBeDefined()
      expect(progress?.current).toBe(0)
      expect(progress?.target).toBeGreaterThan(0)
    }
  })

  it('survives missing dimension rows (old saves with a short dimensions array)', () => {
    const ctx = emptyContext()
    for (const f of FEATURE_UNLOCKS) {
      if (f.req.kind !== 'dimBought') continue
      expect(() => checkUnlock(ctx, f)).not.toThrow()
      expect(checkUnlock(ctx, f)).toBe(false)
      const progress = unlockProgress(ctx, f)
      expect(progress.current).toBe(0)
      expect(progress.target).toBe(f.req.count)
    }
  })

  it('survives a NaN Dopamin counter without throwing', () => {
    const ctx: UnlockContext = { ...emptyContext(), matter: new Decimal(Number.NaN) }
    expect(ctx.matter.isNan()).toBe(true)
    for (const f of FEATURE_UNLOCKS) {
      expect(() => checkUnlock(ctx, f)).not.toThrow()
      expect(typeof checkUnlock(ctx, f)).toBe('boolean')
      // Gates that never read `matter` must stay locked on a corrupted save.
      if (f.req.kind !== 'dopamine') expect(checkUnlock(ctx, f)).toBe(false)
    }
  })

  it('nextLocked returns the first ladder rung instead of throwing', () => {
    const ctx = emptyContext()
    let next: FeatureUnlock | null | undefined
    expect(() => {
      next = nextLocked(ctx, new Set())
    }).not.toThrow()
    expect(next).not.toBeNull()
    expect(next?.id).toBe('crisis_spawn')
    expect(next?.order).toBe(Math.min(...FEATURE_UNLOCKS.map((f) => f.order)))
  })
})

describe('checkUnlock / unlockProgress consistency', () => {
  it('agrees that the full ladder is open', () => {
    const ctx = saturatedContext()
    for (const f of FEATURE_UNLOCKS) {
      expect(checkUnlock(ctx, f)).toBe(true)
      const progress = unlockProgress(ctx, f)
      expect(progress.current).toBe(progress.target)
    }
  })

  it('treats "progress >= target" exactly like checkUnlock', () => {
    const contexts: UnlockContext[] = [emptyContext(), saturatedContext()]
    for (const ctx of contexts) {
      for (const f of FEATURE_UNLOCKS) {
        const { current, target } = unlockProgress(ctx, f)
        expect(checkUnlock(ctx, f)).toBe(current >= target)
      }
    }
  })

  it('clamps progress into 0..target on a saturated context', () => {
    const ctx = saturatedContext()
    for (const f of FEATURE_UNLOCKS) {
      const { current, target } = unlockProgress(ctx, f)
      expect(current).toBeGreaterThanOrEqual(0)
      expect(current).toBeLessThanOrEqual(target)
    }
  })

  it('keeps dopamine progress finite on the 1e160 rung', () => {
    const f = FEATURE_UNLOCKS.find((x) => x.id === 'guilt_slackers')
    expect(f).toBeDefined()
    if (!f) return
    const progress = unlockProgress(emptyContext(), f)
    expect(Number.isFinite(progress.current)).toBe(true)
    expect(Number.isFinite(progress.target)).toBe(true)
    expect(progress.target).toBe(1e160)
    const mid = unlockProgress({ ...emptyContext(), matter: new Decimal('1e12') }, f)
    expect(mid.current).toBe(1e12)
    expect(mid.current).toBeLessThan(mid.target)
  })

  it('is an off-by-one boundary check on count requirements', () => {
    const f = FEATURE_UNLOCKS.find((x) => x.id === 'spell_espresso')
    expect(f).toBeDefined()
    if (!f || f.req.kind !== 'spellsCast') return
    expect(checkUnlock({ ...emptyContext(), spellsCast: 1 }, f)).toBe(false)
    expect(checkUnlock({ ...emptyContext(), spellsCast: 2 }, f)).toBe(true)
    expect(checkUnlock({ ...emptyContext(), spellsCast: 3 }, f)).toBe(true)
  })
})

describe('nextLocked', () => {
  it('returns null when the whole ladder is open', () => {
    expect(nextLocked(saturatedContext(), new Set())).toBeNull()
  })

  it('returns null when everything is already on the unlocked list', () => {
    expect(nextLocked(emptyContext(), new Set(ALL_IDS))).toBeNull()
  })

  it('picks the lowest-order rung that is both unlisted and unmet', () => {
    const unlocked = new Set<string>(['crisis_spawn'])
    const next = nextLocked(emptyContext(), unlocked)
    expect(next?.id).toBe('autobuyers')
    expect(next?.order).toBe(FEATURE_UNLOCKS[1].order)
  })

  it('skips rungs whose condition is already met even if unlisted', () => {
    // crisis_spawn (1e3) and autobuyers (1e12) both satisfied; they are still
    // absent from `unlockedIds`, so the ladder must move past them.
    const next = nextLocked(
      { ...emptyContext(), matter: new Decimal('1e12') },
      new Set<string>()
    )
    expect(next?.id).not.toBe('crisis_spawn')
    expect(next?.id).not.toBe('autobuyers')
    const expected = Math.min(
      ...FEATURE_UNLOCKS.map((x) => x.order).filter((o) => o > FEATURE_UNLOCKS[1].order)
    )
    expect(next?.order).toBe(expected)
  })

  it('is monotonic as the unlocked list grows', () => {
    let previous = Number.NEGATIVE_INFINITY
    const unlocked = new Set<string>()
    for (const f of FEATURE_UNLOCKS) {
      const next = nextLocked(emptyContext(), unlocked)
      if (next) expect(next.order).toBeGreaterThanOrEqual(previous)
      if (next) previous = next.order
      unlocked.add(f.id)
    }
  })
})

describe('ADR-0032 — dekad merdiveni', () => {
  it('her dopamin basamağı bir öncekinden büyük dekadda', () => {
    const gates = FEATURE_UNLOCKS.filter((f) => f.req.kind === 'dopamine')
    expect(gates.length).toBeGreaterThanOrEqual(10)
    const logs = gates.map((f) =>
      new Decimal((f.req as { kind: 'dopamine'; amount: string }).amount).log10().toNumber()
    )
    for (let i = 1; i < logs.length; i++) {
      expect(logs[i]).toBeGreaterThan(logs[i - 1])
    }
  })

  it('merdiven 1e308 eşikine kadar yayılır (eski hâli 26 dekadda bitiyordu)', () => {
    const top = FEATURE_UNLOCKS[FEATURE_UNLOCKS.length - 2]
    expect(top.id).toBe('night_watch')
    expect(top.req.kind).toBe('dopamine')
    expect(new Decimal((top.req as { amount: string }).amount).gte('1e308')).toBe(true)
  })

  it('unlockProgressFraction 1e308 hedefte Infinity üretmez', () => {
    const f = FEATURE_UNLOCKS.find((x) => x.id === 'night_watch')
    expect(f).toBeDefined()
    if (!f) return
    expect(unlockProgressFraction(emptyContext(), f)).toBe(0)
    const half = unlockProgressFraction({ ...emptyContext(), matter: new Decimal('1e154') }, f)
    expect(Number.isFinite(half)).toBe(true)
    expect(half).toBeCloseTo(0.5, 6)
    expect(unlockProgressFraction({ ...emptyContext(), matter: new Decimal('1e4000') }, f)).toBe(1)
    expect(unlockProgressFraction({ ...emptyContext(), matter: new Decimal(Number.NaN) }, f)).toBe(0)
  })

  it('unlockProgressFraction sayaç kapılarında lineer kalır', () => {
    const f = FEATURE_UNLOCKS.find((x) => x.id === 'challenges')
    expect(f).toBeDefined()
    if (!f) return
    expect(unlockProgressFraction({ ...emptyContext(), singularities: 0 }, f)).toBe(0)
    expect(unlockProgressFraction({ ...emptyContext(), singularities: 1 }, f)).toBe(1)
  })

  it('dopamin kapılarında logaritmik ölçek üstel biçimde daha yavaş ilerlemeyi kurtarır', () => {
    // 1e160 hedefe 1e12 ile gelmek logaritmik ölçekte %7.5; doğrusalda ~0.
    const f = FEATURE_UNLOCKS.find((x) => x.id === 'guilt_slackers')
    expect(f).toBeDefined()
    if (!f) return
    const frac = unlockProgressFraction({ ...emptyContext(), matter: new Decimal('1e12') }, f)
    expect(frac).toBeCloseTo(12 / 160, 4)
    const linear = unlockProgress({ ...emptyContext(), matter: new Decimal('1e12') }, f)
    expect(linear.current / linear.target).toBeLessThan(1e-147)
  })
})

describe('buildUnlockContext', () => {
  it('passes counters through and defaults a missing stats block to zero', () => {
    const ctx = buildUnlockContext({
      matter: new Decimal('1e9'),
      dimensions: [{ amount: new Decimal(5), bought: 3 }],
      dimensionShifts: 2,
      galaxies: 1,
      singularities: 4
    })
    expect(ctx.matter.toNumber()).toBe(1e9)
    expect(ctx.dimensions).toHaveLength(1)
    expect(ctx.dimensionShifts).toBe(2)
    expect(ctx.galaxies).toBe(1)
    expect(ctx.singularities).toBe(4)
    // Old saves have no stats block at all — no migration required.
    expect(ctx.spellsCast).toBe(0)
    expect(ctx.anomaliesClicked).toBe(0)
  })

  it('coerces malformed stats to zero instead of leaking NaN into the ladder', () => {
    const ctx = buildUnlockContext({
      matter: new Decimal(0),
      dimensions: [],
      dimensionShifts: 0,
      galaxies: 0,
      singularities: 0,
      stats: { spellsCast: Number.NaN, anomaliesClicked: Number.NaN }
    })
    expect(ctx.spellsCast).toBe(0)
    expect(ctx.anomaliesClicked).toBe(0)
    expect(Number.isNaN(ctx.spellsCast)).toBe(false)
    for (const f of FEATURE_UNLOCKS) {
      expect(checkUnlock(ctx, f)).toBe(false)
    }
  })

  it('produces a context that unlocks nothing on a blank save', () => {
    const ctx = buildUnlockContext({
      matter: new Decimal(0),
      dimensions: [],
      dimensionShifts: 0,
      galaxies: 0,
      singularities: 0,
      stats: {}
    })
    for (const f of FEATURE_UNLOCKS) {
      expect(checkUnlock(ctx, f)).toBe(false)
    }
    expect(nextLocked(ctx, new Set())?.id).toBe('crisis_spawn')
  })
})

/**
 * ADR-0035 — "Açılış bir olaydır, kapı değil."
 *
 * Oyuncu raporu: bir özellik açıldıktan sonra Akış Sıçraması / Akış Kümesi
 * alındığında dopamin sıfırlanıyor ve açılan şey yeniden kilitli görünüyordu.
 * Bu blok, kapıların koşu içi `matter` yerine hayat boyu tepe nokta
 * (`lifetimePeakMatter`) üzerinden değerlendirildiğini kilitler.
 */
describe('ADR-0035 — açılış kalıcılığı (hayat boyu dopamin)', () => {
  /** Dopamin kapısı olan her basamağın altındaki en büyük eşik. */
  const DOPAMINE_RUNGS = FEATURE_UNLOCKS.filter((f) => f.req.kind === 'dopamine')

  it('the ladder actually has dopamine rungs to protect', () => {
    expect(DOPAMINE_RUNGS.length).toBeGreaterThanOrEqual(10)
  })

  describe('raisedLifetimePeak', () => {
    it('only ever raises, never lowers', () => {
      expect(raisedLifetimePeak(new Decimal('1e50'), new Decimal('1e12')).toString()).toBe('1e50')
      expect(raisedLifetimePeak(new Decimal('1e12'), new Decimal('1e50')).toString()).toBe('1e50')
      expect(raisedLifetimePeak(new Decimal(7), new Decimal(7)).toNumber()).toBe(7)
    })

    it('falls back to the current value when no peak was recorded', () => {
      expect(raisedLifetimePeak(new Decimal('1e9'), undefined).toNumber()).toBe(1e9)
    })

    it('ignores a corrupted side instead of poisoning the watermark', () => {
      const nan = new Decimal(Number.NaN)
      expect(raisedLifetimePeak(nan, new Decimal('1e40')).toString()).toBe('1e40')
      expect(raisedLifetimePeak(new Decimal('1e40'), nan).toString()).toBe('1e40')
      expect(raisedLifetimePeak(nan, undefined).toNumber()).toBe(0)
      expect(raisedLifetimePeak(nan, nan).toNumber()).toBe(0)
    })
  })

  describe('lifetimeUnlockDopamine', () => {
    it('reads the higher of run dopamine and the lifetime peak', () => {
      expect(lifetimeUnlockDopamine(new Decimal(10), new Decimal('1e65')).toString()).toBe('1e65')
      expect(lifetimeUnlockDopamine(new Decimal('1e200'), new Decimal('1e65')).toString()).toBe('1e200')
      expect(lifetimeUnlockDopamine(new Decimal('1e12')).toNumber()).toBe(1e12)
    })
  })

  describe('meetsDopamineGate', () => {
    it('survives a dopamine reset once the gate was crossed', () => {
      expect(meetsDopamineGate(new Decimal('1e65'), new Decimal('1e65'), '1e65')).toBe(true)
      expect(meetsDopamineGate(new Decimal(10), new Decimal('1e65'), '1e65')).toBe(true)
    })

    it('never grants a gate that was never reached', () => {
      expect(meetsDopamineGate(new Decimal('1e64'), new Decimal('1e64'), '1e65')).toBe(false)
      expect(meetsDopamineGate(new Decimal(10), new Decimal(10), '1e65')).toBe(false)
      expect(meetsDopamineGate(new Decimal(0), undefined, '1e3')).toBe(false)
    })

    it('stays locked on a corrupted save with no lifetime record', () => {
      const nan = new Decimal(Number.NaN)
      expect(meetsDopamineGate(nan, undefined, '1e3')).toBe(false)
      expect(meetsDopamineGate(nan, new Decimal('1e3'), '1e3')).toBe(true)
    })
  })

  it('keeps every dopamine rung open after dopamine is reset to zero', () => {
    for (const f of DOPAMINE_RUNGS) {
      const amount = (f.req as { kind: 'dopamine'; amount: string }).amount
      // P3.1: başarım kapılı dallar da açılmış varsayılır (omurga + dal birlikte).
      const reached: UnlockContext = {
        ...emptyContext(),
        matter: new Decimal(amount),
        achievements: ALL_ACHIEVEMENT_IDS
      }
      expect(checkUnlock(reached, f)).toBe(true)
      const reachedOnce = { ...reached, lifetimePeakMatter: new Decimal(amount) }

      // Akış Sıçraması / Akış Kümesi / şafak çöküşü: dopamin sıfırlandı.
      const afterReset: UnlockContext = { ...reachedOnce, matter: new Decimal(10) }
      expect(checkUnlock(afterReset, f)).toBe(true)
      expect(unlockProgressFraction(afterReset, f)).toBe(1)

      const progress = unlockProgress(afterReset, f)
      expect(progress.current).toBe(progress.target)
    }
  })

  it('keeps a rung locked while the player has never reached its dopamine', () => {
    const ctx: UnlockContext = { ...emptyContext(), matter: new Decimal(0), lifetimePeakMatter: new Decimal(0) }
    for (const f of DOPAMINE_RUNGS) {
      expect(checkUnlock(ctx, f)).toBe(false)
      expect(unlockProgressFraction(ctx, f)).toBe(0)
    }
    expect(nextLocked(ctx, new Set())?.id).toBe('crisis_spawn')
  })

  it('never lets the progress bar slide backwards across a reset', () => {
    const f = FEATURE_UNLOCKS.find((x) => x.id === 'lab')
    expect(f).toBeDefined()
    if (!f) return
    const peak = '1e70'
    const before = unlockProgressFraction({ ...emptyContext(), matter: new Decimal(peak) }, f)
    const after = unlockProgressFraction(
      { ...emptyContext(), matter: new Decimal(10), lifetimePeakMatter: new Decimal(peak) },
      f
    )
    expect(before).toBe(1)
    expect(after).toBe(before)
  })

  it('survives a whole prestige sequence without relocking anything', () => {
    // 1. Koşu: tepe noktaya kadar oyna, su seviyesi kaydedilir.
    const peak = '1e160'
    const run: UnlockContext = {
      ...emptyContext(),
      matter: new Decimal(peak),
      lifetimePeakMatter: new Decimal(peak),
      dimensionShifts: 12,
      galaxies: 3,
      singularities: 2,
      // P3.1: dal kapıları da açık — aksi hâlde koşu içinde açılan dallar
      // sıfırlama testinin konusu zaten bu (kapılar geri kapanmamalı).
      achievements: ALL_ACHIEVEMENT_IDS
    }
    const openBefore = FEATURE_UNLOCKS.filter((f) => checkUnlock(run, f)).map((f) => f.id)
    expect(openBefore.length).toBeGreaterThanOrEqual(10)

    // 2. Sıçrama → küme → şafak → meydan okuma: her adımda koşu içi sayaçlar sıfırlanır.
    const afterPrestiges: UnlockContext = {
      ...emptyContext(),
      matter: new Decimal(10),
      lifetimePeakMatter: new Decimal(peak),
      dimensionShifts: 0,
      galaxies: 0,
      singularities: 2,
      spellsCast: 0,
      anomaliesClicked: 0,
      achievements: ALL_ACHIEVEMENT_IDS
    }
    for (const f of FEATURE_UNLOCKS) {
      if (!openBefore.includes(f.id)) continue
      expect(checkUnlock(afterPrestiges, f)).toBe(true)
    }
    // Hiç açılmamış basamak (meydan okumalar: 1 şafak) açılmadıysa kapanmamalı da.
    expect(checkUnlock(afterPrestiges, getFeatureById('challenges')!)).toBe(true)
    // Sayaç kapıları tepe noktadan etkilenmez.
    const fresh = { ...emptyContext(), lifetimePeakMatter: new Decimal(peak) }
    for (const f of FEATURE_UNLOCKS) {
      if (f.req.kind === 'dopamine') continue
      expect(checkUnlock(fresh, f)).toBe(false)
    }
  })

  it('leaves non-dopamine gates governed by their own counters', () => {
    const ctx: UnlockContext = {
      ...emptyContext(),
      matter: new Decimal(10),
      lifetimePeakMatter: new Decimal('1e4000')
    }
    for (const f of FEATURE_UNLOCKS) {
      if (f.req.kind === 'dopamine') continue
      expect(checkUnlock(ctx, f)).toBe(false)
    }
  })

  it('keeps checkUnlock and unlockProgress agreeing with a lifetime peak', () => {
    const contexts: UnlockContext[] = [
      { ...emptyContext(), lifetimePeakMatter: new Decimal('1e30') },
      { ...emptyContext(), matter: new Decimal('1e90'), lifetimePeakMatter: new Decimal('1e30') },
      { ...emptyContext(), matter: new Decimal(10), lifetimePeakMatter: new Decimal(Number.NaN) }
    ]
    for (const ctx of contexts) {
      for (const f of FEATURE_UNLOCKS) {
        const { current, target } = unlockProgress(ctx, f)
        expect(checkUnlock(ctx, f)).toBe(current >= target)
      }
    }
  })

  it('passes the lifetime peak through buildUnlockContext', () => {
    const peak = new Decimal('1e42')
    const ctx = buildUnlockContext({
      matter: new Decimal(10),
      lifetimePeakMatter: peak,
      dimensions: [],
      dimensionShifts: 0,
      galaxies: 0,
      singularities: 0
    })
    expect(ctx.lifetimePeakMatter).toBe(peak)
    const nightWatch = getFeatureById('night_watch')!
    expect(checkUnlock(ctx, nightWatch)).toBe(false)
    expect(
      checkUnlock({ ...ctx, lifetimePeakMatter: new Decimal('1e308') }, nightWatch)
    ).toBe(true)
  })

  it('omits the peak safely when the caller has none (old saves)', () => {
    const ctx = buildUnlockContext({
      matter: new Decimal('1e9'),
      dimensions: [],
      dimensionShifts: 0,
      galaxies: 0,
      singularities: 0
    })
    expect(ctx.lifetimePeakMatter).toBeUndefined()
    expect(lifetimeUnlockDopamine(ctx.matter, ctx.lifetimePeakMatter).toNumber()).toBe(1e9)
  })
})

describe('dimension identity tiers', () => {
  it('defines exactly one identity for every dimension tier', () => {
    const tiers = TIER_IDENTITIES.map((t) => t.tier)
    expect(DIMENSION_TIER_COUNT).toBe(8)
    for (let tier = 1; tier <= DIMENSION_TIER_COUNT; tier++) {
      expect(tiers).toContain(tier)
      const id = getTierIdentity(tier)
      expect(id).toBeDefined()
      expect(id?.tier).toBe(tier)
    }
    expect(new Set(tiers).size).toBe(tiers.length)
  })

  it('keeps the tier lookup total over the valid range and closed outside it', () => {
    for (let tier = 1; tier <= DIMENSION_TIER_COUNT; tier++) {
      expect(getTierIdentity(tier)).toBeDefined()
    }
    for (const tier of [0, -1, DIMENSION_TIER_COUNT + 1, 1.5, Number.NaN]) {
      expect(getTierIdentity(tier)).toBeUndefined()
    }
  })

  it('lists tiers in ascending order with unique labels and copy', () => {
    const labels: string[] = []
    TIER_IDENTITIES.forEach((t, index) => {
      if (index > 0) expect(t.tier).toBeGreaterThan(TIER_IDENTITIES[index - 1].tier)
      expect(t.label.trim()).not.toBe('')
      expect(t.passive.desc.trim()).not.toBe('')
      expect(Number.isFinite(t.passive.value)).toBe(true)
      labels.push(t.label)
    })
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps passive values inside the documented tight band', () => {
    const ADDITIVE_KINDS: TierPassiveKind[] = ['clickSyncCapBonus']
    for (const t of TIER_IDENTITIES) {
      if (ADDITIVE_KINDS.includes(t.passive.kind)) {
        expect(t.passive.value).toBeGreaterThan(0)
        expect(t.passive.value).toBeLessThanOrEqual(0.1)
      } else {
        expect(t.passive.value).toBeGreaterThanOrEqual(0.95)
        expect(t.passive.value).toBeLessThanOrEqual(1.1)
      }
    }
  })

  it('does not let stacked production passives run away', () => {
    const product = TIER_IDENTITIES.filter(
      (t) => t.passive.kind === 'productionMult'
    ).reduce((acc, t) => acc * t.passive.value, 1)
    expect(product).toBeGreaterThan(1)
    expect(product).toBeLessThan(1.25)
  })
})

describe('dimension identity derived multipliers', () => {
  const eightBought = (n: number) =>
    Array.from({ length: DIMENSION_TIER_COUNT }, () => ({ bought: n }))

  it('tierProductionMult only pays out for bought, unlocked, production tiers', () => {
    expect(tierProductionMult(2, 10, false)).toBe(1)
    expect(tierProductionMult(2, 0, true)).toBe(1)
    expect(tierProductionMult(2, -5, true)).toBe(1)
    // Tier 1 is a clickSyncCapBonus tier, not a production tier.
    expect(tierProductionMult(1, 10, true)).toBe(1)
    expect(tierProductionMult(DIMENSION_TIER_COUNT + 1, 10, true)).toBe(1)
    expect(tierProductionMult(2, 10, true)).toBe(1.03)
    expect(tierProductionMult(8, 10, true)).toBe(1.06)
  })

  it('reads the tier-3 leech penalty straight from the registry', () => {
    expect(tierSlackerLeechMult()).toBe(0.97)
  })

  it('tierClickSyncCapBonus is an additive delta and needs D1 bought', () => {
    expect(tierClickSyncCapBonus([])).toBe(0)
    expect(tierClickSyncCapBonus(eightBought(0))).toBe(0)
    expect(tierClickSyncCapBonus(eightBought(1))).toBe(0.005)
  })

  it('gates tierAnomalyRateMult on 4 unlocked dimensions AND D4 bought', () => {
    expect(tierAnomalyRateMult(eightBought(10), 3)).toBe(1)
    expect(tierAnomalyRateMult([], 4)).toBe(1)
    const noD4 = eightBought(10)
    noD4[3] = { bought: 0 }
    expect(tierAnomalyRateMult(noD4, 4)).toBe(1)
    expect(tierAnomalyRateMult(eightBought(10), 4)).toBe(1.08)
  })

  it('gates tierShiftReqMult on 5 unlocked dimensions AND D5 bought', () => {
    expect(tierShiftReqMult(eightBought(10), 4)).toBe(1)
    expect(tierShiftReqMult([], 5)).toBe(1)
    const noD5 = eightBought(10)
    noD5[4] = { bought: 0 }
    expect(tierShiftReqMult(noD5, 5)).toBe(1)
    expect(tierShiftReqMult(eightBought(10), 5)).toBe(0.97)
  })

  it('gates tierOfflineSimMult on 6 unlocked dimensions AND D6 bought', () => {
    expect(tierOfflineSimMult(eightBought(10), 5)).toBe(1)
    expect(tierOfflineSimMult([], 6)).toBe(1)
    const noD6 = eightBought(10)
    noD6[5] = { bought: 0 }
    expect(tierOfflineSimMult(noD6, 6)).toBe(1)
    expect(tierOfflineSimMult(eightBought(10), 6)).toBe(1.02)
  })

  it('returns neutral multipliers rather than throwing on malformed input', () => {
    expect(tierAnomalyRateMult([], 0)).toBe(1)
    expect(tierShiftReqMult([], 0)).toBe(1)
    expect(tierOfflineSimMult([], 0)).toBe(1)
    expect(tierClickSyncCapBonus([])).toBe(0)
    expect(tierSlackerLeechMult()).toBeGreaterThan(0)
  })
})

describe('format unlock buff', () => {
  it('declares a short, mild buff', () => {
    expect(FORMAT_UNLOCK_BUFF_SECONDS).toBe(20)
    expect(FORMAT_UNLOCK_BUFF_MULT).toBe(1.25)
  })

  it('applies only to the buffed tier while the buff is alive', () => {
    expect(formatUnlockBuffMult(3, 3, 10_000, 0)).toBe(FORMAT_UNLOCK_BUFF_MULT)
    expect(formatUnlockBuffMult(3, 4, 10_000, 0)).toBe(1)
    expect(formatUnlockBuffMult(4, 3, 10_000, 0)).toBe(1)
    expect(formatUnlockBuffMult(Number.NaN, Number.NaN, 10_000, 0)).toBe(1)
  })

  it('expires exactly on the deadline, not one tick later', () => {
    expect(formatUnlockBuffMult(3, 3, 1_000, 999)).toBe(FORMAT_UNLOCK_BUFF_MULT)
    expect(formatUnlockBuffMult(3, 3, 1_000, 1_000)).toBe(1)
    expect(formatUnlockBuffMult(3, 3, 1_000, 1_001)).toBe(1)
    expect(formatUnlockBuffMult(3, 3, 0, 0)).toBe(1)
  })
})

describe('P3.1 — başarım kapılı dallar (dal kapısı x dekad kapısı)', () => {
  /** Dekad eşiği (1e28) aşılmış, başarım listesi verilmemiş bir koşu. */
  function crisisPastDecade(achievements?: readonly string[]): UnlockContext {
    return {
      ...emptyContext(),
      matter: new Decimal('1e28'),
      lifetimePeakMatter: new Decimal('1e28'),
      achievements
    }
  }

  it('i) dekad kapısı geçilir ama başarım bosken crisis KAPALI kalir', () => {
    const f = getFeatureById('crisis')
    expect(f).toBeDefined()
    if (!f) return
    const ctx = crisisPastDecade()
    // 1e28 dekad eşiği aşıldı; başarım listesi yok → dal kilitli.
    expect(checkUnlock(ctx, f)).toBe(false)
    const progress = unlockProgress(ctx, f)
    expect(progress.current).toBe(0)
    expect(progress.target).toBe(2)
  })

  it('ii) safe basarimlar kazanilinca ayni feature ACILIR', () => {
    const f = getFeatureById('crisis')
    expect(f).toBeDefined()
    if (!f) return
    const ctx = crisisPastDecade(['cri_first', 'cri_10'])
    expect(checkUnlock(ctx, f)).toBe(true)
    expect(unlockProgress(ctx, f)).toEqual({ current: 2, target: 2 })
    expect(unlockProgressFraction(ctx, f)).toBe(1)
    // Bir başarım eksikken hâlâ kapalı (yarım ilerleme).
    const half = crisisPastDecade(['cri_first'])
    expect(checkUnlock(half, f)).toBe(false)
    expect(unlockProgress(half, f)).toEqual({ current: 1, target: 2 })
    expect(unlockProgressFraction(half, f)).toBe(0.5)
  })

  it('iii) omurga ozellikleri basarimlardan ETKILENMEZ (achievements bos olsa dekada gore acilir)', () => {
    const ctx: UnlockContext = {
      ...emptyContext(),
      matter: new Decimal('1e308'),
      lifetimePeakMatter: new Decimal('1e308'),
      singularities: 1,
      achievements: []
    }
    for (const id of ['crisis_spawn', 'autobuyers', 'night_watch', 'challenges']) {
      const f = getFeatureById(id)
      expect(f).toBeDefined()
      if (!f) continue
      expect(isSpineFeature(id)).toBe(true)
      expect(checkUnlock(ctx, f)).toBe(true)
    }
  })

  it('iv) ADR-0035 monotonlugu: dal bir kez acildiktan sonra matter sifirlansa da acik kalir', () => {
    const f = getFeatureById('crisis')
    expect(f).toBeDefined()
    if (!f) return
    const opened = crisisPastDecade(['cri_first', 'cri_10'])
    expect(checkUnlock(opened, f)).toBe(true)
    // Sıçrama / şafak: koşu içi dopamin sıfırlandı — dal geri kilitlenmez.
    const afterReset: UnlockContext = { ...opened, matter: new Decimal(0) }
    expect(checkUnlock(afterReset, f)).toBe(true)
    expect(unlockProgress(afterReset, f)).toEqual({ current: 2, target: 2 })
    expect(unlockProgressFraction(afterReset, f)).toBe(1)
  })

  it('v) dal kapasinda unlockProgressFraction LINEER (current/target)', () => {
    const f = getFeatureById('crisis')
    expect(f).toBeDefined()
    if (!f) return
    expect(unlockProgressFraction(crisisPastDecade([]), f)).toBe(0)
    expect(unlockProgressFraction(crisisPastDecade(['cri_first']), f)).toBe(0.5)
    expect(unlockProgressFraction(crisisPastDecade(['cri_first', 'cri_10']), f)).toBe(1)
    // Dekad öncesi aşama logaritmik kalır: 1e14, 1e28 hedefinin tam yarısı.
    const preGate: UnlockContext = { ...emptyContext(), matter: new Decimal('1e14') }
    expect(unlockProgressFraction(preGate, f)).toBeCloseTo(0.5, 6)
  })

  it('buildUnlockContext basarimlari state uzerinden gecirir (yoksa bos liste sayilir)', () => {
    const base = {
      matter: new Decimal('1e28'),
      dimensions: [],
      dimensionShifts: 0,
      galaxies: 0,
      singularities: 0
    }
    const f = getFeatureById('crisis')
    expect(f).toBeDefined()
    if (!f) return
    const withAch = buildUnlockContext({ ...base, achievements: ['cri_first', 'cri_10'] })
    expect(withAch.achievements).toEqual(['cri_first', 'cri_10'])
    expect(checkUnlock(withAch, f)).toBe(true)
    // Eski kayıt / alan yoksa boş liste: dal kapalı kalır ama omurga etkilenmez.
    const legacy = buildUnlockContext(base)
    expect(legacy.achievements).toEqual([])
    expect(checkUnlock(legacy, f)).toBe(false)
    expect(checkUnlock(legacy, getFeatureById('crisis_spawn')!)).toBe(true)
  })

  it('store ucu uca: state.achievements dal kapasini gercekten besler', () => {
    const store = createFreshStore()
    store.matter = new Decimal('1e28')
    store.lifetimePeakMatter = new Decimal('1e28')
    store.achievements = []
    expect(store.unlockedFeatures).not.toContain('crisis')
    expect(store.unlockContext.achievements).toEqual([])
    // Dekad eşiği geçildi, başarım yok → dal KAPALI (softlock değil: doğru sonuç).
    expect(store.isFeatureUnlocked('crisis')).toBe(false)
    // Kaynak: store.state.achievements (actions-misc syncAchievements yazar).
    store.achievements = ['cri_first', 'cri_10']
    expect(store.unlockContext.achievements).toEqual(['cri_first', 'cri_10'])
    expect(store.isFeatureUnlocked('crisis')).toBe(true)
    // Omurga başarım listesinden bağımsız kalmaya devam eder.
    expect(store.isFeatureUnlocked('crisis_spawn')).toBe(true)
  })

  it('nextLocked bir dali siradaki gosterdiginde ilerleme DAL kapasini gosterir (ipucu)', () => {
    const ctx: UnlockContext = {
      ...emptyContext(),
      matter: new Decimal('1e28'),
      lifetimePeakMatter: new Decimal('1e28')
    }
    // colony (1e22) dekadı aşıldı ama automation başarımı eksik → sıradaki dal bu.
    const next = nextLocked(ctx, new Set())
    expect(next?.id).toBe('colony')
    if (!next) return
    expect(unlockProgress(ctx, next)).toEqual({ current: 0, target: 2 })
    expect(unlockProgressFraction(ctx, next)).toBe(0)
    // Dalın başarım ilerlemesi ipucu olarak akar: 1/2 görünür.
    const oneDone: UnlockContext = { ...ctx, achievements: ['auto_first'] }
    expect(unlockProgress(oneDone, next)).toEqual({ current: 1, target: 2 })
    expect(unlockProgressFraction(oneDone, next)).toBe(0.5)
    // Dal açılınca bir sonraki basamak sıçrar: crisis (1e28, başarım eksik).
    const open: UnlockContext = { ...ctx, achievements: ['auto_first', 'auto_bulk'] }
    expect(checkUnlock(open, next)).toBe(true)
    expect(nextLocked(open, new Set())?.id).toBe('crisis')
  })
})

describe('P3.2 — checkVisibility (gorunurluk: dal katmani olmadan)', () => {
  /** Dekad esigi verilmis bir baglam (basarim listesi ayrica belirtilir). */
  function atDecade(achievements?: readonly string[]): UnlockContext {
    return {
      ...emptyContext(),
      matter: new Decimal('1e28'),
      lifetimePeakMatter: new Decimal('1e28'),
      achievements
    }
  }

  it('crisis: dekad oncesi FALSE; 1e28 asildi achievements bosken TRUE ama checkUnlock FALSE (siluet)', () => {
    const f = getFeatureById('crisis')
    expect(f).toBeDefined()
    if (!f) return

    const before: UnlockContext = {
      ...emptyContext(),
      matter: new Decimal('1e14'),
      lifetimePeakMatter: new Decimal('1e14')
    }
    expect(checkVisibility(before, f)).toBe(false)
    expect(checkUnlock(before, f)).toBe(false)

    // Siluet durumu: dekad gecti, basarim eksik → gorunurluk acik, acilis kapali.
    const silhouette = atDecade()
    expect(checkVisibility(silhouette, f)).toBe(true)
    expect(checkUnlock(silhouette, f)).toBe(false)

    const opened = atDecade(['cri_first', 'cri_10'])
    expect(checkVisibility(opened, f)).toBe(true)
    expect(checkUnlock(opened, f)).toBe(true)
  })

  it('omurgada checkVisibility ile checkUnlock AYNI; acilan her sey gorunur', () => {
    const contexts: UnlockContext[] = [
      emptyContext(),
      {
        ...emptyContext(),
        matter: new Decimal('1e308'),
        lifetimePeakMatter: new Decimal('1e308'),
        singularities: 1,
        achievements: []
      },
      atDecade()
    ]
    for (const ctx of contexts) {
      for (const feat of FEATURE_UNLOCKS) {
        const visible = checkVisibility(ctx, feat)
        if (isSpineFeature(feat.id)) {
          // Omurgada dal katmani yok: gorunurluk == gercek acilis.
          expect(visible).toBe(checkUnlock(ctx, feat))
        }
        // Acilan her ozellik gorunur olmak zorunda (gorunurluk ust kumesi).
        if (checkUnlock(ctx, feat)) expect(visible).toBe(true)
      }
    }

    // Ornek omurga ciftleri: achievements bosken de ikisi de true.
    const open = contexts[1]
    for (const id of ['crisis_spawn', 'autobuyers', 'night_watch', 'challenges']) {
      const f = getFeatureById(id)
      expect(f).toBeDefined()
      if (!f) continue
      expect(checkVisibility(open, f)).toBe(true)
      expect(checkUnlock(open, f)).toBe(true)
    }
    // Dal orneginde (crisis) siluet ayrimi gorunur kalir:
    expect(checkVisibility(contexts[2], getFeatureById('crisis')!)).toBe(true)
    expect(checkUnlock(contexts[2], getFeatureById('crisis')!)).toBe(false)
  })
})
