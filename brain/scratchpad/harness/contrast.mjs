// Faz A "Aç Kumarhane" palet kontrastı — kalıcı WCAG 2.2 AA denetimi.
// Kullanım: npm run harness:contrast
//
// Amaç: Faz A/B/C/E boyunca zemin ve metin tokenları değişirken kontrastın
// sessizce bozulmasını engellemek. Normal metin eşiği 4.5:1 (WCAG 1.4.3 AA).
//
// Kaynak (tek gerçek): src/style.css :root değerleri + tailwind.config.js slate override'ları.
// Not: --bicycle (#c40f2e) BİLİNÇLİ olarak metin değil yalnız yüzeydir (3.31:1) → eşik dışı.

/** Göreli parlaklık (WCAG 2.x). */
function luminance(hex) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** İki rengin kontrast oranı. */
function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Yarı saydam yüzeyi zemine kompozitleyip düz hex döndürür. */
function composite(rgba, bgHex) {
  const bg = [1, 3, 5].map((i) => parseInt(bgHex.slice(i, i + 2), 16));
  const [r, g, b, a] = rgba;
  return (
    '#' +
    [r, g, b]
      .map((c, i) => Math.round(c * a + bg[i] * (1 - a)))
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

const PAGE_BG = '#0a0608'; // --ds-bg

// Panel aileleri: rgba + üzerine oturdukları zemin (src/style.css :root).
const PANELS = {
  '--ds-panel (.78)': composite([19, 14, 19, 0.78], PAGE_BG),
  '--ds-card (.88)': composite([19, 14, 18, 0.88], PAGE_BG),
  '--ds-hero (.90)': composite([19, 13, 17, 0.9], PAGE_BG),
};

const BACKGROUNDS = { 'sayfa': PAGE_BG, ...PANELS };

// Metin tokenları (tailwind.config.js slate override'ları dahil).
const TEXT = {
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

// Yalnız yüzey/ağırlık — metin olarak YASAK (bilinçli istisna, ADR-0060/0061).
const SURFACE_ONLY = { '--bicycle (yüzey)': '#c40f2e' };

const THRESHOLD = 4.5;
const bgNames = Object.keys(BACKGROUNDS);

console.log('WCAG AA kontrast denetimi — "Aç Kumarhane" paleti (normal metin eşiği 4.5:1)\n');
console.log('metin'.padEnd(22) + bgNames.map((n) => n.padStart(18)).join(''));

let failures = 0;
for (const [name, color] of Object.entries(TEXT)) {
  const cells = bgNames.map((bgName) => {
    const r = ratio(color, BACKGROUNDS[bgName]);
    if (r < THRESHOLD) failures += 1;
    return (r.toFixed(2) + (r < THRESHOLD ? ' ✗' : '')).padStart(18);
  });
  console.log(name.padEnd(22) + cells.join(''));
}

console.log('\nYalnız yüzey (metin değil — eşik dışı, bilinçli):');
for (const [name, color] of Object.entries(SURFACE_ONLY)) {
  console.log('  ' + name.padEnd(24) + ratio(color, PAGE_BG).toFixed(2) + ':1 (sayfa zemini)');
}

if (failures > 0) {
  console.error(`\n✗ BAŞARISIZ: ${failures} metin/zemin çifti 4.5:1 altında.`);
  process.exit(1);
}
console.log('\n✓ Tüm metin/zemin çiftleri WCAG AA (>= 4.5:1) geçti.');
