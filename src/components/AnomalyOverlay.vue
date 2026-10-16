<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { FloatingAnomaly, AnomalyType } from '../models/types'
import { safeConfetti } from '../core/celebrate'
import {
  Flame,
  Zap,
  Sparkles,
  Gem,
  Clock
} from 'lucide-vue-next'

const store = useGameStore()

const floatingAnomalies = computed(() => store.floatingAnomalies)
const activeBuffs = computed(() => store.activeBuffs)
const isCombo = computed(() => store.isComboActive)

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '')
}

function getIcon(type: AnomalyType | string) {
  if (type === 'fyp') return Flame
  if (type === 'heart_frenzy') return Zap
  if (type === 'void') return Sparkles
  if (type === 'espresso') return Zap
  return Gem
}

function getCategoryTag(type: AnomalyType | string) {
  if (type === 'fyp') return 'Süpernova (7× Kütle)'
  if (type === 'heart_frenzy') return 'Kütle Patlaması (777× Çekim)'
  if (type === 'void') return 'Hawking Işıması'
  if (type === 'espresso') return 'Planck Rezonansı'
  return 'Kozmik Dalgalanma'
}


// Tipe göre dış glow (kart parıltısı)
// heart_frenzy (777×, pozitif), void ve jenerik/sponsor anomali: cyan ailesi.
function getCapsuleGlow(type: AnomalyType | string) {
  if (type === 'fyp') return 'anomaly-glow-purple'
  return 'anomaly-glow-void'
}

function getAnomalyEdition(type: AnomalyType | string) {
  // ADR-0049 P1: edition sadece nadir anlarda. Sıradan anomaliler sakin kapsül.
  if (!(store.settings.holoCardsEnabled ?? true)) return ''
  if (type === 'void') return 'edition-poly'
  if (type === 'heart_frenzy') return 'edition-poly'
  return ''
}

function getTiltConfig(type: AnomalyType | string) {
  const disabled = !(store.settings.holoCardsEnabled ?? true)
  if (type === 'void') return { max: 14, scale: 1.07, disabled }
  return { max: 10, scale: 1.04, disabled }
}

function getTagStyle(type: AnomalyType | string) {
  if (type === 'fyp') return 'text-purple-300 bg-purple-500/10 border-purple-500/30'
  return 'text-cyan-200 bg-cyan-500/10 border-cyan-400/40'
}

function getProgressColor(type: AnomalyType | string) {
  if (type === 'fyp') return 'bg-purple-500'
  return 'bg-cyan-400'
}

function getRingColor(type: AnomalyType | string) {
  if (type === 'fyp') return '#c084fc'
  return '#22d3ee'
}

function getIconColor(type: AnomalyType | string) {
  if (type === 'fyp') return 'text-purple-400'
  if (type === 'espresso') return 'text-cyan-400'
  return 'text-cyan-300'
}

function getConfettiColors(type: AnomalyType | string) {
  if (type === 'fyp') return ['#a855f7', '#c084fc', '#ffffff']
  if (type === 'void') return ['#22d3ee', '#c084fc', '#ffffff']
  return ['#22d3ee', '#67e8f9', '#ffffff']
}

function getShockwaveColor(type: AnomalyType | string) {
  if (type === 'fyp') return '#a855f7'
  return '#22d3ee'
}

function totalOf(anomaly: FloatingAnomaly): number {
  const t = anomaly.totalTime || 14
  return t > 0 ? t : 14
}

function progressPercent(anomaly: FloatingAnomaly): number {
  const total = totalOf(anomaly)
  return Math.max(0, Math.min(100, (anomaly.remainingTime / total) * 100))
}

function ringOffset(anomaly: FloatingAnomaly): number {
  const C = 2 * Math.PI * 22
  return C * (1 - progressPercent(anomaly) / 100)
}

function anomalyLabel(anomaly: FloatingAnomaly): string {
  const secs = Math.max(0, Math.ceil(anomaly.remainingTime))
  return `${anomaly.title} — ${anomaly.desc} — Kalan süre ${secs} saniye`
}

