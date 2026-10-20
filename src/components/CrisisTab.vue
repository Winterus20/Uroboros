<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore, CRISIS_INTERVENTIONS } from '../stores/game'
import { getTierAccent, getTierGlyph, getTierIdentity } from '../game/dimension_identity'
import {
  Flame,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Zap,
  Hourglass,
  Magnet,
  Activity,
  Gauge,
  Clock,
  Snowflake,
  TrendingUp
} from 'lucide-vue-next'
import type { CrisisInterventionType } from '../models/types'
import TabHero from './TabHero.vue'

const store = useGameStore()

// Faz C (C5) — kriz kolaj vinyeti: reaktör krizi anında (rose) dekoratif kolaj
// çerçevesi takılır. Yalnız kenar süsü; metin/ramp dokunulmaz.
const hasCrisisCollage = computed(
  () =>
    !!store.activeChallenge ||
    store.crisisBackfireDebuff > 0 ||
    store.reactorPhase === 'meltdown'
)

// D4 (Bölünmüş Dikkat) pasifi: kriz spawn hızını artırır — etkinse hero'da rozet
// Arayüzde "D4" yerine katman glifi ve satır içi görsel okuma (inline visual readout) gösterilir.
const d4Passive = computed(() => {
  const id = getTierIdentity(4)
  if (!store.passiveBadges.d4Anomaly || !id) return null
  return { label: `+${Math.round((id.passive.value - 1) * 100)}%`, desc: id.passive.desc }
})

// Müdahale kademesi (Özellik Merdiveni uyumluluğu):
// Kuantum Sıkıştırma başlangıçta açık, Zaman Genleşmesi / Manyetik Tahliye / Planck Patlaması sırayla açılır
const INTERVENTION_UNLOCK_FEATURES: Partial<Record<CrisisInterventionType, string>> = {
  time_dilation: 'spell_espresso',
  magnetic_vent: 'spell_noise',
  planck_surge: 'spell_sleep'
}

function interventionUnlockFeatureId(type: CrisisInterventionType): string | null {
  return INTERVENTION_UNLOCK_FEATURES[type] || null
}

function isInterventionLocked(type: CrisisInterventionType): boolean {
  const featureId = interventionUnlockFeatureId(type)
  return !!featureId && !store.isFeatureUnlocked(featureId)
}

/**
 * Gösterilecek müdahale kartları.
 *
 * Karar (kilitli içerik gizleme): kilitli müdahaleler hiçbir şekilde
 * render edilmez — ne kilit kartı ne isim ne şart metni. Eskiden kilitli
 * müdahaleler ayrı bir kilit kartı olarak çiziliyordu; o kart artık yok,
 * kilitli müdahale bu filtreyle ızgaradan tamamen düşer.
 */
const visibleInterventions = computed(() =>
  CRISIS_INTERVENTIONS.filter((intv) => !isInterventionLocked(intv.id))
)

function getInterventionIcon(type: CrisisInterventionType) {
  switch (type) {
    case 'quantum_compression':
      return Zap
    case 'time_dilation':
      return Hourglass
    case 'magnetic_vent':
      return Magnet
    case 'planck_surge':
      return Flame
    default:
      return Sparkles
  }
}

