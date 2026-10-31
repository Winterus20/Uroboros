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
  // ADR-0070: bilinçli kullanıcı eylemi -> yaş koruması atlanır.
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
    return format(new Decimal(authStore.cloudMeta.number), 2, gameStore.settings.notation)
  } catch {
    return authStore.cloudMeta.number
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
  <!-- ADR-0085: düz karartma (blur yok) + s1 panel, 8 px köşe, 1px çizgi, gölge/gradyan yok. -->
  <div class="modal auth" @click.self="emit('close')">
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="modal__panel auth__panel"
      @click.stop
    >
      <!-- Modal Üst Çubuk -->
      <div class="modal__head">
        <div class="auth__title-row">
          <span class="auth__icon" aria-hidden="true"><Cloud :size="18" :stroke-width="1.6" /></span>
          <div>
            <h3 :id="titleId" class="modal__title auth__title">
              Bulut Bağlantısı
              <span v-if="authStore.isConfigured" class="pill pill--accent">Canlı Bulut</span>
              <span v-else class="pill">Simülasyon Modu</span>
            </h3>
            <p class="auth__sub">İlerlemenizi bulutta saklayın, cihazlar arasında senkronize edin</p>
          </div>
        </div>
        <button type="button" class="auth__x" aria-label="Kapat" @click="emit('close')">
          <X :size="16" :stroke-width="1.6" />
        </button>
      </div>

      <!-- Modal İçeriği (Kaydırılabilir) -->
      <div class="modal__body auth__body">

        <!-- DURUM A: OTURUM AÇIK (HESAP & BULUT YÖNETİMİ) -->
        <div v-if="authStore.isAuthenticated" class="auth__stack">

          <!-- Kullanıcı Bilgisi -->
          <div class="auth__box auth__user">
            <div class="auth__user-id">
              <img v-if="authStore.userAvatar" :src="authStore.userAvatar" alt="Avatar" class="auth__avatar" />
              <div v-else class="auth__avatar auth__avatar--letter data">
                {{ authStore.userDisplayName.charAt(0).toUpperCase() }}
              </div>
              <div class="auth__user-text">
                <div class="auth__user-name">
                  {{ authStore.userDisplayName }}
                  <span class="pill">{{ authStore.isGoogleUser ? 'Google Hesabı' : 'E-posta Hesabı' }}</span>
                </div>
                <div class="auth__user-mail data">{{ authStore.userEmail || 'Anonim / Bağlı Hesap' }}</div>
              </div>
            </div>

            <button
              type="button"
              class="btn btn--danger"
              :disabled="authStore.authActionLoading"
              @click="authStore.signOut()"
            >
              <LogOut :size="14" :stroke-width="1.6" aria-hidden="true" />
              <span>Çıkış Yap</span>
            </button>
          </div>

          <!-- Bulut Senkronizasyon Durumu -->
          <div class="auth__box">
            <div class="auth__row auth__row--head">
              <span class="auth__label-strong">
                <ShieldCheck :size="15" :stroke-width="1.6" aria-hidden="true" />
                Bulut Depolama Durumu
              </span>
              <span class="auth__meta data">Son: {{ lastSyncedText }}</span>
            </div>

            <div class="auth__stat">
              <span class="modal__kicker">BULUTTAKİ SAYI</span>
              <span class="auth__stat-value data">{{ formattedCloudMatter }}</span>
            </div>

            <!-- Otomatik Senkronizasyon Ayarı -->
            <div class="auth__row">
              <div>
                <span class="auth__label-strong">Otomatik Bulut Yedekleme</span>
                <span class="auth__hint">Önemli aşamalarda arka planda sessizce buluta yedekler</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Otomatik Bulut Yedekleme"
                :aria-checked="authStore.autoSyncEnabled"
                class="switch"
                :class="{ 'switch--on': authStore.autoSyncEnabled }"
                @click="authStore.toggleAutoSync()"
              >
                <span class="switch__knob" />
              </button>
            </div>
          </div>

          <!-- Aksiyon Butonları (Buluta Yaz / Buluttan Çek) -->
          <div class="auth__grid">
            <button
              type="button"
              class="btn btn--accent btn--lg"
              :disabled="authStore.isSyncing"
              @click="handleSaveToCloud"
            >
              <Loader2 v-if="authStore.syncStatus === 'syncing'" :size="15" class="spin" aria-hidden="true" />
              <UploadCloud v-else :size="15" :stroke-width="1.6" aria-hidden="true" />
              <span>Buluta Yedekle</span>
            </button>

            <button
              type="button"
              class="btn btn--solid btn--lg"
              :disabled="authStore.isSyncing"
              @click="handleLoadFromCloud"
            >
              <DownloadCloud :size="15" :stroke-width="1.6" aria-hidden="true" />
              <span>Buluttan Yükle</span>
            </button>
          </div>

          <!-- Hata & Geri Bildirim -->
          <div v-if="authStore.error" role="alert" class="notice notice--error">
            <AlertCircle :size="15" :stroke-width="1.6" aria-hidden="true" />
            <span>{{ authStore.error }}</span>
          </div>

          <div v-if="localActionSuccess" role="alert" class="notice notice--ok">
            <CheckCircle2 :size="15" :stroke-width="1.6" aria-hidden="true" />
            <span>{{ localActionSuccess }}</span>
          </div>

        </div>

        <!-- DURUM B: OTURUM KAPALI (GİRİŞ & KAYIT OL) -->
        <div v-else class="auth__stack">

          <!-- Google ile Tek Tık Giriş Butonu -->
          <button
            type="button"
            class="btn btn--solid btn--lg btn--block"
            :disabled="authStore.authActionLoading"
            @click="handleGoogleLogin"
          >
            <Loader2 v-if="authStore.authActionLoading" :size="15" class="spin" aria-hidden="true" />
            <svg v-else width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google ile Devam Et</span>
          </button>

          <!-- Ayraç -->
          <div class="auth__divider"><span class="modal__kicker">veya e-posta</span></div>

          <!-- Sekmeler (Giriş Yap / Kayıt Ol) -->
          <div v-if="mode !== 'forgot'" class="auth__tabs">
            <button
              type="button"
              class="auth__tab"
              :class="{ 'auth__tab--on': mode === 'login' }"
              :aria-pressed="mode === 'login'"
              @click="setMode('login')"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              class="auth__tab"
              :class="{ 'auth__tab--on': mode === 'register' }"
              :aria-pressed="mode === 'register'"
              @click="setMode('register')"
            >
              Kayıt Ol
            </button>
          </div>

          <!-- Form Alanı -->
          <form class="auth__form" @submit.prevent="handleSubmit">
            <!-- Email -->
            <div>
              <label :for="emailInputId" class="auth__field-label modal__kicker">E-POSTA ADRESİ</label>
              <div class="auth__input-wrap">
                <input
                  :id="emailInputId"
                  v-model="email"
                  type="email"
                  required
                  placeholder="ornek@mail.com"
                  class="field-input auth__input"
                />
                <Mail :size="15" :stroke-width="1.6" class="auth__input-icon" aria-hidden="true" />
              </div>
            </div>

            <!-- Password (Şifremi unuttum modunda gizlenir) -->
            <div v-if="mode !== 'forgot'">
              <div class="auth__field-head">
                <label :for="passwordInputId" class="auth__field-label modal__kicker">ŞİFRE</label>
                <button
                  v-if="mode === 'login'"
                  type="button"
                  class="auth__link"
                  @click="setMode('forgot')"
                >
                  Şifremi Unuttum?
                </button>
              </div>
              <div class="auth__input-wrap">
                <input
                  :id="passwordInputId"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  minlength="6"
                  placeholder="••••••••"
                  class="field-input auth__input auth__input--pw"
                />
                <Lock :size="15" :stroke-width="1.6" class="auth__input-icon" aria-hidden="true" />
                <button
                  type="button"
                  class="auth__eye"
                  aria-label="Şifreyi göster"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" :size="15" :stroke-width="1.6" />
                  <Eye v-else :size="15" :stroke-width="1.6" />
                </button>
              </div>
            </div>

            <!-- Hata & Bildirim Kutuları -->
            <div v-if="authStore.error" role="alert" class="notice notice--error">
              <AlertCircle :size="15" :stroke-width="1.6" aria-hidden="true" />
              <span>{{ authStore.error }}</span>
            </div>

            <div v-if="localActionSuccess" role="alert" class="notice notice--ok">
              <CheckCircle2 :size="15" :stroke-width="1.6" aria-hidden="true" />
              <span>{{ localActionSuccess }}</span>
            </div>

            <!-- Gönder Butonu -->
            <button
              type="submit"
              class="btn btn--accent btn--lg btn--block"
              :disabled="authStore.authActionLoading"
            >
              <Loader2 v-if="authStore.authActionLoading" :size="15" class="spin" aria-hidden="true" />
              <span v-else>{{ mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Hesap Oluştur ve Bağla' : 'Sıfırlama Bağlantısı Gönder' }}</span>
            </button>

            <!-- Şifremi unuttum modundan geri dön -->
            <div v-if="mode === 'forgot'" class="auth__center">
              <button type="button" class="auth__link auth__link--dim" @click="setMode('login')">
                Giriş ekranına geri dön
              </button>
            </div>
          </form>

          <!-- Misafir Olarak Devam Et Butonu -->
          <div class="auth__guest">
            <button type="button" class="auth__link auth__link--dim" @click="emit('close')">
              Kayıt olmadan misafir olarak oynamaya devam et →
            </button>
          </div>

        </div>

      </div>

      <!-- Alt Bilgi Notu -->
      <div class="auth__foot">
        <span class="auth__foot-note">
          <Sparkles :size="12" :stroke-width="1.6" aria-hidden="true" />
          Mevcut yerel ilerlemeniz kaybolmaz.
        </span>
        <span class="data">v0.25.0 Cloud Engine</span>
      </div>

    </div>
  </div>
</template>

<style scoped>
.auth__panel {
  display: flex;
  flex-direction: column;
  width: min(500px, 100%);
  max-height: 92vh;
  overflow: hidden;
}
.auth__title-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
.auth__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--pn-rung-line);
  border-radius: var(--pn-r);
  background: var(--pn-rung-soft);
  color: var(--pn-rung);
}
.auth__title { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.auth__sub { margin: 2px 0 0; font-size: 12px; color: var(--pn-text-dim); }
.auth__x {
  appearance: none;
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: var(--pn-r);
  background: transparent;
  color: var(--pn-text-dim);
  cursor: pointer;
}
.auth__x:hover { border-color: var(--pn-line-strong); color: var(--pn-text); }

.auth__body { overflow-y: auto; }
.auth__stack { display: flex; flex-direction: column; gap: 14px; }

.auth__box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--pn-line-strong);
  border-radius: var(--pn-r-lg);
  background: var(--pn-s2);
}
.auth__user { flex-direction: row; align-items: center; justify-content: space-between; }
.auth__user-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
.auth__avatar {
  flex: none;
  width: 42px;
  height: 42px;
  border: 1px solid var(--pn-line-strong);
  border-radius: 50%;
  object-fit: cover;
}
.auth__avatar--letter {
  display: grid;
  place-items: center;
  background: var(--pn-s3);
  font-size: 16px;
  color: var(--pn-rung);
}
.auth__user-text { min-width: 0; }
.auth__user-name { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 14px; color: var(--pn-text); }
.auth__user-mail { margin-top: 2px; font-size: 11px; color: var(--pn-text-dim); overflow: hidden; text-overflow: ellipsis; }

