/**
 * FIRST-PRESTIGE BASELINE HARNESS (measurement only — no game code is modified)
 * ============================================================================
 * Runs the REAL Pinia store (src/stores/game.ts) headlessly in Node and measures
 * how long a first-time player needs to reach the first prestige
 * ("Sabah 06:00 Çöküşü" / Singularity = matter >= 1.7976931348623157e308).
 *
 * The sim STOPS the clock the moment `store.canSingularity` first turns true.
 * It never calls singularityReset(), so the measurement is the raw first run.
 *
 * HOW TO BUILD (from the repo root, Windows PowerShell):
 *   node brain/scratchpad/harness/build.mjs
 *
 * HOW TO RUN:
 *   node brain/scratchpad/harness/out/run.mjs --all --out brain/scratchpad/harness/results.json
 *       -> runs profiles active/casual/idle x seeds 1,2,3 and writes results.json
 *   node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.05 --out brain/scratchpad/harness/results-dt005.json
 *       -> a single run, prints a per-run summary (always pass --out to avoid clobbering)
 *
 * OPTIONS:
 *   --profile active|casual|idle|idle_plus   (default mode is --all when omitted)
 *   --seed N[,N...]          Math.random seed(s) for the LCG (default 1,2,3)
 *   --dt SECONDS             tick length, default 0.1 (use 0.05 for stricter parity)
 *   --lite                   skip per-minute samples + compact JSON (faster runs, smaller output)
 *   --jobs N                 parallel workers when running multiple profiles/seeds (default 1)
 *   --fast                   --lite plus --jobs <cpu count>
 *   --capHours H             simulated-time cap, default 12
 *   --out PATH               results JSON path (default: harness/results.json)
 *   --all                    run active, casual, idle (+ idle_plus with --withIdlePlus)
 *   --trace                  per-tick debug trace once log10(matter) > 200 (endgame forensics)
 *
 * DETERMINISM:
 *   - Math.random is replaced per run by a seeded mulberry32 LCG.
 *   - Date.now() is replaced by a virtual clock advanced by dt each tick
 *     (the store uses Date.now for the click-combo decay and anomaly ids).
 *   - The store itself is instantiated fresh per run (new Pinia instance).
 *
 * PLAYER PROFILES (pre-prestige behaviour model):
 *   active   : 5 clicks/s, maxAll + autobuyer unlocks every 2s,
 *              bulk/max autobuyer modes, shifts/galaxies/sacrifice taken instantly,
 *              all anomalies clicked instantly, crisis spells cast (espresso priority),
 *              lab harvested/planted + viral drop, pull-to-refresh pressed, stance "trend".
 *   casual   : 2 clicks/s, maxAll + upgrades + autobuyer unlocks every 10s,
 *              anomalies caught with 80% rate and up to 3s delay,
 *              shifts/galaxies/sacrifice taken, NO spells / lab / refresh / mode micro.
 *   idle     : 0 clicks, maxAll every 5s, autobuyers unlocked when affordable,
 *              NO anomalies, spells, lab, refresh, upgrades, shifts or galaxies.
 *   idle_plus (diagnostic): idle + manual shifts/galaxies.
 *              Isolates how much of idle's progress is capped by missing shifts.
 */
import { createPinia, setActivePinia } from "pinia";
import {
  useGameStore,
  AUTOBUYER_COSTS,
  LAB_SEEDS,
} from "../../../src/stores/game";
import { FEATURE_UNLOCKS } from "../../../src/game/unlocks";
import type { Decimal } from "../../../src/core/math";
import type { LabSeedType } from "../../../src/models/types";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, workerData } from "node:worker_threads";

// ---------------------------------------------------------------------------
// Determinism: virtual clock + seeded RNG
// ---------------------------------------------------------------------------
let virtualNowMs = 1_700_000_000_000;
Date.now = () => virtualNowMs;

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

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
type ProfileName = "active" | "casual" | "idle" | "idle_plus";

interface ProfileCfg {
  name: ProfileName;
  clicksPerSec: number;
  purchaseInterval: number;
  unlockBots: boolean;
  setBotModes: boolean; // bulk/max autobuyer modes
  manualShifts: boolean;
  manualGalaxies: boolean;
  sacrifice: boolean;
  catchAnomalies: boolean;
  anomalyCatchRate: number; // 0..1
  anomalyMaxDelay: number; // seconds
  useSpells: boolean;
  useLab: boolean;
  useRefresh: boolean;
}

