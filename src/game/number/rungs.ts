import type { Decimal } from '../../core/math'

/**
 * 11 basamak (çapa) — S1 "çıplak sayı": her eşiğin yalnızca bir ADI var.
 * Renkler ADR-0078 §G5 formülünden ÖLÇÜLMÜŞ hex'lerdir (kontrast 5,4:1–13,4:1).
 * Renk yalnız iki yerde yaşar: hero sayı + `AlgorithmicSwirl` (G5 sınırı).
 *
 * 8 ve 11. basamak adları hâlâ tasarım bekliyor (S1 triyajı); 1. basamak kilitli.
 */
export interface RungDef {
  /** 1..11 */
  readonly index: number
  /** Yeni ad (İngilizce, P3). 8 ve 11 geçici. */
  readonly name: string
  /** Ekranda hero altında görünen mikro etiket. */
  readonly label: string
  /** ADR-0078 §G5 paleti. */
  readonly color: string
}

export const RUNGS: readonly RungDef[] = [
  { index: 1, name: 'I thought it was a wall', label: '1.79e308', color: '#98e500' },
  { index: 2, name: 'The end of the shelf', label: '1e(9e15)', color: '#00f272' },
  { index: 3, name: 'The tower is done', label: '10^^1.79e308', color: '#00ebb9' },
  { index: 4, name: 'The arrows are done', label: '6 arrows', color: '#00e1d9' },
  { index: 5, name: 'It did not write it. It showed it.', label: 'G', color: '#00cee7' },
  { index: 6, name: 'We do not know', label: 'TREE(3)', color: '#00b1e9' },
  { index: 7, name: 'The room', label: 'SSCG(3)', color: '#008ff5' },
  { index: 8, name: 'Untitled', label: 'Rayo', color: '#5a78ff' },
  { index: 9, name: 'The door', label: 'Fish 7', color: '#977cff' },
  { index: 10, name: 'Does it count?', label: 'BIG FOOT', color: '#cf8aff' },
  { index: 11, name: 'Last', label: 'LNGN', color: '#ff90f6' }
] as const

export function rungDef(index: number): RungDef {
  return RUNGS[Math.min(Math.max(index, 1), RUNGS.length) - 1]
}

export function rungColor(index: number): string {
  return rungDef(index).color
}

/** Basamak içi ilerleme [0,1): sayının o basamaktaki konumu (telemetri/renk vurgusu). */
export function rungProgress(index: number, number: Decimal): number {
  const scale = Math.pow(10, Math.max(0, index - 1))
  const log = number.log10().toNumber()
  if (!Number.isFinite(log)) return 0
  const local = log / (308 * scale)
  return Math.min(1, Math.max(0, local))
}
