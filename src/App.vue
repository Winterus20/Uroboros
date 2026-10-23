<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from './stores/game'
import { SaveSystem } from './core/save'
import { gameLoop } from './core/game-loop'
import { format } from './core/format'
import { sounds } from './core/audio'
import AlgorithmicSwirl from './components/AlgorithmicSwirl.vue'
import TickerBar from './components/TickerBar.vue'
import HeroNumber from './components/HeroNumber.vue'
import TapButton from './components/TapButton.vue'
import TelemetryLine from './components/TelemetryLine.vue'
import ChainList from './components/ChainList.vue'
import UpgradeList from './components/UpgradeList.vue'
import StatsPanel from './components/StatsPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import OfflineModal from './components/OfflineModal.vue'

type Tab = 'number' | 'upgrades' | 'stats'

const store = useGameStore()
const tab = ref<Tab>('number')
const showSettings = ref(false)

const TABS: Tab[] = ['number', 'upgrades', 'stats']

const boostText = computed(() => format(store.boostGain, 2, store.settings.notation))
const rewardText = computed(() => format(store.tanimReward, 2, store.settings.notation))

/** E12–E14: mini boost — 8. halka alınınca açılır, her şeyi sıfırlar. */
function boost(): void {
  const gain = store.boost()
  if (gain.gt(1) && store.settings.soundEnabled) sounds.playShift()
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
    showSettings.value = false
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
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  gameLoop.stop()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="app">
    <AlgorithmicSwirl />

    <div class="app__inner">
      <TickerBar />

      <main class="stage">
        <HeroNumber />

        <div class="actions">
          <TapButton />
          <button v-if="store.boostAvailable" type="button" class="action" @click="boost">
            Breathe <span class="action__gain data">×{{ boostText }}</span>
          </button>
          <button v-if="store.gateReady" type="button" class="action action--gate" @click="prestige">
            Prestige <span class="action__gain data">+{{ rewardText }}</span>
          </button>
        </div>

        <TelemetryLine />

        <nav class="dock" aria-label="Sections">
          <button
            v-for="item in TABS"
            :key="item"
            type="button"
            class="dock__item"
            :class="{ 'dock__item--active': tab === item }"
            @click="tab = item"
          >
            {{ item }}
          </button>
          <button type="button" class="dock__item dock__item--right" @click="showSettings = true">settings</button>
        </nav>

        <section class="panel">
          <ChainList v-if="tab === 'number'" />
          <UpgradeList v-else-if="tab === 'upgrades'" />
          <StatsPanel v-else />
        </section>
      </main>

      <footer class="foot data">
        <span>{{ store.taps }} presses</span>
        <span class="foot__dot">·</span>
        <span>{{ store.prestiges }} gates</span>
      </footer>
    </div>

    <SettingsModal v-if="showSettings" @close="showSettings = false" />
    <OfflineModal />
  </div>
</template>

<style scoped>
.app { position: relative; min-height: 100vh; }
.app__inner { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 100vh; }
.stage { flex: 1; width: 100%; max-width: 1000px; margin: 0 auto; padding-bottom: 24px; }
.actions { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.action {
  appearance: none;
  border: 1px solid var(--pn-hairline-strong);
  background: transparent;
  color: var(--pn-text);
  font-family: var(--font-ui);
  font-size: 13px;
  padding: 10px 18px;
  border-radius: 2px;
  cursor: pointer;
}
.action--gate { color: var(--pn-amber); border-color: color-mix(in srgb, var(--pn-amber) 55%, transparent); }
.action__gain { margin-left: 8px; color: inherit; opacity: 0.9; }
.dock { display: flex; gap: 22px; justify-content: center; padding: 8px 16px 0; border-bottom: 1px solid var(--pn-hairline); }
.dock__item { appearance: none; background: transparent; border: 0; border-bottom: 1px solid transparent; color: var(--pn-text-faint); font-family: var(--font-ui); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; padding: 8px 0; cursor: pointer; }
.dock__item--active { color: var(--pn-text); border-bottom-color: var(--pn-text); }
.dock__item--right { margin-left: auto; }
.panel { padding-top: 18px; }
.foot { display: flex; justify-content: center; gap: 8px; padding: 18px 16px 26px; font-size: 11px; color: var(--pn-text-faint); }
.foot__dot { opacity: 0.4; }
</style>
