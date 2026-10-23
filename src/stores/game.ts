import { defineStore } from 'pinia'
import { Decimal, D, D_0 } from '../core/math'
import { format, heroParts, type NotationType } from '../core/format'
import { SAVE_VERSION } from '../core/save-version'
import { NUMBER_TUNING, RING_COUNT } from '../game/number/tuning'
import {
  advance,
  applyBoost,
  applyPrestige,
  boostMultiplier,
  buyRing as buyRingRaw,
  canBoost,
  createNumberState,
  gateReady as gateReadyRaw,
  manualTap,
  numberPerSecond,
  productionEfficiency,
  ringCost,
  ringGainPerSecond,
  ringUnlocked,
  tanimReward as tanimRewardRaw,
  unlockedRingCount
} from '../game/number/economy'
import { rungDef } from '../game/number/rungs'
import {
  UPGRADES,
  applyUpgradeLevels,
  autobuyIntervalFor,
  emptyUpgrades,
  upgradeCost,
  type UpgradeId
} from '../game/number/upgrades'
import type { GameSettings, MusicTrackId } from '../models/settings'
import type { GameState, RingRow } from '../models/number'
import type { SerializedPlayerState } from '../models/save'

/** S6 — çevrimdışı ilerleme 12 saatte tavan yapar. */
export const OFFLINE_CAP_SECONDS = 12 * 60 * 60

/** Ticker geçmişinde tutulan satır sayısı (T4: tekrar önleme). */
const SEEN_VOICE_LIMIT = 8

