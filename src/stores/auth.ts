import { defineStore } from 'pinia'
import { AuthService, formatAuthError } from '../core/auth/auth-service'
import { CloudSaveService, CloudWriteConflictError } from '../core/auth/cloud-save-service'
import { toMillis } from '../core/auth/cloud-conflict'
import { SaveSystem } from '../core/save'
import { useGameStore } from './game'
import type { AuthUser, CloudSaveMeta, CloudSavePayload, CloudConflictData, SyncStatus } from '../models/auth-types'

const AUTO_SYNC_KEY = 'DOOMSCROLL_AUTO_CLOUD_SYNC'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    loading: false,
    authActionLoading: false,
    error: null as string | null,
    syncStatus: 'idle' as SyncStatus,
    lastSyncedAt: null as number | null,
    cloudMeta: null as CloudSaveMeta | null,
    autoSyncEnabled: localStorage.getItem(AUTO_SYNC_KEY) !== 'false',
    showAuthModal: false,
    showConflictModal: false,
    conflictData: null as CloudConflictData | null,
    /**
     * Oturum değiştiğinde artar. Uçuşta kalan async işlemler (çıkış
     * sırasında yarım kalan bir Firestore yazımı gibi) sonucu geldikten sonra
     * bu değeri kontrol eder ve GEÇMİŞ bir oturumun state'ini bozmaz.
     */
    sessionEpoch: 0,
    /** Aynı anda tek bulut işlemi. İkinci bir çağrı sessizce reddedilir. */
    syncInFlight: false,
    unsubscribeAuth: null as (() => void) | null
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.user,
    isConfigured: (): boolean => AuthService.isConfigured(),
    isSyncing: (state): boolean => state.syncStatus === 'syncing',
    userDisplayName: (state): string => state.user?.displayName || (state.user?.email ? state.user.email.split('@')[0] : 'Uykusuz Oyuncu'),
    userEmail: (state): string => state.user?.email || '',
    userAvatar: (state): string | null => state.user?.photoURL || null,
    isGoogleUser: (state): boolean => state.user?.providerId === 'google.com'
  },

  actions: {
    init(): void {
      if (this.unsubscribeAuth) return

      // Tek giriş noktası: hem Firebase hem simülasyon modu BUNU çağırır ve
      // giriş sonrası akış daima aynı yoldan yürür.
      this.unsubscribeAuth = AuthService.onAuthStateChanged(async (user) => {
        this.sessionEpoch++
        this.user = user
        this.error = null

        if (user) {
          await this.syncOnLogin(user)
        } else {
          this.clearCloudState()
        }
      })
    },

    /** Çıkış sonrası tüm bulut görünümünü sıfırlar (eskiden yarım kalıyordu). */
    clearCloudState(): void {
      this.cloudMeta = null
      this.lastSyncedAt = null
      this.syncStatus = 'idle'
      this.conflictData = null
      this.showConflictModal = false
    },

    openAuthModal(): void {
      this.showAuthModal = true
      this.error = null
    },

    closeAuthModal(): void {
      this.showAuthModal = false
      this.error = null
    },

    toggleAutoSync(): void {
      this.autoSyncEnabled = !this.autoSyncEnabled
      localStorage.setItem(AUTO_SYNC_KEY, this.autoSyncEnabled ? 'true' : 'false')
    },

    /** Başarı bildirimini kısa süre sonra nötr duruma döndürür. */
    fadeSyncStatus(delayMs: number): void {
      setTimeout(() => {
        if (this.syncStatus === 'success') this.syncStatus = 'idle'
      }, delayMs)
    },

    /**
     * Giriş sonrası ilk temas.
     *
     * ADR-0070: karar `planSync()`'e taşındı. Önceden "yerel ve bulut farklı
     * mı" diye soruluyordu; oyuncu 5 dakika oynayıp sekmeyi kapatıp açtığında
     * bu soru her seferinde "evet" diyor ve oyuncuya sahte çakışma
     * gösteriliyordu. Artık "bulut, benim bildiğim belgeden mi değişmiş?"
     * soruluyor.
     */
    async syncOnLogin(user: AuthUser): Promise<void> {
      const epoch = this.sessionEpoch
      const gameStore = useGameStore()
      const localState = gameStore.serialize()

      try {
        this.syncStatus = 'syncing'
        const plan = await CloudSaveService.planSync(user, localState)
        if (epoch !== this.sessionEpoch) return

        if (plan.decision === 'conflict' && plan.cloudPayload) {
          // DİKKAT: çakışmada revizyon ASLA benimsenmiyor. Benzersen arka plan
          // senkronu "bulut hâlâ benim bildiğim belge" sanıp soru sormadan
          // üzerine yazardı — yani çakışma ekranı bir güvenlik bloğu olmaktan
          // çıkıp dekoratif bir uyarıya dönüşürdü.
          this.openConflict(plan.localMeta, plan.cloudPayload)
          return
        }

        if (plan.cloudPayload) {
          CloudSaveService.adoptCloudRevision(plan.slot, plan.cloudPayload)
          this.cloudMeta = plan.cloudPayload.meta
          this.lastSyncedAt = toMillis(plan.cloudPayload.updatedAt) ?? plan.cloudPayload.meta.clientTimestamp
        }

        if (plan.decision === 'in-sync') {
          // Bulut zaten bu cihazın bildiği kayıt: yazmaya gerek yok.
          this.syncStatus = 'success'
          return
        }

        // 'first-backup' | 'push'
        await this.saveToCloud()
      } catch (err: unknown) {
        console.error('Giriş sonrası senkronizasyon hatası:', err)
        if (epoch === this.sessionEpoch) {
          this.error = formatAuthError(err)
          this.syncStatus = 'error'
        }
      }
    },

    signInWithGoogle(): Promise<boolean> {
      return this.runAuthAction((service) => service.signInWithGoogle())
    },

    signInWithEmail(email: string, pass: string): Promise<boolean> {
      return this.runAuthAction((service) => service.signInWithEmail(email, pass))
    },

    signUpWithEmail(email: string, pass: string): Promise<boolean> {
      return this.runAuthAction((service) => service.signUpWithEmail(email, pass))
    },

    sendPasswordReset(email: string): Promise<boolean> {
      return this.runAuthAction((service) => service.sendPasswordReset(email))
    },

    /**
     * Giriş eylemlerinin ortak iskeleti.
     *
     * Senkronizasyon BİLEREK burada yapılmıyor: onAuthStateChanged dinleyicisi
     * hem Firebase hem simülasyon modunda aynı işi yapar. Simülasyon modunda
     * storage olayı yalnızca DİĞER sekmelerde tetiklendiği için, eskiden
     * "Google ile Devam Et" dedikten sonra hiçbir şey buluta yazılmıyordu.
     */
    async runAuthAction(
      action: (service: typeof AuthService) => Promise<AuthUser | void>
    ): Promise<boolean> {
      this.authActionLoading = true
      this.error = null
      try {
        const user = await action(AuthService)
        if (user) this.user = user
        return true
      } catch (err: unknown) {
        this.error = formatAuthError(err)
        return false
      } finally {
        this.authActionLoading = false
      }
    },

    async signOut(): Promise<void> {
      // Çıkmadan önce son ilerlemeyi yazmayı dene; ağ yoksa sessizce geçilir.
      if (this.isAuthenticated && this.autoSyncEnabled && !this.syncInFlight) {
        try {
          await this.saveToCloud()
        } catch {
          /* çıkış engellenmemeli */
        }
      }
      this.authActionLoading = true
      this.error = null
      try {
        // Uçuşta kalan işlemlerin bu oturumu kalıcı olarak bozmasını engelle.
        this.sessionEpoch++
        await AuthService.signOut()
        this.user = null
        this.clearCloudState()
      } catch (err: unknown) {
        this.error = formatAuthError(err)
      } finally {
        this.authActionLoading = false
      }
    },

    /**
     * Buluta yazar.
     *
     * @param force Oyuncu bilinçli olarak üzerine yazmak istediğinde
     *   (Buluta Yedekle butonu, çakışmada "Bu Cihazdakini Sakla") yaş koruması
     *   atlanır. ADR-0070: bu bayrağın daha önce HİÇBİR çağrı noktasında
     *   kullanılmaması, çakışma ekranındaki "sakla" butonunu sessiz bir
     *   no-op yapıyordu.
     */
    async saveToCloud(force = false): Promise<boolean> {
      if (!this.user) {
        this.openAuthModal()
        return false
      }
      if (this.syncInFlight) return false

      this.syncInFlight = true
      this.syncStatus = 'syncing'
      this.error = null
      const epoch = this.sessionEpoch
      const gameStore = useGameStore()

      try {
        const result = await CloudSaveService.saveToCloud(this.user, gameStore.serialize(), undefined, { force })
        if (epoch !== this.sessionEpoch) return false
        this.cloudMeta = result.meta
        this.lastSyncedAt = toMillis(result.updatedAt) ?? Date.now()
        this.syncStatus = 'success'
        this.fadeSyncStatus(3500)
        return true
      } catch (err: unknown) {
        if (epoch !== this.sessionEpoch) return false
        if (err instanceof CloudWriteConflictError) {
          // Bulut, bu cihazın bildiğinden farklı bir belge: üzerine yazma.
          console.warn('Bulut kaydı başka bir cihazda değişmiş; üzerine yazılmadı.', err)
          this.syncStatus = 'idle'
          await this.openConflictModal()
          return false
        }
        console.error('Buluta kaydetme hatası:', err)
        this.error = formatAuthError(err)
        this.syncStatus = 'error'
        return false
      } finally {
        this.syncInFlight = false
      }
    },

    openConflict(localMeta: CloudSaveMeta, cloudPayload: CloudSavePayload): void {
      this.conflictData = {
        localMeta,
        cloudMeta: cloudPayload.meta,
        cloudPayload
      }
      this.cloudMeta = cloudPayload.meta
      this.showConflictModal = true
      this.syncStatus = 'idle'
    },

    /** Çakışma verisini yeniden çekip modalı açar (yeniden kullanılabilir). */
    async openConflictModal(): Promise<boolean> {
      if (!this.user) return false
      try {
        const gameStore = useGameStore()
        const plan = await CloudSaveService.planSync(this.user, gameStore.serialize())
        if (plan.decision !== 'conflict' || !plan.cloudPayload) return false
        this.openConflict(plan.localMeta, plan.cloudPayload)
        return true
      } catch (err: unknown) {
        console.error('Çakışma kontrolü hatası:', err)
        this.syncStatus = 'error'
        return false
      }
    },

    /**
     * Arka plan (periyodik) senkronizasyonu.
     *
     * ADR-0070 düzeltmesi: eskiden her döngüde "yerel ve bulut farklı mı?"
     * sorusu soruluyordu; normal oynanış zaten fark yarattığı için ilk
     * yazımdan sonra otomatik senkron HİÇ çalışmıyor ve oyuncu 5 dakikada
     * bir çakışma modalı görüyordu. Artık yalnızca bulutun gerçekten
     * değiştiği durumda müdahale ediliyor.
     */
    async syncBackground(): Promise<boolean> {
      if (!this.user || !this.autoSyncEnabled || this.syncInFlight) return false
      const epoch = this.sessionEpoch

      try {
        const gameStore = useGameStore()
        const plan = await CloudSaveService.planSync(this.user, gameStore.serialize())
        if (epoch !== this.sessionEpoch) return false

        if (plan.cloudPayload) {
          this.cloudMeta = plan.cloudPayload.meta
          this.lastSyncedAt = toMillis(plan.cloudPayload.updatedAt) ?? plan.cloudPayload.meta.clientTimestamp
        }

        if (plan.decision === 'conflict' && plan.cloudPayload) {
          this.openConflict(plan.localMeta, plan.cloudPayload)
          return false
        }

        return await this.saveToCloud()
      } catch (err: unknown) {
        console.error('Arka plan senkronizasyon hatası:', err)
        if (epoch === this.sessionEpoch) {
          this.error = formatAuthError(err)
          this.syncStatus = 'error'
        }
        return false
      }
    },

    async loadFromCloud(): Promise<boolean> {
      if (!this.user) {
        this.openAuthModal()
        return false
      }
      if (this.syncInFlight) return false

      this.syncInFlight = true
      this.syncStatus = 'syncing'
      this.error = null
      const epoch = this.sessionEpoch

      try {
        const cloudData = await CloudSaveService.fetchFromCloud(this.user)
        if (!cloudData || !cloudData.compressedData) {
          this.error = 'Bulutta geçerli bir kayıt dosyası bulunamadı.'
          this.syncStatus = 'error'
          return false
        }

        const parsed = SaveSystem.importSave(cloudData.compressedData)
        if (!parsed) {
          this.error =
            'Buluttaki kayıt açılamadı: bozuk olabilir ya da daha yeni bir sürümün buildinden gelmiş olabilir. Ayrıntı için tarayıcı konsoluna bakın.'
          this.syncStatus = 'error'
          return false
        }

        const gameStore = useGameStore()
        const slot = SaveSystem.getActiveSlot()
        // ADR-0029: buluttan indirmeden ÖNCE yerel slotu yedekle.
        SaveSystem.snapshotSlot(slot)
        gameStore.deserialize(parsed)
        SaveSystem.save(parsed, slot)
        // İndirdiğimiz belge artık "bu cihazın bildiği kayıt".
        CloudSaveService.adoptCloudRevision(slot, cloudData)

        this.cloudMeta = cloudData.meta
        this.lastSyncedAt = toMillis(cloudData.updatedAt) ?? cloudData.meta.clientTimestamp
        this.syncStatus = 'success'
        this.fadeSyncStatus(3000)
        return true
      } catch (err: unknown) {
        console.error('Buluttan yükleme hatası:', err)
        if (epoch === this.sessionEpoch) {
          this.error = formatAuthError(err)
          this.syncStatus = 'error'
        }
        return false
      } finally {
        this.syncInFlight = false
      }
    },

    /**
     * Çakışmayı oyuncunun seçimiyle çözer.
     *
     * ADR-0070 düzeltmeleri:
     *  1) 'local' dalı `force = true` kullanır — bilinçli karar yaş korumasını
     *     atlamalıdır. Daha önce `force = false` geçtiği için yazma reddediliyor,
     *     modal yine de kapanıyor ve oyuncu HİÇBİR geri bildirim almıyordu.
     *  2) Başarısızlıkta modal KAPATILMAZ; diğer seçenek kullanılabilir kalsın.
     *  3) 'cloud' dalı artık yerel slotu yedekler. Modal "mevcut slot yedeği
     *     yerel çöp kutusunda tutulur" diyordu ama yedek hiç alınmıyordu.
     */
    async resolveConflict(choice: 'local' | 'cloud'): Promise<void> {
      const conflict = this.conflictData
      if (!conflict || !this.user) return
      this.error = null

      if (choice === 'local') {
        const ok = await this.saveToCloud(true)
        if (!ok) return
        this.conflictData = null
        this.showConflictModal = false
        return
      }

      const parsed = SaveSystem.importSave(conflict.cloudPayload.compressedData)
      if (!parsed) {
        this.error = 'Buluttaki kayıt açılamadı. Bu cihazdaki ilerlemeyi saklamayı deneyebilirsiniz.'
        this.syncStatus = 'error'
        return
      }

      const gameStore = useGameStore()
      const slot = SaveSystem.getActiveSlot()
      SaveSystem.snapshotSlot(slot)
      gameStore.deserialize(parsed)
      SaveSystem.save(parsed, slot)
      CloudSaveService.adoptCloudRevision(slot, conflict.cloudPayload)

      this.cloudMeta = conflict.cloudMeta
      this.lastSyncedAt = toMillis(conflict.cloudPayload.updatedAt) ?? conflict.cloudMeta.clientTimestamp
      this.syncStatus = 'success'
      this.conflictData = null
      this.showConflictModal = false
    }
  }
})
