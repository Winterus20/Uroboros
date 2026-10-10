/**
 * FULL-BUFF ACTIVE 1H (measurement only)
 * Gercek Pinia store + active profil + full noral agac + tum basarimlar.
 * Secim dugumlerinde aktif taraf secilir: dream_lucid + frenzy_thumb.
 */
import { createPinia, setActivePinia } from "pinia";
import { useGameStore, AUTOBUYER_COSTS, LAB_SEEDS } from "../../../src/stores/game";
import { Decimal } from "../../../src/core/math";
import { NEURAL_TREE } from "../../../src/game/neural-data";
import { ACHIEVEMENTS } from "../../../src/game/achievements";
import { CHALLENGES } from "../../../src/game/challenges";

let virtualNowMs = 1_700_000_000_000;
(Date as unknown as { now: () => number }).now = () => virtualNowMs;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = Number(process.argv[2] ?? 1);
const dt = Number(process.argv[3] ?? 0.5);
const capHours = Number(process.argv[4] ?? 1);
const noStop = process.argv[5] === "nostop" || process.argv[5] === "hold"; // prestijde durma, tepe kütleyi ölç
const holdResets = process.argv[5] === "hold"; // tekillikten sonra shift/galaxy basma, biriktir
(Math as unknown as { random: () => number }).random = mulberry32(seed);

setActivePinia(createPinia());
const store = useGameStore();

// ---- FULL BUFF GRANT ----
const SKIP = new Set(["dream_ascetic", "iron_patience"]); // aktif tarafin karsiti
const bought: Record<string, number> = {};
for (const n of NEURAL_TREE) {
  if (SKIP.has(n.id)) continue;
  bought[n.id] = n.maxLevel ?? 1;
}
store.neuralNodesBought = bought;
// legacy dukkan kaydini senkronla (etkiler buradan da okunuyor)
store.singularityUpgrades = {
  eye_drops: 10,
  muted_alerts: 5,
  fast_charger: 5,
  caffeine_drip: 5,
  neural_chip: 5,
  neural_nest: 5,
  guilt_immunity: 3,
  break_singularity: 1,
};
store.singularities = 6;
store.singularityPoints = store.singularityPoints.plus(0); // harcama yok, agac zaten verili
store.achievements = ACHIEVEMENTS.map((a) => a.id);
store.achievementsSeenCount = store.achievements.length;
// 8/8 challenge: dim x1.5, cift x2, tiklama x2, frekans +15%, maliyet -10%/-15%, guc 2.2, SP +15%, 8/8 +25%
store.completedChallenges = CHALLENGES.map((c) => c.id);
// veteran relikleri: seviye 5 (kitle x2, SP x2.5, frekans tabani, hucre basina boyut ivmesi)
store.reactorCollapseCount = 5;
// veteran kolonisi: cekirdek acik, 1e6 botla baslar (sifirdan degil)
store.neuralBots = new Decimal(1e6);
// veteran hesabi: dekad yukselisleri hayatta bir kez tuketilmis say
store.claimedBounties = [6, 12, 20, 30, 45, 60, 80, 105, 135, 170, 210, 255, 300];
store.decadeSurgeMult = 1;
store.matter = store.startingMatter;
// -------------------------

const capSeconds = capHours * 3600;
let simTime = 0;
let nextClickAt = 0;
let nextPurchaseAt = 0;
const clickInterval = 1 / 5;
let tick = 0;

function doPurchases(): void {
  store.maxAll();
  const ids = Object.keys(AUTOBUYER_COSTS)
    .filter((id) => {
      const bot = (store.autobuyers as Record<string, { unlocked: boolean }>)[id];
      if (!bot || bot.unlocked) return false;
      if (!store.isAutobuyerRequirementMet(id)) return false;
      return store.matter.gte(AUTOBUYER_COSTS[id]);
    })
    .sort((a, b) => AUTOBUYER_COSTS[a].log10().toNumber() - AUTOBUYER_COSTS[b].log10().toNumber());
  for (const id of ids) store.unlockAutobuyer(id);
  if (!store.autobuyerBulkUnlocked && store.canUnlockBulk) store.unlockBulkMode();
  if (!store.autobuyerMaxUnlocked && store.canUnlockMax) store.unlockMaxMode();
  const mode = store.autobuyerMaxUnlocked ? "max" : store.autobuyerBulkUnlocked ? "bulk" : null;
  if (mode) {
    for (const id of Object.keys(store.autobuyers)) {
      const bot = (store.autobuyers as Record<string, { unlocked: boolean; mode: string }>)[id];
      if (!bot.unlocked || id === "singularity") continue;
      if (bot.mode !== mode) store.setAutobuyerMode(id, mode);
    }
  }
}

