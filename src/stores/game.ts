import { defineStore } from 'pinia'
import { Decimal, D, D_0 } from '../core/math'
import { format, heroParts, type NotationType } from '../core/format'
import { SAVE_VERSION, readSaveVersion } from '../core/save-version'
import { BLOCK_SIZE, NUMBER_TUNING, RING_COUNT } from '../game/number/tuning'
import {
  advance,
  buyRing as buyRingRaw,
  buyRingMax,
  createNumberState,
  manualTap,
  maxAffordableRing,
  numberPerSecond,
  ringBlockPrice,
  ringCost,
  ringGainPerSecond,
  ringNumberRate,
  ringUnlocked,
  unlockedRingCount
} from '../game/number/economy'
import { rungDef } from '../game/number/rungs'
import type { GameSettings, MusicTrackId } from '../models/settings'
import type { BuyMode, GameState, RingRow } from '../models/number'
import type { SerializedPlayerState } from '../models/save'

/** S6 — çevrimdışı ilerleme 12 saatte tavan yapar. */
export const OFFLINE_CAP_SECONDS = 12 * 60 * 60

/** Ticker geçmişinde tutulan satır sayısı (T4: tekrar önleme). */
const SEEN_VOICE_LIMIT = 8

export function defaultSettings(): GameSettings {
  return {
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
  }
}

export function buildInitialState(): GameState {
  const now = Date.now()
  return {
    ...createNumberState(),
    taps: 0,
    uselessTaps: 0,
    playTime: 0,
    startedAt: now,
    lastSeenAt: now,
    settings: defaultSettings(),
    seenVoice: [],
    latched: [],
    buyMode: 10,
    offlineReport: null
  }
}

/** `+1` gösterimi gerçekten değiştirdi mi? (S9: yuvarlama, yalan değil) */
function displayChanged(before: Decimal, after: Decimal, precision: number, notation: NotationType): boolean {
  return format(before, precision, notation) !== format(after, precision, notation)
}

