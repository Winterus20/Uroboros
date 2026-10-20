import { describe, expect, it } from "vitest"

import { createFreshStore } from "../test/helpers"
import { Decimal } from "../core/math"
import {
  ACHIEVEMENTS,
  FAMILY_TIER_STEPS,
  achievementSpMult,
  categoryDefs,
  countFamilyTiers,
  familyTierCount
} from "../game/achievements"
import type { AchievementCategoryId } from "../models/types"

/**
 * Plan §10.1 O3 — Başarım aile kademeleri SP (şöhret puanı) kazancını da
 * güçlendirir.
 *
 * Mekanik: SP kazancının çarpan zinciri
 *   totalMult = şafak hızı × challenge × relik × achievementSpMult
 * şeklindedir; achievementSpMult = 1 + 0.03 × aile kademesi (0..32) → tavan 1.96×.
 *
 * Burada ölçülen: store seviyesinde singularityGain gerçekten aile kademesiyle
 * artıyor mu? Ölçüm POST-BREAK dalda yapılır, çünkü pre-break dalda taban
 * "1 + singularities" olduğu için kazanç oranı kademe oranıyla birebir
 * çıkmaz (taban 1'e yakınken floor 1'e düşürür).
 */

/**
 * Post-break koşu için kütle: log10 = 578 → logDiff = 270 → 270/45 = 6 →
 * taban = 3 × 10^6 SP. Üstel ölçekleme (10^(logDiff/45)) tam sayıya düştüğü
 * için kazanç oranı kademe çarpanıyla birebir ölçülebilir.
 */
const POST_BREAK_MATTER = "1e578"

/** Bir aileden, hedeflenen kademe sayısını verecek kadar plaket seçer. */
function idsWithTiers(categoryId: AchievementCategoryId, tiers: number): string[] {
  const ids = categoryDefs(categoryId).map((a) => a.id)
  const threshold = FAMILY_TIER_STEPS[tiers - 1]
  const chosen = ids.slice(0, Math.ceil(ids.length * threshold))
  expect(familyTierCount(categoryId, chosen)).toBe(tiers)
  return chosen
}

/** Planck duvarı kırılmış, verilen başarımlarla donatılmış bir koşu kurar. */
function postBreakStore(achievementIds: readonly string[]) {
  const store = createFreshStore()
  store.matter = new Decimal(POST_BREAK_MATTER)
  store.neuralNodesBought = { break_singularity: 1 }
  store.achievements = [...achievementIds]
  return store
}

