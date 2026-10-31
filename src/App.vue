<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { OFFLINE_REPORT_MIN_SECONDS, useGameStore } from './stores/game'
import { useAuthStore } from './stores/auth'
import { SaveSystem } from './core/save'
import { gameLoop } from './core/game-loop'
import type { MotionMode } from './models/settings'
import { DEFAULT_SECTION_ID, sectionById } from './ui/sections'
import TopBar from './components/shell/TopBar.vue'
import NavRail from './components/shell/NavRail.vue'
import StatusBar from './components/shell/StatusBar.vue'
import HeroNumber from './components/HeroNumber.vue'
import RungScene from './components/RungScene.vue'
import SettingsModal from './components/SettingsModal.vue'
import AuthModal from './components/AuthModal.vue'
import CloudConflictModal from './components/CloudConflictModal.vue'
import OfflineModal from './components/OfflineModal.vue'
import GateModal from './components/GateModal.vue'

const store = useGameStore()
const auth = useAuthStore()

/**
 * Aktif bölüm (ADR-0085): kimlik `ui/sections.ts` kayıt defterinden çözülür. Kilitli ya da
 * bilinmeyen kimlik varsayılan bölüme düşer — menü ve sayfa aynı kaynaktan okur.
 */
const activeId = ref(DEFAULT_SECTION_ID)
const activeSection = computed(() => sectionById(activeId.value, store))
const showSettings = ref(false)
const mainEl = ref<HTMLElement | null>(null)

function selectSection(id: string): void {
  if (id === activeId.value) return
  activeId.value = id
  // Yeni sayfa baştan okunur: önceki sayfanın kaydırma konumu taşınmaz.
  if (mainEl.value) mainEl.value.scrollTop = 0
}

/**
 * Vurgu = basamak rengi (ADR-0085): tek değişken kök elemana yazılır; `style.css` yumuşak/çizgi
 * türevlerini `color-mix` ile ondan üretir. Yeni basamak tüm arayüzü bu satırla yeniden boyar.
 */
watch(
  () => store.rungInfo.color,
  (color) => document.documentElement.style.setProperty('--pn-rung', color),
  { immediate: true }
)

/** Hareket kapısı (ADR-0058): ayar tek yerden kök elementi mühürler. */
function syncMotionGate(mode: MotionMode): void {
  const root = document.documentElement
  root.dataset.motion = mode
  root.classList.toggle('motion-off', mode === 'off')
  root.classList.toggle('reduce-anim', mode !== 'full')
}

watch(() => store.settings.motionMode, syncMotionGate, { immediate: true })

function onKeydown(event: KeyboardEvent): void {
  if (!store.settings.hotkeysEnabled) return
  const target = event.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return
  // Kapıda büyüme durur: basış/alım kısayolları susar, aksi hâlde klavye modalın
  // söylediğinin tersini yapardı (Kural 2). gateReached bir mandaldır ve prestijden
  // sonra da true kalır — kapıyı sormak için growthStopped okunur, mandal değil.
  if (store.growthStopped) return
  if (event.key === 'Escape') {
    // En üstteki katman kapanır: bulut modalları açıkken ayarlar açık kalır.
    if (!auth.showAuthModal && !auth.showConflictModal) showSettings.value = false
    return
  }
  if (event.key === ' ' || event.key === '+') {
    event.preventDefault()
    store.tap()
    return
  }
  const index = Number(event.key)
  if (Number.isInteger(index) && index >= 1 && index <= 8) {
    store.buyRing(index - 1)
  }
}

