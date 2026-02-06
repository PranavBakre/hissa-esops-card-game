# Bot-Only Mode (Spectator Mode)

## Overview

A mode where all 5 teams are controlled by bots, allowing users to watch a complete game simulation without active participation.

## User Story

As a user, I want to start a game where all teams are bots so I can:
- Learn the game flow by watching
- Demo the game to others quickly
- Test/debug game mechanics
- Enjoy watching the AI compete

## Entry Points

### 1. Lobby Option
In the lobby, add a "Start Bot Game" or "Watch AI Game" button alongside the regular "Start Game" button. Only the host sees this option.

### 2. Quick Start from Home
Add a "Watch Bot Game" option on the home screen that:
- Creates a room automatically
- Sets all 5 teams as bots
- Immediately starts the game
- User enters as spectator

## Behavior

### Game Flow
1. All teams auto-register with generated names/problem statements
2. Setup phase runs automatically (bots drop/draw/lock)
3. Auction runs with bot bidding
4. Market rounds with bot wildcard decisions
5. Secondary auction with bot drops/bids
6. Exit phase - each bot selects their own exit strategy (IPO, Acquisition, etc.)

### Timing Adjustments
- **Faster pacing**: Reduce bot delays since no human needs to follow along
- **Optional speed control**:
  - "Normal" (1x) - Watch at regular pace
  - "Fast" (2x) - Reduced delays
  - "Instant" (0x) - Skip to results

### UI Adjustments
- Remove all interactive elements (bid controls, card selection)
- Show "Spectator Mode" badge
- Add play/pause controls (optional)
- Show "Skip to End" button to see final results immediately

## Implementation

### Phase 1: Basic Bot-Only Game
1. Add `spectatorMode: boolean` to `RoomState`
2. Add "Start Bot Game" button in lobby (host only)
3. When clicked:
   - Set all team slots to bots
   - Set `spectatorMode = true`
   - Start game
4. In spectator mode:
   - Hide interactive UI elements
   - Show spectator badge
   - Use shorter bot delays

### Phase 2: Speed Controls
1. Add `gameSpeed: 'normal' | 'fast' | 'instant'` to client state
2. Send speed preference to server
3. Server adjusts `BOT_TIMING` based on speed
4. Add speed toggle UI for spectators

### Phase 3: Quick Start
1. Add "Watch Bot Game" button to home screen
2. Creates room + starts game in one action
3. User joins as spectator automatically

## Data Model Changes

```typescript
// RoomState
interface RoomState {
  // existing...
  spectatorMode: boolean;
}

// New client message
type ClientMessage =
  // existing...
  | { type: 'start-bot-game' }
  | { type: 'set-game-speed'; speed: 'normal' | 'fast' | 'instant' };

// Timing multipliers
const SPEED_MULTIPLIERS = {
  normal: 1.0,
  fast: 0.3,
  instant: 0.01,
};
```

## UI Mockup

### Lobby (Host View)
```
Room: ABCD
Players: 1/5

[ Start Game ]  [ Start Bot Game ]
```

### Spectator Badge (During Game)
```
+---------------------------+
| [eye icon] Spectator Mode |
| Speed: [Normal] [Fast]    |
+---------------------------+
```

## Open Questions

1. Should spectators be able to join mid-game?
2. Should there be a chat/commentary feature?
3. Should bot decisions be explained (e.g., "Bot A bid 2% because...")

## Related

- V1 had a basic spectator mode when all teams were bots
- Bot AI logic in `packages/worker/src/bot-player.ts`