// Faz görsel rozetleri ve renk sınıfları
const phaseConfig = computed(() => {
  const phase = store.reactorPhase
  switch (phase) {
    case 'meltdown':
      return {
        label: 'AŞIRI ISINMA (MELTDOWN)',
        badgeClass: 'ds-badge-rose animate-pulse',
        desc: 'Reaktör çekirdeği çöktü! Kütle üretimi %50 yavaşladı. Çekirdek soğuyor...',
        color: '#f43f5e',
        barColor: 'bg-rose-500'
      }
    case 'sweet_spot':
      return {
        label: 'TATLI NOKTA (SWEET SPOT)',
        badgeClass: 'ds-badge-cyan shadow-[0_0_12px_rgba(6,182,212,0.5)]',
        desc: '8× Kütle Akışı, +100% Anomali Hızı, %200 Parazit Primi devrede!',
        // Bonus semantiği = cyan ailesi (rozetle tek hue, S9.2 "bonus = cyan")
        color: '#06b6d4',
        barColor: 'progress-fill-cyan'
      }
    case 'resonance':
      return {
        label: 'REZONANS FAZI',
        badgeClass: 'ds-badge-cyan animate-pulse',
        desc: '+50% Frekans (Hz), +30% Anomali Sıklığı aktif.',
        // Bonus semantiği = cyan ailesi (badge ds-badge-cyan ile aynı hue)
        color: '#06b6d4',
        barColor: 'progress-fill-cyan'
      }
    case 'dormant':
    default:
      return {
        label: 'DURGUN FAZ',
        badgeClass: 'ds-badge-slate',
        desc: 'Standart reaktör durumu (1.0× baz akış).',
        color: '#06b6d4',
        barColor: 'bg-cyan-400'
      }
  }
})

const isMeltdownActive = computed(() => store.reactorMeltdownTimer > 0)

function getCooldown(type: CrisisInterventionType): number {
  return store.reactorCooldowns?.[type] || 0
}

function canCastIntervention(type: CrisisInterventionType): boolean {
  if (isMeltdownActive.value) return false
  if (isInterventionLocked(type)) return false
  if (getCooldown(type) > 0) return false
  if (type === 'magnetic_vent' && (store.reactorCoolantCharges ?? 3) <= 0) return false
  return true
}

// Müdahale butonu uygunluk rampası: meltdown = locked; bekleme/kartuş şarjı = partial; hazır = pulse.
function interventionRampClass(type: CrisisInterventionType): string {
  if (canCastIntervention(type)) return ''
  if (isMeltdownActive.value) return 'ds-ramp-locked'
  if (getCooldown(type) > 0) return 'ds-ramp-partial'
  if (type === 'magnetic_vent' && (store.reactorCoolantCharges ?? 3) <= 0) return 'ds-ramp-partial'
  return 'ds-ramp-locked'
}

function getButtonLabel(type: CrisisInterventionType): string {
  if (isMeltdownActive.value) return 'Reaktör Kilitli (Meltdown)'
  if (type === 'magnetic_vent' && (store.reactorCoolantCharges ?? 3) <= 0) {
    return `Kartuş Boş (${Math.ceil(store.reactorCoolantTimer || 35)}s)`
  }
  const cd = getCooldown(type)
  if (cd > 0) return `Soğuyor (${Math.ceil(cd)}s)`
  return 'Müdahaleyi Gerçekleştir'
}

function handleIntervention(type: CrisisInterventionType) {
  if (!canCastIntervention(type)) return
  store.castCrisisIntervention(type)
}
</script>

