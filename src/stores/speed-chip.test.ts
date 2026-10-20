import { describe, expect, it } from "vitest"
import { createFreshStore } from "../test/helpers"
import { Decimal } from "../core/math"
import {
  CHIP_BASE_COST,
  CHIP_COST_MULT,
  CHIP_MAX_LEVEL,
  CHIP_PRODUCTION_PER_LEVEL,
  isSpeedChipMaxed,
  speedChipCost,
  speedChipEffectLabel,
  speedChipProductionMult
} from "../game/speed-chip"

/**
 * M1 — Üretim Çipi (production chip) testleri.
 * Spec: brain/research/m1-speed-chip-spec-2026-10.md (§2 mekanik, §3 sayılar, §4 uygulama).
 *
 * M1 v2 (revizyon): çipin etkisi "bot hızı" DEĞİL, "boyut üretim çarpanı".
 *   speedChipProductionMult(level) = 1.03^level (her seviye +%3, ÇARPIMLA).
 *   Ölçüm gerekçesi: bot hızı çarpanı ölçüldü ve etkisi SIFIR çıktı; darboğaz
 *   bot hızı değil KÜTLE idi. Kütleyi çipe harcamak boyut kovasına harcamaktan
 *   daima daha zayıf olduğu için mekanizma baskılanmıştı (dominated).
 *
 * Kilitlenen garantiler:
 *  (1) maliyet: level 0 → CHIP_BASE_COST; monoton artar; formül birebir (Decimal),
 *  (2) üretim çarpanı: level 0 → 1; 1.03^level birebir; monoton artar,
 *  (3) cüzdan yetersizken satın alma NO-OP (state değişmez, hata fırlatılmaz),
 *  (4) yeterli cüzdanla: seviye artar, kütle TAM maliyet kadar azalır,
 *  (5) CHIP_MAX_LEVEL aşılamaz (no-op),
 *  (6) koşu içi: prestij/ölçek sıçraması sonrası seviye 0 (tickspeed ile aynı kanca),
 *  (7) BAYAT CACHE YOK: aynı state + farklı çip seviyesi → boyut çarpanı DEĞİŞİR
 *      (cache anahtarı speedChipLevel'ı içermeli),
 *  (8) ETKİ: çip seviyesi arttıkça boyut üretim çarpanı artar,
 *  (9) çip bot satın alma temposunu ETKİLEMEZ (bot hızı etkisi tamamen kaldırıldı),
 *  (10) çip KAYDEDİLMEZ (koşu içi): serialize listesinde yoktur.
 */

/** Çip seviyesi verilmiş, D1 botu açık bir koşu kurar (bot: single mod, 8 sn aralık). */
function chipStore(chipLevel: number) {
  const store = createFreshStore()
  store.matter = new Decimal("1e30")
  expect(store.unlockAutobuyer("dim1")).toBe(true)
  store.speedChipLevel = chipLevel
  return store
}

describe("M1 Üretim Çipi — saf çekirdek (src/game/speed-chip.ts)", () => {
  it("(1) ölçüm kilidi: speedChipCost(0) === CHIP_BASE_COST", () => {
    expect(speedChipCost(0).eq(new Decimal(CHIP_BASE_COST))).toBe(true)
    expect(speedChipCost(0).toNumber()).toBe(CHIP_BASE_COST)
  })

  it("(1b) maliyet seviyeyle MONOTON artar (her seviye 4 dekad)", () => {
    let previous = speedChipCost(0)
    for (let level = 1; level <= CHIP_MAX_LEVEL; level++) {
      const cost = speedChipCost(level)
      expect(cost.gt(previous)).toBe(true)
      // Seviye başına tam 4 dekad: log10 oranı birebir 4
      expect(cost.log10().minus(previous.log10()).toNumber()).toBeCloseTo(4, 9)
      previous = cost
    }
  })

  it("(1c) maliyet formülü Decimal ile birebir: BASE × MULT^level", () => {
    for (let level = 0; level <= CHIP_MAX_LEVEL; level++) {
      const expected = new Decimal(CHIP_BASE_COST).times(Decimal.pow(CHIP_COST_MULT, level))
      expect(speedChipCost(level).eq(expected)).toBe(true)
    }
  })

  it("(2) üretim çarpanı: seviye 0 → 1; 1.03^level birebir; monoton artar", () => {
    expect(speedChipProductionMult(0).eq(new Decimal(1))).toBe(true)
    expect(speedChipProductionMult(0).toNumber()).toBe(1)
    let previous = speedChipProductionMult(0)
    for (let level = 1; level <= CHIP_MAX_LEVEL; level++) {
      const mult = speedChipProductionMult(level)
      expect(mult.gt(previous)).toBe(true)
      // Birebir: (1 + CHIP_PRODUCTION_PER_LEVEL)^level
      const expected = Decimal.pow(1 + CHIP_PRODUCTION_PER_LEVEL, level)
      expect(mult.eq(expected)).toBe(true)
      previous = mult
    }
    // Tavan: 40 seviyede ×3.26
    expect(speedChipProductionMult(CHIP_MAX_LEVEL).toNumber()).toBeCloseTo(3.262, 3)
    expect(isSpeedChipMaxed(CHIP_MAX_LEVEL)).toBe(true)
    expect(isSpeedChipMaxed(CHIP_MAX_LEVEL - 1)).toBe(false)
  })

  it("(2b) etiket: seviye 0 etkisiz, üstü boyut üretim çarpanını gösterir", () => {
    expect(speedChipEffectLabel(0)).toBe("Etkisiz")
    // Seviye 5 → 1.03^5 = 1.15927 → "Boyut üretimi ×1.16"
    expect(speedChipEffectLabel(5)).toBe("Boyut üretimi ×1.16")
    expect(speedChipEffectLabel(CHIP_MAX_LEVEL)).toBe("Boyut üretimi ×3.26")
  })
})

