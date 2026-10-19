# First-Prestige Baseline — Time to First Singularity (measurement only)

> ## ⚠️ TARİHSEL — RAKAMLAR GEÇERSİZ (2026-10-19)
>
> Bu rapor **eski bir yapıda** alınmıştır ve zaman etiketleri geçerliliğini yitirmiştir:
> başlık sonucu "ilk tekillik ≈13 dk" der, oysa güncel ölçüm (~11 saat) ile hem ADR-0023
> (150–300 dk) hem de bu sayı büyük bir sapmadır. **Güncel otorite: [`brain/research/pacing-p0-baseline-2026-10.md`](../../research/pacing-p0-baseline-2026-10.md)**
> (§7 ADR-0023 ihlali, §8 eşik yayılımı).
>
> Bu dosya yalnızca **yöntem referansı** olarak korunur: harness kurulumu, determinizm yöntemi
> (seeded mulberry32 + sanal saat), profil tablosu ve telemetri anahtarları hâlâ geçerlidir.
> 1–7. bölümlerdeki bütün sayısal sonuçlar (`0:13:13`, zaman çizelgeleri, log10 tabloları)
> **tarihsel kabul edilir**; sıradaki ölçüm buna göre değil, P0 raporuna göre yapılır.

> Headless, deterministic harness that drives the **real** Pinia store (`src/stores/game.ts`)
> in Node. No game file was modified. The sim stops the clock the moment
> `store.canSingularity` (matter ≥ 1.7976931348623157e308) first turns true — it never calls
> `singularityReset()`, so every number below is the raw first run.

---

## 1. How to build & run

> Kısa yol (tek kapı): `npm run harness:smoke` (derle + 30 dk aktif sim + 6 assert, ~30 sn),
> `npm run harness:full` (ADR-0023 band denetimi), `npm run verify` (typecheck + test + smoke).
> Aşağıdaki ham komutlar özel ölçümler içindir.

```powershell
# build the bundle (esbuild, canvas-confetti aliased to a no-op stub)
node brain/scratchpad/harness/build.mjs

# all profiles x seeds 1,2,3 -> brain/scratchpad/harness/results.json
node brain/scratchpad/harness/out/run.mjs --all --out brain/scratchpad/harness/results.json

# single run examples
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --out brain/scratchpad/harness/results-active.json
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.05 --out brain/scratchpad/harness/results-active-dt005.json
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --trace --out brain/scratchpad/harness/results-active-trace.json
```

Files:
- `run.ts` — harness entry (profiles, telemetry, CLI; header comment documents everything)
- `build.mjs` — esbuild bundle → `out/run.mjs` (platform=node, format=esm, confetti stub alias)
- `stubs/confetti-stub.js` — `export default function confetti(){}` (no DOM in Node)
- Raw results: `results-active.json`, `results-casual.json`, `results-idle.json`,
  `results-idle-plus.json`, `results-active-dt005.json`, `results-active-trace.json`

### Method / determinism
- **RNG**: `Math.random` replaced per run by a seeded mulberry32 LCG (seeds 1, 2, 3).
- **Time**: `Date.now()` replaced by a virtual clock advanced by `dt` each tick (combo decay, anomaly ids).
- **Tick**: `dt = 0.1 s` default. **Stability check**: active seed 1 at `dt = 0.05` → 0:13:47 vs
  0:13:13 at `dt = 0.1` = **+4.3 %** — stable enough for baseline work.
- **Fresh world per run**: `setActivePinia(createPinia())` + `useGameStore()` each time.
- Re-running active seed 1 twice produced byte-identical timing (0:13:13) → deterministic ✓.
- NaN guard every tick (`store.matter.isNan() || !Number.isFinite(store.matter.mag)`) — **no NaN in any run**.

### Player profiles (pre-prestige behaviour)

| Behaviour | active | casual | idle | idle_plus (diagnostic) |
|---|---|---|---|---|
| Manual clicks | 5/s | 2/s | 0 | 0 |
| `maxAll` cadence | every 2 s | every 10 s | every 5 s | every 5 s |
| Algorithm upgrades | when affordable | when affordable | — | when affordable |
| Autobuyer unlock | cheapest-first, all | cheapest-first, all | cheapest-first, all | cheapest-first, all |
| Bulk/Max bot modes | yes | — | — | — |
| Shifts / Galaxies | instant | instant | **never** | instant |
| Sacrifice (≥1.5× rule) | yes | yes | — | yes |
| Anomalies | click instantly | 80 % catch, ≤3 s delay | never | never |
| Crisis spells (espresso first) | yes | — | — | — |
| Lab (harvest/plant/viral) | yes | — | — | — |
| Pull-to-refresh | yes | — | — | — |
| Stance | `trend` (default) | `trend` | `trend` | `trend` |

