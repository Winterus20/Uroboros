import { describe, expect, it } from 'vitest'

import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  FAMILY_TIER_MULT,
  FAMILY_TIER_STEPS,
  PER_ACHIEVEMENT_MULT,
  calcAchievementMultiplier,
  categoryDefs,
  countCompletedRows,
  countFamilyTiers,
  familyTierCount,
  getAchievement,
  hasAchievementReward,
  isCategoryComplete
} from './achievements'
import { CHALLENGES } from './challenges'
import { Decimal } from '../core/math'
import type {
  AchievementCategoryId,
  AchievementContext,
  AchievementRewardKind
} from '../models/types'

/**
 * Compile-time exhaustive mirrors of the unions declared in src/models/types.ts.
 * Adding a category / reward kind there without updating these records is a
 * `tsc` error here, so the data cannot silently drift away from the type union.
 */
const DECLARED_CATEGORY_IDS: Record<AchievementCategoryId, true> = {
  dopamine: true,
  dimensions: true,
  automation: true,
  crisis: true,
  guilt: true,
  lab: true,
  singularity: true,
  challenges: true
}

const DECLARED_REWARD_KINDS: Record<AchievementRewardKind, true> = {
  click_x2: true,
  tickspeed_discount: true,
  buff_duration: true,
  leech_reduction: true,
  sp_discount: true,
  lab_yield: true,
  anomaly_rate: true,
  caffeine_regen: true,
  caffeine_boost: true,
  starting_matter: true,
  prod_x125: true,
  dim_cost_x085: true,
  click_x3: true,
  shift_power_boost: true,
  prod_x2: true
}

/** GAME_DESIGN.md §8 (P3.1b revizyonu): `1.012^(başarım) × 1.015^(aile kademesi)` — kademe eşikleri %25/%50/%75/%100. */
const DOC_PER_ACHIEVEMENT_MULT = 1.012
const DOC_FAMILY_TIER_STEPS = [0.25, 0.5, 0.75, 1] as const
const DOC_FAMILY_TIER_MULT = 1.015

const ALL_IDS: readonly string[] = ACHIEVEMENTS.map((a) => a.id)
const CHALLENGE_IDS: readonly string[] = CHALLENGES.map((c) => c.id)

function zeroContext(): AchievementContext {
  return {
    manualClicks: 0,
    totalMatter: new Decimal(0),
    highestMatter: new Decimal(0),
    matter: new Decimal(0),
    playtime: 0,
    singularityCount: 0,
    anomaliesClicked: 0,
    mythicsClicked: 0,
    combosTriggered: 0,
    slackersFired: 0,
    labHarvests: 0,
    spellsCast: 0,
    seedsPlanted: 0,
    tickspeedBought: 0,
    shifts: 0,
    galaxies: 0,
    sp: new Decimal(0),
    spUpgradesTotal: 0,
    guiltImmunityLvl: 0,
    dimBoughtTotal: 0,
    dimBought0: 0,
    unlockedBots: [],
    bulkUnlocked: false,
    maxUnlocked: false,
    neuralBots: new Decimal(0),
    napCount: 0,
    matureCells: 0,
    hasBrainrot: false,
    hasMatureBrainrot: false,
    activeSlackers: 0,
    leechedTotal: new Decimal(0),
    wallHour: 0,
    completedChallenges: [],
    seenNewsCount: 0,
    hasClickedSecretNews: false
  }
}

