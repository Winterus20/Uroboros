<script setup lang="ts">
import { useGameStore } from "../../stores/game";
import { sounds } from "../../core/audio";
import type { NotationType } from "../../core/format";
import { Hash, BatteryCharging } from "lucide-vue-next";

withDefaults(
  defineProps<{
    section?: "gameplay" | "visuals";
  }>(),
  { section: "gameplay" }
);

const store = useGameStore();

const notations: Array<{ id: NotationType; label: string; example: string }> = [
  { id: "standard", label: "Standart (Harf)", example: "1.23 Qa" },
  { id: "scientific", label: "Bilimsel (Scientific)", example: "1.23e45" },
  { id: "engineering", label: "Mühendislik", example: "12.3e42" },
  { id: "logarithm", label: "Logaritmik", example: "e45.12" }
];

// --- Oynanış Ayarları ---
function setNotation(type: NotationType) {
  store.settings.notation = type;
  sounds.playClick();
}

function setDecimalPlaces(places: number) {
  store.settings.decimalPlaces = places;
  sounds.playClick();
}

function toggleConfirmDialogs() {
  store.settings.confirmDialogs = !store.settings.confirmDialogs;
  sounds.playClick();
}

function toggleOfflineProgressModal() {
  store.settings.offlineProgressModal = !store.settings.offlineProgressModal;
  sounds.playClick();
}

function toggleHotkeys() {
  store.settings.hotkeysEnabled = !store.settings.hotkeysEnabled;
  sounds.playClick();
}

// --- Görsel & Performans Ayarları ---
function toggleBatterySaver() {
  store.settings.batterySaver = !store.settings.batterySaver;
  sounds.playClick();
}

// 3 durumlu hareket kontrolü: Tam / Azaltılmış / Kapalı
function setMotionMode(mode: 'full' | 'reduced' | 'off') {
  store.settings.motionMode = mode;
  store.settings.reduceAnimations = mode !== 'full';
  sounds.playClick();
}

const motionOptions = [
  { value: 'full' as const, label: 'Tam' },
  { value: 'reduced' as const, label: 'Azaltılmış' },
  { value: 'off' as const, label: 'Kapalı' }
];

function toggleScreenShake() {
  store.settings.screenShake = !(store.settings.screenShake ?? true);
  sounds.playClick();
}

function setJuiceMode(mode: "calm" | "balanced" | "tilt") {
  store.settings.juiceMode = mode;
  sounds.playClick();
}

function toggleHoloCards() {
  store.settings.holoCardsEnabled = !(store.settings.holoCardsEnabled ?? true);
  sounds.playClick();
}

function toggleScreenOverlay() {
  store.settings.screenOverlayEffects = !(store.settings.screenOverlayEffects ?? true);
  sounds.playClick();
}

function toggleSideHands() {
  store.settings.sideHands = !(store.settings.sideHands ?? true);
  sounds.playClick();
}

function toggleSequentialStrike() {
  store.settings.sequentialStrike = !(store.settings.sequentialStrike ?? true);
  sounds.playClick();
}

function setSwirlShaderQuality(quality: "off" | "balanced" | "high") {
  store.settings.swirlShaderQuality = quality;
  sounds.playClick();
}

function toggleFloatingTexts() {
  store.settings.floatingTexts = !(store.settings.floatingTexts ?? true);
  sounds.playClick();
}

function toggleNewsTicker() {
  store.settings.newsTickerEnabled = !(store.settings.newsTickerEnabled ?? true);
  sounds.playClick();
}

function setSwipeSensitivity(val: "balanced" | "low" | "off") {
  store.settings.swipeSensitivity = val;
  sounds.playClick();
}
</script>