export const useGameStore = defineStore('game', {
  state: buildInitialState,

  getters: {
    /** Sayı/sn. */
    perSecond(state): Decimal {
      return numberPerSecond(state)
    },

    unlockedRings(state): number {
      return unlockedRingCount(state)
    },

    /** Zincir satırları — ekranda yukarıdan aşağı Parmaklar → Matematikçi (E6). */
    ringRows(state): RingRow[] {
      return Array.from({ length: RING_COUNT }, (_, index) => ({
        index,
        name: NUMBER_TUNING.rings[index].name,
        amount: state.rings[index].amount,
        bought: state.rings[index].bought,
        unlocked: ringUnlocked(state, index),
        cost: ringCost(state, index),
        cost10: ringBlockPrice(state, index, BLOCK_SIZE),
        maxCount: maxAffordableRing(state, index),
        costMax: ringBlockPrice(state, index, Math.max(1, maxAffordableRing(state, index))),
        affordable: ringUnlocked(state, index) && state.number.gte(ringCost(state, index)),
        affordable10:
          ringUnlocked(state, index) && state.number.gte(ringBlockPrice(state, index, BLOCK_SIZE)),
        unlockedNextAt: Math.max(0, NUMBER_TUNING.unlockThreshold - state.rings[index].bought),
        producesPerSecond: ringGainPerSecond(state, index),
        addsPerSecond: ringNumberRate(state, index)
      }))
    },

    heroParts(state): { base: string; tail: string } {
      return heroParts(state.number, state.settings.notation)
    },

    numberText(state): string {
      return format(state.number, state.settings.decimalPlaces, state.settings.notation)
    },

    perSecondText(state): string {
      return format(numberPerSecond(state), state.settings.decimalPlaces, state.settings.notation)
    },

    rungInfo(state) {
      return rungDef(state.rung)
    },

    humorSuspended(state): boolean {
      return state.settings.humor === 'off'
    }
  },

  actions: {
    /** Ana tick: 20 TPS (50 ms). */
    update(dt: number): void {
      if (!Number.isFinite(dt) || dt <= 0) return
      advance(this, dt)
      this.playTime += dt
    },

    /** `+1` — gerçekten 1 ekler (S9); gösterim değişmediyse anlamsız basış sayılır. */
    tap(): void {
      const before = this.number
      const precision = this.settings.decimalPlaces
      const notation = this.settings.notation
      manualTap(this)
      this.taps += 1
      if (!displayChanged(before, this.number, precision, notation)) this.uselessTaps += 1
    },

    buyRing(index: number, count = 1): void {
      buyRingRaw(this, index, count)
    },

    /** "Max" modu: bütçenin alabildiği kadar al. */
    buyMax(index: number): void {
      buyRingMax(this, index)
    },

    /** Satın alma modu (×1 / ×10 / Max) — uçucu, kayda yazılmaz. */
    setBuyMode(mode: BuyMode): void {
      this.buyMode = mode
    },

    /** Seçili modun fiyatı kadar alım yapar (satır düğmesi ve M kısayolu aynı yolu kullanır). */
    buyWithMode(index: number): void {
      if (this.buyMode === 'max') this.buyMax(index)
      else this.buyRing(index, this.buyMode)
    },

    /** Satın alınabilir en ucuz halkayı seçili modda al (klavye kısayolu). */
    buyCheapest(): void {
      const rows =
        this.buyMode === 'max'
          ? this.ringRows.filter((row) => row.maxCount > 0)
          : this.buyMode === 10
            ? this.ringRows.filter((row) => row.affordable10)
            : this.ringRows.filter((row) => row.affordable)
      if (rows.length === 0) return
      rows.sort((a, b) => (a.cost.lt(b.cost) ? -1 : 1))
      this.buyWithMode(rows[0].index)
    },

    setSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
      this.settings[key] = value
    },

    setNotation(notation: NotationType): void {
      this.settings.notation = notation
    },

    setMusicTrack(track: MusicTrackId): void {
      this.settings.musicTrack = track
    },

    /** Ticker tekrar önleme: son gösterilen kimlikler (en yeni başta). */
    markVoiceSeen(id: string): void {
      if (this.seenVoice[0] === id) return
      this.seenVoice = [id, ...this.seenVoice.filter((x) => x !== id)].slice(0, SEEN_VOICE_LIMIT)
    },

    latch(id: string): boolean {
      if (this.latched.includes(id)) return false
      this.latched = [...this.latched, id]
      return true
    },

    /** S6 — çevrimdışı ilerleme: 12 saat tavan, 1 sn adımlarla. */
    simulateOffline(seconds: number): void {
      if (!Number.isFinite(seconds) || seconds <= 0) return
      const capped = seconds > OFFLINE_CAP_SECONDS
      const total = Math.min(seconds, OFFLINE_CAP_SECONDS)
      const before = this.number
      const step = 1
      let remaining = total
      while (remaining > 0) {
        const dt = Math.min(step, remaining)
        advance(this, dt)
        this.playTime += dt
        remaining -= dt
      }
      this.offlineReport = {
        seconds: total,
        capped,
        gained: this.number.minus(before).toString()
      }
    },

    serialize(): SerializedPlayerState {
      this.lastSeenAt = Date.now()
      return {
        version: SAVE_VERSION,
        number: this.number.toString(),
        bestNumber: this.bestNumber.toString(),
        rings: this.rings.map((ring) => ({ a: ring.amount.toString(), b: ring.bought })),
        unlocked: [...this.unlocked],
        rung: this.rung,
        totalBuys: this.totalBuys,
        taps: this.taps,
        uselessTaps: this.uselessTaps,
        playTime: this.playTime,
        startedAt: this.startedAt,
        lastSeenAt: this.lastSeenAt,
        settings: { ...this.settings },
        seenVoice: [...this.seenVoice],
        latched: [...this.latched]
      }
    },

    deserialize(data: SerializedPlayerState): void {
      const fresh = buildInitialState()
      const num = (value: unknown, fallback: Decimal): Decimal => {
        if (typeof value !== 'string' && typeof value !== 'number') return fallback
        const dec = D(value)
        return dec.isNan() ? fallback : dec
      }
      this.number = num(data.number, D(10))
      this.bestNumber = num(data.bestNumber, this.number)
      this.rung = typeof data.rung === 'number' ? Math.min(11, Math.max(1, data.rung)) : 1
      this.totalBuys = typeof data.totalBuys === 'number' ? data.totalBuys : 0
      this.taps = typeof data.taps === 'number' ? data.taps : 0
      this.uselessTaps = typeof data.uselessTaps === 'number' ? data.uselessTaps : 0
      this.playTime = typeof data.playTime === 'number' ? data.playTime : 0
      this.startedAt = typeof data.startedAt === 'number' ? data.startedAt : fresh.startedAt
      this.lastSeenAt = typeof data.lastSeenAt === 'number' ? data.lastSeenAt : fresh.lastSeenAt
      this.settings = { ...fresh.settings, ...(data.settings ?? {}) }
      // v21 (ADR-0080): "standard" (K/M/B/T) yeni varsayılan gösterim. v20
      // kayıtlarındaki "scientific" oyuncunun seçimi değil ESKİ VARSAYILANDI;
      // bir kez yeni gösterime taşınır, sonrasında oyuncunun seçimi korunur.
      if (this.settings.notation === 'scientific' && readSaveVersion(data) < 21) {
        this.settings.notation = 'standard'
      }
      this.seenVoice = Array.isArray(data.seenVoice) ? data.seenVoice.slice(0, SEEN_VOICE_LIMIT) : []
      this.latched = Array.isArray(data.latched) ? [...data.latched] : []
      this.offlineReport = null
      const parsedRings = Array.isArray(data.rings) ? data.rings : []
      for (let i = 0; i < RING_COUNT; i++) {
        const ring = parsedRings[i]
        this.rings[i].amount = ring ? num(ring.a, D_0) : D_0
        this.rings[i].bought = ring && typeof ring.b === 'number' ? ring.b : 0
      }
      const unlocked = Array.isArray(data.unlocked) ? data.unlocked : []
      for (let i = 0; i < RING_COUNT; i++) {
        this.unlocked[i] = i === 0 ? true : unlocked[i] === true
      }
    },

    /** Sert sıfırlama (Ayarlar > Hard Reset). */
    resetGame(): void {
      const settings = { ...this.settings }
      Object.assign(this, buildInitialState())
      this.settings = settings
    }
  }
})

export type GameStore = ReturnType<typeof useGameStore>
