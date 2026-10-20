<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useGameStore } from "./stores/game";
import { SaveSystem } from "./core/save";
import { gameLoop } from "./core/game-loop";
import { musicEngine } from "./core/music-engine";
import AlgorithmicSwirl from "./components/AlgorithmicSwirl.vue";
import JuiceLayer from "./components/JuiceLayer.vue";
import SequentialStrikeLayer from "./components/SequentialStrikeLayer.vue";
import HeartBurstLayer from "./components/HeartBurstLayer.vue";
import CommentTicker from "./components/CommentTicker.vue";
import FloatingThumbBar from "./components/FloatingThumbBar.vue";
import ScreenOverlay from "./components/ScreenOverlay.vue";
import SideSnapHands from "./components/SideSnapHands.vue";
import MotifBand from "./components/MotifBand.vue";
import Header from "./components/Header.vue";
import DimensionsTab from "./components/DimensionsTab.vue";
import LabTab from "./components/LabTab.vue";
import CrisisTab from "./components/CrisisTab.vue";
import AutobuyersTab from "./components/AutobuyersTab.vue";
import SingularityTab from "./components/SingularityTab.vue";
import ChallengesTab from "./components/ChallengesTab.vue";
import ColonyTab from "./components/ColonyTab.vue";
import AchievementsTab from "./components/AchievementsTab.vue";
import AchievementToast from "./components/AchievementToast.vue";
import StatsTab from "./components/StatsTab.vue";
import SettingsModal from "./components/SettingsModal.vue";
import WelcomeBackModal from "./components/WelcomeBackModal.vue";
import AnomalyOverlay from "./components/AnomalyOverlay.vue";
import TimeClockOverlay from "./components/TimeClockOverlay.vue";
import AdminPanel from "./components/AdminPanel.vue";
import AuthModal from "./components/AuthModal.vue";
import CloudConflictModal from "./components/CloudConflictModal.vue";
import ConfirmModal from "./components/ConfirmModal.vue";
import { useAuthStore } from "./stores/auth";
import { Layers, BarChart3, Bot, FlaskConical, Zap, Sunrise, Trophy, Network, Swords, Lock } from "lucide-vue-next";
import { useNavigation, NAV_BTN, navClass, navLabelClass } from "./composables/useNavigation";
import { useModals } from "./composables/useModals";
import { corruptionStamp } from "./game/corruption";

export type { TabId } from "./composables/useNavigation";

const store = useGameStore();
const authStore = useAuthStore();

const {
  activeTab,
  navRef,
  isMobile,
  transitionName,
  nextUnlockLabel,
  nextUnlockPercent,
  arcPercent,
  arcBandName,
  hasHarvestableTrend,
  hasCrisisAlert,
  hasBotAlert,
  switchTab,
  switchTabByOffset,
  handleSwipeStart,
  handleSwipeEnd
} = useNavigation({
  isSwipeBlocked: () => showSettings.value || showAdmin.value || saveIssue.value !== null
});

const { showSettings, showAdmin, saveIssue } = useModals({ switchTab, switchTabByOffset });

let cloudSyncTimer: number | null = null;

/** Sekme tekrar görünür olduğunda yedek bu kadar eskiyse hemen yakalanır. */
const VISIBLE_CATCHUP_MS = 2 * 60 * 1000;

/**
 * Sekme kapanırken / görünürlük değişince otomatik kaydet ve buluta yakala.
 *
 * ADR-0070: beforeunload içinde başlatılan Firestore yazımı en az bir ağ turu
 * gerektirir; tarayıcı sekmeyi kapatırken uçuştaki isteği iptal eder. O yol
 * "bulut güvencesi" gibi görünüyordu ama gerçekte hiç tamamlanmıyordu.
 * visibilitychange hem daha güvenilir hem de sekme kapatılmadan (arka plana
 * geçerken) tetiklenir, dolayısıyla yazma şansı gerçekten oluşur.
 */
function persistLocalSave(): void {
  SaveSystem.save(store.serialize());
}

function handleVisibilityChange(): void {
  persistLocalSave();
  if (!authStore.isAuthenticated || !authStore.autoSyncEnabled) return;
  if (document.visibilityState === "hidden") {
    // Sekme arka plana geçiyor: son durumu buluta it.
    void authStore.syncBackground();
  } else if (Date.now() - (authStore.lastSyncedAt ?? 0) > VISIBLE_CATCHUP_MS) {
    // Oyuncu geri döndü ve yedek bayat: gecikmeyi kapatmadan hemen yakala.
    void authStore.syncBackground();
  }
}

