import { describe, expect, it } from 'vitest'
import { useGameStore } from './game'
import { D } from '../core/math'
import { SAVE_VERSION, MIN_SUPPORTED_SAVE_VERSION } from '../core/save-version'
import { CHALLENGES } from '../game/number/challenges'
import type { SerializedPlayerState } from '../models/save'

/**
 * KAYIT GÖÇÜ (v22 → v23) — ADR-0083 / contract §5.
 *
 * Şema değişikliğinin sözü şudur: v22 kaydı AÇILIR ve oyuncunun sayısı, halkaları,
 * kilitleri korunur; yeni üç alan (challenges / gateReached / tanim) VARSAYILANLA
 * gelir. Bu dosya o sözü kilitler. v23 kaydı ise mücadele, kapı ve Tanım değerlerini
 * birebir geri vermelidir — aksi hâlde ödüller ve kapı mandalı her yeniden yüklemede
 * kaybolurdu.
 */

/** v22 kaydının SON hâli: v23 alanları henüz yok. */
function v22Payload(): SerializedPlayerState {
  return {
    version: 22,
    number: '1e50',
    bestNumber: '2e50',
    // Kilitlerle TUTARLI fixture: yalnız açık halkaların alımı vardır (D6).
    rings: Array.from({ length: 8 }, (_, i) =>
      i < 4 ? { a: String((i + 1) * 30), b: (i + 1) * 10 } : { a: '0', b: 0 }
    ),
    unlocked: [true, true, true, true, false, false, false, false],
    rung: 1,
    totalBuys: 110,
    taps: 321,
    uselessTaps: 7,
    playTime: 5400,
    startedAt: 1_700_000_000_000,
    lastSeenAt: 1_700_000_500_000,
    settings: {
      notation: 'standard',
      decimalPlaces: 2,
      humor: 'measured',
      soundEnabled: true,
      soundVolume: 0.6,
      musicEnabled: false,
      musicVolume: 0.4,
      musicTrack: 'lofi_chill',
      motionMode: 'full',
      swirlShaderQuality: 'balanced',
      batterySaver: false,
      confirmDialogs: true,
      hotkeysEnabled: true,
      activeSlot: 1
    },
    seenVoice: ['r1_open_1'],
    latched: ['r1_scene_open'],
    // v23 alanları BİLİNÇLE yok: eski build'in yazdığı kaydı taklit ediyoruz.
    challenges: undefined as unknown as SerializedPlayerState['challenges'],
    gateReached: undefined as unknown as boolean,
    tanim: undefined as unknown as number
  }
}

/** v23 kaydı: mücadeleler, kapı ve Tanım dolu. */
function v23Payload(): SerializedPlayerState {
  const base = v22Payload()
  return {
    ...base,
    version: 23,
    number: '3.2e130',
    challenges: {
      completed: ['C1', 'C2', 'C3'],
      active: 'C4',
      entryLog10: 130.5,
      goalLog10: 132.5,
      lastBuyAt: 5400,
      lastBoughtRing: 3
    },
    gateReached: true,
    tanim: 2
  }
}

describe('kayıt şeması sürümü', () => {
  it('v23 yazar, v20 asgari kalır (v22 kayıtları açılır)', () => {
    expect(SAVE_VERSION).toBe(23)
    expect(MIN_SUPPORTED_SAVE_VERSION).toBe(20)
  })
})

describe("v22 kaydı v23 build'de açılır", () => {
  it('sayı, halkalar, kilitler ve sayaçlar korunur', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())

    expect(store.number.eq('1e50')).toBe(true)
    expect(store.bestNumber.eq('2e50')).toBe(true)
    expect(store.rings[0].bought).toBe(10)
    expect(store.rings[3].bought).toBe(40)
    expect(store.unlocked[3]).toBe(true)
    // Halka 3 40 alımda: eşiği (10) geçtiği için halka 4 MANDALLI açılır (D6).
    expect(store.unlocked[4]).toBe(true)
    expect(store.taps).toBe(321)
    expect(store.uselessTaps).toBe(7)
    expect(store.playTime).toBe(5400)
    expect(store.totalBuys).toBe(110)
    expect(store.latched).toEqual(['r1_scene_open'])
  })

  it('yeni üç alan varsayılanla gelir: boş mücadele, kapı kapalı, 0 Tanım', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())

    expect(store.challenges.completed).toEqual([])
    expect(store.challenges.active).toBeNull()
    expect(store.challenges.entryLog10).toBeNull()
    expect(store.challenges.goalLog10).toBeNull()
    expect(store.challenges.lastBuyAt).toBe(0)
    expect(store.gateReached).toBe(false)
    expect(store.tanim).toBe(0)
  })

  it('v22 oyuncusu mücadele akışına temiz girer (C1 hemen açılabilir)', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())

    // Sayı 1e50 → C1 (1e10) ve C2 (1e33.242) kilitleri açık; C3 (1e37.376) de.
    const open = store.challengeRows.filter((row) => row.status === 'available')
    expect(open.map((row) => row.id)).toEqual(['C1', 'C2', 'C3'])
    store.enterChallenge('C1')
    expect(store.challenges.active).toBe('C1')
    // Hedef girişte kilitlenir: 1e50 + Δ2 = 1e52, plan hedefi 1e33.242'den büyük.
    expect(store.challenges.goalLog10).toBeCloseTo(52, 6)
  })
})

