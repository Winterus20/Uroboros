import { simulate } from "./ad-chain.mjs";
const cfgs = [
  { id: "AD-exact", cExp: [1,2,4,6,9,13,18,24], per10Exp: [3,4,5,6,8,10,12,15] },
  { id: "flat-1e3", cExp: [1,2,3,4,5,6,7,8], per10Exp: [3,3,3,3,3,3,3,3] },
  { id: "ratio10-p3", cExp: [1,2,3,4,5,6,7,8], per10Exp: [2,3,4,5,6,7,8,9] },
];
for (const cfg of cfgs) {
  const r = simulate(cfg);
  console.log(cfg.id.padEnd(12), JSON.stringify(r));
}
