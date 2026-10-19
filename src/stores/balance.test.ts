import { describe, expect, it } from 'vitest'
import { useGameStore } from './game'
import { Decimal, D_INFINITY } from '../core/math'

describe('Denge ve Mimari Doğrulama Testleri', () => {
  it('challengeGoalReached: C1 hedefi 1e40 iken 1e40 seviyesinde tetiklenir (1e308 beklemez)', () => {
    const store = useGameStore()
    store.activeChallenge = 'c1'
    store.matter = new Decimal('1e39')
    expect(store.challengeGoalReached).toBe(false)

    store.matter = new Decimal('1e40')
    expect(store.challengeGoalReached).toBe(true)

    // canSingularity hala false iken bile challengeGoalReached true olmalıdır
    expect(store.canSingularity).toBe(false)
  })

  it('challengeGoalReached: C7 hedefi 1e500 iken 1.8e308 seviyesinde tamamlanmaz (erken bitme hatası önlenir)', () => {
    const store = useGameStore()
    store.activeChallenge = 'c7'
    store.matter = new Decimal('1.8e308')
    expect(store.canSingularity).toBe(true)
    // 1e500 hedefine ulaşılmadığı için challengeGoalReached false olmalıdır!
    expect(store.challengeGoalReached).toBe(false)

    store.matter = new Decimal('1e500')
    expect(store.challengeGoalReached).toBe(true)
  })

  it('Seçim Düğümlerinde SP iadesi: resetRunState choiceGroup SP lerini iade eder', () => {
    const store = useGameStore()
    store.singularityPoints = new Decimal(5)
    // 7 SP lik dream_ascetic düğümü al
    store.neuralNodesBought = { dream_ascetic: 1 }

    store.resetRunState()

    // dream_ascetic silinmeli ve 7 SP bakiyeye geri eklenmeli (5 + 7 = 12 SP)
    expect(store.neuralNodesBought.dream_ascetic).toBeUndefined()
    expect(store.singularityPoints.toNumber()).toBe(12)
  })

  it('Dinamik Toplu Uyku (Power Nap) eşiği: napCount arttıkça minNapBots yükselir', () => {
    const store = useGameStore()
    store.napCount = 0
    expect(store.minNapBots.toNumber()).toBe(100)

    store.napCount = 5
    expect(store.minNapBots.toNumber()).toBeGreaterThan(1000)
  })

  it('İlk Şafak Çöküşü (break_singularity yokken, singularities=0) tam olarak 1 SP verir', () => {
    const store = useGameStore()
    store.matter = new Decimal('1.8e308')
    expect(store.singularities).toBe(0)
    expect(store.hasBreakSingularity).toBe(false)
    expect(store.singularityGain.toNumber()).toBe(1)
  })

  it('break_singularity yokken Planck Duvarı kilitlidir: kütle 1e500 olsa dahi 1 SP verir ve nextSingularityPointAt D_INFINITY döner', () => {
    const store = useGameStore()
    store.matter = new Decimal('1e500')
    expect(store.hasBreakSingularity).toBe(false)
    expect(store.singularityGain.toNumber()).toBe(1)
    expect(store.nextSingularityPointAt.eq(D_INFINITY)).toBe(true)
  })

  // ---- Plan bölüm 8A: Şafak Merdiveni (ADR-0071) ----
  it('Şafak Merdiveni: kırılma öncesi kazanç 1 + singularities (1 -> 2 -> 3 SP)', () => {
    const store = useGameStore()
    store.matter = new Decimal('1.8e308')

    store.singularities = 0
    expect(store.singularityGain.toNumber()).toBe(1)

    store.singularities = 1
    expect(store.singularityGain.toNumber()).toBe(2)

    store.singularities = 2
    expect(store.singularityGain.toNumber()).toBe(3)

    store.singularities = 5
    expect(store.singularityGain.toNumber()).toBe(6)
  })

  it('Şafak Merdiveni: totalMult (Şafak Habercisi ×2) taban merdiveniyle çarpılır ve floor uygulanır', () => {
    const store = useGameStore()
    store.matter = new Decimal('1.8e308')
    store.neuralNodesBought = { dawn_harbinger: 1 }

    store.singularities = 0
    expect(store.singularityGain.toNumber()).toBe(2) // floor(1 × 2)

    store.singularities = 1
    expect(store.singularityGain.toNumber()).toBe(4) // floor(2 × 2)

    store.singularities = 2
    expect(store.singularityGain.toNumber()).toBe(6) // floor(3 × 2)
  })

  it('Şafak Merdiveni: taban 1 in altına düşse bile kazanç min 1 korumasına takılır', () => {
    const store = useGameStore()
    store.matter = new Decimal('1.8e308')
    // Savunma amaçlı senaryo: bozuk bir kayıt negatif tekilik sayısı enjekte
    // ederse (1 + singularities) negatife düşer; çarpan ne olursa olsun kazanç
    // 1 SP'nin altına inemez.
    store.singularities = -5
    expect(store.singularityGain.toNumber()).toBe(1)
  })

  it('Şafak Merdiveni: kırılma sonrası dal singularities sayısından ETKİLENMEZ (taban 3 korunur)', () => {
    const store = useGameStore()
    store.neuralNodesBought = { break_singularity: 1 }
    store.matter = new Decimal('1.8e308')

    store.singularities = 0
    expect(store.singularityGain.toNumber()).toBe(3)

    store.singularities = 25
    expect(store.singularityGain.toNumber()).toBe(3)
  })

  it('break_singularity yokken addMatter kütleyi D_INFINITY de durdurur (hard-cap) ve isMatterCapped true olur', () => {
    const store = useGameStore()
    store.matter = new Decimal('1.79e308')
    expect(store.isMatterCapped).toBe(false)
    store.addMatter(new Decimal('1e307'))
    expect(store.isMatterCapped).toBe(true)
    expect(store.matter.eq(D_INFINITY)).toBe(true)
  })

  it('break_singularity alındığında kütle D_INFINITY üstüne serbestçe çıkabilir', () => {
    const store = useGameStore()
    store.neuralNodesBought = { break_singularity: 1 }
    store.matter = new Decimal('1.79e308')
    store.addMatter(new Decimal('1e310'))
    expect(store.isMatterCapped).toBe(false)
    expect(store.matter.gt(D_INFINITY)).toBe(true)
  })

  it('break_singularity alındığında 1.8e308 eşiğinde taban 3 SP verir', () => {
    const store = useGameStore()
    store.neuralNodesBought = { break_singularity: 1 }
    store.matter = new Decimal('1.8e308')
    expect(store.hasBreakSingularity).toBe(true)
    expect(store.singularityGain.toNumber()).toBe(3)
  })

  it('break_singularity sonrası kütle arttıkça SP üstel ölçeklenir (3 -> 5 -> 10 -> 50 -> 100...)', () => {
    const store = useGameStore()
    store.neuralNodesBought = { break_singularity: 1 }

    // 1e318 -> 5 SP
    store.matter = new Decimal('1e318')
    expect(store.singularityGain.toNumber()).toBe(5)

    // 1e332 -> 10 SP
    store.matter = new Decimal('1e332')
    expect(store.singularityGain.toNumber()).toBe(10)

    // 1e363 -> 50 SP
    store.matter = new Decimal('1e363')
    expect(store.singularityGain.toNumber()).toBe(50)

    // 1e377 -> 102 SP (~100 SP bandı)
    store.matter = new Decimal('1e377')
    expect(store.singularityGain.toNumber()).toBe(102)
  })

  it('Kök düğüm insomnia_heart alındığında başlangıç kütlesi 10.000 g olur', () => {
    const store = useGameStore()
    // Başlangıçta 10 g
    expect(store.startingMatter.toNumber()).toBe(10)

    // insomnia_heart satın alınır
    store.neuralNodesBought = { insomnia_heart: 1 }
    expect(store.startingMatter.toNumber()).toBe(10000)

    // Koşu sıfırlandığında kütle 10.000 g ye oturmalıdır
    store.matter = new Decimal(50)
    store.resetRunState()
    expect(store.matter.toNumber()).toBe(10000)
  })

  it('insomnia_heart sıçrama (shift) ve küme (galaxy) resetlerinde de 10.000 g korur', () => {
    const store = useGameStore()
    store.neuralNodesBought = { insomnia_heart: 1 }

    // Shift şartını sağla ve çalıştır
    const shiftReq = store.shiftRequirement
    store.dimensions[shiftReq.tier - 1].amount = new Decimal(shiftReq.amount)
    const shifted = store.dimensionShift(false)
    expect(shifted).toBe(true)
    expect(store.matter.toNumber()).toBe(10000)

    // Galaxy şartını sağla ve çalıştır
    store.dimensions[7].amount = new Decimal(store.galaxyRequirement)
    const galaxyBought = store.buyGalaxy(false)
    expect(galaxyBought).toBe(true)
    expect(store.matter.toNumber()).toBe(10000)
  })

  it('offlineSimBoost getDimensionMultiplier içine enjekte edilmez (1800x kaskad hatası çözülmüştür)', () => {
    const store = useGameStore()
    store.offlineSimBoost = 2.5
    const multWithoutBoost = store.getDimensionMultiplier(1)
    
    // getDimensionMultiplier her zaman temiz olmalıdır
    expect(multWithoutBoost.toNumber()).toBeGreaterThan(0)
  })

  it('singleShiftPower ve shiftPowerMultiplier shift_power_boost başarımını doğru yansıtır', () => {
    const store = useGameStore()
    store.dimensionShifts = 2
    expect(store.singleShiftPower).toBe(1.66)
    expect(store.shiftPowerMultiplier.toNumber()).toBeCloseTo(1.66 * 1.66, 2)

    store.achievements.push('dop_sonsuz_akis')
    expect(store.singleShiftPower).toBe(1.9)
    expect(store.shiftPowerMultiplier.toNumber()).toBeCloseTo(1.9 * 1.9, 2)
  })

  it('shiftRequirement 6+ sıçramalarda D5 pasifini uygular, taban 26 ile pürüzsüz artar ve her zaman tamsayı döner', () => {
    const store = useGameStore()
    store.dimensionShifts = 5
    // ADR-0072: D8 açılımı artık sıçramadan gelmez; bu testte D8'i legacy
    // `dimensionCapFloor` tabanı sağlar (sıçrama terimi açılıştan kaldırıldı).
    store.dimensionCapFloor = 8
    const reqShift5 = store.shiftRequirement
    // ADR-0072: hedef tier gerçek açık boyut sayısıdır (burada legacy taban 8).
    expect(reqShift5.tier).toBe(8)
    expect(reqShift5.amount.toNumber()).toBe(25) // Shift 5 gereksinimi: 25 D8

    store.dimensionShifts = 6
    // D5 henüz satın alınmamışken taban: 26 + 16 * 0 = 26 (25->22 gerilemesi önlenmiştir)
    const reqWithoutD5 = store.shiftRequirement
    expect(reqWithoutD5.amount.toNumber()).toBe(26)
    expect(reqWithoutD5.amount.toNumber()).toBeGreaterThanOrEqual(reqShift5.amount.toNumber())

    // D5 satın alınınca %3 indirim: floor(26 * 0.97) = floor(25.22) = 25
    store.dimensions[4].bought = 10
    const reqWithD5 = store.shiftRequirement
    expect(reqWithD5.amount.toNumber()).toBe(25)
    expect(Number.isInteger(reqWithD5.amount.toNumber())).toBe(true)
  })

  // ---- ADR-0072: shiftRequirement hedef tier'ı sıçramadan değil açık boyuttan gelir ----
  it('ADR-0072: hedef tier rampa ile yükselir ama gerçek açık boyut sayısını asmaz', () => {
    const store = useGameStore()
    store.dimensionCapFloor = 0
    store.dimensionShifts = 0
    // Kütle kapıları (D4 1e8, D5 1e11, D6 1e15) → 6 açık boyut; rampa tabanı 3+0 = 3
    store.lifetimePeakMatter = new Decimal('1e15')
    expect(store.unlockedDimensionsCount).toBe(6)
    expect(store.shiftRequirement.tier).toBe(3)

    // Rampa tam açık sayıya oturur
    store.dimensionShifts = 3
    expect(store.shiftRequirement.tier).toBe(6)

    // Rampa 8 ister ama açık boyut 6 → kırpılır
    store.dimensionShifts = 5
    expect(store.shiftRequirement.tier).toBe(6)

    // Kapılar açılınca rampa hedefine ulaşır
    store.lifetimePeakMatter = new Decimal('1e26')
    expect(store.shiftRequirement.tier).toBe(8)
  })

  it('ADR-0072 regresyon: dimensionShifts değişse bile hedef tier değişmez (eski 3+sıçrama davranışı gitti)', () => {
    const store = useGameStore()
    store.dimensionCapFloor = 0
    store.lifetimePeakMatter = new Decimal('1e26') // 8 açık boyut

    // Erken dal rampası (ADR-0033) korunur: 3 → 8
    const early: number[] = []
    for (const shifts of [0, 1, 2, 3, 4, 5]) {
      store.dimensionShifts = shifts
      early.push(store.shiftRequirement.tier)
    }
    expect(early).toEqual([3, 4, 5, 6, 7, 8])

    // Geç dal açık boyut sayısına oturur
    const late: number[] = []
    for (const shifts of [6, 7, 12]) {
      store.dimensionShifts = shifts
      late.push(store.shiftRequirement.tier)
    }
    expect(new Set(late)).toEqual(new Set([8]))

    // Daha az açık boyutta rampa büyüse bile hedef açık sayıyı AŞMAZ (dal geçişi dahil).
    store.lifetimePeakMatter = new Decimal('1e11') // 5 açık boyut
    const capped: number[] = []
    for (const shifts of [0, 1, 2, 3, 5, 6, 9]) {
      store.dimensionShifts = shifts
      capped.push(store.shiftRequirement.tier)
    }
    expect(capped).toEqual([3, 4, 5, 5, 5, 5, 5])
  })

  it('ADR-0072: shiftRequirement challengeDimensionCap (C7) kırpmasını korur ve C7 miktar formülleri değişmez', () => {
    const store = useGameStore()
    store.dimensionCapFloor = 0
    store.lifetimePeakMatter = new Decimal('1e26') // kapısız 8 açık boyut
    expect(store.unlockedDimensionsCount).toBe(8)
    store.dimensionShifts = 5
    expect(store.shiftRequirement.tier).toBe(8)

    store.activeChallenge = 'c7'
    expect(store.unlockedDimensionsCount).toBe(6) // C7: üst sınır 6
    // Rampa 8 ister, C7 cap'i 6'ya kırpar
    expect(store.shiftRequirement.tier).toBe(6)

    // Geç sıçrama dalı (shifts >= 6): kırpılmış miktar formülü 30 + 15*(s-3).
    store.dimensionShifts = 6
    const capped = store.shiftRequirement
    expect(capped.tier).toBe(6)
    expect(capped.tier).toBeLessThanOrEqual(6)
    // D5 pasifi tetiklenmediği için shiftMult = 1 → 30 + 15*3 = 75
    expect(capped.amount.toNumber()).toBe(75)

    // Erken sıçrama dalı (shifts < 6): rampa 5'e oturur; cap'in ALTINDA kaldığı için kırpılmaz.
    store.dimensionShifts = 2
    const earlyCapped = store.shiftRequirement
    expect(earlyCapped.tier).toBe(5)
    expect(earlyCapped.amount.toNumber()).toBe(15)
  })

  it('ADR-0072: shiftRequirement her zaman tamsayı tier ve en az 1 miktar döner', () => {
    const store = useGameStore()
    store.lifetimePeakMatter = new Decimal('1e8') // 4 açık boyut
    for (const shifts of [0, 1, 2, 3, 5, 6, 11, 40]) {
      store.dimensionShifts = shifts
      const req = store.shiftRequirement
      expect(Number.isInteger(req.tier)).toBe(true)
      expect(req.tier).toBeGreaterThanOrEqual(1)
      const amountNum = req.amount.toNumber()
      expect(Number.isInteger(amountNum)).toBe(true)
      expect(amountNum).toBeGreaterThanOrEqual(1)
    }
  })

  it('tierSlackerLeechMult D3 alınmamışken 1, alınınca 0.97 döner', () => {
    const store = useGameStore()
    expect(store.passiveBadges.d3Leech).toBe(false)
    expect(store.slackerLeechPercent).toBe(0) // slacker yok

    store.dimensions[2].bought = 10
    expect(store.passiveBadges.d3Leech).toBe(true)
  })

  // ---- ADR-0072: boyut açılımı sıçramadan koparıldı ----
  it('ADR-0072: sıçrama sayacı tek başına boyut açmaz', () => {
    const store = useGameStore()
    store.dimensionShifts = 8
    expect(store.unlockedDimensionsCount).toBe(3)
  })

  it('ADR-0072: açılımı tepe kütle açar; koşu sıfırlanınca geri kilitlenmez', () => {
    const store = useGameStore()
    store.lifetimePeakMatter = new Decimal('1e11')
    expect(store.unlockedDimensionsCount).toBe(5)

    store.resetRunState()
    expect(store.matter.toNumber()).toBe(10)
    expect(store.unlockedDimensionsCount).toBe(5)
  })
})
