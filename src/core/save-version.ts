/**
 * Kayıt şeması sürümü — TEK kaynak (ADR-0029).
 *
 * v20 — TEMA PİVOTU (ADR-0077/0079): "Kozmik Oburluk" kütle ekonomisi tamamen
 * silindi; yerine sayı ekonomisi geldi (8 halka, prestij/`Tanım`, mini boost).
 * P5 gereği GERİYE DÖNÜK UYUMLULUK YOK: v19 ve altı kayıtlar açılmaz, oyuncu
 * sıfırdan başlar (temaya da, ekonominin kendisine de yabancı).
 */
export const SAVE_VERSION = 20

/** Bunun altındaki kayıtlar sıfırlanır (P5: sert temizlik). */
export const MIN_SUPPORTED_SAVE_VERSION = 20

/** Daha yeni bir build'in kaydı — eski build'de açılmamalı. */
export class SaveVersionError extends Error {
  constructor(
    public readonly foundVersion: number,
    public readonly supportedVersion: number
  ) {
    super('Kayıt sürümü ' + foundVersion + ', bu build yalnızca ' + supportedVersion + ' sürümünü destekliyor.')
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
