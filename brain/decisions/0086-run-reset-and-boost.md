# ADR-0086: Boost-first reset loop and challenge runs

## Status

Accepted (2026-10-31) by the owner; calibrated and implemented (2026-10-31). Supersedes ADR-0083's
'single run, no reset' clause and D6's 'unlocks never close' reading. This is an AD-style reset
game, not a single-run game. Implementation follows this ADR; the old 190-min calibration and
21-22 min overlay timings are invalid under this model.

## Context

The 2026-10-31 review found that keeping challenges as overlays made 'wait until near the goal'
the dominant policy (39.4 min vs 188.6 min). C1 and C5 penalties were dead in the no-reset model.
The owner decided: challenges reset number and chain on entry, boost persists through challenges,
and boost is the power source that makes challenges feasible. Boost-only progress to 1e308 must
be extremely slow; boost + challenges is the intended efficient path.

## Decisions

1. Reset on challenge entry: number = 10; every ring amount = 0 and bought = 0; unlocks reset to
   Fingers only. Boost count and completed challenge rewards persist. The run state before entry
   is not restored.
2. Boost reset: buying a boost resets number and chain the same way. Boost count, completed
   challenges and their rewards persist.
3. Boost availability: last ring (Mathematician) is unlocked and bought >= boostRequirement(n).
   Boost is available before challenges; no challenge gate.
   **Superseded by ADR-0087 (challenge entry):** boost is still available before challenges, but
   every challenge now also requires boostCount >= 4.
4. Boost count resets at the 1e308 gate / prestige, not on challenge entry.
5. Challenge goals are absolute plan goals; sequence is enforced (only nextChallenge can be
   entered). Completion keeps the challenge run's number and rings. Exit keeps the reset run;
   the UI must warn before both actions.
6. Challenge unlock checks use bestNumber (lifetime peak), not current number. Otherwise exiting a
   challenge at 10 would lock the player out of re-entering it.
7. Offline: a challenge completes at the step where its goal is crossed, and the reward applies
   immediately; it is not resolved once at the end of the offline block.
8. Save v24 adds boostCount. v20-v23 saves load with boostCount = 0.

## Formulas (final, calibrated 2026-10-31)

- BLOCK_MULT = 5.3 (per-ring block multiplier, production only)
- boostRequirement(n) = ceil(50 * 1.35^n) (last-ring units bought in the current run)
- boostPrice(n) = ringBlockPrice(lastRing, BLOCK_SIZE) * 1.5^n, paid from number
- boostMultiplier(n) = 1.8^n, applied to number production only (not chain feeding)
- CHALLENGE_FEED_MULT = 0.2, applied to every active challenge
- challenge price growth = 1.22 (C1-C8)

Challenge goals are absolute log10 values; unlock is the previous goal (C1 unlocks at 10):

| Challenge | Unlock (log10) | Goal (log10) | Run (min) |
| :--- | --: | --: | --: |
| C1 | 10 | 10.5 | 17.1 |
| C2 | 10.5 | 20.1 | 7.7 |
| C3 | 20.1 | 29.8 | 8.0 |
| C4 | 29.8 | 39.4 | 8.8 |
| C5 | 39.4 | 49.1 | 9.3 |
| C6 | 49.1 | 58.7 | 18.8 |
| C7 | 58.7 | 68.4 | 10.5 |
| C8 | 68.4 | 78.0 | 14.2 |

## Balance target (measured 2026-10-31, real engine, dt = 1 s)

| Policy | Duration | vs intended |
| :--- | --: | --: |
| Intended (optimal, 11 boosts) | **181.0 min** | 1.00x |
| 0-greedy | 195.8 min | 1.08x |
| Challenges only (no boost) | 289.6 min | 1.60x · historical after ADR-0087 |
| Boost only (no challenges) | 672.6 min | 3.72x |
| Base (no boost, no challenges) | 1031.9 min | 5.70x |

The intended path is the only efficient one: boost-only is dramatically slower, and the base run is
slower still. The challenges-only row was measured before ADR-0087; the 4-boost gate makes that
mode unreachable, so it is historical data only. Challenge runs: C1 17.1 · C2 7.7 · C3 8.0 ·
C4 8.8 · C5 9.3 · C6 18.8 · C7 10.5 · C8 14.2 min; final push 52.7 min; the 11 boosts are farmed
between minute 9 and minute 114. Projection: 181 * 26.4 = **79.6 h** on the x1.165 curve; the 85 h
target needs a **x1.176** curve (181 * 28.1 = 84.8 h).

## Open items

- Exact 1e308 reset semantics: boostCount resets in prestige(), not when gateReached is set.
- Unlock reset: unlocks reset to Fingers only on challenge/boost reset; C1/C5 purchase blocks
  apply on top of that.
- Calibration is closed (2026-10-31); rung 1 target is **181 min** under the intended policy.
