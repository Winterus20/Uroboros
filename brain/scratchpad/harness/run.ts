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
 *   --chips                  M1 "Otonom Hız Çipi" davranışını AÇ (varsayılan KAPALI)
 *   --dawns N                Şafak (tekillik) serisi ölçümü: aynı deterministik
 *                            dünyada arka arkaya N şafak koşar ve SP ekonomisini
 *                            zaman serisi olarak raporlar. --dawns 0 (veya bayrağın
 *                            hiç verilmemesi) → mod KAPALI, mevcut davranış BİREBİR
 *                            korunur. Spec: brain/research/pacing-p0-baseline-2026-10.md §5
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
 *
 * M1 — OTONOM HIZ ÇİPİ (--chips, varsayılan KAPALI)
 * ---------------------------------------------------------------------------
 * Spec: brain/research/m1-speed-chip-spec-2026-10.md
 * Çip bot satın alma sıklığını artırır (bot aralığı ÷ (1 + 0.15×seviye)),
 * yani büyüme hızı k'yı artırır — sabit üretim çarpanı DEĞİLDİR (spec §1.1).
 *
 *   * Bayrak verilmezse davranış BİREBİR AYNIDIR (ölçüm karşılaştırılabilirlik): çip
 *     alınmaz, store.state değişmez, JSON çıktısı eski koşularla birebir aynıdır.
 *   * Kural ("çip fırsat varsa hemen al"): her tick'te çip alınabiliyorsa (cüzdan yeterli
 *     VE CHIP_MAX_LEVEL'a ulaşılmamış) BİR seviye alınır. Maliyet seviye başına
 *     1e4 katına çıktığı için bu kural pratikte "maliyet eşiği aşıldığı
 *     anda tek seviye" demektir; ek bir tick sayacı kuralına gerek yoktur (deterministik, en temiz).
 *   * KURAL TÜM PROFİLLERDE AYNI (active/casual/idle/idle_plus): profil OYUNCU davranışını
 *     (tıklama/kaos) modeller; çip alımı profil bağımsız bir "yatırım disiplini" olarak
 *     modellenmiştir (aksiyon her profilde aynı — sadece ne zaman tetiklendiği değişir).
 *   * SIRALAMA: çip alımı, aynı tick'in boyut alımlarından (maxAll) SONRA, dünya tick'inden
 *     (store.update) hemen önce yapılır. Böylece çip aynı tick'teki boyut alımını engellemez;
 *     bedeli bir sonraki tick'in boyut bütçesinde görülür (spec §2.3 "paylaşılan cüzdan").
 *   * Telemetri: `speedChipLevel` (son seviye), `speedChipsBought` (alınan toplam seviye),
 *     ayrıca `peaks.speedChipLevel` ve `final.speedChipLevel`.
 *   * PRESTIJ: çip koşu içi bir yatırımdır (prestijde sıfırlanır); bu harness ilk tekilliğe
 *     kadar çalıştığı için tek bir koşu ölçülür (reset yok).
 */
import { createPinia, setActivePinia } from "pinia";
import {
  useGameStore,
  AUTOBUYER_COSTS,
  LAB_SEEDS,
} from "../../../src/stores/game";
import { FEATURE_UNLOCKS } from "../../../src/game/unlocks";
import { NEURAL_LEGACY_UPGRADE_IDS, NEURAL_TREE } from "../../../src/game/neural-data";
import type { Decimal } from "../../../src/core/math";
import type { LabSeedType, NeuralNode } from "../../../src/models/types";
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

// ---------------------------------------------------------------------------
// --dawns N — Şafak (tekillik) serisi telemetrisi
// ---------------------------------------------------------------------------
// Spec: brain/research/pacing-p0-baseline-2026-10.md §5 (Kisa Spec — harness --dawns N)

/** Bir şafakta yapılan TEK bir SP alımının kaydı. */
interface SpPurchase {
  id: string; // nöral ağaç düğüm id'si (src/game/neural-data.ts)
  level: number; // satın alma SONRASI düğüm seviyesi
  cost: number; // harcanan SP (achievementSpDiscount dahil fiilî bedel)
}

