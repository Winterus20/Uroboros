import { Decimal, D, type DecimalSource } from './math'

export type NotationType = 'standard' | 'scientific' | 'engineering' | 'logarithm'

/**
 * Sayı biçimlendirme — TEK kaynak. P3: tüm oyun metni İngilizce, bu yüzden
 * yerel ayar (tr-TR) kullanılmaz; ayırıcılar sabittir.
 *
 * Kural (ADR-0078 §4): auto-fit YOK — punto dizeye göre küçülmez. Bunun için
 * `formatParts` / `heroParts` sayıyı YAPISAL iki parçaya ayırır (taban + kuyruk),
 * UI parçaları farklı puntoda çizer.
 */
const STANDARD_SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc',
  'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg',
  'Tg', 'UTg', 'DTg', 'TTg', 'QaTg', 'QiTg', 'SxTg', 'SpTg', 'OcTg', 'NoTg'
]

function clampPrecision(p: number): number {
  if (!Number.isFinite(p)) return 2
  return Math.min(6, Math.max(0, Math.floor(p)))
}

/** Binlik ayırıcısız, sabit ondalıklı düz yazım (İngilizce ondalık nokta). */
function plain(value: number, precision: number): string {
  if (!Number.isFinite(value)) return '0'
  const fixed = value.toFixed(precision)
  // 10.00 → 10, 1.50 → 1.5 (sondaki sıfırları at, nokta kalmasın)
  return fixed.indexOf('.') >= 0 ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed
}

export function format(value: DecimalSource, precision = 2, notation: NotationType = 'scientific'): string {
  const dec = D(value)
  const safePrecision = clampPrecision(precision)

  if (dec.isNan() || Number.isNaN(dec.mag)) return 'NaN'
  if (!dec.isFinite()) return 'Infinity'
  if (dec.sign < 0) return '-' + format(dec.neg(), precision, notation)
  if (dec.eq(0)) return '0'
  if (dec.layer >= 2) return dec.toString()

  if (dec.lt(1000)) return plain(dec.toNumber(), Math.min(safePrecision, 3))

  const exp = dec.log10().floor().toNumber()

  if (notation === 'standard') {
    const suffixIndex = Math.floor(exp / 3)
    if (suffixIndex < STANDARD_SUFFIXES.length) {
      const mantissa = dec.div(Decimal.pow(10, suffixIndex * 3)).toNumber()
      return plain(mantissa, safePrecision) + ' ' + STANDARD_SUFFIXES[suffixIndex]
    }
    return formatScientific(dec, safePrecision)
  }

  if (notation === 'engineering') {
    const engExp = Math.floor(exp / 3) * 3
    const mantissa = dec.div(Decimal.pow(10, engExp)).toNumber()
    return plain(mantissa, safePrecision) + 'e' + engExp
  }

  if (notation === 'logarithm') {
    return 'e' + plain(dec.log10().toNumber(), safePrecision)
  }

  return formatScientific(dec, safePrecision)
}

function formatScientific(dec: Decimal, precision: number): string {
  if (dec.layer >= 2) return dec.toString()
  const exp = dec.log10().floor().toNumber()
  const mantissa = dec.div(Decimal.pow(10, exp)).toNumber()
  return plain(mantissa, precision) + 'e' + exp
}

export type FormatPartKind = 'plain' | 'suffix' | 'exponent'

export interface FormattedParts {
  main: string
  suffix: string
  kind: FormatPartKind
}

/** `1.23 M` → { main: '1.23', suffix: 'M' } · `1.23e45` → { main: '1.23', suffix: 'e45' } */
export function formatParts(
  value: DecimalSource,
  precision = 2,
  notation: NotationType = 'scientific'
): FormattedParts {
  const full = format(value, precision, notation)
  if (notation === 'standard') {
    const idx = full.lastIndexOf(' ')
    if (idx > 0) return { main: full.slice(0, idx), suffix: full.slice(idx + 1), kind: 'suffix' }
    return { main: full, suffix: '', kind: 'plain' }
  }
  if (notation === 'logarithm') return { main: full, suffix: '', kind: 'plain' }
  const m = /^(-?[\d.]+)e(-?\d+)$/.exec(full)
  if (m) return { main: m[1], suffix: 'e' + m[2], kind: 'exponent' }
  return { main: full, suffix: '', kind: 'plain' }
}

/**
 * Hero dizgi (ADR-0078 §4): sayı iki ölçeğe ayrılır, punto küçülmez.
 *  - < 1000: tek parça
 *  - 1e3..: taban + 'e' üssü
 *  - layer >= 2: break_eternity'nin kule yazımı ikiye bölünür
 */
export interface HeroParts {
  base: string
  tail: string
}

export function heroParts(value: DecimalSource): HeroParts {
  const dec = D(value)
  if (dec.isNan() || Number.isNaN(dec.mag)) return { base: 'NaN', tail: '' }
  if (dec.lt(1000) && dec.gte(0)) return { base: plain(dec.toNumber(), 2), tail: '' }
  if (dec.layer >= 2) {
    const text = dec.toString()
    const idx = text.indexOf('e')
    if (idx > 0) return { base: text.slice(0, idx), tail: text.slice(idx) }
    return { base: text, tail: '' }
  }
  const exp = dec.log10().floor().toNumber()
  const mantissa = dec.div(Decimal.pow(10, exp)).toNumber()
  return { base: plain(mantissa, 2), tail: 'e' + exp }
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return seconds.toFixed(0) + 's'
  const minutes = Math.floor(seconds / 60)
  const remSec = Math.floor(seconds % 60)
  if (minutes < 60) return minutes + 'm ' + remSec + 's'
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  if (hours < 24) return hours + 'h ' + remMin + 'm'
  const days = Math.floor(hours / 24)
  return days + 'd ' + (hours % 24) + 'h'
}

/** Yüzde (0-1 aralığını 0-100'e çevirir, tek ondalık). */
export function formatPercent(ratio: number, precision = 0): string {
  if (!Number.isFinite(ratio)) return '0%'
  return (ratio * 100).toFixed(precision) + '%'
}