/** Every counter maxed. `dim_fresh` still cannot fire here — it demands a virgin run. */
function saturatedContext(): AchievementContext {
  return {
    ...zeroContext(),
    manualClicks: 1e9,
    totalMatter: new Decimal('1e310'),
    highestMatter: new Decimal('1e300'),
    matter: new Decimal('1e300'),
    playtime: 30 * 24 * 3600,
    singularityCount: 25,
    anomaliesClicked: 500,
    mythicsClicked: 10,
    combosTriggered: 50,
    slackersFired: 500,
    labHarvests: 200,
    spellsCast: 50,
    seedsPlanted: 20,
    tickspeedBought: 100,
    shifts: 12,
    galaxies: 6,
    sp: new Decimal(5000),
    spUpgradesTotal: 20,
    guiltImmunityLvl: 5,
    dimBoughtTotal: 500,
    dimBought0: 120,
    unlockedBots: ['tickspeed', 'shift', 'galaxy', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'],
    bulkUnlocked: true,
    maxUnlocked: true,
    neuralBots: new Decimal('1e12'),
    napCount: 10,
    matureCells: 9,
    hasBrainrot: true,
    hasMatureBrainrot: true,
    activeSlackers: 5,
    leechedTotal: new Decimal('1e40'),
    wallHour: 2,
    completedChallenges: [...CHALLENGE_IDS],
    seenNewsCount: 100,
    hasClickedSecretNews: true
  }
}

/** Maxed run that never shifted or made a galaxy — the only shape `dim_fresh` accepts. */
function virginRunContext(): AchievementContext {
  return { ...saturatedContext(), shifts: 0, galaxies: 0 }
}

describe('achievement registry integrity', () => {
  it('has unique, non-empty ids', () => {
    const seen = new Set<string>()
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.id).toBe('string')
      expect(a.id.trim()).not.toBe('')
      expect(seen.has(a.id)).toBe(false)
      seen.add(a.id)
    }
    expect(seen.size).toBe(ACHIEVEMENTS.length)
    expect(seen.size).toBeGreaterThan(0)
  })

  it('uses id prefixes that match the category they live in', () => {
    const prefixes: Record<AchievementCategoryId, string> = {
      dopamine: 'dop_',
      dimensions: 'dim_',
      automation: 'auto_',
      crisis: 'cri_',
      guilt: 'gui_',
      lab: 'lab_',
      singularity: 'sin_',
      challenges: 'chl_'
    }
    // `automation` also hosts the colony_* ids, so only assert it does not collide
    // with another row's namespace.
    for (const a of ACHIEVEMENTS) {
      if (a.category === 'automation') continue
      expect(a.id.startsWith(prefixes[a.category])).toBe(true)
    }
    for (const a of ACHIEVEMENTS.filter((x) => x.category === 'automation')) {
      expect(a.id.startsWith('auto_') || a.id.startsWith('colony_')).toBe(true)
    }
  })

  it('assigns every achievement to one of the declared categories', () => {
    const declared = Object.keys(DECLARED_CATEGORY_IDS)
    for (const a of ACHIEVEMENTS) {
      expect(declared.includes(a.category)).toBe(true)
      expect(
        ACHIEVEMENT_CATEGORIES.some((c) => c.id === a.category)
      ).toBe(true)
    }
  })

  it('declares each union category exactly once, with copy', () => {
    const ids = ACHIEVEMENT_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(ids)).toEqual(new Set(Object.keys(DECLARED_CATEGORY_IDS)))
    for (const c of ACHIEVEMENT_CATEGORIES) {
      expect(c.name.trim()).not.toBe('')
      expect(c.desc.trim()).not.toBe('')
      expect(c.icon.trim()).not.toBe('')
    }
  })

  it('never leaves a declared category empty', () => {
    // An empty row would make isCategoryComplete() vacuously true and hand out a
    // free tier (4 × +1.5%) for a family the player can never fill.
    for (const c of ACHIEVEMENT_CATEGORIES) {
      expect(categoryDefs(c.id).length).toBeGreaterThan(0)
      expect(isCategoryComplete(c.id, [])).toBe(false)
    }
  })

  it('partitions the registry exactly once across categories', () => {
    const total = ACHIEVEMENT_CATEGORIES.reduce(
      (sum, c) => sum + categoryDefs(c.id).length,
      0
    )
    expect(total).toBe(ACHIEVEMENTS.length)
  })

  it('gives every achievement a function check() and non-empty copy', () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.check).toBe('function')
      expect(a.name.trim()).not.toBe('')
      expect(a.desc.trim()).not.toBe('')
      expect(a.icon.trim()).not.toBe('')
      if (a.secret !== undefined) {
        expect(typeof a.secret).toBe('boolean')
      }
    }
  })

  it('never grants a reward for a secret achievement', () => {
    // GAME_DESIGN.md §8: "gizli (shadow) başarımlar ... ödül vermez".
    for (const a of ACHIEVEMENTS) {
      if (a.secret === true) expect(a.reward).toBeUndefined()
    }
    expect(ACHIEVEMENTS.filter((a) => a.secret === true).length).toBeGreaterThan(0)
  })

  it('grants each declared reward kind exactly once, with a description', () => {
    const rewarded = ACHIEVEMENTS.filter((a) => a.reward !== undefined)
    const kinds = rewarded.map((a) => a.reward?.kind as string)
    expect(new Set(kinds).size).toBe(kinds.length)
    expect(new Set(kinds)).toEqual(new Set(Object.keys(DECLARED_REWARD_KINDS)))
    for (const a of rewarded) {
      expect(a.reward?.desc.trim().length ?? 0).toBeGreaterThan(0)
    }
  })

  it('does not fire any check() on a fresh save', () => {
    const ctx = zeroContext()
    const granted = ACHIEVEMENTS.filter((a) => a.check(ctx))
    expect(granted.map((a) => a.id)).toEqual([])
  })

  it('makes every achievement reachable', () => {
    const saturated = saturatedContext()
    const virgin = virginRunContext()
    const unreachable = ACHIEVEMENTS.filter(
      (a) => !a.check(saturated) && !a.check(virgin)
    ).map((a) => a.id)
    expect(unreachable).toEqual([])
  })

  it('always returns a real boolean from check()', () => {
    for (const ctx of [zeroContext(), saturatedContext(), virginRunContext()]) {
      for (const a of ACHIEVEMENTS) {
        expect(typeof a.check(ctx)).toBe('boolean')
      }
    }
  })

  it('keeps dim_fresh exclusive to a shift-free, galaxy-free run', () => {
    const def = getAchievement('dim_fresh')
    expect(def).toBeDefined()
    if (!def) return
    const matterOnly = { ...zeroContext(), matter: new Decimal('1e30') }
    expect(def.check(matterOnly)).toBe(true)
    expect(def.check({ ...matterOnly, shifts: 1 })).toBe(false)
    expect(def.check({ ...matterOnly, galaxies: 1 })).toBe(false)
  })

  it('keys the wall-clock achievement on wallHour', () => {
    const def = getAchievement('dop_247')
    expect(def).toBeDefined()
    if (!def) return
    for (let h = 0; h < 24; h++) {
      expect(def.check({ ...zeroContext(), wallHour: h })).toBe(h === 2)
    }
  })

  it('keys news ticker achievements on seenNewsCount and hasClickedSecretNews', () => {
    const fakeNews = getAchievement('dop_fake_news')
    const realNews = getAchievement('dop_real_news')
    expect(fakeNews).toBeDefined()
    expect(realNews).toBeDefined()
    if (!fakeNews || !realNews) return

    expect(fakeNews.check({ ...zeroContext(), seenNewsCount: 49 })).toBe(false)
    expect(fakeNews.check({ ...zeroContext(), seenNewsCount: 50 })).toBe(true)
    expect(fakeNews.check({ ...zeroContext(), seenNewsCount: 100 })).toBe(true)

    expect(realNews.check({ ...zeroContext(), hasClickedSecretNews: false })).toBe(false)
    expect(realNews.check({ ...zeroContext(), hasClickedSecretNews: true })).toBe(true)
  })

  it('mirrors the challenge registry one-for-one', () => {
    const referenced = ALL_IDS.filter((id) => id.startsWith('chl_')).map((id) =>
      id.slice('chl_'.length)
    )
    expect(new Set(referenced)).toEqual(new Set(CHALLENGE_IDS))
    expect(referenced.length).toBe(CHALLENGE_IDS.length)
    // ...and every one of them lives in the challenges row.
    const row = categoryDefs('challenges')
    expect(row.length).toBe(CHALLENGE_IDS.length)
    for (const def of row) {
      const c = { ...zeroContext(), completedChallenges: [def.id.slice('chl_'.length)] }
      const satisfied = row.filter((a) => a.check(c)).map((a) => a.id)
      expect(satisfied).toEqual([def.id])
    }
  })

  it('resolves known ids and nothing else', () => {
    for (const a of ACHIEVEMENTS) {
      expect(getAchievement(a.id)).toBe(a)
    }
    expect(getAchievement('no_such_achievement')).toBeUndefined()
    expect(getAchievement('')).toBeUndefined()
  })
})

