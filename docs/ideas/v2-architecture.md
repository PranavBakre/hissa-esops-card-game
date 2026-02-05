# ESOP Wars v2 - Architecture

Technical reference for structures, protocols, and code patterns. This is the source of truth.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                    │
│                                                               │
│  ┌────────────────┐         ┌─────────────────────────────┐  │
│  │     Worker     │ ──────► │  Durable Object (GameRoom)  │  │
│  │   (Router)     │         │  • WebSocket connections    │  │
│  │                │         │  • Game state in memory     │  │
│  │  /api/rooms    │         │  • Game engine logic        │  │
│  │  /api/rooms/:id│         │  • Alarms for timers        │  │
│  └────────────────┘         └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
            ▲                              ▲
            │ HTTP                         │ WebSocket
            │ (create/join)                │ (gameplay)
            │                              │
┌───────────┴───────────┐        ┌────────┴────────┐
│   Static Frontend     │        │     Clients     │
│  (Vercel / CF Pages)  │        │   (Browsers)    │
└───────────────────────┘        └─────────────────┘
```

---

## File Structure

```
card-game/
├── package.json                   # Workspaces + root scripts
├── tsconfig.base.json             # Shared TS config
│
└── packages/
    ├── shared/                    # @esop-wars/shared
    │   ├── package.json
    │   └── src/
    │       ├── types.ts           # GameState, Team, Card, Messages
    │       ├── constants.ts       # Phases, message types
    │       └── index.ts           # Barrel export
    │
    ├── client/                    # @esop-wars/client
    │   ├── index.html
    │   ├── vite.config.ts
    │   ├── tsconfig.json
    │   ├── package.json
    │   └── src/
    │       ├── main.ts            # Entry point
    │       ├── app.ts             # WebSocket, state management
    │       ├── renderer.ts        # UI rendering
    │       ├── data.ts            # Card data for display
    │       └── style.css
    │
    └── worker/                    # @esop-wars/worker
        ├── wrangler.toml
        ├── tsconfig.json
        ├── package.json
        └── src/
            ├── index.ts           # Worker entry, routing
            ├── room.ts            # Durable Object class
            ├── game-engine.ts     # Pure game logic
            ├── bot-player.ts      # Bot AI
            ├── validators.ts      # Action validation
            └── data.ts            # Card data