onMounted(() => {
  const result = SaveSystem.loadDetailed()
  if (result.state) {
    store.deserialize(result.state)
    const away = (Date.now() - (result.state.lastSeenAt ?? Date.now())) / 1000
    // Kısa yokluk simüle edilmez; rapor eşiği store'daki ile aynı sabittir.
    if (away >= OFFLINE_REPORT_MIN_SECONDS) store.simulateOffline(away)
  }
  gameLoop.start()
  // Bulut kayıt: ayarlardaki giriş noktası oturum dinleyicisine bağlanır.
  auth.init()
  window.addEventListener('keydown', onKeydown)

  // Yalnız geliştirme: sahne anlarını tarayıcıdan tetikleyip doğrulamak için.
  if (import.meta.env.DEV) {
    ;(window as unknown as { __htn?: { store: typeof store } }).__htn = { store }
  }
})

onUnmounted(() => {
  gameLoop.stop()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <!--
    Kabuk (ADR-0085): üst çubuk 52 · sol menü 232 · ana alan · durum çubuğu 30.
    ≤ 900 px: menü alt sekme çubuğu olur, tek sütun. Sağ panel YOK (sahip kararı).
  -->
  <div class="shell">
    <TopBar class="shell__top" @settings="showSettings = !showSettings" />

    <NavRail class="shell__nav" :active-id="activeSection.id" @select="selectSection" />

    <main ref="mainEl" class="shell__main">
      <div class="shell__content">
        <HeroNumber v-if="activeSection.hero !== false" />
        <component :is="activeSection.page" v-if="activeSection.page" />
      </div>
    </main>

    <StatusBar class="shell__status" />
  </div>

  <!-- G8: basamak geçişi motoru (mandallı, 2.500 ms). -->
  <RungScene />

  <!--
    Kapı (contract §6): 1.79e308'de büyüme durur ve tek bir an açılır.
    Katman sırası: sahne (30) · ayarlar (40) · çevrimdışı (45) kapının (50) ALTINDA kalır —
    oyuncu kapıyı görmeden ayar/rapor penceresi onu kesmez. Bulut katmanları (55/60) üstte
    kalır: giriş ve çakışma çözümü sistem yüzeyleridir, sayıyı kapatmaz.
  -->
  <GateModal v-if="store.gateOpen" />

  <SettingsModal v-if="showSettings" @close="showSettings = false" />

  <!--
    Bulut kayıt katmanı: sarmalayıcı z-index'i buradan verilir — ayarlar (40) ve çevrimdışı (45)
    katmanlarının ÜSTÜNDE kalmalı, aksi hâlde giriş formu sayfanın arkasına düşer.
  -->
  <div v-if="auth.showAuthModal" class="modal-layer">
    <AuthModal @close="auth.closeAuthModal()" />
  </div>
  <div v-if="auth.showConflictModal && auth.conflictData" class="modal-layer modal-layer--conflict">
    <CloudConflictModal />
  </div>

  <OfflineModal />
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--shell-nav) minmax(0, 1fr);
  grid-template-rows: var(--shell-top) minmax(0, 1fr) var(--shell-status);
  grid-template-areas:
    'top top'
    'nav main'
    'status status';
  height: 100vh;
  height: 100dvh;
}

.shell__top { grid-area: top; }
.shell__nav { grid-area: nav; }
.shell__status { grid-area: status; }

.shell__main {
  grid-area: main;
  min-width: 0;
  overflow-y: auto;
  padding: 28px 48px 40px;
  scrollbar-gutter: stable;
}

.shell__content {
  max-width: var(--content-max);
  margin: 0 auto;
}

/* Bulut katmanları: modal bileşenlerinin kendi kökleri position:fixed; sıra buradan. */
.modal-layer { position: fixed; inset: 0; z-index: 60; }
.modal-layer--conflict { z-index: 55; }

@media (max-width: 1180px) {
  .shell { --shell-nav: 200px; }
  .shell__main { padding: 24px 28px 36px; }
}

/* ≤ 900 px: tek sütun; menü ekranın dibinde sekme çubuğu, ticker onun üstünde. */
@media (max-width: 900px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: var(--shell-top) minmax(0, 1fr) var(--shell-status) auto;
    grid-template-areas:
      'top'
      'main'
      'status'
      'nav';
  }
  .shell__main { padding: 18px 16px 28px; }
}
</style>
