<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { isMotionReduced } from '../composables/useMotion'

const store = useGameStore()

// Kozmik çöküş ilerlemesi — Header telemetrisiyle aynı ilerleme (log10/308.25)
// 0 = Kuantum başlangıcı, 1 = Kozmik Tekillik eşiği (1.79e308 g).
const cosmicProgress = computed(() => {
  try {
    const m = store.matter
    if (m.isNan() || Number.isNaN(m.mag)) return 0
    if (!m.isFinite() || m.lt(10)) return 0
    const logVal = Math.max(0, m.log10().toNumber())
    if (!Number.isFinite(logVal)) return 0
    return Math.min(1, Math.max(0, logVal / 308.25))
  } catch {
    return 0
  }
})

// Efektlerin açık olup olmadığı (kullanıcı ayarı + pil tasarrufu)
const isEnabled = computed(() => {
  if (store.settings.batterySaver) return false
  return store.settings.screenOverlayEffects ?? true
})

// Olay Ufku Şafağı: Kütle tekilliğe yaklaştıkça alt ufukta beliren enerji ışıması
const singularityHorizonOpacity = computed(() => {
  if (!isEnabled.value) return 0
  const p = cosmicProgress.value
  if (p <= 0.5) return 0
  return Math.min(0.7, ((p - 0.5) / 0.5) * 0.7)
})

// Kozmik Kriz & Dalgalanma Perimetre Işığı
const hasFloatingAnomalies = computed(() => store.floatingAnomalies.length > 0)
const isCombo = computed(() => store.isComboActive)
const hasActiveBuffs = computed(() => store.activeBuffs.length > 0)
const hasCrisisAura = computed(() => isEnabled.value && (hasFloatingAnomalies.value || isCombo.value || hasActiveBuffs.value || !!store.activeChallenge || store.crisisBackfireDebuff > 0))

const primaryAnomalyType = computed(() => {
  if (store.activeChallenge || store.crisisBackfireDebuff > 0) return 'crisis'
  if (isCombo.value) return 'combo'
  if (store.floatingAnomalies.length > 0) return store.floatingAnomalies[0].type
  if (store.activeBuffs.length > 0) return store.activeBuffs[0].type
  return 'quantum'
})

const crisisAuraClass = computed(() => {
  if (primaryAnomalyType.value === 'crisis') return 'crisis-aura-rose'
  if (primaryAnomalyType.value === 'combo') return 'crisis-aura-combo'
  if (primaryAnomalyType.value === 'void') return 'crisis-aura-void'
  if (primaryAnomalyType.value === 'sponsor') return 'crisis-aura-cyan'
  return 'crisis-aura-purple'
})

const crisisFlash = ref(false)
let flashTimeout: ReturnType<typeof setTimeout> | null = null

// Faz C (C2) — kolaj substrat görünürlüğü: bozulma seviyesinden TS ile açılır,
// şiddet CSS `--substrate-opacity` tokenından gelir (Faz B eğrisi).
const corruptionLevel = computed(() => store.corruptionLevel)

function handleShockwave() {
  if (!isEnabled.value) return
  // Flaş: pil tasarrufu veya kısıtlı harekette flaş sınıfı eklenmez; temel aura katmanı kalır.
  if (store.settings.batterySaver || isMotionReduced()) return
  crisisFlash.value = true
  if (flashTimeout) clearTimeout(flashTimeout)
  flashTimeout = setTimeout(() => {
    crisisFlash.value = false
    flashTimeout = null
  }, 220)
}

onMounted(() => {
  window.addEventListener('doomscroll:shockwave', handleShockwave)
})

onUnmounted(() => {
  window.removeEventListener('doomscroll:shockwave', handleShockwave)
  if (flashTimeout) {
    clearTimeout(flashTimeout)
    flashTimeout = null
  }
})
</script>

