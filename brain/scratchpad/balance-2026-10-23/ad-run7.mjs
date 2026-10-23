import { simulate } from "./ad-chain.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const rows = [];
for (const aps of [2, 4, 8]) {
  const cur = simulate({ costs: [25,80,250,800,2500,8000,25000,80000], growth: new Array(8).fill(1.4), rates: new Array(8).fill(0.08), actionsPerSec: aps, sampleMinutes: [10,30,60,90,120] });
  rows.push({ cfg: "MEVCUT aps=" + aps, gate: cur.gateMin, boosts: cur.boosts, buys: cur.buys, u8: cur.unlockMin[7], f10: Math.round(cur.timeline[0][4]) });
}
for (const aps of [2, 4, 8]) {
  const res = simulate({ costs: ladder(40), growth: new Array(8).fill(1.4), rates: new Array(8).fill(1), actionsPerSec: aps, sampleMinutes: [10,30,60,90,120] });
  rows.push({ cfg: "p1 x40 aps=" + aps, gate: res.gateMin, boosts: res.boosts, buys: res.buys, u8: res.unlockMin[7], f10: res.timeline[0] ? Math.round(res.timeline[0][4]) : null });
}
console.table(rows);
