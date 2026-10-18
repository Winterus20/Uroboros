<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useGameStore } from "../../stores/game";
import { sounds } from "../../core/audio";
import { Radio, MoonStar, Timer, CloudRain, Disc, Volume2, VolumeX } from "lucide-vue-next";
import { MUSIC_TRACKS } from "../../core/music-engine";
import type { MusicTrackId } from "../../models/types";

const store = useGameStore();

const customUrlInput = ref(store.settings.customAudioUrl || "");
// Modal açıkken store değişirse (başka sekme/senkron) input bayatlamasın.
watch(
  () => store.settings.customAudioUrl,
  (v) => {
    customUrlInput.value = v || "";
  }
);

onMounted(() => {
  // Modal her açıldığında güncel store değerini yansıt (tek kopya bayatlığı düzeltmesi).
  customUrlInput.value = store.settings.customAudioUrl || "";
});

// --- Ses & Lo-Fi Mikser Ayarları ---
function toggleSound() {
  store.settings.soundEnabled = !store.settings.soundEnabled;
  sounds.enabled = store.settings.soundEnabled;
  if (sounds.enabled) sounds.playClick();
}

function updateVolume(e: Event) {
  const target = e.target as HTMLInputElement;
  const val = parseFloat(target.value);
  store.settings.soundVolume = val;
  sounds.volume = val;
}

function toggleMusic() {
  store.toggleMusic();
  sounds.playClick();
}

function updateMusicVolume(e: Event) {
  const target = e.target as HTMLInputElement;
  const val = parseFloat(target.value);
  store.setMusicVolume(val);
}

function selectTrack(trackId: MusicTrackId) {
  store.setMusicTrack(trackId);
  sounds.playClick();
}

function toggleVinyl() {
  store.toggleVinylCrackle();
  sounds.playClick();
}

function toggleRain() {
  store.toggleRain();
  sounds.playClick();
}

function updateRainLevel(e: Event) {
  const target = e.target as HTMLInputElement;
  store.setRainLevel(parseFloat(target.value));
}

function updateIntensity(e: Event) {
  const target = e.target as HTMLInputElement;
  store.setMusicIntensity(parseFloat(target.value));
  sounds.playClick();
}

function setSleepTimer(minutes: number) {
  store.setSleepTimer(minutes);
  sounds.playClick();
}

