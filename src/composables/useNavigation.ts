import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useGameStore } from "../stores/game";
import { sounds } from "../core/audio";
import { checkUnlock, checkVisibility, getFeatureById, nextLocked, unlockProgress, unlockProgressFraction } from "../game/unlocks";
import type { UnlockContext } from "../game/unlocks";
import { ARC_LOG10_MAX, bandForLog10, log10Safe } from "../game/pacing";
import { isMotionReduced, useMotionMode } from "./useMotion";

export type TabId =
  | "dimensions"
  | "lab"
  | "crisis"
  | "autobuyers"
  | "colony"
  | "singularity"
  | "challenges"
  | "achievements"
  | "stats";

// QoL: sekme sırası — 1-9 klavye kısayolları bu sırayla eşleşir
export const TAB_ORDER: TabId[] = [
  "dimensions",
  "lab",
  "crisis",
  "autobuyers",
  "colony",
  "singularity",
  "challenges",
  "achievements",
  "stats"
];

export const NAV_BTN =
  "btn-tactile hit-44 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap";

// --- Signal Decay "renk dili": sol kenarlık renk-kodlu, üstte 2px aktif çizgi ---
// Renkler ikon renkleriyle birebir eşleşir; başlık okumadan renkten tanınır.
// Tailwind JIT taraması için TÜM sınıflar tam literaldi (dinamik birleştirme YOK).

/** Sekme → sol kenarlık + aktif çizgi rengi (değerler ikon renkleriyle aynı). */
const TAB_ACCENT: Record<TabId, string> = {
  dimensions: "border-l-2 border-l-purple-400 before:bg-purple-400",
  lab: "border-l-2 border-l-emerald-400 before:bg-emerald-400",
  crisis: "border-l-2 border-l-cyan-400 before:bg-cyan-400",
  autobuyers: "border-l-2 border-l-blue-400 before:bg-blue-400",
  colony: "border-l-2 border-l-violet-400 before:bg-violet-400",
  singularity: "border-l-2 border-l-amber-400 before:bg-amber-400",
  challenges: "border-l-2 border-l-rose-400 before:bg-rose-400",
  achievements: "border-l-2 border-l-amber-400 before:bg-amber-400",
  stats: "border-l-2 border-l-slate-400 before:bg-slate-400"
};

// 2px ince aktif çizgi geometrisi — butonun tüm üst kenarını (ikon + yazı) boydan boya kaplar (inset-x-2, rounded-lg köşe kavisiyle uyumlu).
// .hit-44 dokunma alanını ::after'da kullandığı için pseudo tercihi ::before'dir;
// opaklık geçişiyle yumuşak söner/çıkar (layout kayması olmaz, border genişliği sabit).
const ACTIVE_LINE =
  "before:content-[''] before:absolute before:top-[-1px] before:inset-x-2 before:rounded-full before:h-[2px] before:opacity-100 before:transition-opacity before:duration-200 before:ease-out";
const IDLE_LINE =
  "before:content-[''] before:absolute before:top-[-1px] before:inset-x-2 before:rounded-full before:h-[2px] before:opacity-0 before:transition-opacity before:duration-200 before:ease-out";

// Birleşik nav stilleri — tüm sekmelerde aynı dil
// border-l-2 her iki durumda da vardır: yalnız renk/arka plan geçişir, ölçü sabit kalır.
export function navClass(isActive: boolean, tab: TabId): string {
  return isActive
    ? `bg-white/[0.08] text-white border border-white/10 shadow-xs relative ${ACTIVE_LINE} ${TAB_ACCENT[tab]}`
    : `text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent relative ${IDLE_LINE} ${TAB_ACCENT[tab]}`;
}

/**
 * Aktif/pasif ikonlaştırma: AKTİFTE ikon + yazı, PASİFTE yalnız ikon.
 * Pasifte max-width 0'a daralarak metin kapanır (transition ile yumuşak).
 * -mr-1.5, flex gap-1.5'i telafi eder: etiket gizliyken ikon ↔ tab-dot mesafesi
 * tek gap (6px) kalır, etiket varken de mr-0 ile doğal aralık korunur.
 */