function handleAnomalyClick(anomaly: FloatingAnomaly, event: MouseEvent) {
  const clientX = event.clientX || (window.innerWidth * (anomaly.x / 100))
  const clientY = event.clientY || (window.innerHeight * (anomaly.y / 100))

  const originX = Math.max(0, Math.min(1, clientX / window.innerWidth))
  const originY = Math.max(0, Math.min(1, clientY / window.innerHeight))

  // 1. Canvas Konfeti (manuel tıklama — sayfa görünürken kutlar)
  safeConfetti({
    particleCount: anomaly.type === 'void' ? 80 : 50,
    spread: anomaly.type === 'void' ? 95 : 75,
    origin: { x: originX, y: originY },
    colors: getConfettiColors(anomaly.type),
    disableForReducedMotion: true
  })

  // 2. Ekran Titremesi (Screen Shake)
  window.dispatchEvent(
    new CustomEvent('doomscroll:shake', {
      detail: { level: anomaly.type === 'heart_frenzy' || anomaly.type === 'void' ? 'hard' : 'medium' }
    })
  )

  // 3. Canvas 2D Neon Şok Dalgası ve Kıvılcım Patlaması
  window.dispatchEvent(
    new CustomEvent('doomscroll:shockwave', {
      detail: {
        x: clientX,
        y: clientY,
        color: getShockwaveColor(anomaly.type),
        maxRadius: anomaly.type === 'void' ? 260 : anomaly.type === 'heart_frenzy' ? 220 : 180
      }
    })
  )

  // 4. Dokunsal Yüzen Metin
  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x: clientX,
        y: clientY,
        text: anomaly.title,
        color: getShockwaveColor(anomaly.type)
      }
    })
  )

  store.clickAnomaly(anomaly.id)
}

function handleAnomalyKey(anomaly: FloatingAnomaly, event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    const fake = {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    } as MouseEvent
    handleAnomalyClick(anomaly, fake)
  }
}
</script>

