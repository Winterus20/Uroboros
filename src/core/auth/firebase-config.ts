import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.trim().length > 0 &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId.trim().length > 0
)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)
    // ADR-0070: kalıcı yerel önbellek. Mobilde sekme arka plana atıldığında
    // uçuştaki yazma düşebiliyordu; IndexedDB önbelleği bunu kurtarır.
    // Desteklenmeyen tarayıcıda sessizce varsayılan önbelleğe düşüyoruz —
    // önbellek açılamaması bulut kaydının TAMAMEN devre dışı kalmasına
    // yol açmamalı.
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      })
      console.info('[Firebase] Canlı bulut bağlantısı + kalıcı önbellek başlatıldı.')
    } catch (err) {
      console.warn('[Firebase] Kalıcı önbellek açılamadı, varsayılan önbellek kullanılıyor:', err)
      db = getFirestore(app)
    }
  } catch (err) {
    console.error('[Firebase] Başlatma hatası:', err)
  }
} else {
  console.info('[Firebase] .env anahtarları bulunamadı. Yerel simülasyon (Dev/Mock) modu aktif.')
}

export { app, auth, db }
