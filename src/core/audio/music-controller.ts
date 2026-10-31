/**
 * Muzik koprusu: efekt sesleri ile core/music motoru arasinda tek cephe.
 *
 * AudioContext resume korumasi korunur: motor yalnizca kullanici etkilesimi
 * sonrasi resumeMusicOnInteraction ile uyandirilir; burada otomatik baslatma yoktur.
 */
import { SoundEffects } from "./effects"
import { musicEngine } from "../music"
import type { MusicTrackId } from "../../models/types"

export class SoundManager extends SoundEffects {
  /** Muzik motorunu acar/kapatir (ayarlar ekrani anahtari). */
  setMusicEnabled(enabled: boolean): void {
    musicEngine.setEnabled(enabled)
  }

  /** Muzik ses duzeyini 0..1 araliginda ayarlar. */
  setMusicVolume(volume: number): void {
    musicEngine.setVolume(volume)
  }

  /** Aktif muzik parcasini degistirir. */
  setMusicTrack(track: MusicTrackId): void {
    musicEngine.setTrack(track)
  }

  /**
   * Kullanici etkilesimi sonrasi muzik motorunu uyandirir.
   * Yalnizca etkilesim ardindan cagrilmalidir (otomatik calma korumasi).
   */
  resumeMusicOnInteraction(): void {
    musicEngine.resumeOnInteraction()
  }

  /** Muzik motorunun anlik durum ozeti. */
  get musicStatus() {
    return musicEngine.getStatus()
  }
}

export const sounds = new SoundManager()
