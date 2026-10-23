import { simulate } from "./ad-chain.mjs";
const L = (a) => a.map((v) => Math.log10(v));
const per10 = (g) => Math.log10(Math.pow(g, 10));
const ladder = (g) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(40, i + 1))];
const cfgs = [
  { id: "B g1.4", cExp: L(ladder(1.4)), per10Exp: new Array(8).fill(per10(1.4)) },
  { id: "B g1.5", cExp: L(ladder(1.4)), per10Exp: new Array(8).fill(per10(1.5)) },
  { id: "B g1.3", cExp: L(ladder(1.4)), per10Exp: new Array(8).fill(per10(1.3)) },
  { id: "B g1.4 r20", cExp: L([25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(20, i + 1))]), per10Exp: new Array(8).fill(per10(1.4)) },
];
for (const cfg of cfgs) {
  const r = simulate(cfg);
  console.log(cfg.id.padEnd(12), JSON.stringify(r));
}