describe("M1 Üretim Çipi — satın alma (store)", () => {
  it("(3) cüzdan yetersizken satın alma NO-OP: state değişmez, hata fırlatılmaz", () => {
    const store = createFreshStore()
    store.matter = new Decimal(CHIP_BASE_COST).div(10) // CHIP_BASE_COST altı
    const before = store.matter

    const bought = store.buySpeedChip(false)

    expect(bought).toBe(false)
    expect(store.speedChipLevel).toBe(0)
    expect(store.matter.eq(before)).toBe(true)
  })

  it("(4) yeterli cüzdanla seviye artar, kütle TAM maliyet kadar azalır", () => {
    const store = createFreshStore()
    store.matter = new Decimal(CHIP_BASE_COST).times(10)
    const before = store.matter
    const cost = speedChipCost(0)

    const bought = store.buySpeedChip(false)

    expect(bought).toBe(true)
    expect(store.speedChipLevel).toBe(1)
    expect(store.matter.eq(before.minus(cost))).toBe(true)
    // Bir sonraki çipin maliyeti bir kademe daha pahalı
    expect(store.speedChipCost.eq(speedChipCost(1))).toBe(true)
  })

  it("(5) CHIP_MAX_LEVEL aşılırsa NO-OP (kütle ve seviye değişmez)", () => {
    const store = createFreshStore()
    store.matter = new Decimal("1e300")
    store.speedChipLevel = CHIP_MAX_LEVEL
    const before = store.matter

    const bought = store.buySpeedChip(false)

    expect(bought).toBe(false)
    expect(store.speedChipLevel).toBe(CHIP_MAX_LEVEL)
    expect(store.matter.eq(before)).toBe(true)
    expect(store.canBuySpeedChip).toBe(false)
  })

  it("(5b) cüzdan yetersizken canBuySpeedChip false, yeterliyken true", () => {
    const store = createFreshStore()
    store.matter = new Decimal(CHIP_BASE_COST).div(10)
    expect(store.canBuySpeedChip).toBe(false)
    store.matter = new Decimal(CHIP_BASE_COST)
    expect(store.canBuySpeedChip).toBe(true)
    expect(store.speedChipProductionMult.eq(new Decimal(1))).toBe(true)
  })
})

describe("M1 Üretim Çipi — koşu içi sıfırlama", () => {
  it("(6a) prestij/koşu sıfırlaması (resetRunState) seviyeyi 0'a döndürür (tickspeed ile aynı kanca)", () => {
    const store = createFreshStore()
    store.speedChipLevel = 6
    store.tickspeedBought = 9

    store.resetRunState()

    expect(store.speedChipLevel).toBe(0)
    expect(store.tickspeedBought).toBe(0)
  })

  it("(6b) ölçek sıçraması (shift) de seviyeyi 0'a döndürür — çip tickspeed ile aynı anda sıfırlanır", () => {
    const store = createFreshStore()
    store.speedChipLevel = 4
    store.tickspeedBought = 3
    store.dimensions[2].amount = new Decimal(100) // shift hedefi: D3 × 10

    expect(store.dimensionShift(false)).toBe(true)

    expect(store.speedChipLevel).toBe(0)
    expect(store.tickspeedBought).toBe(0)
  })
})

