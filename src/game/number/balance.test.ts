import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import {
  CHALLENGES,
  completeChallengeIfReady,
  enterChallenge,
  isChallengeUnlocked,
  nextChallenge
} from './challenges'
import { advance, checkGate, createNumberState, maxAll, manualTap } from './economy'

/**
 * 1. basamak ZINCIR kilidi — v2 (B = 5,5, 8 sifirlamasiz mucadele).
 *
 * Bu test GERCEK motoru calistirir ve tasarlanan oyuncuyu oynar: her tick'ten
 * sonra `maxAll` (en derin halkadan 10'lu bloklar) ve hazir mucadeleye giris.
 * Sifirlama yoktur: sayi yalnizca buyur (alimlar disinda).
 *
 * OLCULEN (Max All, 2 tik/sn, dt = 0,5 — 190 dk kalibrasyonunun dogrulamasi):
 *
 *   60. dk  -> log10 88,238 (1e88,2)   -  120. dk -> log10 120,219 (1e120,2)
 *   Kapi    -> 188,6 dk (rapor: 188,8) -  toplam 30 580 alim
 *   Mucadele bitisleri -> 29,4 - 50,4 - 71,4 - 93,7 - 114,5 - 135,6 - 157,8 - 179,4 dk
 *   Halka acilislari  -> 0 - 5,3 - 6,7 - 7,2 - 7,5 - 7,7 - 7,9 - 8,0 dk
 *
 * ESKI esikler (zincir-only, blok carpani yok: 60. dk 1e15 - 120. dk 1e18) B = 5,5
 * altinda GECERSIZDIR. Yerine olculen degerler ve yapisal degismezler kondu:
 * eski testlerin kapsami (halka acilislari, alim sayisi, tiklamasiz oyuncu,
 * sayinin buyumesi) korunur, yalnizca sayisal esikler yeniden olculdu.
 */
interface SimResult {
  number: string
  log10: number
  buys: number
  firstTenMinutesBuys: number
  unlockMinutes: number[]
  challengeStartMinutes: number[]
  challengeEndMinutes: number[]
  completed: number
  gateMinutes: number | null
}

/**
 * Tasarim oyuncusu: saniyede `tapsPerSecond` kez +1, her tick sonrasi `maxAll`,
 * hazir mucadeleye girer, hedefe ulasanı bitirir.
 */
