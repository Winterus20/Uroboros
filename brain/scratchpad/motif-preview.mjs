/**
 * Motif önizleyici — GIC motif asset'lerini GERÇEK render koşulunda basar.
 *
 * Neden var: `src/assets/motifs/*.svg` 24×24 px'te, tek hue ile, 0.45–0.85
 * opaklıkta ve dikey bir bant içinde döndürülmüş olarak görünür. Bu koşulları
 * taklit etmeyen bir önizleme yanıltıcıdır (4× büyütme güzel görünen bir glif
 * 24px'te çamura dönebilir).
 *
 * Çıktılar (brain/scratchpad/motif-preview/, git'e girmez):
 *   catalog-4x.png   — 4×4 ızgara, form denetimi (grup = satır)
 *   catalog-1x.png   — 4×4 ızgara, gerçek boyut (24px) silüet denetimi
 *   strip-normal.png — bant simülasyonu: level 4, count 8  (gerçek davranış)
 *   strip-dense.png  — bant simülasyonu: level 4, count 14 (rezonans kombosu)
 *   strip-spread.png — bant simülasyonu: 16 motifin tamamı yayılarak (öneri)
 *
 * Kullanım:  node brain/scratchpad/motif-preview.mjs
 * Sonra:     magick <svg> <png>  (rsvg delegate ile rasterlenir)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const SVG_DIR = join(ROOT, 'src', 'assets', 'motifs')
const OUT_DIR = join(HERE, 'motif-preview')

/** motifs.ts kaydının aynısı — sıra, ton ve ağırlık birebir kopyalanır. */
const MOTIFS = [
  { id: 'delik', group: 'planck', tone: 'feast', weight: 2 },
  { id: 'goz', group: 'planck', tone: 'bone', weight: 1 },
  { id: 'dis', group: 'planck', tone: 'bone', weight: 1 },
  { id: 'zincir', group: 'planck', tone: 'ember', weight: 1 },
  { id: 'tekerlek', group: 'cosmic', tone: 'bone', weight: 1 },
  { id: 'gul', group: 'cosmic', tone: 'feast', weight: 1 },
  { id: 'dama', group: 'cosmic', tone: 'bone', weight: 1 },
  { id: 'yirtik', group: 'cosmic', tone: 'ember', weight: 1 },
  { id: 'bant', group: 'collapse', tone: 'bone', weight: 1 },
  { id: 'karalama', group: 'collapse', tone: 'feast', weight: 1 },
  { id: 'vida', group: 'collapse', tone: 'ember', weight: 1 },
  { id: 'catlak', group: 'collapse', tone: 'feast', weight: 1 },
  { id: 'ay', group: 'nightwatch', tone: 'bone', weight: 1 },
  { id: 'yildiz', group: 'nightwatch', tone: 'feast', weight: 1 },
  { id: 'saat', group: 'nightwatch', tone: 'ember', weight: 1 },
  { id: 'perde', group: 'nightwatch', tone: 'bone', weight: 1 }
]

const GROUPS = ['planck', 'cosmic', 'collapse', 'nightwatch']
const GROUP_LABEL = {
  planck: 'K1 planck',
  cosmic: 'K2 cosmic',
  collapse: 'K3 collapse',
  nightwatch: 'K4 nightwatch'
}

/** style.css `.motif-tone-*` ile birebir. */
const TONE_HEX = { feast: '#ff3355', bone: '#fff0e6', ember: '#c40f2e' }
const TONE_ALPHA = { feast: 0.8, bone: 0.55, ember: 0.85 }

const BG = '#0a0608'
const FONT = 'Consolas, monospace'

/** Motif SVG'sini diskten okur; `currentColor` gerçek tona çevrilir. */
function loadMotif(motif) {
  const raw = readFileSync(join(SVG_DIR, motif.id + '.svg'), 'utf8').trim()
  const colored = raw.replace(/currentColor/g, TONE_HEX[motif.tone])
  return colored
}

/** Kök `<svg>` etiketini konumlanmış iç içe SVG'ye çevirir. */
function place(svg, x, y, size, rot = 0) {
  const cx = x + size / 2
  const cy = y + size / 2
  const spin = rot === 0 ? '' : ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"'
  return svg.replace('<svg ', '<svg' + spin + ' x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" ')
}

function text(x, y, body, size, fill = 'rgba(255,240,230,0.45)', anchor = 'start') {
  return (
    '<text x="' + x + '" y="' + y + '" font-family="' + FONT + '" font-size="' + size +
    '" fill="' + fill + '" text-anchor="' + anchor + '">' + body + '</text>'
  )
}

function svgDoc(width, height, body) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
    '" viewBox="0 0 ' + width + ' ' + height + '">' +
    '<rect width="' + width + '" height="' + height + '" fill="' + BG + '"/>' +
    body +
    '</svg>'
  )
}

/**
 * 4×4 katalog: satır = faz grubu, sütun = grup içi motif.
 * Zemin gerçek ink-black; hücre ayırıcı çok soluk (silüeti bozmasın).
 */
