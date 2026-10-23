import { RUNG1_LINES } from './lines-rung1'
import type { VoiceContext, VoiceLine } from './types'

export type { VoiceContext, VoiceLine, VoiceChannel } from './types'

/**
 * SEÇİM ALGORİTMASI (T3 + T4) — tek yerde, tek sıra:
 *
 *   1) FİLTRE   kanal === 'ticker' · when(ctx) doğru · id son 8 gösterimde yok
 *   2) SESSİZLİK random() < SILENCE_CHANCE → null (susmak bir replik, T4)
 *   3) AĞIRLIK  rare satır 0.1, normal satır 1.0 (nadir ≈ 10× seyrek)
 *
 * Sıra önemlidir: sessizlik havuzdan ÖNCE atılır, böylece susan bir tur
 * hiçbir satırı "gösterilmiş" saymaz; ağırlık ise ancak konuşulacaksa hesaplanır.
 *
 * TEKRAR KURALI: bir satır, kendi görünür penceresindeki (RECENT_WINDOW = 8)
 * son gösterimlerde bulunamaz. Mağaza da son 8 kimliği tutar (SEEN_VOICE_LIMIT),
 * yani iki katman aynı pencereyi paylaşır.
 *
 * GERİ ÇEKİLME (fallback): bağlam o kadar darsa ki (ör. 03:00 + boşta + sekme)
 * koşulu geçen satır sayısı 8'den azsa, "son 8'de tekrar yok" kuralı matematiksel
 * olarak imkânsızdır. Bu durumda pencere sırayla 8 → 4 → 2 → 0 daralır: kural
 * mümkün olduğu yerde kesin, mümkün olmadığı yerde mümkün olduğunca korunur.
 * Pencere 0'a indiğinde bile seçim rastgeledir; bant asla "ölü" kalmaz.
 *
 * Basamak başına havuzlar; 2-11 henüz yazılmadı (E5: her basamak kendi turunda).
 */
const POOLS: Record<number, VoiceLine[]> = {
  1: RUNG1_LINES
}

/** T4: bant her 20 saniyede konuşmak zorunda değil — sessizlik bir repliktir. */
export const SILENCE_CHANCE = 0.22

/** T3: nadir satırın ağırlığı — normal satır 1.0, yani ~10× seyrek. */
export const RARE_WEIGHT = 0.1

/** Aynı satır bu kadar gösterim boyunca tekrar edemez (mağaza sınırıyla aynı). */
export const RECENT_WINDOW = 8

/** Dar bağlamda sırayla denenen pencereler (bkz. "GERİ ÇEKİLME"). */
const FALLBACK_WINDOWS: readonly number[] = [RECENT_WINDOW, 4, 2, 0]

export function linesForRung(rung: number): VoiceLine[] {
  return POOLS[rung] ?? []
}

/** Koşul + kanal süzgeci (gösterim geçmişinden bağımsız). */
export function eligibleTickerLines(ctx: VoiceContext): VoiceLine[] {
  return linesForRung(ctx.rung).filter((line) => {
    if (line.channel !== 'ticker') return false
    return line.when ? line.when(ctx) : true
  })
}

/**
 * Ticker havuzu: kanal + koşul + son gösterilenler (tekrar önleme).
 * window testler ve geri çekilme için açıktır; varsayılan RECENT_WINDOW.
 */
export function availableTickerLines(
  ctx: VoiceContext,
  seen: readonly string[],
  window: number = RECENT_WINDOW
): VoiceLine[] {
  const recent = window > 0 ? new Set(seen.slice(0, window)) : null
  return eligibleTickerLines(ctx).filter((line) => (recent ? !recent.has(line.id) : true))
}

/** Havuzdan ağırlıklı tek çekiliş; random enjekte edilebilir (testler deterministik). */
function weightedPick(pool: readonly VoiceLine[], random: () => number): VoiceLine {
  const total = pool.reduce((sum, line) => sum + (line.rare ? RARE_WEIGHT : 1), 0)
  let roll = random() * total
  for (const line of pool) {
    roll -= line.rare ? RARE_WEIGHT : 1
    if (roll <= 0) return line
  }
  // Kayan nokta artığı: son satır her zaman geçerli bir cevaptır.
  return pool[pool.length - 1]
}

/**
 * Hazır havuzdan seçim: tekrar penceresi (geri çekilmeli) + nadirlik ağırlığı.
 * Sessizlik burada YOKTUR — onu pickTickerLine uygular. Testler bu fonksiyonu
 * elle kurulmuş küçük havuzlarla çağırır.
 */
export function selectFromPool(
  pool: readonly VoiceLine[],
  seen: readonly string[],
  random: () => number = Math.random
): VoiceLine | null {
  if (pool.length === 0) return null
  let candidates: VoiceLine[] = []
  for (const window of FALLBACK_WINDOWS) {
    const recent = window > 0 ? new Set(seen.slice(0, window)) : null
    candidates = pool.filter((line) => (recent ? !recent.has(line.id) : true))
    if (candidates.length > 0) break
  }
  if (candidates.length === 0) return null
  return weightedPick(candidates, random)
}

/**
 * Ticker turu: sessizlik → filtre → nadirlik → seçim.
 * random enjekte edilebilir; ilk çağrı sessizlik, ikincisi ağırlık içindir.
 */
export function pickTickerLine(
  ctx: VoiceContext,
  seen: readonly string[],
  random: () => number = Math.random
): VoiceLine | null {
  if (random() < SILENCE_CHANCE) return null
  return selectFromPool(eligibleTickerLines(ctx), seen, random)
}

/** Sahne kanalı: mandallı olanlar bir kez oynar (S3). */
export function sceneLinesFor(rung: number): VoiceLine[] {
  return linesForRung(rung).filter((line) => line.channel === 'scene')
}

/** Sahne havuzu: mandal + koşul. */
export function availableSceneLines(ctx: VoiceContext, latched: readonly string[]): VoiceLine[] {
  return sceneLinesFor(ctx.rung).filter((line) => {
    if (line.latch && latched.includes(line.id)) return false
    return line.when ? line.when(ctx) : true
  })
}

/** Kimliğe göre sahne satırı; mandal ve koşul denetlenir (ctx verilirse). */
export function pickSceneLine(
  rung: number,
  latched: readonly string[],
  id: string,
  ctx?: VoiceContext
): VoiceLine | null {
  const line = sceneLinesFor(rung).find((candidate) => candidate.id === id)
  if (!line) return null
  if (line.latch && latched.includes(line.id)) return null
  if (ctx && line.when && !line.when(ctx)) return null
  return line
}

export function lineText(line: VoiceLine, ctx: VoiceContext): string {
  return typeof line.text === 'function' ? line.text(ctx) : line.text
}