function simulate(options: { dt: number; tapsPerSecond: number; limitMinutes: number }): SimResult {
  const { dt, tapsPerSecond, limitMinutes } = options
  const state = createNumberState()
  let seconds = 0
  let tapAccumulator = 0
  let firstTenMinutesBuys = 0
  const unlockMinutes: number[] = []
  const seenUnlock = new Array<boolean>(8).fill(false)
  const challengeStartMinutes: number[] = []
  const challengeEndMinutes: number[] = []
  let completed = 0
  let gateMinutes: number | null = null
  const limitSeconds = limitMinutes * 60

  while (seconds < limitSeconds) {
    // `playTime` C4 curumesinin saati: store her tick'te yazar, test de oyle.
    state.playTime = seconds
    advance(state, dt)
    seconds += dt

    if (tapsPerSecond > 0) {
      tapAccumulator += dt
      while (tapAccumulator >= 1 / tapsPerSecond) {
        tapAccumulator -= 1 / tapsPerSecond
        manualTap(state)
      }
    }

    for (let i = 0; i < 8; i++) {
      // 0. halka (Fingers) zaten aciktir; digerleri `unlocked` mandaliyla acilir.
      if (!seenUnlock[i] && (i === 0 || state.unlocked[i])) {
        seenUnlock[i] = true
        unlockMinutes[i] = seconds / 60
      }
    }

    if (completeChallengeIfReady(state)) {
      completed += 1
      challengeEndMinutes.push(seconds / 60)
    }
    if (!state.challenges.active) {
      const next = nextChallenge(state)
      if (next && isChallengeUnlocked(state, next) && enterChallenge(state, next.id)) {
        challengeStartMinutes.push(seconds / 60)
      }
    }

    const before = state.totalBuys
    maxAll(state)
    if (seconds <= 600) firstTenMinutesBuys += state.totalBuys - before

    if (checkGate(state)) gateMinutes = seconds / 60
    if (state.gateReached) break
  }

  return {
    number: state.number.toString(),
    log10: state.number.log10().toNumber(),
    buys: state.totalBuys,
    firstTenMinutesBuys,
    unlockMinutes,
    challengeStartMinutes,
    challengeEndMinutes,
    completed,
    gateMinutes
  }
}
describe('1. basamak zincir kilidi - v2 tam kosu', () => {
  // Tek kosu: her test ayni simulasyonu paylasir (3 sim x 300 dk sinir, ~2,4 sn).
  const firstHour = simulate({ dt: 0.5, tapsPerSecond: 2, limitMinutes: 60 })
  const secondHour = simulate({ dt: 0.5, tapsPerSecond: 2, limitMinutes: 120 })
  const fullRun = simulate({ dt: 0.5, tapsPerSecond: 2, limitMinutes: 300 })

  it('8 halka da 15. dakikadan once acilir (blok carpani zinciri hizlandirir)', () => {
    expect(firstHour.unlockMinutes.filter((m) => m !== undefined).length).toBe(8)
    expect(Math.max(...firstHour.unlockMinutes)).toBeLessThan(15)
  })

  it('ilk 10 dakikada en az 6 alim karari verilir', () => {
    expect(firstHour.firstTenMinutesBuys).toBeGreaterThanOrEqual(6)
  })

  it('60. dakikada sayi 1e80 ustune cikar (olculen: 1e88,2)', () => {
    expect(D(firstHour.number).gt('1e80')).toBe(true)
    expect(firstHour.log10).toBeGreaterThan(80)
  })

  it('120. dakikada sayi 1e110 ustune cikar (olculen: 1e120,2)', () => {
    expect(D(secondHour.number).gt('1e110')).toBe(true)
    expect(secondHour.log10).toBeGreaterThan(110)
  })

  it('sayi tek yonludur: 120. dk 60. dakikanin altina inmez (sifirlama yok)', () => {
    expect(secondHour.log10).toBeGreaterThan(firstHour.log10)
  })

  it('halka basina en az bir blok (10 birim) alinir', () => {
    expect(firstHour.buys).toBeGreaterThanOrEqual(8 * 10)
  })

  it('tiklamasiz oyuncu ilk alimi yapamaz (c1 = 25 > baslangic 10)', () => {
    const idle = simulate({ dt: 1, tapsPerSecond: 0, limitMinutes: 10 })
    expect(idle.buys).toBe(0)
    expect(idle.number).toBe('10')
  })
  it('tam kosu kapiyi tek kosuda acar, 190 +/- 10 dk (olculen: 188,6)', () => {
    expect(fullRun.gateMinutes).not.toBeNull()
    expect(fullRun.gateMinutes as number).toBeGreaterThan(170)
    expect(fullRun.gateMinutes as number).toBeLessThan(210)
  })

  it('8 mucadelenin hepsi tamamlanir ve kapiya kadar sirayla biter', () => {
    expect(fullRun.completed).toBe(8)
    expect(fullRun.challengeEndMinutes).toHaveLength(8)
    expect(fullRun.challengeEndMinutes).toEqual([...fullRun.challengeEndMinutes].sort((a, b) => a - b))
    expect(fullRun.challengeEndMinutes[0]).toBeGreaterThan(20)
    expect(fullRun.challengeEndMinutes[7]).toBeLessThan(fullRun.gateMinutes as number)
  })

  it('her mucadele 15-24 dk surer (sikmama sozlesmesi)', () => {
    expect(fullRun.challengeStartMinutes).toHaveLength(8)
    for (let i = 0; i < 8; i++) {
      const duration = fullRun.challengeEndMinutes[i] - fullRun.challengeStartMinutes[i]
      expect(duration).toBeGreaterThan(15)
      expect(duration).toBeLessThan(24)
    }
  })

  it('mucadeleler arasinda 20 dakikadan uzun bosluk yok', () => {
    // Bosluk = bir mucadelenin bitisi ile sonrakinin girisi arasindaki sure.
    for (let i = 1; i < fullRun.challengeStartMinutes.length; i++) {
      const gap = fullRun.challengeStartMinutes[i] - fullRun.challengeEndMinutes[i - 1]
      expect(gap).toBeGreaterThanOrEqual(0)
      expect(gap).toBeLessThan(20)
    }
  })

  it('sayi NaN degildir ve kapi degerinin altinda kalmaz', () => {
    expect(Number.isFinite(fullRun.log10)).toBe(true)
    expect(fullRun.log10).toBeGreaterThanOrEqual(308.25286978738966)
  })
})

describe('mucadele sirasi ve kilit esikleri', () => {
  it('mucadeleler kilit sirasina gore dizilir ve hedefleri artar', () => {
    for (let i = 1; i < CHALLENGES.length; i++) {
      expect(CHALLENGES[i].unlockLog10).toBeCloseTo(CHALLENGES[i - 1].goalLog10, 6)
    }
  })

  it('hicbir alim yapmamis oyunda C1 kilidi 1e10 altinda kalir', () => {
    const s = createNumberState()
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
    s.number = D('1e10')
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(true)
  })

  it('tamamlanan mucadele bir daha acilmaz (mandal)', () => {
    const s = createNumberState()
    s.number = D('1e200')
    s.challenges.completed = ['C1', 'C2', 'C3']
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
    expect(nextChallenge(s)?.id).toBe('C4')
  })
})
