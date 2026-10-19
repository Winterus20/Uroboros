// Harness sonuç doğrulayıcısı — ölçümü karara bağlar.
//
// Kullanım:
//   node brain/scratchpad/harness/assert-results.mjs <results.json> --smoke
//   node brain/scratchpad/harness/assert-results.mjs <results.json> --full
//
// --smoke: `npm run harness:smoke` çıktısını kontrol eder (tek koşu:
//   active, seed 1, dt=0.5, 0.5 saat). Eşikler 2026-10-10 probe'undan
//   (log10=89.7, shifts=8, gal=1) bilinçli gevşek tutuldu: amaç hassas
//   denge değil, "oyun açılıyor ve ekonomi nefes alıyor mu" kapısıdır.
//   Ölçülen değer koşunun ZİRVESİDİR (`peaks`); `final` reset-sonrası anlık
//   görüntüdür ve galaksi alımı kütleyi sıfırladığı için tek başına yanıltıcıdır.
//   `peaks` alanı olmayan eski JSON'larda `final`a düşülür.
// --full: uzun denge koşusunu ADR-0023 bandına karşı kontrol eder
//   (active: tekillik 150-300 dk; casual/idle: çökmesiz tamamlama).
//
// Her iki mod da ihlalde exit 1 verir (CI kapısı olarak kullanılabilir).

import fs from "node:fs";

const file = process.argv[2];
const mode = process.argv[3] ?? "--smoke";

if (!file || !["--smoke", "--full"].includes(mode)) {
  console.error("Kullanim: node assert-results.mjs <results.json> [--smoke | --full]");
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const runs = Array.isArray(raw) ? raw : Array.isArray(raw.runs) ? raw.runs : [raw];

let failures = 0;
function check(cond, msg) {
  const mark = cond ? "PASS" : "FAIL";
  console.log(`[${mark}] ${msg}`);
  if (!cond) failures++;
}

if (mode === "--smoke") {
  check(runs.length === 1, `tek kosu beklenir (bulunan: ${runs.length})`);
  const run = runs[0];
  if (!run) {
    console.error("[FAIL] kosu yok");
    process.exit(1);
  }
  // Zirve metrikleri: yeni JSON'da `peaks` vardir; alan yoksa eski JSON uyumu
  // icin `final` kullanilir. Esikler degismez.
  const peaks = run.peaks;
  const hasPeak = (key) =>
    peaks !== null && typeof peaks === "object" && typeof peaks[key] === "number";
  const metric = (key) => Number((hasPeak(key) ? peaks[key] : run.final?.[key]) ?? 0);
  const source = (key) => (hasPeak(key) ? "peaks" : "final");

  check(run.error === null || run.error === undefined, `hatasiz tamamlanma (error=${run.error ?? "yok"})`);
  check(run.reached === false, "0.5 saatte tekillik henuz YOK (erken bitme regresyonu yakalanir)");
  const logM = metric("logMatter");
  check(
    Number.isFinite(logM) && logM >= 60,
    `30 dk aktif oyunda zirve log10 >= 60 (bulunan: ${logM.toFixed(1)}, kaynak: ${source("logMatter")})`
  );
  const shifts = metric("shifts");
  check(shifts >= 5, `en az 5 shift (zirve, bulunan: ${shifts}, kaynak: ${source("shifts")})`);
  const tickspeedBought = metric("tickspeedBought");
  check(
    tickspeedBought > 0,
    `zirve tickspeed alimi yapildi (bulunan: ${tickspeedBought}, kaynak: ${source("tickspeedBought")})`
  );
} else {
  for (const run of runs) {
    const tag = `${run.profile} seed=${run.seed}`;
    check(!run.error, `[${tag}] hatasiz (error=${run.error ?? "yok"})`);
    if (run.profile === "active") {
      check(run.reached === true, `[${tag}] tekillige ulasti`);
      const mins = (run.timeSeconds ?? -1) / 60;
      check(mins >= 150 && mins <= 300, `[${tag}] ilk tekillik 150-300 dk bandinda (bulunan: ${mins.toFixed(1)} dk)`);
    } else {
      const logM = Number(run.final?.logMatter ?? NaN);
      check(Number.isFinite(logM) && logM > 0, `[${tag}] olculebilir ilerleme (log10=${logM})`);
    }
  }
}

if (failures > 0) {
  console.error(`[assert] ${failures} kontrol dustu -> ${file}`);
  process.exit(1);
}
console.log(`[assert] tum kontroller gecti (${mode}) -> ${file}`);