describe("v23 kaydı birebir geri döner", () => {
  it('mücadele durumu (tamamlanan + aktif + kilitli hedef) korunur', () => {
    const store = useGameStore()
    store.deserialize(v23Payload())

    expect(store.challenges.completed).toEqual(['C1', 'C2', 'C3'])
    expect(store.challenges.active).toBe('C4')
    expect(store.challenges.entryLog10).toBe(130.5)
    expect(store.challenges.goalLog10).toBe(132.5)
    expect(store.challenges.lastBuyAt).toBe(5400)
    expect(store.challenges.lastBoughtRing).toBe(3)
  })

  it('kapı mandalı ve Tanım sayacı korunur', () => {
    const store = useGameStore()
    store.deserialize(v23Payload())

    expect(store.gateReached).toBe(true)
    expect(store.tanim).toBe(2)
  })

  it('serialize → deserialize turu aynı değerleri verir', () => {
    const store = useGameStore()
    store.deserialize(v23Payload())
    const saved = store.serialize()

    expect(saved.version).toBe(SAVE_VERSION)
    expect(saved.challenges.completed).toEqual(['C1', 'C2', 'C3'])
    expect(saved.challenges.active).toBe('C4')
    expect(saved.challenges.entryLog10).toBe(130.5)
    expect(saved.challenges.goalLog10).toBe(132.5)
    expect(saved.challenges.lastBuyAt).toBe(5400)
    expect(saved.gateReached).toBe(true)
    expect(saved.tanim).toBe(2)

    const round = useGameStore()
    round.deserialize(saved)
    expect(round.challenges).toEqual(store.challenges)
    expect(round.gateReached).toBe(true)
    expect(round.tanim).toBe(2)
    expect(round.number.toString()).toBe(store.number.toString())
    expect(round.rings.map((r) => r.bought)).toEqual(store.rings.map((r) => r.bought))
  })

  it('tamamlanan ödüller üretime girer (C1 Fingers x10, C2 x5, C3 x3)', () => {
    // Ölçüm yalnız Fingers üzerinden yapılır: halka 2–8 in doğrudan katkısı
    // C1'den x10 almaz (o ödül yalnız halka 0 a ve beslemeye vurur), bu yüzden
    // toplam üretim oranı tek başına 150 çıkmaz. Tek halkalı durum çarpanı
    // doğrudan okur.
    const bare = useGameStore()
    bare.deserialize(v22Payload())
    bare.rings.forEach((ring, i) => {
      ring.amount = i === 0 ? D(100) : D(0)
      ring.bought = i === 0 ? 40 : 0
    })
    const baseline = bare.perSecond

    const awarded = useGameStore()
    awarded.deserialize(v23Payload())
    awarded.rings.forEach((ring, i) => {
      ring.amount = i === 0 ? D(100) : D(0)
      ring.bought = i === 0 ? 40 : 0
    })
    const withRewards = awarded.perSecond

    expect(baseline.gt(0)).toBe(true)
    expect(withRewards.div(baseline).toNumber()).toBeCloseTo(10 * 5 * 3, 6)
  })
})