const PROFILES: Record<ProfileName, ProfileCfg> = {
  active: {
    name: "active",
    clicksPerSec: 5,
    purchaseInterval: 2,
    unlockBots: true,
    setBotModes: true,
    manualShifts: true,
    manualGalaxies: true,
    sacrifice: true,
    catchAnomalies: true,
    anomalyCatchRate: 1.0,
    anomalyMaxDelay: 0,
    useSpells: true,
    useLab: true,
    useRefresh: true,
  },
  casual: {
    name: "casual",
    clicksPerSec: 2,
    purchaseInterval: 10,
    unlockBots: true,
    setBotModes: false,
    manualShifts: true,
    manualGalaxies: true,
    sacrifice: true,
    catchAnomalies: true,
    anomalyCatchRate: 0.8,
    anomalyMaxDelay: 3,
    useSpells: false,
    useLab: false,
    useRefresh: false,
  },
  idle: {
    name: "idle",
    clicksPerSec: 0,
    purchaseInterval: 5,
    unlockBots: true,
    setBotModes: false,
    manualShifts: false,
    manualGalaxies: false,
    sacrifice: false,
    catchAnomalies: false,
    anomalyCatchRate: 0,
    anomalyMaxDelay: 0,
    useSpells: false,
    useLab: false,
    useRefresh: false,
  },
  idle_plus: {
    name: "idle_plus",
    clicksPerSec: 0,
    purchaseInterval: 5,
    unlockBots: true,
    setBotModes: false,
    manualShifts: true,
    manualGalaxies: true,
    sacrifice: true,
    catchAnomalies: false,
    anomalyCatchRate: 0,
    anomalyMaxDelay: 0,
    useSpells: false,
    useLab: false,
    useRefresh: false,
  },
};

export { PROFILES };

// ---------------------------------------------------------------------------
// Telemetry types
// ---------------------------------------------------------------------------
interface Sample {
  t: number; // simulated seconds
  logMatter: number;
  logDps: number;
  logTickspeedMult: number;
  shifts: number;
  galaxies: number;
  tickspeedBought: number;
  bought: number[]; // per-tier bought counts
  feats: string[]; // unlocked feature ids (copy)
  bots: number; // unlocked autobuyer count
  flatSec: number; // consecutive "no log10 growth" seconds (stall meter)
}

interface TraceEntry {
  t: number;
  logM: number;
  logD: number;
  logD1: number;
  ts: number;
  shifts: number;
  gal: number;
}

/** Bir boyut acilisinin tespit ani ve o anki tetikleyici kutle. */
interface DimUnlock {
  t: number; // tespit edildigi simulasyon saniyesi
  log10: number; // sicramayi tetikleyen log10(kutle) - sifirlama ONCESI deger
}

interface RunResult {
  profile: ProfileName;
  seed: number;
  dt: number;
  capHours: number;
  reached: boolean;
  timeSeconds: number | null;
  timeHms: string;
  wallMs: number;
  milestones: Record<string, number | null>;
  // d4..d8 acilis telemetrisi; `milestones` semasi (duz saniye) DEGISMEZ.
  dimUnlocks: Record<string, DimUnlock | null>;
  logMarks: Record<string, number | null>; // "15m".."240m" -> log10(matter)
  samples: Sample[];
  stalls: Array<{ start: number; end: number | null }>;
  spells: Record<string, number>;
  anomalyClicks: number;
  trace: TraceEntry[] | null;
  // Kosunun ZIRVESI (reset sonrasi anlik goruntu degil). Olcum kapisi bunu kullanir.
  peaks: {
    logMatter: number;
    shifts: number;
    galaxies: number;
    tickspeedBought: number;
  };
  final: Record<string, unknown>;
  error: string | null;
}

