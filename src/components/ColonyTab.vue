<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore, COLONY_CORE_COST } from '../stores/game'
import { formatNumber } from '../core/format'
import { Network, Brain, Moon, Lock, TrendingUp, Hourglass } from 'lucide-vue-next'
import TabHero from './TabHero.vue'
import ConfirmModal from './ConfirmModal.vue'
import { ref } from 'vue'

const store = useGameStore()

const breedPercent = computed(() => (store.botBreedRate * 100).toFixed(1))

// 10 dakika sonraki bot sayısı (projeksiyon: bots × e^(rate × t))
const projectedBots = computed(() => {
  if (store.neuralBots.lte(0)) return '—'
  const future = store.neuralBots.times(Math.exp(store.botBreedRate * 600))
  return formatNumber(future)
})

// İlk Toplu Uyku'a kalan süre tahmini (sn -> dk)
const timeToNapMinutes = computed(() => {
  if (store.neuralBots.lte(0)) return null
  if (store.canPowerNap) return 0
  const ratio = store.minNapBots.div(store.neuralBots.gte(1) ? store.neuralBots : 1).toNumber()
  if (ratio <= 1) return 0
  const needed = Math.log(ratio) / store.botBreedRate
  return Math.max(1, Math.ceil(needed / 60))
})

const canAffordCore = computed(() => store.matter.gte(COLONY_CORE_COST))

// Çekirdek butonu rampası: %10 eşiği karşılanıyorsa partial, hiç karşılanmıyorsa locked.
const coreRampClass = computed(() => {
  if (canAffordCore.value) return ''
  if (store.matter.gte(COLONY_CORE_COST.div(10))) return 'ds-ramp-partial'
  return 'ds-ramp-locked'
})

// Toplu Çöküş rampası: hazır = amber + pulse; bot üremiş ama eşik altı = partial; hiç yoksa locked.
const napRampClass = computed(() => {
  if (store.canPowerNap) return ''
  return store.neuralBots.gt(0) ? 'ds-ramp-partial' : 'ds-ramp-locked'
})

// Toplu Çöküş ilerlemesi: bot sayısının asgari eşiğe oranı (görsel çubuk için).
const napProgressPercent = computed(() => {
  if (store.canPowerNap) return 100
  if (store.minNapBots.lte(0)) return 0
  return Math.min(100, store.neuralBots.div(store.minNapBots).toNumber() * 100)
})

function hatch() {
  if (store.hatchCore()) {
    window.dispatchEvent(new CustomEvent('doomscroll:tap', { detail: { x: window.innerWidth / 2, y: window.innerHeight * 0.4, text: '🧠 Çekirdek Aktif!' } }))
  }
}

function nap() {
  // QoL: koloni fedakarlığı geri dönüşsüz — onay diyaloğu (ayarlardan kapatılabilir)
  if (store.settings.confirmDialogs) {
    showNapConfirm.value = true
    return
  }
  doNap()
}

function doNap() {
  if (store.powerNap()) {
    window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'hard' } }))
  }
}

const showNapConfirm = ref(false)
</script>