function doLab(): void {
  if (!store.isFeatureUnlocked("lab")) return;
  for (const cell of store.labCells) {
    if (cell.seedType && cell.isMature) store.harvestCell(cell.id);
  }
  if (store.labHype >= 100) store.triggerViralDrop();
  const empty = store.labCells.filter((c) => !c.seedType);
  if (empty.length === 0) return;
  const seeds = [...LAB_SEEDS].sort((a, b) => b.cost.toNumber() - a.cost.toNumber());
  for (const s of seeds) {
    if ((s as { isMutationOnly?: boolean }).isMutationOnly) continue;
    if (store.matter.gte(s.cost)) {
      for (const cell of empty) store.plantSeed(cell.id, s.type);
      return;
    }
  }
}

function doSpells(): void {
  if (!store.isFeatureUnlocked("crisis")) return;
  const espressoUnlocked = store.isFeatureUnlocked("spell_espresso");
  const espressoActive = store.activeBuffs.some((b) => b.type === "espresso");
  if (espressoUnlocked && store.caffeineEnergy >= 45) {
    store.castSpell("espresso_shot");
  } else if (
    store.slackers.length > 0 &&
    store.isFeatureUnlocked("spell_noise") &&
    store.caffeineEnergy >= 35
  ) {
    store.castSpell("noise_cancelling");
  } else if (store.isFeatureUnlocked("spell_sleep") && store.caffeineEnergy >= 60) {
    store.castSpell("sleep_denial");
  } else if (store.caffeineEnergy >= 30 && (!espressoUnlocked || espressoActive) && store.floatingAnomalies.length < 2) {
    store.castSpell("fast_charge");
  }
}

const logMarks: Record<string, number> = {};
let reachedAt: number | null = null;
let peakLog = 0;
let peakGain = "0";
let lastNapAt = -1e9;
const TOL = 1e-6;

while (simTime < capSeconds) {
  virtualNowMs += dt * 1000;
  tick++;
  while (simTime + TOL >= nextClickAt) {
    store.manualClick();
    nextClickAt += clickInterval;
  }
  if (simTime + TOL >= nextPurchaseAt) {
    doPurchases();
    nextPurchaseAt = simTime + 2;
  }
  const ids = store.floatingAnomalies.map((a) => a.id);
  for (const id of ids) store.clickAnomaly(id);
  const holding = holdResets && reachedAt !== null;
  if (!holding && store.canShift) store.dimensionShift(false);
  if (!holding && store.canBuyGalaxy) store.buyGalaxy(false);
  if (store.canSacrifice) {
    const reward = store.currentSacrificeReward;
    if (reward.gte(store.sacrificeMultiplier.times(1.5))) store.sacrificeDimensions(false);
  }
  // veteran toplu uyku: 10 dk arayla, kazanc >= 2x ise koloniyi feda et
  if (store.canPowerNap && simTime - lastNapAt > 600 && store.powerNapGain.gte(2)) {
    store.powerNap();
    lastNapAt = simTime;
  }
  if (store.canRefresh) store.pullToRefresh();
  doSpells();
  doLab();
  if (store.canSingularity && reachedAt === null) {
    reachedAt = simTime;
    if (!noStop) break;
  }
  store.update(dt);
  simTime += dt;
  if (store.canSingularity && reachedAt === null) {
    reachedAt = simTime;
    if (!noStop) break;
  }
  const lmNow = store.matter.log10().toNumber();
  if (Number.isFinite(lmNow) && lmNow > peakLog) {
    peakLog = lmNow;
    peakGain = store.singularityGain.toString();
  }
  for (const m of [900, 1800, 3600]) {
    const k = m === 900 ? "15m" : m === 1800 ? "30m" : "60m";
    if (logMarks[k] === undefined && simTime + TOL >= m) {
      logMarks[k] = store.matter.log10().toNumber();
    }
  }
  if ((tick & 1023) === 0) await Promise.resolve();
  if (store.matter.isNan() || !Number.isFinite(store.matter.mag)) {
    console.log(JSON.stringify({ error: "NaN at " + simTime }));
    process.exit(2);
  }
}

const finalLog = store.matter.log10().toNumber();
console.log(
  JSON.stringify({
    seed,
    dt,
    capHours,
    reached: reachedAt !== null,
    reachedAt,
    logMarks,
    finalLog,
    finalMatter: store.matter.toString(),
    shifts: store.dimensionShifts,
    galaxies: store.galaxies,
    tickspeed: store.tickspeedBought,
    bought: store.dimensions.map((d) => d.bought),
    spGain: store.singularityGain.toString(),
    naps: store.napCount,
    napMult: store.napMultiplier.toString(),
    bots: store.neuralBots.toString(),
    peakLog,
    peakGain,
  })
);
