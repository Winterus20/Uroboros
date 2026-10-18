<script setup lang="ts">
import { computed, type Component } from "vue";
import { useGameStore, AUTOBUYER_COSTS, getAutobuyerRequirementText } from "../../stores/game";
import { formatNumber } from "../../core/format";
import { getTierAccent, getTierGlyph } from "../../game/dimension_identity";
import type { AutobuyerMode } from "../../models/types";
import {
  Bot,
  Power,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  Gauge,
  Zap,
  Orbit,
  Radio
} from "lucide-vue-next";

const props = defineProps<{
  botKey: string;
  variant: "dim" | "operator" | "shop";
}>();

const store = useGameStore();

const bot = computed(() => store.autobuyers[props.botKey]);

// Şafak Nöbeti botunun açılış şartı (AUTOBUYER_PROGRESS_REQ.singularity ile aynı: 3 Çöküş)
const SINGULARITY_BOT_REQUIRED = 3;

// Katman kimliği: dim1..dim8 botları ada değil .dim-glyph glifine eşlik eder (durum değil, kimlik).
const dimTier = computed<number | null>(() => {
  if (!props.botKey.startsWith("dim")) return null;
  const parsed = Number(props.botKey.slice(3));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const tierGlyph = computed(() => (dimTier.value === null ? "" : getTierGlyph(dimTier.value)));
const tierAccent = computed(() => (dimTier.value === null ? "" : getTierAccent(dimTier.value)));

// Hız çarpanı
const speedMultiplierRaw = computed(() => store.autobuyerFleetSpeedMult);

// Kozmik operatör kartı görsel haritası (ikon, açıklama, vurgu rengi)
const OPERATOR_META: Record<string, { icon: Component; iconClass: string; desc: string; intervalClass: string; activeClass: string }> = {
  tickspeed: {
    icon: Gauge,
    iconClass: "text-cyan-400",
    desc: "Çekim Hızı (Hz) kaskadını otomatik hızlandırır.",
    intervalClass: "text-cyan-300",
    activeClass: "border-cyan-500/40 bg-cyan-950/20"
  },
  shift: {
    icon: Zap,
    iconClass: "text-purple-400",
    desc: "Hazır olduğunda boyut sıçramasını otomatik icra eder.",
    intervalClass: "text-purple-300",
    activeClass: "border-purple-500/40 bg-purple-950/20"
  },
  galaxy: {
    icon: Orbit,
    iconClass: "text-sky-400",
    desc: "Hazır olduğunda sonsuz akış kümesini otomatik kurar.",
    intervalClass: "text-sky-300",
    activeClass: "border-sky-500/40 bg-sky-950/20"
  }
};

const operatorMeta = computed(() => OPERATOR_META[props.botKey]);

// Faz 0 Dükkan Kontrolleri
function canUnlock(key: string): boolean {
  const cost = AUTOBUYER_COSTS[key];
  if (!cost) return false;
  if (!store.isAutobuyerRequirementMet(key)) return false;
  return store.matter.gte(cost);
}

function requirementText(key: string): string {
  return getAutobuyerRequirementText(String(key));
}

function requirementMet(key: string): boolean {
  return store.isAutobuyerRequirementMet(String(key));
}

// Rampa: ready'de cyan kimlik + pulse; şartlardan (ilerleme/kütle) tam biri karşılanmışsa partial.
const unlockAffordable = computed(() => {
  const cost = AUTOBUYER_COSTS[props.botKey];
  return !!cost && store.matter.gte(cost);
});

const unlockRampClass = computed(() => {
  if (canUnlock(props.botKey)) return ""; // ready → kimlik + pulse (ramp sınıfı yok)
  const requirementOk = store.isAutobuyerRequirementMet(props.botKey);
  return requirementOk || unlockAffordable.value ? "ds-ramp-partial" : "ds-ramp-locked";
});

// Tekillik botu şartı: 3 Çöküş ilerlemesi (çubukla görünür kalır)
const singularityReqPercent = computed(() =>
  Math.min(100, (store.singularities / SINGULARITY_BOT_REQUIRED) * 100)
);

function modeLabel(mode: string | undefined): string {
  if (mode === "bulk") return "×10";
  if (mode === "max") return "MAKS";
  return "×1";
}

function setMode(key: string, mode: AutobuyerMode): void {
  store.setAutobuyerMode(String(key), mode);
}

// Şafak Nöbeti Botu min-SP tabanı girişi
function onMinGainInput(event: Event, key: string): void {
  const input = event.target as HTMLInputElement;
  const raw = Number(input.value);
  const val = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  const target = store.autobuyers[key];
  if (target) target.minGainSp = val;
  input.value = String(val);
}
</script>

<template>
  <!-- Kokpit: Kuantum Boyut Botu (D1-D8) kompakt kartı -->
  <div
    v-if="variant === 'dim' && bot"
    class="glass-panel-card p-3.5 rounded-xl border flex flex-col justify-between transition-all"
    :class="bot.enabled
      ? 'border-cyan-500/40 bg-cyan-950/20 shadow-sm'
      : 'border-white/[0.08] bg-black/40 opacity-70'"
  >
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-1.5">
          <Bot class="w-3.5 h-3.5" :class="bot.enabled ? 'text-cyan-400' : 'text-slate-600'" />
          <span v-if="dimTier !== null" class="dim-glyph text-xs" :class="tierAccent">{{ tierGlyph }}</span>
          <span class="text-xs font-mono font-bold text-slate-200">{{ bot.name }}</span>
        </div>
        <span class="ds-badge text-[9px]" :class="bot.enabled ? 'ds-badge-cyan' : 'ds-badge-slate'">
          {{ bot.enabled ? 'AKTİF' : 'KAPALI' }}
        </span>
      </div>
      <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between">
        <span>Tetiklenme:</span>
        <span class="text-slate-200 font-bold tabular-nums">{{ (bot.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
      </div>
    </div>

    <!-- Mod Butonları & Aç/Kapa Şalteri -->
    <div class="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
      <div class="grid grid-cols-3 gap-1 flex-1">
        <button
          @click="setMode(botKey, 'single')"
          class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
          :class="bot.mode === 'single' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/30 text-slate-400 border-white/10 hover:text-slate-200'"
        >×1</button>
        <button
          @click="setMode(botKey, 'bulk')"
          class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
          :class="bot.mode === 'bulk' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/30 text-slate-400 border-white/10 hover:text-slate-200'"
        >×10</button>
        <button
          @click="setMode(botKey, 'max')"
          class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
          :class="bot.mode === 'max' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/30 text-slate-400 border-white/10 hover:text-slate-200'"
        >MAKS</button>
      </div>
      <button
        @click="store.toggleAutobuyer(botKey)"
        class="p-1.5 rounded-lg border cursor-pointer transition-all shrink-0 active:scale-95"
        :class="bot.enabled ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30' : 'bg-slate-500/20 text-slate-300 border-slate-500/40 hover:bg-slate-500/30'"
        :aria-label="bot.enabled ? 'Botu Durdur' : 'Botu Başlat'"
      >
        <Power class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>

  <!-- Kokpit: Kozmik Hız & Makro Operatör kartı -->
  <div
    v-else-if="variant === 'operator' && bot"
    class="glass-panel-card p-4 rounded-xl border flex flex-col justify-between"
    :class="botKey === 'singularity'
      ? (bot.unlocked
        ? bot.enabled ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-white/[0.08] bg-black/40'
        : 'ds-ramp-locked')
      : (bot.enabled && operatorMeta ? operatorMeta.activeClass : 'border-white/[0.08] bg-black/40')"
  >
    <!-- Şafak Nöbeti (Singularity) Botu -->
    <template v-if="botKey === 'singularity'">
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Radio class="w-4 h-4 text-cyan-400" />
            <h3 class="text-xs font-bold font-mono text-slate-200">{{ bot.name }}</h3>
          </div>
          <span v-if="bot.unlocked" class="ds-badge" :class="bot.enabled ? 'ds-badge-cyan' : 'ds-badge-slate'">
            {{ bot.enabled ? 'AKTİF' : 'BEKLEMEDE' }}
          </span>
          <span v-else class="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <Lock class="w-3 h-3" />
            <span>{{ SINGULARITY_BOT_REQUIRED }} Çöküş İster</span>
          </span>
        </div>
        <div v-if="bot.unlocked">
          <p class="text-[10px] text-slate-400 font-mono mb-2">Marjinal büyüme 3 sn boyunca oturduğunda evreni çökerterek SP toplar.</p>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-slate-400 font-mono">Taban SP:</span>
            <input
              type="number"
              min="1"
              step="1"
              :value="bot.minGainSp || 1"
              @change="onMinGainInput($event, 'singularity')"
              class="w-20 bg-black/50 border border-white/[0.1] rounded px-2 py-1 text-xs font-mono font-bold text-slate-200 tabular-nums focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
        <div v-else class="text-[11px] text-slate-500 font-mono">
          3 Tekillik Çöküşü tamamlandığında otomatik rampa çöküşü açılır.
          <div class="progress-track progress-track-mini mt-1.5">
            <div class="progress-fill progress-fill-amber" :style="{ width: `${singularityReqPercent}%` }"></div>
          </div>
        </div>
      </div>
      <div v-if="bot.unlocked" class="mt-3 pt-3 border-t border-white/[0.06]">
        <button
          @click="store.toggleAutobuyer('singularity')"
          class="w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold border cursor-pointer transition-all active:scale-95"
          :class="bot.enabled ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'"
        >
          {{ bot.enabled ? 'Durdur' : 'Başlat' }}
        </button>
      </div>
    </template>

    <!-- Frekans / Sıçrama / Küme operatörleri -->
    <template v-else-if="operatorMeta">
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <component :is="operatorMeta.icon" class="w-4 h-4" :class="operatorMeta.iconClass" />
            <h3 class="text-xs font-bold font-mono text-slate-200">{{ bot.name }}</h3>
          </div>
          <span class="ds-badge" :class="bot.enabled ? 'ds-badge-cyan' : 'ds-badge-slate'">{{ bot.enabled ? 'AKTİF' : 'KAPALI' }}</span>
        </div>
        <p class="text-[11px] text-slate-400 font-mono">{{ operatorMeta.desc }}</p>
        <div class="text-[11px] font-mono text-slate-300 mt-2">
          Tetiklenme: <span class="font-bold tabular-nums" :class="operatorMeta.intervalClass">{{ (bot.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
        </div>
      </div>
      <div v-if="botKey === 'tickspeed'" class="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
        <div class="grid grid-cols-3 gap-1 flex-1">
          <button @click="setMode(botKey, 'single')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'single' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/30 text-slate-400 border-white/10 hover:text-slate-200'">×1</button>
          <button @click="setMode(botKey, 'bulk')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'bulk' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/30 text-slate-400 border-white/10 hover:text-slate-200'">×10</button>
          <button @click="setMode(botKey, 'max')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'max' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/30 text-slate-400 border-white/10 hover:text-slate-200'">MAKS</button>
        </div>
        <button
          @click="store.toggleAutobuyer(botKey)"
          class="px-3 py-1 rounded-lg text-xs font-mono font-bold border cursor-pointer transition-all active:scale-95"
          :class="bot.enabled ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'"
        >
          {{ bot.enabled ? 'Durdur' : 'Başlat' }}
        </button>
      </div>
      <div v-else class="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-end">
        <button
          @click="store.toggleAutobuyer(botKey)"
          class="w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold border cursor-pointer transition-all active:scale-95"
          :class="bot.enabled ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'"
        >
          {{ bot.enabled ? 'Durdur' : 'Başlat' }}
        </button>
      </div>
    </template>
  </div>

  <!-- Faz 0 Dükkan bot kartı -->
  <div
    v-else-if="variant === 'shop' && bot"
    class="glass-panel-card p-4 rounded-xl flex flex-col justify-between"
    :class="[
      bot.unlocked
        ? bot.enabled ? 'border-cyan-500/40 bg-cyan-950/20' : ''
        : 'ds-ramp-locked'
    ]"
  >
    <div>
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Bot class="w-4 h-4" :class="bot.enabled && bot.unlocked ? 'text-cyan-400' : 'text-slate-600'" />
          <span v-if="dimTier !== null" class="dim-glyph text-sm" :class="tierAccent">{{ tierGlyph }}</span>
          <h3 class="text-xs font-bold font-mono text-slate-200">{{ bot.name }}</h3>
        </div>
        <span v-if="bot.unlocked" class="ds-badge" :class="bot.enabled ? 'ds-badge-cyan' : 'ds-badge-slate'">
          {{ bot.enabled ? 'AKTİF' : 'DEVRE DIŞI' }}
        </span>
        <span v-else class="text-[10px] font-mono text-slate-500 flex items-center gap-1">
          <Lock class="w-3 h-3" />
          <span>KİLİTLİ</span>
        </span>
      </div>

      <div class="text-[11px] text-slate-400 font-mono mt-1">
        <span v-if="bot.unlocked">
          <span class="ds-badge ds-badge-slate mr-1.5">{{ modeLabel(bot.mode) }}</span>
          Tetiklenme: <span class="text-slate-300 font-bold tabular-nums">{{ (bot.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
        </span>
        <span v-else>
          Açılış Maliyeti: <span class="font-bold tabular-nums" :class="unlockAffordable ? 'text-cyan-300' : 'text-slate-500'">{{ formatNumber(AUTOBUYER_COSTS[botKey], store.settings.notation) }} g Kütle</span>
          <span v-if="requirementText(botKey)" class="block text-[10px] mt-0.5" :class="requirementMet(botKey) ? 'text-slate-200' : 'text-slate-500'">İster: {{ requirementText(botKey) }}</span>
          <span class="block text-[10px] text-slate-500 mt-0.5">×1 modda başlar (8-20sn'de 1 adet)</span>
        </span>
      </div>
    </div>

    <!-- Şafak Nöbeti Botu: mod seçici yerine min-SP tabanı girişi -->
    <div v-if="bot.unlocked && botKey === 'singularity'" class="mt-3">
      <div class="text-[10px] text-slate-400 font-mono leading-relaxed mb-1.5">
        Marjinal büyüme koşu ortalamasına oturunca (3 sn) çöker. Taban:
      </div>
      <div class="flex items-center gap-2">
        <input
          type="number"
          min="1"
          step="1"
          :value="bot.minGainSp || 1"
          @change="onMinGainInput($event, botKey)"
          class="w-full bg-black/40 border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200 tabular-nums focus:outline-none focus:border-cyan-500/50"
        />
        <span class="text-[10px] text-slate-400 font-mono shrink-0">SP</span>
      </div>
    </div>

    <!-- Mod Seçici -->
    <div v-else-if="bot.unlocked" class="grid grid-cols-3 gap-1.5 mt-3">
      <button
        @click="setMode(botKey, 'single')"
        class="py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer"
        :class="(bot.mode || 'single') === 'single' ? 'bg-white/[0.10] text-white border-white/25' : 'bg-black/40 text-slate-400 border-white/10 hover:text-slate-200'"
      >
        ×1
      </button>
      <button
        @click="setMode(botKey, 'bulk')"
        :disabled="!store.autobuyerBulkUnlocked"
        class="py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer"
        :class="bot.mode === 'bulk' ? 'bg-white/[0.10] text-white border-white/25' : store.autobuyerBulkUnlocked ? 'bg-black/40 text-slate-400 border-white/10 hover:text-slate-200' : 'bg-black/30 text-slate-600 border-white/[0.06] cursor-not-allowed'"
      >
        ×10
      </button>
      <button
        @click="setMode(botKey, 'max')"
        :disabled="!store.autobuyerMaxUnlocked"
        class="py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer"
        :class="bot.mode === 'max' ? 'bg-white/[0.10] text-white border-white/25' : store.autobuyerMaxUnlocked ? 'bg-black/40 text-slate-400 border-white/10 hover:text-slate-200' : 'bg-black/30 text-slate-600 border-white/[0.06] cursor-not-allowed'"
      >
        MAKS
      </button>
    </div>

    <!-- Butonlar -->
    <div class="mt-4 pt-3 border-t border-white/[0.06]">
      <button
        v-if="bot.unlocked"
        @click="store.toggleAutobuyer(botKey)"
        class="btn-tactile w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border"
        :class="bot.enabled
          ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-500/40'
          : 'bg-slate-500/15 hover:bg-slate-500/25 text-slate-300 border-slate-500/30'"
      >
        <ToggleRight v-if="bot.enabled" class="w-4 h-4" />
        <ToggleLeft v-else class="w-4 h-4" />
        <span>{{ bot.enabled ? 'Durdur' : 'Başlat' }}</span>
      </button>

      <button
        v-else
        @click="store.unlockAutobuyer(botKey)"
        :disabled="!canUnlock(botKey)"
        class="btn-tactile w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border"
        :class="canUnlock(botKey)
          ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50 affordance-pulse'
          : `bg-black/30 text-slate-500 border-white/[0.05] ${unlockRampClass}`"
      >
        <Unlock class="w-3.5 h-3.5" />
        <span>{{ !requirementMet(botKey) ? 'Kilitli: ' + requirementText(botKey) : canUnlock(botKey) ? 'Botu Satın Al' : 'Yetersiz Kütle' }}</span>
      </button>
    </div>
  </div>
</template>
