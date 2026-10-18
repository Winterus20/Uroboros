<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useGameStore } from "../../stores/game";
import { Play, Pause, SkipForward } from "lucide-vue-next";
import { musicEngine, MUSIC_TRACKS } from "../../core/music-engine";
import { useMotionMode, useMotionReduced } from "../../composables/useMotion";

const emit = defineEmits<{ (e: "open-settings"): void }>();

const store = useGameStore();

const visualizerBars = ref<number[]>([0.3, 0.5, 0.4, 0.6]);
let visualizerInterval: number | null = null;

const currentTrackInfo = computed(() => {
  return MUSIC_TRACKS.find((t) => t.id === store.settings.musicTrack) || MUSIC_TRACKS[0];
});

function toggleMusic(): void {
  store.toggleMusic();
}

function nextTrack(): void {
  store.nextMusicTrack();
}

// 3 durumlu hareket kapısı: ekolayzer örnekleme aralığı.
// 'off' → interval HİÇ kurulmaz (barlar statik); kısıtlı (reduced/OS) → 300ms; full → 100ms.
// Faz E (E3): kısıtlı terimi tek kaynak (`useMotionReduced`) — OS boşluğu kapandı.
const motionMode = useMotionMode();
const motionReduced = useMotionReduced();

function visualizerIntervalMs(): number | null {
  if (motionMode.value === "off") return null;
  if (motionReduced.value) return 300;
  return 100;
}

function restartVisualizer(): void {
  if (visualizerInterval !== null) {
    clearInterval(visualizerInterval);
    visualizerInterval = null;
  }
  const intervalMs = visualizerIntervalMs();
  if (intervalMs === null) return;
  visualizerInterval = window.setInterval(() => {
    if (store.settings.musicEnabled) {
      const data = musicEngine.getVisualizerData();
      visualizerBars.value = data;
    } else {
      visualizerBars.value = [0.15, 0.15, 0.15, 0.15];
    }
  }, intervalMs);
}

onMounted(() => {
  restartVisualizer();
});

// Ayar/OS değişince canlı uygula: interval durur / sadeleşir / normal hıza döner.
watch([motionMode, motionReduced], () => {
  restartVisualizer();
});

onUnmounted(() => {
  if (visualizerInterval !== null) {
    clearInterval(visualizerInterval);
    visualizerInterval = null;
  }
});
</script>

<template>
  <div class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 border border-cyan-500/25 text-[11px] shadow-sm">
    <div class="flex items-end gap-0.5 h-3 px-0.5">
      <span
        v-for="(lvl, idx) in visualizerBars"
        :key="idx"
        class="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-purple-400 transition-all duration-100"
        :style="{ height: `${Math.max(20, lvl * 100)}%` }"
      ></span>
    </div>

    <button
      @click="emit('open-settings')"
      aria-label="Frekans ayarlarını aç"
      class="font-mono font-medium text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer truncate max-w-[110px] sm:max-w-[160px]"
    >
      <span class="text-xs">{{ currentTrackInfo.icon }}</span>
      <span class="truncate font-semibold">{{ currentTrackInfo.name }}</span>
    </button>

    <span class="text-slate-700">|</span>

    <button
      @click="toggleMusic"
      aria-label="Kuantum sinyalini başlat veya duraklat"
      class="hit-44 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
    >
      <component :is="store.settings.musicEnabled ? Pause : Play" class="w-3 h-3 text-cyan-400" />
    </button>

    <button
      @click="nextTrack"
      aria-label="Sonraki kuantum kanalı"
      class="hit-44 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
    >
      <SkipForward class="w-3 h-3 text-purple-400" />
    </button>
  </div>
</template>
