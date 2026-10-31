import type { MusicTrackId } from '../../models/types'

export interface MusicTrackInfo {
  id: MusicTrackId
  name: string
  subtitle: string
  icon: string
  bpm: number
  description: string
}

export const MUSIC_TRACKS: MusicTrackInfo[] = [
  {
    id: 'lofi_chill',
    name: '02:47 AM Lo-Fi Chill',
    subtitle: 'Yorgan Altı & Rhodes Melankolisi',
    icon: '🌙',
    bpm: 76,
    description:
      '8 bölümlü Auto-DJ set (intro → beat girişi → groove → zirve → gece boşluğu → 2. yarı → geç döngü → plak dönüşü), 6 caz bankası, %30 swing, Dilla zamanlaması, Rhodes + tape wow ve yağmur dokusu.'
  },
  {
    id: 'synthwave',
    name: 'Cyberpunk Midnight',
    subtitle: 'Neon Şehir • Am-F-C-G • 112 BPM',
    icon: '🌌',
    bpm: 112,
    description: 'Juno chorus + gated snare, dotted-8th lead, verse-chorus-breakdown akışı ve neon yağmur.'
  },
  {
    id: 'ambient_drone',
    name: 'Interstellar Deep Sleep',
    subtitle: 'Elite + Zimmer + Astroneer • Org + Koro • Balina Uğultusu',
    icon: '🪐',
    bpm: 46,
    description: 'Uyku radyosu best: nefesli boru orgu, insan korosu, Shepard inişi, pulsar ve müzik kutusu ninni.'
  },
  {
    id: 'subway_groove',
    name: 'Subway Beats & Groove',
    subtitle: 'Senkoplu Funk & Taktil Ritim',
    icon: '🛹',
    bpm: 88,
    description: 'Senkoplu funk bas, ghost snare ve swingli groove.'
  },
  {
    id: 'custom',
    name: 'Özel Akış / Web Radyo',
    subtitle: 'Harici MP3 veya Stream Bağlantısı',
    icon: '📻',
    bpm: 0,
    description: 'Kullanıcının belirlediği harici lofi radyo veya müzik bağlantısı.'
  }
]

export interface SynthContext {
  ctx: AudioContext | null
  masterGain: GainNode | null
  filterNode: BiquadFilterNode | null
  delayNode: DelayNode | null
  reverbNode: ConvolverNode | null
  noiseBuffer: AudioBuffer | null
  volume: number
  intensity: number
  currentTrack: MusicTrackId
  loopCount: number
  makePanner(pan: number): StereoPannerNode | null
  sendToReverb(node: AudioNode): void
  sendToDelay(node: AudioNode): void
  triggerDuck(time: number, depth?: number): void
  cleanup(source: AudioScheduledSourceNode, ...nodes: (AudioNode | null | undefined)[]): void
  cleanupAfter(ms: number, ...nodes: (AudioNode | null | undefined)[]): void
  humanTime(base: number): number
  humanVel(base: number, variation?: number): number
  kickTime(base: number): number
  snareTime(base: number): number
}
