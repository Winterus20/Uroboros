import { describe, expect, it } from 'vitest'

import type { AchievementCategoryId } from '../models/types'
import { ACHIEVEMENTS } from './achievements'
import { FEATURE_UNLOCKS } from './unlocks'
import {
  BRANCH_GATES,
  SPINE_FEATURE_IDS,
  branchProgress,
  countFamilyAchievements,
  getBranchGate,
  isBranchFeature,
  isSpineFeature
} from './branches'

/**
 * P3.1 — Başarım kapılı dallar: DEĞİŞMEZLER (invariants).
 *
 * Bu dosya veri tablosunun bütünlüğünü kilitler: kayıpsız (omurga + dal =
 * tüm FEATURE_UNLOCKS), örtüşmeksiz (bir id iki tarafta da yok), softlock'suz
 * (safe listesi her zaman hedefi karşılar) ve gerçek başarım id'leriyle beslenir.
 */

const FEATURE_IDS: ReadonlySet<string> = new Set(FEATURE_UNLOCKS.map((f) => f.id))
const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

function achievementIdsIn(family: AchievementCategoryId): string[] {
  return ACHIEVEMENTS.filter((a) => a.category === family).map((a) => a.id)
}

describe('BRANCH_GATES — tablo degismezleri', () => {
  it('a) her gate.featureId FEATURE_UNLOCKS icinde vardir', () => {
    expect(BRANCH_GATES.length).toBeGreaterThan(0)
    for (const gate of BRANCH_GATES) {
      expect(FEATURE_IDS.has(gate.featureId)).toBe(true)
    }
  })

  it('b) her ozellik ya SPINE de ya da tam olarak BIR BRANCH_GATES kaydindadir (kayipsiz + ortusmesiz)', () => {
    const spine = new Set(SPINE_FEATURE_IDS)
    expect(SPINE_FEATURE_IDS.length).toBeGreaterThan(0)
    for (const id of SPINE_FEATURE_IDS) {
      expect(FEATURE_IDS.has(id)).toBe(true)
    }
    for (const f of FEATURE_UNLOCKS) {
      const gateCount = BRANCH_GATES.filter((g) => g.featureId === f.id).length
      if (spine.has(f.id)) {
        // Örtüşmesiz: spine id'si hiçbir gate'e kiralanamaz.
        expect(gateCount).toBe(0)
      } else {
        // Kayıpsız: spine dışındaki her özellik tam olarak bir daldır.
        expect(gateCount).toBe(1)
      }
    }
  })

  it('c) her safeAchievementIds elemani ACHIEVEMENTS icinde VAR ve ailesi gate.family ile AYNI', () => {
    for (const gate of BRANCH_GATES) {
      expect(gate.safeAchievementIds.length).toBeGreaterThan(0)
      for (const id of gate.safeAchievementIds) {
        const def = ACHIEVEMENT_BY_ID.get(id)
        expect(def).toBeDefined()
        expect(def?.category).toBe(gate.family)
      }
    }
  })

  it('d) her gate icin safeAchievementIds.length >= requiredAchievements (softlock korumasi)', () => {
    for (const gate of BRANCH_GATES) {
      expect(gate.safeAchievementIds.length).toBeGreaterThanOrEqual(gate.requiredAchievements)
    }
  })

  it('e) requiredAchievements >= 1 (0 hedefli dal asla kilitlenemezdi)', () => {
    for (const gate of BRANCH_GATES) {
      expect(Number.isInteger(gate.requiredAchievements)).toBe(true)
      expect(gate.requiredAchievements).toBeGreaterThanOrEqual(1)
    }
  })

  it('h) ayni feature id numarasi iki kez gatelenmemis', () => {
    const ids = BRANCH_GATES.map((g) => g.featureId)
    expect(new Set(ids).size).toBe(ids.length)
    // Ve getBranchGate bu idleri dogru cevirer, bilinmeyeni null verir.
    for (const gate of BRANCH_GATES) {
      expect(getBranchGate(gate.featureId)).toBe(gate)
    }
    expect(getBranchGate('crisis_spawn')).toBeNull()
    expect(getBranchGate('not_a_feature')).toBeNull()
    expect(getBranchGate('')).toBeNull()
  })
})

