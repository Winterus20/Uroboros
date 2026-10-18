<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { useMotionMode } from '../composables/useMotion'

/**
 * SideSnapHands — ekranın iki yanını saran şıklatan el şeridi.
 *
 * Asset (CC0, atıf: public/assets/hands/ATTRIBUTION.md):
 *   snap-hand-sheet.png — 1376x460 sprite, 4 kare (hazır / gerilim / vuruş / oturma).
 *   Kaynak GIF'in iki "vuruş flaşı" karesi sprite'a girmez; flaş CSS parlamasıdır.
 *
 * Katman: z=45 → içerik (10) + vinyet (30) + CRT (40) ÜSTÜNDE:
 * camın dışına yapışmış GIC kolajı gibi durur (scanline/vinyet kesmez).
 * Anomali (50) / juice (60) / toast (70) / modal (80) ALTTA kalır.
 * Kapılar: sideHands ayarı · batterySaver · motionMode (reduced=statik kare,
 * off=gizli) · OS prefers-reduced-motion (CSS'te animasyon düşer).
 * Tüm ekranlarda render olur; dar ekranda ince ve silik şerit, genişte tam boy.
 * Tıklama/üretim olaylarında 900ms'lik burst: döngü 3.6s → 0.9s + parlama.
 */

const store = useGameStore()
const motionMode = useMotionMode()

const burstActive = ref(false)
let burstTimeout: ReturnType<typeof setTimeout> | null = null

const isVisible = computed(() => {
  if (store.settings.batterySaver) return false
  if ((store.settings.sideHands ?? true) !== true) return false
  return motionMode.value !== 'off'
})

/** Kısıtlı hareket: animasyon yok, ilk kare sabit durur (okunabilirlik kanonu). */
const isStatic = computed(() => {
  return motionMode.value !== 'full' || store.settings.reduceAnimations === true
})

function triggerBurst(): void {
  if (!isVisible.value || isStatic.value) return
  burstActive.value = true
  if (burstTimeout) clearTimeout(burstTimeout)
  burstTimeout = setTimeout(() => {
    burstActive.value = false
    burstTimeout = null
  }, 900)
}

const BURST_EVENTS = [
  'doomscroll:tap',
  'doomscroll:production-bump',
  'doomscroll:macro-surge',
  'doomscroll:sequential-strike'
] as const

onMounted(() => {
  for (const name of BURST_EVENTS) window.addEventListener(name, triggerBurst)
})

onUnmounted(() => {
  for (const name of BURST_EVENTS) window.removeEventListener(name, triggerBurst)
  if (burstTimeout) {
    clearTimeout(burstTimeout)
    burstTimeout = null
  }
})
</script>

<template>
  <div
    v-if="isVisible"
    class="snap-wrap"
    :class="{ burst: burstActive, static: isStatic }"
    aria-hidden="true"
  >
    <aside class="snap-rail snap-left">
      <div class="snap-hand snap-top"></div>
      <div class="snap-hand snap-mid"></div>
      <div class="snap-hand snap-bottom"></div>
    </aside>
    <aside class="snap-rail snap-right">
      <div class="snap-hand snap-top"></div>
      <div class="snap-hand snap-mid"></div>
      <div class="snap-hand snap-bottom"></div>
    </aside>
  </div>
</template>

<style scoped>
.snap-wrap {
  position: fixed;
  inset: 0;
  z-index: 45;
  pointer-events: none;
  display: block;
  overflow: hidden;
  user-select: none;
}

/* .snap-wrap z-index: 45, #game-main-content z-index: 10 üzerinde pointer-events: none
   ambient bir çerçeve olarak durur; saat/modal katmanlarının altındadır. */