function saveCustomUrl() {
  store.setCustomAudioUrl(customUrlInput.value);
  sounds.playClick();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Lo-Fi Radyo & Ambient Müzik -->
    <div class="glass-panel-card p-3.5 rounded-xl">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <Radio class="w-4 h-4 text-purple-400" />
          <span class="text-xs font-mono font-bold text-slate-200">Lo-Fi Radyo &amp; Müzik Motoru</span>
        </div>
        <button
          @click="toggleMusic"
          class="btn-tactile px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
          :class="store.settings.musicEnabled ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
        >
          {{ store.settings.musicEnabled ? 'Açık' : 'Kapalı' }}
        </button>
      </div>

      <!-- Ses Seviyesi Slider'ı -->
      <div class="mb-3.5">
        <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
          <span>Radyo Ses Düzeyi</span>
          <span class="text-purple-300 font-bold tabular-nums">%{{ Math.round(store.settings.musicVolume * 100) }}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="store.settings.musicVolume"
          @input="updateMusicVolume"
          :disabled="!store.settings.musicEnabled"
          class="w-full accent-purple-500 cursor-pointer h-1.5 bg-black/40 rounded-lg"
        />
      </div>

      <!-- İstasyon Seçimi -->
      <div class="space-y-1.5 mb-3">
        <div class="text-[11px] font-mono text-slate-400">Radyo İstasyonu</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            v-for="track in MUSIC_TRACKS"
            :key="track.id"
            @click="selectTrack(track.id)"
            class="btn-tactile p-2.5 rounded-xl text-left border text-xs font-mono transition-all cursor-pointer flex flex-col justify-between"
            :class="store.settings.musicTrack === track.id
              ? 'bg-purple-500/15 border-purple-500/50 text-purple-200 shadow-xs'
              : 'bg-black/40 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.14]'"
          >
            <div class="flex items-center gap-1.5 font-bold text-white text-[12px]">
              <span>{{ track.icon }}</span>
              <span class="truncate">{{ track.name }}</span>
              <span v-if="track.bpm > 0" class="ml-auto shrink-0 px-1.5 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] font-mono text-cyan-300 tabular-nums">{{ track.bpm }} BPM</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-1 line-clamp-1">{{ track.subtitle }}</div>
            <div class="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{{ track.description }}</div>
          </button>
        </div>
      </div>

      <!-- Özel Stream URL -->
      <div v-if="store.settings.musicTrack === 'custom'" class="mb-3 space-y-1.5 p-3 rounded-xl bg-purple-500/[0.07] border border-purple-500/30">
        <div class="text-[11px] font-mono text-purple-300 font-bold">Harici Ses / Stream URL</div>
        <div class="flex gap-2">
          <input
            v-model="customUrlInput"
            type="text"
            placeholder="https://.../stream.mp3"
            class="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-400"
          />
          <button
            @click="saveCustomUrl"
            class="btn-tactile px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all cursor-pointer"
          >
            Kaydet
          </button>
        </div>
      </div>

      <!-- Kozmik Rezonans Sıcaklığı (Filtre Cutoff) -->
      <div class="mb-3">
        <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
          <span class="flex items-center gap-1"><MoonStar class="w-3 h-3 text-purple-400" /> Kozmik Rezonans Sıcaklığı (Filtre Yoğunluğu)</span>
          <span class="text-purple-300 font-bold tabular-nums">%{{ Math.round(store.settings.musicIntensity * 100) }}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="store.settings.musicIntensity"
          @change="updateIntensity"
          :disabled="!store.settings.musicEnabled"
          class="w-full accent-purple-400 cursor-pointer h-1.5 bg-black/40 rounded-lg"
        />
        <p class="text-[10px] text-slate-500 mt-1">Daha boğuk ve derin kozmik ton için frekansı yumuşatır.</p>
      </div>

      <!-- Uyku Zamanlayıcısı -->
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
        <div class="flex items-center gap-2">
          <Timer class="w-4 h-4 text-cyan-400/80" />
          <div>
            <div class="text-xs font-mono font-medium text-slate-300">Uyku Zamanlayıcısı</div>
            <div class="text-[10px] text-slate-500">Süre bitince 3 sn fade-out ile otomatik kapanır</div>
          </div>
        </div>
        <div class="flex gap-1">
          <button
            v-for="m in [0, 15, 30, 60]"
            :key="m"
            @click="setSleepTimer(m)"
            class="btn-tactile tabular-nums px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border"
            :class="store.settings.sleepTimerMinutes === m ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
          >
            {{ m === 0 ? 'Kapalı' : m + 'dk' }}
          </button>
        </div>
      </div>
    </div>

    <!-- SFX Synthesizer -->
    <div class="glass-panel-card p-3.5 rounded-xl">
      <div class="flex items-center justify-between mb-3">
        <label class="flex items-center gap-2">
          <component :is="store.settings.soundEnabled ? Volume2 : VolumeX" class="w-4 h-4 text-cyan-300" />
          <span class="text-xs font-mono font-bold text-slate-200">Ses Efektleri (SFX Synthesizer)</span>
        </label>
        <button
          @click="toggleSound"
          class="btn-tactile px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
          :class="store.settings.soundEnabled ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
        >
          {{ store.settings.soundEnabled ? 'Açık' : 'Kapalı' }}
        </button>
      </div>

      <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
        <span>Efekt Ses Düzeyi</span>
        <span class="text-cyan-300 font-bold tabular-nums">%{{ Math.round(store.settings.soundVolume * 100) }}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="store.settings.soundVolume"
        @input="updateVolume"
        :disabled="!store.settings.soundEnabled"
        class="w-full accent-cyan-300 cursor-pointer h-1.5 bg-black/40 rounded-lg"
      />
    </div>

    <!-- Çevre Sesleri Mikseri (Yağmur & Vinil) -->
    <div class="glass-panel-card p-3.5 rounded-xl space-y-3">
      <div class="flex items-center gap-2">
        <CloudRain class="w-4 h-4 text-sky-400" />
        <span class="text-xs font-mono font-bold text-slate-200">Çevre Sesleri Mikseri</span>
      </div>

      <!-- Pencerede Yağmur -->
      <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-mono font-medium text-slate-300">Pencerede Yağmur</div>
            <div class="text-[10px] text-slate-500">Kozmik arka plan ışıması ve kuantum beyaz gürültüsü</div>
          </div>
          <button
            @click="toggleRain"
            class="btn-tactile px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
            :class="store.settings.rainEnabled ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
          >
            {{ store.settings.rainEnabled ? 'Açık' : 'Kapalı' }}
          </button>
        </div>
        <div v-if="store.settings.rainEnabled" class="mt-2 flex items-center gap-2">
          <span class="text-[10px] font-mono text-slate-500">Hafif</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="store.settings.rainLevel"
            @input="updateRainLevel"
            class="flex-1 accent-sky-400 cursor-pointer h-1.5 bg-black/40 rounded-lg"
          />
          <span class="text-[10px] font-mono text-slate-500">Yoğun</span>
        </div>
      </div>

      <!-- Vinil Çıtırtısı -->
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
        <div class="flex items-center gap-2">
          <Disc class="w-4 h-4 text-cyan-400/80" />
          <div>
            <div class="text-xs font-mono font-medium text-slate-300">Analog Vinil / Kaset Cızırtısı</div>
            <div class="text-[10px] text-slate-500">Kozmik sıcaklık için pembe gürültü ve analog çıtırtı</div>
          </div>
        </div>
        <button
          @click="toggleVinyl"
          class="btn-tactile px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
          :class="store.settings.vinylCrackle ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
        >
          {{ store.settings.vinylCrackle ? 'Açık' : 'Kapalı' }}
        </button>
      </div>
    </div>
  </div>
</template>