---

## 2. Headline result — time to first Singularity

| Profile | seed 1 | seed 2 | seed 3 | **Median** | Range | Target band |
|---|---|---|---|---|---|---|
| **active** | 0:13:13 | 0:12:07 | 0:12:59 | **0:12:59 (≈13 min)** | 12.1–13.2 min | 180–240 min |
| **casual** | 1:24:00 | 1:23:00 | 1:27:10 | **1:24:00 (84 min)** | 83–87 min | "somewhat longer than active" |
| **idle** | *not reached* | *not reached* | *not reached* | **not reached (12 h cap)** | log10(matter)=29.13 at cap | must not be pathological |
| idle_plus (diag.) | 1:27:05 | 1:25:17 | 1:27:05 | 1:27:05 (87 min) | 85–87 min | — |

**Verdict: the current build does NOT land in the 3–4 h band.** The active profile finishes
**≈14–18× too fast** (13 min vs 180–240 min target). Casual/idle_plus land at ~84–87 min —
also far below target. Pure-idle is the opposite failure: **it never prestiges**
(effectively hard-capped, see §6).

The gap active↔casual (13 min vs 84 min, 6.5×) shows how much the current economy rewards
click rate + micro (5 clicks/s, 2 s buying, spells/lab/refresh/anomaly play). Notably
**idle_plus (0 clicks, just maxAll + shifts) still reaches 87 min**, so *shifts/galaxies are
the real gate, not clicking*: idle vs idle_plus differ only by the shift/galaxy buttons and
go from ">12 h / never" to 87 min.

---

## 3. Milestone timestamps (seed 1 of each profile)

| Milestone | active | casual | idle_plus | idle |
|---|---|---|---|---|
| 1e3 crisis spawn | 0:00:11 | 0:00:18 | 0:00:16 | 0:00:16 |
| 1e7 patch shop | 0:01:34 | 0:03:13 | 0:03:28 | 0:03:40 |
| Crisis tab (D4×10) | 0:01:27 | 0:02:41 | 0:02:31 | 0:02:36 |
| Lab (D3×15) | 0:02:25 | 0:04:41 | 0:05:21 | 0:05:56 |
| 1e11 refresh + guilt | 0:02:40 | 0:06:08 | 0:08:03 | 0:09:14 |
| 1e12 autobuyers tab | 0:02:40 | 0:08:12 | 0:09:57 | 0:11:56 |
| bot dim1 (5e5) | 0:01:22 | 0:02:20 | 0:02:10 | 0:02:10 |
| bot tickspeed (5e8) | 0:02:18 | 0:04:30 | 0:04:55 | 0:05:25 |
| **first shift / D5** | **0:04:40** | **0:21:00** | **0:29:55** | *never* |
| bulk mode (2.5e11) | 0:05:24 | — | — | — |
| shift 4 (D8 online) | 0:06:24 | 0:26:08 | 0:35:48 | *never* |
| **first galaxy** | **0:06:50** | **0:27:48** | **0:37:05** | *never* |
| max mode (1e26) | 0:09:42 | — | — | — |
| bot galaxy (1e23) | 0:08:02 | 0:33:50 | 0:43:45 | *never* |
| **Singularity** | **0:12:59** (med) | **1:24:00** (med) | **1:27:05** (med) | *never* |

All 6 algorithm upgrades are owned by ~2–3 min in every reaching profile.
Active unlocked **11/12 bots in max mode**; casual/idle_plus stayed on single-mode bots.

---

## 4. log10(matter) timeline

Marks requested were 15/30/60/120/180/240 min; runs that finish earlier show "—".

| Profile | 15 m | 30 m | 60 m | 120 m | 180 m | 240 m | at cap / end |
|---|---|---|---|---|---|---|---|
| active | — (reached 13 m) | — | — | — | — | — | 310.6 @ 13:13 |
| casual | 15.89 | 12.26 | 64.49 | — | — | — | 308.5 @ 1:24:00 |
| idle | 12.87 | 15.85 | 18.45 | 21.69 | 22.96 | 23.88 | **29.13 @ 12:00:00 (capped)** |
| idle_plus | 14.70 | 3.04 | 12.11 | — | — | — | 318.4 @ 1:27:05 |