.snap-rail {
  position: absolute;
  top: 0;
  bottom: 0;
  width: clamp(64px, 16vw, 250px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 12vh 0 10vh;
}

.snap-left {
  /* Bilek ekran dışına taşar: el yandan çıkıyormuş gibi */
  left: calc(clamp(12px, 4vw, 32px) * -1);
}

.snap-right {
  right: calc(clamp(12px, 4vw, 32px) * -1);
}

.snap-hand {
  position: relative;
  width: 92%;
  aspect-ratio: 344 / 460;
  flex: 0 1 auto;
  min-height: 0;
  background-image: url("/assets/hands/snap-hand-sheet.png");
  background-size: 400% 100%;
  background-repeat: no-repeat;
  background-position: 0% 50%;
  opacity: 0.55;
  animation: snap-cycle 3.6s infinite;
  transition: opacity 0.25s ease, filter 0.25s ease;
  /* Kâğıt kalkıklığı: zeminden ayrık, üstte duran kesik hissi */
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.55));
}

/* Bilek dış kenarda gömülü, parmaklar oyun alanına bakıyor:
   sol şerit saat yönünde, sağ şerit aynalı + saat yönü tersi.
   Her ele birkaç derecelik yamukluk: elle yapıştırılmış kolaj hissi. */
.snap-left .snap-top {
  transform: rotate(84deg);
}

.snap-left .snap-mid {
  transform: rotate(91deg);
}

.snap-left .snap-bottom {
  transform: rotate(88deg);
}

.snap-right .snap-top {
  transform: scaleX(-1) rotate(96deg);
}

.snap-right .snap-mid {
  transform: scaleX(-1) rotate(89deg);
}

.snap-right .snap-bottom {
  transform: scaleX(-1) rotate(92deg);
}

/* Dalga: üç el aynı anda şıklamaz, kaskad hissi verir */
.snap-mid {
  animation-delay: -1.2s;
}

.snap-bottom {
  animation-delay: -2.4s;
}

/* Yapışkan bant: kolajın imzası. Bilek tarafında (dış kenarda) hafif yamuk bant. */
.snap-hand::after {
  content: "";
  position: absolute;
  bottom: -9px;
  left: 50%;
  width: 46%;
  height: 18px;
  transform: translateX(-50%) rotate(-4deg);
  background: linear-gradient(rgba(235, 224, 210, 0.22), rgba(235, 224, 210, 0.12));
  border-left: 1px dashed rgba(255, 255, 255, 0.22);
  border-right: 1px dashed rgba(255, 255, 255, 0.22);
  pointer-events: none;
}

.snap-mid::after {
  transform: translateX(-50%) rotate(5deg);
}

/* Burst: tıklama/üretim anında hızlı şıklatma + parlama */
.snap-wrap.burst .snap-hand {
  animation-duration: 0.9s;
  opacity: 0.95;
  filter: brightness(1.3) drop-shadow(0 8px 18px rgba(0, 0, 0, 0.6));
}

/* Kısıtlı hareket: tek kare, sessiz dekor */
.snap-wrap.static .snap-hand {
  animation: none;
  background-position: 0% 50%;
  opacity: 0.45;
}

/* Geniş ekranda tam boy + daha görünür: içerik kolonu ortada, yanlar boş */
@media (min-width: 1280px) {
  .snap-hand {
    opacity: 0.8;
  }

  .snap-wrap.static .snap-hand {
    opacity: 0.6;
  }
}

/*
 * 4 karelik şıklatma: hazır (uzun bekleme) → gerilim → VURUŞ → oturma.
 * Segment-içi timing her keyframe'de steps(1, end): kareler arası
 * yumuşak kayma (ghosting) olmaz, keskin flipbook atlaması olur.
 */
@keyframes snap-cycle {
  0% {
    background-position: 0% 50%;
    animation-timing-function: steps(1, end);
  }
  52% {
    background-position: 33.3333% 50%;
    animation-timing-function: steps(1, end);
  }
  64% {
    background-position: 66.6667% 50%;
    animation-timing-function: steps(1, end);
  }
  74% {
    background-position: 100% 50%;
    animation-timing-function: steps(1, end);
  }
  100% {
    background-position: 100% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .snap-hand {
    animation: none !important;
  }
}
</style>
