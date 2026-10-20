<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import { useMotionReduced } from '../composables/useMotion'
import {
  TEACHING_TOAST_DURATION_MS,
  isTeachingEnabled,
  shouldShowTeaching
} from '../core/teaching-display'

/**
 * P4b — Sistem Açılış İpuçları (Öğretim Toastu).
 *
 * Plan §7.3 — "İlk karşılaşmada anlat, sonrasında göster":
 * Bir sistem oyuncuyla ilk kez karşılaştığında (P4a: kilidi AÇILDIĞI ANDA)
 * burada TEK cümlelik bir anlatım belirir. Kilitli şeyler görünmez; yalnızca
 * kilidi açıldığında ve YALNIZCA bir kez anlatılır.
 *
 * Sorumluluk sınırı:
 * - Store tarafı (P4a): `currentTeaching` getter + `dismissTeaching()` action.
 * - Karar tarafı (P4b): `core/teaching-display.ts` (saf, mount'suz, testli).
 * - Bu bileşen yalnızca BAĞLAR: göster/gizle, otomatik kapat, elle kapat.
 *
 * Görsel dil: mevcut sınıflar (glass-panel-card / ds-badge / progress-track /
 * progress-fill / layer-toast). Yeni tipografi, yeni kütüphane, yeni CSS dili yok.
 */

const store = useGameStore()
const motionReduced = useMotionReduced()

/** P4a store'dan gelen bekleyen öğretim (null → gösterilecek bir şey yok). */
const pending = computed(() => store.currentTeaching)

/**
 * Görünürlük kararı: ayar AÇIK ve bekleyen öğretim VARSA göster.
 * Ayar kapalıy (`teachingsEnabled: false`) toast HİÇ gösterilmez.
 */
const visible = computed(() => shouldShowTeaching(pending.value, isTeachingEnabled(store.settings)))

/** Ekranda gösterilecek öğretim (görünürlük + içerik tek nesnede). */
const active = computed(() => (visible.value ? pending.value : null))

/** Kalan süre oranı (0..1) — otomatik kapanış çubuğu için. */
const remainingRatio = ref(1)

/** Hareket kapısı: azaltılmış/off modda giriş-çıkış anında olur (useMotion kontratı). */
const transitionDuration = computed(() => (motionReduced.value ? 0 : 150))

let closeTimer: number | null = null
let tickTimer: number | null = null

function clearTimers(): void {
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
  if (tickTimer !== null) {
    window.clearTimeout(tickTimer)
    tickTimer = null
  }
}

/** Toast'u kapat: hem elle (X butonu) hem otomatik (süre doldu) akışı. */
function dismiss(): void {
  clearTimers()
  store.dismissTeaching()
}

/**
 * Otomatik kapanış — ~7 sn. "Kullanıcı okumazsa engel olmaz":
 * anlatım bir bildirimdir, kapı değildir; süre dolunca kendiliğinden kapanır.
 *
 * Sayaç, görünen öğretimin KİMLİĞİ değiştiğinde yeniden kurulur; aynı
 * öğretim yeniden kuyruğa girdiğinde kalan süre baştan başlamaz.
 */
function startAutoClose(): void {
  clearTimers()
  remainingRatio.value = 1
  const startedAt = Date.now()
  const step = (): void => {
    const elapsed = Date.now() - startedAt
    const left = Math.max(0, TEACHING_TOAST_DURATION_MS - elapsed)
    remainingRatio.value = left / TEACHING_TOAST_DURATION_MS
    if (left <= 0) {
      closeTimer = null
      dismiss()
      return
    }
    tickTimer = window.setTimeout(step, 120)
  }
  tickTimer = window.setTimeout(step, 120)
}

watch(
  () => active.value?.featureId ?? null,
  (featureId) => {
    if (featureId === null) {
      clearTimers()
      return
    }
    startAutoClose()
  },
  { immediate: true }
)

onUnmounted(clearTimers)
</script>

<template>
  <!-- role="status" + aria-live="polite": ekran okuyucu anlatımı duyurur.
       Toast bir modal değildir; odak tuzağı ve sekme döngüsü burada bilinçli
       olarak YOK (AchievementToast ile aynı davranış). -->
  <Transition name="fade" :duration="transitionDuration">
    <div
      v-if="active"
      role="status"
      aria-live="polite"
      class="layer-toast fixed left-0 right-0 top-3 mx-auto w-fit max-w-[calc(100vw-1.5rem)] pointer-events-none max-md:top-auto max-md:bottom-[124px]"
    >
      <div
        class="pointer-events-auto relative overflow-hidden glass-panel-card rounded-xl p-3 pl-3.5 flex items-start gap-3"
      >
        <!-- T1 — Kimlik glifi (tek karakterlik motif) -->
        <span class="text-2xl leading-none shrink-0 mt-0.5" aria-hidden="true">{{ active.glyph }}</span>

        <div class="min-w-0 flex-1">
          <!-- T3 — Mikro etiket + özellik adı -->
          <div class="flex items-center gap-2 min-w-0">
            <span class="ds-badge ds-badge-cyan">Yeni Sistem</span>
            <span class="text-sm font-bold text-white truncate">{{ active.title }}</span>
          </div>
          <!-- T4 — TEK cümle: ne işe yarar (yalnızca ilk karşılaşmada) -->
          <p class="text-[11px] leading-snug text-slate-300 mt-1">{{ active.body }}</p>
        </div>

        <!-- Kapatma (ikon-only yüzey → aria-label zorunlu) -->
        <button
          type="button"
          aria-label="İpucunu kapat"
          @click="dismiss"
          class="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
        </button>

        <!-- Otomatik kapanış çubuğu (mevcut progress-track / progress-fill dili) -->
        <div class="progress-track progress-track-mini absolute left-0 right-0 bottom-0" aria-hidden="true">
          <div
            class="progress-fill progress-fill-cyan"
            :style="{ width: Math.max(0, Math.min(100, remainingRatio * 100)) + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Giriş/çıkış animasyonu — repodaki mevcut "fade" geçiş dili (CommentTicker ile
   aynı tanım; yeni animasyon dili/tipografi eklenmedi). */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
