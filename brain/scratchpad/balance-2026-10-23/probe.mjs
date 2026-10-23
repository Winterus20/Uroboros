import { simulate, SET_A } from "./sim.mjs";
const a = simulate(SET_A);
const rows = a.boosts.map((b, i) => [i + 1, (b.t / 60).toFixed(1), (b.len / 60).toFixed(2), b.peak.log10().toFixed(1), b.gain.toPrecision(3), b.buys]);
for (const r of rows) console.log(r.join(" | "));
console.log("gate", (a.gateSec / 60).toFixed(2));
