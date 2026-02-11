# SolidJS Migration

## Why SolidJS

| Feature | Current (Vanilla) | SolidJS |
|---------|-------------------|---------|
| Reactivity | Manual `render()` calls | Fine-grained signals |
| DOM updates | Full innerHTML replacement | Surgical DOM updates |
| Event binding | Re-attach on every render | Once at creation |
| Bundle size | 0kb | ~7kb gzipped |
| Components | None (2500-line file) | Isolated, reusable |

### Key Advantages

1. **No Virtual DOM** - SolidJS compiles to direct DOM operations. Faster than React/Preact.
2. **Fine-grained reactivity** - Only the exact DOM nodes that depend on changed state update.
3. **Familiar syntax** - JSX like React, but reactive primitives instead of hooks.
4. **Small bundle** - ~7kb vs React's ~40kb.
5. **No re-renders** - Components run once. Only signals trigger updates.

## Core Concepts

### Signals (State)

```tsx
// Current: mutable object
export const state: ClientState = {
  view: 'home',
  room: null,
  // ...
};

// SolidJS: reactive signals
const [view, setView] = createSignal<'home' | 'lobby' | 'game'>('home');
const [room, setRoom] = createSignal<RoomState | null>(null);
```

### Effects (Side Effects)

```tsx
// Runs when room() changes
createEffect(() => {
  const currentRoom = room();
  if (currentRoom) {
    localStorage.setItem('esop-wars-roomCode', currentRoom.code);
  }
});
```

### Components

```tsx
// Current: innerHTML template
function renderHome(app: HTMLElement): void {
  app.innerHTML = `
    <div class="home-screen">
      <button id="create-room-btn">Create Room</button>
    </div>
  `;
  document.getElementById('create-room-btn')?.addEventListener('click', createRoom);
}

// SolidJS: JSX component
function HomeScreen() {
  return (
    <div class="home-screen">
      <button onClick={createRoom}>Create Room</button>
    </div>
  );
}
```

## Proposed File Structure

```
packages/client/src/
├── index.tsx                 # Entry point
├── App.tsx                   # Root component with view routing
├── state/
│   ├── client.ts             # Client signals (view, room, player)
│   ├── game.ts               # Game state signals
│   └── websocket.ts          # WebSocket connection + message handling
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── PhaseIntro.tsx
│   ├── home/
│   │   └── HomeScreen.tsx
│   ├── lobby/
│   │   ├── LobbyScreen.tsx
│   │   ├── TeamSlot.tsx
│   │   └── SpeedSelector.tsx
│   └── game/
│       ├── GameScreen.tsx
│       ├── GameHeader.tsx
│       ├── TeamPanel.tsx
│       ├── ActionPanel.tsx
│       ├── phases/
│       │   ├── RegistrationPhase.tsx
│       │   ├── SetupPhase.tsx
│       │   ├── AuctionPhase.tsx
│       │   ├── InvestmentPhase.tsx
│       │   ├── MarketPhase.tsx      # seed, early, mature
│       │   ├── SecondaryPhase.tsx   # drop + hire
│       │   ├── ExitPhase.tsx
│       │   └── WinnerPhase.tsx
│       ├── GameLog.tsx
│       └── DecisionLog.tsx
└── style.css                 # Keep existing CSS
```

## Migration Strategy

### Phase 1: Setup (1 hour)

1. Install dependencies:
   ```bash
   npm install solid-js
   npm install -D vite-plugin-solid
   ```

2. Update `vite.config.ts`:
   ```ts
   import { defineConfig } from 'vite';
   import solidPlugin from 'vite-plugin-solid';

   export default defineConfig({
     plugins: [solidPlugin()],
   });
   ```

3. Update `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "jsx": "preserve",
       "jsxImportSource": "solid-js"
     }
   }
   ```

### Phase 2: State Layer (2-3 hours)

Convert `app.ts` state to signals:

```tsx
// state/client.ts
import { createSignal } from 'solid-js';
import type { RoomState, GameState, GameSpeed } from '@esop-wars/shared';

export const [playerId, setPlayerId] = createSignal<string | null>(null);
export const [roomCode, setRoomCode] = createSignal<string | null>(null);
export const [room, setRoom] = createSignal<RoomState | null>(null);
export const [gameState, setGameState] = createSignal<GameState | null>(null);
export const [view, setView] = createSignal<'home' | 'lobby' | 'game'>('home');
export const [connected, setConnected] = createSignal(false);
export const [spectatorMode, setSpectatorMode] = createSignal(false);
export const [gameSpeed, setGameSpeed] = createSignal<GameSpeed>('normal');

// Derived state
export const myTeam = () => {
  const g = gameState();
  const id = playerId();
  if (!g || !id) return null;
  return g.teams.find(t => t.playerId === id) ?? null;
};

export const isMyTurn = () => {
  const g = gameState();
  const idx = myTeam()?.index;
  if (!g || idx === undefined) return false;
  return g.currentTurnIndex === idx;
};
```

### Phase 3: Components (4-6 hours)

Migrate incrementally, one screen at a time:

1. **HomeScreen** - Simplest, good starting point
2. **LobbyScreen** - Team selection, speed controls
3. **GameScreen** - Break into sub-components by phase

