import { simulate } from "./k5-sim.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const rows = [];
for (const rl of [6, 8, 10, 12, 16, 20]) {
  for (const pc of [0.08, 0.12]) {
    const res = simulate({ costs: ladder(rl), growth: new Array(8).fill(1.4), rates: [1, ...new Array(7).fill(pc)], sampleMinutes: [10, 30, 60, 90] });
    rows.push({ rl, pc, gate: res.gateMin, boosts: res.boosts, u8: res.unlockMin[7], f10: res.timeline[0] ? res.timeline[0][4] : null, f60: res.timeline[2] ? res.timeline[2][4] : null });
  }
}
console.table(rows);