.auth__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.auth__row--head { padding-bottom: 10px; border-bottom: 1px solid var(--pn-line); }
.auth__label-strong { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--pn-text); }
.auth__hint { display: block; margin-top: 2px; font-size: 11px; color: var(--pn-text-dim); }
.auth__meta { font-size: 11px; color: var(--pn-text-dim); }
.auth__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--pn-line);
  border-radius: var(--pn-r);
  background: var(--pn-s1);
}
.auth__stat-value { font-size: 15px; color: var(--pn-text); }

.switch {
  appearance: none;
  position: relative;
  flex: none;
  width: 38px;
  height: 22px;
  border: 1px solid var(--pn-line-strong);
  border-radius: 11px;
  background: var(--pn-s3);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--pn-text-dim);
  transition: transform 120ms ease, background-color 120ms ease;
}
.switch--on { border-color: var(--pn-rung-line); background: var(--pn-rung-soft); }
.switch--on .switch__knob { transform: translateX(16px); background: var(--pn-rung); }

.auth__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.auth__divider { display: flex; align-items: center; gap: 12px; }
.auth__divider::before,
.auth__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--pn-line);
}

.auth__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 2px;
  border: 1px solid var(--pn-line-strong);
  border-radius: 7px;
  background: var(--pn-s1);
}
.auth__tab {
  appearance: none;
  height: 30px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  font-size: 12px;
  color: var(--pn-text-dim);
  cursor: pointer;
}
.auth__tab:hover { color: var(--pn-text); }
.auth__tab--on { background: var(--pn-s3); color: var(--pn-text); }

