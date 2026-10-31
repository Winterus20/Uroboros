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