<template>
  <div class="space-y-4" :class="{ 'crisis-collage-frame rounded-xl p-2': hasCrisisCollage }">
    <div v-if="hasCrisisCollage" class="collage-checker crisis-dama-strip rounded-sm" aria-hidden="true"></div>
    <!-- Birleşik Hero: Olay Ufku Reaktörü -->
    <TabHero
      :icon="Activity"
      icon-class="text-purple-400"
      title="Kozmik Kriz Yönetimi: Olay Ufku Reaktörü"
      :badge="phaseConfig.label"
      :badge-class="phaseConfig.badgeClass"
      subtitle="Reaktör termal enerjisini yöneterek çekirdeği Tatlı Noktada tut! Süpernova ve Kütle Patlamalarını dondur, parazitleri soğutma tahliyesiyle nakde çevir."
      accent="purple"
    >
      <template #stats>
        <!-- Termal Isı Sayaç Kutusu -->
        <div class="stat-box">
          <Gauge class="w-4 h-4 text-purple-400 shrink-0" />
          <div class="font-mono flex items-baseline gap-1.5">
            <span class="text-sm font-bold tabular-nums" :style="{ color: phaseConfig.color }">
              {{ Math.round(store.reactorHeat) }}%
            </span>
            <span class="text-xs text-slate-500 tabular-nums">Isı Seviyesi</span>
          </div>
          <span class="text-[10px] font-mono text-cyan-400 ml-1 tabular-nums">(-1.2%/sn Soğuma)</span>
        </div>

        <!-- Kriyojenik Rezerv (Kartuşlar) -->
        <div
          class="stat-box flex items-center gap-2 select-none"
        >
          <Snowflake class="w-4 h-4 text-cyan-400 shrink-0" />
          <div class="flex items-center gap-1">
            <div
              v-for="i in 3"
              :key="i"
              class="w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all"
              :class="i <= (store.reactorCoolantCharges ?? 3)
                ? 'bg-cyan-500/25 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                : 'bg-black/50 border-slate-700/60 opacity-40'"
            >
              <div
                v-if="i <= (store.reactorCoolantCharges ?? 3)"
                class="w-1.5 h-1.5 rounded-full bg-cyan-300"
              ></div>
            </div>
          </div>
          <span class="text-[11px] font-mono font-bold text-cyan-300 tabular-nums">
            {{ store.reactorCoolantCharges ?? 3 }}/3
          </span>
          <span
            v-if="(store.reactorCoolantCharges ?? 3) < 3"
            class="text-[10px] font-mono text-cyan-400/80 tabular-nums animate-pulse"
          >
            ({{ Math.ceil(store.reactorCoolantTimer || 35) }}s)
          </span>
        </div>

        <!-- Rezonans Momenti Rozeti (Tatlı Nokta Dinamiği) -->
        <div
          v-if="(store.reactorMomentum && store.reactorMomentum > 1.0) || store.reactorPhase === 'sweet_spot'"
          class="stat-box flex items-center gap-1.5 border-purple-500/40 bg-purple-950/30 select-none shadow-[0_0_10px_rgba(168,85,247,0.2)]"
        >
          <TrendingUp class="w-4 h-4 text-purple-400 shrink-0" />
          <span class="text-xs font-mono font-bold text-purple-300 tabular-nums">
            {{ (store.reactorMomentum || 1.0).toFixed(2) }}× Momentum
          </span>
        </div>

        <!-- D4 Pasif Rozeti (katman glifi + kimlik aksanı) -->
        <span
          v-if="d4Passive"
          class="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/25 shrink-0 select-none flex items-center gap-1"
        >
          <span class="dim-glyph" :class="getTierAccent(4)">{{ getTierGlyph(4) }}</span>
          <span class="tabular-nums" :class="getTierAccent(4)">{{ d4Passive.label }}</span>
        </span>
      </template>

      <!-- İnteraktif Termal Reaktör Barı & Faz Durumu -->
      <template #progress>
        <div class="space-y-1.5 w-full">
          <div class="progress-track progress-track-lg progress-track-bordered relative w-full h-4 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
            <!-- Dilim Arka Plan Bölgeleri -->
            <div class="absolute inset-0 flex text-[9px] font-mono pointer-events-none opacity-40">
              <div class="w-[30%] border-r border-white/20 bg-cyan-950/30"></div>
              <div class="w-[30%] border-r border-white/20 bg-amber-950/30"></div>
              <div class="w-[30%] border-r border-rose-500/30 bg-purple-950/30"></div>
              <div class="w-[10%] bg-rose-950/40"></div>
            </div>

            <!-- Dinamik Dolum Çubuğu (Faz E: `progress-fill` tabanı — oran=çubuk dili) -->
            <div
              class="h-full rounded-full transition-all duration-200 relative"
              :class="['progress-fill', phaseConfig.barColor]"
              :style="{ width: `${Math.min(100, Math.max(0, store.reactorHeat))}%` }"
            >
              <div
                v-if="store.reactorPhase === 'sweet_spot'"
                class="absolute inset-0 animate-pulse bg-white/30"
              ></div>
            </div>
          </div>

          <!-- Dilim Eşik Etiketleri -->
          <div class="flex justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>Durgun (%0-30)</span>
            <span>Rezonans (%31-60)</span>
            <span class="text-purple-400 font-bold">Tatlı Nokta (%61-90)</span>
            <span class="text-rose-400">Meltdown (%100)</span>
          </div>

          <!-- Aktif Faz Getiri Bilgisi -->
          <div class="flex items-center justify-between text-[11px] font-mono px-1 pt-1 border-t border-white/[0.08] mt-1 text-slate-300">
            <span class="text-slate-400">Reaktör Çıktısı:</span>
            <span class="font-bold text-right" :style="{ color: phaseConfig.color }">
              {{ phaseConfig.desc }}
            </span>
          </div>
        </div>
      </template>

      <!-- Meltdown Uyarısı -->
      <template #alert>
        <div
          v-if="isMeltdownActive"
          class="p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center justify-between gap-2 animate-pulse"
        >
          <div class="flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-rose-400 shrink-0" />
            <span class="tabular-nums font-bold">
              ⚠️ KRİTİK ERİME (MELTDOWN): Reaktör aşırı yüklendi! Üretim %50 yavaşladı!
            </span>
          </div>
          <span class="text-rose-200 font-mono font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30 tabular-nums">
            Kalan: {{ Math.ceil(store.reactorMeltdownTimer) }} sn
          </span>
        </div>
      </template>
    </TabHero>

    <!-- Canlı Fırsat İkilemi (Dilemma Banner) -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <div
        v-if="store.activeCrisisDilemma"
        class="glass-panel-card p-4 rounded-xl border-purple-500/50 bg-gradient-to-r from-purple-950/40 via-[var(--ds-panel)] to-purple-950/40 shadow-[0_0_20px_rgba(168,85,247,0.25)] relative overflow-hidden"
      >
        <!-- Kalan Süre Çubuğu -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-black/40">
          <div
            class="h-full bg-gradient-to-r from-purple-400 to-amber-400 transition-all duration-100"
            :style="{ width: `${(store.activeCrisisDilemma.timeLeft / store.activeCrisisDilemma.duration) * 100}%` }"
          ></div>
        </div>

        <div class="flex items-start justify-between gap-3 mb-2 pt-1">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚡</span>
            <div>
              <h3 class="text-sm font-bold font-mono text-purple-200">
                {{ store.activeCrisisDilemma.title }}
              </h3>
              <p class="text-xs text-slate-300 mt-0.5">
                {{ store.activeCrisisDilemma.desc }}
              </p>
            </div>
          </div>

          <div
            class="flex items-center gap-1.5 text-xs font-mono font-bold shrink-0 bg-black/40 px-2 py-1 rounded-lg border"
            :class="isMeltdownActive ? 'text-rose-300 border-rose-500/30' : 'text-slate-300 border-white/10'"
          >
            <Clock class="w-3.5 h-3.5 animate-spin" :class="isMeltdownActive ? 'text-rose-400' : 'text-slate-400'" />
            <span class="tabular-nums">{{ Math.ceil(store.activeCrisisDilemma.timeLeft) }}s</span>
          </div>
        </div>

        <!-- İkilem Seçenekleri -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          <button
            v-for="opt in store.activeCrisisDilemma.options"
            :key="opt.id"
            @click="store.chooseCrisisDilemmaOption(opt.id)"
            class="btn-tactile text-left p-3 rounded-xl border border-white/10 hover:border-purple-400/60 bg-black/40 hover:bg-purple-950/30 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div class="flex items-center justify-between text-xs font-mono font-bold text-purple-300 group-hover:text-purple-200">
                <span>{{ opt.label }}</span>
                <Sparkles class="w-3.5 h-3.5 text-purple-400 opacity-60 group-hover:opacity-100" />
              </div>
              <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {{ opt.desc }}
              </p>
            </div>
          </button>
        </div>
      </div>
    </transition>

    <!--
      4 Taktiksel Müdahale Kartı — kilitli müdahaleler LİSTEDEN ÇIKARILIR
      (visibleInterventions): hiçbir kart çizilmez. Karar: kilitli seyler
      görünmeyecek; sadece kilidi açıldığında görünecek. Önceden burada
      ayrı bir kilit kartı vardı.
    -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <template v-for="intv in visibleInterventions" :key="intv.id">
        <div
          class="glass-panel-card p-4 rounded-xl flex flex-col justify-between transition-all"
          :class="isMeltdownActive ? 'opacity-50 grayscale' : 'hover:border-purple-500/40'"
        >
          <div>
            <!-- Üst Başlık & İkon & Isı Değişimi -->
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="flex items-center gap-2.5">
                <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-center">
                  <component :is="getInterventionIcon(intv.id)" class="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 class="text-sm font-bold font-mono text-slate-100">{{ intv.name }}</h3>
                  <span
                    class="text-[11px] font-mono font-bold tabular-nums"
                    :class="intv.heatChange > 0 ? 'text-rose-400' : 'text-cyan-400'"
                  >
                    {{ intv.heatChange > 0 ? `+${intv.heatChange}% Isı` : `${intv.heatChange}% Soğutma` }}
                  </span>
                </div>
              </div>

              <!-- Risk / Soğutma / Cooldown Rozeti -->
              <div class="flex items-center gap-1.5">
                <span
                  v-if="intv.id === 'magnetic_vent'"
                  class="ds-badge"
                  :class="(store.reactorCoolantCharges ?? 3) > 0 ? 'ds-badge-cyan' : 'ds-badge-rose animate-pulse'"
                >
                  Kartuş: {{ store.reactorCoolantCharges ?? 3 }}/3
                </span>
                <span
                  v-else-if="getCooldown(intv.id) > 0"
                  class="ds-badge ds-badge-slate animate-pulse"
                >
                  Bekleme: {{ Math.ceil(getCooldown(intv.id)) }}s
                </span>
                <span
                  v-else
                  class="ds-badge"
                  :class="intv.heatChange < 0 ? 'ds-badge-cyan' : intv.heatChange > 30 ? 'ds-badge-rose' : 'ds-badge-slate'"
                >
                  {{ intv.heatChange < 0 ? 'Soğutma Valfi' : intv.heatChange > 30 ? 'Yüksek Risk' : 'Dengeli' }}
                </span>
              </div>
            </div>

            <!-- Açıklama -->
            <p class="text-xs text-slate-300 mt-2 leading-relaxed">
              {{ intv.desc }}
            </p>

            <!-- Taktiksel İpucu -->
            <div
              class="text-[10px] font-mono text-purple-300/90 mt-2.5 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-center gap-1.5"
            >
              <ShieldAlert class="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span>{{ intv.tacticalTip }}</span>
            </div>
          </div>

          <!-- Uygula Butonu -->
          <button
            @click="handleIntervention(intv.id)"
            :disabled="!canCastIntervention(intv.id)"
            class="btn-tactile mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all border"
            :class="!canCastIntervention(intv.id)
              ? ['bg-black/30 text-slate-500 border-white/[0.05] cursor-not-allowed', interventionRampClass(intv.id)]
              : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/50 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.2)] affordance-pulse'"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ getButtonLabel(intv.id) }}</span>
          </button>
        </div>
      </template>
    </div>

    <!-- İstatistik & Bilgi Kutusu -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between text-xs font-mono text-slate-400 flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <Flame class="w-4 h-4 text-purple-400" />
        <span>Kullanılan Toplam Kararlar:</span>
        <span class="text-purple-300 font-bold tabular-nums">{{ store.stats.spellsCast || 0 }}</span>
      </div>
      <div class="text-[11px] text-slate-500">
        Reaktör boşta kaldığında saniyede -%1.2 doğal olarak soğur.
      </div>
    </div>
    <div v-if="hasCrisisCollage" class="collage-checker crisis-dama-strip rounded-sm" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
.crisis-dama-strip {
  opacity: max(0.32, calc(var(--substrate-opacity, 0.25) * 1.1));
}
</style>
