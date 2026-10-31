import type { Decimal } from '../../core/math'
import type { NumberState } from './economy'
import { BLOCK_SIZE } from './tuning'
import { resetRun } from './run'

/**
 * 8 MÜCADELE — ADR-0086 SIFIRLAMALI KOŞULAR.
 *
 * Bağlayıcı kaynak: brain/decisions/0086-run-reset-and-boost.md.
 *
 * Mücadeleye girmek AD tarzı bir koşu başlatır: sayı 10'a, zincir sıfıra,
 * kilitler yalnız Fingers'a döner (`resetRun`). Boost sayısı, bestNumber,
 * tamamlanmış mücadeleler ve ödülleri korunur. Hedefler MUTLAKTIR (plan hedefi);
 * girişteki sayı hedefi kaydırmaz. Sıra zorunludur: yalnız `nextChallenge`
 * girilebilir. Tamamlama koşunun sayısını/halkalarını korur; çıkış da öyle.
 *
 * Bu dosya saf: Vue yok, Pinia yok, store yazmaz. Ekonomi (`economy.ts`) aynı
 * tipleri ve sabitleri okur; ilişki tek yönlüdür (economy → challenges, ortak
 * sıfırlama için ikisi de `run.ts` → `resetRun`).
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
  /** Mutlak plan hedefi (log10). Girişteki sayı bu hedefi kaydırmaz. */
  readonly goalLog10: number
  /**
   * @deprecated ADR-0086: hedefler mutlaktır. Alan eski tüketicilerin tip
   * uyumu için durur; hiçbir hesaplamaya girmez.
   */
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
    goalLog10: 10.5,
    delta: 2,
    growth: 1.22,
    penalty: 'fingersCap',
    reward: 'fingers10',
    penaltyLabel: 'Fingers capped at 10 purchases · feed x0.2 · price x1.22',
    rewardLabel: 'Full Hand: Fingers x10, feed x1.5'
  },
  {
    id: 'C2',
    ringIndex: 1,
    unlockLog10: 10.5,
    goalLog10: 20.1,
    delta: 2,
    growth: 1.22,
    penalty: 'price145',
    reward: 'all5',
    penaltyLabel: 'Unit price grows x1.22',
    rewardLabel: 'Five Notches: all rings x5'
  },
  {
    id: 'C3',
    ringIndex: 2,
    unlockLog10: 20.1,
    goalLog10: 29.8,
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
    unlockLog10: 29.8,
    goalLog10: 39.4,
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
    unlockLog10: 39.4,
    goalLog10: 49.1,
    delta: 2,
    growth: 1.22,
    penalty: 'firstFive',
    reward: 'direct5',
    penaltyLabel: 'Rings 6-8 cannot be purchased · feed x0.2 · price x1.22',
    rewardLabel: 'Immediate Result: direct x5, feed x1.5'
  },
  {
    id: 'C6',
    ringIndex: 5,
    unlockLog10: 49.1,
    goalLog10: 58.7,
    delta: 2,
    growth: 1.22,
    penalty: 'feedFifth',
    reward: 'feed15',
    penaltyLabel: 'Chain feeds 25x slower (x0.2 global, /5) · price x1.22',
    rewardLabel: 'Overclock: feed x1.5'
  },
  {
    id: 'C7',
    ringIndex: 6,
    unlockLog10: 58.7,
    goalLog10: 68.4,
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
    unlockLog10: 68.4,
    goalLog10: 78,
    delta: 2,
    growth: 1.22,
    penalty: 'price135feedHalf',
    reward: 'finisher',
    penaltyLabel: 'Price x1.22 · feed 10x slower (x0.2 global, /2)',
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

/**
 * Mücadele açıldı mı? Eşik `bestNumber`a (hayat boyu zirve) bakar.
 *
 * Current number kullanılsaydı, bir mücadeleden 10 ile çıkan oyuncu kendi
 * açtığı mücadeleye bir daha giremezdi (soft-lock). ADR-0086 §6.
 */
export function isChallengeUnlocked(
  state: { bestNumber: Decimal; challenges: ChallengeState },
  def: ChallengeDef
): boolean {
  if (state.challenges.completed.includes(def.id)) return false
  const log = state.bestNumber.log10().toNumber()
  return Number.isFinite(log) && log >= def.unlockLog10
}

/**
 * Mücadele hedefi MUTLAKTIR (ADR-0086 §5): her zaman tanımın plan hedefi.
 * İkinci argüman eski göreli hedef çağrılarıyla tip uyumu için durur ve yok sayılır.
 */
export function challengeGoalLog(def: ChallengeDef, _entryLog10?: number): number {
  return def.goalLog10
}

/**
 * Mücadeleye gir: koşuyu sıfırla, örtüyü kur.
 *
 * - Sıra zorunlu: yalnız `nextChallenge` (ilk tamamlanmamış) girilebilir.
 * - Kilit kontrolü bestNumber ile yapılır; current number resetten sonra 10 olur.
 * - Boost sayısı, bestNumber, tamamlanmış ödüller ve sayaçlar korunur.
 * - Hedef mutlak plan hedefidir; giriş sayısı hedefi kaydırmaz.
 *
 * @returns gerçekten girildiyse `true`
 */
export function enterChallenge(state: NumberState, id: string): boolean {
  const def = challengeById(id)
  if (!def) return false
  if (state.challenges.active !== null) return false
  if (state.challenges.completed.includes(id)) return false
  if (nextChallenge(state)?.id !== id) return false
  if (!isChallengeUnlocked(state, def)) return false
  resetRun(state)
  const entry = state.number.log10().toNumber()
  state.challenges.active = id
  state.challenges.entryLog10 = Number.isFinite(entry) ? entry : 1
  state.challenges.goalLog10 = def.goalLog10
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