describe("deserialize kurcalanmış veriyi temizler", () => {
  it('bilinmeyen mücadele kimlikleri ve sayı olmayan değerler düşer', () => {
    const store = useGameStore()
    const payload = v23Payload()
    payload.challenges = {
      completed: ['C1', 'C99', 'C1', 42 as unknown as string, 'C2'],
      active: 'CX',
      entryLog10: Number.NaN,
      goalLog10: Number.POSITIVE_INFINITY,
      lastBuyAt: Number.NaN,
      lastBoughtRing: 99
    }
    store.deserialize(payload)

    expect(store.challenges.completed).toEqual(['C1', 'C2'])
    expect(store.challenges.active).toBeNull()
    expect(store.challenges.entryLog10).toBeNull()
    expect(store.challenges.goalLog10).toBeNull()
    expect(store.challenges.lastBuyAt).toBe(0)
    expect(store.challenges.lastBoughtRing).toBe(7)
  })

  it('tamamlanmış bir mücadele aktif kalamaz', () => {
    const store = useGameStore()
    const payload = v23Payload()
    payload.challenges.active = 'C1'
    store.deserialize(payload)
    expect(store.challenges.active).toBeNull()
  })

  it('hedefi girişten büyük olmayan aktif mücadele iptal edilir', () => {
    const store = useGameStore()
    const payload = v23Payload()
    payload.challenges.entryLog10 = 200
    payload.challenges.goalLog10 = 132.5
    store.deserialize(payload)

    // Hedef girişin altında kalırsa mücadele hiç bitmez; yükleme onu bırakır.
    expect(store.challenges.active).toBeNull()
  })

  it('negatif Tanım ve ondalıklı sayılar temizlenir', () => {
    const store = useGameStore()
    const payload = v23Payload()
    payload.tanim = -4.7
    store.deserialize(payload)
    expect(store.tanim).toBe(0)

    payload.tanim = 3.9
    store.deserialize(payload)
    expect(store.tanim).toBe(3)
  })

  it('gateReached yalnız gerçek true ile kurulur', () => {
    const store = useGameStore()
    const payload = v23Payload()
    payload.gateReached = 'yes' as unknown as boolean
    store.deserialize(payload)
    expect(store.gateReached).toBe(false)
  })
})

describe('prestij', () => {
  it('kapı kapalıyken prestij yok sayılır', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())
    store.prestige()
    expect(store.tanim).toBe(0)
    expect(store.rung).toBe(1)
  })

  it('kapıda +1 Tanım, rung 2 ve kapı mandalı KORUNUR', () => {
    const store = useGameStore()
    store.deserialize(v23Payload())
    expect(store.gateReached).toBe(true)

    store.prestige()
    expect(store.tanim).toBe(3)
    expect(store.rung).toBe(2)
    // Mandal geri alınmaz: kapıya varıldı, bu kayda öyle yazılır.
    expect(store.gateReached).toBe(true)
    // Modal artık açılmaz (rung 2), aksi hâlde her yüklemede yeniden dikilirdi.
    expect(store.gateOpen).toBe(false)

    // İkinci çağrı yok sayılır: modal kapalıyken Tanım basılamaz.
    store.prestige()
    expect(store.tanim).toBe(3)
  })
})

describe('mücadele paneli satırları', () => {
  it('8 satır verir ve durumları kayıttan türetir', () => {
    const store = useGameStore()
    store.deserialize(v23Payload())
    const rows = store.challengeRows

    expect(rows).toHaveLength(CHALLENGES.length)
    expect(rows).toHaveLength(8)
    expect(rows.filter((r) => r.status === 'completed').map((r) => r.id)).toEqual(['C1', 'C2', 'C3'])
    expect(rows.find((r) => r.id === 'C4')?.status).toBe('active')
    // Sayı 3.2e130: C5/C6/C7 kilitleri çoktan geçildi, C8 (1e125.573) da açık.
    expect(rows.find((r) => r.id === 'C5')?.status).toBe('available')
    expect(rows.find((r) => r.id === 'C8')?.status).toBe('available')
    // Tamamlanan satır %100, aktif satır girişten hedefe oranı verir.
    expect(rows.find((r) => r.id === 'C3')?.progress).toBe(100)
    const c4 = rows.find((r) => r.id === 'C4')!
    expect(c4.progress).toBeGreaterThanOrEqual(0)
    expect(c4.progress).toBeLessThanOrEqual(100)
  })

  it('her satır ödül adı, halka adı ve mekanik etiket taşır', () => {
    const store = useGameStore()
    store.deserialize(v23Payload())
    for (const row of store.challengeRows) {
      expect(row.name.length).toBeGreaterThan(0)
      expect(row.name).not.toContain(':')
      expect(row.ringName.length).toBeGreaterThan(0)
      expect(row.penaltyLabel.length).toBeGreaterThan(0)
      expect(row.rewardLabel.length).toBeGreaterThan(0)
      expect(row.goalText.length).toBeGreaterThan(0)
      expect(row.goal.gt(0)).toBe(true)
    }
  })

  it('hedef göreli: giriş sayısı yükseldikçe satır hedefi de yükselir', () => {
    const low = useGameStore()
    low.deserialize(v22Payload())
    const lowGoal = low.challengeRows.find((r) => r.id === 'C1')!.goal.log10().toNumber()

    const high = useGameStore()
    const payload = v22Payload()
    payload.number = '1e60'
    high.deserialize(payload)
    const highGoal = high.challengeRows.find((r) => r.id === 'C1')!.goal.log10().toNumber()

    expect(highGoal).toBeCloseTo(62, 4)
    expect(highGoal).toBeGreaterThan(lowGoal)
  })
})

