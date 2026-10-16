import type { MusicTrackId } from '../../models/types'
import { MUSIC_TRACKS, type MusicTrackInfo, type SynthContext } from './types'
import { AudioGraph } from './audio-graph'
import { renderLofiChill } from './tracks/lofi-chill'
import { renderSynthwave } from './tracks/synthwave'
import { renderAmbientDrone, resetAmbientDroneState } from './tracks/ambient-drone'
import { renderSubwayGroove } from './tracks/subway-groove'
import { resetBassState } from './instruments/bass'

export { MUSIC_TRACKS, type MusicTrackInfo, type SynthContext } from './types'
export { NOTES } from './notes'

export class MusicEngine implements SynthContext {
  private graph = new AudioGraph()

  // SynthContext arayüzü gereksinimleri (Getter delegasyonları)
  public get ctx(): AudioContext | null {
    return this.graph.ctx
  }
  public get masterGain(): GainNode | null {
    return this.graph.masterGain
  }
  public get filterNode(): BiquadFilterNode | null {
    return this.graph.filterNode
  }
  public get delayNode(): DelayNode | null {
    return this.graph.delayNode
  }
  public get reverbNode(): ConvolverNode | null {
    return this.graph.reverbNode
  }
  public get noiseBuffer(): AudioBuffer | null {
    return this.graph.noiseBuffer
  }

  // Harici MP3 / Stream desteği için HTMLAudioElement
  private externalAudio: HTMLAudioElement | null = null

  public enabled = true
  public volume = 0.35
  public currentTrack: MusicTrackId = 'lofi_chill'
  public vinylCrackle = true
  public rainEnabled = true
  public rainLevel = 0.5
  public customUrl = ''
  public intensity = 0.5

  // Uyku zamanlayıcısı (Clouds Radio usulü: süre bitince yumuşak fade-out)
  public sleepMinutesRemaining = 0
  private sleepTickId: number | null = null
  private fadeOutTimeoutId: number | null = null

  // Lookahead Scheduler ("A Tale of Two Clocks")
  private isPlaying = false
  private schedulerTimer: number | null = null
  private nextNoteTime = 0
  private currentStep = 0
  public loopCount = 0
  private readonly lookaheadMs = 25
  private readonly scheduleAheadTime = 0.12

  constructor() {
    if (typeof window !== 'undefined') {
      this.externalAudio = new Audio()
      this.externalAudio.loop = true
      this.externalAudio.crossOrigin = 'anonymous'
    }
  }

  // -------------------------------------------------------------
  // SynthContext METOTLARI
  // -------------------------------------------------------------
  public makePanner(pan: number): StereoPannerNode | null {
    return this.graph.makePanner(pan)
  }
  public sendToReverb(node: AudioNode): void {
    this.graph.sendToReverb(node)
  }
  public sendToDelay(node: AudioNode): void {
    this.graph.sendToDelay(node)
  }
  public triggerDuck(time: number, depth = 0.72): void {
    this.graph.triggerDuck(time, depth)
  }
  public cleanup(
    source: AudioScheduledSourceNode,
    ...nodes: (AudioNode | null | undefined)[]
  ): void {
    this.graph.cleanup(source, ...nodes)
  }
  public cleanupAfter(ms: number, ...nodes: (AudioNode | null | undefined)[]): void {
    this.graph.cleanupAfter(ms, ...nodes)
  }
  public humanTime(base: number): number {
    return base + (Math.random() - 0.5) * 0.014
  }
  public humanVel(base: number, variation = 0.32): number {
    return Math.max(0.01, base * (1 + (Math.random() - 0.5) * variation * 2))
  }
  public kickTime(base: number): number {
    // Dilla zamanlaması: kick laid-back (geriden gelir) — bant hissi ve sallantı
    return this.humanTime(base + 0.012)
  }
  public snareTime(base: number): number {
    // Dilla zamanlaması: snare ahead (öne çıkar) — gecikmiş kick'leri sürükler
    return this.humanTime(base - 0.009)
  }

  // -------------------------------------------------------------
  // KURULUM VE BAŞLATMA
  // -------------------------------------------------------------
  private initContext(): AudioContext | null {
    return this.graph.init(this.enabled, this.volume, this.intensity)
  }

