<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { CHALLENGES, type ChallengeDef } from '../game/challenges'
import { checkUnlock, unlockProgress, unlockProgressFraction } from '../game/unlocks'
import { Swords } from 'lucide-vue-next'
import TabHero from './TabHero.vue'
import ConfirmModal from './ConfirmModal.vue'

const store = useGameStore()

const completedSet = computed(() => new Set<string>(store.completedChallenges))

function isCompleted(id: string): boolean {
  return completedSet.value.has(id)
}

function isActive(id: string): boolean {
  return store.activeChallenge === id
}

function isLocked(def: ChallengeDef): boolean {
  if (!def.unlock) return false
  return !checkUnlock(store.unlockContext, { id: def.id, name: def.name, hint: '', req: def.unlock, order: def.order })
}

/** Merdiven metni + ilerleme (örn. "3 Sabah 06:00 Çöküşü yaşa · 1/3") */
function lockInfo(def: ChallengeDef): { hint: string; progress: string } {
  if (!def.unlock) return { hint: '', progress: '' }
  const req = def.unlock
  const p = unlockProgress(store.unlockContext, { id: def.id, name: def.name, hint: '', req, order: def.order })
  if (req.kind === 'singularities') {
    return { hint: `${req.count} Kozmik Çöküş yaşa`, progress: `${p.current}/${p.target}` }
  }
  return { hint: 'Kilitli', progress: `${p.current}/${p.target}` }
}

/** Kilit ipucu çubuğu: 0..1 oranı yüzdeye çevirir (dopamin kapıları log ölçekli). */
function lockPercent(def: ChallengeDef): number {
  if (!def.unlock) return 0
  const req = def.unlock
  const feature = { id: def.id, name: def.name, hint: '', req, order: def.order }
  return Math.round(unlockProgressFraction(store.unlockContext, feature) * 100)
}

function bestTime(id: string): string | null {
  const secs = store.challengeBestTimes[id]
  if (typeof secs !== 'number' || !Number.isFinite(secs) || secs < 0) return null
  return formatDuration(secs)
}

function formatDuration(totalSecs: number): string {
  const s = Math.floor(totalSecs)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rest = s % 60
  if (h > 0) return `${h}sa ${m}dk`
  if (m > 0) return `${m}dk ${rest}sn`
  return `${rest}sn`
}

const doneCount = computed(() => store.completedChallenges.length)
const totalCount = CHALLENGES.length
const progressPct = computed(() => Math.round(store.challengeProgress01 * 100))

// BAŞLAT / Vazgeç onay akışı (Header deseni: settings.confirmDialogs kapısı)
const pendingEnter = ref<ChallengeDef | null>(null)
const showExitConfirm = ref(false)

function requestEnter(def: ChallengeDef) {
  if (isLocked(def) || isCompleted(def.id) || store.activeChallenge) return
  if (!store.settings.confirmDialogs) {
    store.enterChallenge(def.id)
    return
  }
  pendingEnter.value = def
}

function confirmEnter() {
  if (pendingEnter.value) store.enterChallenge(pendingEnter.value.id)
  pendingEnter.value = null
}

function requestExit() {
  if (!store.activeChallenge) return
  if (!store.settings.confirmDialogs) {
    store.exitChallenge()
    return
  }
  showExitConfirm.value = true
}

function confirmExit() {
  store.exitChallenge()
  showExitConfirm.value = false
}
</script>

