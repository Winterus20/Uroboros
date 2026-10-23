// Hold That Number — 1. basamak denge simulasyonu (SALT OLCUM; src/ altinda hicbir sey degismez)
//
//   node sim.mjs          -> A (birincil) seti: sabitler + olcumler + hedef uyumu
//   node sim.mjs --all    -> A + B (yedek) + duyarlilik tablolari
//
// Model (kilitli tasarim + olculen yorumlar; gerekce icin rapor.md):
//   N          sayi (break_eternity Decimal)
//   A[0..7]    halka birim sayilari (0 Parmaklar ... 7 Matematikci)
//   dN/dt      = M * A[0] * p[0]
//   dA[i]/dt   = A[i+1] * p[i+1]        (i = 0..6)  -- M yalnizca sayiya uygulanir
//   dA[7]/dt   = 0
//   maliyet_i  = c[i] * g^b             (b = bu dongude o halkadan alinan birim)
//   kilit      : bir halkadan 10 birim -> sonraki halka KALICI olarak acilir
//   boost      : M *= (zirve/10)^0.2 ; N=10, tum halkalar 1 birime iner
//
// Zincir dogrusal/ucgen oldugu icin her adimda KAPALI FORM integral alinir
// (Euler yok): sonuc dt'den bagimsizdir (0.5 / 0.1 / 0.05 ayni sayiyi verir).

import Decimal from "break_eternity.js";

const D = (x) => new Decimal(x);
export const GATE = D("1.79e308");

/** A — birincil set: tiklamali baslangic (2 tik/sn), 23 boost, ~120 dk. */
export const SET_A = {
  id: "A",
  g: 1.4,
  cExp: [25, 79, 250, 790, 2500, 7900, 25000, 79000].map((v) => Math.log10(v)),
  pExp: [0.071, 0.074, 0.078, 0.082, 0.086, 0.09, 0.095, 0.1].map((v) => Math.log10(v)),
  clicksPerSec: 2,
  dt: 0.5,
  maxMinutes: 240,
  resetRingTo: 1,
  unlockNeed: 10,
  buysPerCycle: 2,
  boostExp: 0.2,
  firstBoostMult: 10,
};

/** B — yedek set: tiklamasiz da calisir (ilk alim N0=10 ile mumkun), 23 boost. */
export const SET_B = {
  id: "B",
  g: 1.4,
  cExp: [6, 28, 136, 650, 3100, 15000, 71000, 340000].map((v) => Math.log10(v)),
  pExp: [0.08, 0.084, 0.09, 0.096, 0.102, 0.108, 0.116, 0.123].map((v) => Math.log10(v)),
  clicksPerSec: 0,
  dt: 0.5,
  maxMinutes: 240,
  resetRingTo: 1,
  unlockNeed: 10,
  buysPerCycle: 2,
  boostExp: 0.2,
  firstBoostMult: 10,
};

