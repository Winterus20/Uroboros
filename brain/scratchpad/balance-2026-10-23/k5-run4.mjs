import { simulate } from "./k5-sim.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const rows = [];
// A tabani: parmak 1/sn, zincir 0.12/sn, x8 merdiven. Buyume duzlestirilerek halka basina 10 birim
for (const g of [1.2, 1.25, 1.3, 1.4]) {
  const res = simulate({ costs: ladder(8), growth: new Array(8).fill(g), rates: [1, ...new Array(7).fill(0.12)], sampleMinutes: [10, 30, 60, 90] });
  rows.push({ g, birimPerHalka: +(Math.log(8) / Math.log(g)).toFixed(1), gate: res.gateMin, boosts: res.boosts, u8: res.unlockMin[7], f10: res.timeline[0] ? res.timeline[0][4] : null });
}
console.table(rows);
