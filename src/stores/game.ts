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
  applyBoost as applyBoostRaw,
  blockFactor,
  boostBlockedReason as boostBlockedReasonRaw,
  boostBought as boostBoughtRaw,
  boostMultiplier as boostMultiplierRaw,
  boostPrice as boostPriceRaw,
  boostRequirement as boostRequirementRaw,
  boostRingUnlocked as boostRingUnlockedRaw,
  boostUnlocked as boostUnlockedRaw,
  buyRing as buyRingRaw,
  buyRingMax,
  canBoost as canBoostRaw,
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
  unlockedRingCount,
  type BoostBlockedReason
} from '../game/number/economy'
import {
  CHALLENGES,
  activeChallenge,
  challengeById,
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

/**
 * "While you were away" raporunun gösterildiği asgari yokluk süresi (sn).
 *
 * Simülasyon her duraklamada (≥ 1 sn) çalışır; bu eşik YALNIZ raporu yönetir.
 * Birkaç saniyelik sekme değişimi "uzakta kalmak" değildir: o aralıkta kazanç
 * ekranda zaten okunur, "+0 · 4s of counting" diyen bir modal oyuncunun akışını
 * boşuna böler. Bir dakika, oyuncunun gerçekten başka bir şeye döndüğü ve dönüşte
 * "ne oldu?" sorusunun anlamlı olduğu ilk ölçektir. Kayıttan yükleme yolu da aynı
 * eşiği kullanır.
 */
export const OFFLINE_REPORT_MIN_SECONDS = 60

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
    // Yeni oyun ×1 ile başlar: ilk karar "1 Fingers, 25" gibi okunmalı; ×10'un
    // blok fiyatı ilk dakikada anlaşılmaz. Mod uçucudur, kayda yazılmaz.
    buyMode: 1,
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

/** Blok çarpanı metni: küçük değerler "x5.30", büyükler notasyonla "x1.2e30". */
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

    /** Blok çarpanı rozeti: "x5.30". */
    blockMultText(): string {
      return 'x' + BLOCK_MULT.toFixed(2)
    },

    // ── Boost (ADR-0086) ─────────────────────────────────────────────────
    // UI yalnız bu getter'ları okur; çarpma/biçimlendirme bileşende yapılmaz.

    /** Bir sonraki boost için son halkada gereken alım sayısı. */
    boostRequirement(state): number {
      return boostRequirementRaw(state.boostCount)
    },

    /** Boost sayısı bir artarsa gereken alım sayısı. */
    boostNextRequirement(state): number {
      return boostRequirementRaw(state.boostCount + 1)
    },

    /** Son halkanın bu koşudaki alım sayısı. */
    boostBought(state): number {
      return boostBoughtRaw(state)
    },

    /** Bir sonraki boost'un sayı maliyeti. */
    boostPrice(state): Decimal {
      return boostPriceRaw(state)
    },

    /** Mevcut boost üretim çarpanı (1,5^n). */
    boostMultiplier(state): Decimal {
      return boostMultiplierRaw(state.boostCount)
    },

    /** Mevcut boost çarpanı rozeti: "x2.25". */
    boostMultiplierText(state): string {
      return blockFactorLabel(
        boostMultiplierRaw(state.boostCount),
        state.settings.decimalPlaces,
        state.settings.notation
      )
    },

    /** Bir sonraki boost'un çarpanı: "x3.38". */
    boostNextMultiplierText(state): string {
      return blockFactorLabel(
        boostMultiplierRaw(state.boostCount + 1),
        state.settings.decimalPlaces,
        state.settings.notation
      )
    },

    /** Son halka açık mı, ya da daha önce boost alınmış mı? */
    boostUnlocked(state): boolean {
      return boostUnlockedRaw(state)
    },

    /** Son halka bu koşuda açık mı? ('requirement' engelini ayırır) */
    boostRingUnlocked(state): boolean {
      return boostRingUnlockedRaw(state)
    },

    /** Boost'un önündeki ilk engel; null = engel yok (fiyat dahil). */
    boostBlockedReason(state): BoostBlockedReason | null {
      return boostBlockedReasonRaw(state)
    },

    /** Boost satın alınabilir mi? (reason null ise evet) */
    canBoost(state): boolean {
      return canBoostRaw(state)
    },

    /** Son halka gereksinimine ilerleme 0–100 (aşağı kırpılır). */
    boostProgress(state): number {
      const requirement = boostRequirementRaw(state.boostCount)
      if (requirement <= 0) return 100
      const raw = (boostBoughtRaw(state) / requirement) * 100
      if (!Number.isFinite(raw)) return 0
      return Math.min(100, Math.max(0, raw))
    },

    /**
     * Mücadele paneli satırları (8 sabit, ADR-0086).
     *
     * Hedefler MUTLAKTIR: her satır kendi plan hedefini yazar, giriş sayısı
     * hedefi kaydırmaz. Kilit `bestNumber`a bakar. `enterable` yalnız sıradaki
     * tamamlanmamış mücadelede (ve hiçbir mücadele aktif değilken) true olur:
     * UI "Enter" düğmesini bu bayrağa bağlar.
     */
    challengeRows(state): ChallengeRow[] {
      const nextId = nextChallenge(state)?.id ?? null
      return CHALLENGES.map((def) => {
        const completed = state.challenges.completed.includes(def.id)
        const active = state.challenges.active === def.id
        const unlocked = !completed && !active && isChallengeUnlocked(state, def)
        let status: ChallengeRow['status'] = 'locked'
        if (completed) status = 'completed'
        else if (active) status = 'active'
        else if (unlocked) status = 'available'
        const goalLog = active && state.challenges.goalLog10 !== null ? state.challenges.goalLog10 : def.goalLog10
        const goal = goalToDecimal(goalLog)
        const unlockAt = goalToDecimal(def.unlockLog10)
        return {
          id: def.id,
          name: rewardName(def.rewardLabel),
          ringName: NUMBER_TUNING.rings[def.ringIndex].name,
          status,
          goal,
          goalText: format(goal, state.settings.decimalPlaces, state.settings.notation),
          unlockAt,
          unlockText: format(unlockAt, state.settings.decimalPlaces, state.settings.notation),
          progress: completed ? 100 : active ? challengeProgress(state) : 0,
          enterable: status === 'available' && nextId === def.id,
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
      const gate = checkGate(this)
      if (gate) this.announceGate()
      // Aynı tick'te biten mücadele/kapı satırı ezilmez: boost eşiği bir sonraki
      // tick'te konuşur (tek ticker var; olay önceliği kapı > bitiş > boost).
      if (!completed && !gate) this.announceBoostAvailable()
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
    /**
     * Boost eşiği ilk kez açıldığında sahne satırı (ADR-0086).
     *
     * Koşul son halkanın AÇIK ve gereksinim kadar alınmış olmasıdır; fiyat şart
     * değil — satır "boost açıldı" der, "hemen alınabilir" demez. Mandallıdır:
     * eşik bir kez açılır, her tick'te tekrar konuşmaz.
     */
    announceBoostAvailable(): void {
      if (this.rung !== 1 || this.challenges.active !== null) return
      if (this.gateReached) return
      if (this.latched.includes('r1_boost_available')) return
      if (!this.boostRingUnlocked) return
      if (this.boostBought < this.boostRequirement) return
      const ctx = voiceContextFor(this)
      const scene = pickSceneLine(this.rung, this.latched, 'r1_boost_available', ctx)
      if (!scene) return
      this.tickerLine = lineText(scene, ctx)
      this.markVoiceSeen(scene.id)
      this.latch(scene.id)
    },

    /** Boost satın alındı: sahne satırı + ses; sayaç ve çarpan kalıcıdır. */
    announceBoost(): void {
      const ctx = voiceContextFor(this)
      const scene = pickSceneLine(this.rung, this.latched, 'r1_boost_purchased', ctx)
      if (scene) {
        this.tickerLine = lineText(scene, ctx)
        this.markVoiceSeen(scene.id)
        this.latch(scene.id)
      }
      if (this.settings.soundEnabled) sounds.playPayoff()
    },

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
     * Boost satın al (ADR-0086): fiyatı öde, sayacı artır, koşuyu sıfırla.
     *
     * Boost sayısı, bestNumber, tamamlanmış mücadele ödülleri ve Tanım korunur;
     * sayı 10'a, zincir sıfıra döner. Mücadele aktifken veya 1. basamak dışında
     * satın alınamaz (`canBoost` engeli).
     *
     * @returns gerçekten alındıysa `true`
     */
    boost(): boolean {
      if (!applyBoostRaw(this)) return false
      this.announceBoost()
      return true
    },

    /**
     * Mücadeleye gir — koşu sıfırlanır, ceza üstüne biner (ADR-0086 §1/§5).
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
     * ADR-0086 §4: boost sayacı BURADA sıfırlanır; mücadele girişinde değil.
     * Koşu korunur: sayı, halkalar, ödüller ve Tanım silinmez. 2. basamak bu
     * build'de yok; modal onu söyler, vaat vermez (V4).
     */
    prestige(): void {
      // Yalnız kapı EKRANDAYKEN: `gateReached` mandal olduğu için tek başına
      // yetmez, aksi hâlde her çağrı +1 Tanım yazardı.
      if (!this.gateOpen) return
      // Sahne satırı basamak değişmeden seçilir: havuz 1. basamağındır.
      const ctx = voiceContextFor(this)
      const scene = pickSceneLine(this.rung, this.latched, 'r1_boost_reset', ctx)
      this.tanim += 1
      this.boostCount = 0
      this.rung = 2
      // `gateReached` BİLİNÇLE true kalır (contract §4: "keep gateReached"). Kapıya
      // varılmış olmak geri alınamaz bir gerçektir ve kayda öyle yazılır; modalın
      // kapanması bu mandalın değil, basamağın işidir (`gateOpen`).
      this.latch('prestige_' + this.tanim)
      if (scene) {
        this.tickerLine = lineText(scene, ctx)
        this.markVoiceSeen(scene.id)
        this.latch(scene.id)
      }
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
     * Her 1 sn'lik adımdan SONRA `update` ile AYNI olay çözümü çalışır: hedefi
     * aşan mücadele TAM O ADIMDA tamamlanır, ödülü kalan çevrimdışı süreye
     * derhal uygulanır (ADR-0086 §7). Döngü sonunda tek seferlik çözüm, 12
     * saatlik bir dönüşte ödülü geç fark ettirirdi.
     *
     * Rapor (`offlineReport`) yalnız `OFFLINE_REPORT_MIN_SECONDS` ve üzerindeki
     * yokluklarda yazılır; daha kısa duraklamalar sessizce simüle edilir ve
     * ekrandaki mevcut rapora dokunmaz.
     */
    simulateOffline(seconds: number): void {
      if (!Number.isFinite(seconds) || seconds <= 0) return
      const capped = seconds > OFFLINE_CAP_SECONDS
      const total = Math.min(seconds, OFFLINE_CAP_SECONDS)
      const report = total >= OFFLINE_REPORT_MIN_SECONDS
      const before = this.number
      // Kapı açıksa çevrimdışı süre de büyüme üretmez: büyüme zaten durmuştur.
      if (this.growthStopped) {
        if (report) this.offlineReport = { seconds: total, capped, gained: '0' }
        return
      }
      const step = 1
      let remaining = total
      while (remaining > 0) {
        const dt = Math.min(step, remaining)
        advance(this, dt)
        this.playTime += dt
        remaining -= dt
        // Mücadele hedefi bu adımda aşıldıysa ödülü HEMEN uygula; kapı da
        // aynı adımda mandallanır ve büyüme durur.
        this.resolveChallengeAndGate()
        if (this.growthStopped) break
      }
      if (!report) return
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
        boostCount: this.boostCount,
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
      // bestNumber hayat boyu zirvedir; bozuk/eski kayıt onu sayının altında
      // bırakırsa mücadele kilitleri yanlış kapanırdı (ADR-0086 §6 soft-lock).
      if (this.number.gt(this.bestNumber)) this.bestNumber = this.number
      this.rung = typeof data.rung === 'number' ? Math.min(11, Math.max(1, data.rung)) : 1
      this.totalBuys = typeof data.totalBuys === 'number' ? data.totalBuys : 0
      // v24: boostCount. v20-v23 kayıtlarında yoktur → 0. Negatif/ondalıklı/NaN
      // değerler sessizce temizlenir; sayaç asla negatif olamaz.
      const savedBoost = finite(data.boostCount)
      this.boostCount = savedBoost === null ? 0 : Math.max(0, Math.floor(savedBoost))
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