<template>
  <div
    v-if="isEnabled"
    class="pointer-events-none fixed inset-0 w-screen h-screen max-w-full max-h-full z-30 overflow-hidden select-none"
    aria-hidden="true"
  >
    <!-- 1. DERİN UZAY & GRAVİTASYONEL TEKİLLİK VİNYETİ -->
    <div
      class="cosmic-vignette absolute inset-0 pointer-events-none"
      aria-hidden="true"
    ></div>

    <!-- 2. OLAY UFKU ENERJİ ŞAFAĞI (Tekillik kütlesine yaklaştıkça alt ufukta beliren kozmik aura) -->
    <div
      v-if="singularityHorizonOpacity > 0"
      class="singularity-horizon absolute inset-x-0 bottom-0 h-64 pointer-events-none transition-opacity duration-700"
      :style="{ opacity: singularityHorizonOpacity }"
      aria-hidden="true"
    ></div>

    <!-- 3. KUVVET ALANI & KOZMİK KRİZ PERİMETRE AURA'SI -->
    <div
      v-if="hasCrisisAura"
      class="crisis-perimeter-aura absolute inset-0 pointer-events-none transition-opacity duration-300"
      :class="[crisisAuraClass, crisisFlash ? 'opacity-90' : 'opacity-40 animate-pulse']"
    ></div>

    <!-- 4. FAZ C (C2) — GIC KOLAJ SUBSTRATI: K-seviyesiyle kademeli açılır (L2).
         Yalnız dekoratif kenarlar; sayı/etiket dokunulmaz (okunabilirlik kanonu). -->
    <template v-if="corruptionLevel >= 1">
      <div class="collage-torn collage-torn-tl" aria-hidden="true"></div>
      <div class="collage-torn collage-torn-tr" aria-hidden="true"></div>
      <div class="collage-torn collage-torn-bl" aria-hidden="true"></div>
      <div class="collage-torn collage-torn-br" aria-hidden="true"></div>
    </template>
    <template v-if="corruptionLevel >= 2">
      <div class="collage-checker absolute inset-x-0 top-0" aria-hidden="true"></div>
      <div class="collage-checker absolute inset-x-0 bottom-0" aria-hidden="true"></div>
    </template>
    <template v-if="corruptionLevel >= 3">
      <div class="collage-tape" style="top: 12px; left: 8%; transform: rotate(-14deg)" aria-hidden="true"></div>
      <div class="collage-tape" style="top: 12px; right: 8%; transform: rotate(11deg)" aria-hidden="true"></div>
      <div class="collage-tape" style="bottom: 14px; left: 12%; transform: rotate(9deg)" aria-hidden="true"></div>
      <div class="collage-tape" style="bottom: 14px; right: 12%; transform: rotate(-10deg)" aria-hidden="true"></div>
      <!-- K3 — GIC el yazısı annotasyonlar (font-hand/Caveat): yalnız ambient,
           aria-hidden, sayı/etiket katmanına dokunmaz (okunabilirlik kanonu). -->
      <span class="collage-scrawl font-hand" style="top: 58px; left: 14px; transform: rotate(-9deg)" aria-hidden="true">burayı kimse okumuyor</span>
      <span class="collage-scrawl font-hand" style="top: 44%; right: 14px; transform: rotate(6deg)" aria-hidden="true">daha çok aç...</span>
      <span class="collage-scrawl font-hand" style="bottom: 21%; left: 14px; transform: rotate(-5deg)" aria-hidden="true">uyumak yok, not al</span>
    </template>
    <div
      v-if="corruptionLevel >= 4"
      class="collage-floor absolute inset-x-0 bottom-0"
      aria-hidden="true"
    ></div>
  </div>
</template>

<style scoped>
.cosmic-vignette {
  /* Faz A "Aç Kumarhane": soğuk köşe kararması → sıcak ink-black + feast halkası.
     Soğuk cyan merkez ışıması korunur (derin uzay hissi). Değerler style.css
     :root ile senkron tutulur (tek kaynak). */
  background:
    radial-gradient(ellipse 65% 55% at 50% 40%, rgba(0, 240, 255, 0.02) 0%, transparent 70%),
    radial-gradient(ellipse 128% 108% at 50% 50%, transparent 55%,
      var(--ds-vignette-warm) 80%, var(--ds-vignette-core) 100%);
}

.singularity-horizon {
  background: linear-gradient(
    to top,
    rgba(245, 158, 11, 0.16) 0%,
    rgba(168, 85, 247, 0.08) 40%,
    transparent 100%
  );
}
</style>
