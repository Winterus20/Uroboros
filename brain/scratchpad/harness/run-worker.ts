import { parentPort, workerData } from "node:worker_threads";
import { PROFILES, runOnce, type ProfileName } from "./run.ts";

interface WorkerRunPayload {
  profile: ProfileName;
  seed: number;
  dt: number;
  capHours: number;
  trace: boolean;
  collectSamples: boolean;
  // M1 — Otonom Hız Çipi: false ise çip alınmaz (koşu eski davranışla birebir aynı).
  chips: boolean;
  // P0 §5 — Şafak serisi: 0 = mod kapalı.
  dawns: number;
}

const payload = workerData as WorkerRunPayload;
const cfg = PROFILES[payload.profile];
const result = await runOnce(
  cfg,
  payload.seed,
  payload.dt,
  payload.capHours,
  payload.trace,
  payload.collectSamples,
  payload.chips,
  payload.dawns
);
parentPort?.postMessage(result);
