/**
 * Kayıt şeması sürümü — TEK kaynak (ADR-0029).
 *
 * v20 — TEMA PİVOTU (ADR-0077/0079): "Kozmik Oburluk" kütle ekonomisi tamamen
 * silindi; yerine sayı ekonomisi geldi (8 halka, prestij/`Tanım`, mini boost).
 * P5 gereği GERİYE DÖNÜK UYUMLULUK YOK: v19 ve altı kayıtlar açılmaz, oyuncu
 * sıfırdan başlar (temaya da, ekonominin kendisine de yabancı).
 *
 * v21 — GÖSTERİM (ADR-0080): varsayılan notasyon `standard` oldu (K/M/B/T,
 * 10^15 ve üstünde e-notasyonu). ŞEMA DEĞİŞMEDİ; sürüm yalnız v20 kayıtlarının
 * ESKİ varsayılanı ("scientific") bir kez yeni gösterime taşıması için arttı.
 * Asgari sürüm 20'de kaldı → v20 kayıtları açılır, kaybolmaz.
 *
 * v22 — ZİNCİR-ONLY (ADR-0082): mini boost, prestij ve Tanım yükseltmeleri
 * kaldırıldı. Kayıttaki `boostMult`, `boosts`, `tanim`, `prestiges`,
 * `upgrades` ve `gateReached` alanları düştü. Asgari sürüm 20'de kaldı:
 * v20/v21 kayıtları açılır, sayı + zincir korunur, kaldırılan alanlar yok sayılır.
 */
export const SAVE_VERSION = 22

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
