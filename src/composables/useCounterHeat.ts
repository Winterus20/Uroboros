import { computed, ref, watch } from "vue";
import type { Ref } from "vue";
import { useGameStore } from "../stores/game";
import { D_1 } from "../core/math";
import { sounds } from "../core/audio";
import { safeConfetti, isPageVisible } from "../core/celebrate";
import { isMotionReduced, useMotionMode } from "./useMotion";

/**
 * Sayac isi / alev / dekad fisegi mantigi.
 * ADR-0049: surekli nabiz kapali (counterHeatClass her zaman ""), olay ani
 * efektleri (decadeFlash) korunur. Alev histerezisi kapali, flameOn false kalir.
 */
export function useCounterHeat(counterRef: Ref<HTMLElement | null>) {
  const store = useGameStore();

  // 3 durumlu hareket kapısı: kök-sınıf mührü ('reduced'/'off') + reaktif mod (ayar
  // değişince computed canlı yenilenir) + pil tasarrufu.
  const motionMode = useMotionMode();
  const motionOff = computed(() => isMotionReduced() || motionMode.value !== "full" || store.settings.batterySaver);

  function currentDecade(): number {
    try {
      const m = store.matter;
      if (m.isNan() || Number.isNaN(m.mag)) return 0;
      if (!m.isFinite() || m.lte(0)) return 0;
      return Math.max(0, Math.floor(m.log10().toNumber()));
    } catch {
      return 0;
    }
  }

  function logMpsNow(): number {
    try {
      const mps = store.matterPerSecond;
      if (mps.isNan() || Number.isNaN(mps.mag)) return -1;
      if (!mps.isFinite() || mps.lte(0)) return -1;
      return mps.log10().toNumber();
    } catch {
      return -1;
    }
  }

  const heatScore = computed(() => {
    const l = logMpsNow();
    if (!Number.isFinite(l)) return 0;
    const base = Math.min(1, Math.max(0, (l + 1) / 8));
    let burst = 0;
    try {
      const mps = store.matterPerSecond;
      if (mps.isFinite() && !mps.isNan() && mps.gt(0)) {
        const baseM = store.matter.gte(D_1) ? store.matter : D_1;
        const rel = mps.div(baseM).toNumber();
        if (Number.isFinite(rel) && rel > 0) burst = Math.min(0.35, rel * 0.35);
      }
    } catch {
      burst = 0;
    }
    return Math.min(1, base + burst);
  });

  const flameOn = ref(false);
  watch(heatScore, (s: number) => {
    if (flameOn.value && (s < 0.6 || motionOff.value)) {
      flameOn.value = false;
    }
  });

  const counterHeatClass = computed(() => {
    return "";
  });

  const decadeFlash = ref(false);
  let decadeTimer: number | null = null;
  let lastDecade = 0;
  let lastDecadeShakeAt = 0;

  function checkDecade(): void {
    const dec = currentDecade();
    if (dec > lastDecade) {
      lastDecade = dec;
      if (!motionOff.value) {
        decadeFlash.value = true;
        if (decadeTimer !== null) clearTimeout(decadeTimer);
        decadeTimer = window.setTimeout(() => {
          decadeFlash.value = false;
          decadeTimer = null;
        }, 900);
        if (dec % 10 === 0 && dec > 0) {
          if (isPageVisible()) {
            safeConfetti({ particleCount: 40, spread: 70, ticks: 120, disableForReducedMotion: true });
          }
          try {
            sounds.playPayoff();
            const now = Date.now();
            if (now - lastDecadeShakeAt >= 4000) {
              lastDecadeShakeAt = now;
              window.dispatchEvent(new CustomEvent("doomscroll:shake", { detail: { level: "medium" } }));
            }
            const r = counterRef.value?.getBoundingClientRect();
            if (r) {
              window.dispatchEvent(
                new CustomEvent("doomscroll:shockwave", {
                  detail: { x: r.left + r.width / 2, y: r.top + r.height / 2, color: "#fbbf24", maxRadius: 220 }
                })
              );
            }
          } catch {
            /* yoksay */
          }
        } else {
          sounds.playTallyTick(0.7);
        }
      } else {
        lastDecade = dec;
        sounds.playTallyTick(0.5);
      }
    } else if (dec !== lastDecade) {
      lastDecade = dec;
    }
  }

  function syncDecade(): void {
    lastDecade = currentDecade();
  }

  function disposeDecade(): void {
    if (decadeTimer !== null) {
      clearTimeout(decadeTimer);
      decadeTimer = null;
    }
  }

  return { heatScore, counterHeatClass, flameOn, decadeFlash, motionOff, checkDecade, syncDecade, disposeDecade };
}
