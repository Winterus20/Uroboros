import type { Decimal } from '../../core/math'
import type { NumberState } from './economy'
import { BLOCK_SIZE } from './tuning'

/**
 * 8 MÜCADELE (v2 / 190 dk kalibrasyonu) — SIFIRLAMASIZ KATMANLAR.
 *
 * Bağlayıcı kaynak: brain/scratchpad/rung-1-implementation-contract.md §1–2 ·
 * brain/research/rung-1-190-calibration-2026-10-27.md ·
 * brain/scratchpad/chain-only-probe/190-calibration/engine.ts.
 *
 * Bir mücadeleye girmek sayıyı, halkaları veya blok çarpanını ASLA sıfırlamaz.
 * Mücadele bir örtüdür: girişte hedef kilitlenir, ceza derhal devreye girer,
 * hedefe ulaşınca ödül kalıcı olarak açılır ve örtü kalkar.
 *
 * Bu dosya saf: Vue yok, Pinia yok, store yazmaz. Ekonomi (`economy.ts`) aynı
 * tipleri ve sabitleri okur; ilişki tek yönlüdür (economy → challenges).
 */

export type PenaltyKind =
  | 'fingersCap'
  | 'price145'
  | 'directOff'
  | 'decay'
  | 'firstFive'
  | 'feedFifth'
  | 'newestOnly'
  | 'price135feedHalf'

export type RewardKind =
  | 'fingers10'
  | 'all5'
  | 'all3'
  | 'first3x5'
  | 'direct5'
  | 'feed15'
  | 'all4'
  | 'finisher'

/** Mücadelenin tanımı — sabit tablo, çalışma zamanında değişmez. */
export interface ChallengeDef {
  readonly id: string
  /** Hangi halkanın kilidiyle açılır (0 = Fingers). */
  readonly ringIndex: number
  /** Giriş eşiği: sayı bu log10 değerine ulaşınca mücadele görünür. */
  readonly unlockLog10: number
  /** Plan hedefi (log10). Nihai hedef `challengeGoalLog` ile hesaplanır. */
  readonly goalLog10: number
  /** Anti-istismar payı: hedef en az giriş + delta olur (log10). */
  readonly delta: number
  /** Mücadele sırasında geçerli fiyat çarpanı (g). Normal oyun 1,20. */
  readonly growth: number
  readonly penalty: PenaltyKind
  readonly reward: RewardKind
  /** Ceza satırı — mekanik metin, şaka yok. */
  readonly penaltyLabel: string
  /** Ödül satırı — mekanik metin, şaka yok. */
  readonly rewardLabel: string
}

/**
 * Mücadelenin çalışma zamanı durumu. `NumberState` içinde yaşar ve kayda yazılır.
 *
 * `completed` bir mandaldır: tamamlanan mücadele bir daha açılmaz ve ödülü
 * kalıcıdır. `entryLog10` / `goalLog10` yalnız aktif mücadelede doludur.
 */
export interface ChallengeState {
  /** Tamamlanmış mücadele kimlikleri (sıra korunur). */
  completed: string[]
  /** Aktif mücadelenin kimliği; yoksa `null`. */
  active: string | null
  /** Girişteki sayının log10'u — hedef bu değere göre kilitlenir. */
  entryLog10: number | null
  /** Girişte kilitlenen hedef (log10). */
  goalLog10: number | null
  /** Son alımın oyun zamanı (sn) — `decay` cezası bunu okur. */
  lastBuyAt: number
  /**
   * En son satın alınan halkanın indeksi (0 tabanlı) — C7 `newestOnly` bunu
   * okur. Motor `lastBuyTime[]` dizisinin tek alanlık eşdeğeri: yalnız
   * MAKSİMUM zaman önemlidir. `-1` = bu koşuda hiç alım yapılmadı (ceza
   * uygulanmaz — engine'de `newest = -1` ile aynı davranış).
   *
   * Kayıt şemasında (contract §5) yer almaz; eski/yeni kayıttan `undefined`
   * gelirse `-1` sayılır ve ceza ilk alıma kadar uygulanmaz.
   */
  lastBoughtRing?: number
}