/** Bir şafak için ölçülen tek satırlık kayıt. */
interface DawnRow {
  dawnIndex: number; // 1 tabanlı şafak sırası
  tSeconds: number; // kümülatif simülasyon saniyesi (şafak anı)
  runDurationSeconds: number; // BU koşunun süresi (önceki sıfırlamadan bu şafağa)
  spGain: number; // bu şafakta kazanılan SP
  spBank: number; // şafak BAŞINDAKİ kasa (taşınan banka + bu şafak kazancı)
  spSpentThisDawn: number; // bu şafakta harcanan SP
  spBankEnd: number; // şafak SONU kasa (sonraki şafağa taşınan)
  logMatterAtDawn: number; // sıfırlama ÖNCESİ log10(kütle)
  peakLogMatterThisDawn: number; // bu şafak içindeki log10(kütle) zirvesi
  shifts: number;
  galaxies: number;
  tickspeedBought: number;
  unlockedFeatureCount: number;
  unlockedBots: number; // açık bot sayısı
  unlockedBotIds: string[];
  newFeatures: string[]; // bu şafakta ilk kez açılan özellik kapıları
  newBots: string[]; // bu şafakta ilk kez açılan botlar
  newDimensions: string[]; // bu şafakta ilk kez açılan boyutlar
  purchases: SpPurchase[]; // bu şafaktaki SP harcamaları (sıralı, deterministik)
  breakSingularityBought: boolean; // bu şafakta break_singularity alındı mı
}

/** Şafak serisinin türev özet metrikleri. */
interface DawnSummary {
  mode: "dawns";
  dawnsCompleted: number;
  dawnsTarget: number;
  stoppedBy: "dawns_target" | "cap_hours" | "nan_guard" | "no_dawn";
  totalSimSeconds: number;
  totalSimHours: number;
  spTotalGained: number;
  spTotalSpent: number;
  spBankEnd: number;
  spGainSeries: number[];
  spBankSeries: number[];
  spSpentSeries: number[];
  spBankEndSeries: number[];
  /** Zaman-to-break: break_singularity hangi şafakta alındı (kaçıncı şafak + saat). */
  timeToBreak: { dawnIndex: number; tSeconds: number; hours: number } | null;
  /** Zaman-to-ilk-10-SP: kümülatif SP 10'a ilk kez ulaştığı şafak. */
  timeToFirst10Sp: { dawnIndex: number; tSeconds: number; hours: number } | null;
  /** SP/saat — şafak 1'den itibaren kümülatif. */
  spPerHourFromDawn1: number | null;
  /** SP/saat — şafak başına marjinal (bir önceki şafağa göre). */
  spPerHourMarginal: Array<{
    dawnIndex: number;
    spGain: number;
    hours: number;
    spPerHour: number;
  }>;
  /** log10(matter)/SP derinlik verimi (şafak başına). */
  logMatterPerSp: Array<{
    dawnIndex: number;
    logMatter: number;
    peakLogMatter: number;
    spGain: number;
    log10PerSp: number;
  }>;
  /** Şafak başına yeni açılan kapı listesi (koşu-kimliği). */
  newUnlocksPerDawn: Array<{
    dawnIndex: number;
    features: string[];
    bots: string[];
    dimensions: string[];
  }>;
  fastestSingularity: number | null; // en hızlı tekillik süresi (saniye)
  firstSingularitySeconds: number | null; // ilk tekilliğe ulaşılan kümülatif süre
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
  // M1 — Otonom Hız Çipi telemetrisi (--chips KAPALI iken 0).
  speedChipLevel: number; // koşunun sonundaki çip seviyesi
  speedChipsBought: number; // koşu boyunca satın alınan TOPLAM çip seviyesi
  // Kosunun ZIRVESI (reset sonrasi anlik goruntu degil). Olcum kapisi bunu kullanir.
  peaks: {
    logMatter: number;
    shifts: number;
    galaxies: number;
    tickspeedBought: number;
    speedChipLevel: number; // M1 çip seviyesi (koşu içi en yüksek seviye; shift çipi sıfırlar, bu yüzden monoton DEĞİLDİR)
  };
  final: Record<string, unknown>;
  error: string | null;
  // --dawns N modunda DOLUDUR. Mod kapalıyken bu alanlar HİÇ ATANMAZ; JSON çıktısı
  // bu sayede eski koşularla BİREBİR aynı kalır (regresyon yok).
  dawns?: DawnRow[];
  summary?: DawnSummary;
}

