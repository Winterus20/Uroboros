<script setup lang="ts">
import { ref, computed, useId } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { Decimal } from '../core/math'
import { useFocusTrap } from '../core/focus-trap'
import {
  X,
  Cloud,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles
} from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const gameStore = useGameStore()

type AuthMode = 'login' | 'register' | 'forgot'
const mode = ref<AuthMode>('login')

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const localActionSuccess = ref('')

function clearForm() {
  email.value = ''
  password.value = ''
  authStore.error = null
  localActionSuccess.value = ''
}

function setMode(newMode: AuthMode) {
  mode.value = newMode
  clearForm()
}

async function handleGoogleLogin() {
  localActionSuccess.value = ''
  const ok = await authStore.signInWithGoogle()
  if (ok) {
    localActionSuccess.value = 'Google ile giriş başarılı!'
  }
}

async function handleSubmit() {
  localActionSuccess.value = ''
  if (mode.value === 'login') {
    const ok = await authStore.signInWithEmail(email.value, password.value)
    if (ok) {
      localActionSuccess.value = 'Giriş başarılı!'
    }
  } else if (mode.value === 'register') {
    const ok = await authStore.signUpWithEmail(email.value, password.value)
    if (ok) {
      localActionSuccess.value = 'Hesabınız oluşturuldu ve bağlandı!'
    }
  } else if (mode.value === 'forgot') {
    const ok = await authStore.sendPasswordReset(email.value)
    if (ok) {
      localActionSuccess.value = 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
    }
  }
}

async function handleSaveToCloud() {
  localActionSuccess.value = ''
  // ADR-0033: bilinçli kullanıcı eylemi -> yaş koruması atlanır.
  const ok = await authStore.saveToCloud(true)
  if (ok) {
    localActionSuccess.value = 'İlerlemeniz başarıyla buluta yedeklendi!'
    setTimeout(() => {
      localActionSuccess.value = ''
    }, 3000)
  }
}

async function handleLoadFromCloud() {
  localActionSuccess.value = ''
  const ok = await authStore.loadFromCloud()
  if (ok) {
    localActionSuccess.value = 'Bulut kaydınız başarıyla yüklendi!'
    setTimeout(() => {
      localActionSuccess.value = ''
    }, 3000)
  }
}

const formattedCloudMatter = computed(() => {
  if (!authStore.cloudMeta) return '-'
  try {
    return format(new Decimal(authStore.cloudMeta.matter), 2, gameStore.settings.notation)
  } catch {
    return authStore.cloudMeta.matter
  }
})

