/**
 * Ses altyapisinin cekirdegi: AudioContext yasam dongusu ve paylasilan yardimcilar.
 *
 * SoundManagerBase; tembel (lazy) AudioContext olusturma, sekme gizlenince susturma,
 * ses duzeyi kelepcenleme ve osilator temizligi sorumluluklarini tasir. Efekt sesleri
 * SoundEffects, muzik koprusu ise SoundManager sinifindadir.
 */
export class SoundManagerBase {
  private ctx: AudioContext | null = null
  public enabled = true
  private _volume = 0.2
  public get volume(): number {
    return this._volume
  }
  public set volume(v: number) {
    if (!Number.isFinite(v)) {
      this._volume = 0.5
      return
    }
    this._volume = Math.min(1, Math.max(0, v))
  }
  public suppressed = false
  private suppressTimer: ReturnType<typeof setTimeout> | null = null

  // Hızlı tıklama / kombo frekans takibi (Pitch ramp — P0 Balatro: pentatonik C-D-E-G-A)
  protected lastClickTime = 0
  protected clickCombo = 0
  // Tally tick spam koruması: sayaç her kare tetikleyebilir, ses en sık 45ms'de bir
  protected lastTallyTime = 0
  protected readonly PITCH_SCALES = [1.0, 1.125, 1.25, 1.5, 1.667]

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Sekme arka plana geçtiğinde anında sustur
          this.suppressed = true
        } else {
          // Sekmeye geri dönüldüğünde catch-up/offline simülasyonu süresince
          // birikmiş ses patlamasını önlemek için geçici olarak sustur
          this.suppressFor(500)
        }
      })
    }
  }

  suppressFor(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return
    this.suppressed = true
    if (this.suppressTimer !== null) {
      clearTimeout(this.suppressTimer)
    }
    if (typeof window !== 'undefined') {
      this.suppressTimer = setTimeout(() => {
        this.suppressed = false
        this.suppressTimer = null
      }, ms)
    }
  }

  /** Çağrı başında kelepçelenmiş ses seviyesi (Web Audio exponentialRampToValueAtTime için > 0 olmalıdır; NaN → 0.5, aralık 0.0001..1). */
  protected safeVolume(): number {
    if (!Number.isFinite(this._volume)) return 0.5
    return Math.min(1, Math.max(0.0001, this._volume))
  }

  protected getContext(): AudioContext | null {
    if (!this.enabled || this.suppressed || this._volume <= 0.0001) return null
    // Çağrı başında volume sanitize — sonraki tüm setValueAtTime kazançları
    // sonlu olur (NaN sızarsa Web Audio TypeError atardı).
    if (!Number.isFinite(this._volume)) this._volume = 0.5
    else this._volume = Math.min(1, Math.max(0, this._volume))
    if (typeof document !== 'undefined' && document.hidden) return null
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  // Bellek sızıntılarını önlemek için osilatör ve gain node'larını temizleme
  protected registerCleanup(osc: OscillatorNode, ...nodes: (AudioNode | null | undefined)[]) {
    osc.onended = () => {
      try {
        osc.disconnect()
        for (let i = 0; i < nodes.length; i++) {
          nodes[i]?.disconnect()
        }
      } catch {
        // Node'lar zaten bağlantısız ise yut
      }
    }
  }
}