<template>
  <div class="space-y-3">
    <TabHero
      :icon="Swords"
      icon-class="text-rose-400"
      title="Kozmik Kriz Meydan Okumaları"
      :badge="`${doneCount}/${totalCount}`"
      badge-class="ds-badge-rose"
      subtitle="Özel kısıtlamalarla 1.79e308 g Kütleye ulaş: her tamamlanan meydan okuma kalıcı ödül verir. Giriş mevcut koşuyu sıfırlar, çıkış her zaman serbest ve cezasızdır."
      accent="rose"
    >
      <template #stats>
        <div class="stat-box">
          <div>
            <div class="stat-box-label">Tamamlanan Meydan Okuma</div>
            <div class="stat-box-value text-rose-400 tabular-nums">{{ doneCount }}/{{ totalCount }}</div>
          </div>
        </div>
      </template>
      <template v-if="store.activeChallengeDef" #alert>
        <div class="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2 flex items-center gap-2 flex-wrap">
          <span class="text-base leading-none">{{ store.activeChallengeDef.icon }}</span>
          <span class="text-xs font-bold text-rose-200">
            Aktif: {{ store.activeChallengeDef.name }}
          </span>
          <div class="progress-track progress-track-sm progress-track-bordered flex-1 min-w-[120px]">
            <div
              class="progress-fill progress-fill-rose"
              :style="{ width: `${progressPct}%` }"
            ></div>
          </div>
          <span class="text-[11px] font-mono text-rose-300 tabular-nums">%{{ progressPct }}</span>
          <button
            @click="requestExit"
            class="btn-tactile px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 cursor-pointer"
          >
            Vazgeç
          </button>
        </div>
      </template>
    </TabHero>

    <!-- 8 Meydan Okuma Kartı -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <div
        v-for="def in CHALLENGES"
        :key="def.id"
        v-tilt="{ max: 8, scale: 1.015, disabled: !(store.settings.holoCardsEnabled ?? true) }"
        class="card-tilt-surface p-3 rounded-xl border flex flex-col gap-1.5 transition-all relative overflow-hidden"
        :class="isCompleted(def.id)
          ? 'edition-holo bg-cyan-950/40 border-cyan-500/40'
          : isActive(def.id)
            ? 'edition-poly bg-rose-950/40 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
            : isLocked(def)
              ? 'ds-ramp-locked'
              : 'bg-black/30 border-white/[0.07] hover:border-rose-500/30'"
      >
        <div class="flex items-center gap-2">
          <span class="text-xl leading-none" :class="{ 'grayscale': isLocked(def) }">
            {{ isLocked(def) ? '🔒' : def.icon }}
          </span>
          <span
            class="text-xs font-bold"
            :class="isCompleted(def.id) ? 'text-cyan-200' : isActive(def.id) ? 'text-rose-200' : 'text-slate-300'"
          >
            {{ def.name }}
          </span>
          <span class="ml-auto shrink-0">
            <span v-if="isCompleted(def.id)" class="edition-tag edition-tag-holo">✔ HOLO MÜHÜR</span>
            <span v-else-if="isActive(def.id)" class="edition-tag edition-tag-poly animate-pulse">● POLY AKTİF</span>
            <span v-else-if="isLocked(def)" class="ds-badge">KİLİTLİ</span>
          </span>
        </div>
        <div class="text-[11px] text-slate-500 italic leading-snug">{{ def.flavor }}</div>
        <div class="text-[11px] leading-snug line-clamp-2" :class="isLocked(def) ? 'text-slate-600' : 'text-slate-300'">
          {{ def.ruleDesc }}
        </div>
        <div class="text-[11px] leading-snug text-slate-400">
          🎯 1.79e308 g Kütle · 🏆 {{ def.rewardDesc }}
        </div>
        <div v-if="isLocked(def)" class="flex items-center gap-2 min-w-0">
          <span class="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
            {{ lockInfo(def).hint }} · {{ lockInfo(def).progress }}
          </span>
          <span class="progress-track progress-track-mini flex-1" aria-hidden="true">
            <span class="progress-fill progress-fill-slate block h-full" :style="{ width: `${lockPercent(def)}%` }"></span>
          </span>
        </div>
        <div v-if="isActive(def.id)" class="space-y-1">
          <div class="flex justify-between text-[11px] font-mono">
            <span class="text-slate-400">Hedef İlerlemesi</span>
            <span class="text-rose-300 font-bold tabular-nums">%{{ progressPct }}</span>
          </div>
          <div class="progress-track progress-track-sm progress-track-bordered">
            <div
              class="progress-fill progress-fill-rose"
              :style="{ width: `${progressPct}%` }"
            ></div>
          </div>
        </div>
        <div v-if="isCompleted(def.id) && bestTime(def.id)" class="text-[11px] font-mono text-slate-400 tabular-nums">
          ⏱ En iyi süre: <span class="text-cyan-300 font-bold">{{ bestTime(def.id) }}</span>
        </div>
        <div class="mt-auto pt-1 flex gap-2">
          <button
            v-if="isActive(def.id)"
            @click="requestExit"
            class="btn-tactile flex-1 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 text-xs font-bold cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            v-else-if="!isCompleted(def.id) && !isLocked(def)"
            @click="requestEnter(def)"
            :disabled="!!store.activeChallenge"
            class="btn-tactile flex-1 h-9 rounded-xl text-xs font-bold border transition-all"
            :class="store.activeChallenge
              ? 'bg-black/30 text-slate-600 border-white/[0.05] cursor-not-allowed opacity-50'
              : 'bg-rose-500/90 hover:bg-rose-500 text-white border-rose-400 cursor-pointer'"
          >
            BAŞLAT
          </button>
        </div>
      </div>
    </div>

    <!-- Alt Bant: 8/8 Rozeti + Süre Metaları -->
    <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-2">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-lg">🧟</span>
          <div>
            <div class="text-xs font-bold text-slate-200">Zombi Bakışı Rozeti (8/8)</div>
            <div class="text-[11px] text-slate-500">Tüm meydan okumaları tamamla: tüm boyutlar kalıcı +%25</div>
          </div>
        </div>
        <span class="ds-badge tabular-nums" :class="doneCount >= totalCount ? 'ds-badge-cyan' : ''">
          {{ doneCount }}/{{ totalCount }}
        </span>
      </div>
      <div class="progress-track progress-track-sm progress-track-bordered">
        <div
          class="progress-fill progress-fill-cyan"
          :style="{ width: `${(doneCount / Math.max(1, totalCount)) * 100}%` }"
        ></div>
      </div>
      <div class="rounded-xl border border-white/[0.05] bg-black/30 px-3 py-2">
        <div class="text-xs font-bold text-slate-300">⏱ Süre Metalleri</div>
        <div class="text-[11px] text-slate-500 leading-snug">
          En iyi sürelerin toplamına göre kademeli üretim bonusları (Bronz / Gümüş / Altın) bu sekmeye eklenecek —
          hızlı tekrar koşuları rozet avını hızlandıracak.
        </div>
      </div>
    </div>

    <!-- QoL: giriş / çıkış onay diyalogları -->
    <ConfirmModal
      v-if="pendingEnter"
      :title="`${pendingEnter.icon} ${pendingEnter.name}`"
      :message="`Mevcut koşu sıfırlanacak ve “${pendingEnter.name}” kısıtlamasıyla yeni bir koşu başlayacak. Hedef: 1.79e308 g Kütle. Ödül: ${pendingEnter.rewardDesc}. Emin misin?`"
      confirm-label="Meydan Okumaya Başla"
      :danger="true"
      @confirm="confirmEnter"
      @cancel="pendingEnter = null"
    />
    <ConfirmModal
      v-if="showExitConfirm"
      title="Meydan Okumadan Vazgeç"
      message="Mevcut meydan okuma koşusu sıfırlanacak. Ceza yok, ödül yok — dilediğin zaman yeniden başlayabilirsin. Emin misin?"
      confirm-label="Vazgeç"
      :danger="false"
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
  </div>
</template>
