# ESOP Wars v2 - Exit Card Draw Mechanic

Feature doc for restoring the exit phase to a random draw instead of player choice.

---

## Problem

The exit phase currently lets each team **pick** their exit card from all available options. This removes the luck element and makes the endgame purely strategic - leading teams always pick safe exits, trailing teams always pick risky ones. The outcome becomes predictable.

In reality, startup exits are heavily influenced by luck and market timing. The exit phase should reflect that.

**Current behavior** (both v1 and v2): Teams see all exit cards and click to select one. Bots use a strategy algorithm (`decideExit()`) that picks based on ranking.

---

## Design

### How It Works

- Exit deck is shuffled at game start (or at the start of the exit phase)
- Each team draws one card in turn order
- The drawn card is immediately revealed to all players
- No take-backs - you get what you get
- All teams see each other's draws in real time

### UI

- Show a face-down card deck that the current team clicks to draw
- Card flip/reveal animation for the suspenseful moment
- Color-code the revealed card: green for high multiplier, amber for moderate, red for low
- Show a tracker of all teams' draws (with "Waiting..." for teams that haven't drawn yet)
- After all teams draw, brief pause before transitioning to winner phase

### Exit Cards

The same exit card pool as today, but drawn randomly:

| Card | Multiplier |
|------|-----------|
| IPO | 2.0x |
| Acquisition (M&A) | 1.5x |
| Strategic Merger | 1.3x |
| PE Buyout | 1.2x |
| Management Buyout | 0.8x |
| Fire Sale | 0.5x |

> Note: With 5 teams and 6 cards, one card goes undrawn each game.

---

## Implementation

### Server Changes (packages/worker)

1. **Message type**: Replace `select-exit` with `draw-exit` in `types.ts`
2. **Game engine** (`game-engine.ts`):
   - Add shuffled exit deck to `GameState` (shuffle at phase start)
   - Replace `chooseExit(state, teamIndex, exitId)` with `drawExit(state, teamIndex)` that pops the top card
   - Remove `getAvailableExitCards()` (no longer needed for client)
3. **Room** (`room.ts`):
   - Replace `handleSelectExit()` with `handleDrawExit()` - no `exitId` param needed
   - Shuffle exit deck when entering exit phase
4. **Bot** (`bot-player.ts`):
   - Remove `decideExit()` strategy logic entirely
   - Bots just call `drawExit()` like players

### Client Changes (packages/client)

1. **Renderer** (`renderer.ts`):
   - Replace `renderExitPhase()` selection grid with draw UI
   - Show face-down card deck when it's your turn to draw
   - Show revealed card after drawing
   - Show all teams' draw results tracker
2. **Main** (`main.ts`):
   - Replace `selectExit()` action with `drawExit()` (no exitId parameter)
3. **Styles** (`style.css`):
   - Card flip animation CSS
   - Draw button styling
   - Team draw tracker styling

### Shared Changes (packages/shared)

1. **Types** (`types.ts`):
   - Change `ClientMessage` union: `{ type: 'draw-exit' }` instead of `{ type: 'select-exit'; exitId: number }`
   - Add `exitDeck: ExitCard[]` to `GameState` (or handle server-side only)

---

## Non-Goals

- No changes to the exit card values/multipliers themselves
- No "re-draw" or "trade" mechanics
- No peek-at-deck abilities
