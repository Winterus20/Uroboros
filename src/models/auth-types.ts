import type { Timestamp } from 'firebase/firestore'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  isAnonymous: boolean
  providerId: 'google.com' | 'password' | 'anonymous'
}

export interface CloudSaveMeta {
  matter: string
  singularities: number
  playtime: number
  version: number
  activeSlot: number
  clientTimestamp: number
  deviceName?: string
}

export interface CloudSavePayload {
  compressedData: string
  meta: CloudSaveMeta
  /**
   * Belgenin yazıldığı an.
   *
   * İki kaynağı vardır ve bu UNION kasıtlıdır:
   *  - `saveToCloud()` yerelde üretirken düz `Date.now()` sayısı yazar;
   *  - Firestore'a `serverTimestamp()` ile yazıldığı için `fetchFromCloud()`
   *    gerçekte bir `Timestamp` NESNESİ döndürür.
   *
   * ADR-0028 bu farkı belgeleyip düzeltmeyi ertelemişti; ADR-0070 düzeltti.
   * Artık tip dürüst, tüketiciler de `toMillis()` (core/auth/cloud-conflict)
   * ile normalize ediyor. Ham `updatedAt`'ı sayı gibi kullanan kod kalmadı.
   */
  updatedAt: number | Timestamp
}

export interface CloudConflictData {
  localMeta: CloudSaveMeta
  cloudMeta: CloudSaveMeta
  cloudPayload: CloudSavePayload
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'
