import { simulate } from "./ad-chain.mjs";
const ladder = (r) => [25, ...Array.from({length:7}, (_, i) => 25 * Math.pow(r, i + 1))];
const rep = (v) => new Array(8).fill(v);
for (const r of [120, 160]) {
  const res = simulate({ costs: ladder(r), growth: rep(1.4), sampleMinutes: [1,3,5,10,20,40,60,90,110] });
  console.log("r=" + r, "gate", res.gateMin, "boosts", res.boosts, "buys", res.buys);
  console.log("  unlocks", JSON.stringify(res.unlockMin));
  console.log("  [dk, log10N, alim, boost, parmak] ", JSON.stringify(res.timeline));
}
// yumusak buyume: ust halkalar daha dik (AD usulu)
const growths = [1.30, 1.40, 1.55, 1.75, 2.0, 2.3, 2.7, 3.2];
for (const r of [40, 60]) {
  const res = simulate({ costs: ladder(r), growth: growths, sampleMinutes: [1,3,5,10,20,40,60,90,110] });
  console.log("dik r=" + r, "gate", res.gateMin, "boosts", res.boosts, "buys", res.buys, "u8", res.unlockMin[7]);
  console.log("  [dk, log10N, alim, boost, parmak] ", JSON.stringify(res.timeline));
}
