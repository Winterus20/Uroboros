<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { formatNumber } from '../core/format'
import { D_INFINITY } from '../core/math'
import { NIGHT_WATCH_THRESHOLD } from '../stores/game'
import { ARC_LOG10_MAX } from '../game/pacing'
import { Sunrise, Sparkles, Sun, Moon } from 'lucide-vue-next'
import TabHero from './TabHero.vue'
import NeuralTreeTab from './NeuralTreeTab.vue'
import ConfirmModal from './ConfirmModal.vue'
import { ref } from 'vue'

const store = useGameStore()

// Break Singularity alındıysa hero rozeti "Sınır Yıkıldı" durumuna geçer
const singularityBroken = computed(() => store.hasBreakSingularity)

// Faz 2 kilometre taşı: Kolektif Kozmik Tekillik (1e308 g Kütle — ADR-0033).
// İlerleme şafak yoluyla aynı ölçekte: 0 → 1e308 = %0 → %100.
const nightWatchUnlocked = computed(() => store.nightWatchUnlocked)
const nightWatchProgress = computed(() => {
  if (store.matter.lt(1)) return 0
  if (store.matter.gte(NIGHT_WATCH_THRESHOLD)) return 100
  const logVal = Math.max(0, store.matter.log10().toNumber())
  return Math.min(100, Math.floor((logVal / ARC_LOG10_MAX) * 100))
})

const progressToSingularity = computed(() => {
  if (store.matter.lt(1)) return 0
  if (store.matter.gte(D_INFINITY)) return 100
  const logVal = Math.max(0, store.matter.log10().toNumber())
  return Math.min(100, Math.floor((logVal / 308.25) * 100))
})

const nextSpMatterFormatted = computed(() => formatNumber(store.nextSingularityPointAt, store.settings.notation))

function handleSingularityReset() {
  // Meydan okuma aktifken buton "Tamamla" moduna geçer: SP yerine challenge ödülü verir
  if (store.activeChallenge) {
    if (!store.canSingularity) return
    if (!store.settings.confirmDialogs) {
      store.completeChallenge()
      return
    }
    showCompleteConfirm.value = true
    return
  }
  if (!store.canSingularity) return
  // QoL: native confirm yerine tek onay diyaloğu (ayarlardan kapatılabilir)
  if (!store.settings.confirmDialogs) {
    store.singularityReset()
    return
  }
  showSingularityConfirm.value = true
}

const showSingularityConfirm = ref(false)
const showCompleteConfirm = ref(false)

// Meydan okuma bağlamı: buton metni + ödül önizlemesi
const inChallenge = computed(() => !!store.activeChallenge)
const challengeRewardShort = computed(() =>
  (store.activeChallengeDef?.rewardDesc || '').replace(/^Kalıcı ödül:\s*/, '')
)
const challengeButtonLabel = computed(() => {
  if (!store.activeChallengeDef) return ''
  if (store.canSingularity) return `Meydan Okumayı Tamamla (${challengeRewardShort.value})`
  return `Meydan: ${store.activeChallengeDef.name} — Hedef 1.79e308 g Kütle`
})
</script>