.auth__form { display: flex; flex-direction: column; gap: 14px; }
.auth__field-head { display: flex; align-items: center; justify-content: space-between; }
.auth__field-label { display: block; margin-bottom: 6px; }
.auth__input-wrap { position: relative; }
.auth__input { width: 100%; height: 36px; padding-left: 34px; font-family: var(--font-ui); font-size: 13px; }
.auth__input--pw { padding-right: 38px; }
.auth__input::placeholder { color: var(--pn-text-faint); }
.auth__input-icon { position: absolute; left: 11px; top: 10px; color: var(--pn-text-faint); pointer-events: none; }
.auth__eye {
  appearance: none;
  position: absolute;
  right: 6px;
  top: 4px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--pn-r-sm);
  background: transparent;
  color: var(--pn-text-faint);
  cursor: pointer;
}
.auth__eye:hover { color: var(--pn-text); }

.auth__link {
  appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  font-size: 11px;
  color: var(--pn-rung);
  cursor: pointer;
}
.auth__link:hover { text-decoration: underline; text-underline-offset: 3px; }
.auth__link--dim { font-size: 12px; color: var(--pn-text-dim); }
.auth__link--dim:hover { color: var(--pn-text); }
.auth__center { text-align: center; }
.auth__guest { padding-top: 12px; border-top: 1px solid var(--pn-line); text-align: center; }

.auth__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 18px;
  border-top: 1px solid var(--pn-line);
  font-size: 11px;
  color: var(--pn-text-faint);
}
.auth__foot-note { display: inline-flex; align-items: center; gap: 6px; color: var(--pn-text-dim); }

.spin { animation: auth-spin 0.9s linear infinite; }
@keyframes auth-spin { to { transform: rotate(360deg); } }

@media (max-width: 560px) {
  .auth__user { flex-direction: column; align-items: stretch; }
  .auth__grid { grid-template-columns: 1fr; }
}
</style>
