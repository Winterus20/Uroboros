import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase-config'
import { SaveSystem } from '../save'
import type { AuthUser, CloudSavePayload, CloudSaveMeta } from '../../models/auth-types'
import type { SerializedPlayerState } from '../../models/types'
import {
  cloudRevision,
  decideSyncAction,
  evaluateWriteGuard,
  isCloudSavePayload,
  type SyncDecision
} from './cloud-conflict'

const MOCK_CLOUD_STORAGE_PREFIX = 'DOOMSCROLL_MOCK_CLOUD_SAVE_'

/**
 * Bu cihazın "en son gördüğü bulut belgesi" etiketi, slot başına saklanır.
 * ADR-0033: kararların çoğu ARTIK istemci saatine değil bu referansa bakar.
 */
const LAST_SEEN_REV_PREFIX = 'DOOMSCROLL_CLOUD_REV_SLOT_'

const CLOUD_TIMEOUT_MS = 8000

export interface CloudSyncPlan {
  decision: SyncDecision
  slot: number
  localMeta: CloudSaveMeta
  cloudPayload: CloudSavePayload | null
}

/** Kullanıcıya "geçici hata, tekrar dene" diyebilmek için ayrı hata sınıfı. */
export class CloudTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Bulut isteği ${timeoutMs} ms içinde tamamlanamadı.`)
    this.name = 'CloudTimeoutError'
  }
}

function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Bilinmeyen Cihaz'
  const ua = navigator.userAgent
  // iPad kontrolü ÖNCE gelmeli: iPad'ler "Mobile Safari" bildirdiği için
  // /mobile/ testi onları yanlışlıkla "Mobil Cihaz" diye etiketliyordu.
  if (/iPad|tablet/i.test(ua)) return 'Tablet'
  if (/mobile|android|iphone/i.test(ua)) return 'Mobil Cihaz'
  if (/Mac/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Linux/i.test(ua)) return 'Linux PC'
  return 'Web Tarayıcı'
}

function extractMeta(state: SerializedPlayerState, slot: number): CloudSaveMeta {
  return {
    matter: typeof state.matter === 'string' ? state.matter : '10',
    singularities: typeof state.singularities === 'number' ? state.singularities : state.stats?.singularityCount || 0,
    playtime: state.stats?.totalPlaytime || 0,
    version: typeof state.version === 'number' ? state.version : 1,
    activeSlot: slot,
    clientTimestamp: state.lastUpdate || Date.now(),
    deviceName: getDeviceName()
  }
}

/**
 * `withTimeout` yalnızca yarışı kaybeden tarafı reddeder; asıl işi (Firestore
 * transaction'ı) iptal edemez. Bu yüzden zaman aşımı AYRI bir hata sınıfıyla
 * bildirilir: çağıran taraf bunu "geçici hata, tekrar dene" diye sunabilir,
 * "yazılamadı, kayıt bozuldu" diye değil.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = CLOUD_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CloudTimeoutError(timeoutMs)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => {
    // Ölü zamanlayıcı bırakmıyoruz: her istekten sonra 8 saniyelik timer kalmasın.
    if (timer !== undefined) clearTimeout(timer)
  })
}

/**
 * ADR-0033: her bulut yazımına garanti EDİLEBİLİR benzersiz bir revizyon
 * verilir. `clientTimestamp` yalnızca EŞİTLİK karşılaştırmasında kullanıldığı
 * için burada saat kayması bir veri kaybına yol açmaz; ama iki yazımın aynı
 * milisaniyeye düşmesi referans karşılaştırmasını bozabileceğinden
 * `lastIssuedRevision` ile monotonik hale getirilir.
 */
let lastIssuedRevision = 0
function issueRevision(stateTimestamp: number): number {
  const candidate = Math.max(stateTimestamp, Date.now())
  lastIssuedRevision = Math.max(lastIssuedRevision + 1, candidate)
  return lastIssuedRevision
}

/**
 * ADR-0029: buluttaki kayıt, yerel kayıttan YENİ ise reddedilir.
 *
 * Neden: periyodik senkron ve çıkış anı yazımları çakışma kontrolünden geçmeden
 * yazıyordu. Artık yazma kendi kendini koruyor.
 *
 * ADR-0033: "daha yeni" karşılaştırması artık istemci saatlerini değil, bu
 * cihazın en son gördüğü bulut revizyonunu referans alır.
 */
export class CloudWriteConflictError extends Error {
  constructor(
    public readonly cloudRevision: number,
    public readonly localRevision: number
  ) {
    super(
      `Buluttaki kayıt değişmiş (bulut: ${cloudRevision}, yerel: ${localRevision}). Yazma iptal edildi.`
    )
    this.name = 'CloudWriteConflictError'
  }
}

function readLocalRevision(slot: number): number | null {
  try {
    const raw = localStorage.getItem(`${LAST_SEEN_REV_PREFIX}${slot}`)
    if (!raw) return null
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeLocalRevision(slot: number, revision: number): void {
  try {
    localStorage.setItem(`${LAST_SEEN_REV_PREFIX}${slot}`, String(revision))
  } catch (err) {
    console.warn('Bulut revizyon referansı saklanamadı:', err)
  }
}

function mockKey(uid: string, slot: number): string {
  return `${MOCK_CLOUD_STORAGE_PREFIX}${uid}_slot_${slot}`
}

export const CloudSaveService = {
  getRevisionKey(slot: number): string {
    return `${LAST_SEEN_REV_PREFIX}${slot}`
  },

  getLocalRevision(slot: number): number {
    return readLocalRevision(slot) ?? 0
  },

  bumpLocalRevision(slot: number): number {
    const nextRevision = (readLocalRevision(slot) ?? 0) + 1
    writeLocalRevision(slot, nextRevision)
    return nextRevision
  },

  /** Bu cihazın en son gördüğü bulut revizyonu (yoksa null). */
  readLastSeenRevision(targetSlot?: number): number | null {
    return readLocalRevision(targetSlot ?? SaveSystem.getActiveSlot())
  },

  /** Okunan/yazılan bir belgeyi "bizim bildiğimiz kayıt" olarak işaretle. */
  adoptCloudRevision(targetSlot: number | undefined, payload: CloudSavePayload): void {
    writeLocalRevision(targetSlot ?? SaveSystem.getActiveSlot(), cloudRevision(payload))
  },

  /**
   * Hard Reset için: referansları unut. Böylece sıfırlama sonrası buluttaki
   * eski kayıt "çakışma" üretmez; oyuncunun sıfırlama kararı geçerli sayılır.
   */
  forgetAllLocalRevisions(): void {
    try {
      ;[1, 2, 3].forEach((slot) => localStorage.removeItem(`${LAST_SEEN_REV_PREFIX}${slot}`))
    } catch (err) {
      console.warn('Bulut revizyon referansları temizlenemedi:', err)
    }
  },

  /** Mock (simülasyon) bulut kayıtlarını sil — gerçek Firestore silinemez (kurallar). */
  forgetMockCloud(uid: string): void {
    try {
      ;[1, 2, 3].forEach((slot) => localStorage.removeItem(mockKey(uid, slot)))
    } catch (err) {
      console.warn('Simülasyon bulut kaydı temizlenemedi:', err)
    }
  },

  /**
   * Ne yapılacağına karar ver (saf mantık `decideSyncAction`'da, burada yalnızca
   * veri toplanır). Arka plan senkronu ve giriş akışı bu planı tüketir.
   */
  async planSync(
    user: AuthUser,
    localState: SerializedPlayerState,
    targetSlot?: number
  ): Promise<CloudSyncPlan> {
    const slot = targetSlot ?? SaveSystem.getActiveSlot()
    const localMeta = extractMeta(localState, slot)
    const cloudPayload = await this.fetchFromCloud(user, slot)
    return {
      decision: decideSyncAction({
        cloudPayload,
        localMeta,
        baseline: readLocalRevision(slot)
      }),
      slot,
      localMeta,
      cloudPayload
    }
  },

  /**
   * @param options.force Oyuncu bilinçli olarak üzerine yazmak istediğinde
   *   (Buluta Yedekle butonu, çakışmada "bunu sakla") yaş koruması atlanır.
   *   Bu bayrak ADR-0033'te fiilen kullanılmaya başlandı; daha önce tüm çağrı
   *   noktaları sessizce `false` geçiyordu.
   */
  async saveToCloud(
    user: AuthUser,
    state: SerializedPlayerState,
    targetSlot?: number,
    options?: { force?: boolean }
  ): Promise<CloudSavePayload> {
    const slot = targetSlot ?? SaveSystem.getActiveSlot()
    const compressedData = SaveSystem.exportSave(state)
    const meta = extractMeta(state, slot)
    meta.clientTimestamp = issueRevision(meta.clientTimestamp)

    const payload: CloudSavePayload = {
      compressedData,
      meta,
      updatedAt: Date.now()
    }

    const baseline = readLocalRevision(slot)
    const force = options?.force === true

    const guard = (cloudMeta: CloudSaveMeta | null): void => {
      if (evaluateWriteGuard({ baseline, cloudMeta, localMeta: meta, force }) === 'conflict') {
        throw new CloudWriteConflictError(cloudMeta?.clientTimestamp ?? 0, meta.clientTimestamp)
      }
    }

    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'users', user.uid, 'cloud_saves', `slot_${slot}`)
      await withTimeout(
        runTransaction(db, async (tx) => {
          const snap = await tx.get(docRef)
          const existing = snap.exists() && isCloudSavePayload(snap.data()) ? snap.data() : null
          guard(existing?.meta ?? null)
          tx.set(docRef, { ...payload, updatedAt: serverTimestamp() })
        }),
        CLOUD_TIMEOUT_MS
      )
    } else {
      // Mock bulut depolama — aynı yaş koruması, yerel depoda da uygulanır.
      await new Promise((r) => setTimeout(r, 350))
      const key = mockKey(user.uid, slot)
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const existing = JSON.parse(raw) as CloudSavePayload
          if (isCloudSavePayload(existing)) guard(existing.meta)
        } catch (e) {
          if (e instanceof CloudWriteConflictError) throw e
          // Bozuk mock veri: üzerine yazmaya devam et.
        }
      }
      localStorage.setItem(key, JSON.stringify(payload))
    }

    // Yazma başarılı: bu belge artık "bizim bildiğimiz kayıt".
    writeLocalRevision(slot, meta.clientTimestamp)
    return payload
  },

  async fetchFromCloud(user: AuthUser, targetSlot?: number): Promise<CloudSavePayload | null> {
    const slot = targetSlot ?? SaveSystem.getActiveSlot()

    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'users', user.uid, 'cloud_saves', `slot_${slot}`)
      const snap = await withTimeout(getDoc(docRef), CLOUD_TIMEOUT_MS)
      if (!snap.exists()) return null
      const data: unknown = snap.data()
      // Eski build'lerden kalan, beklenen şekilde olmayan belgeler sessizce
      // "bulut boş" sayılmasın diye doğrulanır (crash yerine null üretir).
      return isCloudSavePayload(data) ? data : null
    }

    await new Promise((r) => setTimeout(r, 250))
    const raw = localStorage.getItem(mockKey(user.uid, slot))
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return isCloudSavePayload(parsed) ? parsed : null
    } catch {
      return null
    }
  }
}
