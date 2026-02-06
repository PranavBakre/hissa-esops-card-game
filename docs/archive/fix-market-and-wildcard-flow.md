# Fix: Market Draw Stall + Wildcard Ordering

## Two problems, one root cause

### Problem 1: Market draw stalls in spectator mode

After wildcards resolve, the game gets stuck showing "Drawing market card..." The server schedules an alarm to auto-draw, but the Durable Object's single-alarm limitation means it likely gets overwritten or dropped at near-zero delays (instant speed: `1500 * 0.01 = 15ms`).

The spectator market draw lives in a **separate code path** (`executeSpectatorMarketDraw`) from the host-triggered draw (`handleDrawMarket`). If the alarm fails, there's no fallback — permanent stall.

### Problem 2: Wildcards are a blind gamble

Currently wildcards are selected **before** the market card is drawn. Players commit to double-down/shield/pass without knowing what market conditions they're reacting to.

### Why they're the same fix

Both problems stem from the current flow: wildcards → alarm → market draw. Reversing the order to market draw → wildcards eliminates the fragile alarm handoff AND makes wildcards a strategic reaction.

## Current flow

```
Enter market phase (seed/early/mature)
  → advancePhase() sets wildcardPhase = true
  → All teams select wildcard (blind)
  → revealWildcardsAndDrawMarket()
  → [spectator] schedule alarm for market draw  ← stall point
  → Draw market card
  → Apply market effects
  → Advance to next phase
```

## Proposed flow

```
Enter market phase (seed/early/mature)
  → advancePhase() does NOT set wildcardPhase
  → [host clicks / spectator auto-draws] Draw market card
  → Apply market effects + leader bonus
  → Broadcast results (teams see new valuations)
  → Set wildcardPhase = true, schedule bot wildcards
  → All teams select wildcard (informed by results)
  → Apply wildcard modifications to this round's results
  → Advance to next phase
```

## Game Design Rationale

Wildcards should be a **reaction** to market conditions:
- **Shield**: "This round hurt us, protect our valuation"
- **Double-down**: "This round boosted us, amplify the gains"
- **Pass**: "The effect is mild, save our wildcard for later"

## Implementation

### 1. `game-engine.ts` — `advancePhase()`

When entering seed/early/mature, do **not** set `wildcardPhase = true`. Just reset `currentMarketCard = null`.

```
case 'seed':
case 'early':
case 'mature':
  newState.currentMarketCard = null;
  // Don't set wildcardPhase here — it happens after market draw
  break;
```

### 2. `room.ts` — `handleDrawMarket()` (host-triggered)

After drawing and applying effects, enter wildcard phase:

```
1. Draw market card
2. Apply market effects + leader bonus
3. Broadcast results (teams see their new valuations)
4. Set wildcardPhase = true, reset teamWildcardSelections
5. Broadcast updated state
6. scheduleBotWildcards() if needed
```

### 3. `room.ts` — Spectator auto-draw

In `scheduleBotTurnIfNeeded()`, when phase is a market phase and `wildcardPhase` is false and `currentMarketCard` is null, schedule the auto-draw alarm. This replaces the separate `scheduleSpectatorAutoAdvance()` market case.

When the alarm fires, `executeSpectatorMarketDraw()` follows the same flow as step 2 above: draw → apply effects → set wildcardPhase → schedule bot wildcards.

### 4. `room.ts` — After wildcards resolve

Rename `revealWildcardsAndDrawMarket()` → `revealAndApplyWildcards()`. Remove the market draw. New flow:

```
1. Apply wildcard modifiers to this round's results
2. Broadcast final results
3. checkPhaseCompletion() → advance to next phase
```

No alarm scheduling needed here — `checkPhaseCompletion()` handles the transition.

### 5. `game-engine.ts` — `applyWildcards()` adjustment

With the new ordering, wildcards are applied **after** base market effects. The implementation needs:
- **Double-down**: Double the gain/loss from this round (compare pre-market to post-market valuation)
- **Shield**: Revert any loss from this round (restore pre-market valuation if it decreased)

This requires storing `previousValuation` on each team before applying market effects (the `previousValuation` field already exists on `Team`).

### 6. `room.ts` — `scheduleBotTurnIfNeeded()`

For market phases, the entry point changes:
- If `wildcardPhase` is true → `scheduleBotWildcards()` (unchanged)
- If `wildcardPhase` is false and `currentMarketCard` is null → schedule market draw (spectator) or wait for host
- If `wildcardPhase` is false and `currentMarketCard` is not null → phase is complete, `checkPhaseCompletion()` handles it

### 7. Client renderer — `renderMarketRound()`

Reorder the UI:
1. Show "Draw Market Card" button (or "Drawing market card..." in spectator mode)
2. After draw: show market results with updated valuations
3. After results: show wildcard selection (informed decision)
4. After wildcards: show final results with wildcard modifications applied

### 8. Cleanup

Remove dead code:
- `executeSpectatorMarketDraw()` market-draw-via-alarm path (replaced by inline draw)
- `scheduleSpectatorAutoAdvance()` market case
- The alarm handler branches for spectator market draw

## Files Changed

- `packages/worker/src/game-engine.ts` — `advancePhase()`, `applyWildcards()`
- `packages/worker/src/room.ts` — `handleDrawMarket()`, `executeSpectatorMarketDraw()`, `revealWildcardsAndDrawMarket()` (rename + restructure), `scheduleBotTurnIfNeeded()`, alarm handler cleanup
- `packages/client/src/renderer.ts` — `renderMarketRound()` UI reordering
