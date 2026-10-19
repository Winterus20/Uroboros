import type { AchievementCategoryId } from '../models/types'
import { ACHIEVEMENTS } from './achievements'

/**
 * Başarım Kapılı Yatay Dallar (P3.1 — pacing planı, bölüm 2)
 *
 * İki katmanlı kapı modeli:
 *
 * 1) SPINE (omurga): deterministik dekad kapısı. `crisis_spawn` → `challenges`
 *    arasındaki özellikler yalnızca kütle/sayaç eşığıne bakar; başarım
 *    durumundan bağımsızdır (ADR-0032'nin 0 → 308 merdiveni).
 *
 * 2) BRANCH (dal): opsiyonel yatay özellikler. Dekad eşiği dalı GÖRÜNÜR yapar,
 *    asıl açılış kendi başarım ailesinden yeterli sayıda başarım kazanmakla
 *    olur (`unlocks.ts` içinde `branchProgress` değerlendirilir).
 *
 * Neden bu dağılım: `lab` ve `guilt` aileleri KENDİ kendini kilitler
 * (`lab_seed` için laboratuvarın yani `lab` özelliğinin açık olması,
 * `gui_seen` için parazitlerin yani `guilt_slackers` özelliğinin açık olması
 * gerekir), o yüzden bu ailelerin başarım kapısına giren özellikler
 * DALLARIN DERİN katmanlarıdır; giriş katmanları (`lab`, `guilt_slackers`)
 * SPINE'dır. Softlock yok: her gate'in `safeAchievementIds` listesi dal
 * açılmadan önce de kazanılabilir başarımları içerir ve hedefi karşılar.
 */
export interface BranchGate {
  /** FEATURE_UNLOCKS içindeki id */
  featureId: string
  /** Bu dalın bağlı olduğu başarım ailesi */
  family: AchievementCategoryId
  /** Bu aileden gereken başarım sayısı */
  requiredAchievements: number
  /** Dal açılmadan KAZANILABİLEN aile başarımları (softlock koruması) */
  safeAchievementIds: string[]
}

/**
 * Omurga: dekad kapısıyla açılan, başarım istemeyen çekirdek özellikler.
 * Bunlar üzerinde `BRANCH_GATES` kaydı OLAMAZ (bkz. branches.test.ts).
 */
export const SPINE_FEATURE_IDS: readonly string[] = [
  'crisis_spawn',
  'autobuyers',
  'stance_spam',
  'stance_private',
  'lab',
  'guilt_slackers',
  'night_watch',
  'challenges'
]

/**
 * Neden bu dağılım:
 * - `colony` / `crisis` giriş katmanı dallardır: automation ve crisis
 *   başarımları bu özellikler AÇILMADAN da kazanılabilir (botlar dekad
 *   kapısından, dalgalanmalar `crisis_spawn` omurgasından gelir).
 * - `lab` ve `guilt` aileleri KENDİ kendini kilitler (`lab_seed` için lab
 *   açılmış olmalı, `gui_seen` için parazitler açılmış olmalı); o yüzden bu
 *   ailelerin başarım kapısına giren özellikler dalların DERİN katmanlarıdır,
 *   giriş katmanları (`lab`, `guilt_slackers`) SPINE'dır.
 * - `time_clock` singularity ailesine bağlıdır: `sin_sight` / `sin_first`
 *   koşu içinde erken kazanılabilir, `sin_hour` ilk saatte gelir.
 */
