<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useGameStore, COMBO_THRESHOLDS, COMBO_DECAY_MS } from "../stores/game";
import { format } from "../core/format";
import type { StanceType } from "../models/types";
import {
  Atom,
  Flame,
  Shield,
  Settings,
  ArrowUp,
  Cpu,
  Layers,
  Activity,
  Lock,
  Cloud
} from "lucide-vue-next";
import { getFeatureById, unlockProgress, unlockProgressFraction } from "../game/unlocks";
import { Decimal } from "../core/math";
import { isMotionOff, isMotionReduced } from "../composables/useMotion";
import { useAuthStore } from "../stores/auth";
import ConfirmModal from "./ConfirmModal.vue";
import CounterDisplay from "./header/CounterDisplay.vue";
import MusicControls from "./header/MusicControls.vue";
import SingularityButton from "./header/SingularityButton.vue";

const emit = defineEmits<{ (e: "open-settings"): void; (e: "open-auth"): void }>();

const store = useGameStore();
const authStore = useAuthStore();
const swipeBtnRef = ref<HTMLButtonElement | null>(null);

const formattedClickPower = computed(() => format(store.manualClickPower, 2, store.settings.notation));
const tickspeedCost = computed(() => format(store.tickspeedCost, 2, store.settings.notation));
const tickspeedMultiplier = computed(() => format(store.tickspeedMultiplier, 2, store.settings.notation));
const canAffordTickspeed = computed(() => store.matter.gte(store.tickspeedCost));

// Hz rampası: kısmi = tek adım fiyatı (paket fiyatının 1/10'u) karşılanıyor ama
// tam yükseltme değil. Hazırda cyan kimlik + pulse korunur.
const tickspeedPartial = computed(
  () => !canAffordTickspeed.value && store.matter.gte(store.tickspeedCost.div(10))
);
const tickspeedRampClass = computed(() =>
  tickspeedPartial.value ? "ds-ramp-partial" : "ds-ramp-locked"
);

// Kozmik Çöküş hazır: 1.79e308 g Kütle eşiği aşıldı
const singularityReady = computed(() => store.canSingularity);
const singularityGainText = computed(() => format(store.singularityGain, 2, store.settings.notation));

// Aktif meydan okuma bağlamı (banner + buton varyantı)
const inChallenge = computed(() => !!store.activeChallenge);
const challengeProgressPct = computed(() => Math.round(store.challengeProgress01 * 100));

const showChallengeExitConfirm = ref(false);

function requestChallengeExit(): void {
  if (!store.activeChallenge) return;
  if (!store.settings.confirmDialogs) {
    store.exitChallenge();
    return;
  }
  showChallengeExitConfirm.value = true;
}

// Kozmik Telemetri — Kütleçekim Tekillik Çöküş İlerlemesi (0 → 308.25 dekad)
const cosmicProgress = computed(() => {
  try {
    const m = store.matter;
    if (m.isNan() || Number.isNaN(m.mag)) return 0;
    if (!m.isFinite() || m.lt(10)) return 0;
    const logVal = Math.max(0, m.log10().toNumber());
    if (!Number.isFinite(logVal)) return 0;
    return Math.min(1, Math.max(0, logVal / 308.25));
  } catch {
    return 0;
  }
});
const nightPhase = computed(() => {
  const p = cosmicProgress.value;
  if (p >= 1) return { label: "Kozmik Tekillik", dot: "bg-amber-300", text: "text-amber-200" };
  if (p >= 0.8) return { label: "Galaktik Olay Ufku", dot: "bg-amber-400", text: "text-amber-300" };
  if (p >= 0.55) return { label: "Makro Çöküş", dot: "bg-purple-300", text: "text-purple-200" };
  if (p >= 0.25) return { label: "Mikro Karadelik", dot: "bg-cyan-300", text: "text-cyan-200" };
  return { label: "Planck Yırtılması", dot: "bg-blue-400", text: "text-slate-200" };
});

