// Analitik ekonomi simülatörünü (brain/scratchpad/simulate-economy.ts) ve sabit
// doğrulama script'ini Node'da çalıştırılabilir tek dosyalık ESM paketlerine derler.
// Kullanım:  node brain/scratchpad/harness/build-sim.mjs
//
// - platform=node, format=esm -> "node out/simulate-economy.mjs" / "node out/verify-sim-constants.mjs"
// - break_eternity.js EXTERNAL: simülasyonu import eden eski scratch script'leri Decimal'i
//   dogrudan node_modules'tan aliyor; iki farkli Decimal sinifi "instanceof" kontrollerini
//   bozardı (formatDec). External ile tek sinif kimligi korunur.
// - src/game/* ve src/core/math bundle'a girer; sabitler GERÇEK kaynaktan gelir (H2).
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [
    path.join(here, "..", "simulate-economy.ts"),
    path.join(here, "verify-sim-constants.ts"),
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outdir: path.join(here, "out"),
  entryNames: "[name]",
  outExtension: { ".js": ".mjs" },
  external: ["break_eternity.js"],
  logLevel: "info",
  legalComments: "none",
});

console.log("[build-sim] OK -> brain/scratchpad/harness/out/simulate-economy.mjs, verify-sim-constants.mjs");
