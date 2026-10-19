import { Decimal } from '../math'
import type { CloudSaveMeta, CloudSavePayload } from '../../models/auth-types'

/**
 * Bulut kaydetme sisteminin SAF karar katmanı (ADR-0070).
 *
 * Buradaki hiçbir fonksiyon Firebase, localStorage veya DOM bilmez; girdi alır,
 * karar döndürür. "Neyi yazacağız / çakışma mı var" sorusunun tamamı burada
 * yaşar ve vitest ile doğrudan test edilir.
 *
 * Neden ayrı dosya? `vitest.config.ts` bilinçli olarak `environment: 'node'`
 * ve DOM shimsiz çalışır; `cloud-save-service.ts` ise Firebase SDK'sını import
 * eder. Kararları ayırmak testleri hem hızlı hem de gerçekçi kılar.
 */

/** Firestore Timestamp, düz sayı veya bilinmeyen bir değeri güvenle epoch-ms'ye çevirir. */
export function toMillis(
  value: number | { toMillis?: () => number } | null | undefined
): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value && typeof value.toMillis === 'function') {
    const ms = (value as { toMillis: () => number }).toMillis()
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

/** "10e999" ve "1e1000" aynı Decimal'dir — dize karşılaştırması yanlış çakışma üretir. */
export function decimalsEqual(a: string, b: string): boolean {
  try {
    return new Decimal(a).eq(new Decimal(b))
  } catch {
    return a === b
  }
}

/**
 * Bir bulut belgesinin "revizyon" etiketi.
 *
 * Bilinçli olarak `meta.clientTimestamp` seçildi (sunucu saati DEĞİL): bu değer
 * karşılaştırmada SIRAYA göre değil EŞİTLİK için kullanılır — "bu hâlâ benim
 * gördüğüm belge mi?" — dolayısıyla yanlış saatli bir cihazın bu kontrolü
 * bozması mümkün değildir. Saat karşılaştırması artık yalnızca referansı
 * hiç olmayan son çare yolda (bkz. `evaluateWriteGuard`).
 */
export function cloudRevision(payload: Pick<CloudSavePayload, 'meta'>): number {
  return payload.meta.clientTimestamp
}

/**
 * Yerel ve bulut kaydı "aynı kayıt" mı?
 *
 * Yalnızca referans (baseline) hiç yokken kullanılır: cihaz ilk kez görüşüyor
 * demektir ve içerik karşılaştırması ADR-0029'un "boş yerel kayıt iyi bulut
 * kaydını eziyordu" korumasının devamıdır.
 */
export function isSameSave(localMeta: CloudSaveMeta, cloudMeta: CloudSaveMeta): boolean {
  const timeDiff = Math.abs(localMeta.clientTimestamp - cloudMeta.clientTimestamp)
  const sameMatter = decimalsEqual(localMeta.matter, cloudMeta.matter)
  const samePlaytime = Math.abs(localMeta.playtime - cloudMeta.playtime) < 2
  const sameVersion = localMeta.version === cloudMeta.version
  const sameSingularities = localMeta.singularities === cloudMeta.singularities

  // 15 sn zaman penceresi TEK başına ayırt edici değildir; tüm sinyaller
  // tutarlı olmalıdır.
  return sameMatter && samePlaytime && sameVersion && sameSingularities && timeDiff < 15000
}

export interface WriteGuardInput {
  /** Bu cihazın en son gördüğü bulut revizyonu (yoksa null). */
  baseline: number | null
  /** Bulutta okunan belgenin meta'sı (yoksa null). */
  cloudMeta: CloudSaveMeta | null
  localMeta: CloudSaveMeta
  /** Oyuncu bilinçli olarak üzerine yazmak istiyor mu? */
  force: boolean
}

/**
 * Buluta yazılabilir mi, yoksa çakışma mı var?
 *
 * ADR-0070'in düzeltmesi: karar artık istemci saatlerini KARŞILAŞTIRMAZ.
 * Referansımız varsa soru "bulut hâlâ benim bildiğim belge mi?" olur; değilse
 * başka bir cihaz yazmış demektir ve yazmadan önce oyuncuya sorulur. Bu, yanlış
 * saatli bir cihazın ya hep kazanmasına ya da hiç yazamamasına yol açan veri
 * ezme riskini kökten keser.
 */
export function evaluateWriteGuard(input: WriteGuardInput): 'allow' | 'conflict' {
  if (input.force) return 'allow'
  if (!input.cloudMeta) return 'allow'
  if (input.baseline !== null) {
    return input.cloudMeta.clientTimestamp === input.baseline ? 'allow' : 'conflict'
  }
  // Referans yok: eski, istemci-saati tabanlı son çare koruması.
  return input.cloudMeta.clientTimestamp > input.localMeta.clientTimestamp ? 'conflict' : 'allow'
}

export type SyncDecision = 'first-backup' | 'push' | 'in-sync' | 'conflict'

export interface SyncDecisionInput {
  cloudPayload: CloudSavePayload | null
  localMeta: CloudSaveMeta
  baseline: number | null
}

/**
 * Arka plan senkronunda ne yapmalıyız?
 *
 * ADR-0029'daki hatanın düzeltmesi: çakışma, "yerel ile bulut farklı" demek
 * DEĞİLDİR — oyuncu 5 dakika oynayınca ikisi zaten farklıdır ve olması
 * GEREKEN şey budur. Gerçek çakışma şudur: "bulut, benim en son gördüğüm
 * belgeden başka bir belgede mi?" Soru bu haliyle sorulduğunda normal oynanış
 * hiçbir zaman çakışma üretmez.
 */
export function decideSyncAction(input: SyncDecisionInput): SyncDecision {
  if (!input.cloudPayload) return 'first-backup'
  if (input.baseline !== null) {
    return cloudRevision(input.cloudPayload) === input.baseline ? 'push' : 'conflict'
  }
  // Referans yok (ilk temas / eski build): içerik karşılaştırmasına düş.
  return isSameSave(input.localMeta, input.cloudPayload.meta) ? 'in-sync' : 'conflict'
}

/** Buluttan okunan verinin beklenen şekilde olduğunu doğrular (savunma amaçlı). */
export function isCloudSavePayload(value: unknown): value is CloudSavePayload {
  if (!value || typeof value !== 'object') return false
  const doc = value as Partial<CloudSavePayload>
  if (typeof doc.compressedData !== 'string' || doc.compressedData.length < 8) return false
  const meta = doc.meta as CloudSaveMeta | undefined
  if (!meta || typeof meta !== 'object') return false
  return (
    typeof meta.matter === 'string' &&
    meta.matter.length > 0 &&
    typeof meta.singularities === 'number' &&
    typeof meta.playtime === 'number' &&
    typeof meta.version === 'number' &&
    typeof meta.activeSlot === 'number' &&
    typeof meta.clientTimestamp === 'number'
  )
}