/** Boş mücadele durumu — her yeni oyunda ve eski kayıt geçişinde kullanılır. */
export function createChallengeState(): ChallengeState {
  return { completed: [], active: null, entryLog10: null, goalLog10: null, lastBuyAt: 0, lastBoughtRing: -1 }
}

/**
 * Contract §2: mücadele katmanının okuduğu blok sabitleri. Tanımın tek kaynağı
 * `tuning.ts`; buradan yeniden dışa aktarılır ki store/UI tek yerden okusun.
 */
export { BLOCK_MULT, CHALLENGE_FEED_MULT } from './tuning'

/** Mücadele blok boyu (10) — tuning ile tek kaynak. */
export const BLOCK_SIZE_CHALLENGE = BLOCK_SIZE

/**
 * 8 mücadele, kalibrasyondaki sırayla. Sıra anlamlıdır: `nextChallenge`,
 * `unlockLog10` zinciri ve panel listesi buna dayanır.
 */
export const CHALLENGES: readonly ChallengeDef[] = [
  {
    id: 'C1',
    ringIndex: 0,
    unlockLog10: 10,
    goalLog10: 33.242,
    delta: 2,
    growth: 1.22,
    penalty: 'fingersCap',
    reward: 'fingers10',
    penaltyLabel: 'Fingers capped at 10 purchases · price x1.22',
    rewardLabel: 'Full Hand: Fingers x10, feed x1.5'
  },
  {
    id: 'C2',
    ringIndex: 1,
    unlockLog10: 33.242,
    goalLog10: 37.376,
    delta: 2,
    growth: 1.45,
    penalty: 'price145',
    reward: 'all5',
    penaltyLabel: 'Unit price grows x1.45',
    rewardLabel: 'Five Notches: all rings x5'
  },
  {
    id: 'C3',
    ringIndex: 2,
    unlockLog10: 37.376,
    goalLog10: 95.157,
    delta: 2,
    growth: 1.22,
    penalty: 'directOff',
    reward: 'all3',
    penaltyLabel: 'Direct contribution off · price x1.22',
    rewardLabel: 'Step Overflow: all rings x3'
  },
  {
    id: 'C4',
    ringIndex: 3,
    unlockLog10: 95.157,
    goalLog10: 104.688,
    delta: 2,
    growth: 1.22,
    penalty: 'decay',
    reward: 'first3x5',
    penaltyLabel: 'Decay when idle (floor 10%) · price x1.22',
    rewardLabel: 'Long Multiplication: first 3 rings x5'
  },
  {
    id: 'C5',
    ringIndex: 4,
    unlockLog10: 104.688,
    goalLog10: 119.334,
    delta: 2,
    growth: 1.22,
    penalty: 'firstFive',
    reward: 'direct5',
    penaltyLabel: 'Only the first 5 rings open · price x1.22',
    rewardLabel: 'Immediate Result: direct x5, feed x1.5'
  },
  {
    id: 'C6',
    ringIndex: 5,
    unlockLog10: 119.334,
    goalLog10: 122.271,
    delta: 2,
    growth: 1.22,
    penalty: 'feedFifth',
    reward: 'feed15',
    penaltyLabel: 'Chain feeds 5x slower · price x1.22',
    rewardLabel: 'Overclock: feed x1.5'
  },
  {
    id: 'C7',
    ringIndex: 6,
    unlockLog10: 122.271,
    goalLog10: 125.573,
    delta: 2,
    growth: 1.22,
    penalty: 'newestOnly',
    reward: 'all4',
    penaltyLabel: 'Only the newest ring at full rate · price x1.22',
    rewardLabel: 'Parallel Set: all rings x4'
  },
  {
    id: 'C8',
    ringIndex: 7,
    unlockLog10: 125.573,
    goalLog10: 128.967,
    delta: 2,
    growth: 1.35,
    penalty: 'price135feedHalf',
    reward: 'finisher',
    penaltyLabel: 'Price x1.35, feed halved',
    rewardLabel: 'Theorem: production x2'
  }
] as const

