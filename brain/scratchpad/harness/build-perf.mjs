// Builds the tick performance bench into a Node-runnable bundle.
// Usage:  node brain/scratchpad/harness/build-perf.mjs   (veya: npm run harness:perf)
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(here, "perf-tick.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outdir: path.join(here, "out"),
  entryNames: "[name]",
  outExtension: { ".js": ".mjs" },
  alias: {
    "canvas-confetti": path.join(here, "stubs", "confetti-stub.js"),
  },
  logLevel: "info",
  legalComments: "none",
});

console.log("[build-perf] OK -> brain/scratchpad/harness/out/perf-tick.mjs");
