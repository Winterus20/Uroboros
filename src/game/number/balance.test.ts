import { describe, expect, it } from 'vitest'
import { D } from '../../core/math'
import { BLOCK_MULT, BOOST_MULT, CHALLENGE_BOOST_GATE } from './tuning'
import {
  advance,
  applyBoost,
  blockFactor,
  boostMultiplier,
  boostRequirement,
  createNumberState,
  manualTap,
  maxAll,
  numberPerSecond,
  ringGainPerSecond,
  type NumberState
} from './economy'
import {
  CHALLENGES,
  completeChallengeIfReady,
  enterChallenge,
  isChallengeUnlocked,
  nextChallenge
} from './challenges'

/**
 * RUNG 1 — EKONOMİ ŞEKLİ (gerçek motor, ADR-0086 sıfırlamalı model).
 *
 * Kalibrasyon: brain/scratchpad/rung1-boost-reset/ (task-3, 2026-10-31).
 * B=5,3 · boost ×1,8 · boost kapısı 4 (ADR-0087) · boost-only 673 dk · hedeflenen 181 dk.
 *
 * Bu dosya üç yolun tamamını ölçmez (o rung1.integration.test.ts'in işi);
 * açılışı, boost kapısını (C1 girişi) ve boost merdivenini ölçer.
 */

const STEP_SECONDS = 1
const TAPS_PER_SEC = 2

interface Snapshot {
  minutes: number
  log10: number
  buys: number
  unlocked: number
  boostCount: number
}

/** advance → açılış tıkı → maxAll; sıfırlama/boost politikası çağırana ait. */
function runUntil(
  state: NumberState,
  minutes: number,
  stop?: (state: NumberState) => boolean
): Snapshot {
  let t = 0
  let tapAcc = 0
  const target = minutes * 60
  while (t < target) {
    state.playTime = t
    advance(state, STEP_SECONDS)
    t += STEP_SECONDS
    if (state.rings[0].bought === 0) {
      tapAcc += STEP_SECONDS
      while (tapAcc >= 1 / TAPS_PER_SEC) {
        tapAcc -= 1 / TAPS_PER_SEC
        manualTap(state)
      }
    }
    completeChallengeIfReady(state)
    maxAll(state)
    if (stop?.(state)) break
  }
  return {
    minutes: t / 60,
    log10: state.number.log10().toNumber(),
    buys: state.totalBuys,
    unlocked: state.unlocked.filter(Boolean).length,
    boostCount: state.boostCount
  }
}

function fresh(): NumberState {
  return createNumberState()
}

describe('1. basamak — açılış (B=5,3)', () => {
  it('sekiz halka da 25 dakikadan önce açılır', () => {
    const snapshot = runUntil(fresh(), 25)
    expect(snapshot.unlocked).toBe(8)
  })

  it('ilk 10 dakikada en az 6 alım kararı verilir', () => {
    const s = fresh()
    const snapshot = runUntil(s, 10)
    expect(snapshot.buys).toBeGreaterThanOrEqual(6)
  })

  it('tiklamasiz oyuncu ilk alimi yapamaz (25 > baslangic 10)', () => {
    const s = fresh()
    let t = 0
    while (t < 600) {
      s.playTime = t
      advance(s, STEP_SECONDS)
      t += STEP_SECONDS
      maxAll(s)
    }
    expect(s.totalBuys).toBe(0)
    expect(s.number.toString()).toBe('10')
  })

  it('blok çarpanı 5,3 ve boost çarpanı 1,8', () => {
    expect(BLOCK_MULT).toBe(5.3)
    expect(BOOST_MULT).toBe(1.8)
    expect(blockFactor(10).toNumber()).toBeCloseTo(5.3, 9)
    expect(boostMultiplier(1).toNumber()).toBeCloseTo(1.8, 12)
  })
})

