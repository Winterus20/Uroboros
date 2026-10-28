import { defineStore } from 'pinia'
import { Decimal, D, D_0 } from '../core/math'
import { format, heroParts, type NotationType } from '../core/format'
import { SAVE_VERSION, readSaveVersion } from '../core/save-version'
import { sounds } from '../core/audio'
import {
  BLOCK_MULT,
  BLOCK_SIZE,
  GATE,
  GATE_LOG10,
  NUMBER_TUNING,
  RING_COUNT
} from '../game/number/tuning'
import { lineText, pickSceneLine, type VoiceContext } from '../game/voice'
import {
  advance,
  blockFactor,
  buyRing as buyRingRaw,
  buyRingMax,
  canBuyRing,
  checkGate,
  createNumberState,
  manualTap,
  maxAffordableRing,
  maxAll,
  numberPerSecond,
  ringBlockPrice,
  ringCost,
  ringGainPerSecond,
  ringNumberRate,
  ringUnlocked,
  unlockedRingCount
} from '../game/number/economy'
import {
  CHALLENGES,
  activeChallenge,
  challengeById,
  challengeGoalLog,
  challengeProgress,
  completeChallengeIfReady,
  enterChallenge as enterChallengeRaw,
  exitChallenge as exitChallengeRaw,
  isChallengeUnlocked,
  nextChallenge
} from '../game/number/challenges'
import { rungDef } from '../game/number/rungs'
import type { GameSettings, MusicTrackId } from '../models/settings'
import type {
  ActiveChallengeRow,
  BuyMode,
  ChallengeRow,
  GameState,
  RingRow
} from '../models/number'
import type { SerializedChallenges, SerializedPlayerState } from '../models/save'

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
    offlineReport: null,
    tickerLine: null
  }
}

/** `+1` gösterimi gerçekten değiştirdi mi? (S9: yuvarlama, yalan değil) */
function displayChanged(before: Decimal, after: Decimal, precision: number, notation: NotationType): boolean {
  return format(before, precision, notation) !== format(after, precision, notation)
}

/** Log10 hedefini Decimal'e çevirir (mücadele hedefleri log10 saklanır). */
function goalToDecimal(log10Value: number): Decimal {
  if (!Number.isFinite(log10Value)) return D('1e308')
  return D(10).pow(log10Value)
}

/** Blok çarpanı metni: küçük değerler "x5.50", büyükler notasyonla "x1.2e30". */
function blockFactorLabel(factor: Decimal, precision: number, notation: NotationType): string {
  if (factor.lt(1000)) {
    const n = factor.toNumber()
    return 'x' + (Number.isFinite(n) ? n.toFixed(2) : factor.toString())
  }
  return 'x' + format(factor, precision, notation)
}

/**
 * Ödül satırının iki nokta öncesi ödülün ADIDIR ("Full Hand: Fingers x10…" →
 * "Full Hand"). Panel satırı ve tamamlanma sahnesi aynı adı kullanır.
 */
function rewardName(rewardLabel: string): string {
  const idx = rewardLabel.indexOf(':')
  return idx > 0 ? rewardLabel.slice(0, idx).trim() : rewardLabel
}

/**
 * Ses bağlamı — mücadele ve kapı sahneleri OLAY anında bu bağlamla çağrılır.
 *
 * V3: ses yalnız oyun içi veriyi görür (basamak, sayı, /sn, basış, bekleme, saat).
 * `idleSeconds` burada 0: satır zaten olay anında seçiliyor; "ne kadar süredir
 * boşta" sorusu bant zamanlayıcısının sorusudur, bu çağrının değil.
 */
