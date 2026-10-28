# Rung 1 implementation contract (v2 / 190 min)

Source of truth: `brain/research/rung-1-plan-2026-10-27.md` §11 and
`brain/research/rung-1-190-calibration-2026-10-27.md`.

## 0. Non-negotiables

- Single run, **no resets** before the gate. Prestige at `1.79e308` only.
- `BLOCK_MULT = 5.5`; block factor = `5.5 ** floor(bought / 10)`, applied to Fingers base
  production AND to direct share (rings 2-8). NOT applied to chain feeding.
- `GATE = 1.79e308`, `GATE_LOG10 = 308.25286978738966`.
- `CHALLENGE_FEED_MULT = 0.2` while any challenge is active; opening and final push full feed.
- 8 challenges are overlays: entering never resets the number/rings/block multiplier.
- C8 reward is **production x2**, not the old price-base 1.15.
- `src/` is the only implementation target; no new deps.

## 1. Challenge definitions (log10 values)

| id | ring | unlockLog10 | goalLog10 | delta | growth | penalty | reward |
| :- | --: | --: | --: | --: | --: | :--- | :--- |
| C1 | 0 | 10 | 33.242 | 2 | 1.22 | fingersCap | fingers10 |
| C2 | 1 | 33.242 | 37.376 | 2 | 1.45 | price145 | all5 |
| C3 | 2 | 37.376 | 95.157 | 2 | 1.22 | directOff | all3 |
| C4 | 3 | 95.157 | 104.688 | 2 | 1.22 | decay | first3x5 |
| C5 | 4 | 104.688 | 119.334 | 2 | 1.22 | firstFive | direct5 |
| C6 | 5 | 119.334 | 122.271 | 2 | 1.22 | feedFifth | feed15 |
| C7 | 6 | 122.271 | 125.573 | 2 | 1.22 | newestOnly | all4 |
| C8 | 7 | 125.573 | 128.967 | 2 | 1.35 | price135feedHalf | finisher |

`goal = max(goalLog10, log10(number at entry) + delta)`.

Penalty semantics (must match `brain/scratchpad/chain-only-probe/190-calibration/engine.ts`):

- `fingersCap`: cannot buy Fingers beyond 10 bought.
- `price145`: cost growth 1.45.
- `directOff`: direct share 0.
- `decay`: production multiplier `max(0.1, exp(-(now - lastBuyAt)/20))`.
- `firstFive`: rings 5-7 cannot be bought (existing production still counts).
- `feedFifth`: feed / 5.
- `newestOnly`: every ring except the most recently bought one x0.25.
- `price135feedHalf`: cost growth 1.35 and feed / 2.
- Global while active: feed x0.2 (stacks with feedFifth / price135feedHalf).

Reward semantics (fixed, no B-dependent exponents):

- `fingers10`: Fingers production x10, feed x1.5.
- `all5`: all rings x5.
- `all3`: all rings x3.
- `first3x5`: rings 0-2 x5.
- `direct5`: rings 1-7 direct production x5, feed x1.5.
- `feed15`: feed x1.5.
- `all4`: all rings x4.
- `finisher`: all rings x2.

## 2. Core types (src/game/number/challenges.ts)

```ts
export type PenaltyKind =
  | 'fingersCap' | 'price145' | 'directOff' | 'decay'
  | 'firstFive' | 'feedFifth' | 'newestOnly' | 'price135feedHalf'

export type RewardKind =
  | 'fingers10' | 'all5' | 'all3' | 'first3x5'
  | 'direct5' | 'feed15' | 'all4' | 'finisher'

export interface ChallengeDef {
  readonly id: string
  readonly ringIndex: number
  readonly unlockLog10: number
  readonly goalLog10: number
  readonly delta: number
  readonly growth: number
  readonly penalty: PenaltyKind
  readonly reward: RewardKind
  readonly penaltyLabel: string
  readonly rewardLabel: string
}

export interface ChallengeState {
  completed: string[]
  active: string | null
  entryLog10: number | null
  goalLog10: number | null
  lastBuyAt: number
}

export const CHALLENGES: readonly ChallengeDef[]
export const CHALLENGE_FEED_MULT = 0.2
export const BLOCK_MULT = 5.5
export const BLOCK_SIZE_CHALLENGE = 10
export function challengeById(id: string | null): ChallengeDef | null
export function activeChallenge(state: { challenges: ChallengeState }): ChallengeDef | null
export function isChallengeUnlocked(state: { number: Decimal; challenges: ChallengeState }, def: ChallengeDef): boolean
export function challengeGoalLog(def: ChallengeDef, entryLog10: number): number
export function enterChallenge(state: NumberState, id: string): boolean
export function exitChallenge(state: NumberState): void
export function completeChallengeIfReady(state: NumberState): ChallengeDef | null
export function challengeProgress(state: NumberState): number
export function nextChallenge(state: NumberState): ChallengeDef | null
```