  public resumeOnInteraction(): void {
    const ctx = this.initContext()
    if (ctx && ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          if (this.enabled && !this.isPlaying) {
            this.start()
          }
        })
        .catch(() => {})
    } else if (this.enabled && !this.isPlaying) {
      this.start()
    }
  }

  public start(): void {
    if (this.fadeOutTimeoutId !== null) {
      window.clearTimeout(this.fadeOutTimeoutId)
      this.fadeOutTimeoutId = null
    }

    const ctx = this.initContext()
    if (!ctx) return

    if (this.currentTrack === 'custom') {
      this.playCustomStream()
      return
    }

    if (this.isPlaying) return
    this.isPlaying = true
    this.nextNoteTime = ctx.currentTime + 0.06
    this.currentStep = 0
    // Radyo açılışı: her başlatmada set en baştan (intro) başlar
    this.loopCount = 0
    this.updateFilterAndDelayForTrack()

    this.schedulerTimer = window.setInterval(() => {
      this.scheduler()
    }, this.lookaheadMs)

    this.graph.updateCrackleState(
      this.enabled,
      this.vinylCrackle,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel
    )
    this.graph.updateSleepBedState(
      this.enabled,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel,
      this.intensity
    )
  }

  public stop(): void {
    if (this.fadeOutTimeoutId !== null) {
      window.clearTimeout(this.fadeOutTimeoutId)
      this.fadeOutTimeoutId = null
    }
    this.isPlaying = false
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
    if (this.externalAudio) {
      this.externalAudio.pause()
    }
    this.graph.updateSleepBedState(
      this.enabled,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel,
      this.intensity
    )
  }

  private scheduler(): void {
    if (!this.graph.ctx || !this.isPlaying) return

    const trackInfo = MUSIC_TRACKS.find((t) => t.id === this.currentTrack) || MUSIC_TRACKS[0]
    const bpm = trackInfo.bpm || 68
    const stepDuration = 60 / bpm / 4
    const swing = this.getSwingForTrack()

    while (this.nextNoteTime < this.graph.ctx.currentTime + this.scheduleAheadTime) {
      const isOffBeat = this.currentStep % 2 === 1
      const swungTime = this.nextNoteTime + (isOffBeat ? stepDuration * swing : 0)
      this.scheduleStep(this.currentStep, swungTime)
      this.nextNoteTime += stepDuration
      const prev = this.currentStep
      this.currentStep = (this.currentStep + 1) % 64
      if (prev === 63) this.loopCount++
    }
  }

  private getSwingForTrack(): number {
    switch (this.currentTrack) {
      case 'lofi_chill':
        return 0.3 // MPC %66 swing sweet spot (triplet hissi)
      case 'subway_groove':
        return 0.12
      case 'synthwave':
        return 0.02
      case 'ambient_drone':
        return 0.0
      default:
        return 0.08
    }
  }

  private getDelayForTrack(): number {
    switch (this.currentTrack) {
      case 'synthwave':
        return 0.402
      case 'lofi_chill':
        return 0.38
      case 'subway_groove':
        return 0.34
      case 'ambient_drone':
        return 0.55
      default:
        return 0.38
    }
  }

  private updateFilterAndDelayForTrack(): void {
    if (!this.graph.ctx || !this.graph.filterNode || !this.graph.reverbGain || !this.graph.delayNode)
      return
    const t = this.graph.ctx.currentTime
    if (this.currentTrack === 'synthwave') {
      this.graph.filterNode.frequency.setTargetAtTime(6500 + this.intensity * 4500, t, 0.4)
      this.graph.reverbGain.gain.setTargetAtTime(0.3 + this.intensity * 0.14, t, 0.4)
      this.graph.updateRainState(
        this.enabled,
        this.rainEnabled,
        this.isPlaying,
        this.currentTrack,
        this.rainLevel
      )
    } else if (this.currentTrack === 'ambient_drone') {
      this.graph.filterNode.frequency.setTargetAtTime(1900 + this.intensity * 700, t, 0.8)
      this.graph.reverbGain.gain.setTargetAtTime(0.42 + this.intensity * 0.1, t, 0.8)
      this.graph.updateRainState(
        this.enabled,
        this.rainEnabled,
        this.isPlaying,
        this.currentTrack,
        this.rainLevel
      )
    } else {
      this.graph.filterNode.frequency.setTargetAtTime(3800 + this.intensity * 1800, t, 0.4)
      this.graph.reverbGain.gain.setTargetAtTime(0.26 + this.intensity * 0.16, t, 0.4)
    }
    this.graph.delayNode.delayTime.setTargetAtTime(this.getDelayForTrack(), t, 0.2)
    this.graph.updateSleepBedState(
      this.enabled,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel,
      this.intensity
    )
    this.graph.updateCrackleState(
      this.enabled,
      this.vinylCrackle,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel
    )
  }

  private scheduleStep(step: number, time: number): void {
    if (!this.graph.ctx || !this.graph.filterNode) return

    switch (this.currentTrack) {
      case 'lofi_chill':
        renderLofiChill(this, step, time)
        break
      case 'synthwave':
        renderSynthwave(this, step, time)
        break
      case 'ambient_drone':
        renderAmbientDrone(this, step, time)
        break
      case 'subway_groove':
        renderSubwayGroove(this, step, time)
        break
    }
  }

  // -------------------------------------------------------------
  // HARİCİ STREAM / ÖZEL URL ÇALICI
  // -------------------------------------------------------------
  private playCustomStream(): void {
    if (!this.externalAudio) return
    this.stopInternalSynth()

    if (!this.customUrl) {
      this.currentTrack = 'lofi_chill'
      this.start()
      return
    }

    try {
      this.externalAudio.src = this.customUrl
      this.externalAudio.volume = this.enabled ? this.volume : 0
      this.externalAudio
        .play()
        .then(() => {
          this.isPlaying = true
        })
        .catch((err) => {
          console.warn('Harici ses çalınamadı, dahili Lo-Fi synth devreye giriyor:', err)
          this.currentTrack = 'lofi_chill'
          this.start()
        })
    } catch {
      this.currentTrack = 'lofi_chill'
      this.start()
    }
  }

  private stopInternalSynth(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
  }

  // -------------------------------------------------------------
  // DIŞ KONTROLLER (VOLUME, TRACK, MUTE, VISUALIZER, INTENSITY)
  // -------------------------------------------------------------
  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val))
    if (this.graph.masterGain && this.graph.ctx) {
      const target = this.enabled ? this.volume : 0.0001
      this.graph.masterGain.gain.setTargetAtTime(target, this.graph.ctx.currentTime, 0.03)
    }
    if (this.externalAudio) {
      this.externalAudio.volume = this.enabled ? this.volume : 0
    }
  }

  public setEnabled(state: boolean): void {
    this.enabled = state
    if (this.graph.masterGain && this.graph.ctx) {
      const target = this.enabled ? this.volume : 0.0001
      this.graph.masterGain.gain.setTargetAtTime(target, this.graph.ctx.currentTime, 0.03)
    }
    if (this.externalAudio) {
      this.externalAudio.volume = this.enabled ? this.volume : 0
      if (!this.enabled) {
        this.externalAudio.pause()
      } else if (this.currentTrack === 'custom') {
        this.externalAudio.play().catch(() => {})
      }
    }
    if (this.enabled && !this.isPlaying) {
      this.start()
    } else if (!this.enabled && this.isPlaying) {
      this.stop()
    }
    this.graph.updateCrackleState(
      this.enabled,
      this.vinylCrackle,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel
    )
    this.graph.updateSleepBedState(
      this.enabled,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel,
      this.intensity
    )
  }

  public setTrack(track: MusicTrackId): void {
    if (this.currentTrack === track && this.isPlaying) return
    this.currentTrack = track
    this.stop()
    this.currentStep = 0
    if (track === 'ambient_drone') resetAmbientDroneState()
    if (track === 'lofi_chill') resetBassState()
    this.updateFilterAndDelayForTrack()
    if (this.enabled) {
      this.start()
    }
  }

  public nextTrack(): MusicTrackInfo {
    const procedural = MUSIC_TRACKS.filter((t) => t.id !== 'custom')
    const idx = procedural.findIndex((t) => t.id === this.currentTrack)
    const next = idx === -1 ? procedural[0] : procedural[(idx + 1) % procedural.length]
    this.setTrack(next.id)
    return next
  }

  public setVinylCrackle(state: boolean): void {
    this.vinylCrackle = state
    this.graph.updateCrackleState(
      this.enabled,
      this.vinylCrackle,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel
    )
  }

  public setRainEnabled(state: boolean): void {
    this.rainEnabled = state
    this.graph.updateRainState(
      this.enabled,
      this.rainEnabled,
      this.isPlaying,
      this.currentTrack,
      this.rainLevel
    )
    this.graph.updateSleepBedState(
      this.enabled,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel,
      this.intensity
    )
  }

  public setRainLevel(val: number): void {
    this.rainLevel = Math.max(0, Math.min(1, val))
    this.graph.updateRainState(
      this.enabled,
      this.rainEnabled,
      this.isPlaying,
      this.currentTrack,
      this.rainLevel
    )
    this.graph.updateSleepBedState(
      this.enabled,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel,
      this.intensity
    )
  }

  public setIntensity(val: number): void {
    this.intensity = Math.max(0, Math.min(1, val))
    this.updateFilterAndDelayForTrack()
    this.graph.updateSleepBedState(
      this.enabled,
      this.isPlaying,
      this.currentTrack,
      this.rainEnabled,
      this.rainLevel,
      this.intensity
    )
  }

  public setSleepTimer(minutes: number): void {
    this.clearSleepTimer()
    if (minutes <= 0) {
      this.sleepMinutesRemaining = 0
      return
    }
    this.sleepMinutesRemaining = minutes
    this.sleepTickId = window.setInterval(() => {
      this.sleepMinutesRemaining = Math.max(0, this.sleepMinutesRemaining - 1 / 60)
      if (this.sleepMinutesRemaining <= 0) {
        const fadeSec = this.currentTrack === 'ambient_drone' ? 8 : 3
        this.fadeOutAndStop(fadeSec)
        this.clearSleepTimer()
        this.sleepMinutesRemaining = 0
      }
    }, 1000)
  }

  public clearSleepTimer(): void {
    if (this.sleepTickId !== null) {
      clearInterval(this.sleepTickId)
      this.sleepTickId = null
    }
  }

  private fadeOutAndStop(fadeSec = 3): void {
    if (this.fadeOutTimeoutId !== null) {
      window.clearTimeout(this.fadeOutTimeoutId)
      this.fadeOutTimeoutId = null
    }
    if (!this.graph.ctx || !this.graph.masterGain) {
      this.setEnabled(false)
      return
    }
    const t = this.graph.ctx.currentTime
    this.graph.masterGain.gain.cancelScheduledValues(t)
    this.graph.masterGain.gain.setValueAtTime(Math.max(0.0001, this.graph.masterGain.gain.value), t)
    this.graph.masterGain.gain.linearRampToValueAtTime(0.0001, t + fadeSec)
    this.fadeOutTimeoutId = window.setTimeout(() => {
      this.fadeOutTimeoutId = null
      this.setEnabled(false)
      if (this.graph.masterGain && this.graph.ctx) {
        this.graph.masterGain.gain.setTargetAtTime(this.volume, this.graph.ctx.currentTime, 0.1)
      }
    }, fadeSec * 1000 + 100)
  }

  public getVisualizerData(): number[] {
    if (
      !this.graph.analyser ||
      !this.graph.visualizerDataArray ||
      !this.isPlaying ||
      !this.enabled
    ) {
      return [0, 0, 0, 0]
    }
    this.graph.analyser.getByteFrequencyData(this.graph.visualizerDataArray)
    const b1 = (this.graph.visualizerDataArray[1] || 0) / 255
    const b2 = (this.graph.visualizerDataArray[4] || 0) / 255
    const b3 = (this.graph.visualizerDataArray[8] || 0) / 255
    const b4 = (this.graph.visualizerDataArray[14] || 0) / 255
    return [b1, b2, b3, b4]
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      enabled: this.enabled,
      volume: this.volume,
      rainEnabled: this.rainEnabled,
      rainLevel: this.rainLevel,
      intensity: this.intensity,
      sleepMinutesRemaining: this.sleepMinutesRemaining,
      trackInfo: MUSIC_TRACKS.find((t) => t.id === this.currentTrack) || MUSIC_TRACKS[0]
    }
  }
}

export const musicEngine = new MusicEngine()
