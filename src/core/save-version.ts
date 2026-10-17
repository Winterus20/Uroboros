/**
 * Kayıt şeması sürümü — TEK kaynak (ADR-0029).
 *
 * Neden ayrı bir dosya: `src/stores/game.ts`, `src/core/save.ts`'yi import ediyor.
 * Sürüm sabiti core katmanında da gerekiyor (yükleme sırasında "daha yeni sürüm"
 * tespiti). game.ts'ten import edersek döngüsel bağımlılık oluşur.
 *
 * Yeni bir kayıt alanı eklendiğinde:
 *   1. Buradaki sayıyı BUMP et.
 *   2. game.ts içindeki deserialize() fonksiyonuna sıralı
 *      "if (saveVersion < N) { ... }" göç kancası ekle.
 *   3. types.ts içindeki SerializedPlayerState'e alanı opsiyonel olarak ekle.
 *
 * v16 — Global Wipe / Temiz Sıfırlama: Kullanıcı talebiyle tüm eski kayıtlar
 * sıfırlandı. Asgari desteklenen sürüm 16'ya çekildi; v15 ve öncesi tüm kayıtlar
 * temizlenerek sıfırdan başlatılır.
 *
 * v17 — Ölçek Sıçrama Motoru (ADR-0052): shift/galaxy/singularity tek motor +
 * katman kayıt defteri; ölü `singularityHoldActive` kaldırıldı, `jumpLog` eklendi.
 * Geriye dönük uyumluluk YOK: v16 ve öncesi kayıtlar açılmaz, sıfırdan başlanır.
 *
 * v18 — Zaman Yayı (Time Clock): yalnızca KALICI sayaçlar kaydedilir
 * (`timeClock.drag/totalRewoundSeconds/releases/bestTension`). Canlı faz uçucudur;
 * yüklemede saat her zaman `idle`'a döner (floatingAnomalies muamelesi).
 * v17 kayıtları aynen açılır (asgari sürüm 17'de kalır) — alan yoksa nötr varsayılan.
 */
export const SAVE_VERSION = 18

/**
 * Asgari desteklenen kayıt sürümü.
 * Bunun altındaki kayıtlar otomatik olarak sıfırlanır (Global Reset / Wipe).
 */
export const MIN_SUPPORTED_SAVE_VERSION = 17

/**
 * Daha yeni bir build'in kaydı — eski build'de açılmamalı.
 *
 * Aksi halde yeni build'in eklediği alanlar sessizce düşer ve kayıt geriye
 * doğru yeniden damgalanır; oyuncu ilerlemesini sessizce kaybeder.
 */
export class SaveVersionError extends Error {
  constructor(
    public readonly foundVersion: number,
    public readonly supportedVersion: number
  ) {
    super(
      `Kayıt sürümü ${foundVersion}, bu build yalnızca ${supportedVersion} sürümünü destekliyor.`
    )
    this.name = 'SaveVersionError'
  }
}

/** Bir kayıt nesnesinin beyan ettiği sürümü güvenle okur (yoksa 1). */
export function readSaveVersion(data: unknown): number {
  if (data && typeof data === 'object') {
    const v = (data as { version?: unknown }).version
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return 1
}

/** Kayıt, bu build'den daha yeni mi? */
export function isFutureSave(data: unknown): boolean {
  return readSaveVersion(data) > SAVE_VERSION
}

/** Kayıt, desteklenen asgari sürümden daha eski mi (sıfırlanmalı mı)? */
export function isDeprecatedSave(data: unknown): boolean {
  return readSaveVersion(data) < MIN_SUPPORTED_SAVE_VERSION
}
