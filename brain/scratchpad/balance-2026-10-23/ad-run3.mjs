import { simulate } from "./ad-chain.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const rep = (v) => new Array(8).fill(v);
const rows = [];
for (const r of [40, 60, 80, 120]) {
  for (const gth of [3, 10, 30]) {
    const res = simulate({ costs: ladder(r), growth: rep(1.4), gainThreshold: gth });
    rows.push({ r, gth, gate: res.gateMin, boosts: res.boosts, buys: res.buys, u8: res.unlockMin[7] });
  }
}
console.table(rows);
const best = simulate({ costs: ladder(80), growth: rep(1.4), gainThreshold: 10 });
console.log("timeline r=80 gth=10:", JSON.stringify(best.timeline));
console.log("unlocks:", JSON.stringify(best.unlockMin));
