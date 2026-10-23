import { simulate } from "./ad-chain.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const rows = [];
// KONTROL: mevcut oyun (p=0.08, merdiven 3.2, buyume 1.4) ayni buy-max politikasiyla
const cur = simulate({ costs: [25,80,250,800,2500,8000,25000,80000], growth: new Array(8).fill(1.4), rates: new Array(8).fill(0.08), sampleMinutes: [10,30,60,90,120] });
rows.push({ cfg: "MEVCUT 0.08/3.2", gate: cur.gateMin, boosts: cur.boosts, buys: cur.buys, u8: cur.unlockMin[7], f10: Math.round(cur.timeline[0][4]) });
// p = 1/sn her yerde, x40 merdiven, boost ussu taranir
for (const be of [0.05, 0.08, 0.1, 0.12, 0.15]) {
  const res = simulate({ costs: ladder(40), growth: new Array(8).fill(1.4), rates: new Array(8).fill(1), boostExp: be, sampleMinutes: [10,30,60,90,120] });
  rows.push({ cfg: "p1 x40 be=" + be, gate: res.gateMin, boosts: res.boosts, buys: res.buys, u8: res.unlockMin[7], f10: res.timeline[0] ? Math.round(res.timeline[0][4]) : null });
}
console.table(rows);
const det = simulate({ costs: ladder(40), growth: new Array(8).fill(1.4), rates: new Array(8).fill(1), boostExp: 0.1, sampleMinutes: [1,3,5,10,20,40,60,90,120] });
console.log("p1 x40 be=0.1 unlocks:", JSON.stringify(det.unlockMin));
console.log("  [dk, log10N, alim, boost, parmak]", JSON.stringify(det.timeline));
