# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**[`AGENTS.md`](AGENTS.md) is the binding rulebook for this repo — read it first and follow it.** This file only adds what AGENTS.md does not spell out. Project docs, ADRs and code comments are written in Turkish; in-game text is English (P3).

## Commands

```bash
npm run dev            # Vite dev server on http://localhost:3000
npm run typecheck      # vue-tsc --noEmit (must be 0 errors)
npm test               # vitest run (node env, no DOM)
npm run build          # vue-tsc && vite build (release gate)
npm run verify         # typecheck + test + build (package.json chains all three, despite docs calling it "typecheck + test")
```

Single file / single test:

```bash
npx vitest run src/game/number/economy.test.ts
npx vitest run src/game/number/challenges.test.ts -t "part of test name"
```

- Tests match `src/**/*.test.ts` (and `tests/**/*.spec.ts`, currently none). `src/test/setup.ts` gives every test a fresh Pinia. `testTimeout` is 120 s because the long integration sims are slow; don't run several vitest processes in parallel (they race on the shared results cache).
- Balance measurement lives outside the test suite: `node brain/scratchpad/balance-2026-10-23/sim.mjs --all`.

## Architecture

**Pure economy core, thin store, components on top.**

- `src/game/number/` is framework-free (no Vue, no Pinia) so the store and tests share the same functions:
  - `tuning.ts` — the single source of every chain constant (ring costs `c_i = 25·8^i`, cost growth 1.20, `CHAIN_RATE`, `RING_DIRECT_SHARE`, block multiplier `B`/`BLOCK_SIZE`, `GATE = 1.79e308`). Its header comment documents the reasoning; balance changes go here, backed by an ADR.
  - `economy.ts` — `NumberState` + pure functions (`advance`, `buyRing`, `maxAll`, `numberPerSecond`, `checkGate`, …). Ring n+1 feeds ring n; ring 1 produces the number; rings 2–8 also add directly to the number. The block multiplier affects production, not feeding.
  - `challenges.ts` — 8 reset-free challenges (penalty overlay on entry, permanent reward on goal). Dependency is one-way: `economy → challenges`.
  - `rungs.ts` — notation-rung definitions (only rung 1 is implemented).
- `src/stores/game.ts` — the central Pinia store. Holds settings + the economy state, wraps the pure functions as actions, exposes UI row getters (`RingRow`, `ChallengeRow` from `models/number.ts`), and picks voice lines. `update` and `simulateOffline` resolve post-tick events through the same path; offline progress is capped at 12 h (`OFFLINE_CAP_SECONDS`).
- `src/core/game-loop.ts` — fixed-step 20 TPS accumulator on rAF; deltas ≥ 1 s go to `store.simulateOffline`; autosave and save-on-hide/unload live here.
- `src/game/voice/` — ticker/scene line pool and selection (`pickSceneLine`, anti-repeat history). Voice rules: `brain/context/narrative-voice.md`.
- `src/core/format.ts` — notation formats and hero-number string parts (`heroParts`).
- `src/core/math.ts` — `break_eternity.js` `Decimal` wrapper and shared constants (`D`, `D_0`, …).

### Saves

- `store.serialize()` / `deserialize()` ↔ `SerializedPlayerState` (`models/save.ts`); `core/save.ts` (`SaveSystem`) handles LZ-String storage, 3 slots, backup, corrupt-save quarantine, import/export size guards; `core/save/serializer.ts` sanity-checks shape.
- Schema version lives in `core/save-version.ts` (`SAVE_VERSION = 23`, `MIN_SUPPORTED_SAVE_VERSION = 20`). Any change to the serialized shape needs a version bump, migration in `deserialize`, a `game.save.test.ts` case, and doc updates (AGENTS.md, tech-context, README).
- localStorage keys still use legacy prefixes (`DOOMSCROLL_SAVE_SLOT_…`, `QUANTUM_HORIZON_…`) from earlier themes. Do not rename them — that would orphan existing saves.
- Cloud save is optional (Firebase Auth + Firestore, `core/auth/`, `stores/auth.ts`); the game runs fully without keys. Conflicts resolve through `cloud-conflict.ts` + `CloudConflictModal`. Firestore rules: `firestore.rules`.

### Legacy residue

`brain/decisions/` holds 80+ ADRs, most from earlier themes (Doomscroll, Uroboros, reels, dimensions …) that no longer match the code. The current design is defined by ADR-0077 onward (especially 0078 visual, 0080 notation, 0082 chain-only, 0083 rung-1 single-run model) and `brain/research/theme-pivot-grilling-2026-10-23.md`. When an old ADR conflicts with these, the newer one wins.

## Gotchas

- `break_eternity.js`: NaN check is `dec.isNan() || Number.isNaN(dec.mag)`; use `plus/minus/times` (the typings lack `add/sub/mul`).
- Visual work follows `brain/context/visual-language.md` ("Saf Sayı": no cards/blur/rounded corners/shadows, 1px hairlines; hero number weight 300, `tabular-nums`).
- Workflow per AGENTS.md §3: move the task from `brain/tasks/todo.md` to `in-progress.md`, open an ADR for economy/architecture changes, and log finished work in `brain/tasks/completed.md`.