<template>
  <!-- =================== OYNANIŞ & QOL =================== -->
  <div v-if="section === 'gameplay'" class="space-y-4">
    <!-- Sayı Notasyonu -->
    <div class="glass-panel-card p-3.5 rounded-xl">
      <div class="flex items-center gap-2 mb-2.5">
        <Hash class="w-4 h-4 text-cyan-300" />
        <span class="text-xs font-mono font-bold text-slate-200">Sayı Notasyonu</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          v-for="item in notations"
          :key="item.id"
          @click="setNotation(item.id)"
          class="btn-tactile p-2.5 rounded-xl text-left border text-xs font-mono transition-all cursor-pointer flex flex-col justify-between"
          :class="store.settings.notation === item.id
            ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-xs'
            : 'bg-black/40 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.14]'"
        >
          <div class="font-bold flex items-center justify-between">
            <span>{{ item.label }}</span>
            <span v-if="store.settings.notation === item.id" class="text-cyan-400 text-[10px]">● Aktif</span>
          </div>
          <div class="text-[10px] text-slate-500 mt-1 tabular-nums">Örn: {{ item.example }}</div>
        </button>
      </div>
    </div>

    <!-- Sayı Hassasiyeti (Ondalık Basamak) -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Sayı Hassasiyeti (Ondalık)</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Büyük sayılarda virgülden sonra kaç basamak gösterilsin</div>
      </div>
      <div class="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.06]">
        <button
          @click="setDecimalPlaces(2)"
          class="px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer"
          :class="(store.settings.decimalPlaces ?? 2) === 2 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'"
        >
          2 Basamak (1.23)
        </button>
        <button
          @click="setDecimalPlaces(3)"
          class="px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer"
          :class="(store.settings.decimalPlaces ?? 2) === 3 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'"
        >
          3 Basamak (1.234)
        </button>
      </div>
    </div>

    <!-- Onay Pencereleri -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Kritik Onay Pencereleri</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Kozmik Çöküş, Boyutsal Hasat ve Kayıt Yüklemede onay sor</div>
      </div>
      <button
        @click="toggleConfirmDialogs"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="store.settings.confirmDialogs ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ store.settings.confirmDialogs ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Çevrimdışı İlerleme Karşılama Ekranı -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Çevrimdışı İlerleme Bildirimi</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Oyuna dönüldüğünde kazanılan kütle raporunu aç</div>
      </div>
      <button
        @click="toggleOfflineProgressModal"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.offlineProgressModal !== false) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.offlineProgressModal !== false) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Klavye Kısayolları -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Klavye Kısayolları</div>
        <div class="text-[10px] text-slate-400 mt-0.5">1-9 sekme geçişi, M (Max All), Space (Kaydır) tuşları</div>
      </div>
      <button
        @click="toggleHotkeys"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.hotkeysEnabled !== false) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.hotkeysEnabled !== false) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>
  </div>

  <!-- =================== GÖRSEL & EKRAN =================== -->
  <div v-else-if="section === 'visuals'" class="space-y-4">
    <!-- Pil & Performans Tasarrufu -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between bg-gradient-to-r from-cyan-500/[0.08] to-transparent border-cyan-500/30">
      <div class="flex items-center gap-2.5">
        <div class="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
          <BatteryCharging class="w-4 h-4" />
        </div>
        <div>
          <div class="text-xs font-mono font-bold text-cyan-200">Pil &amp; Düşük GPU Tasarrufu</div>
          <div class="text-[10px] text-slate-400 mt-0.5">Neon blur ve ağır filtreleri kapatarak CPU/GPU yükünü en aza indirir</div>
        </div>
      </div>
      <button
        @click="toggleBatterySaver"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="store.settings.batterySaver ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ store.settings.batterySaver ? 'Aktif' : 'Kapalı' }}
      </button>
    </div>

    <!-- Animasyon Seviyesi -->
    <!-- Hareket Kontrolü (3 durum: Tam / Azaltılmış / Kapalı — prefers-reduced-motion ruhu) -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between gap-3">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Hareket Kontrolü</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Tam: tüm animasyon · Azaltılmış: nabız/parıltı söner · Kapalı: hiçbir hareket yok</div>
      </div>
      <div class="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.06] shrink-0">
        <button
          v-for="opt in motionOptions"
          :key="opt.value"
          @click="setMotionMode(opt.value)"
          class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer border"
          :class="(store.settings.motionMode ?? (store.settings.reduceAnimations ? 'reduced' : 'full')) === opt.value
            ? 'bg-white/[0.10] text-white border-white/25'
            : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Ekran Sarsıntısı (Screen Shake) -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Ekran Sarsıntısı (Screen Shake)</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Sıçrama, kriz ve büyük kilometre taşlarında taktil ekran titreşimi</div>
      </div>
      <button
        @click="toggleScreenShake"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.screenShake ?? true) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.screenShake ?? true) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Balatro Juice Modu -->
    <div class="glass-panel-card p-3.5 rounded-xl">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-mono font-semibold text-slate-200">Balatro Juice &amp; Taktil Geri Bildirim</div>
        <span class="text-[10px] font-mono text-purple-300">Tıklama darbeleri ve dinamizm</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          @click="setJuiceMode('calm')"
          class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
          :class="(store.settings.juiceMode ?? 'balanced') === 'calm'
            ? 'bg-slate-500/20 text-slate-200 border-slate-400/40'
            : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
        >
          Sade (Calm)
        </button>
        <button
          @click="setJuiceMode('balanced')"
          class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
          :class="(store.settings.juiceMode ?? 'balanced') === 'balanced'
            ? 'bg-white/[0.10] text-white border-white/25'
            : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
        >
          Dengeli (Önerilen)
        </button>
        <button
          @click="setJuiceMode('tilt')"
          class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
          :class="(store.settings.juiceMode ?? 'balanced') === 'tilt'
            ? 'bg-white/[0.10] text-white border-white/25'
            : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
        >
          Full Tilt (Parti)
        </button>
      </div>
    </div>

    <!-- Balatro Paint Swirl Shader Mimarisi -->
    <div class="glass-panel-card p-3.5 rounded-xl flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-mono font-semibold text-slate-200">Algoritma Arka Plan Girdabı (Balatro Swirl)</div>
          <div class="text-[10px] text-slate-400 mt-0.5">Frekans (Hz) ve krizlerle dalgalanan canlı GLSL akışkan shader</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-1">
        <button
          @click="setSwirlShaderQuality('high')"
          class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
          :class="(store.settings.swirlShaderQuality ?? 'balanced') === 'high'
            ? 'bg-white/[0.10] text-white border-white/25'
            : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
        >
          Yüksek (0.75x)
        </button>
        <button
          @click="setSwirlShaderQuality('balanced')"
          class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
          :class="(store.settings.swirlShaderQuality ?? 'balanced') === 'balanced'
            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
            : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
        >
          Dengeli (0.5x Retro)
        </button>
        <button
          @click="setSwirlShaderQuality('off')"
          class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
          :class="(store.settings.swirlShaderQuality ?? 'balanced') === 'off'
            ? 'bg-white/[0.10] text-white border-white/25'
            : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
        >
          Kapalı (Statik)
        </button>
      </div>
    </div>

    <!-- 3D Kart & Holo Kaplamaları -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">3D Kart &amp; Holografik Kaplamalar</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Kartlarda fareyi takip eden 3D eğilme ve foil/holo parıltısı</div>
      </div>
      <button
        @click="toggleHoloCards"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.holoCardsEnabled ?? true) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.holoCardsEnabled ?? true) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Laboratuvar Ekran Dokuları -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Laboratuvar Ekran Dokuları (Optik / Çatlak)</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Taktil başparmak izi lekesi ve kriz anlarında cam çatlağı</div>
      </div>
      <button
        @click="toggleScreenOverlay"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.screenOverlayEffects ?? true) ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.screenOverlayEffects ?? true) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Yan Şıklatan Eller -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Yan Şıklatan Eller</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Ekranın iki yanında eli şıklatan 4 karelik döngü (tıklamada hızlanır)</div>
      </div>
      <button
        @click="toggleSideHands"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.sideHands ?? true) ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.sideHands ?? true) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Balatro Sütun 2: Sıralı Çekim Vuruşu -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Sıralı Çekim Vuruşu (Balatro Pop-Chain)</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Kütle yutmada çarpanların sırayla patladığı görsel kaskad ve yükselen ses arpeji</div>
      </div>
      <button
        @click="toggleSequentialStrike"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.sequentialStrike ?? true) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.sequentialStrike ?? true) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Uçan Yazılar & Efektler -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Uçan Kütle / Kazanç Sayıları</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Yutma ve kriz tıklamalarında beliren +Kütle yazılarını göster</div>
      </div>
      <button
        @click="toggleFloatingTexts"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.floatingTexts ?? true) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.floatingTexts ?? true) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Haber Bandı (News Ticker) -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
      <div>
        <div class="text-xs font-mono font-semibold text-slate-200">Kozmik Telemetri Haber Bandı</div>
        <div class="text-[10px] text-slate-400 mt-0.5">Üstte akan laboratuvar ve kozmik haber bandı</div>
      </div>
      <button
        @click="toggleNewsTicker"
        class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
        :class="(store.settings.newsTickerEnabled ?? true) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
      >
        {{ (store.settings.newsTickerEnabled ?? true) ? 'Açık' : 'Kapalı' }}
      </button>
    </div>

    <!-- Mobil Ekran Kaydırma & Fiske Jest Hassasiyeti -->
    <div class="glass-panel-card p-3.5 rounded-xl space-y-2.5">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-mono font-semibold text-slate-200">Mobil Ekran Jest Hassasiyeti</div>
          <div class="text-[10px] text-slate-400 mt-0.5">Ekranda yukarı kaydırarak manuel kütle üretme jesti</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-1.5 pt-0.5">
        <button
          type="button"
          @click="setSwipeSensitivity('balanced')"
          class="px-2 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all text-center cursor-pointer"
          :class="(store.settings.swipeSensitivity ?? 'balanced') === 'balanced' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-400 border-white/[0.06] hover:text-slate-200'"
        >
          Dengeli
        </button>
        <button
          type="button"
          @click="setSwipeSensitivity('low')"
          class="px-2 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all text-center cursor-pointer"
          :class="store.settings.swipeSensitivity === 'low' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/40 text-slate-400 border-white/[0.06] hover:text-slate-200'"
        >
          Düşük (Sert)
        </button>
        <button
          type="button"
          @click="setSwipeSensitivity('off')"
          class="px-2 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all text-center cursor-pointer"
          :class="store.settings.swipeSensitivity === 'off' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/40 text-slate-400 border-white/[0.06] hover:text-slate-200'"
        >
          Kapalı
        </button>
      </div>
      <div class="text-[10px] text-slate-400 font-mono">
        {{ (store.settings.swipeSensitivity ?? 'balanced') === 'off' ? 'Jest kapalı: Sayfa kaydırırken asla tıklama yapmaz. Yalnızca butonla yutulur.' : (store.settings.swipeSensitivity ?? 'balanced') === 'low' ? 'Düşük hassasiyet: Yalnızca hızlı ve sert fiske hareketleri kabul edilir.' : 'Dengeli: Sayfa kaydırmaları elenir; kasıtlı hızlı fiskeler kütle üretir.' }}
      </div>
    </div>
  </div>
</template>
