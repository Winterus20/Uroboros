/**
 * PERFORMANS BENCH: geç oyun tick maliyeti — iki gerçekçi senaryo.
 *
 *   node ... perf-tick.mjs wall   → Planck Duvarı'na pinli, doymuş koşu.
 *        (break_singularity yok: kütle D_INFINITY'de kilitli; alımlar maliyet
 *         aşımından başarısız — "duvarda bekleme" tick profili.)
 *   node ... perf-tick.mjs churn  → Derin endgame churn.
 *        (break_singularity var: shift/galaksi botları koşuyu periyodik
 *         sıfırlar; her sıfır sonrası yeniden alım taraması — oyuncunun
 *         gerçekte "yavaş" hissettiği ağır iş yükü.)
 *
 * Ortak kurulum: tüm özellikler açık, tüm autobuyer'lar 0.1s + "max" modda
 * (tekillik botu hariç), kütle D_INFINITY tohumu, 60 shift / 20 galaksi,
 * diğer tüm tekillik yükseltmeleri 10.
 *
 * Determinizm: Math.random sabit ve Date.now sanal — A/B derlemeleri birebir
 * aynı durum zincirini işler; tek fark kod hızıdır.
 *
 * Çıktı: tek satır JSON ([perf-result] {...}) — shell tarafı 3 koşu ortalar.
 */
import { createPinia, setActivePinia } from "pinia";
import { useGameStore } from "../../../src/stores/game";
import { FEATURE_UNLOCKS } from "../../../src/game/unlocks";
import { D_INFINITY, Decimal } from "../../../src/core/math";

const scenario = process.argv[2] === "wall" ? "wall" : "churn";

let virtualNowMs = 1_700_000_000_000;
Date.now = () => virtualNowMs;
Math.random = () => 0.5;

setActivePinia(createPinia());
const store = useGameStore();

store.unlockedFeatures = FEATURE_UNLOCKS.map((f) => f.id);
for (const key of Object.keys(store.autobuyers)) {
  const bot = store.autobuyers[key];
  bot.unlocked = true;
  bot.enabled = key !== "singularity";
  bot.mode = "max";
  bot.interval = 0.1;
}
store.autobuyerMaxUnlocked = true;
store.autobuyerBulkUnlocked = true;
store.matter = new Decimal(D_INFINITY);
store.stats.highestMatter = new Decimal(D_INFINITY);
store.dimensionShifts = 60;
store.dimensionCapFloor = 8;
store.tickspeedBought = 100;
store.galaxies = 20;
store.singularityPoints = new Decimal(500);
store.singularityUpgrades = Object.fromEntries(
  Object.keys(store.singularityUpgrades).map((k) => [
    k,
    k === "break_singularity" && scenario === "wall" ? 0 : 10,
  ])
);
for (let t = 0; t < 8; t++) {
  store.dimensions[t].bought = 300 + t * 10;
  store.dimensions[t].amount = new Decimal("1e290").times(10 - t);
}

// ---- İş yükü sayaçları (iki derlemede de aynı sarmalayıcı maliyeti) ----
let dimBuyCalls = 0;
let dimBuySuccess = 0;
let tsBuyCalls = 0;
let tsBuySuccess = 0;
let shiftCalls = 0;
let galaxyCalls = 0;
const origBuyMaxDimension = store.buyMaxDimension;
store.buyMaxDimension = (tier: number, playSound?: boolean, feedbackSurge?: boolean) => {
  dimBuyCalls++;
  const r = origBuyMaxDimension.call(store, tier, playSound, feedbackSurge);
  if (r) dimBuySuccess++;
  return r;
};
const origBuyMaxTickspeed = store.buyMaxTickspeed;
store.buyMaxTickspeed = (playSound?: boolean, feedbackSurge?: boolean) => {
  tsBuyCalls++;
  const r = origBuyMaxTickspeed.call(store, playSound, feedbackSurge);
  if (r) tsBuySuccess++;
  return r;
};
const origShift = store.dimensionShift;
store.dimensionShift = (playSound?: boolean) => {
  shiftCalls++;
  return origShift.call(store, playSound);
};
const origGalaxy = store.buyGalaxy;
store.buyGalaxy = (playSound?: boolean) => {
  galaxyCalls++;
  return origGalaxy.call(store, playSound);
};

function fingerprint() {
  const boughtSum = store.dimensions.reduce((a, d) => a + d.bought, 0);
  return {
    shifts: store.dimensionShifts,
    galaxies: store.galaxies,
    boughtSum,
    tickspeed: store.tickspeedBought,
    logMatter: Number(store.matter.log10().toNumber().toFixed(1)),
  };
}

// ---- Warmup: churn dengesine otur ----
const WARMUP = 500;
for (let i = 0; i < WARMUP; i++) {
  virtualNowMs += 100;
  store.update(0.1);
}
dimBuyCalls = dimBuySuccess = tsBuyCalls = tsBuySuccess = 0;
shiftCalls = galaxyCalls = 0;
const before = fingerprint();

// ---- Ölçüm ----
const N = 1000;
const times: number[] = [];
for (let i = 0; i < N; i++) {
  virtualNowMs += 100;
  const t0 = performance.now();
  store.update(0.1);
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
const mean = times.reduce((a, b) => a + b, 0) / times.length;
const after = fingerprint();

const result = {
  scenario,
  meanMs: Number(mean.toFixed(3)),
  p50: Number(times[Math.floor(N * 0.5)].toFixed(3)),
  p95: Number(times[Math.floor(N * 0.95)].toFixed(3)),
  p99: Number(times[Math.floor(N * 0.99)].toFixed(3)),
  max: Number(times[N - 1].toFixed(3)),
  warmupState: before,
  endState: after,
  workload: {
    dimCalls: dimBuyCalls,
    dimSuccess: dimBuySuccess,
    tsCalls: tsBuyCalls,
    tsSuccess: tsBuySuccess,
    shiftCalls,
    galaxyCalls,
  },
};
console.log(`[perf-case] ${JSON.stringify(result)}`);
