import { RUNG1_LINES } from './lines-rung1'
import type { VoiceContext, VoiceLine } from './types'

export type { VoiceContext, VoiceLine, VoiceChannel } from './types'

/** Basamak başına havuzlar; 2-11 henüz yazılmadı (E5: her basamak kendi turunda). */
const POOLS: Record<number, VoiceLine[]> = {
  1: RUNG1_LINES
}

/** T4: bant her 20 saniyede konuşmak zorunda değil — sessizlik bir repliktir. */
export const SILENCE_CHANCE = 0.22

export function linesForRung(rung: number): VoiceLine[] {
  return POOLS[rung] ?? []
}

/** Ticker havuzu: kanal + koşul + son gösterilenler (tekrar önleme). */
export function availableTickerLines(ctx: VoiceContext, seen: readonly string[]): VoiceLine[] {
  return linesForRung(ctx.rung).filter((line) => {
    if (line.channel !== 'ticker') return false
    if (seen.includes(line.id)) return false
    if (line.when && !line.when(ctx)) return false
    return true
  })
}

/**
 * Ağırlıklı seçim: nadir satır ~10× seyrek (T3).
 * `random` enjekte edilebilir — testler deterministik kalır.
 */
export function pickTickerLine(
  ctx: VoiceContext,
  seen: readonly string[],
  random: () => number = Math.random
): VoiceLine | null {
  const pool = availableTickerLines(ctx, seen)
  if (pool.length === 0) return null
  if (random() < SILENCE_CHANCE) return null
  const total = pool.reduce((sum, line) => sum + (line.rare ? 0.1 : 1), 0)
  let roll = random() * total
  for (const line of pool) {
    roll -= line.rare ? 0.1 : 1
    if (roll <= 0) return line
  }
  return pool[pool.length - 1]
}

/** Sahne satırı: mandallı olanlar bir kez (S3). */
export function pickSceneLine(rung: number, latched: readonly string[], id: string): VoiceLine | null {
  const line = linesForRung(rung).find((candidate) => candidate.id === id)
  if (!line) return null
  if (line.latch && latched.includes(line.id)) return null
  return line
}

export function lineText(line: VoiceLine, ctx: VoiceContext): string {
  return typeof line.text === 'function' ? line.text(ctx) : line.text
}
