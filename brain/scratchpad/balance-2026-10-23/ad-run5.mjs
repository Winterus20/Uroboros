import { simulate } from "./ad-chain.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const rows = [];
for (const rl of [10, 20, 40]) {
  for (const pc of [0.05, 0.08, 0.12, 0.2]) {
    const res = simulate({ costs: ladder(rl), growth: new Array(8).fill(1.4), rates: [1, ...new Array(7).fill(pc)], sampleMinutes: [10, 30, 60] });
    rows.push({ rl, pc, gate: res.gateMin, boosts: res.boosts, buys: res.buys, u8: res.unlockMin[7], f10: res.timeline[0] ? Math.round(res.timeline[0][4]) : null, n30: res.timeline[1] ? res.timeline[1][1] : null });
  }
}
console.table(rows);
