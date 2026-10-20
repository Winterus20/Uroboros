/**
 * P4b — Sistem açılış ipuçları (öğretim toastu) GÖSTERİM KARARI.
 *
 * Plan §7.3 ("İlk karşılaşmada anlat, sonrasında göster"):
 * Bir sistem oyuncuyla ilk kez karşılaştığında TEK cümle anlatılır; o andan
 * itibaren yüzey saf görsel + sayısal kalır. Bu dal o anlatımın ARAYÜZÜNü
 * (toast) ve oyuncunun kapatabileceği AYARI yapar.
 *
 * Neden ayrı, saf modül:
 * - Karar "bileşen var mı / yok mu" değil, "gösterim kararı ne" — DOM'suz,
 *   mount'suz, Vitest kapsamında test edilebilir olmalı (AGENTS.md:
 *   testler bileşen mount etmeden saf fonksiyon düzeyinde yazılır).
 * - Store (P4a) ve bileşen (P4b) aynı kararı İKİ KEZ yazmaz; tek kaynak burasıdır.
 *
 * Kapsam: P4a'nın `FeatureTeaching` tipiyle yapısal olarak uyumludur; bu modül
 * P4a modülüne BAĞIMLI DEĞİLDİR (import zinciri yok) — iki dal bağımsız
 * geliştirilebilir, sonra tek sözleşmede buluşur.
 */

/**
 * Toast'un gösterilmesi için gereken minimum alan.
 *
 * P4a'nın `FeatureTeaching` tipi (`featureId` + `title` + `body` + `glyph`)
 * bu arayüze yapısal olarak uyar; ikisi de "öğretim kimliği" taşır.
 */
export interface TeachingCandidate {
  readonly featureId: string
}

/**
 * Toast'un ekranda kalacağı süre (ms).
 *
 * "Kullanıcı okumazsa engel olmaz" ilkesi: anlatım bir BİLDİRİMDİR, kapı
 * değildir. 7 sn sonra kendiliğinden kapanır; oyuncu hiçbir şey yapmadan
 * oyun akışı devam eder.
 */
export const TEACHING_TOAST_DURATION_MS = 7000

/**
 * Ayarı okur: "Sistem açılış ipuçları" kapalıysa toast HİÇ gösterilmez.
 *
 * Eski kayıtlarda alan bulunmadığı için `undefined` = AÇIK kabul edilir
 * (kayıt yüklenirken de aynı varsayılan uygulanır).
 */
export function isTeachingEnabled(settings: { teachingsEnabled?: boolean }): boolean {
  return settings.teachingsEnabled !== false
}

/**
 * Gösterim kararı — saf, mount'suz.
 *
 * Gösterilir  ⇔  ayar AÇIK  ∧  bekleyen bir öğretim var.
 * Bekleyen öğretim yoksa (null) ya da ayar kapalıysa gösterilmez.
 */
export function shouldShowTeaching(
  pending: TeachingCandidate | null | undefined,
  enabled: boolean
): boolean {
  if (!enabled) return false
  return pending !== null && pending !== undefined
}