onMounted(() => {
  // Kaydedilmiş veriyi yükle (ADR-0029: ayrıntılı yükleme — bozuk kayıt ve
  // gelecek sürüm artık SESSİZCE yutulmuyor, oyuncuya bildiriliyor)
  const loadResult = SaveSystem.loadDetailed();
  if (loadResult.futureVersion) {
    saveIssue.value = {
      kind: "future",
      title: "Kayıt Bu Sürümden Daha Yeni",
      message: `Bu tarayıcıdaki kayıt v${loadResult.futureVersion.found}, uygulamanın desteklediği sürüm v${loadResult.futureVersion.supported}. Kayıt silinmedi ve karantinaya alındı — ilerlemen korunuyor. Oyunu güncelleyerek devam edebilirsin.`
    };
  } else if (loadResult.state) {
    store.deserialize(loadResult.state);
    if (loadResult.corrupted) {
      saveIssue.value = {
        kind: "recovered",
        title: "Bozuk Kayıt Kurtarıldı",
        message: "Son kayıt okunamadı, bu yüzden otomatik yedeğinden geri yüklendi. Bozuk kayıt ayrıca saklandı — Ayarlar > Kayıt bölümünden inceleyebilirsin."
      };
    }
  } else if (loadResult.corrupted) {
    saveIssue.value = {
      kind: "lost",
      title: "Kayıt Kurtarılamadı",
      message: "Bu kayıt slotu okunamadı ve yedek de yoktu. Yeni bir oyun başlatıldı. Bozuk kayıt verisi ayrı bir anahtarda saklandı, yeni kayıt onu ezmedi."
    };
  }

  // Kimlik doğrulama ve bulut servisini dinle
  authStore.init();

  // Oyun döngüsünü başlat
  gameLoop.start();

  // Periyodik otomatik bulut senkronizasyonu (her 5 dakikada bir)
  // ADR-0029: doğrudan saveToCloud() yerine syncBackground() — önce çakışma
  // kontrolü yapar, çakışma varsa yazmaz. Aksi halde boş bir yerel kayıt iyi
  // bulut kaydının üstüne yazılabiliyordu.
  cloudSyncTimer = window.setInterval(() => {
    void authStore.syncBackground();
  }, 5 * 60 * 1000);

  // Tarayıcı Autoplay kısıtı: Kullanıcının ilk tıklamasında/etkileşiminde müziği başlat
  const handleFirstInteraction = () => {
    musicEngine.resumeOnInteraction();
    window.removeEventListener("click", handleFirstInteraction);
    window.removeEventListener("keydown", handleFirstInteraction);
    window.removeEventListener("touchstart", handleFirstInteraction);
  };
  window.addEventListener("click", handleFirstInteraction, { passive: true });
  window.addEventListener("keydown", handleFirstInteraction, { passive: true });
  window.addEventListener("touchstart", handleFirstInteraction, { passive: true });

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", persistLocalSave);
  window.addEventListener("beforeunload", persistLocalSave);
});

onUnmounted(() => {
  if (cloudSyncTimer !== null) {
    clearInterval(cloudSyncTimer);
  }
  gameLoop.stop();
  musicEngine.stop();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("pagehide", persistLocalSave);
  window.removeEventListener("beforeunload", persistLocalSave);
});
</script>

