<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { getAchievement } from '../game/achievements'

const store = useGameStore()

// Kuyruk pompası: her bildirim 4 sn görünür, sonra sıradaki gelir.
// Üst üste açılan başarımlar takılmadan sırayla akar.
let timer: number | null = null

function pumpQueue() {
  if (timer !== null) return
  if (store.achievementToastQueue.length === 0) return
  timer = window.setTimeout(() => {
    timer = null
    const first = store.achievementToastQueue[0]
    if (first) store.dismissAchievementToast(first)
    if (store.achievementToastQueue.length > 0) pumpQueue()
  }, 4000)
}

function goToAchievements(id: string): void {
  store.dismissAchievementToast(id)
  window.dispatchEvent(new CustomEvent('uroboros:goto-achievements'))
}

watch(
  () => store.achievementToastQueue.length,
  () => {
    pumpQueue()
  }
)

onUnmounted(() => {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
})
</script>

<template>
  <!-- role="status" + aria-live="polite": başarım açılışları ekran okuyucuya duyurulur.
       Toast bir modal değildir; odak tuzağı ve sekme döngüsü burada bilinçli olarak YOK. -->
  <div
    role="status"
    aria-live="polite"
    class="layer-toast fixed bottom-4 right-4 flex flex-col gap-2 w-72 max-w-[calc(100vw-2rem)] z-50"
  >
    <div
      v-for="id in store.achievementToastQueue"
      :key="id"
      class="glass-panel p-3 rounded-xl border border-amber-500/40 bg-[var(--ds-panel-strong)] flex items-start gap-2.5 cursor-pointer overflow-hidden relative"
      @click="store.dismissAchievementToast(id)"
    >
      <span class="toast-progress" aria-hidden="true"></span>
      <span class="text-2xl leading-none shrink-0">{{ getAchievement(id)?.icon || '🏆' }}</span>
      <div class="min-w-0 flex-1">
        <div class="text-[11px] font-semibold text-amber-400">Başarım kazanıldı!</div>
        <div class="text-sm font-bold text-white truncate">{{ getAchievement(id)?.name || id }}</div>
        <div v-if="getAchievement(id)?.reward" class="text-[11px] text-cyan-300 font-mono mt-0.5">
          {{ getAchievement(id)?.reward?.desc }}
        </div>
        <div class="flex items-center gap-2 mt-1.5">
          <button
            type="button"
            class="px-2 py-1 rounded-md text-[11px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25 transition-colors cursor-pointer"
            @click.stop="goToAchievements(id)"
          >
            İncele
          </button>
          <span class="text-[10px] text-slate-600">kapatmak için dokun</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  width: 100%;
  transform-origin: left;
  background: rgba(245, 158, 11, 0.7);
  animation: toast-shrink 4s linear forwards;
  pointer-events: none;
}

@keyframes toast-shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
</style>