/** Kimliğe göre tanım; bilinmeyen kimlik `null` döner (kayıt temizliği). */
export function challengeById(id: string | null): ChallengeDef | null {
  if (!id) return null
  return CHALLENGES.find((def) => def.id === id) ?? null
}

/** Aktif mücadelenin tanımı; yoksa `null`. */
export function activeChallenge(state: { challenges: ChallengeState }): ChallengeDef | null {
  return challengeById(state.challenges.active)
}

/** Mücadele bu koşuda açıldı mı? (sayı eşiği + tamamlanmamış) */
export function isChallengeUnlocked(
  state: { number: Decimal; challenges: ChallengeState },
  def: ChallengeDef
): boolean {
  if (state.challenges.completed.includes(def.id)) return false
  const log = state.number.log10().toNumber()
  return Number.isFinite(log) && log >= def.unlockLog10
}

/**
 * Girişte kilitlenen hedef: plan hedefi ya da giriş + delta, hangisi yüksekse.
 * "Hedefe yaklaş, sonra gir" istismarını kapatır (contract §1).
 */
export function challengeGoalLog(def: ChallengeDef, entryLog10: number): number {
  const safeEntry = Number.isFinite(entryLog10) ? entryLog10 : 0
  return Math.max(def.goalLog10, safeEntry + def.delta)
}

/**
 * Mücadeleye gir. Sayı, halkalar, B ve önceki ödüller AYNEN kalır.
 * @returns gerçekten girildiyse `true`
 */
export function enterChallenge(state: NumberState, id: string): boolean {
  const def = challengeById(id)
  if (!def) return false
  if (state.challenges.active !== null) return false
  if (state.challenges.completed.includes(id)) return false
  if (!isChallengeUnlocked(state, def)) return false
  const entry = state.number.log10().toNumber()
  state.challenges.active = id
  state.challenges.entryLog10 = Number.isFinite(entry) ? entry : 0
  state.challenges.goalLog10 = challengeGoalLog(def, state.challenges.entryLog10)
  state.challenges.lastBuyAt = state.playTime ?? 0
  return true
}

/** Mücadeleden çık: ceza kalkar, ilerleme korunur, hedef iptal olur. */
export function exitChallenge(state: NumberState): void {
  state.challenges.active = null
  state.challenges.entryLog10 = null
  state.challenges.goalLog10 = null
}

/**
 * Aktif mücadele hedefe ulaştıysa tamamla. Ödül, `completed` listesine yazılır;
 * ekonomi bu listeyi okuyarak kalıcı çarpanları uygular.
 * @returns tamamlanan tanım; yoksa `null`
 */
export function completeChallengeIfReady(state: NumberState): ChallengeDef | null {
  const def = activeChallenge(state)
  if (!def) return null
  const goal = state.challenges.goalLog10
  if (goal === null || !Number.isFinite(goal)) return null
  const log = state.number.log10().toNumber()
  if (!Number.isFinite(log) || log < goal) return null
  if (!state.challenges.completed.includes(def.id)) state.challenges.completed.push(def.id)
  exitChallenge(state)
  return def
}

/** Aktif mücadele ilerlemesi 0–100 (giriş → hedef); aktif yoksa 0. */
export function challengeProgress(state: NumberState): number {
  const entry = state.challenges.entryLog10
  const goal = state.challenges.goalLog10
  if (entry === null || goal === null || !Number.isFinite(entry) || !Number.isFinite(goal)) return 0
  if (goal <= entry) return 100
  const log = state.number.log10().toNumber()
  if (!Number.isFinite(log)) return 0
  const raw = ((log - entry) / (goal - entry)) * 100
  return Math.min(100, Math.max(0, raw))
}

/** Sıradaki (tamamlanmamış) mücadele; hepsi bittiyse `null`. */
export function nextChallenge(state: { challenges: ChallengeState }): ChallengeDef | null {
  return CHALLENGES.find((def) => !state.challenges.completed.includes(def.id)) ?? null
}