<template>
  <div class="min-h-screen text-slate-100 flex flex-col items-center p-3 md:p-6 font-sans relative selection:bg-purple-500/20 selection:text-purple-300 overflow-x-hidden" :data-corruption="corruptionStamp(store.corruptionLevel)">
    <!-- Balatro Tarzı Canlı Algoritma Girdabı (GLSL Procedural Paint Swirl) -->
    <AlgorithmicSwirl />

    <!-- Floating Dopamin Parçacık Katmanı -->
    <JuiceLayer />

    <!-- Balatro Sütun 2: Sıralı Reels Vuruşu ve Makro Sıçrama Katmanı -->
    <SequentialStrikeLayer />

    <!-- Çift Dokunuş Kalp Patlaması Katmanı -->
    <HeartBurstLayer />

    <!-- Gece Krizleri Overlay'i -->
    <AnomalyOverlay />

    <!-- Doomscroll Gece Ekran Dokuları (Parmak İzi & Kriz Çatlak Camı) -->
    <ScreenOverlay />

    <!-- Yan Şıklatan Eller (z=45 kolaj): içerik + CRT ÜSTÜNE yapışık durur.
         #game-main-content'in KARDEŞİ — shake transform'u içermez (ADR-0044). -->
    <SideSnapHands />

    <!-- Faz C "Aç Kumarhane": Boost anı yan motif bandı (L3, z=45 ailesi).
         #game-main-content'in KARDEŞİ — shake transform'u içermez (ADR-0044). -->
    <MotifBand />



    <!-- Zaman Yayı (Time Clock) — §8.3 katman sırası: CRT 40 → motif 45 →
         anomali 50 → saat 55 → juice 60 → toast 70 → modal 80.
         #game-main-content'in KARDEŞİ — shake transform'u içermez (ADR-0044). -->
    <TimeClockOverlay />

    <!-- Başarım Bildirimleri -->
    <AchievementToast />

    <!-- QoL: Çevrimdışı / arka plan yakalama raporu -->
    <WelcomeBackModal v-if="store.settings.offlineProgressModal !== false" />

    <div id="game-main-content" class="w-full max-w-5xl relative z-10 flex flex-col">
      <!-- Antimatter Dimensions Tarzı Kesintisiz Akan Kozmik Canlı Haber Bandı -->
      <CommentTicker v-if="store.settings.newsTickerEnabled !== false" />

      <!-- Üst Gösterge ve Kontroller -->
      <Header
        @open-settings="showSettings = true"
        @open-auth="authStore.openAuthModal()"
      />

      <!-- Kozmik Merdiven & Olay Ufku İlerlemesi (0 → 1.79e308 g) -->
      <div
        class="mb-4 rounded-xl border border-white/[0.08] bg-[var(--ds-panel)] backdrop-blur-md px-3.5 py-2.5 shadow-xs"
      >
        <div class="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-1.5">
          <span class="text-cyan-300 font-bold uppercase tracking-wider">{{ arcBandName }}</span>
          <span class="text-slate-600">·</span>
          <span class="text-slate-400">Tekillik Ufku</span>
          <span class="ml-auto tabular-nums font-bold" :class="arcPercent >= 100 ? 'text-amber-300' : 'text-slate-300'">
            <span class="text-slate-600 font-normal mr-1">ufuk</span>{{ arcPercent >= 100 ? 'TEKİLLİK HAZIR' : arcPercent.toFixed(1) + '%' }}
          </span>
        </div>
        <div class="progress-track progress-track-sm progress-track-bordered w-full mb-2">
          <div
            class="progress-fill"
            :style="{
              width: Math.min(100, Math.max(0, arcPercent)) + '%',
              background: 'linear-gradient(to right, #00f0ff, #a855f7, #f59e0b)'
            }"
          ></div>
        </div>
        <div class="flex items-center gap-2 text-[11px] font-mono">
          <Lock class="w-3 h-3 text-slate-500 shrink-0" />
          <span class="text-slate-500 shrink-0">Sıradaki kilit:</span>
          <span class="text-slate-200 truncate min-w-0 font-medium">{{ nextUnlockLabel }}</span>
          <span class="ml-auto shrink-0 flex items-center gap-1.5">
            <span class="inline-block w-16">
              <span class="progress-track progress-track-mini block">
                <span
                  class="progress-fill progress-fill-cyan block"
                  :style="{ width: `${Math.min(100, Math.max(0, nextUnlockPercent))}%` }"
                ></span>
              </span>
            </span>
            <span class="tabular-nums font-mono text-cyan-400 font-semibold">
              <span class="text-slate-600 font-normal mr-1">kilit</span>{{ nextUnlockPercent.toFixed(0) }}%
            </span>
          </span>
        </div>
      </div>

      <!-- Segmented Dock Bar Menüsü (Linear / Apple Kalitesi)
        Mobilde (<768px) body'ye teleport edilir ve alt sabit dock'a dönüşür:
        bu sayede #game-main-content sarsıntı (screen-shake) transform'u aldığında
        containing block viewport'tan kopmaz; tabler asla silinip tekrar gelmez. -->
      <Teleport to="body" :disabled="!isMobile">
        <nav
          ref="navRef"
          class="ds-nav-scroll p-1 rounded-xl mb-4 flex items-center gap-1 overflow-x-auto w-full border border-white/[0.06] bg-black/60 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-30 max-md:mb-0 max-md:rounded-b-none max-md:rounded-t-2xl max-md:px-2 max-md:py-1.5 max-md:bg-black/85 max-md:border-white/[0.1] max-md:pb-[max(0.375rem,env(safe-area-inset-bottom))]"
          aria-label="Ana sekmeler"
        >
        <!-- Kütle / Katmanlar Sekmesi -->
        <button @click="switchTab('dimensions')" :aria-current="activeTab === 'dimensions' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'dimensions', 'dimensions')]">
          <Layers class="w-3.5 h-3.5 text-purple-400" />
          <span :class="navLabelClass(activeTab === 'dimensions')">Katmanlar</span>
          <span v-if="store.canShift" class="tab-dot tab-dot-cyan"></span>
        </button>

        <!-- Algoritma Laboratuvarı Sekmesi — kilitliyken HİÇ GÖSTERİLMEZ (kilitli içerik gizli) -->
        <button v-if="store.labUnlocked" @click="switchTab('lab')" :aria-current="activeTab === 'lab' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'lab', 'lab')]">
          <FlaskConical class="w-3.5 h-3.5 text-emerald-400" />
          <span :class="navLabelClass(activeTab === 'lab')">Lab</span>
          <span v-if="hasHarvestableTrend" class="tab-dot tab-dot-cyan"></span>
        </button>

        <!-- Gece Kriz Yönetimi Sekmesi — kilitliyken HİÇ GÖSTERİLMEZ (kilitli içerik gizli) -->
        <button v-if="store.crisisUnlocked" @click="switchTab('crisis')" :aria-current="activeTab === 'crisis' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'crisis', 'crisis')]">
          <Zap class="w-3.5 h-3.5 text-cyan-400" />
          <span :class="navLabelClass(activeTab === 'crisis')">Kriz</span>
          <span v-if="hasCrisisAlert" class="tab-dot tab-dot-rose"></span>
        </button>

        <!-- Otomatik Botlar Sekmesi — kilitliyken HİÇ GÖSTERİLMEZ (kilitli içerik gizli) -->
        <button v-if="store.autobuyersUnlocked" @click="switchTab('autobuyers')" :aria-current="activeTab === 'autobuyers' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'autobuyers', 'autobuyers')]">
          <Bot class="w-3.5 h-3.5 text-blue-400" />
          <span :class="navLabelClass(activeTab === 'autobuyers')">{{ store.isAutobuyerCockpitMode ? 'Kokpit' : 'Botlar' }}</span>
          <span v-if="hasBotAlert" class="tab-dot tab-dot-cyan"></span>
        </button>

        <!-- Nöral İzleme Kolonisi Sekmesi — kilitliyken HİÇ GÖSTERİLMEZ (kilitli içerik gizli) -->
        <button v-if="store.colonyUnlocked" @click="switchTab('colony')" :aria-current="activeTab === 'colony' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'colony', 'colony')]">
          <Network class="w-3.5 h-3.5 text-violet-400" />
          <span :class="navLabelClass(activeTab === 'colony')">Koloni</span>
          <span v-if="store.canPowerNap" class="tab-dot tab-dot-cyan"></span>
        </button>

        <!-- Kozmik Çöküş / Tekillik Sekmesi — kilitliyken HİÇ GÖSTERİLMEZ (kilitli içerik gizli) -->
        <button v-if="store.singularityUnlocked" @click="switchTab('singularity')" :aria-current="activeTab === 'singularity' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'singularity', 'singularity')]">
          <Sunrise class="w-3.5 h-3.5 text-amber-400" />
          <span :class="navLabelClass(activeTab === 'singularity')">Tekillik</span>
          <span v-if="store.canSingularity" class="tab-dot tab-dot-amber"></span>
          <span v-else-if="store.hasAffordableNeuralNode" class="tab-dot tab-dot-cyan"></span>
        </button>

        <!-- Gece Kriz Meydan Okumaları Sekmesi — kilitliyken HİÇ GÖSTERİLMEZ (kilitli içerik gizli) -->
        <button v-if="store.challengesUnlocked" @click="switchTab('challenges')" :aria-current="activeTab === 'challenges' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'challenges', 'challenges')]">
          <Swords class="w-3.5 h-3.5 text-rose-400" />
          <span :class="navLabelClass(activeTab === 'challenges')">Meydan</span>
          <span v-if="store.activeChallenge" class="tab-dot tab-dot-rose"></span>
        </button>

        <!-- Başarımlar Sekmesi -->
        <button @click="switchTab('achievements')" :aria-current="activeTab === 'achievements' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'achievements', 'achievements')]">
          <Trophy class="w-3.5 h-3.5 text-amber-400" />
          <span :class="navLabelClass(activeTab === 'achievements')">Plaket</span>
          <span v-if="store.hasUnseenAchievements" class="tab-dot tab-dot-amber"></span>
        </button>

        <!-- Gece Raporu Sekmesi -->
        <button @click="switchTab('stats')" :aria-current="activeTab === 'stats' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'stats', 'stats')]">
          <BarChart3 class="w-3.5 h-3.5 text-slate-400" />
          <span :class="navLabelClass(activeTab === 'stats')">Rapor</span>
        </button>

        </nav>
      </Teleport>

      <!-- Aktif Sekme İçeriği (tek ritim: space-y-3; mobilde alt dock + floating bar payı eklenir) -->
      <main
        class="w-full pb-8 max-md:pb-36 overflow-x-hidden min-h-[380px]"
        @touchstart.passive="handleSwipeStart"
        @touchend.passive="handleSwipeEnd"
      >
        <Transition :name="transitionName" mode="out-in">
          <DimensionsTab v-if="activeTab === 'dimensions'" key="dimensions" />
          <LabTab v-else-if="activeTab === 'lab' && store.labUnlocked" key="lab" />
          <CrisisTab v-else-if="activeTab === 'crisis' && store.crisisUnlocked" key="crisis" />
          <AutobuyersTab v-else-if="activeTab === 'autobuyers' && store.autobuyersUnlocked" key="autobuyers" />
          <ColonyTab v-else-if="activeTab === 'colony' && store.colonyUnlocked" key="colony" />
          <SingularityTab v-else-if="activeTab === 'singularity' && store.singularityUnlocked" key="singularity" />
          <ChallengesTab v-else-if="activeTab === 'challenges' && store.challengesUnlocked" key="challenges" />
          <AchievementsTab v-else-if="activeTab === 'achievements'" key="achievements" />
          <StatsTab v-else-if="activeTab === 'stats'" key="stats" />
        </Transition>
      </main>
    </div>

    <!-- Mobilde (< 768px) Başparmak Hızlı Aksiyon Alanı (#game-main-content sarsıntısından izole) -->
    <FloatingThumbBar />

    <!-- Ayarlar Modalı (#game-main-content sarsıntısından izole) -->
    <SettingsModal
      v-if="showSettings"
      @close="showSettings = false"
    />

    <!-- Kayıt uyarısı (bozuk kayıt / gelecek sürüm) — ADR-0029 -->
    <ConfirmModal
      v-if="saveIssue"
      :title="saveIssue.title"
      :message="saveIssue.message"
      confirm-label="Anladım"
      @confirm="saveIssue = null"
      @cancel="saveIssue = null"
    />

    <!-- Kimlik Doğrulama & Bulut Modalı -->
    <AuthModal
      v-if="authStore.showAuthModal"
      @close="authStore.closeAuthModal()"
    />

    <!-- Bulut Çakışma Yönetimi Modalı -->
    <CloudConflictModal />

    <!-- Gizli Admin Paneli (GODMODE) -->
    <AdminPanel
      v-if="showAdmin"
      @close="showAdmin = false"
    />
  </div>
</template>

<style scoped>
/* Yönlü Sekme Geçiş Animasyonları (Directional Tab Slide-Fade) */
.tab-slide-next-enter-active,
.tab-slide-next-leave-active,
.tab-slide-prev-enter-active,
.tab-slide-prev-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

/* Next (Sola Kaydırma / İleri): Eski sekme sola kayar (-20px), yeni sekme sağdan gelir (+20px -> 0) */
.tab-slide-next-enter-from {
  opacity: 0;
  transform: translate3d(20px, 0, 0);
}
.tab-slide-next-leave-to {
  opacity: 0;
  transform: translate3d(-20px, 0, 0);
}

/* Prev (Sağa Kaydırma / Geri): Eski sekme sağa kayar (+20px), yeni sekme soldan gelir (-20px -> 0) */
.tab-slide-prev-enter-from {
  opacity: 0;
  transform: translate3d(-20px, 0, 0);
}
.tab-slide-prev-leave-to {
  opacity: 0;
  transform: translate3d(20px, 0, 0);
}

/* Erişilebilirlik / Animasyon Azaltma (reduceAnimations) Modu */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.12s ease;
}
.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}
</style>
