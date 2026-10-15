<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { sounds } from '../core/audio'
import { isMotionReduced } from '../composables/useMotion'

interface QuantumRipple {
  id: number
  x: number
  y: number
  scale: number
  color: string
}

const store = useGameStore()
const ripples = ref<QuantumRipple[]>([])
let nextRippleId = 1

let lastTapTime = 0
let lastTapX = 0
let lastTapY = 0
const DOUBLE_TAP_MAX_DELAY = 320 // ms
const DOUBLE_TAP_MAX_DIST = 35 // px

const QUANTUM_COLORS = [
  '#00f0ff', // Quantum cyan
  '#38bdf8', // Sky plasma
  '#a855f7', // Gravitational purple
  '#f59e0b', // Singularity amber
  '#67e8f9'  // Electric cyan
]

function spawnRipple(x: number, y: number) {
  // Kısıtlı/devre dışı hareket (3 durumlu kapı): ripple çizilmez; ses + manualClick devam eder.
  if (isMotionReduced()) {
    sounds.playHapticTap()
    store.manualClick({ x, y })
    return
  }

  const id = nextRippleId++
  const color = QUANTUM_COLORS[Math.floor(Math.random() * QUANTUM_COLORS.length)]
  const scale = 0.9 + Math.random() * 0.3

  ripples.value.push({
    id,
    x,
    y,
    scale,
    color
  })

  // Ses ve oyun içi çift vuruş etkisi
  sounds.playHapticTap()
  store.manualClick({ x, y })

  // 650ms sonra temizle
  setTimeout(() => {
    ripples.value = ripples.value.filter((r) => r.id !== id)
  }, 650)
}

let pointerDownTime = 0
let pointerDownX = 0
let pointerDownY = 0
let pointerScrollY = 0

function handlePointerDown(e: PointerEvent) {
  // Sadece birincil dokunuş / sol tık
  if (e.isPrimary === false || (e.button !== undefined && e.button !== 0)) return
  pointerDownTime = performance.now()
  pointerDownX = e.clientX
  pointerDownY = e.clientY
  pointerScrollY = window.scrollY || document.documentElement.scrollTop || 0
}

function handlePointerUp(e: PointerEvent) {
  if (pointerDownTime === 0) return
  const elapsed = performance.now() - pointerDownTime
  pointerDownTime = 0

  // Jestler kapalıysa çift tıkla kütle artırma yapma
  if (store.settings.swipeSensitivity === 'off') return

  // Input, buton veya tıklanabilir öğelerde çift tık jesti tetikleme
  const target = e.target as HTMLElement | null
  if (target?.closest('button, a, input, select, textarea, [role="button"]')) {
    return
  }

  // Sayfa kaydıysa veya parmak 12px'den fazla sürüklendiyse (scroll/drag) kesinlikle tık değildir
  const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0
  if (Math.abs(currentScrollY - pointerScrollY) > 5) return

  const moveDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY)
  if (moveDist > 12 || elapsed > 240) return

  const now = performance.now()
  const tapDist = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY)

  if (now - lastTapTime < DOUBLE_TAP_MAX_DELAY && tapDist < DOUBLE_TAP_MAX_DIST) {
    // Gerçek sabit çift dokunuş tespit edildi: Kuantum Rezonans Dalgası!
    spawnRipple(e.clientX, e.clientY)
    lastTapTime = 0
  } else {
    lastTapTime = now
    lastTapX = e.clientX
    lastTapY = e.clientY
  }
}

// Dışarıdan olay tetikleme desteği
function handleCustomHeart(e: Event) {
  const customEvent = e as CustomEvent<{ x: number; y: number }>
  if (customEvent.detail) {
    spawnRipple(customEvent.detail.x, customEvent.detail.y)
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handlePointerDown, { passive: true })
  window.addEventListener('pointerup', handlePointerUp, { passive: true })
  window.addEventListener('doomscroll:heart', handleCustomHeart)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('doomscroll:heart', handleCustomHeart)
})
</script>

<template>
  <div class="quantum-burst-container pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
    <div
      v-for="ripple in ripples"
      :key="ripple.id"
      class="quantum-ripple"
      :style="{
        left: `${ripple.x}px`,
        top: `${ripple.y}px`,
        '--ripple-color': ripple.color,
        '--ripple-scale': ripple.scale
      }"
    >
      <!-- Merkez Enerji Çekirdeği -->
      <div class="ripple-core"></div>
      <!-- İç Halka -->
      <div class="ripple-ring-inner"></div>
      <!-- Dış Gravitasyonel Şok Dalgası -->
      <div class="ripple-ring-outer"></div>
    </div>
  </div>
</template>

<style scoped>
.quantum-ripple {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  will-change: transform, opacity;
}

.ripple-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background-color: #fff;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 16px var(--ripple-color);
  animation: core-fade 0.4s ease-out forwards;
}

.ripple-ring-inner {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  border: 1.5px solid var(--ripple-color);
  transform: translate(-50%, -50%) scale(0.2);
  box-shadow: 0 0 10px var(--ripple-color), inset 0 0 8px var(--ripple-color);
  animation: ring-expand 0.55s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
}

.ripple-ring-outer {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 60px;
  height: 60px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  transform: translate(-50%, -50%) scale(0.1);
  box-shadow: 0 0 18px var(--ripple-color);
  animation: ring-expand-outer 0.65s cubic-bezier(0.1, 0.85, 0.25, 1) forwards;
}

@keyframes core-fade {
  0% { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
}

@keyframes ring-expand {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(calc(var(--ripple-scale, 1) * 2.2));
    opacity: 0;
  }
}

@keyframes ring-expand-outer {
  0% {
    transform: translate(-50%, -50%) scale(0.1);
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) scale(calc(var(--ripple-scale, 1) * 2.8));
    opacity: 0;
  }
}
</style>