export function navLabelClass(isActive: boolean): string {
  const base =
    "overflow-hidden whitespace-nowrap shrink-0 transition-all duration-200 ease-out";
  return isActive
    ? `${base} max-w-[8rem] opacity-100 mr-0`
    : `${base} max-w-0 opacity-0 -mr-1.5 pointer-events-none`;
}

/**
 * P3.2 — Siluet teaser: "görünürlük" ile "gerçek açılış" ayrımının nav'a yansıması.
 *
 * ADR-0073 iki katmanlı kapı kurdu: dekad eşiği özelliği GÖRÜNÜR yapar, başarım
 * ailesi ise GERÇEK açılımı verir. Aradaki boşluk (görünür ama henüz kapalı) nav'da
 * "siluet" olarak gösterilir: isimsiz, bulanık, tıklanamaz bir gölge.
 *
 * Durum matrisi:
 * - "hidden"     → özelliğin KENDİ şartı (dekad/sayaç) henüz sağlanmadı → HİÇ GÖSTERİLMEZ
 * - "open"       → görünür ve gerçekten açık → normal buton (mevcut davranış)
 * - "silhouette" → görünür ama dal kapısı (başarım ailesi) eksik → isimsiz teaser
 */
export type NavSilhouetteState = "hidden" | "silhouette" | "open";

/**
 * Sekme → özellik id'si (FEATURE_UNLOCKS anahtarı). null = özellik kapısı yok.
 *
 * KODDAN OKUNDU (src/stores/game/getters-*.ts):
 * - labUnlocked        → isFeatureUnlocked("lab")        → "lab"
 * - crisisUnlocked     → isFeatureUnlocked("crisis")     → "crisis"
 * - autobuyersUnlocked → isFeatureUnlocked("autobuyers") → "autobuyers"
 * - colonyUnlocked     → isFeatureUnlocked("colony") (+ nöral bot/nap koşulları) → "colony"
 * - challengesUnlocked → isFeatureUnlocked("challenges") → "challenges"
 * - singularityUnlocked → singularities > 0 || 1e30 kütle eşiği: FEATURE_UNLOCKS'te
 *   karşılığı YOK (doğrudan eşik) → null
 * - dimensions / achievements / stats → hiçbir özellik kapısına bağlı değil → null
 */
export const NAV_FEATURE_IDS: Record<TabId, string | null> = {
  dimensions: null,
  lab: "lab",
  crisis: "crisis",
  autobuyers: "autobuyers",
  colony: "colony",
  singularity: null,
  challenges: "challenges",
  achievements: null,
  stats: null
};

/**
 * Bir sekmenin nav'daki üç durumlu görünürlüğü.
 *
 * - null özellik kapısı → "open" (sekme hep açıktır: dimensions/achievements/stats)
 * - özelliğin kendi şartı sağlanmamış → "hidden" (dekad eşiği geçmedi)
 * - dekad eşiği geçti, başarım ailesi eksik → "silhouette"
 * - gerçek açılış (checkUnlock) → "open"
 */
export function navSilhouetteState(featureId: string | null, ctx: UnlockContext): NavSilhouetteState {
  if (featureId === null) return "open";
  const feature = getFeatureById(featureId);
  if (!feature) return "hidden";
  if (!checkVisibility(ctx, feature)) return "hidden";
  if (checkUnlock(ctx, feature)) return "open";
  return "silhouette";
}

/**
 * Siluet durumundaki dal ilerlemesi (kazanılan güvenli başarım / hedef).
 * Yalnızca "silhouette" durumunda dolu; diğer durumlarda null.
 */
export function navSilhouetteMeter(
  featureId: string | null,
  ctx: UnlockContext
): { current: number; target: number } | null {
  if (featureId === null) return null;
  const feature = getFeatureById(featureId);
  if (!feature) return null;
  if (navSilhouetteState(featureId, ctx) !== "silhouette") return null;
  return unlockProgress(ctx, feature);
}

/**
 * Siluet kademe göstergesi için nokta bayrakları: her eleman bir kademe,
 * true = dolu (kazanıldı), false = boş. Toplam = dalın gerektirdiği başarım adedi.
 */
