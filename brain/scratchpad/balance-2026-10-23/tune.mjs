import { simulate } from "./sim.mjs";

function score(r) {
  let s = 0;
  const gm = r.gateSec === null ? 300 : r.gateSec / 60;
  s += Math.abs(gm - 120) * 2.2;
  const b = r.boosts.length;
  s += b < 20 ? (20 - b) * 10 : b > 26 ? (b - 26) * 10 : 0;
  s += Math.abs(b - 23) * 1.2;
  const p = r.purchases;
  s += p < 100 ? (100 - p) * 1.2 : p > 150 ? (p - 150) * 1.2 : 0;
  const f10 = r.first10;
  s += f10 < 6 ? (6 - f10) * 6 : f10 > 10 ? (f10 - 10) * 3 : 0;
  let prev = 0;
  for (let i = 1; i < 8; i++) {
    const u = r.unlockSec[i] === null ? 300 : r.unlockSec[i] / 60;
    if (u < 8) s += (8 - u) * 2;
    if (u > 40) s += (u - 40) * 2;
    if (u <= prev + 1) s += 2;
    prev = u;
  }
  const u1 = r.unlockSec[1] === null ? 300 : r.unlockSec[1] / 60;
  s += Math.abs(u1 - 10) * 1.2;
  const lastU = r.unlockSec[7] === null ? 300 : r.unlockSec[7] / 60;
  s += Math.abs(lastU - 38) * 1.0;
  const cyc = r.cycleSec.slice(2);
  if (cyc.length > 2) {
    const mean = cyc.reduce((a, x) => a + x, 0) / cyc.length;
    if (mean < 190) s += (190 - mean) / 10;
    if (mean > 380) s += (mean - 380) / 10;
  }
  return s;
}

const seeds = [
  { p0: 0.95, dp: -0.029, c0: 0.778, dc: 0.68, g: 1.4 },
  { p0: 1.2, dp: -0.03, c0: 0.778, dc: 0.72, g: 1.4 },
  { p0: 0.7, dp: -0.03, c0: 0.85, dc: 0.65, g: 1.45 },
];

const build = (x) => ({
  pExp: Array.from({ length: 8 }, (_, i) => x.p0 + x.dp * i),
  cExp: Array.from({ length: 8 }, (_, i) => x.c0 + x.dc * i),
  g: x.g,
  dt: 0.5,
  maxMinutes: 170,
});

let seed = 555;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
const rep = (r) => ({ s: +score(r).toFixed(1), gm: r.gateSec === null ? null : +(r.gateSec / 60).toFixed(1), b: r.boosts.length, p: r.purchases, f10: r.first10, un: r.unlockSec.map((v) => (v === null ? null : +(v / 60).toFixed(1))), cyc: r.cycleSec.length ? Math.round(r.cycleSec[r.cycleSec.length - 1]) : null });

const finals = [];
for (const sd of seeds) {
  let cur = { ...sd };
  let curR = simulate(build(cur));
  let curS = score(curR);
  const sig = [0.09, 0.04, 0.06, 0.05, 0.008];
  for (let it = 0; it < 40; it++) {
    let improved = false;
    for (let k = 0; k < 5; k++) {
      const cand = { ...cur };
      cand.p0 += gauss() * sig[0]; cand.dp += gauss() * sig[1];
      cand.c0 += gauss() * sig[2]; cand.dc += gauss() * sig[3];
      cand.g = Math.min(1.5, Math.max(1.3, cand.g + gauss() * sig[4]));
      const rr = simulate(build(cand));
      const ss = score(rr);
      if (ss < curS - 1e-6) { cur = cand; curR = rr; curS = ss; improved = true; }
    }
    if (!improved) sig.forEach((v, i) => (sig[i] = v * 0.75));
  }
  finals.push({ x: cur, r: curR, s: curS });
  console.log(JSON.stringify(rep(curR)));
  console.log("   p:", build(cur).pExp.map((v) => +v.toFixed(3)).join(","), "| c:", build(cur).cExp.map((v) => +v.toFixed(3)).join(","), "| g:", +cur.g.toFixed(3));
}
finals.sort((a, b) => a.s - b.s);
console.log("BEST", JSON.stringify(rep(finals[0].r)));