export function defaultSettings(): GameSettings {
  return {
    notation: 'scientific',
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
    upgrades: emptyUpgrades(),
    settings: defaultSettings(),
    seenVoice: [],
    latched: [],
    autobuyTimer: 0,
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
    /** Sayı/sn (Birikim cezası dahil). */
    perSecond(state): Decimal {
      return numberPerSecond(state)
    },

    efficiency(state): Decimal {
      return productionEfficiency(state)
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
        affordable: ringUnlocked(state, index) && state.number.gte(ringCost(state, index)),
        unlockedNextAt: Math.max(0, NUMBER_TUNING.unlockThreshold - state.rings[index].bought),
        producesPerSecond: ringGainPerSecond(state, index)
      }))
    },

    boostAvailable(state): boolean {
      return canBoost(state)
    },

    boostGain(state): Decimal {
      return boostMultiplier(state)
    },

    gateReady(state): boolean {
      return gateReadyRaw(state)
    },

    tanimReward(state): Decimal {
      return tanimRewardRaw(state)
    },

    /** Prestij ödülü ekranda göründüğü haliyle (2 ondalık). */
    tanimRewardText(state): string {
      return format(tanimRewardRaw(state), 2, state.settings.notation)
    },

    heroParts(state): { base: string; tail: string } {
      return heroParts(state.number)
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

    /** Basamak içi ilerleme [0,1] — yalnız telemetri; eşik değil. */
    rungProgress(state): number {
      const log = state.number.log10().toNumber()
      if (!Number.isFinite(log) || log <= 0) return 0
      return Math.min(1, Math.max(0, log / 308))
    },

    autobuyInterval(state): number {
      return autobuyIntervalFor(state.upgrades.autobuy)
    },

    upgradesView(state) {
      return UPGRADES.map((def) => {
        const level = state.upgrades[def.id]
        return {
          id: def.id,
          name: def.name,
          level,
          maxLevel: def.maxLevel,
          cost: upgradeCost(def.id, level),
          effect: def.describe(level),
          affordable: (() => {
            const cost = upgradeCost(def.id, level)
            return cost !== null && state.tanim.gte(cost)
          })()
        }
      })
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
      this.runAutobuy(dt)
      if (this.number.gte(NUMBER_TUNING.gate) && !this.gateReached) this.gateReached = true
    },

    /** Otomasyon: en ucuz alınabilir halkayı periyodik olarak alır (Tanım yükseltmesi). */
    runAutobuy(dt: number): void {
      const interval = autobuyIntervalFor(this.upgrades.autobuy)
      if (interval <= 0) return
      this.autobuyTimer += dt
      if (this.autobuyTimer < interval) return
      this.autobuyTimer = 0
      const rows = this.ringRows
      let best = -1
      let bestCost: Decimal | null = null
      for (const row of rows) {
        if (!row.affordable) continue
        if (bestCost === null || row.cost.lt(bestCost)) {
          bestCost = row.cost
          best = row.index
        }
      }
      if (best >= 0) this.buyRing(best)
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

    /** Satın alınabilir en ucuz halkayı al (klavye kısayolu). */
    buyCheapest(): void {
      const affordable = this.ringRows.filter((row) => row.affordable)
      if (affordable.length === 0) return
      affordable.sort((a, b) => (a.cost.lt(b.cost) ? -1 : 1))
      this.buyRing(affordable[0].index)
    },

    /** Mini boost (E12–E14). */
    boost(): Decimal {
      return applyBoost(this)
    },

    /** Prestij (E7/S2). Dikey dilimde `rung` 1'de kalır (2. basamak tasarlanmadı). */
    prestige(): Decimal {
      const reward = applyPrestige(this)
      this.autobuyTimer = 0
      return reward
    },

    buyUpgrade(id: UpgradeId): boolean {
      const level = this.upgrades[id]
      const cost = upgradeCost(id, level)
      if (cost === null || this.tanim.lt(cost)) return false
      this.tanim = this.tanim.minus(cost)
      this.upgrades[id] = level + 1
      applyUpgradeLevels(this, this.upgrades)
      return true
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
        this.runAutobuy(dt)
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
        peak: this.peak.toString(),
        bestNumber: this.bestNumber.toString(),
        rings: this.rings.map((ring) => ({ a: ring.amount.toString(), b: ring.bought })),
        unlocked: [...this.unlocked],
        boostMult: this.boostMult.toString(),
        boosts: this.boosts,
        rung: this.rung,
        tanim: this.tanim.toString(),
        tanimTotal: this.tanimTotal.toString(),
        prestiges: this.prestiges,
        totalBuys: this.totalBuys,
        totalBoosts: this.totalBoosts,
        gateReached: this.gateReached,
        taps: this.taps,
        uselessTaps: this.uselessTaps,
        playTime: this.playTime,
        startedAt: this.startedAt,
        lastSeenAt: this.lastSeenAt,
        upgrades: { ...this.upgrades },
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
      this.peak = num(data.peak, this.number)
      this.bestNumber = num(data.bestNumber, this.number)
      this.boostMult = num(data.boostMult, D(1))
      this.boosts = typeof data.boosts === 'number' ? data.boosts : 0
      this.rung = typeof data.rung === 'number' ? Math.min(11, Math.max(1, data.rung)) : 1
      this.tanim = num(data.tanim, D_0)
      this.tanimTotal = num(data.tanimTotal, D_0)
      this.prestiges = typeof data.prestiges === 'number' ? data.prestiges : 0
      this.totalBuys = typeof data.totalBuys === 'number' ? data.totalBuys : 0
      this.totalBoosts = typeof data.totalBoosts === 'number' ? data.totalBoosts : 0
      this.gateReached = data.gateReached === true
      this.taps = typeof data.taps === 'number' ? data.taps : 0
      this.uselessTaps = typeof data.uselessTaps === 'number' ? data.uselessTaps : 0
      this.playTime = typeof data.playTime === 'number' ? data.playTime : 0
      this.startedAt = typeof data.startedAt === 'number' ? data.startedAt : fresh.startedAt
      this.lastSeenAt = typeof data.lastSeenAt === 'number' ? data.lastSeenAt : fresh.lastSeenAt
      this.upgrades = { ...emptyUpgrades(), ...(data.upgrades ?? {}) }
      this.settings = { ...fresh.settings, ...(data.settings ?? {}) }
      this.seenVoice = Array.isArray(data.seenVoice) ? data.seenVoice.slice(0, SEEN_VOICE_LIMIT) : []
      this.latched = Array.isArray(data.latched) ? [...data.latched] : []
      this.offlineReport = null
      this.autobuyTimer = 0
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
      applyUpgradeLevels(this, this.upgrades)
    },

    /** Sert sıfırlama (Ayarlar > Hard Reset). */
    resetGame(): void {
      const settings = { ...this.settings }
      Object.assign(this, buildInitialState())
      this.settings = settings
      this.autobuyTimer = 0
    },

    /** `runAutobuy` sayacı — uçucu, kayda yazılmaz. */
    setAutobuyTimer(value: number): void {
      this.autobuyTimer = value
    }
  }
})

export type GameStore = ReturnType<typeof useGameStore>
