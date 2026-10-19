import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase-config'
import { CloudTimeoutError } from './cloud-save-service'
import type { AuthUser } from '../../models/auth-types'

const MOCK_USER_STORAGE_KEY = 'DOOMSCROLL_MOCK_AUTH_USER'

/**
 * Simülasyon modunda oturum dinleyicileri.
 *
 * ADR-0070: `storage` olayı yalnızca DİĞER sekmelerde tetiklendiği için,
 * aynı sekmede "Google ile Devam Et" denince hiçbir dinleyici uyarılmıyor ve
 * giriş sonrası bulut senkronizasyonu hiç çalışmıyordu. Kendi abonelerimize
 * doğrudan bildiriyoruz.
 */
const mockAuthListeners = new Set<(user: AuthUser | null) => void>()

function notifyMockAuthChanged(): void {
  const user = getStoredMockUser()
  mockAuthListeners.forEach((cb) => cb(user))
}

function mapFirebaseUser(user: User): AuthUser {
  const provider = user.providerData[0]?.providerId
  const providerId: 'google.com' | 'password' | 'anonymous' =
    provider === 'google.com' ? 'google.com' : user.isAnonymous ? 'anonymous' : 'password'

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Uykusuz Oyuncu'),
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
    providerId
  }
}

// Mock Kullanıcı İşlemleri
function getStoredMockUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(MOCK_USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function setStoredMockUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(MOCK_USER_STORAGE_KEY)
    }
  } catch (err) {
    console.error('Mock kullanıcı kaydedilemedi:', err)
    return
  }
  notifyMockAuthChanged()
}

export const AuthService = {
  isConfigured(): boolean {
    return isFirebaseConfigured && auth !== null
  },

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (this.isConfigured() && auth) {
      return firebaseOnAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          callback(mapFirebaseUser(firebaseUser))
        } else {
          callback(null)
        }
      })
    } else {
      // Mock oturum dinleyicisi — aynı sekme + diğer sekmeler
      mockAuthListeners.add(callback)
      callback(getStoredMockUser())
      const handler = (e: StorageEvent) => {
        if (e.key === MOCK_USER_STORAGE_KEY) {
          notifyMockAuthChanged()
        }
      }
      window.addEventListener('storage', handler)
      return () => {
        mockAuthListeners.delete(callback)
        window.removeEventListener('storage', handler)
      }
    }
  },

  async signInWithGoogle(): Promise<AuthUser> {
    if (this.isConfigured() && auth) {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const credential = await signInWithPopup(auth, provider)
      return mapFirebaseUser(credential.user)
    } else {
      // Simülasyon: 400ms gecikme ile gerçekçi kullanıcı oluştur
      await new Promise((r) => setTimeout(r, 450))
      const mockGoogleUser: AuthUser = {
        uid: 'mock_google_' + Date.now().toString(36),
        email: 'gece_kusu@gmail.com',
        displayName: 'Gece Kuşu',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
        isAnonymous: false,
        providerId: 'google.com'
      }
      setStoredMockUser(mockGoogleUser)
      return mockGoogleUser
    }
  },

  async signInWithEmail(email: string, pass: string): Promise<AuthUser> {
    if (!email || !email.includes('@')) {
      throw new Error('Geçerli bir e-posta adresi giriniz.')
    }
    if (!pass || pass.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır.')
    }

    if (this.isConfigured() && auth) {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass)
      return mapFirebaseUser(cred.user)
    } else {
      await new Promise((r) => setTimeout(r, 400))
      const mockUser: AuthUser = {
        uid: 'mock_email_' + Math.abs(email.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)),
        email: email.trim(),
        displayName: email.trim().split('@')[0],
        photoURL: null,
        isAnonymous: false,
        providerId: 'password'
      }
      setStoredMockUser(mockUser)
      return mockUser
    }
  },

  async signUpWithEmail(email: string, pass: string): Promise<AuthUser> {
    if (!email || !email.includes('@')) {
      throw new Error('Geçerli bir e-posta adresi giriniz.')
    }
    if (!pass || pass.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır.')
    }

    if (this.isConfigured() && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass)
      return mapFirebaseUser(cred.user)
    } else {
      await new Promise((r) => setTimeout(r, 450))
      const mockUser: AuthUser = {
        uid: 'mock_email_' + Math.abs(email.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)),
        email: email.trim(),
        displayName: email.trim().split('@')[0],
        photoURL: null,
        isAnonymous: false,
        providerId: 'password'
      }
      setStoredMockUser(mockUser)
      return mockUser
    }
  },

  async sendPasswordReset(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('Geçerli bir e-posta adresi giriniz.')
    }

    if (this.isConfigured() && auth) {
      await sendPasswordResetEmail(auth, email.trim())
    } else {
      await new Promise((r) => setTimeout(r, 350))
      console.info(`[Dev/Mock] ${email} adresine şifre sıfırlama bağlantısı simüle edildi.`)
    }
  },

  async signOut(): Promise<void> {
    if (this.isConfigured() && auth) {
      await firebaseSignOut(auth)
    } else {
      setStoredMockUser(null)
    }
  }
}