export function simulate(cfgIn, opts = {}) {
  const cfg = { ...SET_A, ...cfgIn };
  const p = cfg.pExp.map((e) => D(10).pow(e));
  const c = cfg.cExp.map((e) => D(10).pow(e));
  const dt = cfg.dt;

  // --- kapali form integral katsayilari ---
  const pw = [1];                                   // dt^k / k!
  for (let k = 1; k <= 8; k++) pw.push((pw[k - 1] * dt) / k);
  const q = [];                                     // halka i+1 -> i akisi
  for (let i = 0; i < 7; i++) q.push(p[i + 1]);
  const coefA = [];                                 // A_i icin ust halkalarin katkisi
  for (let i = 0; i < 8; i++) {
    const row = [];
    let prod = D(1);
    for (let k = 1; k <= 7 - i; k++) {
      prod = prod.mul(q[i + k - 1]);
      row.push(prod.mul(pw[k]));
    }
    coefA.push(row);
  }
  const coefN = [];                                 // N icin zincir katkilari
  let prodN = D(1);
  for (let k = 1; k <= 8; k++) {
    if (k > 1) prodN = prodN.mul(q[k - 2]);
    coefN.push(prodN.mul(pw[k]));
  }

  let N = D(10);
  const A = Array.from({ length: 8 }, () => D(0));
  const b = new Array(8).fill(0);
  const unlocked = new Array(8).fill(false);
  unlocked[0] = true;
  let M = D(1);
  let t = 0;

  const out = {
    cfg, gateSec: null, boosts: [], purchases: 0, first10: 0, clicks: 0, stalled: false,
    unlockSec: new Array(8).fill(null), buyPerRing: new Array(8).fill(0),
    cycleSec: [], cyclePeak: [], cycleBuys: [], M: D(1),
  };
  let cycleStart = 0;
  let cycleBuys = 0;
  let threshold = c[7].mul(cfg.firstBoostMult);     // ilk boost: maliyetin 10 kati
  const cost = (i) => c[i].mul(Math.pow(cfg.g, b[i]));
  const maxSteps = Math.ceil((cfg.maxMinutes * 60) / dt);

  for (let step = 0; step < maxSteps; step++) {
    // --- kapali form uretim adimi ---
    let dN = D(0);
    for (let k = 1; k <= 8; k++) dN = dN.add(coefN[k - 1].mul(A[k - 1]));
    dN = dN.mul(M).mul(p[0]);
    const nxt = new Array(8);
    for (let i = 0; i < 8; i++) {
      let v = A[i];
      const row = coefA[i];
      for (let k = 0; k < row.length; k++) v = v.add(row[k].mul(A[i + k + 1]));
      nxt[i] = v;
    }
    N = N.add(dN);
    for (let i = 0; i < 8; i++) A[i] = nxt[i];
    if (cfg.clicksPerSec) { N = N.add(cfg.clicksPerSec * dt); out.clicks += cfg.clicksPerSec * dt; }
    t += dt;

    if (N.gte(GATE)) { out.gateSec = t; out.M = M; break; }

    // --- boost ---
    if (unlocked[7] && b[7] >= 1 && N.gte(threshold)) {
      const peak = N;
      const gain = peak.div(10).pow(cfg.boostExp);
      M = M.mul(gain);
      out.boosts.push({ t, peak, gain, len: t - cycleStart, buys: cycleBuys, M });
      out.cycleSec.push(t - cycleStart);
      out.cyclePeak.push(peak);
      out.cycleBuys.push(cycleBuys);
      threshold = peak.mul(peak.div(10).pow(cfg.boostExp));
      cycleStart = t; cycleBuys = 0; N = D(10);
      for (let i = 0; i < 8; i++) { b[i] = 0; A[i] = D(unlocked[i] ? cfg.resetRingTo : 0); }
      continue;
    }

    // --- alim ---
    const climbing = out.boosts.length === 0;
    let guard = 0;
    while (guard++ < 12) {
      if (!climbing && cycleBuys >= cfg.buysPerCycle) break;
      let pick = -1;
      if (!climbing) {
        if (b[0] === 0 && cost(0).lte(N)) pick = 0;            // zinciri canlandir
        else if (unlocked[7] && cost(7).lte(N) && t >= (cfg.ring8OpenMin || 0) * 60) pick = 7; // boost anahtari
      }
      if (pick < 0 && climbing) {
        for (let i = 7; i >= 0; i--) {
          if (!unlocked[i] || b[i] >= cfg.unlockNeed) continue;
          if (i === 7 && t < (cfg.ring8OpenMin || 0) * 60) continue;   // senaryo: son halkayi geciktir
          if (cost(i).lte(N)) { pick = i; break; }
        }
      }
      if (pick < 0) break;
      N = N.sub(cost(pick));
      b[pick] += 1;
      A[pick] = A[pick].add(1);
      out.purchases += 1; cycleBuys += 1; out.buyPerRing[pick] += 1;
      if (t <= 600) out.first10 += 1;
      if (out.unlockSec[pick] === null) out.unlockSec[pick] = t;
      if (pick < 7 && b[pick] >= cfg.unlockNeed) unlocked[pick + 1] = true;
      if (N.lte(0)) break;
    }
  }
  out.M = M;
  out.stalled = out.purchases === 0 && out.gateSec === null;
  return out;
}

// ---------------------------------------------------------------- raporlama
const RINGS = ["Parmaklar", "Centik", "Abakus", "Kalem", "Hesap Mak.", "Bilgisayar", "Superbilgisayar", "Matematikci"];
const pad = (v, n) => String(v).padStart(n);
const min = (s) => (s === null ? "—" : (s / 60).toFixed(1));

function table(cfg) {
  const c = cfg.cExp.map((e) => 10 ** e);
  const p = cfg.pExp.map((e) => 10 ** e);
  console.log("  #  halka           taban maliyet c_i        uretim p_i");
  for (let i = 0; i < 8; i++) {
    console.log(
      "  " + (i + 1) + "  " + RINGS[i].padEnd(15) +
      pad(c[i].toPrecision(3), 14) + pad(p[i].toPrecision(3), 18),
    );
  }
  console.log("  g (fiyat carpani) = " + cfg.g + " | boost ussu = " + cfg.boostExp + " | ilk boost esigi = 10 x c8");
}