`NumberState` gains:

```ts
challenges: ChallengeState
gateReached: boolean
tanim: number
playTime?: number // store fills it; economy reads it for decay/lastBuyAt
```

`createNumberState()` initializes `challenges` empty, `gateReached: false`, `tanim: 0`.

## 3. Economy changes (src/game/number/economy.ts)

- Export `blockFactor(bought: number): Decimal` (cached).
- `numberPerSecond(state)` must multiply Fingers by `blockFactor(bought[0])` and every
  direct share by `blockFactor(bought[i])`, then apply challenge reward/penalty multipliers.
- `advance(state, dt)` feeding uses `CHAIN_RATE * feedMultiplier(state)`; production uses
  `numberPerSecond`; updates bestNumber. Do NOT reset number.
- `ringCost` / `ringBlockPrice` / `maxAffordableRing` / `buyRing` use the active
  challenge growth override; `buyRing` updates `challenges.lastBuyAt = playTime ?? 0` and
  blocks C1 Fingers >10 and C5 rings 5-7 purchases.
- `advance` should not complete challenges; the store calls `completeChallengeIfReady` after
  each tick so it can emit a ticker/audio event.
- Add `checkGate(state): boolean` that sets `gateReached` once and returns true on transition.
- Add `maxAll(state): number` buying blocks from ring 7 down to 0 while affordable.

## 4. Store API (src/stores/game.ts)

Getters:

- `activeChallengeRow` / `challengeRows`: rows with id, name, ringName, status
  (`locked | available | active | completed`), goal, progress, penaltyLabel, rewardLabel.
- `goalText` (active goal or `1.79e308`), `goalProgress` (0-100), `nextChallengeLabel`.
- `blockMultText` (`x5.50`).
- `gateReached` passthrough.

Actions:

- `enterChallenge(id)`, `exitChallenge()`, `buyMaxAll()`, `prestige()` (gate modal).
- `update(dt)`: advance -> completeChallengeIfReady -> checkGate; on completion push a
  ticker line (voice) and play a sound.
- `simulateOffline(seconds)`: same completion/gate checks after the loop.

## 5. Save schema v23

- `SAVE_VERSION = 23`, `MIN_SUPPORTED_SAVE_VERSION = 20` (v22 opens, defaults empty).
- `SerializedPlayerState` adds:
  `challenges: { completed: string[]; active: string | null; entryLog10: number | null; goalLog10: number | null; lastBuyAt: number }`,
  `gateReached: boolean`, `tanim: number`.
- Deserialize sanitizes ids to the 8 known challenges, numbers to finite values.

## 6. UI

- `GoalBar.vue`: persistent line under TickerBar. Normal: `Goal 1.79e308 . XX% . Next: C3`.
  Challenge: `C3 . XX% . Goal 1e95.16 . [Exit]`. Hairline only, no card/blur.
- `ChallengePanel.vue`: 8 rows, locked/available/active/completed, Enter button, progress.
- `ChainList.vue`: add Max All text button next to x1/x10/Max; show per-row block factor.
- `GateModal.vue`: full-screen gate transition at 1.79e308, +1 Tanim, Rung 2 placeholder.
- `App.vue`: add GoalBar, `challenges` tab, GateModal. Keep the existing visual language.

## 7. File ownership

- Agent A (core): `src/game/number/tuning.ts`, `src/game/number/challenges.ts`,
  `src/game/number/economy.ts`, `src/game/number/challenges.test.ts`,
  `src/game/number/economy.test.ts`. Do not touch store/UI/save.
- Agent B (store/save): `src/models/number.ts`, `src/models/save.ts`,
  `src/core/save-version.ts`, `src/stores/game.ts`. Do not touch core/UI.
- Agent C (UI): `src/components/GoalBar.vue`, `src/components/ChallengePanel.vue`,
  `src/components/GateModal.vue`, `src/components/ChainList.vue`, `src/App.vue`.
  Do not touch core/store/save.

## 8. Verification

- `npm run typecheck`
- `npm run test`
- `npm run build`
- Manual: fresh run -> C1 at 1e10, challenges never reset, C8 finisher, gate modal.
