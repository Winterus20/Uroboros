// AD-tipi zincir: rate = 1/sn, 10-lu blok fiyatlamasi. SALT OLCUM.
import Decimal from "break_eternity.js";
const D = (x) => new Decimal(x);
export const GATE = D("1.79e308");

export function simulate(cfg) {
  const c = cfg.costs.map((v) => D(v));
  const g = cfg.growth.map((v) => Math.pow(v, 0.1));
  const rate = cfg.rates ?? new Array(8).fill(1);
  const dt = cfg.dt ?? 0.05;
  const maxT = (cfg.maxMinutes ?? 240) * 60;
  const unlockNeed = cfg.unlockNeed ?? 10;
  const start = D(cfg.start ?? 10);
  const blockSize = cfg.blockSize ?? 10;
  const boostExp = cfg.boostExp ?? 0.2;
  const gainThreshold = cfg.gainThreshold ?? 3;
  const clicks = cfg.clicksPerSec ?? 2;
  const aps = cfg.actionsPerSec ?? Infinity;
  let budget = 0;
  const samples = cfg.sampleMinutes ?? [1, 2, 5, 10, 20, 30, 60, 90, 120];

  let N = start;
  let peak = start;
  const A = new Array(8).fill(0);
  const bought = new Array(8).fill(0);
  const unlocked = [true, false, false, false, false, false, false, false];
  let M = D(1);
  let boosts = 0, buys = 0, t = 0;
  const unlocks = [0, null, null, null, null, null, null, null];
  let firstBuy = null, gateT = null;
  const timeline = [];
  let si = 0;

  const blockCost = (i, n) => {
    const sum = (Math.pow(g[i], n) - 1) / (g[i] - 1);
    return c[i].times(D(Math.pow(g[i], bought[i]))).times(sum);
  };

  while (t < maxT) {
    for (let i = 0; i < 7; i++) A[i] += A[i + 1] * rate[i + 1] * dt;
    N = N.plus(D(A[0] * rate[0] * dt).times(M)).plus(clicks * dt);
    if (N.gt(peak)) peak = N;
    t += dt;
    if (Number.isFinite(aps)) budget = Math.min(aps, budget + aps * dt);

    for (let guard = 0; guard < 600; guard++) {
      if (budget < 1) break;
      let bestI = -1, bestC = null, bestN = 1;
      for (let i = 0; i < 8; i++) {
        if (!unlocked[i]) continue;
        const bc = blockCost(i, blockSize);
        if (N.gte(bc) && (bestC === null || bc.lt(bestC))) { bestC = bc; bestI = i; bestN = blockSize; }
      }
      if (bestI < 0) {
        for (let i = 0; i < 8; i++) {
          if (!unlocked[i]) continue;
          const sc = blockCost(i, 1);
          if (N.gte(sc) && (bestC === null || sc.lt(bestC))) { bestC = sc; bestI = i; bestN = 1; }
        }
      }
      if (bestI < 0) break;
      N = N.minus(bestC);
      if (Number.isFinite(aps)) budget -= 1;
      for (let k = 0; k < bestN; k++) {
        A[bestI] += 1; bought[bestI] += 1; buys += 1;
        if (firstBuy === null) firstBuy = t;
        if (bought[bestI] >= unlockNeed && bestI + 1 < 8 && !unlocked[bestI + 1]) {
          unlocked[bestI + 1] = true; unlocks[bestI + 1] = t;
        }
      }
    }

    while (si < samples.length && t >= samples[si] * 60) {
      timeline.push([samples[si], +N.log10().toFixed(1), buys, boosts, A[0] > 0 ? Math.round(A[0]) : 0]);
      si++;
    }
    if (gateT === null && N.gte(GATE)) { gateT = t; break; }

    if (bought[7] > 0) {
      const gain = peak.div(start).pow(boostExp);
      if (gain.gte(gainThreshold)) {
        M = M.times(gain); boosts += 1;
        N = start; peak = start;
        for (let i = 0; i < 8; i++) { A[i] = 1; bought[i] = 0; }
      }
    }
  }
  const mm = (x) => (x === null ? null : +(x / 60).toFixed(1));
  return { gateMin: mm(gateT), boosts, buys, unlockMin: unlocks.map(mm), timeline };
}
