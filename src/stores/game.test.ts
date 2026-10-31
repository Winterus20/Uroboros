import { describe, expect, it } from 'vitest'
import { OFFLINE_CAP_SECONDS, OFFLINE_REPORT_MIN_SECONDS, useGameStore } from './game'
import { D } from '../core/math'
import { format } from '../core/format'
import { CHALLENGES } from '../game/number/challenges'

/**
 * 1. basamak cila kilitleri: varsayılan alım modu, çevrimdışı rapor eşiği,
 * kilitli mücadele gerekçesi. Her biri oyun testinde bulunan bir okuma
 * sorunuydu; davranış geri kaymasın diye burada sabitlenir.
 */

describe('varsayılan alım modu', () => {
  it('yeni oyun ×1 ile başlar', () => {
    const store = useGameStore()
    expect(store.buyMode).toBe(1)
  })

  it('mod kayda yazılmaz; yükleme oyuncunun o anki seçimine dokunmaz', () => {
    const store = useGameStore()
    store.setBuyMode(10)
    const saved = store.serialize()
    expect(Object.keys(saved)).not.toContain('buyMode')

    store.deserialize(saved)
    expect(store.buyMode).toBe(10)
  })

  it('sert sıfırlama modu ×1 varsayılanına döndürür', () => {
    const store = useGameStore()
    store.setBuyMode('max')
    store.resetGame()
    expect(store.buyMode).toBe(1)
  })
})

describe('çevrimdışı rapor eşiği', () => {
  it('eşik tavanın altında ve makul bir ölçekte durur', () => {
    expect(OFFLINE_REPORT_MIN_SECONDS).toBeGreaterThanOrEqual(30)
    expect(OFFLINE_REPORT_MIN_SECONDS).toBeLessThan(OFFLINE_CAP_SECONDS)
  })

  it('kısa duraklama simüle edilir ama rapor yazılmaz', () => {
    const store = useGameStore()
    store.number = D(1000)
    store.buyRing(0, 1)
    expect(store.rings[0].bought).toBe(1)
    const before = store.number
    const playBefore = store.playTime

    store.simulateOffline(4)

    expect(store.offlineReport).toBeNull()
    expect(store.playTime).toBeCloseTo(playBefore + 4)
    expect(store.number.gt(before)).toBe(true)
  })

  it('eşik ve üstündeki yokluk raporu yazar', () => {
    const store = useGameStore()
    store.simulateOffline(OFFLINE_REPORT_MIN_SECONDS)
    expect(store.offlineReport).not.toBeNull()
    expect(store.offlineReport?.seconds).toBe(OFFLINE_REPORT_MIN_SECONDS)
  })

  it('eşiğin hemen altı rapor yazmaz', () => {
    const store = useGameStore()
    store.simulateOffline(OFFLINE_REPORT_MIN_SECONDS - 1)
    expect(store.offlineReport).toBeNull()
  })

  it('kısa duraklama ekrandaki raporu silmez ya da ezmez', () => {
    const store = useGameStore()
    store.simulateOffline(600)
    const report = store.offlineReport
    expect(report?.seconds).toBe(600)

    store.simulateOffline(3)
    expect(store.offlineReport).toEqual(report)
  })

  it('kapı açıkken de aynı eşik geçerlidir', () => {
    const store = useGameStore()
    store.number = D('1.79e308')
    store.update(0.05)
    expect(store.growthStopped).toBe(true)

    store.simulateOffline(5)
    expect(store.offlineReport).toBeNull()

    store.simulateOffline(OFFLINE_REPORT_MIN_SECONDS)
    expect(store.offlineReport?.gained).toBe('0')
  })
})

describe('kilitli mücadele gerekçesi', () => {
  it('her satır açılma eşiğini oyuncunun notasyonunda taşır', () => {
    const store = useGameStore()
    const rows = store.challengeRows
    expect(rows.every((row) => row.status === 'locked')).toBe(true)

    rows.forEach((row, i) => {
      const expected = D(10).pow(CHALLENGES[i].unlockLog10)
      expect(row.unlockAt.log10().toNumber()).toBeCloseTo(CHALLENGES[i].unlockLog10, 6)
      expect(row.unlockText).toBe(
        format(expected, store.settings.decimalPlaces, store.settings.notation)
      )
    })
  })

  it('notasyon değişince gerekçe metni de değişir', () => {
    const store = useGameStore()
    store.setNotation('scientific')
    // C1 eşiği 1e10: standart gösterimde son ek, bilimselde üs yazılır.
    const scientific = store.challengeRows[0].unlockText
    store.setNotation('standard')
    const standard = store.challengeRows[0].unlockText
    expect(scientific).toBe(format(D(10).pow(CHALLENGES[0].unlockLog10), 2, 'scientific'))
    expect(scientific).not.toBe(standard)
  })
})

