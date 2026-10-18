// Faz A "Aç Kumarhane" palet kontrastı — kalıcı WCAG 2.2 AA denetimi (F8.1 kapsam genişletmesi).
// Kullanım: npm run harness:contrast
//
// Amaç: Faz A/B/C/E boyunca zemin, panel, rampa, rozet ve metin tokenları evrilirken
// kontrastın sessizce bozulmasını engellemek.
//
// Standartlar:
// - WCAG 1.4.3 Contrast (Minimum) (AA): Normal metin için >= 4.5:1
// - WCAG 1.4.11 Non-text Contrast (AA): Kullanıcı arayüzü bileşenleri ve grafik nesneler için >= 3.0:1
//
// Kaynak: src/style.css :root değerleri + tailwind.config.js override'ları.
// Not: --bicycle (#c40f2e) BİLİNÇLİ olarak metin değil yalnız yüzeydir (3.31:1) → metin eşik dışı.

/** Göreli parlaklık (WCAG 2.x relatif parlaklık algoritması). */
function luminance(hex) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** İki rengin kontrast oranı (1.0:1 - 21.0:1). */
function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Yarı saydam yüzeyi (rgba) alttaki opak zemine (bgHex) kompozitleyip düz hex döndürür.
 * Alpha blending: C_out = C_fg * alpha + C_bg * (1 - alpha)
 */
