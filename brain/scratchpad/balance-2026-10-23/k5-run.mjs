import { simulate } from "./k5-sim.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const cfgs = [
  { id: "MEVCUT p0.08 r3.2", rates: new Array(8).fill(0.08), costs: [25,80,250,800,2500,8000,25000,80000] },
  { id: "p1 r40", rates: new Array(8).fill(1), costs: ladder(40) },
  { id: "p0=1 r3.2", rates: [1, ...new Array(7).fill(0.08)], costs: [25,80,250,800,2500,8000,25000,80000] },
  { id: "p0=1 r40", rates: [1, ...new Array(7).fill(0.08)], costs: ladder(40) },
  { id: "p0=1 p0.05 r2", rates: [1, ...new Array(7).fill(0.05)], costs: [25,50,100,200,400,800,1600,3200] },
];
for (const cfg of cfgs) {
  const r = simulate(cfg);
  console.log(cfg.id.padEnd(18), "kapi", String(r.gateMin).padStart(6), "boost", String(r.boosts).padStart(3), "alim", String(r.buys).padStart(5), "ilk10dk", String(r.first10).padStart(4), "u8", r.unlockMin[7]);
  console.log("   [dk, log10N, alim, boost, parmak]", JSON.stringify(r.timeline));
}
