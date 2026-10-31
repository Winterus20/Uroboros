# ADR-0087: Challenge boost gate

## Status

Accepted (2026-10-31) by the owner. Amends ADR-0086 decision 3: challenge availability now also
requires a boost count of **4**.

## Context

Under ADR-0086 every challenge resets the number and the chain, and the penalties are designed
around the boost multiplier. C1 without a boost is a 36-minute wall; with 4 boosts it takes
17.1 minutes. The owner measured the full intended run for different boost gates with the real
engine (dt = 1 s):

| Boost gate | Intended run | Challenges cleared |
| --: | --: | --: |
| 3 | 184.2 min | 8/8 |
| 4 | **181.0 min** | **8/8** (11 boosts) |
| 5 | 174.5 min | 7/8 |
| 6 | — | 4/8 |

Gate 5 is only faster because one challenge cannot be completed; gate 6 loses four. Gates below
4 leave C1 as a wall (0 boost: 36 min).

## Decision

1. `CHALLENGE_BOOST_GATE = 4`. C1 and every challenge require `boostCount >= 4` in addition to
   the existing bestNumber unlock threshold.
2. Sequence is unchanged: only the next incomplete challenge can be entered.
3. The bestNumber unlock check stays. The boost gate reads the persistent boost count, not the
   current run.
4. Boost count persists through challenge entry (ADR-0086 §1), so once the fourth boost is bought
   the gate stays open for the rest of that prestige. It is re-earned after prestige because
   boostCount resets at the gate.
5. The gate is global: there is no challenge-specific exception. All eight challenges use the
   same constant.
6. Save schema does not change. `boostCount` is already in v24; no new field is added.

## Consequences

- **Challenges-only is no longer a design path.** Without 4 boosts no challenge can be entered.
  The old 289.6 min challenges-only measurement (ADR-0086) describes a mode that is now
  unreachable; it is kept only as historical data.
- **First challenge:** ~32 min of boost farming plus 17.1 min of C1. C1 at 0 boosts (36 min) is
  no longer reachable.
- **Intended run:** 181.0 min, 11 boosts, 8/8. Boost-only remains 672.6 min; base 1031.9 min.
- **UI:** the challenge panel must show the gate (for example "Requires 4 boosts") and keep
  `Enter` disabled below it.
- **Implementation:** implemented in `src/game/number/tuning.ts`, re-exported from
  `challenges.ts`, enforced by `isChallengeUnlocked` and `ChallengeRow.enterable`; UI shows the
  gate in `BoostPanel` / `ChallengePanel` / `HeroNumber`.

## Open items

- Re-measure the gate if `BOOST_REQUIREMENT_GROWTH` or `BOOST_PRICE_GROWTH` changes.