function buildCatalog(size) {
  const cell = size + 28
  const labelH = 16
  const padL = 8
  const labelW = 76
  const headH = 22
  const gridX = padL + labelW
  const width = gridX + cell * 4 + padL
  const height = headH + (cell + labelH) * 4 + 8

  let body = text(
    padL,
    15,
    size === 24 ? 'GERÇEK BOYUT 1× (24px)' : 'BÜYÜTME 4× (96px)',
    11,
    'rgba(255,240,230,0.7)'
  )

  GROUPS.forEach((group, row) => {
    const members = MOTIFS.filter((m) => m.group === group)
    const rowTop = headH + row * (cell + labelH)
    body += text(padL, rowTop + cell / 2 + 4, GROUP_LABEL[group], 10, 'rgba(0,240,255,0.5)')
    body +=
      '<rect x="' + gridX + '" y="' + rowTop + '" width="' + (cell * 4) + '" height="' + cell +
      '" fill="none" stroke="rgba(255,255,255,0.06)"/>'

    members.forEach((motif, col) => {
      const gx = gridX + col * cell + (cell - size) / 2
      const gy = rowTop + (cell - size) / 2
      body += place(loadMotif(motif), gx, gy, size)
      body += text(
        gx + size / 2,
        rowTop + cell + 11,
        motif.id,
        10,
        'rgba(255,240,230,0.5)',
        'middle'
      )
    })
  })

  return svgDoc(width, height, body)
}

/** motifs.ts `buildMotifStrip` ile aynı deterministik dizilim (level 4). */
function realStrip(count) {
  const weighted = []
  for (const m of MOTIFS) for (let i = 0; i < m.weight; i++) weighted.push(m)
  const out = []
  for (let i = 0; i < count; i++) out.push(weighted[i % weighted.length])
  return out
}

/** Öneri: havuzun tamamı eşit aralıkla taranır (tüm gruplar görünür). */
function spreadStrip(count) {
  const out = []
  for (let i = 0; i < count; i++) out.push(MOTIFS[Math.floor((i * MOTIFS.length) / count) % MOTIFS.length])
  return out
}

/**
 * Bant simülasyonu: MotifBand.vue'nun gerçek yerleşimi.
 * width 46px şerit, 24px glif, gap 20px, ±9° kademeli dönüş, üst/alt maske.
 */
function buildStrip(strip, opts = {}) {
  const W = 360
  const H = 720
  const BAND = 46
  const GLYPH = 24
  const PITCH = GLYPH + 20
  const leftX = 2
  const rightX = W - 2 - BAND

  let body = ''
  for (const [side, bx, phase] of [['left', leftX, 0], ['right', rightX, 2]]) {
    body += '<g>'
    // Şerit zemini (motifin durduğu çok soluk panel)
    body += '<rect x="' + bx + '" y="0" width="' + BAND + '" height="' + H + '" fill="rgba(255,255,255,0.015)"/>'
    const total = strip.length * PITCH
    const startY = (H - total) / 2
    strip.forEach((motif, i) => {
      const gx = bx + (BAND - GLYPH) / 2
      const gy = startY + i * PITCH
      const rot = ((i + phase) % 5 - 2) * 9
      body += '<g opacity="' + TONE_ALPHA[motif.tone] + '">' + place(loadMotif(motif), gx, gy, GLYPH, rot) + '</g>'
    })
    body += '</g>'
  }

  // CSS `mask-image: linear-gradient(...)` üst/alt solma taklidi
  const fade = Math.round(H * 0.12)
  body +=
    '<defs>' +
    '<linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + BG + '"/><stop offset="1" stop-color="' + BG + '" stop-opacity="0"/>' +
    '</linearGradient>' +
    '<linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + BG + '" stop-opacity="0"/><stop offset="1" stop-color="' + BG + '"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<rect x="' + leftX + '" y="0" width="' + BAND + '" height="' + fade + '" fill="url(#fadeTop)"/>' +
    '<rect x="' + leftX + '" y="' + (H - fade) + '" width="' + BAND + '" height="' + fade + '" fill="url(#fadeBottom)"/>' +
    '<rect x="' + rightX + '" y="0" width="' + BAND + '" height="' + fade + '" fill="url(#fadeTop)"/>' +
    '<rect x="' + rightX + '" y="' + (H - fade) + '" width="' + BAND + '" height="' + fade + '" fill="url(#fadeBottom)"/>'

  if (opts.caption) {
    body += text(W / 2, H - 8, opts.caption, 10, 'rgba(255,240,230,0.35)', 'middle')
  }
  return svgDoc(W, H, body)
}

mkdirSync(OUT_DIR, { recursive: true })

const outputs = [
  ['catalog-1x.svg', buildCatalog(24)],
  ['catalog-4x.svg', buildCatalog(96)],
  [
    'strip-normal.svg',
    buildStrip(realStrip(8), { caption: 'buildMotifStrip(4, 8) — gerçek bant' })
  ],
  [
    'strip-dense.svg',
    buildStrip(realStrip(14), { caption: 'buildMotifStrip(4, 14) — rezonans kombosu' })
  ],
  [
    'strip-spread.svg',
    buildStrip(spreadStrip(14), { caption: 'öneri: havuz yayılarak (14 glif)' })
  ]
]

for (const [name, content] of outputs) {
  writeFileSync(join(OUT_DIR, name), content, 'utf8')
  console.log('yazıldı: ' + name)
}

console.log('\nbant dizilimi (gerçek, count 8): ' + realStrip(8).map((m) => m.id).join(' '))
console.log('bant dizilimi (gerçek, count 14): ' + realStrip(14).map((m) => m.id).join(' '))
console.log('bant dizilimi (öneri, count 14): ' + spreadStrip(14).map((m) => m.id).join(' '))