function metrics(r) {
  console.log("  kapi (1.79e308)        : " + min(r.gateSec) + " dk");
  console.log("  boost sayisi           : " + r.boosts.length);
  console.log("  toplam satin alma      : " + r.purchases);
  console.log("  ilk 10 dk satin alma   : " + r.first10);
  console.log("  halka acilis (dk)      : " + r.unlockSec.map((s, i) => (s === null ? "—" : (s / 60).toFixed(1))).join(" · "));
  console.log("  halka basi alim        : " + r.buyPerRing.join(" · "));
  if (r.cycleSec.length) {
    const mid = r.cycleSec.slice(2);
    const mean = mid.reduce((a, x) => a + x, 0) / mid.length;
    console.log("  dongu suresi           : ilk " + (r.cycleSec[0] / 60).toFixed(1) + " dk, sonra ort " + (mean / 60).toFixed(2) + " dk (min " + (Math.min(...mid) / 60).toFixed(2) + " / max " + (Math.max(...mid) / 60).toFixed(2) + ")");
    console.log("  zirve log10            : " + r.cyclePeak.map((x) => x.log10().toFixed(1)).join(" "));
  }
  console.log("  M (boost carpani)      : 1e" + r.M.log10().toFixed(1));
}

function targetTable(r) {
  const gm = r.gateSec === null ? null : r.gateSec / 60;
  const rows = [
    ["1. Kapi ~120 dk (110-130)", gm === null ? "—" : gm.toFixed(1) + " dk", gm !== null && gm >= 110 && gm <= 130],
    ["2. Boost 20-26", String(r.boosts.length), r.boosts.length >= 20 && r.boosts.length <= 26],
    ["3. Alim 100-150", String(r.purchases), r.purchases >= 100 && r.purchases <= 150],
    ["5. Ilk 10 dk >= 6 alim", String(r.first10), r.first10 >= 6],
    ["4a. Tum acilislar 8-40 dk", r.unlockSec.slice(1).every((s) => s !== null && s / 60 >= 8 && s / 60 <= 40) ? "evet" : "hayir", r.unlockSec.slice(1).every((s) => s !== null && s / 60 >= 8 && s / 60 <= 40)],
    ["4b. Son halka >= 90 dk", r.unlockSec[7] === null ? "—" : (r.unlockSec[7] / 60).toFixed(1) + " dk", r.unlockSec[7] !== null && r.unlockSec[7] / 60 >= 90],
    ["6. Dongu 5±2 dk", r.cycleSec.length > 3 ? (r.cycleSec.slice(2).reduce((a, x) => a + x, 0) / (r.cycleSec.length - 2) / 60).toFixed(2) + " dk" : "—", r.cycleSec.length > 3 && (() => { const m = r.cycleSec.slice(2).reduce((a, x) => a + x, 0) / (r.cycleSec.length - 2) / 60; return m >= 3 && m <= 7; })()],
  ];
  for (const [k, v, ok] of rows) console.log("  " + (ok ? "[x]" : "[ ]") + " " + k.padEnd(30) + " -> " + v);
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("balance-2026-10-23/sim.mjs");
if (isMain) {
  const all = process.argv.includes("--all");
  const a = simulate(SET_A);
  console.log("\n=== HOLD THAT NUMBER — 1. BASAMAK DENGE OLCUMU ===\n");
  console.log("--- SET A (birincil) sabitleri ---");
  table(SET_A);
  console.log("\n--- SET A olcumleri (2 tik/sn, dt=0.5) ---");
  metrics(a);
  console.log("\n--- Hedef uyumu (Set A) ---");
  targetTable(a);

  if (all) {
    const b = simulate(SET_B);
    console.log("\n--- SET B (yedek, tiklamasiz) sabitleri ---");
    table(SET_B);
    console.log("\n--- SET B olcumleri (0 tik, dt=0.5) ---");
    metrics(b);
    console.log("\n--- Hedef uyumu (Set B) ---");
    targetTable(b);

    console.log("\n--- Duyarlilik (Set A) ---");
    const cases = [
      ["dt=0.1", { dt: 0.1 }],
      ["dt=0.05", { dt: 0.05 }],
      ["dongu butcesi 3 alim", { buysPerCycle: 3 }],
      ["tik 0/sn (baslangic kilidi)", { clicksPerSec: 0 }],
      ["tik 5/sn", { clicksPerSec: 5 }],
      ["g=1.32", { g: 1.32 }],
      ["g=1.48", { g: 1.48 }],
      ["senaryo: halka 8 >= 60 dk", { ring8OpenMin: 60 }],
      ["senaryo: halka 8 >= 90 dk", { ring8OpenMin: 90 }],
    ];
    for (const [name, ov] of cases) {
      const r = simulate({ ...SET_A, ...ov });
      console.log("  " + name.padEnd(28) + " kapi " + pad(min(r.gateSec), 7) + " dk | boost " + pad(r.boosts.length, 2) +
        " | alim " + pad(r.purchases, 3) + " | ilk10 " + pad(r.first10, 3) + " | dongu " + (r.cycleSec.length ? Math.round(r.cycleSec[r.cycleSec.length - 1]) + " s" : "—"));
    }
  }
  console.log("");
}