// 0-state onboarding: ilk format hiç alınmamışsa oyuncuya tek bir eylem çizilir
const showFirstSwipeHint = computed(() => store.dimensions[0]?.bought === 0);

// Tümünü Al rampası — iki ayrı uygunluk kaynağı:
// tam paket (pack) → ready; yalnız birim fiyatı (pack/10) → partial; hiçbiri → locked.
const canAffordFullPack = computed(() => {
  if (canAffordTickspeed.value) return true;
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    if (store.matter.gte(store.getDimensionCost(i))) return true;
  }
  return false;
});

const canAffordSingleUnit = computed(() => {
  if (canAffordTickspeed.value) return true;
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    if (store.matter.gte(store.getDimensionCost(i).div(10))) return true;
  }
  return false;
});

// Alınabilir en az bir yükseltme var mı? (orijinal tek-kaynak toplamı)
const canAffordAny = computed(() => canAffordFullPack.value || canAffordSingleUnit.value);

const maxAllRampClass = computed(() => {
  if (canAffordFullPack.value) return "";
  return canAffordSingleUnit.value ? "ds-ramp-partial" : "ds-ramp-locked";
});

// "Sıradaki hedef" satırı: her zaman tek bir odak çizer
const nextGoal = computed<{ label: string; value: string; ready: boolean; ratio: number }>(() => {
  if (singularityReady.value) {
    return { label: "Kozmik Çöküş Hazır!", value: `+${singularityGainText.value} SP`, ready: true, ratio: 1 };
  }
  if (canAffordTickspeed.value) {
    return { label: "Frekans hazır", value: `×${tickspeedMultiplier.value} → ${tickspeedCost.value}`, ready: true, ratio: 1 };
  }
  for (let i = store.unlockedDimensionsCount; i >= 1; i--) {
    const cost = store.getDimensionCost(i);
    if (store.matter.gte(cost)) {
      return { label: `D${i} alınabilir`, value: format(cost, 2, store.settings.notation), ready: true, ratio: 1 };
    }
  }
  let best = { label: "Sıradaki hedef", value: "", ready: false, ratio: -1 };
  if (canAffordAny.value) return { label: "Alınabilir var", value: "", ready: true, ratio: 1 };
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    const cost = store.getDimensionCost(i);
    const ratio = store.matter.div(cost).toNumber();
    if (ratio > best.ratio) {
      best = {
        label: `D${i} için kalan`,
        value: `%${Math.min(99, Math.floor(ratio * 100))}`,
        ready: false,
        ratio
      };
    }
  }
  return best;
});

// "Sıradaki hamle" çubuğu: hazırda oran 1'dir (çubuk gizlenir), değilse fiyat hedefi oranı.
const nextGoalPercent = computed(() => {
  if (nextGoal.value.ready) return 100;
  const ratio = nextGoal.value.ratio;
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(100, Math.max(0, ratio * 100));
});

function setStance(stance: StanceType): void {
  store.setStance(stance);
}

// Stance kilitlemeleri (Özellik Merdiveni: dopamin kapıları)
function stanceLockHint(featureId: string): { hint: string; progress: string; percent: number } | null {
  if (store.isFeatureUnlocked(featureId)) return null;
  const f = getFeatureById(featureId);
  if (!f) return null;
  const p = unlockProgress(store.unlockContext, f);
  const cur = format(new Decimal(p.current), 0, store.settings.notation);
  const tgt = format(new Decimal(p.target), 0, store.settings.notation);
  return {
    hint: f.hint,
    progress: `${cur} / ${tgt} g`,
    percent: unlockProgressFraction(store.unlockContext, f)
  };
}
const stanceSpamLock = computed(() => stanceLockHint("stance_spam"));
const stancePrivateLock = computed(() => stanceLockHint("stance_private"));
// Bir kez açılan kapanmaz: D1×25 erken önizlemesi sıçramada sıfırlanıyordu.
// İlk açılış localStorage'a mühürlenir, bir daha kapanmaz.
const STANCE_SEEN_KEY = "uroboros-stance-seen";
const stanceSeen = ref(false);
try {
  stanceSeen.value = localStorage.getItem(STANCE_SEEN_KEY) === "1";
} catch {
  /* yoksay */
}
const isStanceUnlocked = computed(
  () => stanceSeen.value || (store.dimensions[0]?.bought ?? 0) >= 25 || store.isFeatureUnlocked("stance_spam")
);
watch(isStanceUnlocked, (v) => {
  if (v && !stanceSeen.value) {
    stanceSeen.value = true;
    try {
      localStorage.setItem(STANCE_SEEN_KEY, "1");
    } catch {
      /* yoksay */
    }
  }
}, { immediate: true });
const hasMobileControls = computed(() => isStanceUnlocked.value || inChallenge.value || singularityReady.value);

