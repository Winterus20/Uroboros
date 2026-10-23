// K5 oyuncu politikasi ile zincir olcumu (gercek motorun aynasi). SALT OLCUM.
import Decimal from "break_eternity.js";
const D = (x) => new Decimal(x);
export const GATE = D("1.79e308");

export function simulate(cfg) {
  const c = cfg.costs.map((v) => D(v));
  const g = (cfg.growth ?? new Array(8).fill(1.4)).map((v) => Math.pow(v, 0.1));
  const rates = cfg.rates;
  const dt = cfg.dt ?? 0.5;
  const maxT = (cfg.maxMinutes ?? 300) * 60;
  const unlockNeed = cfg.unlockNeed ?? 10;
  const start = D(cfg.start ?? 10);
  const boostExp = cfg.boostExp ?? 0.2;
  const taps = cfg.tapsPerSecond ?? 2;

  let N = start, peak = start, M = D(1);
  const A = new Array(8).fill(0);
  const bought = new Array(8).fill(0);
  const unlocked = [true, false, false, false, false, false, false, false];
  let t = 0, boosts = 0, buys = 0, firstBoost = false, cycleBuys = 0;
  let threshold = c[7].times(10);
  let tapAcc = 0, decAcc = 0, first10 = 0;
  const unlockT = [0, null, null, null, null, null, null, null];
  const timeline = [];
  const samples = cfg.sampleMinutes ?? [10, 30, 60, 90, 120];
  let si = 0;
  const cost = (i) => c[i].times(D(Math.pow(g[i], bought[i])));
  const buy = (i) => {
    if (!unlocked[i]) return 0;
    const cc = cost(i);
    if (N.lt(cc)) return 0;
    N = N.minus(cc); A[i] += 1; bought[i] += 1; buys += 1;
    if (t <= 600) first10 += 1;
    if (bought[i] >= unlockNeed && i + 1 < 8 && !unlocked[i + 1]) { unlocked[i + 1] = true; unlockT[i + 1] = t; }
    return 1;
  };

  while (t < maxT) {
    for (let i = 0; i < 7; i++) A[i] += A[i + 1] * rates[i + 1] * dt;
    N = N.plus(D(A[0] * rates[0] * dt).times(M));
    tapAcc += dt;
    while (tapAcc >= 1 / taps) { tapAcc -= 1 / taps; N = N.plus(1); }
    if (N.gt(peak)) peak = N;
    t += dt;
    decAcc += dt;
    if (decAcc >= 0.5) {
      decAcc = 0;
      if (!firstBoost) {
        let picked = -1;
        for (let i = 7; i >= 0; i--) if (unlocked[i] && bought[i] < unlockNeed) { picked = i; break; }
        if (picked >= 0) buy(picked);
        else for (let i = 7; i >= 0; i--) if (unlocked[i] && N.gte(cost(i))) { buy(i); break; }
      } else if (cycleBuys < 2) {
        if (bought[0] === 0 && N.gte(cost(0))) { if (buy(0)) cycleBuys += 1; }
        else if (N.gte(cost(7))) { if (buy(7)) cycleBuys += 1; }
      }
    }
    if (bought[7] > 0 && N.gte(threshold)) {
      const pk = peak;
      M = M.times(pk.div(start).pow(boostExp));
      boosts += 1; firstBoost = true; cycleBuys = 0;
      threshold = pk.times(pk.div(start).pow(boostExp));
      N = start; peak = start;
      for (let i = 0; i < 8; i++) { A[i] = 1; bought[i] = 0; }
    }
    while (si < samples.length && t >= samples[si] * 60) {
      timeline.push([samples[si], +N.log10().toFixed(1), buys, boosts, Math.round(A[0])]); si++;
    }
    if (N.gte(GATE)) break;
  }
  const mm = (x) => (x === null ? null : +(x / 60).toFixed(1));
  return { gateMin: N.gte(GATE) ? mm(t) : null, boosts, buys, first10, unlockMin: unlockT.map(mm), timeline };
}
