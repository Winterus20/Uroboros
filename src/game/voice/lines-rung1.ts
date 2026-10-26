import type { VoiceContext, VoiceLine } from './types'

/**
 * 1. BASAMAK SES HAVUZU — "I thought it was a wall".
 *
 * Ses = oyunun kendisi (V1): kurum yok, karakter yok, lore yok.
 * Sessiz meta (V2): oyun olduğunu bilir, asla söylemez.
 * Tek ses, çift ritim (V5): düşünce de cevap da oyunun ağzından.
 * Yasak: ünlem, mekanik hakkında yalan, oyuncuyu aptal yerine koymak,
 * sayının büyüklüğüyle dalga geçmek, çeviri kokan espri, aynı şakanın tekrarı.
 *
 * Dağılım (T3 çekirdek havuz, hedef ~120 satır):
 *   ~55 sayı bandı · ~25 durum · 20 nadir · 10 sahne.
 * Metinler İngilizce yazılır, çevrilmez (P3); kod yorumları Türkçe kalır.
 *
 * MEKANİK DOĞRULUK (Kural 2): buradaki her sayısal iddia src/game/number/tuning.ts
 * ile uyumlu olmak zorunda. Fiyatlar 25 · 200 · 1 600 · … · 5,24e7 (×8), üretim 1 sayı/sn
 * (Fingers) ve 0,11 birim/sn (üst halkalar), blok 10 birim. Sıfırlama yoktur.
 */

/** Sayı bandı yardımcısı: [lo, hi) — hi verilmezse açık uçlu. */
function band(ctx: VoiceContext, lo: string, hi?: string): boolean {
  if (!ctx.number.gte(lo)) return false
  return hi === undefined ? true : ctx.number.lt(hi)
}