describe('boost sözleşmesi — ADR-0086', () => {
  it('yeni oyunda boost kapalıdır: gereksinim 50, engel requirement', () => {
    const store = useGameStore()
    expect(store.boostCount).toBe(0)
    expect(store.boostRequirement).toBe(50)
    expect(store.boostNextRequirement).toBe(68)
    expect(store.boostBought).toBe(0)
    expect(store.boostPrice.gt(0)).toBe(true)
    expect(store.boostMultiplier.toString()).toBe('1')
    expect(store.boostMultiplierText).toBe('x1.00')
    expect(store.boostNextMultiplierText).toBe('x1.80')
    expect(store.boostUnlocked).toBe(false)
    expect(store.boostRingUnlocked).toBe(false)
    expect(store.boostBlockedReason).toBe('requirement')
    expect(store.canBoost).toBe(false)
    expect(store.boostProgress).toBe(0)
    expect(store.boost()).toBe(false)
    expect(store.boostCount).toBe(0)
  })

  it('gereksinim dolunca fiyat ödenir, sayaç artar, koşu sıfırlanır', () => {
    const store = useGameStore()
    store.unlocked[7] = true
    store.rings[7].bought = 50
    store.number = D('1e30')
    store.bestNumber = D('1e30')
    const best = store.bestNumber.toString()
    const price = store.boostPrice

    expect(store.boostRingUnlocked).toBe(true)
    expect(store.boostUnlocked).toBe(true)
    expect(store.boostBlockedReason).toBeNull()
    expect(store.canBoost).toBe(true)
    expect(store.boostProgress).toBe(100)
    expect(price.gt(0)).toBe(true)

    expect(store.boost()).toBe(true)
    expect(store.boostCount).toBe(1)
    expect(store.number.toString()).toBe('10')
    expect(store.rings.every((ring) => ring.bought === 0 && ring.amount.eq(0))).toBe(true)
    expect(store.unlocked).toEqual([true, false, false, false, false, false, false, false])
    expect(store.bestNumber.toString()).toBe(best)
    // Yeni gereksinim ve çarpan bir sonraki kademeye geçti.
    expect(store.boostRequirement).toBe(68)
    expect(store.boostMultiplierText).toBe('x1.80')
    expect(store.boostNextMultiplierText).toBe('x3.24')
    expect(store.boostProgress).toBe(0)
    expect(store.boostBlockedReason).toBe('requirement')
    expect(store.boost()).toBe(false)
  })

  it('çarpan metni: x3.24 / x5.83', () => {
    const store = useGameStore()
    store.boostCount = 2
    expect(store.boostMultiplier.toNumber()).toBeCloseTo(3.24, 9)
    expect(store.boostMultiplierText).toBe('x3.24')
    expect(store.boostNextMultiplierText).toBe('x5.83')
  })

  it('engel sırası: challenge → rung → gate → requirement → price', () => {
    const store = useGameStore()
    store.unlocked[7] = true
    store.rings[7].bought = 50
    store.number = D('1e30')

    store.challenges.active = 'C1'
    expect(store.boostBlockedReason).toBe('challenge')
    expect(store.canBoost).toBe(false)

    store.rung = 2
    expect(store.boostBlockedReason).toBe('rung')

    store.rung = 1
    store.challenges.active = null
    store.gateReached = true
    expect(store.boostBlockedReason).toBe('gate')

    store.gateReached = false
    store.rings[7].bought = 25
    expect(store.boostBlockedReason).toBe('requirement')
    expect(store.boostProgress).toBe(50)

    store.rings[7].bought = 50
    store.number = D(10)
    expect(store.boostBlockedReason).toBe('price')
    expect(store.canBoost).toBe(false)
  })

  it('mücadele girişi boost sayısını korur, prestij sıfırlar', () => {
    const store = useGameStore()
    store.boostCount = 5
    store.bestNumber = D('1e20')
    store.enterChallenge('C1')
    expect(store.boostCount).toBe(5)
    expect(store.number.toString()).toBe('10')

    store.gateReached = true
    store.rung = 1
    store.prestige()
    expect(store.boostCount).toBe(0)
    expect(store.tanim).toBe(1)
  })
})

describe('ChallengeRow.enterable — sıra kilidi', () => {
  it('yalnız sıradaki mücadele girilebilir; girişten sonra hiçbiri', () => {
    const store = useGameStore()
    store.boostCount = 4
    store.bestNumber = D('1e10')
    const rows = store.challengeRows
    expect(rows.filter((row) => row.enterable).map((row) => row.id)).toEqual(['C1'])

    store.enterChallenge('C1')
    expect(store.challengeRows.filter((row) => row.enterable)).toHaveLength(0)
  })
})