describe("M1 Üretim Çipi — üretim çarpanı etkisi", () => {
  it("(7) BAYAT CACHE YOK: aynı state + farklı çip seviyesi → getDimensionMultiplier DEĞİŞİR", () => {
    const store = createFreshStore()
    store.dimensions[0].bought = 10
    store.dimensions[0].amount = new Decimal(100)

    const before = store.getDimensionMultiplier(1)
    store.speedChipLevel = 5
    const after = store.getDimensionMultiplier(1)

    // Cache anahtarı speedChipLevel'ı içermiyorsa 'after' bayat kalırdı (sessiz hata)
    expect(after.eq(before)).toBe(false)
    expect(after.div(before).toNumber()).toBeCloseTo(Math.pow(1.03, 5), 9)

    // Seviye geri alınınca değer birebir eski haline döner
    store.speedChipLevel = 0
    expect(store.getDimensionMultiplier(1).eq(before)).toBe(true)
  })

  it("(8) etki: çip seviyesi arttıkça boyut üretim çarpanı artıyor (getter üzerinden)", () => {
    const store = createFreshStore()
    let previous = store.speedChipProductionMult
    for (let level = 1; level <= CHIP_MAX_LEVEL; level++) {
      store.speedChipLevel = level
      const current = store.speedChipProductionMult
      expect(current.gt(previous)).toBe(true)
      expect(current.eq(speedChipProductionMult(level))).toBe(true)
      previous = current
    }
  })

  it("(8b) etki: çip seviyesi boyut çarpanını ve saniyelik üretimi ARTIRIR", () => {
    const plain = createFreshStore()
    const chipped = createFreshStore()
    plain.dimensions[0].amount = new Decimal(100)
    chipped.dimensions[0].amount = new Decimal(100)
    chipped.speedChipLevel = 5

    const plainMult = plain.getDimensionMultiplier(1)
    const chippedMult = chipped.getDimensionMultiplier(1)
    expect(chippedMult.gt(plainMult)).toBe(true)
    expect(chippedMult.div(plainMult).toNumber()).toBeCloseTo(Math.pow(1.03, 5), 9)

    expect(chipped.matterPerSecond.gt(plain.matterPerSecond)).toBe(true)
    expect(chipped.matterPerSecond.div(plain.matterPerSecond).toNumber()).toBeCloseTo(Math.pow(1.03, 5), 9)
  })

  it("(9) çip bot satın alma temposunu ETKİLEMEZ (bot hızı etkisi kaldırıldı)", () => {
    const plain = chipStore(0)
    const chipped = chipStore(20)

    plain.update(1)
    chipped.update(1)
    expect(chipped.autobuyers.dim1.timer).toBeCloseTo(plain.autobuyers.dim1.timer, 10)
    expect(chipped.autobuyerFleetSpeedMult).toBe(plain.autobuyerFleetSpeedMult)

    // 60 saniyede aynı sayıda bot alımı
    const dt = 0.5
    for (let i = 0; i < 120; i++) {
      plain.update(dt)
      chipped.update(dt)
    }
    expect(chipped.dimensions[0].bought).toBe(plain.dimensions[0].bought)
  })

  it("(9b) çip FREKANS çarpanını (tickspeed) ETKİLEMEZ; tıklama gücü üretimden türediği için ARTAR", () => {
    const plain = createFreshStore()
    const chipped = createFreshStore()
    chipped.speedChipLevel = 20
    plain.dimensions[0].amount = new Decimal(100)
    chipped.dimensions[0].amount = new Decimal(100)

    // Frekans (tickspeed) çarpanı üretim çarpanından BAĞIMSIZ → değişmez
    expect(chipped.tickspeedMultiplier.eq(plain.tickspeedMultiplier)).toBe(true)
    // Manuel tıklama gücünün bir bileşeni saniyelik üretimden türer (CPS senkron):
    // üretim çarpanı arttığı için tıklama gücü de artar (tasarım gereği, hata değil)
    expect(chipped.manualClickPower.gt(plain.manualClickPower)).toBe(true)
  })
})

describe("M1 Üretim Çipi — kayıt (run-scoped)", () => {
  it("(10) çip serialize listesinde YOKTUR ve round-trip sonrası 0'dan başlar", () => {
    const store = createFreshStore()
    store.speedChipLevel = 7

    const payload = store.serialize()
    const keys = Object.keys(payload as unknown as Record<string, unknown>)
    expect(keys).not.toContain("speedChipLevel")

    const fresh = createFreshStore()
    fresh.deserialize(payload)
    expect(fresh.speedChipLevel).toBe(0)
  })
})