function hms(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(sec)}`;
}

const LOG_MARKS_SEC: Array<{ key: string; t: number }> = [
  { key: "15m", t: 15 * 60 },
  { key: "30m", t: 30 * 60 },
  { key: "60m", t: 60 * 60 },
  { key: "120m", t: 120 * 60 },
  { key: "180m", t: 180 * 60 },
  { key: "240m", t: 240 * 60 },
];

const TIME_TOL = 1e-6; // float-accumulation tolerance for scheduled sim times

// Seed availability mirrors the feature-unlock ladder (src/game/unlocks.ts).
const SEED_FEATURE: Record<string, string> = {
  cheese_sizzle: "seed_cheese",
  subway_beat: "seed_subway",
  sigma_phonk: "seed_phonk",
};

interface SeedDefLite {
  type: LabSeedType;
  cost: Decimal;
  isMutationOnly?: boolean;
}

function plantableSeeds(unlocked: (id: string) => boolean): SeedDefLite[] {
  const all = LAB_SEEDS as unknown as SeedDefLite[];
  return all
    .filter((s) => {
      if (s.isMutationOnly) return false; // mutation results are grown, not planted
      const feat = SEED_FEATURE[s.type as unknown as string];
      if (feat && !unlocked(feat)) return false;
      return true;
    })
    .sort((a, b) => b.cost.toNumber() - a.cost.toNumber());
}

// ---------------------------------------------------------------------------
// One simulated run
// ---------------------------------------------------------------------------
export async function runOnce(
  cfg: ProfileCfg,
  seed: number,
  dt: number,
  capHours: number,
  traceEnabled: boolean,
  collectSamples: boolean
): Promise<RunResult> {
  // fresh deterministic world
  Math.random = mulberry32(seed);
  virtualNowMs = 1_700_000_000_000;
  setActivePinia(createPinia());
  const store = useGameStore();

  const capSeconds = capHours * 3600;
  const result: RunResult = {
    profile: cfg.name,
    seed,
    dt,
    capHours,
    reached: false,
    timeSeconds: null,
    timeHms: "",
    wallMs: 0,
    milestones: {
      first_shift: null,
      d4: null,
      d5: null,
      d6: null,
      d7: null,
      d8: null,
      shift_4: null,
      first_galaxy: null,
      bulk_mode: null,
      max_mode: null,
    },
    dimUnlocks: { d4: null, d5: null, d6: null, d7: null, d8: null },
    logMarks: {},
    samples: [],
    stalls: [],
    spells: { espresso_shot: 0, fast_charge: 0, sleep_denial: 0, noise_cancelling: 0 },
    anomalyClicks: 0,
    trace: traceEnabled ? [] : null,
    peaks: { logMatter: 0, shifts: 0, galaxies: 0, tickspeedBought: 0 },
    final: {},
    error: null,
  };
  for (const f of FEATURE_UNLOCKS) result.milestones[`feat:${f.id}`] = null;
  for (const id of Object.keys(AUTOBUYER_COSTS)) result.milestones[`bot:${id}`] = null;

  const wallStart = process.hrtime.bigint();

  // scheduling state
  let simTime = 0;
  let nextClickAt = 0;
  let nextPurchaseAt = 0;
  let nextSampleAt = 60;
  let nextMarkIdx = 0;
  let lastLogMatter = 0;
  // Boyut acilis ani icin: sicrama/kume/sacrifice butonlarindan HEMEN onceki kutle.
  // (Boyut acilisi bir sicrama olayidir; sicrama kutleyi sifirlar, bu yuzden
  //  tespit anindaki kutle degil, tetikleyici kutle kaydedilir.)
  let logMatterBeforeActions = 0;
  let flatSec = 0;
  let stallStart: number | null = null;
  const anomalyState = new Map<string, number>(); // id -> fireAt (>=0 catch, -1 skip)
  let prevFeatLen = store.unlockedFeatures.length;
  let prevBots = 0;
  const clickInterval = cfg.clicksPerSec > 0 ? 1 / cfg.clicksPerSec : Infinity;
  let tick = 0;
  // Zirve takibi: her tick'te yalnizca Decimal karsilastirmasi yapilir; log10()
  // sadece final snapshot'ta bir kez cagrilir (perf kurali).
  // Decimal'ler degismezdir (bkz. src/core/math.ts), bu yuzden referans tutmak guvenli.
  // Baslangic degeri store.matter: dongu hic donmese de zirve anlamli kalir.
  let peakMatter = store.matter;

  const markMilestone = (key: string, t: number): void => {
    if (result.milestones[key] === null || result.milestones[key] === undefined) {
      result.milestones[key] = t;
    }
  };

  // d4..d8 acilisi: milestone zamani (duz saniye) + ayri dimUnlocks kaydi
  // (tespit ani ve o anki tetikleyici log10(kutle)).
  const captureDimUnlock = (key: string, t: number): void => {
    if (result.dimUnlocks[key] !== null) return;
    result.dimUnlocks[key] = { t, log10: logMatterBeforeActions };
  };

  const closeStall = (t: number): void => {
    if (stallStart !== null) {
      const open = result.stalls[result.stalls.length - 1];
      if (open && open.end === null) open.end = t;
      stallStart = null;
    }
  };

  const doPurchases = (): void => {
    store.maxAll();
    if (cfg.unlockBots) {
      // cheapest-first so a big bot purchase never starves the cheaper ones
      const ids = Object.keys(AUTOBUYER_COSTS)
        .filter((id) => {
          const bot = store.autobuyers[id];
          if (!bot || bot.unlocked) return false;
          if (!store.isAutobuyerRequirementMet(id)) return false;
          return store.matter.gte(AUTOBUYER_COSTS[id]);
        })
        .sort(
          (a, b) =>
            AUTOBUYER_COSTS[a].log10().toNumber() - AUTOBUYER_COSTS[b].log10().toNumber()
        );
      for (const id of ids) {
        if (store.unlockAutobuyer(id)) markMilestone(`bot:${id}`, simTime);
      }
      if (cfg.setBotModes) {
        if (!store.autobuyerBulkUnlocked && store.canUnlockBulk && store.unlockBulkMode()) {
          markMilestone("bulk_mode", simTime);
        }
        if (!store.autobuyerMaxUnlocked && store.canUnlockMax && store.unlockMaxMode()) {
          markMilestone("max_mode", simTime);
        }
        const mode = store.autobuyerMaxUnlocked ? "max" : store.autobuyerBulkUnlocked ? "bulk" : null;
        if (mode) {
          for (const id of Object.keys(store.autobuyers)) {
            const bot = store.autobuyers[id];
            if (!bot.unlocked || id === "singularity") continue; // never touch the dawn bot on run 1
            if (bot.mode !== mode) store.setAutobuyerMode(id, mode);
          }
        }
      }
    }
  };

  const doLab = (): void => {
    if (!cfg.useLab || !store.isFeatureUnlocked("lab")) return;
    for (const cell of store.labCells) {
      if (cell.seedType && cell.isMature) store.harvestCell(cell.id);
    }
    if (store.labHype >= 100) store.triggerViralDrop();
    // fill empty cells with the strongest plantable & affordable seed
    const seeds = plantableSeeds((id) => store.isFeatureUnlocked(id));
    const empty = store.labCells.filter((c) => !c.seedType);
    if (empty.length === 0) return;
    for (const seedDef of seeds) {
      if (store.matter.gte(seedDef.cost)) {
        for (const cell of empty) {
          store.plantSeed(cell.id, seedDef.type);
        }
        return;
      }
    }
  };

  const doSpells = (): void => {
    if (!cfg.useSpells || !store.isFeatureUnlocked("crisis")) return;
    // priority: espresso first (never let fast_charge starve it below its 45 cost),
    // then utility spells, then fast_charge from surplus (buff active or spell not yet unlocked)
    const espressoUnlocked = store.isFeatureUnlocked("spell_espresso");
    const espressoActive = store.activeBuffs.some((b) => b.type === "espresso");
    if (espressoUnlocked && store.caffeineEnergy >= 45) {
      if (store.castSpell("espresso_shot")) result.spells.espresso_shot++;
    } else if (
      store.slackers.length > 0 &&
      store.isFeatureUnlocked("spell_noise") &&
      store.caffeineEnergy >= 35
    ) {
      if (store.castSpell("noise_cancelling")) result.spells.noise_cancelling++;
    } else if (store.isFeatureUnlocked("spell_sleep") && store.caffeineEnergy >= 60) {
      if (store.castSpell("sleep_denial")) result.spells.sleep_denial++;
    } else if (
      store.caffeineEnergy >= 30 &&
      (!espressoUnlocked || espressoActive) &&
      store.floatingAnomalies.length < 2
    ) {
      if (store.castSpell("fast_charge")) result.spells.fast_charge++;
    }
  };

  const takeSample = (): Sample => {
    const logMatter = store.matter.lte(0) ? 0 : store.matter.log10().toNumber();
    const dps = store.matterPerSecond;
    const logDps = dps.lte(0) ? 0 : dps.log10().toNumber();
    const logTs = store.tickspeedMultiplier.log10().toNumber();
    return {
      t: simTime,
      logMatter,
      logDps,
      logTickspeedMult: logTs,
      shifts: store.dimensionShifts,
      galaxies: store.galaxies,
      tickspeedBought: store.tickspeedBought,
      bought: store.dimensions.map((d) => d.bought),
      feats: [...store.unlockedFeatures],
      bots: Object.values(store.autobuyers).filter((b) => b.unlocked).length,
      flatSec,
    };
  };

  // --------------------------- main loop ---------------------------------
  let finished = false;
  while (simTime < capSeconds && !finished) {
    virtualNowMs += dt * 1000;
    tick++;

    // 1. manual clicks (scheduled)
    if (cfg.clicksPerSec > 0) {
      while (simTime + TIME_TOL >= nextClickAt) {
        store.manualClick();
        nextClickAt += clickInterval;
      }
    }

    // 2. periodic purchases (maxAll / upgrades / bots)
    if (simTime + TIME_TOL >= nextPurchaseAt) {
      doPurchases();
      nextPurchaseAt = simTime + cfg.purchaseInterval;
    }

    // 3. anomalies
    if (cfg.catchAnomalies && cfg.anomalyCatchRate >= 1) {
      const ids = store.floatingAnomalies.map((a) => a.id);
      for (const id of ids) store.clickAnomaly(id);
      if (ids.length > 0) result.anomalyClicks += ids.length;
    } else if (cfg.catchAnomalies) {
      const present = new Set(store.floatingAnomalies.map((a) => a.id));
      for (const a of store.floatingAnomalies) {
        if (!anomalyState.has(a.id)) {
          const roll = Math.random();
          anomalyState.set(
            a.id,
            roll < cfg.anomalyCatchRate ? simTime + Math.random() * cfg.anomalyMaxDelay : -1
          );
        }
      }
      for (const [id, fireAt] of [...anomalyState]) {
        if (!present.has(id)) {
          anomalyState.delete(id);
          continue;
        }
        if (fireAt >= 0 && simTime >= fireAt) {
          store.clickAnomaly(id);
          anomalyState.delete(id);
          result.anomalyClicks++;
        }
      }
    }

    // Acilis telemetrisi: reset butonlarindan once tetikleyici kutleyi sabitle.
    logMatterBeforeActions = store.matter.lte(0) ? 0 : store.matter.log10().toNumber();

    // 4. resets / buttons the player takes instantly when they light up
    if (cfg.manualShifts && store.canShift) store.dimensionShift(false);
    if (cfg.manualGalaxies && store.canBuyGalaxy) store.buyGalaxy(false);
    if (cfg.sacrifice && store.canSacrifice) {
      const reward = store.currentSacrificeReward;
      if (reward.gte(store.sacrificeMultiplier.times(1.5))) store.sacrificeDimensions(false);
    }
    if (cfg.useRefresh && store.canRefresh) store.pullToRefresh();
    doSpells();
    doLab();

    // 5. stop the clock the moment actions cross the prestige threshold
    if (store.canSingularity) {
      result.reached = true;
      result.timeSeconds = simTime;
      finished = true;
      break;
    }

    // 6. world tick
    store.update(dt);
    simTime += dt;

    // 6b. zirve takibi (log10 YOK): matter Decimal olarak karsilastirilir,
    // sayaclar duz sayi olarak Math.max ile guncellenir.
    if (store.matter.gt(peakMatter)) peakMatter = store.matter;
    result.peaks.shifts = Math.max(result.peaks.shifts, store.dimensionShifts);
    result.peaks.galaxies = Math.max(result.peaks.galaxies, store.galaxies);
    result.peaks.tickspeedBought = Math.max(result.peaks.tickspeedBought, store.tickspeedBought);

    if (store.canSingularity) {
      result.reached = true;
      result.timeSeconds = simTime;
      finished = true;
      break;
    }

    // 7. milestone tracking (cheap, runs every tick)
    if (result.milestones.first_shift === null && store.dimensionShifts >= 1) {
      markMilestone("first_shift", simTime);
    }
    if (result.milestones.d4 === null && store.unlockedDimensionsCount >= 4) {
      markMilestone("d4", simTime);
      captureDimUnlock("d4", simTime);
    }
    if (result.milestones.d5 === null && store.unlockedDimensionsCount >= 5) {
      markMilestone("d5", simTime);
      captureDimUnlock("d5", simTime);
    }
    if (result.milestones.d6 === null && store.unlockedDimensionsCount >= 6) {
      markMilestone("d6", simTime);
      captureDimUnlock("d6", simTime);
    }
    if (result.milestones.d7 === null && store.unlockedDimensionsCount >= 7) {
      markMilestone("d7", simTime);
      captureDimUnlock("d7", simTime);
    }
    if (result.milestones.d8 === null && store.unlockedDimensionsCount >= 8) {
      markMilestone("d8", simTime);
      captureDimUnlock("d8", simTime);
    }
    if (result.milestones.shift_4 === null && store.dimensionShifts >= 4) {
      markMilestone("shift_4", simTime);
    }
    if (result.milestones.first_galaxy === null && store.galaxies >= 1) {
      markMilestone("first_galaxy", simTime);
    }
    if (store.unlockedFeatures.length !== prevFeatLen) {
      for (const f of FEATURE_UNLOCKS) {
        if (store.unlockedFeatures.includes(f.id) && result.milestones[`feat:${f.id}`] === null) {
          markMilestone(`feat:${f.id}`, simTime);
        }
      }
      prevFeatLen = store.unlockedFeatures.length;
    }
    if (cfg.unlockBots) {
      let unlockedNow = 0;
      for (const id of Object.keys(store.autobuyers)) {
        if (store.autobuyers[id].unlocked) unlockedNow++;
      }
      if (unlockedNow !== prevBots) {
        for (const id of Object.keys(store.autobuyers)) {
          if (store.autobuyers[id].unlocked && result.milestones[`bot:${id}`] === null) {
            markMilestone(`bot:${id}`, simTime);
          }
        }
        prevBots = unlockedNow;
      }
    }

    // 8. NaN guard (break_eternity quirk: isNan() lowercase + finite mantissa)
    if (store.matter.isNan() || !Number.isFinite(store.matter.mag)) {
      result.error = `matter became NaN at t=${simTime.toFixed(1)}s`;
      finished = true;
      break;
    }

    // 8.5 debug trace: per-tick state once the run enters the endgame (log10 > 200)
    if (result.trace !== null && result.trace.length < 5000 && store.matter.log10().toNumber() > 200) {
      const d1 = store.dimensions[0];
      result.trace.push({
        t: simTime,
        logM: store.matter.log10().toNumber(),
        logD: store.matterPerSecond.lte(0) ? 0 : store.matterPerSecond.log10().toNumber(),
        logD1: d1.amount.lte(0) ? 0 : d1.amount.log10().toNumber(),
        ts: store.tickspeedBought,
        shifts: store.dimensionShifts,
        gal: store.galaxies,
      });
    }

    // 9. 60s telemetry sample + log marks + stall detection
    if (collectSamples && simTime + TIME_TOL >= nextSampleAt) {
      const sample = takeSample();
      // growth >= 0.001 decades per minute = progress; a prestige-like reset
      // (drop > 1 decade) also counts as progress.
      if (sample.logMatter >= lastLogMatter + 0.001) {
        flatSec = 0;
        lastLogMatter = sample.logMatter;
        closeStall(simTime);
      } else if (sample.logMatter < lastLogMatter - 1) {
        flatSec = 0;
        lastLogMatter = sample.logMatter;
        closeStall(simTime);
      } else {
        flatSec += 60;
        if (flatSec >= 1260 && stallStart === null) {
          stallStart = simTime - flatSec;
          result.stalls.push({ start: stallStart, end: null });
        }
      }
      sample.flatSec = flatSec;
      result.samples.push(sample);

      while (nextMarkIdx < LOG_MARKS_SEC.length && simTime + TIME_TOL >= LOG_MARKS_SEC[nextMarkIdx].t) {
        result.logMarks[LOG_MARKS_SEC[nextMarkIdx].key] = sample.logMatter;
        nextMarkIdx++;
      }
      nextSampleAt += 60;
    }

    // let Vue's microtask queue breathe (computed getters are lazy; defensive)
    if ((tick & 1023) === 0) await Promise.resolve();
  }

  // --------------------------- final snapshot ----------------------------
  const lastSample = result.samples.length > 0 ? result.samples[result.samples.length - 1] : takeSample();
  if (!finished && !result.reached && result.error === null) {
    result.logMarks["capped"] = lastSample.logMatter;
  }
  closeStall(simTime);

  // Erken cikis yollari (reached / error) dahil: son durumu da zirveye kat.
  if (store.matter.gt(peakMatter)) peakMatter = store.matter;
  result.peaks.shifts = Math.max(result.peaks.shifts, store.dimensionShifts);
  result.peaks.galaxies = Math.max(result.peaks.galaxies, store.galaxies);
  result.peaks.tickspeedBought = Math.max(result.peaks.tickspeedBought, store.tickspeedBought);
  const peakLogMatter = peakMatter.lte(0) ? 0 : peakMatter.log10().toNumber();
  result.peaks.logMatter =
    peakMatter.isNan() || Number.isNaN(peakLogMatter) ? 0 : peakLogMatter;

  const finalLogMatter = store.matter.lte(0) ? 0 : store.matter.log10().toNumber();
  const finalLogDps = store.matterPerSecond.lte(0) ? 0 : store.matterPerSecond.log10().toNumber();
  result.logMarks["final"] = finalLogMatter;

  result.final = {
    t: simTime,
    logMatter: finalLogMatter,
    logDps: finalLogDps,
    shifts: store.dimensionShifts,
    galaxies: store.galaxies,
    tickspeedBought: store.tickspeedBought,
    logTickspeedMult: store.tickspeedMultiplier.log10().toNumber(),
    bought: store.dimensions.map((d) => d.bought),
    unlockedFeatures: [...store.unlockedFeatures],
    unlockedBots: Object.entries(store.autobuyers)
      .filter(([, b]) => b.unlocked)
      .map(([id, b]) => `${id}:${b.mode}`),
    achievementCount: store.achievements.length,
    sacrificeCount: store.sacrificeCount,
    sacrificeMult: store.sacrificeMultiplier.toString(),
    seedsPlanted: store.stats.seedsPlanted,
    labHarvests: store.stats.labHarvests,
    anomaliesClicked: store.stats.anomaliesClicked,
    spellsCast: store.stats.spellsCast,
    manualClicks: store.stats.manualClicks,
    multiplierBreakdown: store.multiplierBreakdown.map((r) => ({
      name: r.name,
      value: r.value,
      desc: r.desc,
    })),
  };

  result.timeHms = result.timeSeconds !== null ? hms(result.timeSeconds) : "";
  result.wallMs = Number(process.hrtime.bigint() - wallStart) / 1e6;
  return result;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
interface CliArgs {
  profile: ProfileName | null;
  seeds: number[];
  dt: number;
  capHours: number;
  out: string;
  all: boolean;
  withIdlePlus: boolean;
  trace: boolean;
  lite: boolean;
  jobs: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    profile: null,
    seeds: [1, 2, 3],
    dt: 0.1,
    capHours: 12,
    out: "",
    all: false,
    withIdlePlus: false,
    trace: false,
    lite: false,
    jobs: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--profile") args.profile = argv[++i] as ProfileName;
    else if (a === "--seed" || a === "--seeds") args.seeds = argv[++i].split(",").map((s) => parseInt(s, 10));
    else if (a === "--dt") args.dt = parseFloat(argv[++i]);
    else if (a === "--capHours") args.capHours = parseFloat(argv[++i]);
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--all") args.all = true;
    else if (a === "--withIdlePlus") args.withIdlePlus = true;
    else if (a === "--trace") args.trace = true;
    else if (a === "--lite") args.lite = true;
    else if (a === "--jobs") args.jobs = Math.max(1, parseInt(argv[++i], 10));
    else if (a === "--fast") {
      args.lite = true;
      args.jobs = Math.max(1, os.cpus().length);
    }
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node out/run.mjs [--all] [--profile active|casual|idle|idle_plus] " +
          "[--seeds 1,2,3] [--dt 0.1] [--capHours 12] [--out results.json] [--withIdlePlus] [--trace] " +
          "[--lite] [--jobs N] [--fast]"
      );
      process.exit(0);
    }
  }
  if (!args.all && !args.profile) args.all = true;
  return args;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const workerScript = path.join(here, "run-worker.mjs");

interface HarnessJob {
  profile: ProfileName;
  seed: number;
}

interface WorkerRunPayload {
  profile: ProfileName;
  seed: number;
  dt: number;
  capHours: number;
  trace: boolean;
  collectSamples: boolean;
}

function runInWorker(payload: WorkerRunPayload): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerScript, { workerData: payload });
    let settled = false;
    worker.on("message", (msg: RunResult) => {
      settled = true;
      resolve(msg);
    });
    worker.on("error", (err) => {
      settled = true;
      reject(err);
    });
    worker.on("exit", (code) => {
      if (!settled && code !== 0) reject(new Error(`worker exited with code ${code}`));
    });
  });
}

async function runJobBatch(
  jobs: HarnessJob[],
  dt: number,
  capHours: number,
  trace: boolean,
  collectSamples: boolean,
  parallelism: number
): Promise<RunResult[]> {
  if (parallelism <= 1 || jobs.length <= 1) {
    const out: RunResult[] = [];
    for (const job of jobs) {
      out.push(
        await runOnce(PROFILES[job.profile], job.seed, dt, capHours, trace, collectSamples)
      );
    }
    return out;
  }

  const results: RunResult[] = new Array(jobs.length);
  let nextIdx = 0;
  const spawn = async (): Promise<void> => {
    while (true) {
      const idx = nextIdx++;
      if (idx >= jobs.length) return;
      const job = jobs[idx];
      results[idx] = await runInWorker({
        profile: job.profile,
        seed: job.seed,
        dt,
        capHours,
        trace,
        collectSamples,
      });
    }
  };
  const workers = Math.min(parallelism, jobs.length, os.cpus().length);
  await Promise.all(Array.from({ length: workers }, () => spawn()));
  return results;
}

function summarize(res: RunResult, dt: number): string {
  const status = res.error
    ? `ERROR: ${res.error}`
    : res.reached
      ? `SINGULARITY @ ${res.timeHms}`
      : "NOT REACHED (cap)";
  const fm = Number(res.final.logMatter ?? 0);
  return (
    `[${res.profile} seed=${res.seed} dt=${dt}] ${status} | log10=${fm.toFixed(2)} ` +
    `shifts=${Number(res.final.shifts)} gal=${Number(res.final.galaxies)} ` +
    `tickspeed=${Number(res.final.tickspeedBought)} bots=${res.final.unlockedBots instanceof Array ? res.final.unlockedBots.length : 0} ` +
    `wall=${(res.wallMs / 1000).toFixed(1)}s`
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const outPath = args.out ? path.resolve(args.out) : path.join(here, "..", "results.json");
  const collectSamples = !args.lite;

  const jobs: HarnessJob[] = [];
  if (args.all) {
    const profiles: ProfileName[] = ["active", "casual", "idle"];
    if (args.withIdlePlus) profiles.push("idle_plus");
    for (const p of profiles) for (const s of args.seeds) jobs.push({ profile: p, seed: s });
  } else if (args.profile) {
    for (const s of args.seeds) jobs.push({ profile: args.profile, seed: s });
  }

  const results = await runJobBatch(
    jobs,
    args.dt,
    args.capHours,
    args.trace,
    collectSamples,
    args.jobs
  );
  for (const res of results) console.log(summarize(res, args.dt));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const json = args.lite
    ? JSON.stringify({ generatedAt: new Date().toISOString(), runs: results })
    : JSON.stringify({ generatedAt: new Date().toISOString(), runs: results }, null, 2);
  fs.writeFileSync(outPath, json);
  console.log(`[done] ${results.length} run(s) -> ${outPath}`);
}

if (workerData == null) {
  main().catch((err) => {
    console.error("[harness] fatal:", err);
    process.exit(1);
  });
}
