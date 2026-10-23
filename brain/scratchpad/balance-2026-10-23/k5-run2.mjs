import { simulate } from "./k5-sim.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const ramp = [1.35, 1.45, 1.55, 1.7, 1.85, 2.0, 2.2, 2.4];
const rows = [];
for (const rl of [20, 30, 40, 60]) {
  for (const gm of ["flat1.4", "ramp"]) {
    const res = simulate({ costs: ladder(rl), growth: gm === "ramp" ? ramp : new Array(8).fill(1.4), rates: new Array(8).fill(1), sampleMinutes: [10, 30, 60] });
    rows.push({ rl, gm, gate: res.gateMin, boosts: res.boosts, u8: res.unlockMin[7], f10: res.timeline[0] ? res.timeline[0][4] : null, f30: res.timeline[1] ? res.timeline[1][4] : null });
  }
}
console.table(rows);