function buyTickspeed(): void {
  store.buyTickspeed();
}

// Combo rozeti: yalnızca Hipnotik Seri alınmışsa ve seri ≥2 iken görünür.
const comboCount = computed(() => store.clickCombo.count);
const comboUnlocked = computed(() => (store.neuralNodesBought["combo_unlock"] || 0) >= 1);
const comboActive = computed(() => comboUnlocked.value && comboCount.value >= 2);

function currentComboMult(): number {
  let mult = 1;
  for (const t of COMBO_THRESHOLDS) {
    if (comboCount.value >= t.count) mult = t.mult;
  }
  return mult;
}

const comboBadgeText = computed(() => {
  const mult = currentComboMult();
  return mult > 1 ? `×${mult}` : `${comboCount.value}×`;
});

// Sıradaki çarpan eşiğine yüzde ilerleme — chip'in renk rampası bunu görsel okutur
const comboTierPct = computed(() => {
  const count = comboCount.value;
  const next = COMBO_THRESHOLDS.find((t) => t.count > count);
  if (!next) return 100;
  let prev = 0;
  for (const t of COMBO_THRESHOLDS) {
    if (t.count > count) break;
    prev = t.count;
  }
  return Math.min(100, Math.max(0, Math.round(((count - prev) / (next.count - prev)) * 100)));
});

// Kombo renk rampası: düşük yüzde = soluk slate, yüksek = parlak cyan.
// AMBER yalnız prestige katmanına ait — komboda yasak.
const comboRamp = computed(() => {
  const p = comboTierPct.value;
  if (p >= 100)
    return {
      box: "bg-cyan-400/35 border-cyan-300/70 shadow-[0_0_10px_rgba(34,211,238,0.3)]",
      text: "text-cyan-100",
      bar: "from-cyan-300 to-cyan-400"
    };
  if (p >= 66)
    return { box: "bg-cyan-500/25 border-cyan-400/55", text: "text-cyan-200", bar: "from-cyan-400 to-cyan-500" };
  if (p >= 33)
    return { box: "bg-cyan-500/15 border-cyan-500/30", text: "text-cyan-300", bar: "from-cyan-500 to-slate-400" };
  return { box: "bg-slate-500/10 border-slate-400/25", text: "text-slate-300", bar: "from-slate-400 to-slate-500" };
});

const comboDrain = ref(1);
let comboRaf = 0;

function tickComboDrain(): void {
  // Hareket azaltılmışsa bar statik kalır: rAF zinciri başlatılmaz (temizlik korunur).
  if (isMotionReduced()) {
    comboRaf = 0;
    return;
  }
  const elapsed = Date.now() - store.clickCombo.lastClickAt;
  comboDrain.value = Math.max(0, 1 - elapsed / COMBO_DECAY_MS);
  comboRaf = comboActive.value && comboDrain.value > 0 ? requestAnimationFrame(tickComboDrain) : 0;
}

watch(
  [comboActive, () => store.clickCombo.lastClickAt],
  ([active]) => {
    if (active && comboRaf === 0) {
      comboRaf = requestAnimationFrame(tickComboDrain);
    } else if (!active && comboRaf !== 0) {
      cancelAnimationFrame(comboRaf);
      comboRaf = 0;
    }
  },
  { immediate: true }
);

