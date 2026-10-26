<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from './stores/game'
import { useAuthStore } from './stores/auth'
import { SaveSystem } from './core/save'
import { gameLoop } from './core/game-loop'
import type { MotionMode } from './models/settings'
import AlgorithmicSwirl from './components/AlgorithmicSwirl.vue'
import TickerBar from './components/TickerBar.vue'
import HeroNumber from './components/HeroNumber.vue'
import TapButton from './components/TapButton.vue'
import TelemetryLine from './components/TelemetryLine.vue'
import ChainList from './components/ChainList.vue'
import StatsPanel from './components/StatsPanel.vue'
import RungScene from './components/RungScene.vue'
import SettingsModal from './components/SettingsModal.vue'
import AuthModal from './components/AuthModal.vue'
import CloudConflictModal from './components/CloudConflictModal.vue'
import OfflineModal from './components/OfflineModal.vue'

type Tab = 'number' | 'stats' | 'settings'

const store = useGameStore()
const auth = useAuthStore()
const tab = ref<Exclude<Tab, 'settings'>>('number')
const showSettings = ref(false)

const TABS: Tab[] = ['number', 'stats', 'settings']

/** Dock: aktif sekme alt çizgiyle. Ayarlar bir sekme gibi davranır (modal açar). */
const activeTab = computed<Tab>(() => (showSettings.value ? 'settings' : tab.value))

function selectTab(next: Tab): void {
  if (next === 'settings') {
    showSettings.value = !showSettings.value
    return
  }
  showSettings.value = false
  tab.value = next
}

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
    if (away > 60) store.simulateOffline(away)
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
  <div class="app">
    <!-- G2/G12: oyunun tek ortamı swirl; basamak rengini taşıyan tek yüzey. -->
    <div class="app__swirl" aria-hidden="true">
      <AlgorithmicSwirl />
    </div>

    <div class="app__inner">
      <TickerBar />

      <main class="stage">
        <HeroNumber />

        <TapButton />

        <TelemetryLine />

        <nav class="dock" aria-label="Sections">
          <button
            v-for="item in TABS"
            :key="item"
            type="button"
            class="dock__item"
            :class="{ 'dock__item--active': activeTab === item }"
            :aria-current="activeTab === item ? 'page' : undefined"
            @click="selectTab(item)"
          >
            {{ item }}
          </button>
        </nav>

        <section class="panel">
          <ChainList v-if="tab === 'number'" />
          <StatsPanel v-else />
        </section>
      </main>

      <footer class="foot data">
        <span>{{ store.taps }} presses</span>
      </footer>
    </div>

    <!-- G8: basamak geçişi motoru (mandallı, 2.500 ms). -->
    <RungScene />

    <SettingsModal v-if="showSettings" @close="showSettings = false" />

    <!--
      Bulut kayıt katmanı: hazır bileşenler kendi görünümlerini kurar.
      Sarmalayıcı z-index'i buradan verilir — ayarlar (40) ve çevrimdışı (45)
      katmanlarının ÜSTÜNDE kalmalı, aksi hâlde giriş formu sayfanın arkasına düşer.
    -->
    <div v-if="auth.showAuthModal" class="modal-layer">
      <AuthModal @close="auth.closeAuthModal()" />
    </div>
    <div v-if="auth.showConflictModal && auth.conflictData" class="modal-layer modal-layer--conflict">
      <CloudConflictModal />
    </div>

    <OfflineModal />
  </div>
</template>

<style scoped>
.app {
  position: relative;
  min-height: 100vh;
}

/* Swirl sarmalayıcı: yalnız ölçek — renk/isim yok. */
.app__swirl {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.app__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.stage {
  flex: 1;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 24px;
}

/* Dock: metin sekmeler, aktif olan alt çizgiyle. İkon-only sekme yok. */
.dock {
  display: flex;
  justify-content: center;
  gap: 26px;
  padding: 0 20px;
  border-bottom: 1px solid var(--pn-hairline);
}
.dock__item {
  appearance: none;
  border: 0;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--pn-text-dim);
  font-family: var(--font-ui);
  font-size: 12px;
  letter-spacing: 0.08em;
  padding: 10px 0 9px;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.dock__item:hover { color: var(--pn-text); }
.dock__item--active {
  color: var(--pn-text);
  border-bottom-color: var(--pn-hairline-strong);
}

.panel { padding-top: 2px; }

/* Bulut katmanları: modal bileşenlerinin kendi kökleri position:fixed; sıra buradan. */
.modal-layer { position: fixed; inset: 0; z-index: 60; }
.modal-layer--conflict { z-index: 55; }

.foot {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 20px 20px 26px;
  font-size: 11px;
  color: var(--pn-text-dim);
}
.foot__dot { opacity: 0.55; }

@media (max-width: 560px) {
  .dock { gap: 20px; }
}
</style>
