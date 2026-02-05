# v2 Feature Map

Function-level reference for Cloudflare Workers + Durable Objects implementation.

---

<!-- @feature Worker @iteration v2.0 { -->
## Worker (Router)

Routes requests to Durable Objects.

### Functions (`packages/worker/src/index.ts`)
| Function | Purpose |
|----------|---------|
| `fetch(request, env)` | Main entry, routes requests |
| `generateRoomCode()` | Create unique 4-char code |
| `handleCORS(request)` | Add CORS headers |

### Routes
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/rooms` | Create new room |
| GET | `/api/rooms/:code` | Get room info |
| GET | `/api/rooms/:code/ws` | WebSocket upgrade |

<!-- } @feature-end Worker -->

---

<!-- @feature DurableObject @iteration v2.0 { -->
## Durable Object (GameRoom)

One instance per room. Manages connections, state, and game logic.

### Class (`packages/worker/src/room.ts`)
```typescript
class GameRoom {
  state: DurableObjectState
  sessions: Map<WebSocket, PlayerSession>
  roomState: RoomState
  gameState: GameState | null
}
```

### Methods
| Method | Purpose |
|--------|---------|
| `constructor(state)` | Initialize DO |
| `fetch(request)` | Handle HTTP/WebSocket |
| `handleMessage(ws, data)` | Route incoming messages |
| `broadcast(message)` | Send to all clients |
| `send(ws, message)` | Send to one client |
| `alarm()` | Handle timers |
| `getPlayers()` | List connected players |
| `getTeams()` | Get team config for game start |

### WebSocket Handlers (inside `handleMessage`)
| Message Type | Handler Logic |
|--------------|---------------|
| `join` | Add player to session, broadcast |
| `select-team` | Claim team slot |
| `start-game` | Init game state, broadcast |
| `register-team` | Validate, update state |
| `drop-card` | Validate turn, update state |
| `place-bid` | Validate, update, set alarm |
| `select-wildcard` | Track pending, reveal when all |

<!-- } @feature-end DurableObject -->

---

<!-- @feature GameEngine @iteration v2.0 { -->
## Game Engine

Pure functions for game logic. No I/O, no side effects.

### Functions (`packages/worker/src/game-engine.ts`)
| Function | Purpose |
|----------|---------|
| `createInitialState(config)` | Initialize game state |
| `registerTeam(state, idx, name, problem)` | Register team |
| `dropCard(state, idx, cardId, isSegment)` | Drop setup card |
| `drawCard(state, idx, deckType)` | Draw from deck |
| `skipDraw(state, idx)` | Pass on drawing |
| `lockSetup(state, idx, segId, ideaId)` | Lock selections |
| `placeBid(state, idx, amount)` | Place auction bid |
| `closeBidding(state)` | Award card to winner |
| `skipCard(state)` | Skip current card |
| `selectWildcard(state, idx, choice)` | Record wildcard choice |
| `applyWildcards(state, choices)` | Apply all wildcard effects |
| `drawMarketCard(state)` | Draw and apply market |
| `applyMarketEffects(state)` | Calculate valuations |
| `applyMarketLeaderBonus(state)` | Top 2 bonus |
| `dropEmployee(state, idx, empId)` | Drop employee |
| `drawExitCard(state)` | Draw exit card |
| `advancePhase(state)` | Move to next phase |
| `advanceTurn(state)` | Move to next turn |

### Query Functions
| Function | Purpose |
|----------|---------|
| `isPhaseComplete(state)` | Check if phase done |
| `getWinners(state)` | Get founder + employer |
| `canTeamAct(state, idx)` | Check if team can act |
| `getCurrentCard(state)` | Get auction card |
| `getActiveTeams(state)` | Non-disqualified teams |

<!-- } @feature-end GameEngine -->

---

<!-- @feature Validators @iteration v2.0 { -->
## Validators

Action validation before applying to state.

### Functions (`packages/worker/src/validators.ts`)
| Function | Purpose |
|----------|---------|
| `validateJoin(room, playerId, name)` | Check join allowed |
| `validateSelectTeam(room, playerId, idx)` | Check team available |
| `validateStartGame(room, playerId)` | Check host + ready |
| `validateRegister(state, player, payload)` | Check registration |
| `validateDropCard(state, player, payload)` | Check drop action |
| `validateDrawCard(state, player, payload)` | Check draw action |
| `validateBid(state, player, payload)` | Check bid valid |
| `validateWildcard(state, player, payload)` | Check wildcard |
| `isPlayersTurn(state, teamIndex)` | Check turn |
| `hasEnoughEsop(team, amount)` | Check ESOP |

### Return Type
```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

<!-- } @feature-end Validators -->

---

