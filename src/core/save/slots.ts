/**
 * Slot anahtar cozumleme ve ham slot okuma/yazma yardimcilari.
 * Saf localStorage islemleri buradadir; surum ve migrate karari save.ts icindedir.
 */
// Anahtar adları eski temalardan (Doomscroll, Quantum Horizon) kalmadır ve BİLİNÇLİ olarak
// korunur: yeniden adlandırmak mevcut oyuncu kayıtlarını sahipsiz bırakır. Değiştirmeyin.
export const SAVE_KEY_PREFIX = 'DOOMSCROLL_SAVE_SLOT_'
export const LEGACY_MAIN_KEY = 'DOOMSCROLL_SAVE_V1'
export const LEGACY_OLD_KEY = 'QUANTUM_HORIZON_SAVE_V1'
export const BACKUP_KEY = 'DOOMSCROLL_SAVE_V1_BAK'
export const ACTIVE_SLOT_KEY = 'DOOMSCROLL_ACTIVE_SLOT'

/**
 * ADR-0029: bozuk kayıt, autosave (~10 sn) tarafından üstüne yazılmadan ÖNCE
 * ayrı bir karantina anahtarına kopyalanır. Aksi halde tek örnek kayıp olurdu.
 */
export const QUARANTINE_SUFFIX = '_CORRUPT'

export function resolveSlotKey(slot: number): string {
  // Slot 1 eski DOOMSCROLL_SAVE_V1 anahtarıyla %100 uyumludur
  return slot === 1 ? LEGACY_MAIN_KEY : `${SAVE_KEY_PREFIX}${slot}`
}

/** Slot başına yedek anahtarı. Slot 1 geriye dönük uyum için eski adı korur. */
export function resolveBackupKey(slot: number): string {
  return slot === 1 ? BACKUP_KEY : `${SAVE_KEY_PREFIX}${slot}_BAK`
}

/** Bozuk ham veriyi ayrı anahtara taşır; asıl slot olduğu gibi bırakılır. */
export function quarantineRaw(slot: number, raw: string): boolean {
  try {
    localStorage.setItem(resolveSlotKey(slot) + QUARANTINE_SUFFIX, raw)
    return true
  } catch {
    return false
  }
}

/** Karantinaya alınmış bozuk kaydın var olup olmadığı (kurtarma teklifi için). */

export function clearSingleSlot(slot: number): void {
  try {
    localStorage.removeItem(resolveSlotKey(slot))
    localStorage.removeItem(resolveBackupKey(slot))
    localStorage.removeItem(resolveSlotKey(slot) + QUARANTINE_SUFFIX)
    if (slot === 1) {
      localStorage.removeItem(LEGACY_OLD_KEY)
    }
  } catch {
    // Temizlik yolunda sessiz geç
  }
}

/** Ayrıştırılmış kaydın şekil sınırlarını denetler (şişirilmiş/bozuk veri koruması). */
