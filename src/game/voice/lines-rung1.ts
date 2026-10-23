import type { Decimal } from '../../core/math'
import type { VoiceLine } from './types'

/**
 * 1. BASAMAK SES HAVUZU — "I thought it was a wall".
 *
 * Ses = oyunun kendisi (V1): kurum yok, karakter yok, lore yok.
 * Sessiz meta (V2): oyun olduğunu bilir, asla söylemez.
 * Tek ses, çift ritim (V5): düşünce de cevap da oyunun ağzından.
 * Yasak: ünlem, mekanik hakkında yalan, oyuncuyu aptal yerine koymak,
 * sayının büyüklüğüyle dalga geçmek, çeviri kokan espri.
 *
 * ÇEKİRDEK HAVUZ (A8 = ortak yazım): hedef 1. basamak için ~120 satır (T3).
 * Metinler İngilizce yazılır, çevrilmez (P3).
 */

const below = (ctx: { number: Decimal }, value: string): boolean => ctx.number.lt(value)

export const RUNG1_LINES: VoiceLine[] = [
  { id: 'r1_open_1', channel: 'ticker', text: 'You have ten. It is not a lot. It is a start.' },
  { id: 'r1_open_2', channel: 'ticker', text: 'Ten is the number. You are allowed to touch it.' },
  { id: 'r1_open_3', channel: 'ticker', text: 'Nothing here is hidden. That is the problem.' },
  { id: 'r1_open_4', channel: 'ticker', text: 'Press the plus. The plus is honest.' },

  { id: 'r1_fingers_1', channel: 'ticker', text: 'Fingers are the cheapest thing you will ever buy.' },
  { id: 'r1_fingers_2', channel: 'ticker', text: 'Ten fingers. That is not a metaphor, that is the price.' },
  { id: 'r1_fingers_3', channel: 'ticker', text: 'Each finger adds one per second. Yes. One.' },

  { id: 'r1_band_1', channel: 'ticker', text: 'Three digits. You are basically an accountant now.', when: (c) => c.number.gte(100) && below(c, '1e4') },
  { id: 'r1_band_2', channel: 'ticker', text: 'You stopped reading the number. It noticed.', when: (c) => c.number.gte('1e6') && below(c, '1e12') },
  { id: 'r1_band_3', channel: 'ticker', text: 'Somewhere around here people start saying exponential.', when: (c) => c.number.gte('1e12') && below(c, '1e30') },
  { id: 'r1_band_4', channel: 'ticker', text: 'The number is longer than the sentence about it.', when: (c) => c.number.gte('1e60') && below(c, '1e150') },
  { id: 'r1_band_5', channel: 'ticker', text: 'You are near the end of the only numbers you were ever taught.', when: (c) => c.number.gte('1e300') },

  { id: 'r1_idle_1', channel: 'ticker', text: 'Still here. Still counting. Nothing is wrong.', when: (c) => c.idleSeconds > 25 },
  { id: 'r1_idle_2', channel: 'ticker', text: 'The plus button has not moved.', when: (c) => c.idleSeconds > 45 },
  { id: 'r1_idle_3', channel: 'ticker', text: 'Waiting is also a mechanic. It is just a bad one.', when: (c) => c.idleSeconds > 70, rare: true },

  { id: 'r1_tap_1', channel: 'ticker', text: 'Plus one. Plus one. You are doing the thing.', when: (c) => c.taps > 40 },
  { id: 'r1_tap_2', channel: 'ticker', text: 'It still adds one. It is not lying to you.', when: (c) => c.taps > 120 },
  { id: 'r1_tap_3', channel: 'ticker', text: 'You know this does nothing now. You keep going. Good.', when: (c) => c.uselessTaps > 100 },
  { id: 'r1_tap_4', channel: 'ticker', text: 'A thousand presses. The number moved once, a long time ago.', when: (c) => c.uselessTaps > 1000, rare: true },

  { id: 'r1_boost_1', channel: 'ticker', text: 'Everything you built is gone. In exchange, everything is faster.' },
  { id: 'r1_boost_2', channel: 'ticker', text: 'The peak was not wasted. It was spent.' },
  { id: 'r1_boost_3', channel: 'ticker', text: 'You will do this again. About twenty more times.', when: (c) => c.boosts >= 3 },

  { id: 'r1_gate_1', channel: 'ticker', text: 'This is where the numbers stop being written down.', when: (c) => c.number.gte('1.7e308') },
  { id: 'r1_gate_2', channel: 'ticker', text: 'Take the Definition. Leave the number. You can come back.', when: (c) => c.number.gte('1.7e308') },

  { id: 'r1_hour_1', channel: 'ticker', text: 'It is late. The number does not care. Neither do I.', when: (c) => c.hour >= 1 && c.hour < 5 },
  { id: 'r1_hour_2', channel: 'ticker', text: 'Early. The number is the same number it was last night.', when: (c) => c.hour >= 5 && c.hour < 7 },

  { id: 'r1_scene_gate', channel: 'scene', latch: true, text: 'It is over. 1.79e308. There is nothing after this.\nThere is.' },
  { id: 'r1_scene_boost', channel: 'scene', latch: true, text: 'Everything you built is gone. In exchange, everything is faster.' }
]