Active per-minute samples (seed 1) — the sawtooth is shift/galaxy resets, the last minute is
the endgame explosion:

| min | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | end (13:13) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| log10 | 3.97 | 7.20 | 13.31 | 17.45 | 13.82 | 11.25 | 9.91 | 21.83 | 8.54 | 5.96 | 5.85 | 15.99 | 63.80 | **310.6** |

**The final 60 seconds carry log10 from 16 → 310 (+294 decades).** Per-tick endgame trace
(`--trace`, from 10^200 on) shows log10(matter) growing 20–30 decades/**second**, with the
chain feed into D1 jumping +38 decades in a single 0.1 s tick
(D1 amount 10^173 → 10^211 at t=750.5, driven by D2 amount × D2-multipier × tickspeed).

### Late-game dominance (final snapshot, active seed 1)
- `tickspeed` ×10^22.3 (217 buys; `(1/galaxyBonus)^bought`, game.ts:1255-1262)
- Dimension bought-multipliers `2^floor(bought/10)`: D1 820 bought → ×10^24.7 (game.ts:1849)
- Shift power `2.0^12` shifts → ×4096 on every dim (game.ts:1862-1867, challenges.ts:178)
- Collective ×5, stance `trend` ×2, achievements ×1.67, active buff ×7, sacrifice ×1.9e4 (D8 only)
- D1 amount itself reached 10^202 purely from the **chain feed** (D2→D1, rate 0.1/s)
- Lab: 9 seeds planted, 420 harvests (each ≈ dps×10–90) — helpful, but secondary to the buy loop
- Idle's breakdown by contrast: only achievements 1.18 × collective 2 × stance 2 — no tickspeed
  scaling (log tickspeed mult only 10^1.2), because it never shifts.

**Dominant late system = the dimension-buy loop** (tickspeed × per-10-bought doubling × shift
ladder), not lab/anomalies/spells.

---

## 5. Softlocks / stalls / bugs found

1. **Idle bootstrap deadlock (real design bug).** A purely passive player never prestiges:
   `AUTOBUYER_PROGRESS_REQ.shift = { shifts: 1 }` (`src/stores/game.ts:850-863`) means the shift
   bot needs 1 manual shift, and galaxies need 1 manual galaxy — but idle by definition never
   shifts. Without shifts the economy hits a hard affordability wall (D-tier costs jump ×1e3–1e15
   per bucket): at the 12 h cap idle sat at **log10 = 29.13** with bought `[100,70,60,40,0,0,0,0]`,
   creeping ~0.36 decades per 3.5 h → extrapolated **≫1000 h** to e308. No 20-min flat stall was
   ever flagged (it always grows, just glacially). Same math applies to any player who ignores
   shift/galaxy buttons.
2. **No NaN / no crash** in any of the 12 runs; audio/music/confetti safely inert in Node.
3. **Spell-priority starvation (harness finding, worth a UI look):** with a naïve
   `espresso(45) → fast_charge(30)` else-if chain, fast_charge starves espresso completely
   (0 casts in the smoke run). The shipped harness gives espresso true priority (fast_charge
   only from surplus while the buff is active) → active cast 7–8 espresso + 8 fast_charge +
   4–9 noise per run. If the real UI has the same threshold conflict, players will silently
   never cast espresso.
4. **dt stability ±4.3 %** (0.1 vs 0.05) — fine for baseline, re-check after big rebalances.
5. Active/casual sawtooth note: reset buttons fire the instant they light up (per spec), so
   matter sometimes resets from ~10^100 back to 10 and rebuilds in <60 s — recovery is so fast
   that resets are nearly free late-game.

---

## 6. Diagnosis — top 5 tuning levers (ranked by expected impact on time-to-singularity)

The run is two regimes: **(A) 0–8 min "normal" exponential growth** (first shift 4.7 min,
first galaxy 6.8 min for active), then **(B) a runaway buy-loop** where each purchase cycle
re-spends the freshly-jumped matter and multiplies every dimension — the last 60 s gain
(+294 decades) proves regime B has essentially unbounded loop gain. Tuning must attack B and
delay the A→B transition.

1. **Dimension buy-loop gain: `BASE_COSTS`/`COST_MULTS` (`src/stores/game.ts:152-172`) ×
   per-bucket doubling `2^floor(bought/10)` (`src/stores/game.ts:1848-1860`) ×
   `RESOLUTION_MILESTONES` (`src/stores/game.ts:98-105`).** Each matter decade currently buys
   ≈0.95 "doublings" across tiers (Σ 1/log10(costMult) over the 8 tiers), i.e. dps ≈ 10^(0.29·log10 matter)
   → loop gain > 1 → runaway. Raising `COST_MULTS` (early tiers 1e3/1e4 especially) or lowering
   the per-10-bought multiplier below 2.0 pushes loop gain under 1 — this is the single lever
   that turns the final 60 s into tens of minutes/hours. Expected impact: **very high**.
2. **Shift/galaxy ladder: `shiftRequirement` (`src/stores/game.ts:1507-1530`, currently just
   25 of tier 4+shifts), `galaxyRequirement` (`src/stores/game.ts:1539-1542`, 40+20·g),
   `unlockedDimensionsCount = 4+shifts` (`src/stores/game.ts:1241-1245`), shift power
   `2.0^shifts` (`src/stores/game.ts:1862-1867`, `src/game/challenges.ts:178`).** First shift at
   4.7 min / first galaxy at 6.8 min (active) opens D5–D8 and the ×2-per-shift multiplier far
   too early. Raising the requirement amounts (and/or softening shiftPower) delays regime B
   onset. Anchors to aim for: first shift ~20–30 min, first galaxy ~60–90 min. Expected: **very high**.
3. **Tickspeed economy: cost `1000·13^n` (`src/stores/game.ts:1279-1297`, base+ratio line 1280)
   and galaxy bonus `0.89 − 0.02·galaxies`, floor 0.08 (`src/stores/game.ts:1255-1262`).**
   217 buys ×10^22 at the active end; every galaxy makes each subsequent buy stronger
   (ratio → 1.266/buy at 5 galaxies) while `buyMaxTickspeed` spends the whole matter budget.
   Raising the cost ratio (13 → 16–20) or reducing the per-galaxy shrink/floor directly throttles
   the ratchet. Expected: **high**.
4. **`DIMENSION_CHAIN_RATE = 0.1` (`src/stores/game.ts:174`).** The chain is how purchase
   multipliers propagate down to D1→matter; the endgame trace shows the D1 feed compounding
   through all 8 tiers in one tick. Halving the rate slows D1's tracking of the buy loop and
   flattens the cascade (also interacts with shiftPower on higher tiers). Expected: **medium-high**.
5. **Feature ladder & bot cadence: `FEATURE_UNLOCKS` (`src/game/unlocks.ts:125-238`, 1e3/1e7/
   1e11/1e12 + D3×15 lab, D4×10 crisis), `AUTOBUYER_COSTS` (`src/stores/game.ts:832-845`),
   bulk/max costs & intervals (`src/stores/game.ts:877-881`, intervals `1011-1033`).** Active
   had every feature open by ~3 min and `max` mode (0.5 s interval) by 9.7 min — max-mode bots
   re-spend matter ~2×/s, accelerating the loop. Raising thresholds (1e12 → later), bot costs,
   and max-mode cost/interval stretches the mid-game. Secondary sub-levers: `ALGORITHM_UPGRADES`
   costs (`src/stores/game.ts:107-150`, all owned in <3 min), free stance ×2
   (`src/stores/game.ts:1966-1977`), anomaly interval (`src/stores/game.ts:3365-3371`,
   65–95 s → min 40 s with rate multipliers). Expected: **medium** (mostly shapes 0–15 min).

Also fix while tuning: **the idle deadlock** — give `shift`/`galaxy` bots a matter-based
requirement alternative (`src/stores/game.ts:850-863`), or accept & document that a fully
passive player never prestiges.

---

## 7. Caveats

- Profiles are scripted "ideal-ish" players (instant resets, optimal purchase cadence); real
  humans will be slower than `active`, faster than `idle`. `active` is best read as a
  **lower bound** on time-to-first-prestige, `idle` as the fully-passive floor.
- `idle_plus` exists purely to isolate the shift/galaxy gate; it is not one of the three
  required profiles.
- All raw telemetry (60 s samples, milestone maps, per-tier bought counts, multiplier
  breakdowns, spell/anomaly counters) lives in the `results-*.json` files next to this report.