export function navSilhouetteStepFlags(featureId: string | null, ctx: UnlockContext): boolean[] {
  const meter = navSilhouetteMeter(featureId, ctx);
  if (!meter) return [];
  const total = Math.max(0, Math.min(12, Math.round(meter.target)));
  const filled = Math.max(0, Math.min(total, Math.round(meter.current)));
  return Array.from({ length: total }, (_, index) => index < filled);
}

// F3.3: OS prefers-reduced-motion canlı dinleyici.
// Kök elemana .reduce-anim sınıfı damgalanırken OS tercihi doğrudan tek kapı kontratına dahil edilir.
const osReducedMotion = ref(false);
let osMotionListenerInit = false;

function ensureOsMotionListener(onOsChange?: () => void): void {
  if (osMotionListenerInit) return;
  osMotionListenerInit = true;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
  try {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    osReducedMotion.value = query.matches;
    const onChange = (e: MediaQueryListEvent): void => {
      osReducedMotion.value = e.matches;
      onOsChange?.();
    };
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", onChange);
    } else if (typeof (query as any).addListener === "function") {
      (query as any).addListener(onChange);
    }
  } catch {
    /* yoksay — kapı kapalı varsayılır */
  }
}

export function useNavigation(options?: { isSwipeBlocked?: () => boolean }) {
  const store = useGameStore();

  const activeTab = ref<TabId>("dimensions");
  const navRef = ref<HTMLElement | null>(null);

  // ADR-0044: Mobil ekran tespiti — <nav> dock'unun body'ye teleport edilmesi için
  const isMobile = ref(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  let mobileMediaQuery: MediaQueryList | null = null;

  function handleMediaChange(e: MediaQueryListEvent | MediaQueryList) {
    isMobile.value = e.matches;
  }

  // Sekme kilit haritası — tek elden senkron (nav + içerik + otomatik geri dönüş)
  // P3.2: siluet sekme (= dekad eşiği geçmiş ama dal kapısı/başarım eksik) de
  // KAPALI sayılır. Anlamı bozulmaz: "içeriğe girilemez" sözleşmesi aynen korunur.
  // Böylece teaser yalnızca GÖRSELDİR — mobil kaydırma (availableTabs) onu listeden
  // çıkarır, switchTab reddeder, içerik sekmesi hiç açılmaz.
  const tabLocked = computed<Record<TabId, boolean>>(() => ({
    dimensions: false,
    lab: !store.labUnlocked,
    crisis: !store.crisisUnlocked,
    autobuyers: !store.autobuyersUnlocked,
    colony: !store.colonyUnlocked,
    singularity: !store.singularityUnlocked,
    challenges: !store.challengesUnlocked,
    achievements: false,
    stats: false
  }));

  // P3.2 — siluet teaser durumu. Dekad eşiği geçti ama dal kapısı (başarım
  // ailesi) eksikse sekme "görünür ama kapalı"dır: nav'da isimsiz, bulanık ve
  // tıklanamaz bir gölge olarak görünür (App.vue).
  const navSilhouettes = computed<Record<TabId, NavSilhouetteState>>(() => {
    const ctx = store.unlockContext;
    return {
      dimensions: navSilhouetteState(NAV_FEATURE_IDS.dimensions, ctx),
      lab: navSilhouetteState(NAV_FEATURE_IDS.lab, ctx),
      crisis: navSilhouetteState(NAV_FEATURE_IDS.crisis, ctx),
      autobuyers: navSilhouetteState(NAV_FEATURE_IDS.autobuyers, ctx),
      colony: navSilhouetteState(NAV_FEATURE_IDS.colony, ctx),
      singularity: navSilhouetteState(NAV_FEATURE_IDS.singularity, ctx),
      challenges: navSilhouetteState(NAV_FEATURE_IDS.challenges, ctx),
      achievements: navSilhouetteState(NAV_FEATURE_IDS.achievements, ctx),
      stats: navSilhouetteState(NAV_FEATURE_IDS.stats, ctx)
    };
  });

  // Siluet kademe göstergesi: her nokta bir dal kademesi, dolu = kazanıldı.
  const navSilhouetteSteps = computed<Record<TabId, boolean[]>>(() => {
    const ctx = store.unlockContext;
    return {
      dimensions: navSilhouetteStepFlags(NAV_FEATURE_IDS.dimensions, ctx),
      lab: navSilhouetteStepFlags(NAV_FEATURE_IDS.lab, ctx),
      crisis: navSilhouetteStepFlags(NAV_FEATURE_IDS.crisis, ctx),
      autobuyers: navSilhouetteStepFlags(NAV_FEATURE_IDS.autobuyers, ctx),
      colony: navSilhouetteStepFlags(NAV_FEATURE_IDS.colony, ctx),
      singularity: navSilhouetteStepFlags(NAV_FEATURE_IDS.singularity, ctx),
      challenges: navSilhouetteStepFlags(NAV_FEATURE_IDS.challenges, ctx),
      achievements: navSilhouetteStepFlags(NAV_FEATURE_IDS.achievements, ctx),
      stats: navSilhouetteStepFlags(NAV_FEATURE_IDS.stats, ctx)
    };
  });

  // ADR-0032 — "Sonraki Açılacak" bandı.
  // Ölçüm (brain/scratchpad/harness/results-308-audit.json) gösterdi ki koşunun
  // %81'inde hiçbir yeni içerik açılmıyordu: oyuncu neden üstelendiğini bilmiyordu.
  // nextLocked() altyapısı hazırdı ama hiçbir bileşen onu kullanmıyordu.
  const nextUnlock = computed(() => nextLocked(store.unlockContext, new Set(store.unlockedFeatures)));
  const nextUnlockPercent = computed(() => {
    const f = nextUnlock.value;
    return f ? unlockProgressFraction(store.unlockContext, f) * 100 : 100;
  });
  const nextUnlockLabel = computed(() => {
    const f = nextUnlock.value;
    if (!f) return "Merdiven tamam — şafak eşiğine götürürsün";
    return `${f.name} · ${f.hint}`;
  });
  const arcPercent = computed(() => (log10Safe(store.matter) / ARC_LOG10_MAX) * 100);
  const arcBandName = computed(() => bandForLog10(log10Safe(store.matter)).name);

  // Algoritma Lab'da hasada hazır olgun tohum kontrolü
  const hasHarvestableTrend = computed(() => {
    return store.labUnlocked && Array.isArray(store.labCells) && store.labCells.some((c) => c.isMature && !!c.seedType);
  });

  // Kriz sekmesi bildirimi: enerji doluysa ya da ters tepme aktifse
  const hasCrisisAlert = computed(() => {
    if (!store.crisisUnlocked) return false;
    return store.crisisBackfireDebuff > 0 || store.caffeineEnergy >= store.maxCaffeineEnergy;
  });

  // Bot sekmesi bildirimi: açılabilir kademe, satın alınabilir bot ya da kilitli ama şartı+parası hazır bot varsa
  const hasBotAlert = computed(() => {
    if (!store.autobuyersUnlocked) return false;
    if (store.canUnlockBulk || store.canUnlockMax) return true;
    return store.hasAffordableLockedBot;
  });

  // Açık/kilitsiz olan sekmeler listesi (mobil yatay kaydırma için)
  const availableTabs = computed<TabId[]>(() => {
    return TAB_ORDER.filter((id) => !tabLocked.value[id]);
  });

  const slideDirection = ref<"next" | "prev">("next");

  // 3 durumlu hareket kapısı: 'full' dışı → yalnız soluk geçiş (kaydırma animasyonu yok).
  const motionMode = useMotionMode();

  const transitionName = computed(() => {
    if (motionMode.value !== "full") return "tab-fade";
    return slideDirection.value === "next" ? "tab-slide-next" : "tab-slide-prev";
  });

  function switchTab(tab: TabId) {
    if (tabLocked.value[tab]) {
      sounds.playClick();
      window.dispatchEvent(
        new CustomEvent("doomscroll:tap", {
          detail: { x: window.innerWidth / 2, y: window.innerHeight * 0.3, text: "Kilitli" }
        })
      );
      return;
    }

    // Geçiş yönünü hesapla: Hedef sekme mevcut sekmeden ileride mi geride mi?
    const oldIdx = TAB_ORDER.indexOf(activeTab.value);
    const newIdx = TAB_ORDER.indexOf(tab);
    if (newIdx !== oldIdx) {
      slideDirection.value = newIdx > oldIdx ? "next" : "prev";
    }

    sounds.playHapticTap();
    activeTab.value = tab;
    store.setActiveGameTab(tab);
    // ADR-0029: aktif sekmeyi görünür alana getir. Sekme dock'u yatay
    // kaydırılabilir olduğu için (9 sekme 360 px'e sığmıyor), 8. sekmeye tıklayıp
    // onu görünmeyen bir konuma gönderiyordu. Klavye ile de gezilebildiği için
    // davranış yalnızca görsel: scrollIntoView, odağı DEĞİŞTİRMEZ.
    scrollActiveTabIntoView();
    if (tab === "achievements") {
      store.markAchievementsSeen();
    }
  }

  /**
   * Mevcut sekmeye göre yön (+1 sonraki, -1 önceki) kadar sekme atlar
   */
  function switchTabByOffset(direction: 1 | -1) {
    const tabs = availableTabs.value;
    const curIdx = tabs.indexOf(activeTab.value);
    if (curIdx === -1) return;
    const nextIdx = curIdx + direction;
    if (nextIdx >= 0 && nextIdx < tabs.length) {
      slideDirection.value = direction === 1 ? "next" : "prev";
      switchTab(tabs[nextIdx]);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch {
          /* yoksay */
        }
      }
    }
  }

  // Plaket toast'undaki "İncele" butonu buraya düşer
  function handleGotoAchievements(): void {
    switchTab("achievements");
  }

  // Mobil Yatay Fiske (Swipe Left / Right) ile Sekme Değiştirme Jestleri
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeStartTime = 0;
  let swipeScrollStartY = 0;

  function handleSwipeStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    if (options?.isSwipeBlocked?.()) return;

    const target = e.target as HTMLElement | null;
    // İnteraktif form girdileri, yatay kaydırılabilir dock veya no-swipe alanları hariç
    if (target?.closest("input, textarea, select, .ds-nav-scroll, .no-swipe")) {
      swipeStartTime = 0;
      return;
    }

    const touch = e.touches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
    swipeStartTime = performance.now();
    swipeScrollStartY = window.scrollY || document.documentElement.scrollTop || 0;
  }

  function handleSwipeEnd(e: TouchEvent) {
    if (swipeStartTime === 0) return;
    if (e.changedTouches.length !== 1) {
      swipeStartTime = 0;
      return;
    }

    const touch = e.changedTouches[0];
    const duration = performance.now() - swipeStartTime;
    swipeStartTime = 0;

    // 1. Dikey sayfa kaydırma kontrolü: Eğer sayfa dikeyde kaydıysa bu bir sayfa kaydırmadır
    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (Math.abs(currentScrollY - swipeScrollStartY) > 12) {
      return;
    }

    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const velocity = absX / Math.max(duration, 1);

    // 2. Belirgin yatay fiske şartları:
    // - En az 48px yatay mesafe
    // - Yatay yön dikey yönden en az 1.4 kat baskın (absX > absY * 1.4)
    // - Süre 45ms - 420ms arasında
    // - Minimum hız: velocity >= 0.22 px/ms
    if (absX >= 48 && absX > absY * 1.4 && duration >= 45 && duration <= 420 && velocity >= 0.22) {
      if (deltaX < 0) {
        // Sola kaydırma -> Sonraki sekme (Next tab)
        switchTabByOffset(1);
      } else {
        // Sağa kaydırma -> Önceki sekme (Previous tab)
        switchTabByOffset(-1);
      }
    }
  }

  // Aktif sekme butonunu dock'un görünür alanına kaydırır (kaydırma sadece görsel).
  function scrollActiveTabIntoView() {
    nextTick(() => {
      const nav = navRef.value;
      if (!nav) return;
      const activeBtn = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!activeBtn) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      if (btnRect.left < navRect.left || btnRect.right > navRect.right) {
        // Kısıtlı harekette yumuşak kaydırma yerine anlık konumlama (tek sıçrama, akış yok).
        activeBtn.scrollIntoView({
          block: "nearest",
          inline: "center",
          behavior: isMotionReduced() ? "auto" : "smooth"
        });
      }
    });
  }

  // Prestij sonrası kilitlenen sekmedeysek güvenli sekmeye geri dön
  watch(
    () => [store.labUnlocked, store.crisisUnlocked, store.autobuyersUnlocked, store.colonyUnlocked, store.singularityUnlocked, store.challengesUnlocked].join("|"),
    () => {
      if (tabLocked.value[activeTab.value]) {
        activeTab.value = "dimensions";
        store.setActiveGameTab("dimensions");
      }
    }
  );

  // Kutlama kapısı senkronu: aktif oyun sekmesi store'da tutulur,
  // otomatik olaylar ilgili sekmede değilken sessiz geçer.
  watch(activeTab, (tab) => store.setActiveGameTab(tab), { immediate: true });

  ensureOsMotionListener(() => syncEffectClasses());

  // QoL: animasyon azaltma ayarı — kök elemana sınıf bağlar (style.css: .reduce-anim / .motion-off)
  // 3 durumlu hareket kontrolü: motionMode yoksa reduceAnimations'dan türetilir (eski kayıt uyumu).
  function effectiveMotionMode(): 'full' | 'reduced' | 'off' {
    const m = store.settings.motionMode;
    if (m === 'full' || m === 'reduced' || m === 'off') return m;
    return store.settings.reduceAnimations ? 'reduced' : 'full';
  }
  function syncEffectClasses() {
    if (typeof document === "undefined") return;
    const mode = effectiveMotionMode();
    const osReduced = osReducedMotion.value;
    const root = document.documentElement;
    // F3.3: mod 'reduced' ise VEYA mod 'off' değilken OS tercihi aktifse köke 'reduce-anim' basılır.
    root.classList.toggle("reduce-anim", mode === 'reduced' || (mode !== 'off' && osReduced));
    root.classList.toggle("motion-off", mode === 'off');
    // ADR-0069: CRT katmanı kaldırıldı — crt-off kök sınıfı da söküldü.
    root.classList.toggle("battery-saver", !!store.settings.batterySaver);
  }
  watch(
    () => [store.settings.reduceAnimations, store.settings.motionMode, store.settings.batterySaver, osReducedMotion.value],
    () => syncEffectClasses(),
    { immediate: true }
  );

  // Performans: juice modu sıcak döngüde diskten okunmaz; tek yazan burası.
  function syncJuiceMode(mode: string) {
    try {
      localStorage.setItem("doomscroll-juice-mode", mode);
    } catch {
      /* yoksay */
    }
    window.__setJuiceMode?.(mode);
    window.dispatchEvent(new CustomEvent("doomscroll:juice-mode", { detail: mode }));
  }
  watch(
    () => store.settings.juiceMode,
    (mode) => syncJuiceMode(mode),
    { immediate: true }
  );

  onMounted(() => {
    // Mobil ekran tespiti: Tailwind max-md eşiği (< 768px) ile eşleşir
    if (typeof window !== "undefined" && "matchMedia" in window) {
      mobileMediaQuery = window.matchMedia("(max-width: 767px)");
      isMobile.value = mobileMediaQuery.matches;
      try {
        mobileMediaQuery.addEventListener("change", handleMediaChange);
      } catch {
        mobileMediaQuery.addListener(handleMediaChange);
      }
    }

    // Plaket toast'undaki "İncele" butonu bu olayı gönderir
    window.addEventListener("uroboros:goto-achievements", handleGotoAchievements);
  });

  onUnmounted(() => {
    if (mobileMediaQuery) {
      try {
        mobileMediaQuery.removeEventListener("change", handleMediaChange);
      } catch {
        mobileMediaQuery.removeListener(handleMediaChange);
      }
      mobileMediaQuery = null;
    }
    window.removeEventListener("uroboros:goto-achievements", handleGotoAchievements);
  });

  return {
    activeTab,
    navRef,
    isMobile,
    tabLocked,
    availableTabs,
    navSilhouettes,
    navSilhouetteSteps,
    slideDirection,
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
    handleSwipeEnd,
    scrollActiveTabIntoView
  };
}