describe('hedef ve kapı okumaları', () => {
  it('mücadele yokken hedef kapıdır (1.79e308)', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())
    expect(store.goalText).toBe('1.79e308')
    expect(store.activeChallengeRow).toBeNull()
  })

  it('mücadelede hedef kilitli hedeftir ve ilerleme 0-100 arasıdır', () => {
    const store = useGameStore()
    store.deserialize(v23Payload())
    expect(store.goalText).not.toBe('1.79e308')
    expect(store.activeChallengeRow?.id).toBe('C4')
    expect(store.goalProgress).toBeGreaterThanOrEqual(0)
    expect(store.goalProgress).toBeLessThanOrEqual(100)
  })

  it('normal modda ilerleme log10 tabanlıdır ve kapıda %100 olur', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())
    const atFifty = store.goalProgress
    expect(atFifty).toBeCloseTo((50 / 308.25286978738966) * 100, 4)

    store.number = D('1.79e308')
    expect(store.goalProgress).toBe(100)
  })

  it('blok çarpanı rozeti x5.50 yazar', () => {
    const store = useGameStore()
    expect(store.blockMultText).toBe('x5.50')
  })

  it('sıradaki mücadele etiketi tamamlananları atlar', () => {
    const store = useGameStore()
    store.deserialize(v23Payload())
    // C1-C3 bitti, C4 aktif: normal mod etiketi boş, aktif satır C4.
    expect(store.nextChallengeLabel).toBe('')
    store.exitChallenge()
    expect(store.nextChallengeLabel).toBe('C4')
  })
})

describe("update / simulateOffline olay akışı", () => {
  it('hedefe ulaşınca mücadele tamamlanır, ödül kalıcı olur ve olay satırı yazılır', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())
    store.enterChallenge('C1')
    expect(store.challenges.active).toBe('C1')

    // Hedefi aş: girişte kilitlenen hedefin üstüne çık.
    const goal = store.challenges.goalLog10!
    store.number = D(10).pow(goal + 1)
    store.update(0.05)

    expect(store.challenges.active).toBeNull()
    expect(store.challenges.completed).toContain('C1')
    expect(store.tickerLine).toBeTruthy()
    expect(store.latched).toContain('challenge_clear_C1')
  })

  it('çevrimdışı simülasyon aynı tamamlama kontrolünü çalıştırır', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())
    store.enterChallenge('C1')
    const goal = store.challenges.goalLog10!
    store.number = D(10).pow(goal + 1)

    store.simulateOffline(60)

    expect(store.challenges.completed).toContain('C1')
    expect(store.offlineReport).not.toBeNull()
  })

  it('kapı açılınca gateReached mandalı kurulur ve büyüme durur', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())
    store.number = D('1.79e308')
    store.update(0.05)

    expect(store.gateReached).toBe(true)
    expect(store.gateOpen).toBe(true)
    expect(store.growthStopped).toBe(true)

    const frozen = store.number.toString()
    store.update(0.05)
    expect(store.number.toString()).toBe(frozen)
  })
})

describe('buyMaxAll', () => {
  it('bütçenin yettiği kadar blok alır ve alım sayacını büyütür', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())
    const before = store.totalBuys
    const beforeNumber = store.number

    store.buyMaxAll()

    expect(store.totalBuys).toBeGreaterThan(before)
    expect(store.number.lt(beforeNumber)).toBe(true)
  })

  it('mücadele cezası alımı engelliyorsa dokunmaz (C1 Fingers on alım)', () => {
    const store = useGameStore()
    store.deserialize(v22Payload())
    store.enterChallenge('C1')
    // v22 fixture'ında Fingers 10 alımda: ceza daha fazlasını yasaklar.
    const before = store.totalBuys
    store.buyMaxAll()
    // Ceza 10'dan fazla Fingers alımını yasaklar: sayı 10'da KALIR.
    expect(store.rings[0].bought).toBe(10)
    expect(store.totalBuys).toBeGreaterThanOrEqual(before)
  })
})