function compositeOver(fgRgba, bgHex) {
  const bg = [1, 3, 5].map((i) => parseInt(bgHex.slice(i, i + 2), 16));
  const [r, g, b, a] = fgRgba;
  return (
    '#' +
    [r, g, b]
      .map((c, i) => Math.round(c * a + bg[i] * (1 - a)))
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

// Geriye dönük uyumluluk takma adı
const composite = compositeOver;

// --- 1. ZEMİN VE TEMEL PANEL AİLELERİ ---
const PAGE_BG = '#0a0608'; // --ds-bg (tek zemin kaynağı)
const ABYSS_BG = '#07030a'; // --ds-abyss (girdap fallback / en derin durağı)
const PANEL_LITERAL = '#120b0e'; // --ds-panel literal yaklaşımı

const BASE_PANELS = {
  'sayfa (--ds-bg)': PAGE_BG,
  '--ds-abyss': ABYSS_BG,
  '--ds-panel (.78)': compositeOver([19, 14, 19, 0.78], PAGE_BG),
  '--ds-card (.88)': compositeOver([19, 14, 18, 0.88], PAGE_BG),
  '--ds-hero (.90)': compositeOver([19, 13, 17, 0.90], PAGE_BG),
};

const PANEL_FLAT = BASE_PANELS['--ds-panel (.78)'];

// --- 2. KOMPOZİT RAMPA, ROZET VE GİRİNTİ YÜZEYLERİ ---
// Translucent yüzeyler panel ya da sayfa zeminine kompozitlenir
const RAMP_SURFACES = {
  'ramp-ready': compositeOver([255, 255, 255, 0.05], PANEL_FLAT),
  'ramp-partial': compositeOver([245, 158, 11, 0.08], PANEL_FLAT),
  'ramp-locked': compositeOver([100, 116, 139, 0.06], PANEL_FLAT),
  'ramp-danger': compositeOver([244, 63, 94, 0.08], PANEL_FLAT),
  'bg-black/40 (pnl)': compositeOver([0, 0, 0, 0.40], PANEL_FLAT),
  'bg-black/60 (pnl)': compositeOver([0, 0, 0, 0.60], PANEL_FLAT),
  'bg-black/40 (bg)': compositeOver([0, 0, 0, 0.40], PAGE_BG),
  'bg-black/60 (bg)': compositeOver([0, 0, 0, 0.60], PAGE_BG),
};

const BADGE_SURFACES = {
  'badge-cyan': compositeOver([6, 182, 212, 0.12], PANEL_FLAT),
  'badge-amber': compositeOver([245, 158, 11, 0.12], PANEL_FLAT),
  'badge-emerald': compositeOver([16, 185, 129, 0.12], PANEL_FLAT),
  'badge-rose': compositeOver([244, 63, 94, 0.12], PANEL_FLAT),
  'badge-purple': compositeOver([168, 85, 247, 0.15], PANEL_FLAT),
};

// --- 3. METİN TOKENLARI VE RENKLİ YARDIMCI SINIFLAR ---
// 3a. Temel Nötr ve Durum Metinleri
const CORE_TEXT = {
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500 (override)': '#74849b',
  'slate-600 (override)': '#6e7f96',
  'slate-700 (override)': '#6b7c94',
  'cyan-300': '#67e8f9',
  'amber-300': '#fcd34d',
  'purple-400': '#c084fc',
  'rose-400': '#fb7185',
  'emerald-400': '#34d399',
  '--feast': '#ff3355',
};

// 3b. Renkli Metin Yardımcıları (-200 / -300)
const COLORED_TEXT_UTILITIES = {
  'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7',
  'amber-200': '#fde68a',
  'amber-300': '#fcd34d',
  'cyan-200': '#a5f3fc',
  'cyan-300': '#67e8f9',
  'rose-200': '#fecdd3',
  'rose-300': '#fda4af',
  'purple-200': '#e9d5ff',
  'purple-300': '#d8b4fe',
};

// --- 4. NON-TEXT UI BİLEŞENLERİ (WCAG 1.4.11 >= 3.0:1) ---
const UI_INDICATORS = {
  'emerald-400': '#34d399',
  'amber-400': '#fbbf24',
  'cyan-400': '#22d3ee',
  'rose-400': '#fb7185',
  'purple-400': '#c084fc',
  '--feast': '#ff3355',
  'progress-fill-emerald': '#10b981',
  'progress-fill-amber': '#fbbf24',
  'progress-fill-rose': '#f43f5e',
  'progress-fill-purple': '#a855f7',
  'progress-fill-blue': '#3b82f6',
  'progress-fill-slate': '#94a3b8',
};

const UI_SURFACES = {
  '--ds-panel (lit #120b0e)': PANEL_LITERAL,
  '--ds-panel (comp .78)': PANEL_FLAT,
  '.progress-track (#0a0608)': PAGE_BG,
  '.progress-track (on pnl)': compositeOver([0, 0, 0, 0.50], PANEL_FLAT),
};

// Yalnız yüzey/ağırlık — metin olarak YASAK (bilinçli istisna, ADR-0060/0061).
const SURFACE_ONLY = { '--bicycle (yüzey)': '#c40f2e' };

const TEXT_THRESHOLD = 4.5; // WCAG AA 1.4.3
const UI_THRESHOLD = 3.0;   // WCAG AA 1.4.11

let failures = 0;
let totalChecks = 0;

function printMatrix(title, threshold, rowEntries, colEntries) {
  console.log(`\n=== ${title} (Eşik: >= ${threshold}:1) ===\n`);
  const colNames = Object.keys(colEntries);
  console.log('öğe'.padEnd(24) + colNames.map((n) => n.padStart(19)).join(''));

  for (const [rowName, rowHex] of Object.entries(rowEntries)) {
    const cells = colNames.map((colName) => {
      totalChecks += 1;
      const r = ratio(rowHex, colEntries[colName]);
      const pass = r >= threshold;
      if (!pass) failures += 1;
      return (r.toFixed(2) + (pass ? '' : ' ✗')).padStart(19);
    });
    console.log(rowName.padEnd(24) + cells.join(''));
  }
}

console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║       WCAG 2.2 AA KONTRAST DENETİM MATRİSİ — "AÇ KUMARHANE" PALETİ (F8.1 GENİŞLETİLMİŞ)        ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════╝');

// 1. Matris: Temel Metin Tokenları × Temel Zeminler & Paneller + Abyss
printMatrix('1. TEMEL METİN TOKENLARI × ZEMİNLER & PANELLER (ABYSS DAHİL)', TEXT_THRESHOLD, CORE_TEXT, BASE_PANELS);

// 2a. Matris: Renkli Metin Yardımcıları (-200 / -300) × Rampa ve Siyah Girinti Yüzeyleri
printMatrix('2A. RENKLİ METİN (-200/-300) × RAMPA VE GİRİNTİ YÜZEYLERİ', TEXT_THRESHOLD, COLORED_TEXT_UTILITIES, RAMP_SURFACES);

// 2b. Matris: Renkli Metin Yardımcıları (-200 / -300) × Rozet Yüzeyleri
printMatrix('2B. RENKLİ METİN (-200/-300) × ROZET YÜZEYLERİ', TEXT_THRESHOLD, COLORED_TEXT_UTILITIES, BADGE_SURFACES);

// 3. Matris: UI Bileşenleri & Göstergeleri (WCAG 1.4.11 Non-text Contrast >= 3.0:1)
printMatrix('3. AKTİF UI GÖSTERGELERİ / İLERLEME DOLGULARI (WCAG 1.4.11 UI SINIRI)', UI_THRESHOLD, UI_INDICATORS, UI_SURFACES);

console.log('\n=== BİLİNÇLİ İSTİSNALAR (YALNIZ YÜZEY / METİN DEĞİL) ===');
for (const [name, color] of Object.entries(SURFACE_ONLY)) {
  const r = ratio(color, PAGE_BG);
  console.log('  ' + name.padEnd(24) + r.toFixed(2) + ':1 (sayfa zemini) — Yüzey dekorasyonudur, metin yasaktır.');
}

console.log(`\n────────────────────────────────────────────────────────────────────────────────────────────────`);
console.log(`Toplam Doğrulanan Kontrast Çifti: ${totalChecks}`);

if (failures > 0) {
  console.error(`\n✗ BAŞARISIZ: ${failures} çift WCAG AA eşiğinin altında.`);
  process.exit(1);
}

console.log(`✓ BAŞARILI: Tüm ${totalChecks} metin ve UI çifti WCAG 2.2 AA gereksinimlerini (%100) karşıladı.\n`);

