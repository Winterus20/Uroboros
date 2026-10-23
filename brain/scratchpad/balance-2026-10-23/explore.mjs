
// Recurrence exploration: L_k (log10 peak), M_k, t_k (cycle seconds), C' = log10(prod p / 8!)
function explore(L1, Cprime, cycles) {
  let L = L1, logM = 0, rows = [];
  for (let k = 1; k <= cycles; k++) {
    // t such that 10^L = 10^logM * 10^C' * t^8  -> t = (10^(L-logM-C'))^(1/8)
    const e = L - logM - Cprime;
    const t = Math.pow(10, e / 8);
    rows.push({ k, L: +L.toFixed(1), logM: +logM.toFixed(1), tSec: +t.toFixed(0) });
    if (t > 1e9) break;
    // boost at this peak
    logM += 0.2 * (L - 1);
    L = L + 0.2 * (L - 1);
  }
  return rows;
}
for (const L1 of [5, 6, 7, 9]) {
  for (const Cp of [-20, -10, 0, 10]) {
    const rows = explore(L1, Cp, 26);
    const tot = rows.reduce((a, r) => a + r.tSec, 0);
    console.log("L1=" + L1, "C'=" + Cp, "cycles=" + rows.length, "totalMin=" + (tot/60).toFixed(1),
      "t1=" + rows[0].tSec, "tlast=" + rows[rows.length-1].tSec, "Llast=" + rows[rows.length-1].L);
  }
}