```

---

## Monorepo Configuration

### Root package.json
```json
{
  "name": "esop-wars-v2",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:worker\" \"npm run dev:client\"",
    "dev:worker": "npm run dev -w @esop-wars/worker",
    "dev:client": "npm run dev -w @esop-wars/client",
    "build": "npm run build --workspaces",
    "deploy": "npm run deploy -w @esop-wars/worker && npm run deploy -w @esop-wars/client",
    "typecheck": "npm run typecheck --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Shared Package
```json
{
  "name": "@esop-wars/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

### Importing Shared Types
```typescript
import { GameState, ServerMessage } from '@esop-wars/shared';
```

---

## Worker Configuration

### wrangler.toml
```toml
name = "esop-wars"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [
  { name = "GAME_ROOM", class_name = "GameRoom" }
]

[[migrations]]
tag = "v1"
new_classes = ["GameRoom"]

[vars]
ALLOWED_ORIGIN = "https://esop-wars.vercel.app"
```

---

## Data Structures

### Room State (in Durable Object)
```typescript
interface RoomState {
  code: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  hostPlayerId: string;
  createdAt: number;
  players: PlayerSession[];
  gameState: GameState | null;
}

interface PlayerSession {
  playerId: string;
  playerName: string;
  teamIndex: number | null;
  isHost: boolean;
  connected: boolean;
}
```

### Game State
```typescript
interface GameState {
  phase: Phase;
  teams: Team[];
  currentTurn: number;

  // Decks
  employeeDeck: Card[];
  marketDeck: Card[];
  segmentDeck: Card[];
  ideaDeck: Card[];

  // Auction
  currentCardIndex: number;
  currentBid: { teamIndex: number; amount: number } | null;

  // Setup
  setupRound: number;
  setupPhase: 'drop' | 'draw';

  // Wildcard
  wildcardPhase: boolean;
  teamWildcardSelections: Record<number, string | null>;

  // ... rest same as v1
}
```

### Client State
```typescript
interface ClientState {
  playerId: string;
  roomCode: string | null;
  myTeamIndex: number | null;
  gameState: GameState | null;
  ws: WebSocket | null;
}
```

---

## WebSocket Protocol

### Connection Flow
```
Client                              Worker                    Durable Object
   │                                   │                            │
   ├── GET /api/rooms/ABCD/ws ────────►│                            │
   │   (Upgrade: websocket)            │                            │
   │                                   ├── fetch(request) ─────────►│
   │                                   │                            │
   │◄──────────────────────────────────┼── Response(101, socket) ───┤
   │                                   │                            │
   ├── { type: 'join', name: 'Alice' } ────────────────────────────►│
   │                                   │                            │
   │◄───────────────────────────────── { type: 'room-joined', ... } ┤
```

### Message Types

#### Client → Server
| Type | Payload | When |
|------|---------|------|
| `join` | `{ playerName }` | On connect |
| `select-team` | `{ teamIndex }` | In lobby |
| `start-game` | `{}` | Host in lobby |
| `register-team` | `{ name, problemStatement }` | Registration phase |
| `drop-card` | `{ cardId, isSegment }` | Setup phase |
| `draw-card` | `{ deckType }` | Setup phase |
| `skip-draw` | `{}` | Setup phase |
| `lock-setup` | `{ segmentId, ideaId }` | Setup lock |
| `place-bid` | `{ amount }` | Auction |
| `select-wildcard` | `{ choice }` | Wildcard phase |
| `draw-market` | `{}` | Market round |
| `drop-employee` | `{ employeeId }` | Secondary drop |
| `select-secondary` | `{ employeeId }` | Secondary hire |
| `reconnect` | `{ playerId }` | On reconnect |

#### Server → Client
| Type | Payload | When |
|------|---------|------|
| `room-joined` | `{ room }` | After join |
| `player-joined` | `{ player }` | Someone joined |
| `player-left` | `{ playerId }` | Someone disconnected |
| `game-state` | `{ state }` | Full sync |
| `team-updated` | `{ teamIndex, team }` | Team changed |
| `phase-changed` | `{ phase }` | Phase transition |
| `turn-changed` | `{ teamIndex }` | Turn advanced |
| `bid-placed` | `{ teamIndex, amount }` | New bid |
| `bidding-closed` | `{ winner, card }` | Auction ended |
| `wildcards-revealed` | `{ choices }` | All wildcards in |
| `market-result` | `{ card, effects }` | Market applied |
| `error` | `{ message }` | Validation failed |

---

## Code Patterns

### Worker Entry (index.ts)
```typescript
export { GameRoom } from './room';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    // Create room: POST /api/rooms
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const code = generateRoomCode();
      const roomId = env.GAME_ROOM.idFromName(code);
      const room = env.GAME_ROOM.get(roomId);
      await room.fetch(new Request(url, { method: 'POST', body: JSON.stringify({ code }) }));
      return json({ code }, corsHeaders(env));
    }

    // WebSocket: GET /api/rooms/:code/ws
    const wsMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/ws$/);
    if (wsMatch) {
      const roomId = env.GAME_ROOM.idFromName(wsMatch[1]);
      const room = env.GAME_ROOM.get(roomId);
      return room.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
```

### Durable Object (room.ts)
```typescript
export class GameRoom {
  state: DurableObjectState;
  sessions: Map<WebSocket, PlayerSession> = new Map();
  roomState: RoomState;
  gameState: GameState | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();
      this.sessions.set(server, { playerId: '', playerName: '', teamIndex: null, isHost: false, connected: true });

      server.addEventListener('message', (event) => this.handleMessage(server, event.data as string));
      server.addEventListener('close', () => this.handleClose(server));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  handleMessage(ws: WebSocket, data: string) {
    const msg = JSON.parse(data);
    const player = this.sessions.get(ws)!;

    switch (msg.type) {
      case 'join':
        // Validate, update session, broadcast
        break;
      case 'start-game':
        if (player.isHost) {
          this.gameState = engine.createInitialState(this.getTeamConfig());
          this.broadcast({ type: 'game-state', state: this.gameState });
        }
        break;
      // ... other handlers
    }
  }

  broadcast(message: object) {
    const data = JSON.stringify(message);
    for (const ws of this.sessions.keys()) {
      ws.send(data);
    }
  }

  async alarm() {
    // Handle bid timeout, AFK, etc.
  }
}
```

### Game Engine (pure functions)
```typescript
export function createInitialState(config: GameConfig): GameState { }
export function registerTeam(state: GameState, teamIndex: number, name: string, problem: string): GameState { }
export function placeBid(state: GameState, teamIndex: number, amount: number): GameState { }
export function closeBidding(state: GameState): GameState { }
// ... all state transitions

export function isPhaseComplete(state: GameState): boolean { }
export function getWinners(state: GameState): Winners { }
// ... all queries
```

### Client WebSocket
```typescript
function connect(roomCode: string): void {
  const ws = new WebSocket(`wss://esop-wars.workers.dev/api/rooms/${roomCode}/ws`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', playerName: getPlayerName() }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data) as ServerMessage;
    handleMessage(msg);
  };

  ws.onclose = () => {
    setTimeout(() => connect(roomCode), 1000); // Reconnect
  };

  clientState.ws = ws;
}
```

---

## Timers (Alarms)

Durable Objects use alarms for scheduled execution:

```typescript
// Set alarm (e.g., bid timeout)
await this.state.storage.setAlarm(Date.now() + 10000);

// Fires after delay
async alarm() {
  if (this.gameState?.phase === 'auction') {
    this.gameState = engine.closeBidding(this.gameState);
    this.broadcast({ type: 'bidding-closed', winner: this.gameState.currentBid });
  }
}
```

Use cases:
- Bid timeout (10s after last bid)
- AFK timeout (60s per turn)
- Room cleanup (1hr inactive)

---

## CORS

```typescript
function corsHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
```

---

## Local Development

```bash
# From root - starts both
npm run dev

# Worker only
npm run dev:worker

# Client only
npm run dev:client
```

Wrangler dev supports Durable Objects locally. Vite provides hot reload.
