
import Decimal from "break_eternity.js";
const D = (x) => new Decimal(x);
const GATE = D("1.79e308");
const COSTS = [25, 200, 1600, 12800, 102400, 819200, 6553600, 52428800].map(D);
const PR = [1, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11];

// q: dizi (8) — her halkanin dogrudan sayi uretim hizi (birim basina /sn)
function sim(q, label) {
  const dt = 0.5, taps = 2, boostExp = 0.2, unlockNeed = 10, start = D(10), g = 1.2;
  let N = start, peak = start, M = D(1);
  const A = new Array(8).fill(0), bought = new Array(8).fill(0);
  const unlocked = [true,false,false,false,false,false,false,false];
  let t = 0, boosts = 0, buys = 0, firstBoost = false, cycleBuys = 0;
  let threshold = COSTS[7].times(10), tapAcc = 0, decAcc = 0;
  const unlockT = [0,null,null,null,null,null,null,null];
  const cost = (i) => COSTS[i].times(D(Math.pow(g, bought[i])));
  const eff = () => { const r = N.div(GATE); return r.lte(1) ? 1 : Math.pow(0.9, r.log10().toNumber()); };
  const direct = () => { let s = D(0); for (let i = 0; i < 8; i++) s = s.plus(D(A[i] * q[i])); return s; };
  const perSec = () => direct().plus(D(A[0] * PR[0])).times(M).times(eff());
  const buy = (i) => { if (!unlocked[i]) return 0; const cc = cost(i); if (N.lt(cc)) return 0;
    N = N.minus(cc); A[i] += 1; bought[i] += 1; buys += 1;
    if (bought[i] >= unlockNeed && i + 1 < 8 && !unlocked[i+1]) { unlocked[i+1] = true; unlockT[i+1] = t; } return 1; };
  const samples = [];
  const marks = [600, 1800, 3600];
  let mi = 0;
  while (t < 300*60) {
    for (let i = 0; i < 7; i++) A[i] += A[i+1] * PR[i+1] * dt;
    N = N.plus(perSec().times(dt));
    tapAcc += dt;
    while (tapAcc >= 1/taps) { tapAcc -= 1/taps; N = N.plus(1); }
    if (N.gt(peak)) peak = N;
    t += dt;
    if (mi < marks.length && t >= marks[mi]) { samples.push([marks[mi]/60, +N.log10().toFixed(1), +perSec().log10().toFixed(2), A.map(a=>+a.toFixed(1))]); mi++; }
    decAcc += dt;
    if (decAcc >= 0.5) { decAcc = 0;
      if (!firstBoost) { let p = -1; for (let i = 7; i >= 0; i--) if (unlocked[i] && bought[i] < unlockNeed) { p = i; break; }
        if (p >= 0) buy(p); else for (let i = 7; i >= 0; i--) if (unlocked[i] && N.gte(cost(i))) { buy(i); break; } }
      else if (cycleBuys < 2) { if (bought[0] === 0 && N.gte(cost(0))) { if (buy(0)) cycleBuys++; }
        else if (N.gte(cost(7))) { if (buy(7)) cycleBuys++; } }
    }
    if (bought[7] > 0 && N.gte(threshold)) { const pk = peak; M = M.times(pk.div(start).pow(boostExp)); boosts++; firstBoost = true; cycleBuys = 0;
      threshold = pk.times(pk.div(start).pow(boostExp)); N = start; peak = start;
      for (let i = 0; i < 8; i++) { A[i] = 1; bought[i] = 0; } }
    if (N.gte(GATE)) break;
  }
  return { label, gate: +(t/60).toFixed(1), boosts, buys, unlock: unlockT.map(x => x===null?null:+(x/60).toFixed(1)), samples };
}

const variants = {
  "taban (q=0)": new Array(8).fill(0),
  "q=0.02 duz": new Array(8).fill(0.02),
  "q=0.05 duz": new Array(8).fill(0.05),
  "q=0.10 duz": new Array(8).fill(0.10),
  "q=0.25 duz": new Array(8).fill(0.25),
  "q=p*0.25": PR.map(p => p*0.25),
  "q=p*0.5": PR.map(p => p*0.5),
  "q=0.01*2^i": Array.from({length:8},(_,i)=>0.01*Math.pow(2,i)),
  "q=0.005*4^i": Array.from({length:8},(_,i)=>0.005*Math.pow(4,i)),
};
for (const [k,v] of Object.entries(variants)) {
  const r = sim(v, k);
  console.log(k.padEnd(14), "gate", String(r.gate).padStart(6), "boosts", r.boosts, "buys", r.buys, "unlock", JSON.stringify(r.unlock));
  for (const s of r.samples) console.log("   ", s[0] + "dk", "log10N", s[1], "log10/s", s[2], "A", JSON.stringify(s[3]));
}