/** Tarayıcı çevrimdışı mı? (test ortamında navigator yok). */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function formatAuthError(err: unknown): string {
  if (!err) return 'Bilinmeyen bir hata oluştu.'
  const msg = err instanceof Error ? err.message : String(err)

  // ADR-0070: önce "geçici hata / bağlantı yok" ayrımı. Eski sürümde çevrimdışı
  // bir oyuncuya "Firestore Veritabanı oluşturun" mesajı gösteriliyordu.
  if (err instanceof CloudTimeoutError) {
    return 'Bulut sunucusu zamanında yanıt vermedi. Bağlantı yavaş olabilir; ilerlemeniz bu cihazda güvende ve birazdan otomatik tekrar denenecek.'
  }
  if (isOffline()) {
    return 'İnternet bağlantısı yok. İlerlemeniz bu cihazda güvende; bağlantı geldiğinde bulut yedekleme otomatik devam edecek.'
  }

  if (msg.includes('auth/configuration-not-found')) {
    return 'Firebase Console\'da Authentication henüz başlatılmamış. Lütfen Firebase Console > Authentication bölümünden "Başlayın" (Get Started) butonuna basıp Google ve E-posta yöntemini açın.'
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Google giriş penceresi kapatıldı.'
  }
  if (msg.includes('auth/cancelled-popup-request')) {
    return 'Önceki oturum açma isteği iptal edildi.'
  }
  if (msg.includes('auth/popup-blocked')) {
    return 'Açılır pencere (popup) tarayıcınız tarafından engellendi. Lütfen izin verin.'
  }
  if (msg.includes('auth/unauthorized-domain')) {
    return 'Bu alan adı Firebase Console > Authentication > Settings > Authorized domains listesinde ekli değil.'
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'Bu e-posta adresiyle zaten kayıtlı bir hesap var.'
  }
  if (msg.includes('auth/invalid-email')) {
    return 'Geçersiz bir e-posta adresi girdiniz.'
  }
  if (msg.includes('auth/weak-password')) {
    return 'Şifre çok zayıf. En az 6 karakter olmalıdır.'
  }
  if (msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
    return 'E-posta veya şifre hatalı.'
  }
  if (msg.includes('auth/too-many-requests')) {
    return 'Çok fazla başarısız deneme yapıldı. Lütfen biraz sonra tekrar deneyin.'
  }
  if (msg.includes('auth/network-request-failed')) {
    return 'Ağ bağlantısı hatası. Lütfen internetinizi kontrol edin.'
  }
  if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    // ADR-0028: Test Modu bir güvenlik açığıdır — kuralları KAPATIR ve tüm
    // oyuncu kayıtlarını dünyaya okunur/yazılır kılar. Önceki mesaj kullanıcıya
    // tam da bunu yaptırıyordu. Repodaki firestore.rules deploy edilmeli.
    return 'Firestore Güvenlik Kuralı engeli: veritabanına yazma yetkiniz yok. Test Modu AÇIK OLABİLİR — Firebase Console > Firestore Database > Rules bölümünden Test Modunu KAPATIN ve repodaki firestore.rules dosyasını deploy edin. Test modu açıkken herkesin kayıtları okunabilir.'
  }
  if (msg.includes('not-found') || msg.includes('database/(default) does not exist')) {
    return 'Firestore Veritabanı bulunamadı. Lütfen Firebase Console > Firestore Database bölümünden "Veritabanı oluştur" butonuna basın.'
  }
  if (msg.includes('unavailable') || msg.includes('network-request-failed')) {
    return 'Bulut sunucusuna ulaşılamadı. Bağlantınızı kontrol edin; sorun devam ederse Firebase Console\'da Firestore Database\'in oluşturulmuş ve aktif olduğunu doğrulayın.'
  }
  if (msg.includes('Zaman aşımı')) {
    return 'Bulut sunucusuna ulaşılamadı (Zaman aşımı). Lütfen Firebase Console\'da Firestore Database\'in oluşturulmuş ve aktif olduğundan emin olun.'
  }

  return msg
}

