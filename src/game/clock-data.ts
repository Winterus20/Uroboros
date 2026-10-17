// Zaman Yayi (Time Clock) dengeli matematigi: gerginlik, salgi hizi, sure ve
// enerji formulleri. Saf moduldur; store/audio/DOM import etmez, yalniz tip alir.
import type { TimeClockState } from '../models/clock'

// ---- §2 Denge sabitleri (tek blok; magic number dagitmamak icin) ----
/** Kadranin geri sarilabilir oyun-zamani penceresi (sn). Bedel bu pencereden dogrusal gelir. */
export const TIME_CLOCK_SPAN_SECONDS = 120
/** Saatin ekranda kalma suresi (sn). Sarma penceresi; biterse yay kendiliginden bosalir. */
export const TIME_CLOCK_LIFETIME_SECONDS = 26
/** rad — hiperbolik sertlik katsayisi (bkz. `tensionFromDrag`). */
export const TIME_CLOCK_STIFFNESS_K = 2.0
/** rad — guvenlik clamp'i; tavan gerginlik ≈ 0.9966 (asla tam 1'e ulasmaz). */
export const TIME_CLOCK_MAX_DRAG = 600
/** Gerginlik/sn — yay sonumu (dusuk gerginlikteki taban hiz). */
export const TIME_CLOCK_DECAY_BASE_PER_SEC = 0.035
/** × — en zayif salgi (neredeyse sarmadan birakma). */
export const TIME_CLOCK_PEAK_SPEED_MIN = 1.5
/** × — tam gergin salgi. */
export const TIME_CLOCK_PEAK_SPEED_MAX = 16
/** sn — en kisa salgi suresi. */
export const TIME_CLOCK_RELEASE_SECONDS_MIN = 16
/** sn — en uzun salgi suresi. */
export const TIME_CLOCK_RELEASE_SECONDS_MAX = 75
/** Ustel sonum sekli; buyudukce hiz daha hizli 1×'e coker. */
export const TIME_CLOCK_RELEASE_DECAY_EXP = 1.6
/** sn — saat dogus araligi tabani. */
export const TIME_CLOCK_SPAWN_INTERVAL_MIN = 240
/** sn — dogus araligina eklenen rastgele sapma. */
export const TIME_CLOCK_SPAWN_JITTER = 90
/**
 * Altinda salmak anlamsizdir (net zarar). Yalnizca tasarim tabanini belgeler;
 * UI esigi SABIT degil, `releaseProfitRatio(tension) < 1` ile turetilir
 * (basabas ≈ 0.345), boylece denge ayari degisince uyari kendiliginden kayar.
 */
export const TIME_CLOCK_MIN_TENSION = 0.05

/** Guvenli tavan gerginlik: `MAX_DRAG / (MAX_DRAG + K)` ≈ 0.9966. */
export const TIME_CLOCK_MAX_TENSION = TIME_CLOCK_MAX_DRAG / (TIME_CLOCK_MAX_DRAG + TIME_CLOCK_STIFFNESS_K)

/** Guvenli 0..1 kirpma (sozlesmedeki tum oranlar bu aralikta yasar). */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

// ---------------------------------------------------------------------------
// Gerginlik (yay fizigi)
// ---------------------------------------------------------------------------

/**
 * Cevirme miktarindan gerginlik: `t = drag / (drag + K)`.
 * Hiperbolik doyum, gercek bir yayin sertlesmesidir: yay uzadikca her ek tur
 * daha az gerginlik kazandirir (son ceyrekte ayni gerginlik icin cok daha fazla
 * tur gerekir). Bu yuzden sonuc hep 1'in altinda kalir, asla 1'e ulasmaz.
 */
export function tensionFromDrag(drag: number): number {
  if (!Number.isFinite(drag) || drag <= 0) return 0
  return drag / (drag + TIME_CLOCK_STIFFNESS_K)
}

/**
 * Gerginlikten cevirme miktari (ters fonksiyon): `drag = K * t / (1 - t)`.
 * `t >= 1` tanimsizdir; guvenlik icin `MAX_DRAG` ile kirpilir.
 */
export function dragFromTension(tension: number): number {
  if (!Number.isFinite(tension) || tension <= 0) return 0
  if (tension >= 1) return TIME_CLOCK_MAX_DRAG
  const drag = (TIME_CLOCK_STIFFNESS_K * tension) / (1 - tension)
  if (!Number.isFinite(drag) || drag >= TIME_CLOCK_MAX_DRAG) return TIME_CLOCK_MAX_DRAG
  return drag
}

/** Gerginligin karsiligi geri sarilan oyun-zamani: `tension * SPAN`. Bedel tarafi budur. */
export function rewoundSecondsForTension(tension: number): number {
  return clamp01(tension) * TIME_CLOCK_SPAN_SECONDS
}

/**
 * Yayin kendiliginden sonumu: `t' = t - DECAY_BASE * (0.5 + 0.5 * t) * dt`.
 * Gergin yay daha hizli soner (taban hiz + gerginlige orantili ek terim), boylece
 * oyuncu durup bekleyerek "bedava" gerginlik biriktiremez; alt sinir 0'dir.
 */
export function applyTensionDecay(tension: number, deltaSeconds: number): number {
  if (!Number.isFinite(tension) || tension <= 0) return 0
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return tension
  const next = tension - TIME_CLOCK_DECAY_BASE_PER_SEC * (0.5 + 0.5 * tension) * deltaSeconds
  return next > 0 ? next : 0
}