export const RUNG1_LINES: VoiceLine[] = [
  // ── AÇILIŞ / ERKEN BANT (< 1e3) ────────────────────────────────────────────
  { id: 'r1_open_1', channel: 'ticker', text: 'You have ten. It is not a lot. It is a start.', when: (c) => band(c, '0', '1e3') },
  { id: 'r1_open_2', channel: 'ticker', text: 'Ten is the number. You are allowed to touch it.', when: (c) => band(c, '0', '1e3') },
  { id: 'r1_open_3', channel: 'ticker', text: 'Nothing here is hidden. That is the problem.' },
  { id: 'r1_open_4', channel: 'ticker', text: 'Press the plus. The plus is honest.' },
  { id: 'r1_open_5', channel: 'ticker', text: 'Nothing here needs explaining. There is only the plus button.', when: (c) => band(c, '0', '1e3') },
  { id: 'r1_open_6', channel: 'ticker', text: 'Small numbers. Each one still looks like itself.', when: (c) => band(c, '0', '1e3') },
  { id: 'r1_fingers_1', channel: 'ticker', text: 'Fingers cost twenty-five and make one per second. That is the best deal in here.', when: (c) => band(c, '0', '1e6') },
  { id: 'r1_fingers_2', channel: 'ticker', text: 'Twenty-five for a finger. That is not a metaphor, that is the price.', when: (c) => band(c, '0', '1e6') },
  { id: 'r1_fingers_3', channel: 'ticker', text: 'The chain costs twenty-five, then two hundred, then sixteen hundred. After that it stops being polite.', when: (c) => band(c, '0', '1e6') },
  { id: 'r1_fingers_4', channel: 'ticker', text: 'Ten of one link opens the next. The rule does not bend.', when: (c) => band(c, '0', '1e6') },

  // ── BANT: 1e3 – 1e6 ───────────────────────────────────────────────────────
  { id: 'r1_k_1', channel: 'ticker', text: 'Four digits. Your eye takes them one at a time and does not complain yet.', when: (c) => band(c, '1e3', '1e6') },
  { id: 'r1_k_2', channel: 'ticker', text: 'A thousand. Round numbers feel like progress. They are just zeros in a row.', when: (c) => band(c, '1e3', '1e6') },
  { id: 'r1_k_3', channel: 'ticker', text: 'Nothing changed at a thousand. You expected something to change.', when: (c) => band(c, '1e3', '1e6') },
  { id: 'r1_k_4', channel: 'ticker', text: 'A hundred thousand. Still legible, and already too long for a label.', when: (c) => band(c, '1e5', '1e6') },
  { id: 'r1_k_5', channel: 'ticker', text: 'A Notch costs two hundred and makes a finger every nine seconds. The arithmetic is not subtle.', when: (c) => band(c, '1e3', '1e6') },
  { id: 'r1_k_6', channel: 'ticker', text: 'Six digits. You have started reading the trend instead of the number.', when: (c) => band(c, '1e5', '1e6') },
  { id: 'r1_k_7', channel: 'ticker', text: 'Between a thousand and a million there is only patience and a rising exponent.', when: (c) => band(c, '1e3', '1e6') },

  // ── BANT: 1e6 – 1e12 ──────────────────────────────────────────────────────
  { id: 'r1_m_1', channel: 'ticker', text: 'A million. You have said the word so often it stopped meaning anything.', when: (c) => band(c, '1e6', '1e12') },
  { id: 'r1_m_2', channel: 'ticker', text: 'Seven digits. This is where people start rounding without saying so.', when: (c) => band(c, '1e6', '1e12') },
  { id: 'r1_m_3', channel: 'ticker', text: 'A million is a thousand thousands. The word is doing a lot of work.', when: (c) => band(c, '1e6', '1e12') },
  { id: 'r1_m_4', channel: 'ticker', text: 'A billion. There is no ceremony for a billion. There is no ceremony for any of them.', when: (c) => band(c, '1e9', '1e12') },
  { id: 'r1_m_5', channel: 'ticker', text: 'Ten digits and you have stopped counting the digits.', when: (c) => band(c, '1e9', '1e12') },
  { id: 'r1_m_6', channel: 'ticker', text: 'The number grew while you were reading this. It is growing now.', when: (c) => band(c, '1e6', '1e12') && c.perSecond.gt(0) },
  { id: 'r1_m_7', channel: 'ticker', text: 'You are past the point where counting was a reasonable activity. It is still the one available.', when: (c) => c.number.gte('1e6') },
  { id: 'r1_m_8', channel: 'ticker', text: 'Computer costs a million and earns a million. You are buying the same number twice.', when: (c) => band(c, '1e6', '1e12') },

  // ── BANT: 1e12 – 1e30 ─────────────────────────────────────────────────────
  { id: 'r1_t_1', channel: 'ticker', text: 'A trillion. You are counting past anything you could say out loud in a lifetime.', when: (c) => band(c, '1e12', '1e30') },
  { id: 'r1_t_2', channel: 'ticker', text: 'Fifteen digits. The exponent is doing the work now. You are providing the willingness.', when: (c) => band(c, '1e12', '1e30') },
  { id: 'r1_t_3', channel: 'ticker', text: 'At some point you stopped saying the digits and started saying a lot. You were right.', when: (c) => band(c, '1e12', '1e30') },
  { id: 'r1_t_4', channel: 'ticker', text: 'The Mathematician costs fifty-two million and makes a Supercomputer every nine seconds.', when: (c) => band(c, '1e12', '1e30') },
  { id: 'r1_t_5', channel: 'ticker', text: 'Nothing here is abstract. The number is a number. It is just not a size you can hold.', when: (c) => c.number.gte('1e6') },
  { id: 'r1_t_6', channel: 'ticker', text: 'Thirteen digits. The commas are load-bearing now.', when: (c) => band(c, '1e12', '1e30') },
  { id: 'r1_t_7', channel: 'ticker', text: 'You are in the range where the first digit is worth more than the rest combined.', when: (c) => band(c, '1e12', '1e30') },
  { id: 'r1_t_8', channel: 'ticker', text: 'The chain has eight links. You have bought some of them. The number does the rest.', when: (c) => band(c, '1e20', '1e30') },

  // ── BANT: 1e30 – 1e60 ─────────────────────────────────────────────────────
  { id: 'r1_q_1', channel: 'ticker', text: 'Thirty digits. You read the first three and trust the rest.', when: (c) => band(c, '1e30', '1e60') },
  { id: 'r1_q_2', channel: 'ticker', text: 'You have entered the part of the ladder where the rungs are made of notation.', when: (c) => band(c, '1e30', '1e60') },
  { id: 'r1_q_3', channel: 'ticker', text: 'At this size the number grows by multiplying. You grow by waiting.', when: (c) => band(c, '1e30', '1e60') },
  { id: 'r1_q_4', channel: 'ticker', text: 'Forty digits. You could not write this down without losing your place.', when: (c) => band(c, '1e40', '1e60') },
  { id: 'r1_q_5', channel: 'ticker', text: 'The number is longer than most sentences that could describe it.', when: (c) => c.number.gte('1e12') },

  // ── BANT: 1e60 – 1e150 ────────────────────────────────────────────────────
  { id: 'r1_s_1', channel: 'ticker', text: 'Sixty digits. The number has stopped being a quantity and become a length.', when: (c) => band(c, '1e60', '1e150') },
  { id: 'r1_s_2', channel: 'ticker', text: 'You are reading an exponent now. The number is behind it.', when: (c) => band(c, '1e60', '1e150') },
  { id: 'r1_s_3', channel: 'ticker', text: 'A hundred digits. You trust the first three and let the rest run.', when: (c) => band(c, '1e60', '1e150') },
  { id: 'r1_s_4', channel: 'ticker', text: 'You check the number less often now. It has not slowed down.', when: (c) => band(c, '1e60', '1e150') && c.perSecond.gt(0) },
  { id: 'r1_s_5', channel: 'ticker', text: '1e100 has a name. You are not going to use it.', when: (c) => band(c, '1e60', '1e150') },
  { id: 'r1_s_6', channel: 'ticker', text: 'The ladder has rungs you have not seen. They are not hidden. They are just far.', when: (c) => band(c, '1e60', '1e150') },
  { id: 'r1_s_7', channel: 'ticker', text: 'The commas stopped mattering around the ninth digit. Nobody mentioned it.', when: (c) => c.number.gte('1e9') },

  // ── BANT: 1e150 – 1e300 ───────────────────────────────────────────────────
  { id: 'r1_h_1', channel: 'ticker', text: 'You are close to the largest number a machine will hold without asking for help.', when: (c) => band(c, '1e150', '1e300') },
  { id: 'r1_h_2', channel: 'ticker', text: 'Two hundred digits. The end is visible as a number, not as a wall.', when: (c) => band(c, '1e200', '1e300') },
  { id: 'r1_h_3', channel: 'ticker', text: '1.79e308 is the marked ceiling. It is written on the ceiling in plain digits.', when: (c) => c.number.gte('1e9') },
  { id: 'r1_h_4', channel: 'ticker', text: 'The last digits before the ceiling are the least interesting and the most expensive.', when: (c) => band(c, '1e150', '1e300') },
  { id: 'r1_h_5', channel: 'ticker', text: 'You can see the ceiling from here. It has not moved and it will not.', when: (c) => band(c, '1e150', '1e300') },

  // ── BANT: 1e300 ve üstü (kapı) ────────────────────────────────────────────
  { id: 'r1_g_1', channel: 'ticker', text: 'Three hundred digits. The ceiling is a number, and you can read it.', when: (c) => band(c, '1e300') },
  { id: 'r1_g_3', channel: 'ticker', text: 'This is the last stretch where the number can be written in full.', when: (c) => band(c, '1e300') },
  { id: 'r1_g_4', channel: 'ticker', text: 'You are about to run out of digits that mean anything.', when: (c) => band(c, '1e300') },

  // ── DURUM: bekleme (idle) ─────────────────────────────────────────────────
  { id: 'r1_idle_1', channel: 'ticker', text: 'You are not pressing anything. That is allowed.', when: (c) => c.idleSeconds > 20 },
  { id: 'r1_idle_2', channel: 'ticker', text: 'You stopped. The chain did not.', when: (c) => c.idleSeconds > 30 && c.perSecond.gt(0) },
  { id: 'r1_idle_3', channel: 'ticker', text: 'The plus button has not moved. It will not.', when: (c) => c.idleSeconds > 45 },
  { id: 'r1_idle_4', channel: 'ticker', text: 'Waiting is allowed here. The number uses the time.', when: (c) => c.idleSeconds > 60 && c.perSecond.gt(0) },
  { id: 'r1_idle_5', channel: 'ticker', text: 'A minute and a half of nothing. The number did not notice the difference.', when: (c) => c.idleSeconds > 90 && c.perSecond.gt(0) },
  { id: 'r1_idle_6', channel: 'ticker', text: 'You came back to a number that did not need you to come back.', when: (c) => c.idleSeconds > 120 && c.perSecond.gt(0) },

  // ── DURUM: tıklama ────────────────────────────────────────────────────────
  { id: 'r1_tap_1', channel: 'ticker', text: 'Plus one. Plus one. Plus one. You are doing the thing that works.', when: (c) => c.taps > 25 },
  { id: 'r1_tap_2', channel: 'ticker', text: 'A hundred presses. Nothing about this is hidden from you.', when: (c) => c.taps > 100 },
  { id: 'r1_tap_3', channel: 'ticker', text: 'You press faster than the number grows. That is the whole economy at the moment.', when: (c) => c.taps > 250 && c.perSecond.lt(1) },
  { id: 'r1_tap_4', channel: 'ticker', text: 'Every press is worth exactly one. Your speed is not part of the formula.', when: (c) => c.taps > 500 },
  { id: 'r1_tap_5', channel: 'ticker', text: (c) => c.taps + ' presses. The number has kept every one of them.', when: (c) => c.taps > 1000 },

  // ── DURUM: ekranın göstermediği basışlar (S9) ─────────────────────────────
  { id: 'r1_use_1', channel: 'ticker', text: 'The display did not move. The number did. Those are different things.', when: (c) => c.uselessTaps > 100 },
  { id: 'r1_use_2', channel: 'ticker', text: 'A thousand presses below the resolution. The number kept every one.', when: (c) => c.uselessTaps > 1000 },
  { id: 'r1_use_3', channel: 'ticker', text: 'Ten thousand presses the display refused to report.', when: (c) => c.uselessTaps > 10000 },

  // ── DURUM: saat (V3: yalnız yerel saat) ───────────────────────────────────
  { id: 'r1_hour_1', channel: 'ticker', text: 'It is late. The number is not tired.', when: (c) => c.hour >= 0 && c.hour < 5 },
  { id: 'r1_hour_2', channel: 'ticker', text: 'Three in the morning is a number too. Yours is bigger.', when: (c) => c.hour >= 1 && c.hour < 4 },
  { id: 'r1_hour_3', channel: 'ticker', text: 'Early. You are awake before the number needed you.', when: (c) => c.hour >= 5 && c.hour < 7 },
  { id: 'r1_hour_4', channel: 'ticker', text: 'Late. The number does not have a bedtime.', when: (c) => c.hour >= 22 },
  { id: 'r1_hour_5', channel: 'ticker', text: 'Morning. The number has been here the whole time.', when: (c) => c.hour >= 6 && c.hour < 11 },

  // ── DURUM: sekme ──────────────────────────────────────────────────────────
  { id: 'r1_tab_1', channel: 'ticker', text: 'You are looking at the number. Watching it is not a multiplier.', when: (c) => c.tab === 'number' },
  { id: 'r1_tab_2', channel: 'ticker', text: 'The number is on this screen. So are you. That is the arrangement.', when: (c) => c.tab === 'number' },

  // ── DURUM: üretim hızı ────────────────────────────────────────────────────
  { id: 'r1_ps_1', channel: 'ticker', text: 'Nothing is producing yet. The plus button is the whole economy.', when: (c) => c.perSecond.lte(0) },
  { id: 'r1_ps_2', channel: 'ticker', text: 'One per second. It is not fast. It is not zero.', when: (c) => c.perSecond.gte(1) && c.perSecond.lt(2) },
  { id: 'r1_ps_3', channel: 'ticker', text: 'The chain produces faster than you can press. That was the arrangement.', when: (c) => c.perSecond.gte(100) && c.perSecond.lt('1e6') },
  { id: 'r1_ps_4', channel: 'ticker', text: 'A million per second. Your presses are a rounding error now.', when: (c) => c.perSecond.gte('1e6') },

  // ── NADİR (rare: true — ~10× seyrek, T3) ──────────────────────────────────
  { id: 'r1_rare_idle_1', channel: 'ticker', rare: true, text: 'The tab is still open. The number noticed, in the way a number can.', when: (c) => c.idleSeconds > 120 },
  { id: 'r1_rare_idle_2', channel: 'ticker', rare: true, text: 'You have not pressed once. The chain never required it.', when: (c) => c.idleSeconds > 60 && c.taps === 0 },
  { id: 'r1_rare_tap_1', channel: 'ticker', rare: true, text: 'Two thousand presses. You have made a habit of a button. Nothing here will stop you.', when: (c) => c.taps > 2000 },
  { id: 'r1_rare_use_1', channel: 'ticker', rare: true, text: 'A thousand presses below the resolution. Every one of them landed.', when: (c) => c.uselessTaps > 1000 },
  { id: 'r1_rare_use_2', channel: 'ticker', rare: true, text: 'Ten thousand times you added one to something that refused to say so.', when: (c) => c.uselessTaps > 10000 },
  { id: 'r1_rare_m_1', channel: 'ticker', rare: true, text: 'A million. If you say it slowly it sounds like a lot. Do not say it slowly.', when: (c) => band(c, '1e6', '1e12') },
  { id: 'r1_rare_t_1', channel: 'ticker', rare: true, text: 'A trillion. Somewhere a physicist uses this number as a unit and feels reasonable.', when: (c) => band(c, '1e12', '1e30') },
  { id: 'r1_rare_q_1', channel: 'ticker', rare: true, text: 'Thirty digits. You are not reading the number. You are reading its direction.', when: (c) => band(c, '1e30', '1e60') },
  { id: 'r1_rare_s_1', channel: 'ticker', rare: true, text: 'At this size the number is a rumor of a quantity. It is still exact.', when: (c) => band(c, '1e60', '1e150') },
  { id: 'r1_rare_h_1', channel: 'ticker', rare: true, text: 'You are near the ceiling. The ceiling is a number you were taught to fear.', when: (c) => band(c, '1e150', '1e300') },
  { id: 'r1_rare_g_1', channel: 'ticker', rare: true, text: 'You are one decision away from the ceiling. The decision is to keep going.', when: (c) => band(c, '1e300') },
  { id: 'r1_rare_ps_1', channel: 'ticker', rare: true, text: 'A million per second. The plus button is now a souvenir.', when: (c) => c.perSecond.gte('1e6') },
  { id: 'r1_rare_hour_1', channel: 'ticker', rare: true, text: 'Three in the morning and the exponent moved. You were here for it. That is the whole event.', when: (c) => c.hour >= 2 && c.hour < 4 },
  { id: 'r1_rare_hour_2', channel: 'ticker', rare: true, text: 'Late. The number will still be here in the morning. It has no other plans.', when: (c) => c.hour >= 22 },

  // ── SAHNE (channel: 'scene', latch: true — S3 mandal, bir kez oynar) ──────
  { id: 'r1_scene_open', channel: 'scene', latch: true, text: 'Ten. It is not a lot.\nIt is a start.' },
  { id: 'r1_scene_k', channel: 'scene', latch: true, text: 'A thousand. It looks like a milestone.\nIt is a comma.', when: (c) => c.number.gte('1e3') },
  { id: 'r1_scene_m', channel: 'scene', latch: true, text: 'A million. You have met the word before.\nYou have not met this many.', when: (c) => c.number.gte('1e6') },
  { id: 'r1_scene_t', channel: 'scene', latch: true, text: 'A trillion. The word used to mean all of it.\nIt does not.', when: (c) => c.number.gte('1e12') },
  { id: 'r1_scene_q', channel: 'scene', latch: true, text: 'Thirty digits.\nNobody taught you the rest. You are teaching yourself.', when: (c) => c.number.gte('1e30') },
  { id: 'r1_scene_g', channel: 'scene', latch: true, text: 'You are at the edge of the numbers you were taught.\nThe rest are numbers too.', when: (c) => c.number.gte('1e300') },
  { id: 'r1_scene_use', channel: 'scene', latch: true, text: 'A thousand presses with nothing on screen.\nThe number counted all of them.', when: (c) => c.uselessTaps >= 1000 },
  { id: 'r1_scene_late', channel: 'scene', latch: true, text: 'It is late.\nThe number is not tired. It will not be.', when: (c) => c.hour >= 0 && c.hour < 5 }
]
