import { useGameStore } from '../stores/game'
import { SaveSystem } from './save'
import { OFFLINE_CAP_SECONDS } from '../stores/game'

// Arka plan sekmesinde rAF durduğu için dönüşteki büyük delta'yı
// offline yakalamaya devreden eşik (sn cinsinden).
const BACKGROUND_CATCHUP_THRESHOLD = 5

export class GameLoop {
  private lastTime = performance.now()
  private accumulator = 0
  private readonly TICK_RATE = 50 // ms cinsinden adım süresi (20 TPS)
  private autoSaveTimer = 0
  private isRunning = false
  private animFrameId: number | null = null
  // QoL: sekme gizlenirken anında kayıt (rAF durduğunda son durum korunur)
  private handleVisibility: (() => void) | null = null
  private handlePageHide: (() => void) | null = null
  private handleBeforeUnload: ((e: BeforeUnloadEvent) => void) | null = null

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.accumulator = 0

    const store = useGameStore()
    const loop = (currentTime: number) => {
      if (!this.isRunning) return

      const rawDelta = currentTime - this.lastTime
      this.lastTime = currentTime

      if (rawDelta < 0) {
        // Sistem saati geriye atladı (NTP düzeltmesi vb.) — delta'yı yok say
        this.accumulator = 0
      } else if (rawDelta >= 1000) {
        // 1 saniye ve üzeri duraklamalar / sekme değişimi: offline simülasyona devret
        // (24 saat ile sınırlıdır; Welcome Back raporu store.offlineReport'a yazılır)
        store.simulateOffline(Math.min(rawDelta / 1000, OFFLINE_CAP_SECONDS))
        this.accumulator = 0
      } else {
        this.accumulator += rawDelta
        // 1 saniyelik azami tampon (20 tick) — küçük kare düşüşlerinde ilerleme buharlaşmaz
        this.accumulator = Math.min(this.accumulator, 1000)
        // Sabit adımlı accumulator pattern: kare başına azami 20 tick çalıştır
        let steps = 0
        while (this.accumulator >= this.TICK_RATE && steps < 20) {
          store.update(this.TICK_RATE / 1000)
          this.accumulator -= this.TICK_RATE
          steps++
        }
      }

      // Otomatik Kayıt (Her 10 saniyede bir)
      this.autoSaveTimer += Math.max(0, Math.min(rawDelta, 1000))
      if (this.autoSaveTimer >= 10000) {
        this.autoSaveTimer = 0
        SaveSystem.save(store.serialize())
      }

      this.animFrameId = requestAnimationFrame(loop)
    }

    // QoL: sekme gizlenirken/görünürken anlık kayıt — rAF tabanlı oyunda
    // gizlenen sekmede herhangi bir tick çalışmaz, son durum diskte güvende olmalı.
    this.handleVisibility = () => {
      if (document.hidden) {
        SaveSystem.save(useGameStore().serialize())
      } else {
        const now = performance.now()
        const rawDelta = now - this.lastTime
        if (rawDelta > BACKGROUND_CATCHUP_THRESHOLD * 1000) {
          useGameStore().simulateOffline(Math.min(rawDelta / 1000, OFFLINE_CAP_SECONDS))
          this.accumulator = 0
        }
        this.lastTime = now
      }
    }
    document.addEventListener('visibilitychange', this.handleVisibility)
    // Kapanış koruması: visibilitychange mobilde her zaman ateşlenmez;
    // pagehide + beforeunload ile son durum diske yazılır.
    this.handlePageHide = () => {
      try {
        SaveSystem.save(useGameStore().serialize())
      } catch {
        // Kapanış yolunda sessiz geç
      }
    }
    this.handleBeforeUnload = () => {
      try {
        SaveSystem.save(useGameStore().serialize())
      } catch {
        // Kapanış yolunda sessiz geç
      }
    }
    document.addEventListener('pagehide', this.handlePageHide)
    window.addEventListener('beforeunload', this.handleBeforeUnload)

    this.animFrameId = requestAnimationFrame(loop)
  }

  stop() {
    this.isRunning = false
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    if (this.handleVisibility) {
      document.removeEventListener('visibilitychange', this.handleVisibility)
      this.handleVisibility = null
    }
    if (this.handlePageHide) {
      document.removeEventListener('pagehide', this.handlePageHide)
      this.handlePageHide = null
    }
    if (this.handleBeforeUnload) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
      this.handleBeforeUnload = null
    }
    try {
      SaveSystem.save(useGameStore().serialize())
    } catch {
      // Durdurma yolunda sessiz geç
    }
  }
}

export const gameLoop = new GameLoop()