function maxAll(): void {
  store.maxAll();
}

function handleManualClick(event?: MouseEvent): void {
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (event && (event.clientX || event.clientY)) {
    x = event.clientX;
    y = event.clientY;
  } else if (swipeBtnRef.value) {
    const rect = swipeBtnRef.value.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(8);
    } catch {
      /* yoksay */
    }
  }

  window.dispatchEvent(
    new CustomEvent("doomscroll:tap", {
      detail: {
        x,
        y,
        text: `+${formattedClickPower.value}`
      }
    })
  );

  store.manualClick({ x, y });
  window.dispatchEvent(new CustomEvent("doomscroll:counter-pop", { detail: { intensity: 0 } }));
}

// Klavye Kısayolu: Space ile Yukarı Kaydır / Manuel Tıklama
function handleKeydown(e: KeyboardEvent): void {
  if (store.settings.hotkeysEnabled === false) return;
  if (e.code === "Space") {
    if (document.querySelector('.layer-modal, [role="dialog"]')) return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.getAttribute("role") === "button" ||
        target.getAttribute("role") === "tab" ||
        Boolean(target.closest('button, a, [role="button"], [role="tab"]')))
    ) {
      return;
    }
    e.preventDefault();
    handleManualClick();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

// Ortak punch kalıbı: dokunma geri bildirimi pointerdown anında (≤100 ms, tek impuls).
function punchTap(e: PointerEvent): void {
  if (isMotionOff()) return;
  const el = e.currentTarget as HTMLElement | null;
  if (!el) return;
  el.classList.add("juice-punch");
  window.setTimeout(() => el.classList.remove("juice-punch"), 160);
}

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  if (comboRaf !== 0) {
    cancelAnimationFrame(comboRaf);
    comboRaf = 0;
  }
});
</script>

