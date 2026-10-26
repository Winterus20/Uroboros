import type { Decimal } from '../../core/math'

/**
 * Ses kanalları (V4): sahne · ticker · başarım · açıklama.
 * Tooltip ve sayısal etiket ASLA şaka yapmaz — onlar bu tipin dışındadır.
 */
export type VoiceChannel = 'ticker' | 'scene' | 'achievement' | 'description'

/**
 * Sesin görebildiği veri (V3: yalnız oyun içi — tıklama, süre, saat, aktif sekme).
 * Oyun dışı hayata dair hiçbir alan yoktur ve eklenmemelidir.
 */
export interface VoiceContext {
  rung: number
  number: Decimal
  perSecond: Decimal
  taps: number
  uselessTaps: number
  idleSeconds: number
  /** Yerel saat (0-23) — V3'te açıkça izinli tek dış veri. */
  hour: number
  tab: string
}

export interface VoiceLine {
  id: string
  channel: VoiceChannel
  /** Sabit metin ya da bağlama göre kurulan metin. */
  text: string | ((ctx: VoiceContext) => string)
  /** Ek koşul (basamak, sayı aralığı, bekleme…). */
  when?: (ctx: VoiceContext) => boolean
  /** Nadir satır: ~10× seyrek seçilir (T3). */
  rare?: boolean
  /** Sahne satırı bir kez oynar (S3 mandal). */
  latch?: boolean
}
