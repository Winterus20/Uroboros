<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from './stores/game'
import { useAuthStore } from './stores/auth'
import { SaveSystem } from './core/save'
import { gameLoop } from './core/game-loop'
import { format } from './core/format'
import { sounds } from './core/audio'
import type { MotionMode } from './models/settings'
import AlgorithmicSwirl from './components/AlgorithmicSwirl.vue'
import TickerBar from './components/TickerBar.vue'
import HeroNumber from './components/HeroNumber.vue'
import TapButton from './components/TapButton.vue'
import TelemetryLine from './components/TelemetryLine.vue'
import ChainList from './components/ChainList.vue'
import UpgradeList from './components/UpgradeList.vue'
import StatsPanel from './components/StatsPanel.vue'
import RungScene from './components/RungScene.vue'
import SettingsModal from './components/SettingsModal.vue'
import AuthModal from './components/AuthModal.vue'
import CloudConflictModal from './components/CloudConflictModal.vue'
import OfflineModal from './components/OfflineModal.vue'

type Tab = 'number' | 'upgrades' | 'stats' | 'settings'

const store = useGameStore()
const auth = useAuthStore()
const tab = ref<Exclude<Tab, 'settings'>>('number')
const showSettings = ref(false)
const boostPulse = ref(false)

const TABS: Tab[] = ['number', 'upgrades', 'stats', 'settings']

const boostText = computed(() => format(store.boostGain, 2, store.settings.notation))
const rewardText = computed(() => format(store.tanimReward, 2, store.settings.notation))

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

let boostTimer: number | null = null

/** G11: 400 ms — sayı içeri çöker, swirl nefes alır, çarpan rozeti oturur. Sahne yok. */
function pulse(): void {
  if (boostTimer !== null) {
    window.clearTimeout(boostTimer)
    boostTimer = null
  }
  boostPulse.value = false
  // Sınıfı bir kare sonra geri aç: CSS animasyonu baştan oynasın (art arda boost'lar).
  window.requestAnimationFrame(() => {
    boostPulse.value = true
    boostTimer = window.setTimeout(() => {
      boostPulse.value = false
      boostTimer = null
    }, 400)
  })
}

/** E12–E14: mini boost — 8. halka alınınca açılır, her şeyi sıfırlar. */
function boost(): void {
  if (!store.boostAvailable) return
  const gain = store.boost()
  if (gain.gt(1)) {
    pulse()
    if (store.settings.soundEnabled) sounds.playShift()
  }
  showSettings.value = false
  tab.value = 'number'
}

/** E7/S2: kapı — Tanım kazanılır, sayı başlangıca döner. */
function prestige(): void {
  if (store.settings.confirmDialogs && !window.confirm('Take ' + rewardText.value + ' Definition and start over?')) return
  store.prestige()
  if (store.settings.soundEnabled) sounds.playMilestone()
}

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
  if (event.key.toLowerCase() === 'b' && store.boostAvailable) {
    boost()
    return
  }
  if (event.key.toLowerCase() === 'p' && store.gateReady) {
    prestige()
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

  // Yalnız geliştirme: sahne/boost anlarını tarayıcıdan tetikleyip doğrulamak için.
  if (import.meta.env.DEV) {
    ;(window as unknown as { __htn?: { store: typeof store } }).__htn = { store }
  }
})

onUnmounted(() => {
  gameLoop.stop()
  window.removeEventListener('keydown', onKeydown)
  if (boostTimer !== null) window.clearTimeout(boostTimer)
})
</script>

<template>
  <div class="app">
    <!-- G2/G12: oyunun tek ortamı swirl; basamak rengini taşıyan tek yüzey. -->
    <div class="app__swirl" :class="{ 'app__swirl--breath': boostPulse }" aria-hidden="true">
      <AlgorithmicSwirl />
    </div>

    <div class="app__inner">
      <TickerBar />

      <main class="stage">
        <HeroNumber :boost-pulse="boostPulse" />

        <TapButton />

        <!-- Yerleşim sabit: boost/kapı düğmeleri belirip kaybolurken +1 kıpırdamaz (G10). -->
        <div class="modifiers">
          <button
            v-if="store.boostAvailable"
            type="button"
            class="modifier"
            :aria-label="'Breathe — reset the run for a permanent ×' + boostText + ' multiplier'"
            @click="boost"
          >
            breathe <span class="modifier__value data">×{{ boostText }}</span>
          </button>
          <button
            v-if="store.gateReady"
            type="button"
            class="modifier modifier--gate"
            :aria-label="'Gate — take ' + rewardText + ' Definition and start over'"
            @click="prestige"
          >
            gate <span class="modifier__value data">+{{ rewardText }}</span>
          </button>
        </div>

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
          <UpgradeList v-else-if="tab === 'upgrades'" />
          <StatsPanel v-else />
        </section>
      </main>

      <footer class="foot data">
        <span>{{ store.taps }} presses</span>
        <span class="foot__dot" aria-hidden="true">·</span>
        <span>{{ store.prestiges }} gates</span>
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

/* Swirl sarmalayıcı: nefes (G11) yalnız ölçek + parlaklık — renk/isim yok. */
.app__swirl {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.app__swirl--breath {
  animation: pn-swirl-breath 400ms cubic-bezier(0.3, 0.6, 0.2, 1);
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

.modifiers {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 40px;
  padding: 0 20px 12px;
}

.modifier {
  appearance: none;
  border: 1px solid var(--pn-hairline-strong);
  border-radius: 0;
  background: transparent;
  color: var(--pn-text);
  font-family: var(--font-ui);
  font-size: 13px;
  letter-spacing: 0.02em;
  padding: 9px 18px;
  cursor: pointer;
  transition: border-color 120ms ease;
}
.modifier:hover { border-color: var(--pn-text-faint); }
.modifier__value { margin-left: 7px; color: inherit; opacity: 0.9; }
.modifier--gate { color: var(--pn-amber); }

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
  .modifiers { padding-bottom: 8px; }
  .modifier { font-size: 12px; padding: 8px 14px; }
}
</style>