// ---------------------------------------------------------------------------
// Salgi (odul tarafi)
// ---------------------------------------------------------------------------

/**
 * Salgi tepe hizi: `MIN + (MAX - MIN) * t ** 1.5`.
 * Ust-kuvvet (>1) bilinclidir: odul gerginlikle **kuadratikten de dik** buyur,
 * yani "az sarmak zarar, iyice germek kar" egrisini uretir.
 */
export function releasePeakSpeed(tension: number): number {
  const t = clamp01(tension)
  return TIME_CLOCK_PEAK_SPEED_MIN + (TIME_CLOCK_PEAK_SPEED_MAX - TIME_CLOCK_PEAK_SPEED_MIN) * Math.pow(t, 1.5)
}

/** Salgi suresi: `MIN + (MAX - MIN) * t`. Sure dogrusal buyur; asil kaldiraclar hiz ve enerjidir. */
export function releaseDuration(tension: number): number {
  const t = clamp01(tension)
  return TIME_CLOCK_RELEASE_SECONDS_MIN + (TIME_CLOCK_RELEASE_SECONDS_MAX - TIME_CLOCK_RELEASE_SECONDS_MIN) * t
}

/**
 * Tepe hizdan sureye ters cozum (§6.4): `releasePeakSpeed`'in tersidir,
 * `durationFromPeakSpeed(releasePeakSpeed(t)) === releaseDuration(t)`.
 * Store, `released` fazinda `duration`'i tekrar hesaplamak icin bunu kullanir.
 */
export function durationFromPeakSpeed(peakSpeed: number): number {
  if (!Number.isFinite(peakSpeed)) return TIME_CLOCK_RELEASE_SECONDS_MIN
  const span = TIME_CLOCK_PEAK_SPEED_MAX - TIME_CLOCK_PEAK_SPEED_MIN
  const norm = clamp01((peakSpeed - TIME_CLOCK_PEAK_SPEED_MIN) / span)
  return TIME_CLOCK_RELEASE_SECONDS_MIN + (TIME_CLOCK_RELEASE_SECONDS_MAX - TIME_CLOCK_RELEASE_SECONDS_MIN) * Math.pow(norm, 1 / 1.5)
}

/**
 * Anlik zaman hizi: `1 + (peak - 1) * (1 - τ) ** DECAY_EXP`, τ = clamp(elapsed / duration).
 * Ustel sonum: carpanda ani firlama, ardindan hizli cokus (tatmin edici "kurma-bosalma" hissi).
 * `elapsed = 0` → tam tepe hiz, `elapsed = duration` → 1× (notr).
 */
export function releaseSpeedAt(peakSpeed: number, elapsed: number, duration: number): number {
  if (!Number.isFinite(peakSpeed)) return 1
  if (!Number.isFinite(duration) || duration <= 0) return 1
  const tau = clamp01((Number.isFinite(elapsed) ? elapsed : 0) / duration)
  return 1 + (peakSpeed - 1) * Math.pow(1 - tau, TIME_CLOCK_RELEASE_DECAY_EXP)
}

/**
 * Salginin urettigi fazladan "normal uretim saniyesi" (analitik integral):
 * `(peak - 1) * duration / (DECAY_EXP + 1)`.
 * Sezgi: enerji hizin zamana gore alanidir; `speed - 1` egrisinin alani bu
 * kapali formdur. Odul dogrudan bu alanla olculur, anlik hizla degil.
 */
export function releaseEnergySeconds(peakSpeed: number, duration: number): number {
  if (!Number.isFinite(peakSpeed) || !Number.isFinite(duration)) return 0
  if (peakSpeed <= 1 || duration <= 0) return 0
  return ((peakSpeed - 1) * duration) / (TIME_CLOCK_RELEASE_DECAY_EXP + 1)
}

/**
 * Risk/odul orani: kazanilan enerji / geri sarilan saniye. Tasarimin cekirdegi:
 * bedel **dogrusal** (`rewoundSeconds`), odul **kuadratikten dik** (`energy`),
 * bu yuzden oran gerginlikle artar. 1'in altinda sarmak net zarardir.
 */
export function releaseProfitRatio(tension: number): number {
  const rewound = rewoundSecondsForTension(tension)
  if (rewound <= 0) return 0
  return releaseEnergySeconds(releasePeakSpeed(tension), releaseDuration(tension)) / rewound
}

// ---------------------------------------------------------------------------
// Durum yardimcilari
// ---------------------------------------------------------------------------

/**
 * Notr saat durumu. Her cagride **yeni** nesne dondurur; `state.ts` ve
 * `layers.ts` reset yollari ayni ornegi paylasirsa faz kacagi olusur.
 * Yasam boyu istatistikler burada DEGIL, `PlayerStats` icinde tutulur.
 */
export function createIdleTimeClock(): TimeClockState {
  return {
    phase: 'idle',
    active: false,
    drag: 0,
    remainingTime: 0,
    speed: 1,
    speedRemaining: 0,
    peakSpeed: 1
  }
}

/**
 * Bir sonraki saat dogusuna kadar gececek sure: `MIN + random * JITTER`.
 * Rastgelelik icerdigi icin saf degil ama yan etkisizdir.
 */
export function nextClockInterval(): number {
  return TIME_CLOCK_SPAWN_INTERVAL_MIN + Math.random() * TIME_CLOCK_SPAWN_JITTER
}