<!-- @feature BotPlayer @iteration v2.0 { -->
## Bot Player

AI decisions for bot-controlled teams. Runs in Durable Object.

### Functions (`packages/worker/src/bot-player.ts`)
| Function | Purpose |
|----------|---------|
| `decideRegistration(team)` | Generate name + problem |
| `decideSetupDrop(state, idx)` | Choose card to drop |
| `decideSetupDraw(state, idx)` | Choose deck or pass |
| `decideSetupLock(state, idx)` | Choose segment + idea |
| `decideBid(state, idx, card)` | Bid amount or pass |
| `decideWildcard(state, idx)` | Choose wildcard option |
| `decideSecondaryDrop(state, idx)` | Choose employee to drop |
| `decideSecondaryBid(state, idx, card)` | Bid or pass |

### Bot Scheduling (in room.ts)
| Function | Purpose |
|----------|---------|
| `scheduleBotAction(delay)` | Set alarm for bot turn |
| `executeBotTurn()` | Run bot decision + apply |

### Timing
| Constant | Value | Purpose |
|----------|-------|---------|
| `BOT_MIN_DELAY` | 800ms | Minimum think time |
| `BOT_MAX_DELAY` | 2500ms | Maximum think time |
| `BOT_BID_DELAY` | 500ms | Delay between bids |

<!-- } @feature-end BotPlayer -->

---

<!-- @feature Types @iteration v2.0 { -->
## Types

Shared TypeScript interfaces. Used by both client and worker.

### File: `packages/shared/src/types.ts`

```typescript
// Room
interface RoomState { code, status, hostPlayerId, players, gameState }
interface PlayerSession { playerId, playerName, teamIndex, isHost, connected }

// Game
interface GameState { phase, teams, currentTurn, decks, ... }
interface Team { name, color, esopRemaining, valuation, employees, ... }
interface Card { id, name, ... }

// Messages
interface ClientMessage { type: string, ... }
interface ServerMessage { type: string, ... }

// Config
interface GameConfig { teams: TeamConfig[] }
interface TeamConfig { name, color, playerId?, isBot }
```

<!-- } @feature-end Types -->

---

<!-- @feature ClientApp @iteration v2.0 { -->
## Client App

Browser application with WebSocket connection. TypeScript + Vite (no framework).

### Functions (`packages/client/src/app.ts`)
| Function | Purpose |
|----------|---------|
| `init()` | Initialize app, check reconnect |
| `connect(roomCode)` | Establish WebSocket |
| `send(message)` | Send to server |
| `handleMessage(msg)` | Route server messages |
| `createRoom()` | Call API, get code |
| `joinRoom(code)` | Connect to room |
| `render()` | Render current state |

### Message Handlers
| Message Type | Handler |
|--------------|---------|
| `room-joined` | Store room state, render lobby |
| `player-joined` | Update player list |
| `game-state` | Store state, render |
| `team-updated` | Update team, render |
| `turn-changed` | Update turn indicator |
| `bid-placed` | Update bid display |
| `error` | Show error toast |

<!-- } @feature-end ClientApp -->

---

<!-- @feature ClientRenderer @iteration v2.0 { -->
## Client Renderer

UI rendering functions (adapted from v1 game.js).

### Functions (`packages/client/src/renderer.ts`)
| Function | Purpose |
|----------|---------|
| `render()` | Main dispatcher |
| `renderLobby()` | Lobby UI |
| `renderRegistration()` | Registration phase |
| `renderSetupPhase()` | Setup drafting |
| `renderSetupLock()` | Lock selection |
| `renderAuction()` | Auction phase |
| `renderMarketRound()` | Market phase |
| `renderWildcardPhase()` | Wildcard decisions |
| `renderSecondaryDrop()` | Secondary drop |
| `renderSecondaryHire()` | Secondary hire |
| `renderExit()` | Exit phase |
| `renderWinner()` | Winner screen |
| `renderWaiting(message)` | "Waiting for..." overlay |

<!-- } @feature-end ClientRenderer -->

---

## File → Feature Mapping

| File | Features |
|------|----------|
| `packages/shared/src/types.ts` | Shared types |
| `packages/shared/src/constants.ts` | Phases, message types |
| `packages/worker/src/index.ts` | Worker |
| `packages/worker/src/room.ts` | DurableObject |
| `packages/worker/src/game-engine.ts` | GameEngine |
| `packages/worker/src/validators.ts` | Validators |
| `packages/worker/src/bot-player.ts` | BotPlayer |
| `packages/worker/src/data.ts` | Card data |
| `packages/client/src/app.ts` | ClientApp |
| `packages/client/src/renderer.ts` | ClientRenderer |
| `packages/client/src/data.ts` | Card data (display) |