<template>
  <div class="layer-anomaly pointer-events-none fixed inset-0 w-screen h-screen max-w-full max-h-full overflow-hidden">
    <!-- 1. Yüzen Gece Krizleri (Balatro Lazer Beam & Holo Kapsülleri) -->
    <TransitionGroup name="anomaly-pop" tag="div" class="absolute inset-0">
      <div
        v-for="anomaly in floatingAnomalies"
        :key="anomaly.id"
        :style="{ left: `${anomaly.x}%`, top: `${anomaly.y}%` }"
        role="button"
        tabindex="0"
        :aria-label="anomalyLabel(anomaly)"
        @click="handleAnomalyClick(anomaly, $event)"
        @keydown="handleAnomalyKey(anomaly, $event)"
        class="anomaly-wobble anomaly-item pointer-events-auto absolute cursor-pointer select-none"
        :class="{
          'anomaly-mythic': anomaly.type === 'void'
        }"
      >
        <!-- Dış Kapsül (Border Beam + Glow Container) -->
        <div
          v-tilt="getTiltConfig(anomaly.type)"
          class="anomaly-capsule card-tilt-surface relative overflow-hidden rounded-2xl p-[1.5px] transition-all min-w-[220px] max-w-[86vw] sm:min-w-[260px] sm:max-w-[340px]"
          :class="[
            getCapsuleGlow(anomaly.type),
            getAnomalyEdition(anomaly.type),
            anomaly.remainingTime <= 3.5 ? 'panic-pulse' : ''
          ]"
        >
          <!-- Dönen Lazer Çerçeve — ADR-0049 P1: yalnızca Void tekilliğinde -->
          <div v-if="anomaly.type === 'void'" class="anomaly-beam-border"></div>

          <!-- İç Kart İçeriği (solid zemin: mobil GPU dostu, blur yok) -->
          <div class="relative rounded-2xl bg-[#110d12] px-3.5 py-2.5 flex items-center gap-3 border border-white/[0.08] overflow-hidden">
            <!-- Holografik Sweep — ADR-0049 P1: yalnızca Void'de -->
            <div v-if="anomaly.type === 'void'" class="crisis-shimmer"></div>

            <!-- Sol İkon + Countdown Halkası -->
            <div class="relative w-11 h-11 shrink-0">
              <svg
                class="absolute -inset-[4px] w-[52px] h-[52px] -rotate-90 pointer-events-none"
                viewBox="0 0 50 50"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="25" cy="25" r="22" stroke="rgba(255,255,255,0.10)" stroke-width="3" />
                <circle
                  cx="25"
                  cy="25"
                  r="22"
                  :stroke="getRingColor(anomaly.type)"
                  stroke-width="3"
                  stroke-linecap="round"
                  :stroke-dasharray="`${(2 * Math.PI * 22).toFixed(1)}`"
                  :stroke-dashoffset="ringOffset(anomaly).toFixed(1)"
                  class="transition-all duration-150"
                />
              </svg>
              <div class="relative w-11 h-11 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shadow-inner overflow-hidden">
                <!-- Arka Plan Radial Glow -->
                <div
                  class="absolute inset-0 opacity-40 blur-sm pointer-events-none"
                  :class="anomaly.type === 'fyp' ? 'bg-purple-600' : 'bg-cyan-500'"
                ></div>

                <!-- FYP: Çok Katmanlı Alev SVG -->
                <svg
                  v-if="anomaly.type === 'fyp'"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-7 h-7 relative z-10"
                >
                  <path
                    d="M18 4C18 4 11 12 11 20C11 24.5 14 28 18 31C22 28 25 24.5 25 20C25 12 18 4 18 4Z"
                    :fill="`url(#flame-${safeId(anomaly.id)})`"
                    opacity="0.8"
                  />
                  <path
                    class="animate-flame-sub"
                    d="M18 13C18 13 14 18 14 23C14 26 15.5 28 18 29.5C20.5 28 22 26 22 23C22 18 18 13 18 13Z"
                    :fill="`url(#flamecore-${safeId(anomaly.id)})`"
                  />
                  <circle cx="18" cy="8" r="1.2" fill="#fbcfe8" class="animate-pulse" />
                  <defs>
                    <linearGradient :id="`flame-${safeId(anomaly.id)}`" x1="18" y1="4" x2="18" y2="31" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#c084fc" />
                      <stop offset="0.6" stop-color="#9333ea" />
                      <stop offset="1" stop-color="#581c87" />
                    </linearGradient>
                    <linearGradient :id="`flamecore-${safeId(anomaly.id)}`" x1="18" y1="13" x2="18" y2="29.5" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#ffffff" />
                      <stop offset="0.4" stop-color="#f472b6" />
                      <stop offset="1" stop-color="#e11d48" />
                    </linearGradient>
                  </defs>
                </svg>

                <!-- HEART FRENZY: Nabız Atan Siber Kalp & EKG SVG -->
                <svg
                  v-else-if="anomaly.type === 'heart_frenzy'"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-7 h-7 relative z-10"
                >
                  <path
                    class="animate-cyber-heart"
                    d="M18 29S8 21.5 8 13.5A6.5 6.5 0 0 1 18 9.2A6.5 6.5 0 0 1 28 13.5C28 21.5 18 29 18 29Z"
                    :fill="`url(#heart-${safeId(anomaly.id)})`"
                    stroke="#a5f3fc"
                    stroke-width="1.2"
                  />
                  <path
                    class="animate-ekg-line"
                    d="M9 19L14 19L16 14L19 24L21 17L23 19L27 19"
                    stroke="#ffffff"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <defs>
                    <linearGradient :id="`heart-${safeId(anomaly.id)}`" x1="18" y1="9" x2="18" y2="29" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#22d3ee" />
                      <stop offset="0.7" stop-color="#0891b2" />
                      <stop offset="1" stop-color="#164e63" />
                    </linearGradient>
                  </defs>
                </svg>

                <!-- VOID: Kara Delik Tekilliği & Yörünge Halkaları -->
                <svg
                  v-else-if="anomaly.type === 'void'"
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-7 h-7 relative z-10"
                >
                  <g class="animate-starburst-spin" opacity="0.85">
                    <ellipse cx="18" cy="18" rx="15" ry="6.5" stroke="#22d3ee" stroke-width="1" stroke-dasharray="3 2.5" transform="rotate(-18 18 18)" />
                    <ellipse cx="18" cy="18" rx="15" ry="6.5" stroke="#c084fc" stroke-width="0.8" stroke-dasharray="2 3" transform="rotate(22 18 18)" />
                  </g>
                  <circle cx="18" cy="18" r="8.5" :fill="`url(#void-${safeId(anomaly.id)})`" stroke="#a5f3fc" stroke-width="1.2" />
                  <circle cx="18" cy="18" r="3.4" fill="#020617" />
                  <circle cx="18" cy="18" r="3.4" fill="url(#voidhot)" opacity="0.9" class="animate-pulse" />
                  <circle cx="21.5" cy="11" r="1" fill="#ffffff" class="animate-pulse" />
                  <circle cx="12" cy="24.5" r="0.8" fill="#a5f3fc" opacity="0.9" />
                  <defs>
                    <radialGradient :id="`void-${safeId(anomaly.id)}`" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stop-color="#020617" />
                      <stop offset="55%" stop-color="#7c3aed" />
                      <stop offset="82%" stop-color="#22d3ee" />
                      <stop offset="100%" stop-color="#f0abfc" />
                    </radialGradient>
                    <radialGradient id="voidhot" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stop-color="#ffffff" />
                      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0" />
                    </radialGradient>
                  </defs>
                </svg>

                <!-- SPONSOR / VIRAL: Cyan Viral Elmas & Dönen Yıldız SVG -->
                <svg
                  v-else
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-7 h-7 relative z-10"
                >
                  <g class="animate-starburst-spin" opacity="0.6">
                    <line x1="18" y1="3" x2="18" y2="33" stroke="#22d3ee" stroke-width="1.2" stroke-dasharray="2 3" />
                    <line x1="3" y1="18" x2="33" y2="18" stroke="#22d3ee" stroke-width="1.2" stroke-dasharray="2 3" />
                    <line x1="7.4" y1="7.4" x2="28.6" y2="28.6" stroke="#22d3ee" stroke-width="0.8" stroke-dasharray="2 3" />
                    <line x1="7.4" y1="28.6" x2="28.6" y2="7.4" stroke="#22d3ee" stroke-width="0.8" stroke-dasharray="2 3" />
                  </g>
                  <path
                    d="M18 6L28 15L18 30L8 15L18 6Z"
                    :fill="`url(#diamond-${safeId(anomaly.id)})`"
                    stroke="#a5f3fc"
                    stroke-width="1.2"
                  />
                  <path d="M8 15H28M18 6L14 15L18 30L22 15L18 6Z" stroke="#a5f3fc" stroke-width="0.7" opacity="0.85" />
                  <defs>
                    <linearGradient :id="`diamond-${safeId(anomaly.id)}`" x1="18" y1="6" x2="18" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#67e8f9" />
                      <stop offset="0.5" stop-color="#22d3ee" />
                      <stop offset="1" stop-color="#0e7490" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <!-- Metinler & Etiketler -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <span class="flex items-center gap-1.5 min-w-0">
                  <span
                    class="text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs truncate"
                    :class="getTagStyle(anomaly.type)"
                  >
                    {{ getCategoryTag(anomaly.type) }}
                  </span>
                  <span
                    v-if="anomaly.type === 'void'"
                    class="edition-tag edition-tag-poly"
                  >
                    Nadir
                  </span>
                </span>
                <span
                  class="text-[10px] font-mono flex items-center gap-1 font-semibold shrink-0"
                  :class="anomaly.remainingTime <= 3.5 ? 'text-rose-400 animate-pulse' : 'text-slate-400'"
                >
                  <Clock class="w-3 h-3 text-slate-500" />
                  <span class="tabular-nums">{{ Math.ceil(anomaly.remainingTime) }}s</span>
                </span>
              </div>

              <h4 class="font-bold text-xs text-white truncate mt-1 tracking-tight">
                {{ anomaly.title }}
              </h4>
              <p class="text-[11px] text-slate-300 font-sans leading-tight line-clamp-1 mt-0.5">
                {{ anomaly.desc }}
              </p>
            </div>

            <!-- İnce Kalan Süre Çizgisi (Alt Taban) -->
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
              <div
                class="h-full transition-all duration-150 shadow-sm"
                :class="[
                  getProgressColor(anomaly.type),
                  anomaly.remainingTime <= 3.5 ? 'bg-rose-500 animate-pulse' : ''
                ]"
                :style="{ width: `${progressPercent(anomaly)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <!-- 2. Ekranın Üstünde Aktif Gece Krizleri Barı — kutlama modu: kriz varken kaçırılmaz -->
    <div
      v-if="isCombo || activeBuffs.length > 0"
      class="pointer-events-auto fixed top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-2xl w-full px-3"
    >
      <!-- Süper Rezonans Kombo Başlığı (Polychrome Balatro Banner) -->
      <div
        v-if="isCombo"
        class="edition-poly px-4 py-1.5 rounded-full border border-purple-500/50 text-purple-100 text-xs font-mono font-bold flex items-center gap-2 shadow-xl backdrop-blur-md"
      >
        <Flame class="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
        <span>Süper Rezonans: 7× Kütle + 777× Çekim Aktif</span>
      </div>

      <!-- Tekil Buff Sayaçları — kutlama hapı: gradient zemin, kalın border, ss→mm:ss -->
      <div v-if="activeBuffs.length > 0" class="flex flex-wrap items-center justify-center gap-2">
        <div
          v-for="buff in activeBuffs"
          :key="buff.id"
          class="backdrop-blur-md pl-3 pr-2 py-1.5 rounded-full border border-purple-500/30 bg-gradient-to-r from-purple-950/70 via-black/70 to-black/70 flex items-center gap-2 text-xs font-mono text-slate-100 shadow-lg"
        >
          <component :is="getIcon(buff.type)" class="w-4 h-4" :class="getIconColor(buff.type)" />
          <span class="font-bold text-[12px]">{{ buff.name }}</span>
          <span v-if="buff.multiplier > 1" class="text-[11px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-black">
            {{ buff.multiplier }}×
          </span>
          <span class="px-2 py-0.5 rounded-full bg-white/[0.1] border border-white/10 text-[11px] tabular-nums font-mono font-bold text-white">
            {{ buff.remaining >= 60 ? Math.floor(buff.remaining / 60) + ":" + String(Math.ceil(buff.remaining % 60)).padStart(2, "0") : Math.ceil(buff.remaining) + "s" }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