export const BRANCH_GATES: BranchGate[] = [
  {
    featureId: 'colony',
    family: 'automation',
    requiredAchievements: 2,
    safeAchievementIds: ['auto_first', 'auto_bulk', 'auto_max']
  },
  {
    featureId: 'crisis',
    family: 'crisis',
    requiredAchievements: 2,
    safeAchievementIds: ['cri_first', 'cri_10']
  },
  {
    featureId: 'spell_espresso',
    family: 'crisis',
    requiredAchievements: 3,
    safeAchievementIds: ['cri_first', 'cri_10', 'cri_combo']
  },
  {
    featureId: 'spell_noise',
    family: 'crisis',
    requiredAchievements: 4,
    safeAchievementIds: ['cri_first', 'cri_10', 'cri_combo', 'cri_50']
  },
  {
    featureId: 'spell_sleep',
    family: 'crisis',
    requiredAchievements: 5,
    safeAchievementIds: ['cri_first', 'cri_10', 'cri_combo', 'cri_50', 'cri_combo5']
  },
  {
    featureId: 'seed_nucleon',
    family: 'lab',
    requiredAchievements: 2,
    safeAchievementIds: ['lab_seed', 'lab_harvest']
  },
  {
    featureId: 'seed_gluon',
    family: 'lab',
    requiredAchievements: 4,
    safeAchievementIds: ['lab_seed', 'lab_harvest', 'lab_10', 'lab_mature3']
  },
  {
    featureId: 'time_clock',
    family: 'singularity',
    requiredAchievements: 3,
    safeAchievementIds: ['sin_sight', 'sin_first', 'sin_hour']
  },
  {
    featureId: 'seed_graviton',
    family: 'lab',
    requiredAchievements: 5,
    safeAchievementIds: ['lab_seed', 'lab_harvest', 'lab_10', 'lab_mature3', 'lab_full']
  },
  {
    featureId: 'event_horizon_lens',
    family: 'guilt',
    requiredAchievements: 2,
    safeAchievementIds: ['gui_seen', 'gui_full']
  },
  {
    featureId: 'hawking_resonator',
    family: 'guilt',
    requiredAchievements: 3,
    safeAchievementIds: ['gui_seen', 'gui_full', 'gui_5']
  },
  {
    featureId: 'cosmic_filament',
    family: 'guilt',
    requiredAchievements: 5,
    safeAchievementIds: ['gui_seen', 'gui_full', 'gui_5', 'gui_25', 'gui_leech']
  }
]

const BRANCH_GATE_BY_FEATURE: ReadonlyMap<string, BranchGate> = new Map(
  BRANCH_GATES.map((gate) => [gate.featureId, gate] as const)
)

/** featureId için dal kapısını döndürür; omurga özelliklerinde `null`. */
export function getBranchGate(featureId: string): BranchGate | null {
  return BRANCH_GATE_BY_FEATURE.get(featureId) ?? null
}

/** Özellik omurgada mı (dekad kapısı, başarım gerektirmez)? */
export function isSpineFeature(featureId: string): boolean {
  return SPINE_FEATURE_IDS.includes(featureId)
}

/** Özellik başarım kapılı bir dal mı? */
export function isBranchFeature(featureId: string): boolean {
  return getBranchGate(featureId) !== null
}

/**
 * `unlockedIds` içinden bu aileye ait GERÇEKTEN var olan başarımları sayar:
 * bilinmeyen id'ler ve yanlış ailedeki id'ler yok sayılır.
 */
export function countFamilyAchievements(
  family: AchievementCategoryId,
  unlockedIds: readonly string[]
): number {
  const unlocked = new Set(unlockedIds)
  return ACHIEVEMENTS.filter((a) => a.category === family && unlocked.has(a.id)).length
}

/**
 * Dalın açılış ilerlemesi.
 *
 * `current` yalnızca `gate.safeAchievementIds` içinden kazanılanları sayar —
 * aynı ailenin diğer başarımları (dal açılmadan erişilemez) sayıyı artırmaz.
 * `target` = `requiredAchievements` (hedef <= 0 ise dal zaten açıktır).
 * `unlocked` = `current >= target`.
 */
export function branchProgress(
  gate: BranchGate,
  unlockedIds: readonly string[]
): { current: number; target: number; unlocked: boolean } {
  const target = gate.requiredAchievements
  const safe = new Set(gate.safeAchievementIds)
  const current = new Set(unlockedIds.filter((id) => safe.has(id))).size
  const unlocked = target <= 0 || current >= target
  return { current, target, unlocked }
}