describe("Plan §10.1 O3 — başarım aile kademeleri SP kazancını güçlendirir", () => {
  it("post-break dalda 0 kademe ile 2 kademe arasındaki kazanç oranı 1.06'dır", () => {
    const plain = postBreakStore([])
    const tiered = postBreakStore(idsWithTiers("dopamine", 2))

    expect(plain.hasBreakSingularity).toBe(true)
    expect(countFamilyTiers(plain.achievements)).toBe(0)
    expect(countFamilyTiers(tiered.achievements)).toBe(2)

    const gainPlain = plain.singularityGain
    const gainTiered = tiered.singularityGain

    expect(gainTiered.gt(gainPlain)).toBe(true)

    // 1 + 0.03 × 2 kademe = 1.06
    const expectedRatio =
      achievementSpMult(tiered.achievements) / achievementSpMult(plain.achievements)
    expect(expectedRatio).toBeCloseTo(1.06, 10)
    expect(gainTiered.div(gainPlain).toNumber()).toBeCloseTo(expectedRatio, 9)
  })

  it("tüm aileler tamamlandığında (32 kademe) kazanç ×1.96 olur", () => {
    const plain = postBreakStore([])
    const full = postBreakStore(ACHIEVEMENTS.map((a) => a.id))

    expect(countFamilyTiers(full.achievements)).toBe(32)
    expect(achievementSpMult(full.achievements)).toBeCloseTo(1.96, 10)

    const ratio = full.singularityGain.div(plain.singularityGain).toNumber()
    expect(ratio).toBeCloseTo(1.96, 6)
  })

  it("kademe sayısı arttıkça SP kazancı artar (tekdüze)", () => {
    const plain = postBreakStore([])
    const base = plain.singularityGain

    let previous = base
    for (let tiers = 1; tiers <= FAMILY_TIER_STEPS.length; tiers++) {
      const store = postBreakStore(idsWithTiers("dopamine", tiers))
      const gain = store.singularityGain
      expect(gain.gt(previous)).toBe(true)
      previous = gain
    }
  })

  it("bilinmeyen başarım id'si kademe artırmaz → kazanç değişmez (ADR-0031)", () => {
    const tiered = postBreakStore(idsWithTiers("dopamine", 2))
    const tampered = postBreakStore([...idsWithTiers("dopamine", 2), "not_a_real_id"])

    expect(countFamilyTiers(tampered.achievements)).toBe(2)
    expect(tampered.singularityGain.eq(tiered.singularityGain)).toBe(true)
  })

  it("pre-break dal (şafak merdiveni) de aynı çarpanı uygular", () => {
    const plain = createFreshStore()
    plain.matter = new Decimal("1.8e308")
    plain.singularities = 100
    plain.achievements = []

    const tiered = createFreshStore()
    tiered.matter = new Decimal("1.8e308")
    tiered.singularities = 100
    tiered.achievements = idsWithTiers("dopamine", 2)

    expect(plain.hasBreakSingularity).toBe(false)

    const gainPlain = plain.singularityGain
    const gainTiered = tiered.singularityGain

    // Taban 1 + singularities = 101; floor(101 × 1.06) = 107 > floor(101 × 1) = 101
    expect(gainPlain.toNumber()).toBe(101)
    expect(gainTiered.toNumber()).toBe(107)
    expect(gainTiered.gt(gainPlain)).toBe(true)
  })

  it("kazanç zinciri ile hedef göstergesi aynı çarpanları kullanır", () => {
    const store = postBreakStore(idsWithTiers("dopamine", 2))

    // Oyuncunun görebildiği çarpan bileşenleri (store'un public getter'ları):
    // şafak hızı × challenge × relik × achievement (başarım aile kademeleri).
    const chain =
      store.neuralEffects.dawnSpeedMult *
      store.challengeRewardEffects.spMult *
      store.reactorRelicBonuses.spGainMult *
      achievementSpMult(store.achievements)
    expect(chain).toBeCloseTo(1.06, 10)

    const gain = store.singularityGain
    const nextTarget = gain.plus(1)
    const target = store.nextSingularityPointAt

    // (1) Hedef kütle, kazançla AYNI çarpan zinciriyle hesaplanmış olmalı.
    //     Kazanç formülü: 3 × 10^((log10(kütle) − 308) / 45) × çarpan.
    const expectedLog = 308 + 45 * Math.log10(nextTarget.toNumber() / (3 * chain))
    expect(target.log10().toNumber()).toBeCloseTo(expectedLog, 6)

    // (2) Gösterge bizi hedeflediği kütleye ulaştığında ham kazanç TAM olarak
    //     bir sonraki SP noktasına (nextTarget) ulaşır — gösterge yanıltmaz.
    const rawAtTarget = Decimal.pow(10, (target.log10().toNumber() - 308) / 45)
      .times(3)
      .times(chain)
    expect(rawAtTarget.div(nextTarget).toNumber()).toBeCloseTo(1, 6)

    // (3) Oyuncu hedef kütleye ulaştığında gördüğü kazanç +1'e geçer.
    store.matter = target
    const gainAtTarget = store.singularityGain.toNumber()
    expect(gainAtTarget).toBeGreaterThanOrEqual(gain.toNumber())
    expect(gainAtTarget).toBeLessThanOrEqual(gain.toNumber() + 1)
  })

  it("başarım SP çarpanı üretim çarpanından bağımsızdır", () => {
    // Üretim çarpanı (achievementMultiplier) yalnızca başarım SAYISI ve kademe
    // ile hesaplanır; SP çarpanı ona hiç dokunmaz (iki çarpan ayrı kalır).
    const store = postBreakStore(idsWithTiers("dopamine", 4))
    const expectedProduction =
      Math.pow(1.012, store.achievements.length) * Math.pow(1.015, 4)
    expect(store.achievementMultiplier.toNumber()).toBeCloseTo(expectedProduction, 9)
  })
})