describe('branchProgress', () => {
  it('f) bos listede current 0 / unlocked false; tam safe listesi unlocked true yapar', () => {
    for (const gate of BRANCH_GATES) {
      const empty = branchProgress(gate, [])
      expect(empty.current).toBe(0)
      expect(empty.target).toBe(gate.requiredAchievements)
      expect(empty.unlocked).toBe(false)

      // Kısmi kazanım: hedefin bir altı hâlâ kilitli.
      const partial = branchProgress(gate, gate.safeAchievementIds.slice(0, gate.requiredAchievements - 1))
      expect(partial.current).toBe(gate.requiredAchievements - 1)
      expect(partial.unlocked).toBe(false)

      const full = branchProgress(gate, gate.safeAchievementIds)
      expect(full.current).toBe(gate.safeAchievementIds.length)
      expect(full.unlocked).toBe(true)
    }
  })

  it('f) safe listesi DISINDAKI ayni-aile basarimlari current degerini ARTIRMAZ', () => {
    for (const gate of BRANCH_GATES) {
      const extras = achievementIdsIn(gate.family).filter((id) => !gate.safeAchievementIds.includes(id))
      const withExtras = branchProgress(gate, [...gate.safeAchievementIds, ...extras])
      const onlySafe = branchProgress(gate, gate.safeAchievementIds)
      expect(withExtras.current).toBe(onlySafe.current)
      // Yalnizca extra (safe olmayan) basarimlarla dal asla acilmaz.
      if (extras.length > 0) {
        const onlyExtras = branchProgress(gate, extras)
        expect(onlyExtras.current).toBe(0)
        expect(onlyExtras.unlocked).toBe(false)
      }
    }
  })

  it('f) tekrar eden idler sayiyi sisirmez (Set tabanli sayim)', () => {
    for (const gate of BRANCH_GATES) {
      const doubled = [...gate.safeAchievementIds, ...gate.safeAchievementIds]
      const progress = branchProgress(gate, doubled)
      expect(progress.current).toBe(gate.safeAchievementIds.length)
      expect(progress.unlocked).toBe(true)
    }
  })
})

describe('countFamilyAchievements', () => {
  it('g) bilinmeyen idleri yok sayar', () => {
    const crisisIds = achievementIdsIn('crisis')
    expect(crisisIds.length).toBeGreaterThan(0)
    expect(countFamilyAchievements('crisis', [...crisisIds, 'does_not_exist', 'also_fake'])).toBe(crisisIds.length)
    expect(countFamilyAchievements('crisis', ['does_not_exist'])).toBe(0)
    expect(countFamilyAchievements('crisis', [])).toBe(0)
  })

  it('g) yanlis ailedeki idleri saymaz', () => {
    const automationIds = achievementIdsIn('automation')
    expect(automationIds.length).toBeGreaterThan(0)
    expect(countFamilyAchievements('crisis', automationIds)).toBe(0)
    // automation icinde degerli, crisis icinde yabanci id'ler:
    expect(countFamilyAchievements('crisis', ['auto_first', 'lab_seed', 'gui_seen'])).toBe(0)
    // dogru ailede gercek id'ler sayilir:
    expect(countFamilyAchievements('crisis', ['cri_first', 'cri_10'])).toBe(2)
    // tekrarlar tek sayilir:
    expect(countFamilyAchievements('crisis', ['cri_first', 'cri_first'])).toBe(1)
  })
})

describe('spine / dal siniflandirmasi', () => {
  it('isSpineFeature / isBranchFeature ayrimi tutarli ve disi kapali', () => {
    for (const id of SPINE_FEATURE_IDS) {
      expect(isSpineFeature(id)).toBe(true)
      expect(isBranchFeature(id)).toBe(false)
    }
    for (const gate of BRANCH_GATES) {
      expect(isBranchFeature(gate.featureId)).toBe(true)
      expect(isSpineFeature(gate.featureId)).toBe(false)
    }
    expect(isSpineFeature('not_a_feature')).toBe(false)
    expect(isBranchFeature('not_a_feature')).toBe(false)
  })

  it('giris katmanlari spine, derin katmanlar dal (lab/guilt kendi kendini kilitler)', () => {
    // Giris katmanlari: SPINE — aile kapacini acar, kendi kendini kilitlemez.
    expect(isSpineFeature('lab')).toBe(true)
    expect(isSpineFeature('guilt_slackers')).toBe(true)
    // Derin katmanlar: ayni ailenin basarim kapisina girer.
    for (const id of ['seed_nucleon', 'seed_gluon', 'seed_graviton']) {
      expect(getBranchGate(id)?.family).toBe('lab')
    }
    for (const id of ['event_horizon_lens', 'hawking_resonator', 'cosmic_filament']) {
      expect(getBranchGate(id)?.family).toBe('guilt')
    }
    // lab_seed (lab kapaliyken kazanilamaz) safe listesinde; guilt aynisi:
    expect(getBranchGate('seed_nucleon')?.safeAchievementIds).toContain('lab_seed')
    expect(getBranchGate('event_horizon_lens')?.safeAchievementIds).toContain('gui_seen')
  })
})
