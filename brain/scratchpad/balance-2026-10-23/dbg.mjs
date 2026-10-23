import Decimal from "break_eternity.js";
const D = (x) => new Decimal(x);
const GATE = D("1.79e308");
const cfg = { g: 1.4, cExp: [0.778,1.602,2.447,3.279,4.114,4.954,5.792,6.633], pExp: [-1.0,-1.032,-1.06,-1.089,-1.117,-1.146,-1.174,-1.202], dt: 0.5, resetRingTo: 1, buysPerCycle: 2 };
const p = cfg.pExp.map(e=>D(10).pow(e));
const c = cfg.cExp.map(e=>D(10).pow(e));
let N = D(10); const A = Array(8).fill(0).map(()=>D(0)); const b = Array(8).fill(0);
const unlocked = Array(8).fill(false); unlocked[0]=true;
let M = D(1); let t = 0;
const cost = (i) => c[i].mul(Math.pow(cfg.g, b[i]));
let threshold = null; let cyc = 0; let cycStart = 0;
const log = [];
for (let step = 0; step < 60000; step++) {
  const dN = M.mul(A[0]).mul(p[0]);
  const dA = []; for (let i=0;i<7;i++) dA.push(A[i+1].mul(p[i+1]));
  N = N.add(dN.mul(cfg.dt));
  for (let i=0;i<7;i++) A[i]=A[i].add(dA[i].mul(cfg.dt));
  t += cfg.dt;
  if (N.gte(GATE)) { console.log("GATE", (t/60).toFixed(1)); break; }
  if (unlocked[7] && b[7] >= 1 && (threshold === null || N.gte(threshold))) {
    const peak = N; const gain = peak.div(10).pow(0.2); M = M.mul(gain);
    log.push({ k: cyc, t: +(t/60).toFixed(1), len: +(t-cycStart).toFixed(0), peak: peak.log10().toFixed(1), M: M.log10().toFixed(1) });
    threshold = peak.mul(peak.div(10).pow(0.2)); cycStart = t; cyc++; N = D(10);
    for (let i=0;i<8;i++){ A[i]=D(unlocked[i]?1:0); b[i]=0; }
    continue;
  }
  const climbing = cyc === 0;
  let g2 = 0;
  while (g2++ < 10) {
    if (!climbing && (b[0]+b[7]) >= cfg.buysPerCycle) break;
    let pick = -1;
    if (!climbing) { if (b[0]===0 && cost(0).lte(N)) pick=0; else if (unlocked[7] && cost(7).lte(N)) pick=7; }
    if (pick < 0 && climbing) { for (let i=7;i>=0;i--){ if(!unlocked[i]) continue; if(b[i]>=10) continue; if (cost(i).lte(N)) { pick=i; break; } } }
    if (pick < 0) break;
    N = N.sub(cost(pick)); b[pick]++; A[pick]=A[pick].add(1);
    if (pick < 7 && b[pick] >= 10) unlocked[pick+1]=true;
    if (N.lte(0)) break;
  }
}
for (const r of log) console.log(JSON.stringify(r));