<template>
  <header class="w-full glass-panel-glow rounded-2xl p-4 md:p-5 mb-6 relative overflow-hidden border border-white/[0.08]">
    <!-- 1. ÜST STATUS BAR (Kozmik Telemetri & Kuantum Rezonans Çubuğu) -->
    <div class="flex items-center justify-between text-xs font-mono border-b border-white/[0.06] pb-2.5 mb-4 text-slate-400 select-none flex-wrap gap-2">
      <!-- Sol: Kozmik Telemetri & Çöküş Fazı -->
      <div
        class="flex items-center gap-2 min-w-0"
      >
        <span class="inline-block w-2 h-2 rounded-full shrink-0" :class="[nightPhase.dot, 'shadow-xs animate-pulse']"></span>
        <span class="text-[10px] text-slate-400 font-semibold truncate hidden sm:inline">{{ nightPhase.label }}</span>
      </div>

      <!-- Orta: Kuantum Sinyal Alıcısı (U1: mobilde gizli — sayaç odaklı) -->
      <MusicControls @open-settings="emit('open-settings')" />

      <!-- Sağ: Bulut Hesabı & Tekillik Kararlılığı Telemetrisi -->
      <div class="flex items-center gap-2">
        <button
          @click="emit('open-auth')"
          aria-label="Bulut hesabını aç veya giriş yap"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs cursor-pointer active:scale-95"
          :class="authStore.isAuthenticated ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'"
        >
          <Cloud class="w-3.5 h-3.5" :class="authStore.isAuthenticated ? 'text-cyan-400' : 'text-slate-400'" />
          <span class="text-[11px] font-semibold">{{ authStore.isAuthenticated ? authStore.userDisplayName : "Giriş Yap" }}</span>
          <span v-if="authStore.isAuthenticated" class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
        </button>

        <!-- Tekillik Kararlılığı Göstergesi -->
        <div
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold"
          :class="store.crisisBackfireDebuff > 0
            ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
            : 'bg-white/[0.06] text-slate-300 border-white/10'"
        >
          <Activity class="w-3.5 h-3.5" :class="store.crisisBackfireDebuff > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'" />
          <span class="uppercase tracking-wider text-[10px]">{{ store.crisisBackfireDebuff > 0 ? "KARARSIZ" : "KARARLI" }}</span>
        </div>

        <!-- Ayarlar Butonu (Mobilde üst barda doğrudan erişim) -->
        <button
          @click="emit('open-settings')"
          aria-label="Ayarlar"
          class="md:hidden flex items-center justify-center h-7 w-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer shrink-0"
        >
          <Settings class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- 2. MERKEZİ KÜTLE ÇEKİRDEĞİ — tek odak: sayı + hız, gerisi ikincil -->
    <CounterDisplay />

    <!-- Sıradaki hamle tek küme (P2 cila) -->
    <div class="mt-2 flex flex-col items-center gap-1.5">
      <!-- Sıradaki hamle — header'daki acil satın alma; App.vue'daki "Sonraki Açılacak" (unlock merdiveni) ile karışmaması için önekli -->
      <div
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors"
        :class="nextGoal.ready
          ? 'bg-white/[0.08] border-white/20 text-slate-100 shadow-sm affordance-pulse'
          : 'bg-white/[0.03] border-white/[0.07] text-slate-400'"
        :style="nextGoal.ready ? { '--pulse-c1': 'rgba(255, 255, 255, 0.35)', '--pulse-c2': 'rgba(255, 255, 255, 0.75)' } : undefined"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="nextGoal.ready ? 'bg-white animate-pulse' : 'bg-slate-500'"></span>
        <span class="text-slate-500 font-normal">Sıradaki hamle:</span>
        <span>{{ nextGoal.label }}</span>
        <span v-if="nextGoal.value" class="tabular-nums font-bold">{{ nextGoal.value }}</span>
      </div>
      <!-- Hedefe kalan fiyat oranı — oran = çubuk (tamamen hazırda çubuk gizlenir) -->
      <div v-if="!nextGoal.ready" class="w-40 shrink-0">
        <div class="progress-track progress-track-mini">
          <div class="progress-fill progress-fill-purple" :style="{ width: `${nextGoalPercent}%` }"></div>
        </div>
      </div>
    </div>

    <!-- 3. DENETİM VE AKSİYON BUTONLARI — tek sıra: duruş solda, aksiyon
      hep sağda. Aksiyon grubundaki ml-auto, duruş kapalıyken bile grubu
      sağda tutar; açılışta yatay kayma olmaz. -->
    <div
      :class="[
        hasMobileControls ? 'flex' : 'hidden md:flex',
        'flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.05]'
      ]"
    >
      <!-- Sol: Stance Modları (bir kez açılır, bir daha kapanmaz) -->
      <div
        v-if="isStanceUnlocked"
        role="group"
        aria-label="Taktiksel duruş seçimi"
        class="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.06] shrink-0 justify-center md:justify-start w-fit mx-auto md:mx-0 max-w-full overflow-x-auto no-scrollbar"
      >
        <button
          @click="setStance('trend')"
          @pointerdown="punchTap"
          aria-label="Kuantum odak duruşuna geç"
          :aria-pressed="store.currentStance === 'trend'"
          class="btn-tactile h-11 px-2.5 sm:px-3 rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
          :class="store.currentStance === 'trend'
            ? 'bg-purple-500/20 text-purple-200 border border-purple-500/45 shadow-sm'
            : 'text-slate-300 hover:text-white border border-transparent'"
        >
          <Atom class="w-4 h-4 text-purple-400 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1.5">
              <span class="font-sans font-bold text-xs tracking-wide">Kuantum</span>
              <span
                v-if="store.currentStance === 'trend'"
                class="w-1.5 h-1.5 rounded-full bg-purple-300 shrink-0"
                aria-hidden="true"
              ></span>
            </div>
            <span
              class="text-[10px] font-mono tabular-nums"
              :class="store.currentStance === 'trend' ? 'text-purple-200 font-bold' : 'text-slate-400'"
            >
              Pasif ×2
            </span>
          </div>
        </button>

        <button
          @click="setStance('spam')"
          @pointerdown="punchTap"
          :disabled="!!stanceSpamLock"
          aria-label="Obur çekim duruşuna geç"
          :aria-pressed="store.currentStance === 'spam'"
          class="btn-tactile h-11 px-2.5 sm:px-3 rounded-lg text-xs font-mono flex items-center gap-2 transition-all whitespace-nowrap"
          :class="stanceSpamLock
            ? 'ds-ramp-locked text-slate-400 border border-white/[0.04] bg-black/30 cursor-not-allowed'
            : store.currentStance === 'spam'
              ? 'bg-rose-500/20 text-rose-200 border border-rose-500/45 shadow-sm cursor-pointer'
              : 'text-slate-300 hover:text-white border border-transparent cursor-pointer'"
        >
          <Lock v-if="stanceSpamLock" class="w-4 h-4 text-slate-400 shrink-0" />
          <Flame v-else class="w-4 h-4 text-rose-400 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1.5">
              <span class="font-sans font-bold text-xs tracking-wide">Obur</span>
              <span
                v-if="!stanceSpamLock && store.currentStance === 'spam'"
                class="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0"
                aria-hidden="true"
              ></span>
              <span
                v-if="stanceSpamLock"
                class="text-[9px] font-mono text-slate-400 tabular-nums"
              >
                {{ stanceSpamLock.progress }}
              </span>
            </div>
            <span
              v-if="!stanceSpamLock"
              class="text-[10px] font-mono tabular-nums"
              :class="store.currentStance === 'spam' ? 'text-rose-200 font-bold' : 'text-slate-400'"
            >
              Yut ×4 · Dalga ×1.5
            </span>
            <div
              v-else
              class="flex items-center gap-1.5"
            >
              <span class="text-[9px] font-mono text-slate-400 tabular-nums">Yut ×4</span>
              <span class="inline-block w-14">
                <span class="progress-track progress-track-mini block">
                  <span
                    class="progress-fill progress-fill-slate block"
                    :style="{ width: `${stanceSpamLock.percent * 100}%` }"
                  ></span>
                </span>
              </span>
            </div>
          </div>
        </button>

        <button
          @click="setStance('private_mode')"
          @pointerdown="punchTap"
          :disabled="!!stancePrivateLock"
          aria-label="Vakum kalkanı duruşuna geç"
          :aria-pressed="store.currentStance === 'private_mode'"
          class="btn-tactile h-11 px-2.5 sm:px-3 rounded-lg text-xs font-mono flex items-center gap-2 transition-all whitespace-nowrap"
          :class="stancePrivateLock
            ? 'ds-ramp-locked text-slate-400 border border-white/[0.04] bg-black/30 cursor-not-allowed'
            : store.currentStance === 'private_mode'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/45 shadow-sm cursor-pointer'
              : 'text-slate-300 hover:text-white border border-transparent cursor-pointer'"
        >
          <Lock v-if="stancePrivateLock" class="w-4 h-4 text-slate-400 shrink-0" />
          <Shield v-else class="w-4 h-4 text-cyan-400 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1.5">
              <span class="font-sans font-bold text-xs tracking-wide">Kalkan</span>
              <span
                v-if="!stancePrivateLock && store.currentStance === 'private_mode'"
                class="w-1.5 h-1.5 rounded-full bg-cyan-300 shrink-0"
                aria-hidden="true"
              ></span>
              <span
                v-if="stancePrivateLock"
                class="text-[9px] font-mono text-slate-400 tabular-nums"
              >
                {{ stancePrivateLock.progress }}
              </span>
            </div>
            <span
              v-if="!stancePrivateLock"
              class="text-[10px] font-mono tabular-nums"
              :class="store.currentStance === 'private_mode' ? 'text-cyan-200 font-bold' : 'text-slate-400'"
            >
              Hz Fiyat −%15
            </span>
            <div
              v-else
              class="flex items-center gap-1.5"
            >
              <span class="text-[9px] font-mono text-slate-400 tabular-nums">Hz −%15</span>
              <span class="inline-block w-14">
                <span class="progress-track progress-track-mini block">
                  <span
                    class="progress-fill progress-fill-slate block"
                    :style="{ width: `${stancePrivateLock.percent * 100}%` }"
                  ></span>
                </span>
              </span>
            </div>
          </div>
        </button>
      </div>

      <!-- Sağ: TAKTİL BUTONLAR (md:ml-auto ile duruş kapalıyken de sağda sabit) -->
      <div
        :class="[
          inChallenge || singularityReady ? 'flex' : 'hidden md:flex',
          'items-center justify-end gap-1.5 sm:gap-2 shrink-0 flex-nowrap overflow-x-auto py-0.5 max-w-full md:ml-auto'
        ]"
      >
        <!-- Hipnotik Seri rozeti: masaüstünde YUT butonunun solunda belirir (mobilde FloatingThumbBar'da gösterilir)
             Renk rampası combo yüzdesine göre cyan→slate (bonus durumu; amber/rose rezerve) -->
        <div
          v-if="comboActive"
          class="hidden md:flex h-11 px-2 rounded-xl border flex-col items-center justify-center gap-1 min-w-[54px] shrink-0 transition-colors duration-200"
          :class="comboRamp.box"
        >
          <span class="text-xs font-mono font-black tabular-nums leading-none" :class="comboRamp.text">{{ comboBadgeText }}</span>
          <div class="progress-track progress-track-mini w-full">
            <div
              class="progress-fill duration-150"
              :class="comboRamp.bar"
              :style="{ width: `${comboDrain * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- 1. Manuel Yut (Space / Consume) — masaüstü birincil taktil aksiyon (mobilde FloatingThumbBar'da yer alır) -->
        <button
          ref="swipeBtnRef"
          @click="handleManualClick($event)"
          @pointerdown="punchTap"
          class="hidden md:flex btn-tactile h-11 px-3.5 sm:px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-white border border-purple-400/50 text-xs font-bold font-sans items-center gap-2 cursor-pointer shadow-md active:scale-95 shrink-0 min-w-[115px] sm:min-w-[140px]"
          :class="{ 'cta-beacon': showFirstSwipeHint }"
          aria-label="Manuel kütle yut"
        >
          <ArrowUp class="w-4 h-4 text-purple-300 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1">
              <span class="tracking-wide">YUT!</span>
              <kbd class="hidden sm:inline-block px-1 py-0.5 rounded bg-black/50 border border-white/10 text-[10px] text-slate-400 font-sans font-normal">Space</kbd>
            </div>
            <span class="text-[10px] text-purple-200/80 font-mono font-normal tabular-nums truncate max-w-[65px] sm:max-w-[90px]">
              +{{ formattedClickPower }}
            </span>
          </div>
        </button>

        <!-- 2. Çekim Hızı (Hz / Tickspeed) — masaüstü ikincil kuantum modülatörü (mobilde FloatingThumbBar'da yer alır) -->
        <button
          @click="buyTickspeed"
          @pointerdown="punchTap"
          v-hold="buyTickspeed"
          :disabled="!canAffordTickspeed"
          aria-label="Çekim hızı yükselt"
          class="hidden md:flex btn-tactile h-11 px-2.5 sm:px-3 rounded-xl text-xs font-mono font-medium transition-all items-center gap-1.5 sm:gap-2 border shrink-0 min-w-[76px] sm:min-w-[92px]"
          :class="canAffordTickspeed
            ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border-cyan-500/35 cursor-pointer affordance-pulse'
            : `bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed ${tickspeedRampClass}`"
          :style="canAffordTickspeed ? { '--pulse-c1': 'rgba(0, 240, 255, 0.3)', '--pulse-c2': 'rgba(0, 240, 255, 0.7)' } : undefined"
        >
          <Cpu class="w-4 h-4 text-cyan-400 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400">Hz</span>
              <span class="font-bold tabular-nums text-white text-xs">×{{ tickspeedMultiplier }}</span>
            </div>
            <span class="text-[10px] text-cyan-300/90 font-mono tabular-nums truncate max-w-[60px] sm:max-w-[80px]">
              {{ tickspeedCost }}
            </span>
          </div>
        </button>

        <!-- 3. Tümünü Al Butonu — masaüstü üçüncül ghost HUD butonu (mobilde FloatingThumbBar'da yer alır) -->
        <button
          @click="maxAll"
          @pointerdown="punchTap"
          :disabled="!canAffordAny"
          aria-label="Tüm yükseltmeleri al"
          class="hidden md:flex btn-tactile h-11 px-2.5 sm:px-3 rounded-xl font-bold text-xs tracking-wider items-center gap-1.5 sm:gap-2 transition-all border font-mono shrink-0 min-w-[65px] sm:min-w-[74px]"
          :class="canAffordFullPack
            ? 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/20 cursor-pointer affordance-pulse'
            : `bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed ${maxAllRampClass}`"
          :style="canAffordFullPack ? { '--pulse-c1': 'rgba(255, 255, 255, 0.35)', '--pulse-c2': 'rgba(255, 255, 255, 0.75)' } : undefined"
        >
          <Layers class="w-4 h-4 text-slate-300 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <span class="text-xs font-bold">Tümü</span>
            <span class="text-[10px] text-slate-400 font-normal">Maks Al</span>
          </div>
        </button>

        <!-- 4. Kozmik Çöküş (Tekillik hazır) / Meydan Okumayı Tamamla -->
        <SingularityButton />
      </div>

      <!-- 5. Ayarlar Butonu (Masaüstü) -->
      <button
        @click="emit('open-settings')"
        aria-label="Ayarlar"
        class="hidden md:flex btn-tactile h-11 w-10 sm:w-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer items-center justify-center shrink-0"
      >
        <Settings class="w-4 h-4" />
      </button>
    </div>

    <!-- Aktif meydan okuma bandı (ince): kural özeti + hedef çubuğu + vazgeç -->
    <div
      v-if="inChallenge && store.activeChallengeDef"
      class="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.05] px-3 py-2 flex items-center gap-2.5"
    >
      <span class="text-base leading-none shrink-0">{{ store.activeChallengeDef.icon }}</span>
      <div class="min-w-0 flex-1">
        <div class="text-[11px] font-bold text-rose-200 truncate">
          {{ store.activeChallengeDef.name }}
          <span class="text-slate-400 font-normal">— {{ store.activeChallengeDef.ruleDesc }}</span>
        </div>
        <div class="progress-track progress-track-sm progress-track-bordered mt-1">
          <div
            class="progress-fill progress-fill-rose"
            :style="{ width: `${challengeProgressPct}%` }"
          ></div>
        </div>
      </div>
      <span class="text-[11px] font-mono text-rose-300 font-bold tabular-nums shrink-0">%{{ challengeProgressPct }}</span>
      <button
        @click="requestChallengeExit"
        aria-label="Meydan okumadan vazgeç"
        class="btn-tactile px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 cursor-pointer shrink-0"
      >
        Vazgeç
      </button>
    </div>

    <!-- QoL: meydan okumadan vazgeçme onayı -->
    <ConfirmModal
      v-if="showChallengeExitConfirm"
      title="Meydan Okumadan Vazgeç"
      message="Mevcut meydan okuma koşusu sıfırlanacak. Ceza yok, ödül yok — dilediğin zaman yeniden başlayabilirsin. Emin misin?"
      confirm-label="Vazgeç"
      :danger="false"
      @confirm="store.exitChallenge(); showChallengeExitConfirm = false"
      @cancel="showChallengeExitConfirm = false"
    />
  </header>
</template>