const lastSyncedText = computed(() => {
  if (!authStore.lastSyncedAt) return 'Henüz senkronize edilmedi'
  const diffSec = Math.floor((Date.now() - authStore.lastSyncedAt) / 1000)
  if (diffSec < 10) return 'Az önce'
  if (diffSec < 60) return `${diffSec} saniye önce`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dakika önce`
  return new Date(authStore.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

// Erişilebilirlik kimlikleri (useId: aynı modal birden fazla yerde render edilebiliyor)
const titleId = useId()
const emailInputId = `${titleId}-email`
const passwordInputId = `${titleId}-password`

// İki farklı görünüm (oturum açık / kapalı) olduğu için odak kapsayıcıda tutulur:
// ekran okuyucu başlığı okur, kullanıcı Tab ile içeriğe geçer.
const { dialogRef } = useFocusTrap(
  () => authStore.showAuthModal,
  {
    focusDialog: true,
    onEscape: () => emit('close')
  }
)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="relative w-full max-w-lg bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] outline-none"
      @click.stop
    >
      <!-- Modal Üst Çubuk -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-dark-800 bg-dark-950/60">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cloud class="w-5 h-5" />
          </div>
          <div>
            <h3 :id="titleId" class="font-black text-slate-100 text-base tracking-wide flex items-center gap-2">
              Uroboros Bulut Bağlantısı
              <span
                v-if="authStore.isConfigured"
                class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
              >
                Canlı Bulut
              </span>
              <span
                v-else
                class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                v-tip="'Firebase .env tanımlanmadığında yerel simülatör modu devrededir'"
              >
                Simülasyon Modu
              </span>
            </h3>
            <p class="text-xs text-slate-400">İlerlemenizi bulutta saklayın, cihazlar arasında senkronize edin</p>
          </div>
        </div>
        <button
          @click="emit('close')"
          aria-label="Kapat"
          class="p-2 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal İçeriği (Kaydırılabilir) -->
      <div class="p-6 overflow-y-auto space-y-6">

        <!-- DURUM A: OTURUM AÇIK (HESAP & BULUT YÖNETİMİ) -->
        <div v-if="authStore.isAuthenticated" class="space-y-5">
          
          <!-- Kullanıcı Bilgi Kartı -->
          <div class="p-4 rounded-xl bg-dark-950/80 border border-slate-700/60 flex items-center justify-between">
            <div class="flex items-center gap-3.5">
              <div v-if="authStore.userAvatar" class="relative">
                <img :src="authStore.userAvatar" alt="Avatar" class="w-12 h-12 rounded-full border border-cyan-500/40 object-cover" />
                <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-dark-900"></span>
              </div>
              <div v-else class="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg border border-cyan-400/40 shadow-inner">
                {{ authStore.userDisplayName.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                  {{ authStore.userDisplayName }}
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-slate-300 font-mono border border-slate-700">
                    {{ authStore.isGoogleUser ? 'Google Hesabı' : 'E-posta Hesabı' }}
                  </span>
                </div>
                <div class="text-xs text-slate-400 font-mono mt-0.5">
                  {{ authStore.userEmail || 'Anonim / Bağlı Hesap' }}
                </div>
              </div>
            </div>

            <button
              @click="authStore.signOut()"
              :disabled="authStore.authActionLoading"
              class="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all flex items-center gap-1.5"
            >
              <LogOut class="w-3.5 h-3.5" />
              <span>Çıkış Yap</span>
            </button>
          </div>

          <!-- Bulut Senkronizasyon Durumu Kartı -->
          <div class="p-4 rounded-xl bg-dark-950/60 border border-cyan-500/30 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <div class="flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-cyan-400" />
                <span class="text-xs font-bold text-slate-200">Bulut Depolama Durumu</span>
              </div>
              <span class="text-[11px] font-mono text-cyan-300">
                Son: {{ lastSyncedText }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-2.5 rounded-lg bg-dark-900 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">BULUTTAKİ KÜTLE</span>
                <span class="font-mono font-bold text-slate-200 text-sm">
                  {{ formattedCloudMatter }}
                </span>
              </div>
              <div class="p-2.5 rounded-lg bg-dark-900 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">KOZMİK ÇÖKÜŞ</span>
                <span class="font-mono font-bold text-amber-300 text-sm">
                  {{ authStore.cloudMeta ? authStore.cloudMeta.singularities + ' kez' : '-' }}
                </span>
              </div>
            </div>

            <!-- Otomatik Senkronizasyon Ayarı -->
            <div class="flex items-center justify-between pt-2">
              <div>
                <span class="text-xs text-slate-300 font-medium block">Otomatik Bulut Yedekleme</span>
                <span class="text-[10px] text-slate-500">Önemli aşamalarda arka planda sessizce buluta yedekler</span>
              </div>
              <button
                @click="authStore.toggleAutoSync()"
                role="switch"
                aria-label="Otomatik Bulut Yedekleme"
                :aria-checked="authStore.autoSyncEnabled"
                class="w-11 h-6 rounded-full transition-colors relative focus:outline-none"
                :class="authStore.autoSyncEnabled ? 'bg-cyan-500' : 'bg-slate-700'"
              >
                <span
                  class="block w-4 h-4 rounded-full bg-white transition-transform transform shadow"
                  :class="authStore.autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'"
                ></span>
              </button>
            </div>
          </div>

          <!-- Aksiyon Butonları (Buluta Yaz / Buluttan Çek) -->
          <div class="grid grid-cols-2 gap-3">
            <button
              @click="handleSaveToCloud"
              :disabled="authStore.isSyncing"
              class="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Loader2 v-if="authStore.syncStatus === 'syncing'" class="w-4 h-4 animate-spin" />
              <UploadCloud v-else class="w-4 h-4" />
              <span>Buluta Yedekle</span>
            </button>

            <button
              @click="handleLoadFromCloud"
              :disabled="authStore.isSyncing"
              class="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-dark-950 hover:bg-dark-800 text-slate-200 border border-slate-700 hover:border-slate-500 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <DownloadCloud class="w-4 h-4 text-cyan-400" />
              <span>Buluttan Yükle</span>
            </button>
          </div>

          <!-- Hata & Geri Bildirim Toastları -->
          <div
            v-if="authStore.error"
            role="alert"
            class="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in"
          >
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-400" />
            <span>{{ authStore.error }}</span>
          </div>

          <div
            v-if="localActionSuccess"
            role="alert"
            class="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 class="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{{ localActionSuccess }}</span>
          </div>

        </div>

        <!-- DURUM B: OTURUM KAPALI (GİRİŞ & KAYIT OL) -->
        <div v-else class="space-y-5">
          
          <!-- Google ile Tek Tık Giriş Butonu -->
          <button
            @click="handleGoogleLogin"
            :disabled="authStore.authActionLoading"
            class="w-full py-3 px-4 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-800 shadow-lg shadow-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-200"
          >
            <Loader2 v-if="authStore.authActionLoading" class="w-4 h-4 animate-spin text-slate-800" />
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span class="tracking-wide">Google ile Devam Et</span>
          </button>

          <!-- Ayraç -->
          <div class="relative flex items-center justify-center my-3">
            <div class="border-t border-slate-800 w-full"></div>
            <span class="bg-dark-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">veya e-posta</span>
          </div>

          <!-- Sekmeler (Giriş Yap / Kayıt Ol) -->
          <div v-if="mode !== 'forgot'" class="grid grid-cols-2 p-1 bg-dark-950 rounded-xl border border-slate-800">
            <button
              @click="setMode('login')"
              class="py-2 text-xs font-bold rounded-lg transition-all"
              :class="mode === 'login' ? 'bg-dark-800 text-cyan-400 shadow' : 'text-slate-400 hover:text-slate-200'"
            >
              Giriş Yap
            </button>
            <button
              @click="setMode('register')"
              class="py-2 text-xs font-bold rounded-lg transition-all"
              :class="mode === 'register' ? 'bg-dark-800 text-cyan-400 shadow' : 'text-slate-400 hover:text-slate-200'"
            >
              Kayıt Ol
            </button>
          </div>

          <!-- Form Alanı -->
          <form @submit.prevent="handleSubmit" class="space-y-3.5">
            <!-- Email -->
            <div>
              <label :for="emailInputId" class="block text-[11px] font-bold text-slate-400 mb-1">E-POSTA ADRESİ</label>
              <div class="relative">
                <input
                  :id="emailInputId"
                  v-model="email"
                  type="email"
                  required
                  placeholder="ornek@mail.com"
                  class="w-full bg-dark-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors pl-9"
                />
                <Mail class="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <!-- Password (Şifremi unuttum modunda gizlenir) -->
            <div v-if="mode !== 'forgot'">
              <div class="flex items-center justify-between mb-1">
                <label :for="passwordInputId" class="block text-[11px] font-bold text-slate-400">ŞİFRE</label>
                <button
                  v-if="mode === 'login'"
                  type="button"
                  @click="setMode('forgot')"
                  class="text-[10px] text-cyan-400 hover:underline"
                >
                  Şifremi Unuttum?
                </button>
              </div>
              <div class="relative">
                <input
                  :id="passwordInputId"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  minlength="6"
                  placeholder="••••••••"
                  class="w-full bg-dark-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors pl-9 pr-10"
                />
                <Lock class="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  aria-label="Şifreyi göster"
                  :aria-pressed="showPassword"
                  class="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <EyeOff v-if="showPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Hata & Bildirim Kutuları -->
            <div v-if="authStore.error" role="alert" class="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle class="w-4 h-4 shrink-0 text-rose-400" />
              <span>{{ authStore.error }}</span>
            </div>

            <div v-if="localActionSuccess" role="alert" class="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 class="w-4 h-4 shrink-0 text-cyan-400" />
              <span>{{ localActionSuccess }}</span>
            </div>

            <!-- Gönder Butonu -->
            <button
              type="submit"
              :disabled="authStore.authActionLoading"
              class="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Loader2 v-if="authStore.authActionLoading" class="w-4 h-4 animate-spin" />
              <span v-else>{{ mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Hesap Oluştur ve Bağla' : 'Sıfırlama Bağlantısı Gönder' }}</span>
            </button>

            <!-- Şifremi unuttum modundan geri dön -->
            <div v-if="mode === 'forgot'" class="text-center pt-2">
              <button
                type="button"
                @click="setMode('login')"
                class="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Giriş ekranına geri dön
              </button>
            </div>
          </form>

          <!-- Misafir Olarak Devam Et Butonu -->
          <div class="pt-3 border-t border-slate-800 text-center">
            <button
              @click="emit('close')"
              class="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5 mx-auto"
            >
              <span>Kayıt olmadan misafir olarak oynamaya devam et</span>
              <span class="text-slate-600">→</span>
            </button>
          </div>

        </div>

      </div>

      <!-- Alt Bilgi Notu -->
      <div class="px-6 py-3 border-t border-dark-800 bg-dark-950/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span class="flex items-center gap-1">
          <Sparkles class="w-3 h-3 text-cyan-400" />
          Mevcut yerel ilerlemeniz kaybolmaz.
        </span>
        <span class="font-mono text-[10px]">v0.25.0 Cloud Engine</span>
      </div>

    </div>
  </div>
</template>
