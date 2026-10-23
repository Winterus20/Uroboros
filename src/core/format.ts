import { Decimal, D, type DecimalSource } from './math'

export type NotationType = 'standard' | 'scientific' | 'engineering' | 'logarithm'

/**
 * Sayı biçimlendirme — TEK kaynak. P3: tüm oyun metni İngilizce, bu yüzden
 * yerel ayar (tr-TR) kullanılmaz; ayırıcılar sabittir.
 *
 * Gösterim merdiveni (ADR-0080):
 *  - 0 … 999: düz TAM sayı ("12"), 1'in altında ondalık korunur ("0.11")
 *  - 1 000 … 10^15: çoğu insanın okuduğu kısaltmalar ("1.23 K", "4.5 M", "2 B", "7 T")
 *  - 10^15 ve üstü: e-notasyonu ("1.23e15"), sonra break_eternity kulesi
 *
 * Kural (ADR-0078 §4): auto-fit YOK — punto dizeye göre küçülmez. Bunun için
 * `formatParts` / `heroParts` sayıyı YAPISAL iki parçaya ayırır (taban + kuyruk),
 * UI parçaları farklı puntoda çizer.
 */
/**
 * Kısaltmalar yalnız ÇOĞU İNSANIN okuduğu basamaklar: bin, milyon, milyar,
 * trilyon. Kısaltma tükendiğinde sayı e-notasyonuna devredilir; "Qa", "UTg"
 * gibi bileşik kısaltmalar oyuncunun sözlüğünde yoktu.
 */
const STANDARD_SUFFIXES = ['', 'K', 'M', 'B', 'T']

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

/**
 * 1000 altı yazım: TAM SAYI (ADR-0080 revizyonu, 2026-10-23).
 *
 * Sahibi: "12.35 yerine direkt 12 yazsın." Sayı büyürken ondalık kuyruk
 * gürültüydü; 1 ve üstü değerler en yakın tam sayıya yuvarlanır (12.35 → "12").
 * 1'in ALTINDA ondalık korunur: 0.11/sn gibi üretim oranları "0" görünüp
 * yalan söylemesin (0.004 gibi çok küçükler en fazla 4 basamağa kadar açılır).
 */
function plainSmall(value: number, precision: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1) return plain(value, 0)
  const start = clampPrecision(precision)
  const text = plain(value, start)
  if (text !== '0') return text
  for (let digits = Math.max(start, 1) + 1; digits <= 4; digits += 1) {
    const wider = plain(value, digits)
    if (wider !== '0') return wider
  }
  return text
}

export function format(value: DecimalSource, precision = 2, notation: NotationType = 'standard'): string {
  const dec = D(value)
  const safePrecision = clampPrecision(precision)

  if (dec.isNan() || Number.isNaN(dec.mag)) return 'NaN'
  if (!dec.isFinite()) return 'Infinity'
  if (dec.sign < 0) return '-' + format(dec.neg(), precision, notation)
  if (dec.eq(0)) return '0'
  if (dec.layer >= 2) return dec.toString()

  const exp = dec.log10().floor().toNumber()

  if (dec.lt(1000)) {
    const text = plainSmall(dec.toNumber(), safePrecision)
    // 999.6 tam sayıya yuvarlanınca "1000" olur; kısaltmalı yazımda "1 K"ya devret.
    if (text === '1000' && notation === 'standard') return '1 ' + STANDARD_SUFFIXES[1]
    return text
  }

  if (notation === 'standard') return formatStandard(dec, exp, safePrecision)

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

/**
 * Kısaltmalı yazım: "1.23 K" … "999.9 T". Kısaltma tükendiğinde (10^15+)
 * sayı e-notasyonuna devredilir. Yuvarlama bir üst basamağa taşarsa
 * (999 999) kısaltma büyür — ekranda "1000 K" görünmez.
 */
function formatStandard(dec: Decimal, exp: number, precision: number): string {
  let index = Math.floor(exp / 3)
  let mantissa = dec.div(Decimal.pow(10, index * 3)).toNumber()
  if (Number(mantissa.toFixed(precision)) >= 1000) {
    index += 1
    mantissa = dec.div(Decimal.pow(10, index * 3)).toNumber()
  }
  // index <= 0 yalnız "999.6 → 1 K" devrinde görülür; kalan yol düz tam sayıdır.
  if (index <= 0) return plain(dec.toNumber(), 0)
  if (index >= STANDARD_SUFFIXES.length) return formatScientific(dec, precision)
  return plain(mantissa, precision) + ' ' + STANDARD_SUFFIXES[index]
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
  notation: NotationType = 'standard'
): FormattedParts {
  const full = format(value, precision, notation)
  if (notation === 'logarithm') return { main: full, suffix: '', kind: 'plain' }
  // Kısaltmalı yazımda kuyruk bir sözcüktür ("K", "T"); kısaltma tükenince
  // aynı dal e-notasyonuna düşer, o yüzden üs kontrolü her iki dalda çalışır.
  const spaceIdx = full.lastIndexOf(' ')
  if (spaceIdx > 0) return { main: full.slice(0, spaceIdx), suffix: full.slice(spaceIdx + 1), kind: 'suffix' }
  const m = /^(-?[\d.]+)e(-?\d+)$/.exec(full)
  if (m) return { main: m[1], suffix: 'e' + m[2], kind: 'exponent' }
  return { main: full, suffix: '', kind: 'plain' }
}

/**
 * Hero dizgi (ADR-0078 §4): sayı iki ölçeğe ayrılır, punto küçülmez.
 *  - < 1000: tek parça, tam sayı (1'in altında ondalık)
 *  - 1e3..1e15: taban + kısaltma ("1.23" + "K")
 *  - 1e15..: taban + 'e' üssü
 *  - layer >= 2: break_eternity'nin kule yazımı ikiye bölünür
 */
export interface HeroParts {
  base: string
  tail: string
}

export function heroParts(value: DecimalSource, notation: NotationType = 'standard'): HeroParts {
  const dec = D(value)
  if (dec.isNan() || Number.isNaN(dec.mag)) return { base: 'NaN', tail: '' }
  if (!dec.isFinite()) return { base: 'Infinity', tail: '' }
  if (dec.sign < 0) {
    const inner = heroParts(dec.neg(), notation)
    return { base: '-' + inner.base, tail: inner.tail }
  }
  if (dec.lt(1000)) {
    const text = plainSmall(dec.toNumber(), 2)
    // 999.6 → "1000" değil "1" + "K": hero ile etiketler aynı dili konuşur.
    if (text === '1000' && notation === 'standard') return { base: '1', tail: 'K' }
    return { base: text, tail: '' }
  }
  if (dec.layer >= 2) {
    const text = dec.toString()
    const idx = text.indexOf('e')
    if (idx > 0) return { base: text.slice(0, idx), tail: text.slice(idx) }
    return { base: text, tail: '' }
  }
  const exp = dec.log10().floor().toNumber()
  if (notation === 'standard') {
    let index = Math.floor(exp / 3)
    let mantissa = dec.div(Decimal.pow(10, index * 3)).toNumber()
    if (Number(mantissa.toFixed(2)) >= 1000) {
      index += 1
      mantissa = dec.div(Decimal.pow(10, index * 3)).toNumber()
    }
    if (index > 0 && index < STANDARD_SUFFIXES.length) {
      return { base: plain(mantissa, 2), tail: STANDARD_SUFFIXES[index] }
    }
  }
  const towerBase = dec.div(Decimal.pow(10, exp)).toNumber()
  return { base: plain(towerBase, 2), tail: 'e' + exp }
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
