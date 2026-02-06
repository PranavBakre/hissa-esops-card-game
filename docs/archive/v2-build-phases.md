# ESOP Wars v2 - Build Phases

Step-by-step implementation guide. For code patterns and structures, see [v2-architecture.md](v2-architecture.md).

---

## Phase 1: Project Setup + Lobby

**Goal**: Players can create/join rooms and see each other in a lobby.

### Steps

1. **Initialize monorepo**
   ```bash
   npm init -y
   npm pkg set workspaces='["packages/*"]'
   npm install -D concurrently typescript
   mkdir -p packages/{shared,client,worker}/src
   ```

2. **Set up shared package**
   - Create `packages/shared/package.json`
   - Add `types.ts` with RoomState, PlayerSession interfaces
   - Add `constants.ts` with message types

3. **Set up worker package**
   - Create `packages/worker/package.json`
   - Create `wrangler.toml` (see [architecture](v2-architecture.md#worker-configuration))
   - Implement `index.ts` - routing (see [architecture](v2-architecture.md#worker-entry-indexts))
   - Implement `room.ts` - basic DO with WebSocket (see [architecture](v2-architecture.md#durable-object-roomts))

4. **Set up client package**
   ```bash
   cd packages/client
   npm create vite@latest . -- --template vanilla-ts
   npm install @esop-wars/shared@*
   ```

5. **Build lobby UI**
   - Create room button → POST /api/rooms → display code
   - Join room input → connect WebSocket
   - Team picker (5 slots)
   - Player list
   - Start button (host only)

### Done When
- [ ] `npm run dev` starts both worker and client
- [ ] Create room returns a code
- [ ] Two browsers can connect to same room
- [ ] Players see each other in lobby
- [ ] Team selection broadcasts to all
- [ ] Host can click Start (transitions to registration)

---

## Phase 2: Game Engine + Registration

**Goal**: Game logic runs on server. Registration phase works.

### Steps

1. **Create game-engine.ts**
   - `createInitialState(config)` - initialize teams, decks
   - `registerTeam(state, idx, name, problem)` - update team
   - `advancePhase(state)` - move to next phase
   - Keep functions pure (no side effects)

2. **Create validators.ts**
   - `validateRegister(state, player, payload)`
   - Return `{ valid: boolean, error?: string }`

3. **Wire up in room.ts**
   - On `start-game`: create initial state, broadcast
   - On `register-team`: validate, apply, broadcast update
   - Check if all registered → advance to setup

4. **Add bot auto-registration**
   - When game starts, fill empty slots with bots
   - Server registers bots immediately

5. **Client registration UI**
   - Show form for own team only
   - Display other teams' status (registered/pending)
   - Disable form after submitting

### Done When
- [ ] Host starts game → all clients receive game state
- [ ] Each player can register their team
- [ ] Other players see registrations appear in real-time
- [ ] Bots auto-register
- [ ] All teams registered → phase advances to setup

---

## Phase 3: Setup Drafting + Auction

**Goal**: Setup drafting and auction work in multiplayer.

### Steps

1. **Setup drafting in game-engine.ts**
   - `dropCard(state, idx, cardId, isSegment)`
   - `drawCard(state, idx, deckType)`
   - `skipDraw(state, idx)`
   - `lockSetup(state, idx, segmentId, ideaId)`
   - `advanceTurn(state)` - move to next team

2. **Turn enforcement in room.ts**
   - Track `currentTurn` in game state
   - Reject actions from wrong player
   - Broadcast `turn-changed` after each action

3. **Bot turns**
   - Create `bot-player.ts` with decision functions
   - Use alarms to schedule bot actions with delay
   - Execute bot turn, broadcast result

4. **Auction in game-engine.ts**
   - `placeBid(state, idx, amount)`
   - `closeBidding(state)` - award card to winner
   - `skipCard(state)` - no winner

5. **Auction timer**
   - On bid: set alarm for 10s
   - On alarm: close bidding, broadcast result
   - Reset alarm on each new bid

6. **Client UI**
   - Setup: show own cards, enable actions on your turn
   - Show "Waiting for [Team]..." when not your turn
   - Auction: show current card, bid button, timer

### Done When
- [ ] Setup drafting works turn-by-turn
- [ ] Only active player can act
- [ ] Bots take turns with realistic delays
- [ ] Auction bidding is real-time
- [ ] 10s timer closes bidding automatically
- [ ] Cards awarded to highest bidder
- [ ] Game transitions to market rounds

---

## Phase 4: Market Rounds + Finish

**Goal**: Complete game loop through to winner.

### Steps

1. **Wildcard in game-engine.ts**
   - `selectWildcard(state, idx, choice)`
   - `applyWildcards(state, choices)` - apply effects

2. **Parallel wildcard decisions in room.ts**
   - Track pending choices in Map
   - When all submitted, reveal and apply
   - Bots submit choices automatically

3. **Market rounds in game-engine.ts**
   - `drawMarketCard(state)`
   - `applyMarketEffects(state)` - calculate valuations
   - `applyMarketLeaderBonus(state)` - top 2 teams

4. **Secondary auction**
   - `dropEmployee(state, idx, empId)` - parallel drops
   - Reveal all drops, then bidding (same as Phase 3)

5. **Exit phase**
   - `drawExitCard(state)` - apply multiplier
   - `getWinners(state)` - founder + employer

6. **Client UI**
   - Wildcard: show choices, submit button
   - Market: draw button, results display
   - Winner: final standings

### Done When
- [ ] Wildcard decisions work (parallel, hidden until all submit)
- [ ] Market rounds calculate correctly
- [ ] Market leader bonus applies to top 2
- [ ] Secondary auction works
- [ ] Exit phase completes game
- [ ] Winner screen shows both categories

---

## Phase 5: Deploy + Polish

**Goal**: Production deployment.

### Steps

1. **Deploy worker**
   ```bash
   cd packages/worker
   wrangler deploy
   ```

2. **Deploy client**
   ```bash
   # Vercel
   cd packages/client && vercel --prod

   # Or Cloudflare Pages
   wrangler pages deploy packages/client/dist
   ```

3. **Configure CORS**
   - Set `ALLOWED_ORIGIN` in wrangler.toml
   - Test cross-origin requests work

4. **Reconnection**
   - Store playerId + roomCode in localStorage
   - On page load, attempt reconnect
   - Server restores player to their session

5. **AFK handling**
   - Set alarm on turn start (60s)
   - Auto-skip if player doesn't act
   - Notify other players

### Done When
- [ ] Worker deployed to Cloudflare
- [ ] Client deployed (Vercel or CF Pages)
- [ ] CORS configured correctly
- [ ] Full game playable end-to-end
- [ ] Refresh page → reconnect works
- [ ] AFK players auto-skipped

---

## Quick Reference

### Commands
```bash
npm run dev          # Start both
npm run dev:worker   # Worker only
npm run dev:client   # Client only
npm run deploy       # Deploy all
```

### Key Files
| File | Purpose |
|------|---------|
| `packages/worker/src/index.ts` | Routing |
| `packages/worker/src/room.ts` | Durable Object |
| `packages/worker/src/game-engine.ts` | Game logic |
| `packages/client/src/app.ts` | WebSocket client |
| `packages/client/src/renderer.ts` | UI |

See [v2-architecture.md](v2-architecture.md) for code patterns.
See [v2-feature-map.md](v2-feature-map.md) for function reference.
