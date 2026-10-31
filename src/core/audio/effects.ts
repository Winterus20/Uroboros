/**
 * Efekt sesleri: SoundManagerBase üzerindeki play* sentezleyicileri.
 * Yalnız oyunun kullandığı sesler burada yaşar (tap · +1 · halka alımı · çan · arpej);
 * eski temaların efektleri tema pivotunda (ADR-0077/0079) kullanılmaz hale geldi ve silindi.
 */
import { SoundManagerBase } from "./manager"

export class SoundEffects extends SoundManagerBase {
  /** Hafif mekanik UI tıklaması (sekme, menü, küçük düğmeler). */
  playHapticTap() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.018)

    gain.gain.setValueAtTime(this.safeVolume() * 0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.018)

    osc.connect(gain)
    gain.connect(ctx.destination)

    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.018)
  }

  /** `+1` tıklaması: hızlı ardışık basışta pentatonik perde rampası (son 400 ms penceresi). */
  playClick() {
    const ctx = this.getContext()
    if (!ctx) return

    // Hızlı ardışık tıklamada kombo basamağı yükselir (son 400ms penceresi)
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - this.lastClickTime < 400) {
      this.clickCombo = Math.min(this.clickCombo + 1, this.PITCH_SCALES.length - 1)
    } else {
      this.clickCombo = 0
    }
    this.lastClickTime = now

    const pitchMultiplier = this.PITCH_SCALES[this.clickCombo]

    // 1. Yükselen frekans süpürmesi
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    const startFreq = 320 * pitchMultiplier
    const endFreq = 740 * pitchMultiplier

    osc.frequency.setValueAtTime(startFreq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.055)

    gain.gain.setValueAtTime(this.safeVolume() * 0.42, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055)

    osc.connect(gain)
    gain.connect(ctx.destination)

    // 2. Kısa taktil bas pop'u (dokunsal derinlik)
    const popOsc = ctx.createOscillator()
    const popGain = ctx.createGain()
    popOsc.type = 'triangle'
    popOsc.frequency.setValueAtTime(140 * pitchMultiplier, ctx.currentTime)
    popOsc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.035)

    popGain.gain.setValueAtTime(this.safeVolume() * 0.28, ctx.currentTime)
    popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035)

    popOsc.connect(popGain)
    popGain.connect(ctx.destination)

    this.registerCleanup(osc, gain)
    this.registerCleanup(popOsc, popGain)

    osc.start()
    osc.stop(ctx.currentTime + 0.055)
    popOsc.start()
    popOsc.stop(ctx.currentTime + 0.035)
  }

  /** Halka alımı: halka sırasıyla tizleşen melodik yükseliş + kısa bas tokmağı. */
  playBuy(tier = 1) {
    const ctx = this.getContext()
    if (!ctx) return

    // Melodik yükseliş
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'

    const baseFreq = 300 + Math.min(tier, 10) * 35
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, ctx.currentTime + 0.075)

    gain.gain.setValueAtTime(this.safeVolume() * 0.45, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.075)

    // Satın alma mekanik bas tokmağı
    const bassOsc = ctx.createOscillator()
    const bassGain = ctx.createGain()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(150, ctx.currentTime)
    bassOsc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.05)

    bassGain.gain.setValueAtTime(this.safeVolume() * 0.32, ctx.currentTime)
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

    bassOsc.connect(bassGain)
    bassGain.connect(ctx.destination)
    this.registerCleanup(bassOsc, bassGain)
    bassOsc.start()
    bassOsc.stop(ctx.currentTime + 0.05)
  }

  /** İki notalı açılış çanı (E6 → B6): mücadele tamamlanması gibi büyük anlar. */
  playPayoff() {
    const ctx = this.getContext()
    if (!ctx) return

    const notes = [1318.51, 1975.53]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      const startTime = ctx.currentTime + idx * 0.07
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.4, startTime + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(startTime)
      osc.stop(startTime + 0.4)
    })
  }

  /** Dört notalı majör arpej (C5–E5–G5–C6): basamak sahnesi ve kapı. */
  playMilestone() {
    const ctx = this.getContext()
    if (!ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      const startTime = ctx.currentTime + idx * 0.04
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.3, startTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(startTime)
      osc.stop(startTime + 0.25)
    })
  }
}
