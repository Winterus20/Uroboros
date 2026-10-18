/**
 * Efekt sesleri: SoundManagerBase uzerindeki tum play* sentezleyicileri.
 * Davranis orijinal audio.ts ile birebir aynidir; sadece kalitim ile bolundu.
 */
import { SoundManagerBase } from "./manager"

export class SoundEffects extends SoundManagerBase {
  // Zaman Yayı kurma tıkırtısı throttle'ı — 60Hz pointermove akışı osilatörü
  // makineli tüfek gibi tetiklemesin (playTallyTick ile aynı desen).
  private lastClockWindTime = 0

  // Hafif ve tatmin edici mekanik UI tıklama sesi (menü geçişleri ve küçük butonlar)
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

  // Kriz veya büyük sıçrama hazır olduğunda tatlı synth çan bildirimi
  playAffordableNotice() {
    const ctx = this.getContext()
    if (!ctx) return

    const bellNotes = [1318.51, 1975.53] // E6, B6 kristal çan armonikleri
    bellNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      const startTime = ctx.currentTime + idx * 0.04
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.35, startTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45)

      osc.connect(gain)
      gain.connect(ctx.destination)

      this.registerCleanup(osc, gain)
      osc.start(startTime)
      osc.stop(startTime + 0.45)
    })
  }

  // Yukarı Kaydır (Swipe Up Whoosh + Dopamine Pop + Combo Pitch Ramp)
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

    // 1. Hızlı kaydırma rüzgarı (Sweep)
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

    // 2. Taktil bas dopamin pop'u (Dokunsal derinlik)
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

  /**
   * Balatro Sütun 2: "Reels Vuruşu" Sıralı Nedensellik (Sequential Triggering) Arpeji
   * Her çarpan basamağında Lydian modunda yükselen kristal synth notası ve finalde sub-punch çalar.
   * @param stageCount Toplam görsel basamak sayısı (2 - 5)
   * @param isCrit 777x Başparmak Histerisi veya büyük anomali kritik vuruşu mu
   */
  playSequentialStrike(stageCount = 3, isCrit = false) {
    const ctx = this.getContext()
    if (!ctx) return

    // Hızlı ardışık vuruşlarda oktav/gam tırmanışı
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - this.lastClickTime < 350) {
      this.clickCombo = Math.min(this.clickCombo + 1, this.PITCH_SCALES.length - 1)
    } else {
      this.clickCombo = 0
    }
    this.lastClickTime = now
    const pitchMultiplier = this.PITCH_SCALES[this.clickCombo]

    // Lydian / Pentatonik nota frekansları (C4, E4, G4, B4, C5)
    const baseFreqs = [261.63, 329.63, 392.0, 493.88, 523.25]
    const stepDelay = 0.038 // 38ms aralıkla yükselen cascade

    const actualStages = Math.min(Math.max(stageCount, 1), baseFreqs.length)

    for (let i = 0; i < actualStages; i++) {
      const startTime = ctx.currentTime + i * stepDelay
      const noteFreq = baseFreqs[i] * pitchMultiplier
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // Alt basamaklar yumuşak sinüs, üst çarpanlar zengin üçgen dalga
      osc.type = i >= 2 ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(noteFreq, startTime)
      osc.frequency.exponentialRampToValueAtTime(noteFreq * 1.04, startTime + 0.045)

      // Üst basamaklara doğru artan rezonans
      const stageVol = this.safeVolume() * (0.28 + i * 0.06)
      gain.gain.setValueAtTime(stageVol, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)

      osc.start(startTime)
      osc.stop(startTime + 0.05)
    }

    // Final Slam: Çarpanlar birleşip havuza döküldüğünde tok mekanik bas tokmağı
    const finalTime = ctx.currentTime + (actualStages - 1) * stepDelay + 0.015
    const slamOsc = ctx.createOscillator()
    const slamGain = ctx.createGain()
    slamOsc.type = 'sine'
    slamOsc.frequency.setValueAtTime(isCrit ? 90 : 65, finalTime)
    slamOsc.frequency.exponentialRampToValueAtTime(isCrit ? 25 : 32, finalTime + 0.06)

    const slamVol = this.safeVolume() * (isCrit ? 0.65 : 0.38)
    slamGain.gain.setValueAtTime(slamVol, finalTime)
    slamGain.gain.exponentialRampToValueAtTime(0.001, finalTime + 0.06)

    slamOsc.connect(slamGain)
    slamGain.connect(ctx.destination)
    this.registerCleanup(slamOsc, slamGain)

    slamOsc.start(finalTime)
    slamOsc.stop(finalTime + 0.06)

    // Kritik Gece Histerisi (CRIT): Ek kristal parlama armonisi
    if (isCrit) {
      const critOsc = ctx.createOscillator()
      const critGain = ctx.createGain()
      critOsc.type = 'triangle'
      critOsc.frequency.setValueAtTime(1046.5, finalTime) // C6
      critOsc.frequency.exponentialRampToValueAtTime(1567.98, finalTime + 0.12) // G6

      critGain.gain.setValueAtTime(this.safeVolume() * 0.35, finalTime)
      critGain.gain.exponentialRampToValueAtTime(0.001, finalTime + 0.14)

      critOsc.connect(critGain)
      critGain.connect(ctx.destination)
      this.registerCleanup(critOsc, critGain)

      critOsc.start(finalTime)
      critOsc.stop(finalTime + 0.14)
    }
  }

  /**
   * Balatro Makro Sıçrama / Kriz Hesaplama Adımı
   * Akış Sıçraması (Shift) veya Galaksi sırasında açık formatlar (D1-D8) sırayla parladıkça çalar.
   */
  playMacroSurge(stepIndex: number, totalSteps = 8) {
    const ctx = this.getContext()
    if (!ctx) return

    const normalized = Math.min(stepIndex / Math.max(totalSteps - 1, 1), 1.0)
    const baseFreq = 220 + normalized * 440 // A3 -> A4 (220 Hz -> 660 Hz)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = normalized >= 0.8 ? 'triangle' : 'sine'

    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, ctx.currentTime + 0.065)

    gain.gain.setValueAtTime(this.safeVolume() * (0.3 + normalized * 0.2), ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)

    osc.start()
    osc.stop(ctx.currentTime + 0.07)
  }

  // İstasyon Yükseltme / Yeni Reels Formatı Satın Alımı (Melodik + Sub-punch)
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

  // Dopamin/s yükseldiğinde kısa ivme hissi (satın alma / Hz)
  playProductionSurge() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(420, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(this.safeVolume() * 0.28, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.14)
  }

  // Sayaç tally tick: basamak/üretim sıçramasında hıza göre tizleşen kısa blip.
  // level01 0→pes (620Hz), 1→tiz (1380Hz). 45ms throttle ile spam yapmaz.
  playTallyTick(level01 = 0.5) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - this.lastTallyTime < 45) return
    this.lastTallyTime = now
    const ctx = this.getContext()
    if (!ctx) return

    const l = Math.min(1, Math.max(0, level01))
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(620 + l * 760, ctx.currentTime)

    gain.gain.setValueAtTime(this.safeVolume() * (0.12 + l * 0.14), ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.035)
  }

  // Payoff chime: 10'arlı dekad / büyük kutlamada iki notalı açılış (E6→B6).
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

  // Akış Sıçraması (Kamera Deklanşörü + Sub-drop + Ekran Işıltısı)
  playShift() {
    const ctx = this.getContext()
    if (!ctx) return

    // Mekanik deklanşör
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'square'
    osc1.frequency.setValueAtTime(900, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.045)

    gain1.gain.setValueAtTime(this.safeVolume() * 0.45, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    this.registerCleanup(osc1, gain1)
    osc1.start()
    osc1.stop(ctx.currentTime + 0.045)

    // Işıltı dalgası
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(320, ctx.currentTime + 0.04)
    osc2.frequency.exponentialRampToValueAtTime(1350, ctx.currentTime + 0.26)

    gain2.gain.setValueAtTime(this.safeVolume() * 0.55, ctx.currentTime + 0.04)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.26)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    this.registerCleanup(osc2, gain2)
    osc2.start(ctx.currentTime + 0.04)
    osc2.stop(ctx.currentTime + 0.26)

    // Sub-bass darbesi
    const bassOsc = ctx.createOscillator()
    const bassGain = ctx.createGain()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(115, ctx.currentTime + 0.02)
    bassOsc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.22)

    bassGain.gain.setValueAtTime(this.safeVolume() * 0.38, ctx.currentTime + 0.02)
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)

    bassOsc.connect(bassGain)
    bassGain.connect(ctx.destination)
    this.registerCleanup(bassOsc, bassGain)
    bassOsc.start(ctx.currentTime + 0.02)
    bassOsc.stop(ctx.currentTime + 0.22)
  }

  // Sonsuz Akış Kümeleri Yaratımı (Derin Hipnotik Bas + Kozmik Arpej)
  playGalaxy() {
    const ctx = this.getContext()
    if (!ctx) return

    // Derin hipnotik sub-bass patlaması
    const subOsc = ctx.createOscillator()
    const subGain = ctx.createGain()
    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(85, ctx.currentTime)
    subOsc.frequency.exponentialRampToValueAtTime(36, ctx.currentTime + 0.45)

    subGain.gain.setValueAtTime(this.safeVolume() * 0.65, ctx.currentTime)
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)

    subOsc.connect(subGain)
    subGain.connect(ctx.destination)
    this.registerCleanup(subOsc, subGain)
    subOsc.start()
    subOsc.stop(ctx.currentTime + 0.45)

    // Kozmik parıltılı 5'li akor arpeji
    const notes = [440, 554.37, 659.25, 880, 1108.73]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      const noteStart = ctx.currentTime + idx * 0.07
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(this.safeVolume() * 0.5, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(noteStart)
      osc.stop(noteStart + 0.35)
    })
  }

  // Büyük Kozmik Çöküş (Evrensel Tekillik: Gravitasyonel Çöküş + Kuantum Rezonans + Kozmik Fanfar)
  playSingularity() {
    const ctx = this.getContext()
    if (!ctx) return

    // 1. Derin gravitasyonel tekillik sub-bass patlaması
    const boomOsc = ctx.createOscillator()
    const boomGain = ctx.createGain()
    boomOsc.type = 'sine'
    boomOsc.frequency.setValueAtTime(120, ctx.currentTime)
    boomOsc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.85)

    boomGain.gain.setValueAtTime(this.safeVolume() * 0.75, ctx.currentTime)
    boomGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85)

    boomOsc.connect(boomGain)
    boomGain.connect(ctx.destination)
    this.registerCleanup(boomOsc, boomGain)
    boomOsc.start()
    boomOsc.stop(ctx.currentTime + 0.85)

    // 2. Gravitasyonel içe çöküş (Olay ufku girdap sweep'i)
    const sweepOsc = ctx.createOscillator()
    const sweepGain = ctx.createGain()
    sweepOsc.type = 'sawtooth'
    sweepOsc.frequency.setValueAtTime(880, ctx.currentTime)
    sweepOsc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.45)
    sweepGain.gain.setValueAtTime(this.safeVolume() * 0.28, ctx.currentTime)
    sweepGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    sweepOsc.connect(sweepGain)
    sweepGain.connect(ctx.destination)
    this.registerCleanup(sweepOsc, sweepGain)
    sweepOsc.start()
    sweepOsc.stop(ctx.currentTime + 0.45)

    // 3. Kuantum rezonans kristal ışıması (Lydian yükselişi)
    const shimmer = [523.25, 659.25, 783.99, 987.77, 1318.51] // C5, E5, G5, B5, E6
    shimmer.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      const shimmerStart = ctx.currentTime + 0.12 + i * 0.05
      osc.frequency.setValueAtTime(freq, shimmerStart)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, shimmerStart + 0.08)

      gain.gain.setValueAtTime(this.safeVolume() * 0.35, shimmerStart)
      gain.gain.exponentialRampToValueAtTime(0.001, shimmerStart + 0.09)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(shimmerStart)
      osc.stop(shimmerStart + 0.09)
    })

    // 4. Epik fanfar akorları
    const fanfare = [392, 523.25, 659.25, 783.99, 1046.50, 1318.51]
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      const noteStart = ctx.currentTime + 0.28 + i * 0.08
      osc.frequency.setValueAtTime(freq, noteStart)
      gain.gain.setValueAtTime(this.safeVolume() * 0.55, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.65)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(noteStart)
      osc.stop(noteStart + 0.65)
    })
  }

  // Gece 3 Krizi Çanı (Altın Bildirim Kristal Arpej)
  playAnomaly() {
    const ctx = this.getContext()
    if (!ctx) return

    const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22] // E5, G#5, B5, E6, G#6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      const noteTime = ctx.currentTime + index * 0.045
      osc.frequency.setValueAtTime(freq, noteTime)

      gain.gain.setValueAtTime(this.safeVolume() * 0.55, noteTime)
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(noteTime)
      osc.stop(noteTime + 0.3)
    })
  }

  // Gece Krizi Doğuşu (Ekranda Kriz Belirdiğinde Gizemli Uzaysal Synth Uyarısı)
  playAnomalySpawn(type = 'fyp') {
    const ctx = this.getContext()
    if (!ctx) return

    // Void Reel: daha tiz + uzun gizemli giriş (nadirlik hissi)
    const notes = type === 'void'
      ? [659.25, 987.77, 1318.51, 1975.53, 2637.02]
      : [830.61, 1108.73, 1318.51, 1975.53]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      const startTime = ctx.currentTime + idx * (type === 'void' ? 0.06 : 0.05)
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.exponentialRampToValueAtTime(this.safeVolume() * (type === 'void' ? 0.34 : 0.28), startTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + (type === 'void' ? 0.5 : 0.38))

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(startTime)
      osc.stop(startTime + (type === 'void' ? 0.52 : 0.4))
    })
  }

  // Void Reel Tekilliği: Derin void riser + prizmatik çan yağmuru
  playMythicCollect() {
    const ctx = this.getContext()
    if (!ctx) return

    const riser = ctx.createOscillator()
    const riserGain = ctx.createGain()
    riser.type = 'sawtooth'
    riser.frequency.setValueAtTime(110, ctx.currentTime)
    riser.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3)
    riserGain.gain.setValueAtTime(this.safeVolume() * 0.3, ctx.currentTime)
    riserGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32)
    riser.connect(riserGain)
    riserGain.connect(ctx.destination)
    this.registerCleanup(riser, riserGain)
    riser.start()
    riser.stop(ctx.currentTime + 0.32)

    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(90, ctx.currentTime + 0.26)
    sub.frequency.exponentialRampToValueAtTime(34, ctx.currentTime + 0.7)
    subGain.gain.setValueAtTime(this.safeVolume() * 0.7, ctx.currentTime + 0.26)
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    sub.connect(subGain)
    subGain.connect(ctx.destination)
    this.registerCleanup(sub, subGain)
    sub.start(ctx.currentTime + 0.26)
    sub.stop(ctx.currentTime + 0.7)

    const chimes = [1046.5, 1318.51, 1567.98, 2093.0, 2637.02, 3135.96]
    chimes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      const t = ctx.currentTime + 0.28 + i * 0.045
      osc.frequency.setValueAtTime(f, t)
      g.gain.setValueAtTime(0.001, t)
      g.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.4, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.connect(g)
      g.connect(ctx.destination)
      this.registerCleanup(osc, g)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  }

  // Gece Krizine Tıklama (Kriz Tipine Göre İmzalı Synth Tınısı)
  playCrisisCollect(type: string) {
    const ctx = this.getContext()
    if (!ctx) return

    if (type === 'void') {
      this.playMythicCollect()
      return
    }    if (type === 'heart_frenzy') {
      // 1. Kalp histerisi: Sub kick nabzı + yüksek voltajlı arpej
      const kick = ctx.createOscillator()
      const kickGain = ctx.createGain()
      kick.type = 'triangle'
      kick.frequency.setValueAtTime(160, ctx.currentTime)
      kick.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.18)
      kickGain.gain.setValueAtTime(this.safeVolume() * 0.7, ctx.currentTime)
      kickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
      kick.connect(kickGain)
      kickGain.connect(ctx.destination)
      this.registerCleanup(kick, kickGain)
      kick.start()
      kick.stop(ctx.currentTime + 0.18)

      // İkinci darbe (güm-güm kalp atışı hissi)
      const kick2 = ctx.createOscillator()
      const kick2Gain = ctx.createGain()
      kick2.type = 'triangle'
      kick2.frequency.setValueAtTime(140, ctx.currentTime + 0.1)
      kick2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.24)
      kick2Gain.gain.setValueAtTime(this.safeVolume() * 0.6, ctx.currentTime + 0.1)
      kick2Gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24)
      kick2.connect(kick2Gain)
      kick2Gain.connect(ctx.destination)
      this.registerCleanup(kick2, kick2Gain)
      kick2.start(ctx.currentTime + 0.1)
      kick2.stop(ctx.currentTime + 0.24)

      // Yüksek voltaj arpeji
      const notes = [587.33, 880.0, 1174.66, 1760.0] // D5, A5, D6, A6
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sawtooth'
        const t = ctx.currentTime + i * 0.035
        osc.frequency.setValueAtTime(f, t)
        g.gain.setValueAtTime(this.safeVolume() * 0.22, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        osc.connect(g)
        g.connect(ctx.destination)
        this.registerCleanup(osc, g)
        osc.start(t)
        osc.stop(t + 0.25)
      })
    } else if (type === 'sponsor') {
      // 2. 50 Milyonluk Viral Video: Parıltılı altın çan kaskadı
      const bellChord = [1046.5, 1318.51, 1567.98, 2093.0, 2637.02] // C6, E6, G6, C7, E7
      bellChord.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        const t = ctx.currentTime + i * 0.04
        osc.frequency.setValueAtTime(f, t)
        g.gain.setValueAtTime(0.001, t)
        g.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.45, t + 0.01)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
        osc.connect(g)
        g.connect(ctx.destination)
        this.registerCleanup(osc, g)
        osc.start(t)
        osc.stop(t + 0.45)
      })
    } else {
      // 3. fyp veya standart kriz: Yükselen alevli synth akoru
      this.playAnomaly()
    }
  }

  // Süper Rezonans Kombo Patlaması (Sub-kick + Zengin Harmonik Akor)
  playCombo() {
    const ctx = this.getContext()
    if (!ctx) return

    // Ağır bas darbesi
    const kickOsc = ctx.createOscillator()
    const kickGain = ctx.createGain()
    kickOsc.type = 'sine'
    kickOsc.frequency.setValueAtTime(150, ctx.currentTime)
    kickOsc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.35)

    kickGain.gain.setValueAtTime(this.safeVolume() * 0.75, ctx.currentTime)
    kickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

    kickOsc.connect(kickGain)
    kickGain.connect(ctx.destination)
    this.registerCleanup(kickOsc, kickGain)
    kickOsc.start()
    kickOsc.stop(ctx.currentTime + 0.35)

    // Rezonans süper akoru
    const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51]
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      gain.gain.setValueAtTime(this.safeVolume() * 0.6, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.85)
    })
  }

  // Vicdan Azabını Dürtme (Tok Uyku Baskısı Sesi)
  playGuiltClick() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(240, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(95, ctx.currentTime + 0.055)

    gain.gain.setValueAtTime(this.safeVolume() * 0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.055)
  }

  /** Geriye dönük ses alias'ı */
  playSlackerClick() {
    this.playGuiltClick()
  }

  // "Sadece 1 Video Daha!" diyerek Vicdanı Susturma (Dopamin Fışkırması)
  playSilenceGuilt() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'sine'
    osc1.frequency.setValueAtTime(1046.50, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.12)
    osc2.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.06)
    osc2.frequency.exponentialRampToValueAtTime(2093.00, ctx.currentTime + 0.38)

    gain.gain.setValueAtTime(this.safeVolume() * 0.65, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    this.registerCleanup(osc1, gain)
    this.registerCleanup(osc2)

    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.14)
    osc2.start(ctx.currentTime + 0.06)
    osc2.stop(ctx.currentTime + 0.4)
  }

  /** Geriye dönük ses alias'ı */
  playFireWorker() {
    this.playSilenceGuilt()
  }

  // Gece Duruşu Değiştirme
  playStance() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(this.safeVolume() * 0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  }

  // Algoritma Lab: Trend Tohumu Ekme
  playPlant() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.07)

    gain.gain.setValueAtTime(this.safeVolume() * 0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.07)
  }

  // Algoritma Lab: Olgun Trendi Hasat Etme
  playHarvest() {
    const ctx = this.getContext()
    if (!ctx) return

    const notes = [587.33, 739.99, 880, 1174.66]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      const noteTime = ctx.currentTime + idx * 0.04
      osc.frequency.setValueAtTime(freq, noteTime)

      gain.gain.setValueAtTime(this.safeVolume() * 0.45, noteTime)
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(noteTime)
      osc.stop(noteTime + 0.2)
    })
  }

  // Trend Reaktörü: Akışa Fırlat (Viral Drop Patlaması)
  playViralDrop() {
    const ctx = this.getContext()
    if (!ctx) return

    // 1. Riser Sweep (Akışa Fırlatma İvmesi)
    const sweepOsc = ctx.createOscillator()
    const sweepGain = ctx.createGain()
    sweepOsc.type = 'sawtooth'
    sweepOsc.frequency.setValueAtTime(220, ctx.currentTime)
    sweepOsc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.28)
    sweepGain.gain.setValueAtTime(this.safeVolume() * 0.35, ctx.currentTime)
    sweepGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    sweepOsc.connect(sweepGain)
    sweepGain.connect(ctx.destination)
    this.registerCleanup(sweepOsc, sweepGain)
    sweepOsc.start(ctx.currentTime)
    sweepOsc.stop(ctx.currentTime + 0.3)

    // 2. Ağır Bas Drop
    const bassOsc = ctx.createOscillator()
    const bassGain = ctx.createGain()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(180, ctx.currentTime + 0.25)
    bassOsc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.8)
    bassGain.gain.setValueAtTime(this.safeVolume() * 0.85, ctx.currentTime + 0.25)
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    bassOsc.connect(bassGain)
    bassGain.connect(ctx.destination)
    this.registerCleanup(bassOsc, bassGain)
    bassOsc.start(ctx.currentTime + 0.25)
    bassOsc.stop(ctx.currentTime + 0.8)

    // 3. Parlak Viral Çan Akoru
    const viralChords = [587.33, 880, 1174.66, 1760]
    viralChords.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      const startT = ctx.currentTime + 0.28 + i * 0.03
      osc.frequency.setValueAtTime(freq, startT)
      gain.gain.setValueAtTime(this.safeVolume() * 0.5, startT)
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.6)
      osc.connect(gain)
      gain.connect(ctx.destination)
      this.registerCleanup(osc, gain)
      osc.start(startT)
      osc.stop(startT + 0.6)
    })
  }

  // Gece Kriz Yönetimi: Kriz Kararı Alma Sesi
  playCrisisDecision() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2)

    gain.gain.setValueAtTime(this.safeVolume() * 0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  }

  /** Geriye dönük ses alias'ı */
  playCastSpell() {
    this.playCrisisDecision()
  }

  // Gece Kriz Yönetimi: Ters Tepme (Backfire Elektrik Çarpması)
  playBackfire() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15)

    gain.gain.setValueAtTime(this.safeVolume() * 0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  }

  // Crisis 2.0: Olay Ufku Reaktörü Meltdown Siren Sesi
  playMeltdownWarning() {
    const ctx = this.getContext()
    if (!ctx) return

    // İki tonlu siren alarmı
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.2)
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.4)

    gain.gain.setValueAtTime(this.safeVolume() * 0.55, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.45)
  }

  // Crisis 2.0: Reaktör Manyetik Tahliye & Soğutma Sesi
  playVentCooling() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35)

    gain.gain.setValueAtTime(this.safeVolume() * 0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  }

  // Otomatik Bot Açma/Kapama Tıkı
  playToggleBot() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(900, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.03)

    gain.gain.setValueAtTime(this.safeVolume() * 0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.03)
  }

  // Önbelleği Temizleme (Sacrifice / Purge) - Derin rezonanslı fütüristik süpürme
  playSacrifice() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(80, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35)

    gain.gain.setValueAtTime(this.safeVolume() * 0.45, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  }

  // Akışı Yenile (Pull to Refresh) - Taktil swoosh ve tazeleyici synth
  playRefresh() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(this.safeVolume() * 0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  }

  // Video Kalite Milestone (360p -> 1080p -> 4K seviye atlama)
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

  // Algoritma Yaması Satın Alma (Tek seferlik upgrade)
  playUpgrade() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(this.safeVolume() * 0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }

  // ==========================================================================
  // Zaman Yayı (Time Clock) — §8.4. Store spawn/release anlarında çağırır;
  // kurma tıkırtısını bileşen (TimeClockOverlay) sürükleme sırasında besler.
  // ==========================================================================

  // Saat kuruldu toll'u: düşük → yüksek süpürme + yüksek çan (ekranda beliriş).
  playClockSpawn() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.42)

    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.42, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.55)

    const bell = ctx.createOscillator()
    const bellGain = ctx.createGain()
    bell.type = 'sine'
    bell.frequency.setValueAtTime(1760, ctx.currentTime + 0.3)

    bellGain.gain.setValueAtTime(0.001, ctx.currentTime + 0.3)
    bellGain.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.3, ctx.currentTime + 0.32)
    bellGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95)

    bell.connect(bellGain)
    bellGain.connect(ctx.destination)
    this.registerCleanup(bell, bellGain)
    bell.start(ctx.currentTime + 0.3)
    bell.stop(ctx.currentTime + 0.95)
  }

  // Kurma tıkırtısı: intensity01 gerginliktir (0 → pes, 1 → tiz + yüksek).
  // 90ms iç throttle — sürükleme akışı (60Hz) osilatör yağmuruna dönmez.
  playClockWind(intensity01 = 0.5) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - this.lastClockWindTime < 90) return
    this.lastClockWindTime = now
    const ctx = this.getContext()
    if (!ctx) return

    const i = Number.isFinite(intensity01) ? Math.min(1, Math.max(0, intensity01)) : 0.5

    // 1. Ratchet (kurma dişlisi) tıkırtısı
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(260 + i * 520, ctx.currentTime)

    gain.gain.setValueAtTime(this.safeVolume() * (0.1 + i * 0.12), ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.03)

    // 2. Yay gövdesi: kısa düşük vuruş (tıkırtıya ağırlık verir)
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(150 + i * 90, ctx.currentTime)
    thud.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.04)

    thudGain.gain.setValueAtTime(this.safeVolume() * (0.08 + i * 0.1), ctx.currentTime)
    thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045)

    thud.connect(thudGain)
    thudGain.connect(ctx.destination)
    this.registerCleanup(thud, thudGain)
    thud.start()
    thud.stop(ctx.currentTime + 0.045)
  }

  // Salgı: aşağıdan yukarı süpürme (yay boşalması) + gerginlikle yükselen çift çan.
  playClockRelease(tension01 = 0.5) {
    const ctx = this.getContext()
    if (!ctx) return

    const t = Number.isFinite(tension01) ? Math.min(1, Math.max(0, tension01)) : 0.5

    // 1. Süpürme (playUpgrade deseni: tek osilatör, exponential rampa)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(140, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(620 + t * 1400, ctx.currentTime + 0.3)

    gain.gain.setValueAtTime(this.safeVolume() * (0.12 + t * 0.24), ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.34)

    osc.connect(gain)
    gain.connect(ctx.destination)
    this.registerCleanup(osc, gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.34)

    // 2. Çan armonikleri: tam gerginlikte daha tiz ve daha parlak
    const notes = [659.25 * (1 + t * 0.5), 987.77 * (1 + t * 0.5)]
    notes.forEach((freq, idx) => {
      const bell = ctx.createOscillator()
      const bellGain = ctx.createGain()
      bell.type = 'sine'
      const startTime = ctx.currentTime + 0.24 + idx * 0.06
      bell.frequency.setValueAtTime(freq, startTime)

      bellGain.gain.setValueAtTime(0.001, startTime)
      bellGain.gain.exponentialRampToValueAtTime(
        this.safeVolume() * (0.26 + t * 0.16),
        startTime + 0.012
      )
      bellGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42)

      bell.connect(bellGain)
      bellGain.connect(ctx.destination)
      this.registerCleanup(bell, bellGain)
      bell.start(startTime)
      bell.stop(startTime + 0.42)
    })
  }

  // Kusursuz salgi fanfarisi (v2): %90+ gerginlikte yükselen altın arpej +
  // parıltı. playClockRelease SONRASI çağrılır (ikisi üst üste biner).
  playClockPerfect() {
    const ctx = this.getContext()
    if (!ctx) return

    // 1. Altın arpej: E5 → G#5 → B5 → E6 (majör triad + oktav, kısa adımlar)
    const notes = [659.25, 830.61, 987.77, 1318.51]
    notes.forEach((freq, idx) => {
      const bell = ctx.createOscillator()
      const bellGain = ctx.createGain()
      bell.type = 'sine'
      const startTime = ctx.currentTime + idx * 0.07
      bell.frequency.setValueAtTime(freq, startTime)

      bellGain.gain.setValueAtTime(0.001, startTime)
      bellGain.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.3, startTime + 0.015)
      bellGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5)

      bell.connect(bellGain)
      bellGain.connect(ctx.destination)
      this.registerCleanup(bell, bellGain)
      bell.start(startTime)
      bell.stop(startTime + 0.5)
    })

    // 2. Parıltı: tiz üçgen osilatör, yavaş fade (altın parlaklık hissi)
    const shimmer = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    shimmer.type = 'triangle'
    shimmer.frequency.setValueAtTime(2637, ctx.currentTime)
    shimmer.frequency.exponentialRampToValueAtTime(3520, ctx.currentTime + 0.6)

    shimmerGain.gain.setValueAtTime(0.001, ctx.currentTime + 0.28)
    shimmerGain.gain.exponentialRampToValueAtTime(this.safeVolume() * 0.14, ctx.currentTime + 0.34)
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95)

    shimmer.connect(shimmerGain)
    shimmerGain.connect(ctx.destination)
    this.registerCleanup(shimmer, shimmerGain)
    shimmer.start(ctx.currentTime + 0.28)
    shimmer.stop(ctx.currentTime + 0.95)
  }
}
