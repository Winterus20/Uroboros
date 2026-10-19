#!/usr/bin/env node
/**
 * unlock-timeline.mjs — Harness sonuç JSON'undan AÇILIŞ (unlock) ZAMAN ÇİZELGESİ.
 * ============================================================================
 * Amaç: bir harness koşusunun `milestones` alanındaki null OLMAYAN tüm girişleri
 * (feat:*, bot:*, first_shift, d5, shift_4, first_galaxy, bulk_mode, max_mode)
 * simülasyon saniyesine göre sıraya döker; sonunda tek satırlık özet verir.
 *
 * Kullanım (repo kökünden):
 *   node brain/scratchpad/harness/unlock-timeline.mjs brain/scratchpad/harness/smoke.json
 *   node brain/scratchpad/harness/unlock-timeline.mjs <results.json> --run 1
 *
 * Argümanlar:
 *   <results.json>   Harness çıktısı. Ya { runs: [...] } ya da doğrudan bir koşu
 *                    nesnesi olabilir. Zorunlu.
 *   --run N          runs[] içinden hangi koşu (0 tabanlı, varsayılan 0).
 *   --help           Bu yardımı basar.
 *
 * Notlar:
 *   - Saf Node.js (yalnız node:fs, node:path). Ek bağımlılık yok.
 *   - Dosyayı YALNIZCA okur; hiçbir şey yazmaz, ağ erişimi yok.
 *   - Zaman biçimi: tam sayı saniyeler "26s", ondalıklılar "40.5s" yazılır.
 *   - Eşit zamanlı milestone'lar JSON anahtar sırasını (stabil sort) korur.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function usage(stream) {
  stream.write(
    [
      'Kullanım: node brain/scratchpad/harness/unlock-timeline.mjs <results.json> [--run N]',
      '',
      '  <results.json>  Harness çıktısı ({ runs: [...] } ya da tek koşu nesnesi)',
      '  --run N         runs[] indeksi (0 tabanlı, varsayılan 0)',
      '  --help          Bu yardım',
      '',
    ].join('\n')
  )
}

function parseArgs(argv) {
  const out = { file: null, runIndex: 0 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') {
      usage(process.stdout)
      process.exit(0)
    } else if (a === '--run') {
      const raw = argv[++i]
      const n = Number(raw)
      if (!Number.isInteger(n) || n < 0) {
        process.stderr.write(`Hata: --run pozitif bir tam sayı olmalı (verilen: ${raw}).\n`)
        process.exit(2)
      }
      out.runIndex = n
    } else if (a.startsWith('--')) {
      process.stderr.write(`Hata: bilinmeyen parametre ${a}\n`)
      usage(process.stderr)
      process.exit(2)
    } else if (out.file === null) {
      out.file = a
    } else {
      process.stderr.write('Hata: yalnızca bir sonuç dosyası verilebilir.\n')
      process.exit(2)
    }
  }
  if (out.file === null) {
    usage(process.stderr)
    process.exit(2)
  }
  return out
}

/** Saniye değerini okunaklı biçime çevir: 26 -> "26s", 40.5 -> "40.5s". */
function fmtSeconds(value) {
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}s`
}

/** Bir sayıyı gereksiz sıfırlar olmadan yazar. */
function fmtNumber(value, digits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'yok'
  return Number(value.toFixed(digits)).toString()
}

function main() {
  const { file, runIndex } = parseArgs(process.argv.slice(2))
  const abs = resolve(process.cwd(), file)

  let data
  try {
    data = JSON.parse(readFileSync(abs, 'utf8'))
  } catch (err) {
    process.stderr.write(`Hata: ${abs} okunamadı veya geçerli JSON değil: ${err.message}\n`)
    process.exit(1)
  }

  let run
  if (Array.isArray(data.runs)) {
    if (runIndex >= data.runs.length) {
      process.stderr.write(`Hata: runs[${runIndex}] yok; dosyada ${data.runs.length} koşu var.\n`)
      process.exit(1)
    }
    run = data.runs[runIndex]
  } else {
    run = data
  }
  if (!run || typeof run.milestones !== 'object' || run.milestones === null) {
    process.stderr.write('Hata: koşuda `milestones` alanı bulunamadı.\n')
    process.exit(1)
  }

  const generatedAt = typeof data.generatedAt === 'string' ? data.generatedAt : 'yok'
  const profile = run.profile ?? 'bilinmiyor'
  const seed = run.seed ?? '?'
  const dt = run.dt ?? '?'
  const capHours = run.capHours ?? '?'

  // null olmayan, sonlu sayısal tüm milestone'lar; eşitlikte JSON sırası korunur.
  const entries = Object.entries(run.milestones)
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a[1] - b[1] || 0)

  const lines = []
  lines.push(`# Açılış zaman çizelgesi — ${file}`)
  lines.push(`# profil=${profile} seed=${seed} dt=${dt} capHours=${capHours} generatedAt=${generatedAt}`)
  lines.push(`# runs[${runIndex}] · ${entries.length} açılış · null=${Object.keys(run.milestones).length - entries.length}`)
  lines.push('')
  for (const [key, t] of entries) {
    lines.push(`  ${fmtSeconds(t)}  ${key}`)
  }
  lines.push('')

  const final = run.final && typeof run.final === 'object' ? run.final : {}
  const logMatter = typeof final.logMatter === 'number' ? final.logMatter : null
  const shifts = typeof final.shifts === 'number' ? final.shifts : null
  const galaxies = typeof final.galaxies === 'number' ? final.galaxies : null
  const tickspeed = typeof final.tickspeedBought === 'number' ? final.tickspeedBought : null
  const bots = Array.isArray(final.unlockedBots) ? final.unlockedBots.length : null

  const reachedText = run.reached === true
    ? `ulaşıldı (${typeof run.timeSeconds === 'number' ? run.timeSeconds + 's' : '?'})`
    : `ULAŞILMADI (tavan ${run.timeSeconds === null ? capHours + 'sa' : run.timeSeconds + 's'})`

  lines.push(`koşu: ${reachedText}`)
  lines.push(
    `özet: log10=${logMatter === null ? 'yok' : fmtNumber(logMatter)}  shifts=${shifts ?? 'yok'}  ` +
      `galaxy=${galaxies ?? 'yok'}  tickspeed=${tickspeed ?? 'yok'}  bot=${bots ?? 'yok'}`
  )
  process.stdout.write(lines.join('\n') + '\n')
}

main()