/**
 * Decimal -> JSON güvenli sayı. JS sayı taşmasına giren değerler oyunun kendi
 * D_INFINITY (1.7976931348623157e308) değerine kırpılır; NaN -> 0.
 */
function decToJsonNumber(d: Decimal): number {
  if (d.isNan()) return 0;
  const n = d.toNumber();
  if (!Number.isFinite(n)) return 1.7976931348623157e308;
  return n;
}

/**
 * Şafak serisinin türev özet metrikleri (P0 §5).
 * - zaman-to-break: break_singularity hangi şafakta alındı (şafak no + saat)
 * - zaman-to-ilk-10-SP: kümülatif SP 10'a ilk kez ulaştığı şafak
 * - SP/saat: şafak 1'den itibaren kümülatif VE şafak-başı marjinal
 * - log10(matter)/SP: derinlik verimi (şafak başına)
 * - şafak başına yeni açılan kapı listesi: koşu-kimliği
 * - fastestSingularity: en hızlı tekillik süresi
 */
function buildDawnSummary(
  rows: DawnRow[],
  dawnsTarget: number,
  stoppedBy: DawnSummary["stoppedBy"],
  totalSimSeconds: number,
  firstSingularitySeconds: number | null,
  fastestSingularity: number | null
): DawnSummary {
  const hours = (sec: number): number => sec / 3600;
  const spGainSeries = rows.map((r) => r.spGain);
  const spBankSeries = rows.map((r) => r.spBank);
  const spSpentSeries = rows.map((r) => r.spSpentThisDawn);
  const spBankEndSeries = rows.map((r) => r.spBankEnd);

  let cumulativeSp = 0;
  for (const r of rows) cumulativeSp += r.spGain;
  const spPerHourFromDawn1 =
    rows.length > 0 && totalSimSeconds > 0 ? cumulativeSp / hours(totalSimSeconds) : null;

  const spPerHourMarginal = rows.map((r, i) => {
    const prevT = i === 0 ? 0 : rows[i - 1].tSeconds;
    const deltaHours = hours(r.tSeconds - prevT);
    return {
      dawnIndex: r.dawnIndex,
      spGain: r.spGain,
      hours: deltaHours,
      spPerHour: deltaHours > 0 ? r.spGain / deltaHours : 0,
    };
  });

  const breakRow = rows.find((r) => r.breakSingularityBought) ?? null;
  const timeToBreak = breakRow
    ? {
        dawnIndex: breakRow.dawnIndex,
        tSeconds: breakRow.tSeconds,
        hours: hours(breakRow.tSeconds),
      }
    : null;

  let cum = 0;
  let first10: DawnRow | null = null;
  for (const r of rows) {
    cum += r.spGain;
    if (cum >= 10) {
      first10 = r;
      break;
    }
  }
  const timeToFirst10Sp = first10
    ? {
        dawnIndex: first10.dawnIndex,
        tSeconds: first10.tSeconds,
        hours: hours(first10.tSeconds),
      }
    : null;

  const logMatterPerSp = rows.map((r) => ({
    dawnIndex: r.dawnIndex,
    logMatter: r.logMatterAtDawn,
    peakLogMatter: r.peakLogMatterThisDawn,
    spGain: r.spGain,
    log10PerSp: r.spGain > 0 ? r.logMatterAtDawn / r.spGain : 0,
  }));

  const newUnlocksPerDawn = rows.map((r) => ({
    dawnIndex: r.dawnIndex,
    features: r.newFeatures,
    bots: r.newBots,
    dimensions: r.newDimensions,
  }));

  const spTotalSpent = rows.reduce((acc, r) => acc + r.spSpentThisDawn, 0);

  return {
    mode: "dawns",
    dawnsCompleted: rows.length,
    dawnsTarget,
    stoppedBy,
    totalSimSeconds,
    totalSimHours: hours(totalSimSeconds),
    spTotalGained: cumulativeSp,
    spTotalSpent,
    spBankEnd: rows.length > 0 ? rows[rows.length - 1].spBankEnd : 0,
    spGainSeries,
    spBankSeries,
    spSpentSeries,
    spBankEndSeries,
    timeToBreak,
    timeToFirst10Sp,
    spPerHourFromDawn1,
    spPerHourMarginal,
    logMatterPerSp,
    newUnlocksPerDawn,
    fastestSingularity,
    firstSingularitySeconds,
  };
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
  collectSamples: boolean,
  // M1 — Otonom Hz Çipi: false (varsayılan) ise hiçbir çip alınmaz, koşu birebir eski
  // davranışla aynıdır (regresyon yok / ölçüm karşılaştırılabilirlik).
  chipsEnabled = false,
  // P0 §5 — Şafak serisi: >0 ise aynı deterministik dünyada arka arkaya N şafak
  // koşulur (store.singularityReset(false) çağrılır). 0 (varsayılan) → mod KAPALI:
  // koşu eski davranışla BİREBİR aynıdır.
  dawnsTarget = 0
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
    speedChipLevel: 0,
    speedChipsBought: 0,
    peaks: { logMatter: 0, shifts: 0, galaxies: 0, tickspeedBought: 0, speedChipLevel: 0 },
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

  // M1 — Otonom Hız Çipi satin alma (yalnızca --chips).
  // Kural: "çip fırsat varsa hemen al" — her tick'te, çip alınabiliyorsa (cüzdan yeterli
  // VE CHIP_MAX_LEVEL'a ulaşılmamış) BİR seviye alınır. Maliyet seviye başına 1e4
  // katına çıktığı için kural pratikte "maliyet eşiği aşıldığı anda tek seviye"
  // davranışı verir; tick sayacı gibi ek bir koşul gerekmez (deterministik).
  // store.buySpeedChip() zaten no-op korumali (cüzdan yetersiz / tavan) ve seviye artırmaz;
  // burada yine de canBuySpeedChip kapısı ile erken çıkış yapılır (ucuz, yan etkisiz).
  const doSpeedChip = (): void => {
    if (!chipsEnabled) return;
    if (!store.canBuySpeedChip) return;
    // playSound=false: headless koşuda ses oynanmaz.
    if (store.buySpeedChip(false)) result.speedChipsBought++;
  };

  // -------------------------------------------------------------------------
  // --dawns N — Şafak (tekillik) serisi (P0 §5)
  // -------------------------------------------------------------------------
  // Oyun kodu (src/**) DEĞİŞMEZ; harness yalnız mevcut tick döngüsünü bir "şafak
  // döngüsü" ile sarar. Şafak akışı:
  //   canSingularity beklenir → store.singularityReset(false) → SP harcama politikası
  // simTime ve şafak sayacı KORUNUR (koşu sıfırlanmaz; sıfırlama oyunun kendi
  // içindedir — ADR-0034: SP yalnız singularityReset anında eklenir).
  const dawnMode = dawnsTarget > 0;
  const dawnRows: DawnRow[] = [];
  let dawnIndex = 0;
  let dawnStartSimTime = 0; // bu koşunun (şafakın) başlangıç simTime'ı
  let dawnPeakMatter = store.matter; // bu şafak içindeki kütle zirvesi
  let dawnStartFeatures = new Set<string>(store.unlockedFeatures);
  let dawnStartBots = new Set<string>(
    Object.entries(store.autobuyers)
      .filter(([, b]) => b.unlocked)
      .map(([id]) => id)
  );
  let dawnStartDimCount = store.unlockedDimensionsCount;

  // Sabit SP öncelik listesi = NÖRAL AĞAÇ düğüm sırası (src/game/neural-data.ts).
  // `insomnia_heart` (kök) ve `break_singularity` kendi kurallarıyla ele alınır,
  // bu yüzden listede YOKTUR. id'ler uydurulmaz — koddan okunur.
  const SP_PRIORITY: string[] = NEURAL_TREE.filter(
    (n) => n.id !== "insomnia_heart" && n.id !== "break_singularity"
  ).map((n) => n.id);
  const NEURAL_NODE_BY_ID = new Map<string, NeuralNode>(NEURAL_TREE.map((n) => [n.id, n]));

  /** Düğümün mevcut seviyesi (eski dükkân id'leri birleşik seviye taşır). */
  const nodeLevel = (node: NeuralNode): number => {
    const bought = store.neuralNodesBought || {};
    const legacy = NEURAL_LEGACY_UPGRADE_IDS.has(node.id)
      ? store.singularityUpgrades?.[node.id] || 0
      : 0;
    return Math.max(bought[node.id] || 0, legacy);
  };

  /** Maliyet formülü store.buyNeuralNode ile BİREBİR aynıdır (achievementSpDiscount dahil). */
  const nodeCost = (node: NeuralNode, level: number): number =>
    Math.floor(node.cost * Math.pow(node.costMult ?? 1, level) * store.achievementSpDiscount);

  /** Kilit/uygunluk denetimi: store.buyNeuralNode ile aynı kapılar. */
  const nodeAvailable = (node: NeuralNode): boolean => {
    const bought = store.neuralNodesBought || {};
    if (nodeLevel(node) >= (node.maxLevel ?? 1)) return false;
    for (const reqId of node.requires) {
      if ((bought[reqId] || 0) < 1) return false;
    }
    if (node.choiceGroup) {
      const siblingLocked = NEURAL_TREE.some(
        (n) =>
          n.choiceGroup === node.choiceGroup &&
          n.id !== node.id &&
          (bought[n.id] || 0) > 0
      );
      if (siblingLocked) return false;
    }
    return true;
  };

  /**
   * SP harcama politikası — deterministik, sıralı (P0 §5):
   *   1) Şafak 1: `insomnia_heart` (1 SP) — ağacın bütün dallarını açar.
   *   2) `break_singularity` (4 SP) göründüğü an satın al (koşullar + bütçe sağlanırsa HEMEN).
   *   3) Kalan SP: sabit öncelik listesinden "en ucuz uygun" düğüm (rastgelelik YOK).
   *      Eşit maliyette öncelik listesindeki İLK düğüm kazanır.
   *   4) Hiçbir SP harcanamıyorsa kasa birikir (satın alınmadı → spBankEnd > spBank).
   */
  const applySpPolicy = (): SpPurchase[] => {
    const purchases: SpPurchase[] = [];
    const buy = (id: string): boolean => {
      const node = NEURAL_NODE_BY_ID.get(id);
      if (!node) return false;
      const before = store.singularityPoints;
      // Satın alım GERÇEK oyun aksiyonudur (store.buyNeuralNode) — SP, kapı kontrolü
      // ve legacy senkronu oyunun kendi kodunda kalır.
      if (!store.buyNeuralNode(id)) return false;
      const after = store.singularityPoints;
      const spent = before.minus(after).toNumber();
      purchases.push({
        id,
        level: nodeLevel(node),
        cost: Number.isFinite(spent) ? spent : 0,
      });
      return true;
    };

    // 1) Şafak 1: insomnia_heart (1 SP).
    const root = NEURAL_NODE_BY_ID.get("insomnia_heart");
    if (dawnIndex === 1 && root && nodeLevel(root) < 1) {
      buy("insomnia_heart");
    }

    // 2) break_singularity (4 SP) — göründüğü an.
    const brk = NEURAL_NODE_BY_ID.get("break_singularity");
    if (brk && nodeLevel(brk) < 1 && nodeAvailable(brk)) {
      if (store.singularityPoints.gte(nodeCost(brk, nodeLevel(brk)))) {
        buy("break_singularity");
      }
    }

    // 3) Kalan SP: sabit öncelik listesinden en ucuz uygun düğüm.
    for (;;) {
      let best: NeuralNode | null = null;
      let bestCost = Number.POSITIVE_INFINITY;
      for (const id of SP_PRIORITY) {
        const node = NEURAL_NODE_BY_ID.get(id);
        if (!node || !nodeAvailable(node)) continue;
        const cost = nodeCost(node, nodeLevel(node));
        if (!store.singularityPoints.gte(cost)) continue;
        if (cost < bestCost) {
          bestCost = cost;
          best = node;
        }
      }
      if (!best) break;
      if (!buy(best.id)) break;
    }
    return purchases;
  };

  /** Bir şafak kaydı: ölçüm → oyunun sıfırlaması → SP harcaması → yeni şafak başlangıcı. */
  const performDawn = (): void => {
    dawnIndex++;

    // 1) Sıfırlama ÖNCESİ anlık görüntü (shift/galaksi/tickspeed reset ile sıfırlanır).
    const spGainDec = store.singularityGain; // reset ÖNCESİ okunmalı (singularities henüz artmadı)
    const logMatterAtDawn = store.matter.lte(0) ? 0 : store.matter.log10().toNumber();
    const shifts = store.dimensionShifts;
    const galaxies = store.galaxies;
    const tickspeedBought = store.tickspeedBought;
    const featureCount = store.unlockedFeatures.length;
    const botIds = Object.entries(store.autobuyers)
      .filter(([, b]) => b.unlocked)
      .map(([id]) => id);
    const peakLogMatterThisDawn =
      dawnPeakMatter.lte(0) ? 0 : dawnPeakMatter.log10().toNumber();

    // 2) Sıfırlama — oyunun kendi içinde (ADR-0034: SP yalnız bu anda eklenir).
    const resetOk = store.singularityReset(false);

    // 3) Şafak BAŞINDAKİ kasa (taşınan banka + bu şafakta kazanılan SP).
    const spBank = decToJsonNumber(store.singularityPoints);

    // 4) SP harcama politikası.
    const purchases = applySpPolicy();
    const spSpentThisDawn = purchases.reduce((acc, p) => acc + p.cost, 0);
    const spBankEnd = decToJsonNumber(store.singularityPoints);

    // 5) Bu şafakta yeni açılan kapılar (koşu-kimliği).
    const featuresNow = new Set(store.unlockedFeatures);
    const newFeatures = [...featuresNow].filter((f) => !dawnStartFeatures.has(f));
    const newBots = botIds.filter((id) => !dawnStartBots.has(id));
    const dimCount = store.unlockedDimensionsCount;
    const newDimensions: string[] = [];
    for (let d = dawnStartDimCount + 1; d <= dimCount; d++) newDimensions.push(`d${d}`);

    dawnRows.push({
      dawnIndex,
      tSeconds: simTime,
      runDurationSeconds: simTime - dawnStartSimTime,
      spGain: decToJsonNumber(spGainDec),
      spBank,
      spSpentThisDawn,
      spBankEnd,
      logMatterAtDawn,
      peakLogMatterThisDawn,
      shifts,
      galaxies,
      tickspeedBought,
      unlockedFeatureCount: featureCount,
      unlockedBots: botIds.length,
      unlockedBotIds: botIds,
      newFeatures,
      newBots,
      newDimensions,
      purchases,
      breakSingularityBought: purchases.some((p) => p.id === "break_singularity"),
    });

    // 6) Yeni şafak başlangıcı — simTime ve şafak sayacı KORUNUR.
    dawnStartSimTime = simTime;
    dawnPeakMatter = store.matter;
    dawnStartFeatures = featuresNow;
    dawnStartBots = new Set(botIds);
    dawnStartDimCount = dimCount;
    if (!resetOk) {
      result.error = `singularityReset başarısız (t=${simTime.toFixed(1)}s)`;
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
      if (dawnMode) {
        // Şafak modu: koşu SIFIRLANMAZ — ölçüm alınır, oyunun kendi sıfırlaması
        // çağrılır (simTime + şafak sayacı korunur), sonra SP harcanır.
        if (result.timeSeconds === null) result.timeSeconds = simTime;
        performDawn();
        if (result.error !== null || dawnIndex >= dawnsTarget) {
          finished = true;
          break;
        }
      } else {
        result.timeSeconds = simTime;
        finished = true;
        break;
      }
    }

    // 5b. M1 — Otonom Hız Çipi (yalnızca --chips; varsayılan KAPALI).
    // Sıralama: aynı tick'in boyut alımları (maxAll) zaten yapıldı; çip bedeli bir sonraki
    // tick'in boyut bütçesinde görülür (spec §2.3 "paylaşılan cüzdan").
    doSpeedChip();

    // 6. world tick
    store.update(dt);
    simTime += dt;

    // 6b. zirve takibi (log10 YOK): matter Decimal olarak karsilastirilir,
    // sayaclar duz sayi olarak Math.max ile guncellenir.
    if (store.matter.gt(peakMatter)) peakMatter = store.matter;
    if (dawnMode && store.matter.gt(dawnPeakMatter)) dawnPeakMatter = store.matter;
    result.peaks.shifts = Math.max(result.peaks.shifts, store.dimensionShifts);
    result.peaks.galaxies = Math.max(result.peaks.galaxies, store.galaxies);
    result.peaks.tickspeedBought = Math.max(result.peaks.tickspeedBought, store.tickspeedBought);
    result.peaks.speedChipLevel = Math.max(result.peaks.speedChipLevel, store.speedChipLevel);

    if (store.canSingularity) {
      result.reached = true;
      if (dawnMode) {
        if (result.timeSeconds === null) result.timeSeconds = simTime;
        performDawn();
        if (result.error !== null || dawnIndex >= dawnsTarget) {
          finished = true;
          break;
        }
      } else {
        result.timeSeconds = simTime;
        finished = true;
        break;
      }
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
  result.peaks.speedChipLevel = Math.max(result.peaks.speedChipLevel, store.speedChipLevel);
  const peakLogMatter = peakMatter.lte(0) ? 0 : peakMatter.log10().toNumber();
  result.peaks.logMatter =
    peakMatter.isNan() || Number.isNaN(peakLogMatter) ? 0 : peakLogMatter;

  const finalLogMatter = store.matter.lte(0) ? 0 : store.matter.log10().toNumber();
  const finalLogDps = store.matterPerSecond.lte(0) ? 0 : store.matterPerSecond.log10().toNumber();
  result.logMarks["final"] = finalLogMatter;

  result.speedChipLevel = store.speedChipLevel;

  result.final = {
    t: simTime,
    logMatter: finalLogMatter,
    logDps: finalLogDps,
    shifts: store.dimensionShifts,
    galaxies: store.galaxies,
    tickspeedBought: store.tickspeedBought,
    speedChipLevel: store.speedChipLevel,
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

  // --dawns N özeti (yalnız mod açıkken atanır; kapalıyken JSON çıktısı aynı kalır).
  if (dawnMode) {
    const stoppedBy: DawnSummary["stoppedBy"] =
      result.error !== null
        ? "nan_guard"
        : dawnIndex >= dawnsTarget
          ? "dawns_target"
          : simTime >= capSeconds
            ? "cap_hours"
            : "no_dawn";
    const fastest = store.stats.fastestSingularity;
    result.dawns = dawnRows;
    result.summary = buildDawnSummary(
      dawnRows,
      dawnsTarget,
      stoppedBy,
      simTime,
      result.timeSeconds,
      Number.isFinite(fastest) ? fastest : null
    );
  }

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
  chips: boolean; // M1 — Otonom Hız Çipi (varsayılan KAPALI)
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
    chips: false,
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
    else if (a === "--chips") args.chips = true;
    else if (a === "--fast") {
      args.lite = true;
      args.jobs = Math.max(1, os.cpus().length);
    }
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node out/run.mjs [--all] [--profile active|casual|idle|idle_plus] " +
          "[--seeds 1,2,3] [--dt 0.1] [--capHours 12] [--out results.json] [--withIdlePlus] [--trace] " +
          "[--lite] [--jobs N] [--fast] [--chips]"
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
  chips: boolean; // M1 — Otonom Hız Çipi bayrağı (worker'a da taşınır)
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
  parallelism: number,
  chips: boolean
): Promise<RunResult[]> {
  if (parallelism <= 1 || jobs.length <= 1) {
    const out: RunResult[] = [];
    for (const job of jobs) {
      out.push(
        await runOnce(PROFILES[job.profile], job.seed, dt, capHours, trace, collectSamples, chips)
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
        chips,
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
    `chip=${res.speedChipLevel}/${res.speedChipsBought} ` +
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
    args.jobs,
    args.chips
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