Example component migration:

```tsx
// components/home/HomeScreen.tsx
import { createSignal } from 'solid-js';
import { createRoom, joinRoom, watchBotGame } from '../../state/websocket';
import { showToast } from '../common/Toast';

export function HomeScreen() {
  const [roomCode, setRoomCode] = createSignal('');

  const handleJoin = () => {
    if (roomCode().length === 4) {
      joinRoom(roomCode());
    } else {
      showToast('Please enter a 4-character room code', 'warning');
    }
  };

  return (
    <div class="home-screen">
      <div class="game-logo">
        <span class="logo-esop">ESOP</span>
        <span class="logo-wars">Wars</span>
      </div>
      <div class="game-tagline">Build the highest-valued startup</div>

      <div class="home-actions">
        <button class="btn btn-primary btn-lg" onClick={createRoom}>
          Create Room
        </button>

        <div class="join-form">
          <input
            type="text"
            placeholder="CODE"
            maxLength={4}
            class="input-code"
            value={roomCode()}
            onInput={(e) => setRoomCode(e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button class="btn btn-secondary btn-lg" onClick={handleJoin}>
            Join
          </button>
        </div>

        <div class="home-divider">or</div>

        <button class="btn btn-secondary btn-lg" onClick={watchBotGame}>
          Watch Bot Game
        </button>
      </div>
    </div>
  );
}
```

### Phase 4: Game Phases (4-6 hours)

The biggest chunk. Break `renderGame()` into phase components:

```tsx
// components/game/GameScreen.tsx
import { Match, Switch } from 'solid-js';
import { gameState } from '../../state/client';
import { RegistrationPhase } from './phases/RegistrationPhase';
import { SetupPhase } from './phases/SetupPhase';
import { AuctionPhase } from './phases/AuctionPhase';
// ... other phases

export function GameScreen() {
  return (
    <div class="game-screen">
      <GameHeader />
      <div class="game-content">
        <Switch>
          <Match when={gameState()?.phase === 'registration'}>
            <RegistrationPhase />
          </Match>
          <Match when={gameState()?.phase === 'setup'}>
            <SetupPhase />
          </Match>
          <Match when={gameState()?.phase === 'auction'}>
            <AuctionPhase />
          </Match>
          {/* ... other phases */}
        </Switch>
      </div>
      <GameLog />
    </div>
  );
}
```

### Phase 5: Cleanup (1-2 hours)

1. Remove old `renderer.ts`
2. Remove old `app.ts` (logic moved to state/)
3. Update imports
4. Test all flows

## Estimated Timeline

| Phase | Effort | Description |
|-------|--------|-------------|
| Setup | 1 hour | Dependencies, config |
| State | 2-3 hours | Convert to signals |
| Home + Lobby | 2 hours | Simple screens |
| Game phases | 4-6 hours | Main complexity |
| Cleanup + testing | 2 hours | Polish |
| **Total** | **~12-14 hours** | |

## Key Patterns to Follow

### 1. No Type Assertions

```tsx
// Bad - violates CLAUDE.md
const team = gameState()?.teams[0] as Team;

// Good - use type guards
const team = gameState()?.teams[0];
if (!team) return null;
```

### 2. Conditional Rendering

```tsx
// SolidJS uses Show and For
import { Show, For } from 'solid-js';

<Show when={room()} fallback={<div>Loading...</div>}>
  {(room) => (
    <For each={room().players}>
      {(player) => <PlayerSlot player={player} />}
    </For>
  )}
</Show>
```

### 3. Event Handlers

```tsx
// Events are native, not synthetic like React
<input
  onInput={(e) => setValue(e.currentTarget.value)}
  onClick={(e) => handleClick(e)}
/>
```

### 4. Stores for Complex State

```tsx
// For nested state like GameState, use stores
import { createStore } from 'solid-js/store';

const [gameState, setGameState] = createStore<GameState | null>(null);

// Update nested properties directly
setGameState('teams', 0, 'capital', 1000);
```

## CSS Compatibility

The existing `style.css` should work with minimal changes. SolidJS uses `class` instead of `className`:

```tsx
// SolidJS
<div class="game-screen">

// React
<div className="game-screen">
```

## Testing

SolidJS works with Vitest. Add component tests:

```tsx
import { render } from 'solid-testing-library';
import { HomeScreen } from './HomeScreen';

test('renders home screen', () => {
  const { getByText } = render(() => <HomeScreen />);
  expect(getByText('Create Room')).toBeInTheDocument();
});
```

## Rollback Plan

Keep the old files in a branch until migration is complete and tested:

```bash
git checkout -b backup/vanilla-client
git checkout main
git checkout -b feature/solidjs-migration
```

## Relationship with UI Overhaul

This migration is a **prerequisite** for the UI overhaul. The execution order is:

1. **SolidJS Migration** (this doc) - ~12-14 hours
2. **UI Overhaul** ([ui-overhaul-research.md](ui-overhaul-research.md)) - ~7-10 days

The component architecture created here will be styled with the new dark theme design system in the UI overhaul phase.

---

## Decision

Approve this approach? If yes, I'll begin with Phase 1 (setup) and Phase 2 (state layer).