describe('boost kapısı — C1 en az 4 boost ister (ADR-0087)', () => {
  it('0-3 boost ile C1 ne açılır ne girilir, 4 boost ile giriş serbest', () => {
    const s = fresh()
    s.bestNumber = D('1e11')
    s.number = D(10)
    for (let n = 0; n < CHALLENGE_BOOST_GATE; n++) {
      s.boostCount = n
      expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(false)
      expect(enterChallenge(s, 'C1')).toBe(false)
      expect(s.challenges.active).toBeNull()
    }
    s.boostCount = CHALLENGE_BOOST_GATE
    expect(isChallengeUnlocked(s, CHALLENGES[0])).toBe(true)
    expect(enterChallenge(s, 'C1')).toBe(true)
  })

  it('4 boost ile C1 15-20 dk sürer (hedef 1e10.5)', () => {
    const s = fresh()
    s.bestNumber = D('1e11')
    s.number = D(10)
    s.boostCount = 4
    expect(CHALLENGES[0].goalLog10).toBeCloseTo(10.5, 12)
    expect(enterChallenge(s, 'C1')).toBe(true)

    const before = s.challenges.completed.length
    const snapshot = runUntil(s, 60, (state) => state.challenges.completed.length > before)
    const duration = snapshot.minutes
    expect(s.challenges.completed).toEqual(['C1'])
    expect(duration).toBeGreaterThanOrEqual(15)
    expect(duration).toBeLessThanOrEqual(20)
  })

  it('C1 ödülü Fingers üretimini ×10 ve beslemeyi ×1.5 yapar', () => {
    const plain = fresh()
    const rewarded = fresh()
    for (const s of [plain, rewarded]) {
      s.rings[0].amount = D(10)
      s.rings[0].bought = 0
      s.rings[1].amount = D(1)
    }
    rewarded.challenges.completed = ['C1']
    expect(ringGainPerSecond(rewarded, 0).div(ringGainPerSecond(plain, 0)).toNumber()).toBeCloseTo(10, 9)
    expect(numberPerSecond(rewarded).gt(numberPerSecond(plain))).toBe(true)
  })
})

describe('boost merdiveni — ilk 4 boost', () => {
  it('gereksinim 50/68/92 ve fiyat ×1,5^n', () => {
    expect(boostRequirement(0)).toBe(50)
    expect(boostRequirement(1)).toBe(68)
    expect(boostRequirement(2)).toBe(92)
  })

  it('ilk boost 15 dk altında, dört boost 45 dk altında alınır', () => {
    const s = fresh()
    const times: number[] = []
    let t = 0
    while (t < 60 * 60 && s.boostCount < 4) {
      s.playTime = t
      advance(s, STEP_SECONDS)
      t += STEP_SECONDS
      if (s.rings[0].bought === 0) {
        manualTap(s)
        manualTap(s)
      }
      if (s.challenges.active === null && applyBoost(s)) times.push(t / 60)
      maxAll(s)
    }
    expect(times).toHaveLength(4)
    expect(times[0]).toBeLessThan(15)
    expect(times[3]).toBeLessThan(45)
    expect(times).toEqual([...times].sort((a, b) => a - b))
    // Her boost zinciri sıfırlar: sayaç kalıcı, sayı 10'a döner.
    expect(s.boostCount).toBe(4)
  })

  it('boost (mücadele yokken) sayıyı üretir ama zincir beslemesini etkilemez', () => {
    const plain = fresh()
    const boosted = fresh()
    for (const s of [plain, boosted]) {
      s.rings[0].amount = D(10)
      s.rings[0].bought = 10
      s.rings[1].amount = D(2)
    }
    boosted.boostCount = 1
    expect(numberPerSecond(boosted).div(numberPerSecond(plain)).toNumber()).toBeCloseTo(1.8, 9)
    expect(ringGainPerSecond(boosted, 1).toString()).toBe(ringGainPerSecond(plain, 1).toString())
  })
})

describe('mücadele hedefleri — mutlak ve sıralı', () => {
  it('hedefler artar, kilitler önceki hedefe eşittir', () => {
    for (let i = 1; i < CHALLENGES.length; i++) {
      expect(CHALLENGES[i].unlockLog10).toBeCloseTo(CHALLENGES[i - 1].goalLog10, 12)
      expect(CHALLENGES[i].goalLog10).toBeGreaterThan(CHALLENGES[i - 1].goalLog10)
    }
    expect(nextChallenge(fresh())?.id).toBe('C1')
  })

  it('tamamlanan mücadele bir daha açılmaz', () => {
    const s = fresh()
    s.bestNumber = D('1e200')
    s.challenges.completed = ['C1', 'C2', 'C3']
    expect(nextChallenge(s)?.id).toBe('C4')
  })
})