describe('achievement global multiplier (GAME_DESIGN.md §8, P3.1b kademeler)', () => {
  it('pins the documented constants', () => {
    expect(PER_ACHIEVEMENT_MULT).toBe(DOC_PER_ACHIEVEMENT_MULT)
    expect(FAMILY_TIER_MULT).toBe(DOC_FAMILY_TIER_MULT)
    expect([...FAMILY_TIER_STEPS]).toEqual([...DOC_FAMILY_TIER_STEPS])
  })

  it('is exactly ×1 with nothing unlocked', () => {
    expect(calcAchievementMultiplier([]).toNumber()).toBeCloseTo(1, 12)
  })

  it('applies exactly ×1.012 per achievement', () => {
    const base = calcAchievementMultiplier([]).toNumber()
    for (const id of ALL_IDS) {
      expect(calcAchievementMultiplier([id]).toNumber()).toBeCloseTo(
        base * DOC_PER_ACHIEVEMENT_MULT,
        10
      )
    }
  })

  it('pays the first family tier at %25, not only at %100 (early payout)', () => {
    for (const category of ACHIEVEMENT_CATEGORIES) {
      const ids = categoryDefs(category.id).map((a) => a.id)
      expect(ids.length).toBeGreaterThan(1)
      // %25 eşiğini ilk kez aşan plaket: 1.012 (plaket) + 1.015 (kademe) öder.
      const quarterMark = Math.ceil(ids.length * DOC_FAMILY_TIER_STEPS[0])
      const beforeQuarter = calcAchievementMultiplier(ids.slice(0, quarterMark - 1)).toNumber()
      const atQuarter = calcAchievementMultiplier(ids.slice(0, quarterMark)).toNumber()
      expect(familyTierCount(category.id, ids.slice(0, quarterMark - 1))).toBe(0)
      expect(familyTierCount(category.id, ids.slice(0, quarterMark))).toBe(1)
      expect(atQuarter / beforeQuarter).toBeCloseTo(
        DOC_PER_ACHIEVEMENT_MULT * DOC_FAMILY_TIER_MULT,
        10
      )
    }
  })

  it('adds exactly one tier per %25 step while filling every family in order', () => {
    // Her aile için ayrı: sırayla başarım ekleyerek 0 → 4 kademe doğrulanır.
    for (const category of ACHIEVEMENT_CATEGORIES) {
      const ids = categoryDefs(category.id).map((a) => a.id)
      const n = ids.length
      expect(n).toBeGreaterThanOrEqual(DOC_FAMILY_TIER_STEPS.length * 2)
      expect(familyTierCount(category.id, [])).toBe(0)
      for (let k = 0; k <= n; k++) {
        const expected = DOC_FAMILY_TIER_STEPS.filter((step) => k / n >= step).length
        expect(familyTierCount(category.id, ids.slice(0, k))).toBe(expected)
      }
      expect(familyTierCount(category.id, ids)).toBe(DOC_FAMILY_TIER_STEPS.length)
    }
  })

  it('never misses a tier for a nearly-complete family (n-1 keeps the %75 tier)', () => {
    // "9/10 gibi" yarım kalan aile: son plaket eksikken kademe kaybı yalnızca
    // %100 kademesidir; %25/%50/%75 kademeleri korunur (tüm aileler ≥ 4 plaket).
    for (const category of ACHIEVEMENT_CATEGORIES) {
      const ids = categoryDefs(category.id).map((a) => a.id)
      expect(ids.length).toBeGreaterThanOrEqual(8)
      expect((ids.length - 1) / ids.length).toBeGreaterThanOrEqual(DOC_FAMILY_TIER_STEPS[2])
      expect((ids.length - 2) / ids.length).toBeGreaterThanOrEqual(DOC_FAMILY_TIER_STEPS[2])
      expect(familyTierCount(category.id, ids.slice(0, -1))).toBe(DOC_FAMILY_TIER_STEPS.length - 1)
      expect(familyTierCount(category.id, ids.slice(0, -2))).toBe(DOC_FAMILY_TIER_STEPS.length - 1)
    }
  })

  it('never raises a tier for unknown ids (ADR-0031 whitelist guard)', () => {
    const dopamine = categoryDefs('dopamine').map((a) => a.id)
    expect(familyTierCount('dopamine', ['not_a_real_id'])).toBe(0)
    expect(countFamilyTiers(['not_a_real_id', 'also_fake'])).toBe(0)
    // Sahte id bilinenlerin arasına eklenirse hiçbir kademeyi şişirmez.
    const known = dopamine.slice(0, 2)
    expect(countFamilyTiers([...known, 'ghost_id'])).toBe(countFamilyTiers(known))
    expect(familyTierCount('dopamine', [...dopamine.slice(0, -1), 'ghost_id'])).toBe(
      DOC_FAMILY_TIER_STEPS.length - 1
    )
  })

  it('sums tiers across all eight families (0 → 32)', () => {
    expect(countFamilyTiers([])).toBe(0)
    expect(countFamilyTiers(['bogus'])).toBe(0)
    expect(ACHIEVEMENT_CATEGORIES.length).toBe(8)
    expect(countFamilyTiers(ALL_IDS)).toBe(
      ACHIEVEMENT_CATEGORIES.length * DOC_FAMILY_TIER_STEPS.length
    )
    expect(countFamilyTiers(ALL_IDS)).toBe(32)
  })

  it('matches the documented formula across the whole registry', () => {
    // 1.012^N × 1.015^(8 aile × 4 kademe) — Math.pow ile bağımsız doğrulama.
    const expected =
      Math.pow(DOC_PER_ACHIEVEMENT_MULT, ACHIEVEMENTS.length) *
      Math.pow(DOC_FAMILY_TIER_MULT, ACHIEVEMENT_CATEGORIES.length * DOC_FAMILY_TIER_STEPS.length)
    const actual = calcAchievementMultiplier(ALL_IDS).toNumber()
    expect(actual).toBeCloseTo(expected, 9)
    // Kademe bileşeninin tavanı eski satır çarpanıyla neredeyse aynı:
    // 1.015^32 ≈ ×1.611 (eski 1.06^8 ≈ ×1.594). Fark, erken ödemede.
    expect(Math.pow(DOC_FAMILY_TIER_MULT, 32)).toBeCloseTo(1.6103, 3)
    // Sanity band: the design target for the full set is "a few ×", never runaway.
    expect(actual).toBeGreaterThan(2)
    expect(actual).toBeLessThan(5)
  })

  it('stays finite and non-NaN (break_eternity isNan, not Number.isNaN)', () => {
    const full = calcAchievementMultiplier(ALL_IDS)
    expect(full.isNan()).toBe(false)
    expect(Number.isNaN(full.mag)).toBe(false)
    expect(Number.isFinite(full.mag)).toBe(true)
    expect(full.gte(1)).toBe(true)
  })

  it('is strictly increasing as achievements are added', () => {
    let previous = 0
    const acc: string[] = []
    for (const id of ALL_IDS) {
      acc.push(id)
      const value = calcAchievementMultiplier(acc).toNumber()
      expect(value).toBeGreaterThan(previous)
      previous = value
    }
  })

  it('only counts fully completed rows', () => {
    const dopamine = categoryDefs('dopamine').map((a) => a.id)
    const lab = categoryDefs('lab').map((a) => a.id)
    expect(countCompletedRows([])).toBe(0)
    // One short of finishing the row: the full-row flag must stay false.
    expect(countCompletedRows(dopamine.slice(0, -1))).toBe(0)
    expect(countCompletedRows(dopamine)).toBe(1)
    expect(countCompletedRows([...dopamine, ...lab.slice(0, -1)])).toBe(1)
    expect(countCompletedRows([...dopamine, ...lab])).toBe(2)
    // Unknown ids never complete a row by accident.
    expect(countCompletedRows([...dopamine.slice(0, -1), 'not_a_real_id'])).toBe(0)
    expect(countCompletedRows(ALL_IDS)).toBe(ACHIEVEMENT_CATEGORIES.length)
  })

  it('treats isCategoryComplete as an exact set match', () => {
    const ids = categoryDefs('crisis').map((a) => a.id)
    expect(isCategoryComplete('crisis', [])).toBe(false)
    expect(isCategoryComplete('crisis', ids.slice(0, -1))).toBe(false)
    expect(isCategoryComplete('crisis', ids)).toBe(true)
    expect(isCategoryComplete('crisis', [...ids, 'unrelated'])).toBe(true)
  })
})

describe('hasAchievementReward', () => {
  const clickX2 = ACHIEVEMENTS.find((a) => a.reward?.kind === 'click_x2')

  it('only fires for unlocked grants', () => {
    expect(clickX2).toBeDefined()
    if (!clickX2) return
    expect(hasAchievementReward([], 'click_x2')).toBe(false)
    expect(hasAchievementReward([clickX2.id], 'click_x2')).toBe(true)
  })

  it('does not leak a granted kind from one achievement to another', () => {
    // The signature already forbids an undeclared kind at compile time; at
    // runtime a valid-but-unearned kind must stay false.
    expect(clickX2).toBeDefined()
    if (!clickX2) return
    expect(hasAchievementReward([clickX2.id], 'sp_discount')).toBe(false)
    expect(hasAchievementReward([clickX2.id], 'starting_matter')).toBe(false)
  })

  it('reports every declared reward kind once the whole set is unlocked', () => {
    for (const kind of Object.keys(DECLARED_REWARD_KINDS) as AchievementRewardKind[]) {
      expect(hasAchievementReward(ALL_IDS, kind)).toBe(true)
    }
  })
})