<template>
  <div class="space-y-3">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="Sunrise"
      icon-class="text-amber-400"
      title="Kozmik Çöküş (Uroboros Tekilliği)"
      :badge="singularityBroken ? '⚡ Planck Sınırı Yıkıldı' : (store.isMatterCapped ? '⚠️ Planck Duvarı Kilitli' : 'Katman 1 Tekillik')"
      :badge-class="singularityBroken ? 'ds-badge-amber' : (store.isMatterCapped ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40' : 'ds-badge-amber')"
      subtitle="Su damlasındaki moleküllerden Samanyolu'na kadar tüm kütle olay ufkunda birleşti! 1.79e308 g Kütleye ulaştığında evreni tek noktaya çökerterek kalıcı Tekillik Puanı (SP) kazan."
      :accent="store.canSingularity ? 'amber' : 'slate'"
    >
      <template #stats>
        <div class="stat-box">
          <Sparkles class="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div class="stat-box-label">Mevcut Tekillik Puanı</div>
            <div class="stat-box-value text-amber-400 tabular-nums">{{ formatNumber(store.singularityPoints, store.settings.notation) }} SP</div>
          </div>
        </div>
        <button
          @click="handleSingularityReset"
          :disabled="!store.canSingularity"
          class="btn-tactile py-2.5 px-5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border"
          :class="store.canSingularity
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 animate-pulse'
            : 'bg-black/30 text-slate-600 border-white/[0.05]'"
        >
          <Sun class="w-4 h-4" />
          <span>
            {{ inChallenge ? challengeButtonLabel : (store.canSingularity ? `Çöküşü Başlat (+${formatNumber(store.singularityGain, store.settings.notation)} SP)` : '1.79e308 g Kütle Gereklidir') }}
          </span>
        </button>
        <div v-if="store.canSingularity && !inChallenge" class="text-[11px] font-mono text-slate-400 flex items-center justify-between w-full pt-1 border-t border-white/5">
          <span>{{ store.hasBreakSingularity ? 'Sonraki +1 SP Eşiği:' : 'Planck Duvarı:' }}</span>
          <span :class="store.hasBreakSingularity ? 'text-amber-300' : 'text-rose-400 font-bold'" class="tabular-nums">
            {{ store.hasBreakSingularity ? `${nextSpMatterFormatted} g Kütle` : 'Kilitli (1.79e308 g Tavanı)' }}
          </span>
        </div>
      </template>
      <template #progress>
        <div class="flex justify-between text-xs font-mono mb-1.5">
          <span class="text-slate-400">Kozmik Çöküş İlerlemesi</span>
          <span class="text-amber-400 font-bold tabular-nums">%{{ progressToSingularity }}</span>
        </div>
        <div class="progress-track progress-track-md progress-track-bordered">
          <div
            class="progress-fill progress-fill-dawn"
            :style="{ width: `${progressToSingularity}%` }"
          ></div>
        </div>
      </template>
    </TabHero>

    <!-- Nöral Ağaç: eski düz SP dükkânının öncüllü kalıcı ağaç hâli -->
    <NeuralTreeTab />

    <!-- Faz 2 Kilometre Taşı: Kolektif Kozmik Tekillik (1e308 g Kütle) -->
    <div
      class="glass-panel-card p-4 rounded-xl border"
      :class="nightWatchUnlocked ? 'border-amber-500/40 bg-amber-950/10' : 'border-white/[0.06]'"
    >
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2">
          <Moon class="w-4 h-4 shrink-0" :class="nightWatchUnlocked ? 'text-amber-400' : 'text-slate-600'" />
          <h3 class="text-xs font-bold font-mono text-slate-200">Kolektif Kozmik Tekillik</h3>
        </div>
        <span class="ds-badge" :class="nightWatchUnlocked ? 'ds-badge-amber' : ''">
          {{ nightWatchUnlocked ? 'FAZ 2 AÇIK' : 'KİLİTLİ' }}
        </span>
      </div>
      <p class="text-[11px] text-slate-400 font-mono leading-relaxed mb-2">
        <span v-if="!nightWatchUnlocked">
          Tüm galaktik madde tek bir noktada yoğunlaşıyor — 2. Çöküş eşiği:
          <span class="text-purple-300 font-bold tabular-nums">1e308 g Kütle</span>. Büyük patlamaya adım adım yaklaş.
        </span>
        <span v-else>
          Faz 2 açıldı: Planck Baskı Matrisi (Corruptions) ve kuantum soketleri yolda. Şimdilik tekillik ilerlemen burada sayılır.
        </span>
      </p>
      <div class="flex justify-between text-xs font-mono mb-1">
        <span class="text-slate-400">Tekillik İlerlemesi</span>
        <span class="tabular-nums font-bold" :class="nightWatchUnlocked ? 'text-amber-400' : 'text-purple-400'">%{{ nightWatchProgress }}</span>
      </div>
      <div class="progress-track progress-track-md progress-track-bordered">
        <div
          class="progress-fill progress-fill-dawn"
          :style="{ width: `${nightWatchProgress}%` }"
        ></div>
      </div>
    </div>

    <!-- QoL: tekillik onay diyaloğu (native confirm yerine) -->
    <ConfirmModal
      v-if="showSingularityConfirm"
      title="Kozmik Çöküş"
      message="Yutulan kütle ve tüm katmanlar sıfırlanacak; karşılığında kalıcı Tekillik Puanı (SP) kazanacaksın. Hazır mısın?"
      confirm-label="Çöküşü Başlat"
      :danger="false"
      @confirm="store.singularityReset(); showSingularityConfirm = false"
      @cancel="showSingularityConfirm = false"
    />

    <!-- QoL: meydan okuma tamamlama onayı (SP yerine challenge ödülü) -->
    <ConfirmModal
      v-if="showCompleteConfirm && store.activeChallengeDef"
      title="Meydan Okumayı Tamamla"
      :message="`“${store.activeChallengeDef.name}” hedefi tuttu (1.79e308 g Kütle). Koşu sıfırlanacak ve kalıcı ödül kazanacaksın: ${store.activeChallengeDef.rewardDesc}. Onaylıyor musun?`"
      confirm-label="Ödülü Al"
      :danger="false"
      @confirm="store.completeChallenge(); showCompleteConfirm = false"
      @cancel="showCompleteConfirm = false"
    />
  </div>
</template>