<template>
  <div class="space-y-3">
    <TabHero
      :icon="Network"
      icon-class="text-violet-400"
      title="Kuantum Rezonatör Kolonisi"
      badge="Synergism"
      badge-class="ds-badge-violet"
      subtitle="Mikro-tekillik etrafında kendiliğinden örgütlenen kuantum alt-parçacıkları. Toplu Çöküş ile feda et, kalıcı kök kütle çarpanını katla."
      accent="violet"
    >
      <template #stats>
        <div class="stat-box">
          <div class="stat-box-label">Kuantum Rezonatör</div>
          <div class="stat-box-value text-violet-300 flex items-center gap-1">
            <Brain class="w-3.5 h-3.5 text-violet-400" />
            <span class="tabular-nums">{{ formatNumber(store.neuralBots) }}</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-box-label">Kalıcı Toplu Çöküş Çarpanı</div>
          <div class="stat-box-value text-amber-300 flex items-center gap-1">
            <Moon class="w-3.5 h-3.5 text-amber-400" />
            <span class="tabular-nums">×{{ formatNumber(store.napMultiplier) }}</span>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Çekirdek henüz yumurtlanmamış: aktivasyon paneli -->
    <div v-if="store.neuralBots.lte(0)" class="glass-panel-card p-4 rounded-xl border-violet-500/30 bg-violet-950/10">
      <div class="flex items-center gap-2 mb-1">
        <Lock class="w-4 h-4 text-violet-400" />
        <div class="text-xs font-bold font-mono text-violet-300">KUANTUM ÇEKİRDEĞİ</div>
      </div>
      <div class="text-[11px] text-slate-400 leading-relaxed mb-3">
        Laboratuvarda kendi kendine rezonansa giren ilk kuantum çekirdeğini ateşle. Bir kerelik aktivasyon; sonrası koloni kendisi büyür.
      </div>
      <button
        @click="hatch"
        class="btn-primary-violet btn-tactile w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
        :disabled="!canAffordCore"
        :class="canAffordCore ? '' : [coreRampClass, 'cursor-not-allowed']"
      >
        <Brain class="w-4 h-4" />
        <span>Çekirdek Aktif Et — {{ formatNumber(COLONY_CORE_COST) }} g Kütle</span>
      </button>
    </div>

    <!-- Ana panel: üreme + Toplu Uyku -->
    <div v-else class="glass-panel-card p-4 rounded-xl border-violet-500/30 bg-violet-950/10 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="stat-box">
          <div class="stat-box-label">Üreme Hızı</div>
          <div class="stat-box-value text-cyan-300 tabular-nums">+%{{ breedPercent }}/sn</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-label">Koloni Pasif Çarpanı</div>
          <div class="stat-box-value text-cyan-300 tabular-nums">×{{ formatNumber(store.colonyMultiplier) }}</div>
        </div>
      </div>

      <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span class="flex items-center gap-1">
          <Hourglass class="w-3 h-3" />
          10 dk sonra: ~<span class="tabular-nums">{{ projectedBots }}</span> bot
        </span>
        <span>Toplu Çöküş: <span class="font-mono tabular-nums">{{ store.napCount }}×</span></span>
      </div>

      <!-- TOPLU ÇÖKÜŞ butonu -->
      <button
        @click="nap"
        class="btn-tactile w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer border transition-all"
        :class="store.canPowerNap
          ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 hover:bg-amber-500/30 affordance-pulse'
          : ['bg-black/40 text-slate-500 border-white/[0.06] cursor-not-allowed', napRampClass]"
        :disabled="!store.canPowerNap"
      >
        <Moon class="w-4 h-4" />
        <span v-if="store.canPowerNap">
          TOPLU ÇÖKÜŞ — ×{{ formatNumber(store.powerNapGain) }} Kalıcı Çarpan Kazan
        </span>
        <span v-else>
          Toplu Çöküş için {{ formatNumber(store.minNapBots) }} bot gerekli
          <template v-if="timeToNapMinutes"> (~{{ timeToNapMinutes }} dk)</template>
        </span>
      </button>

      <!-- Toplu Çöküş ilerlemesi (bot / asgari eşik) -->
      <div class="progress-track progress-track-mini">
        <div
          class="progress-fill progress-fill-purple"
          :style="{ width: `${napProgressPercent}%` }"
        ></div>
      </div>

      <div class="text-[10px] text-slate-500 leading-relaxed border-t border-white/[0.05] pt-2">
        Toplu Çöküş: kuantum alt-parçacıkları tekillik merkezinde birleşir ve
        <span class="text-amber-300/90">kalıcı kök kütle çarpanı</span> katlanır.
        Çekirdek korunur; koloni sıfırdan ürer. Çarpan kozmik çöküşten bile sağ kalır.
      </div>
    </div>

    <!-- QoL: Toplu Uyku onay diyaloğu -->
    <ConfirmModal
      v-if="showNapConfirm"
      title="Toplu Çöküş"
      message="Koloni sıfırdan üremeye başlar; karşılığında kalıcı kök kütle çarpanı katlanır. Çekirdek korunur. Onaylıyor musun?"
      confirm-label="Toplu Çöküşü Başlat"
      :danger="false"
      @confirm="showNapConfirm = false; doNap()"
      @cancel="showNapConfirm = false"
    />

    <!-- Nöral Yuva (SP yükseltmesi) ipucu -->
    <div class="glass-panel-card p-3 rounded-xl flex items-center gap-2">
      <TrendingUp class="w-4 h-4 text-cyan-400 shrink-0" />
      <div class="text-[11px] text-slate-400 leading-relaxed">
        Üreme hızını artırmak için Şafak sekmesindeki
        <span class="text-cyan-300">🐜 Nöral Yuva</span> SP yükseltmesini al (+%10/seviye).
      </div>
    </div>
  </div>
</template>