function voiceContextFor(state: GameState): VoiceContext {
  return {
    rung: state.rung,
    number: state.number,
    perSecond: numberPerSecond(state),
    taps: state.taps,
    uselessTaps: state.uselessTaps,
    idleSeconds: 0,
    hour: new Date().getHours(),
    tab: 'number'
  }
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
      return Array.from({ length: RING_COUNT }, (_, index) => {
        const factor = blockFactor(state.rings[index].bought)
        return {
          index,
          name: NUMBER_TUNING.rings[index].name,
          amount: state.rings[index].amount,
          bought: state.rings[index].bought,
          unlocked: ringUnlocked(state, index),
          cost: ringCost(state, index),
          cost10: ringBlockPrice(state, index, BLOCK_SIZE),
          maxCount: maxAffordableRing(state, index),
          costMax: ringBlockPrice(state, index, Math.max(1, maxAffordableRing(state, index))),
          affordable: canBuyRing(state, index) && state.number.gte(ringCost(state, index)),
          affordable10:
            canBuyRing(state, index) && state.number.gte(ringBlockPrice(state, index, BLOCK_SIZE)),
          unlockedNextAt: Math.max(0, NUMBER_TUNING.unlockThreshold - state.rings[index].bought),
          producesPerSecond: ringGainPerSecond(state, index),
          addsPerSecond: ringNumberRate(state, index),
          blockFactor: factor,
          blockFactorText: blockFactorLabel(factor, state.settings.decimalPlaces, state.settings.notation)
        }
      })
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
    },

    /** Hedef satırı: normal modda kapı, mücadelede girişte kilitlenen hedef. */
    goalText(state): string {
      const def = activeChallenge(state)
      if (def && state.challenges.goalLog10 !== null) {
        return format(goalToDecimal(state.challenges.goalLog10), 2, state.settings.notation)
      }
      return '1.79e308'
    },

    /**
     * Logaritmik ilerleme 0–100 (plan §6): `100 · log10(N) / log10(GATE)`.
     *
     * Kapıya VARILDIYSA tam 100 döner. Oran aritmetiği 99.99999… verir; ekran
     * `⌊…⌋` yazdığı için oyuncu hedefe vardığı hâlde "%99" okurdu — sayı ile
     * etiket çelişmesin diye sınır açıkça kapatılır.
     */
    goalProgress(state): number {
      const def = activeChallenge(state)
      if (def) return challengeProgress(state)
      if (state.number.gte(GATE)) return 100
      const log = state.number.log10().toNumber()
      if (!Number.isFinite(log) || log <= 0) return 0
      return Math.min(100, Math.max(0, (log / GATE_LOG10) * 100))
    },

    /** Normal modda sıradaki mücadele; hepsi bittiyse kapı. */
    nextChallengeLabel(state): string {
      if (activeChallenge(state)) return ''
      const next = nextChallenge(state)
      return next ? next.id : 'Gate'
    },

    /**
     * Kapı modalı görünür mü?
     *
     * `gateReached` MANDALDIR: kapıya bir kez varıldıysa kayıtta öyle kalır. Modal
     * ise yalnız 1. basamakta, prestij henüz yapılmamışken açılır — aksi hâlde
     * yüklenen her kayıtta oyuncunun karşısına yeniden dikilirdi.
     */
    gateOpen(state): boolean {
      return state.gateReached && state.rung === 1
    },

    /** Kapının açıldığı andan prestije kadar sayı büyümez (contract §7). */
    growthStopped(state): boolean {
      return state.gateReached && state.rung === 1
    },

    /** Blok çarpanı rozeti: "x5.50". */
    blockMultText(): string {
      return 'x' + BLOCK_MULT.toFixed(2)
    },

    /**
     * Mücadele paneli satırları (8 sabit, contract §4).
     *
     * Hedef görelidir (`max(plan, giriş + Δ)`), o yüzden aktif olmayan satırda
     * sabit plan hedefi değil, "şimdi girilse hedef ne olurdu" değeri yazılır:
     * aksi hâlde oyuncu ulaşamayacağı bir sayıyı hedef sanardı (V4).
     */
    challengeRows(state): ChallengeRow[] {
      const nowLog = state.number.log10().toNumber()
      const safeLog = Number.isFinite(nowLog) ? nowLog : 0
      return CHALLENGES.map((def) => {
        const completed = state.challenges.completed.includes(def.id)
        const active = state.challenges.active === def.id
        const unlocked = !completed && !active && isChallengeUnlocked(state, def)
        let status: ChallengeRow['status'] = 'locked'
        if (completed) status = 'completed'
        else if (active) status = 'active'
        else if (unlocked) status = 'available'
        const goalLog =
          active && state.challenges.goalLog10 !== null
            ? state.challenges.goalLog10
            : completed
              ? def.goalLog10
              : challengeGoalLog(def, safeLog)
        const goal = goalToDecimal(goalLog)
        return {
          id: def.id,
          name: rewardName(def.rewardLabel),
          ringName: NUMBER_TUNING.rings[def.ringIndex].name,
          status,
          goal,
          goalText: format(goal, state.settings.decimalPlaces, state.settings.notation),
          progress: completed ? 100 : active ? challengeProgress(state) : 0,
          penaltyLabel: def.penaltyLabel,
          rewardLabel: def.rewardLabel
        }
      })
    },

    /** GoalBar'ın mücadele modu satırı; aktif yoksa null. */
    activeChallengeRow(state): ActiveChallengeRow | null {
      const def = activeChallenge(state)
      if (!def) return null
      // Hedef girişte kilitlenir (contract §1); eksikse tanımın plan hedefi kullanılır.
      const goalLog = state.challenges.goalLog10 ?? def.goalLog10
      const goal = goalToDecimal(goalLog)
      return {
        id: def.id,
        name: rewardName(def.rewardLabel),
        ringName: NUMBER_TUNING.rings[def.ringIndex].name,
        goal,
        goalText: format(goal, state.settings.decimalPlaces, state.settings.notation),
        progress: challengeProgress(state),
        penaltyLabel: def.penaltyLabel,
        rewardLabel: def.rewardLabel
      }
    }
  },

  actions: {
    /**
     * Ana tick: 20 TPS (50 ms).
     *
     * Sıra sabittir (contract §4): advance → completeChallengeIfReady → checkGate.
     * Ekonomi saftır ve olay üretmez; mücadele bitişi ile kapı birer OLAYDIR,
     * bu yüzden ticker satırı ve ses burada doğar.
     */
    update(dt: number): void {
      if (!Number.isFinite(dt) || dt <= 0) return
      // Kapı açıldıktan sonra prestije kadar büyüme DURUR (plan §7). Modal açıkken
      // sayıyı büyütmek, oyuncunun okuduğu 1.79e308 ile ekrandaki sayıyı çeliştirirdi.
      if (this.growthStopped) return
      advance(this, dt)
      this.playTime += dt
      this.resolveChallengeAndGate()
    },

    /**
     * Tick sonrası olay çözümü — `update` ve `simulateOffline` AYNI yolu kullanır.
     *
     * Çevrimdışı simülasyonda da ödül/ticker/ses üretilir: 12 saatlik bir dönüşte
     * tamamlanan mücadelenin sessizce ödül vermesi, mekaniğin oyuncudan saklanması
     * olurdu (V4). Ses kapalıysa/sekme arkadaysa `sounds` zaten susar.
     */
    resolveChallengeAndGate(): void {
      const completed = completeChallengeIfReady(this)
      if (completed) this.announceChallengeClear(completed.id)
      if (checkGate(this)) this.announceGate()
    },

    /** Mücadele bitişi: sahne satırı + ticker olayı + ses (contract §4). */
    announceChallengeClear(id: string): void {
      this.latch('challenge_clear_' + id)
      const ctx = voiceContextFor(this)
      const scene = pickSceneLine(this.rung, this.latched, 'r1_clear_' + id.toLowerCase(), ctx)
      if (scene) {
        this.tickerLine = lineText(scene, ctx)
        this.markVoiceSeen(scene.id)
        this.latch(scene.id)
      } else {
        // Ses havuzu bu kimliği tanımıyorsa satır boş kalmaz: olay yine söylenir.
        this.tickerLine = id + ' completed.'
      }
      if (this.settings.soundEnabled) sounds.playPayoff()
    },

    /** Kapı (1.79e308): sahne satırı + ses; büyüme GateModal açılana dek sürer. */
    announceGate(): void {
      const ctx = voiceContextFor(this)
      const scene = pickSceneLine(this.rung, this.latched, 'r1_gate_latch', ctx)
      if (scene) {
        this.tickerLine = lineText(scene, ctx)
        this.markVoiceSeen(scene.id)
        this.latch(scene.id)
      }
      if (this.settings.soundEnabled) sounds.playMilestone()
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

    /** Max All: en derin halkadan başlayarak tüm zinciri blok blok alır. */
    buyMaxAll(): void {
      maxAll(this)
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

    /**
     * Mücadeleye gir — sayı/halkalar/B korunur, ceza üstüne biner (contract §0).
     *
     * Giriş bir OLAYDIR: sahne satırı cezanın ne olduğunu dünyanın dilinde söyler
     * (V1). Satır kimlikle çağrılır, rastgele havuzdan gelmez.
     */
    enterChallenge(id: string): void {
      if (!enterChallengeRaw(this, id)) return
      const ctx = voiceContextFor(this)
      const scene = pickSceneLine(this.rung, this.latched, 'r1_challenge_' + id.toLowerCase(), ctx)
      if (scene) {
        this.tickerLine = lineText(scene, ctx)
        this.markVoiceSeen(scene.id)
        this.latch(scene.id)
      }
      if (this.settings.soundEnabled) sounds.playHapticTap()
    },

/** Mücadeleden çık — ceza kalkar, ilerleme korunur, hedef iptal olur. */
    exitChallenge(): void {
      if (this.challenges.active === null) return
      exitChallengeRaw(this)
      if (this.settings.soundEnabled) sounds.playHapticTap()
    },

    /**
     * Kapıdaki prestij (contract §4): +1 Tanım, 2. basamak placeholder.
     *
     * `gateReached` MANDAL olarak true kalır — kapıya bir kez varıldı, bu geri
     * alınamaz bir gerçektir ve kayda öyle yazılır. Tekrar tetiklenmesini
     * `checkGate` engeller: rung 2 olduğunda kapı kontrolü çalışmaz.
     *
     * Koşu korunur: sayı, halkalar, ödüller ve Tanım silinmez. 2. basamak bu
     * build'de yok; modal onu söyler, vaat vermez (V4).
     */
    prestige(): void {
      // Yalnız kapı EKRANDAYKEN: `gateReached` mandal olduğu için tek başına
      // yetmez, aksi hâlde her çağrı +1 Tanım yazardı.
      if (!this.gateOpen) return
      this.tanim += 1
      this.rung = 2
      // `gateReached` BİLİNÇLE true kalır (contract §4: "keep gateReached"). Kapıya
      // varılmış olmak geri alınamaz bir gerçektir ve kayda öyle yazılır; modalın
      // kapanması bu mandalın değil, basamağın işidir (`gateOpen`).
      this.latch('prestige_' + this.tanim)
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

    /**
     * S6 — çevrimdışı ilerleme: 12 saat tavan, 1 sn adımlarla.
     *
     * Döngü bittikten sonra `update` ile AYNI olay çözümü çalışır: 12 saatlik bir
     * dönüşte tamamlanan mücadele ödülünü verir, ticker satırını yazar ve sesi
     * çalar. Aksi hâlde çevrimdışı dönüş, mekaniğin sessizce atlandığı tek yol
     * olurdu (V4: mekanik hakkında yalan yok).
     */
    simulateOffline(seconds: number): void {
      if (!Number.isFinite(seconds) || seconds <= 0) return
      const capped = seconds > OFFLINE_CAP_SECONDS
      const total = Math.min(seconds, OFFLINE_CAP_SECONDS)
      const before = this.number
      // Kapı açıksa çevrimdışı süre de büyüme üretmez: büyüme zaten durmuştur.
      if (this.growthStopped) {
        this.offlineReport = { seconds: total, capped, gained: '0' }
        return
      }
      const step = 1
      let remaining = total
      while (remaining > 0) {
        const dt = Math.min(step, remaining)
        advance(this, dt)
        this.playTime += dt
        remaining -= dt
      }
      this.resolveChallengeAndGate()
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
        latched: [...this.latched],
        challenges: {
          completed: [...this.challenges.completed],
          active: this.challenges.active,
          entryLog10: this.challenges.entryLog10,
          goalLog10: this.challenges.goalLog10,
          lastBuyAt: this.challenges.lastBuyAt,
          lastBoughtRing: this.challenges.lastBoughtRing ?? -1
        },
        gateReached: this.gateReached,
        tanim: this.tanim
      }
    },

    deserialize(data: SerializedPlayerState): void {
      const fresh = buildInitialState()
      const num = (value: unknown, fallback: Decimal): Decimal => {
        if (typeof value !== 'string' && typeof value !== 'number') return fallback
        const dec = D(value)
        return dec.isNan() ? fallback : dec
      }
      const finite = (value: unknown): number | null =>
        typeof value === 'number' && Number.isFinite(value) ? value : null
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
      // Olay satırı uçucudur: yüklenen koşunun ticker'ı kendi bağlamından konuşur.
      this.tickerLine = null
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
      // Eski/bozuk kayıtlarda kilit ile alım sayacı çelişebilir: 10 birim alınmış
      // bir halka açık olmalı, ve açık halka bir sonrakini açmış olmalı (D6 mandalı).
      // Bu uzlaştırma olmadan eski kayıt "0 more Fingers" yazıp Notch'u sonsuza
      // kadar kilitli tutabiliyordu.
      for (let i = 0; i < RING_COUNT; i++) {
        if (this.rings[i].bought > 0 || this.rings[i].amount.gt(0)) this.unlocked[i] = true
        if (this.rings[i].bought >= NUMBER_TUNING.unlockThreshold && i + 1 < RING_COUNT) {
          this.unlocked[i + 1] = true
        }
      }

      // ── v23 — mücadele, kapı, Tanım ───────────────────────────────────────
      // v22 kayıtlarında bu üç alan YOKTUR. Yok saymak yerine VARSAYILANLA
      // doldurulur: oyuncunun sayısı ve zinciri korunur, akışa temiz girer.
      const raw: Partial<SerializedChallenges> =
        data.challenges && typeof data.challenges === 'object' ? data.challenges : {}
      // Yalnız 8 bilinen kimlik ve yalnız bir kez: kurcalanmış kayıt listeyi şişiremez.
      const completed: string[] = []
      if (Array.isArray(raw.completed)) {
        for (const id of raw.completed) {
          if (typeof id !== 'string') continue
          if (challengeById(id) === null) continue
          if (completed.includes(id)) continue
          completed.push(id)
        }
      }
      // Aktif kimlik: bilinen, tamamlanmamış ve hedefi sonlu olmalı. Aksi hâlde
      // oyuncu hiç bitmeyecek bir mücadelede kilitli kalırdı.
      const entry = finite(raw.entryLog10)
      const goal = finite(raw.goalLog10)
      const activeId =
        typeof raw.active === 'string' &&
        challengeById(raw.active) !== null &&
        !completed.includes(raw.active) &&
        entry !== null &&
        goal !== null &&
        goal > entry
          ? raw.active
          : null
      // Halka indeksi: -1 = henüz alım yok (C7 cezası hiçbir halkayı tam saymaz).
      const rawRing = finite(raw.lastBoughtRing)
      const lastBoughtRing =
        rawRing === null ? -1 : Math.min(RING_COUNT - 1, Math.max(-1, Math.floor(rawRing)))
      this.challenges = {
        completed,
        active: activeId,
        entryLog10: activeId !== null ? entry : null,
        goalLog10: activeId !== null ? goal : null,
        lastBuyAt: Math.max(0, finite(raw.lastBuyAt) ?? 0),
        lastBoughtRing
      }
      this.gateReached = data.gateReached === true
      // Tanım sayacı: negatif/ondalıklı değer prestij sayısı olamaz.
      const tanim = finite(data.tanim)
      this.tanim = tanim === null ? 0 : Math.max(0, Math.floor(tanim))
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