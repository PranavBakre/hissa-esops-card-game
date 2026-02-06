# ESOP Wars v2 - Decisions

Locked decisions for v2 implementation. These are final.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | TypeScript + Vite (no framework) |
| Frontend Hosting | Vercel or Cloudflare Pages |
| Backend | Cloudflare Workers |
| WebSocket + State | Durable Objects |
| Monorepo | npm workspaces |

---

## Gameplay Decisions

### Auction Bidding: Team-Based Parallel
- All teams decide simultaneously each round
- 20 second timeout per round
- Auto-pass on timeout expiry
- No bids → advance to next card

### Bot Execution: Server-Side
- All bot logic runs in Durable Object
- Consistent behavior regardless of host
- Human-like delays (800-2500ms)
- Bots fill unclaimed team slots when game starts

### Client Behavior: Server-Authoritative
- No client-side prediction
- UI waits for server confirmation on all actions
- 30 second reconnection grace period
- Disconnected players can rejoin within grace period

### Wildcard Phase: Parallel Decisions
- All players submit decisions simultaneously
- State updates atomically when all submit (or timeout)
- No reveal animation in v2

### Spectators: Architecture Prepared
- Only 5 team slots per room in v2
- No view-only mode in v2
- Include `role` field in player data now (player/spectator)
- Enables spectator support in v2.1 without refactoring

### Persistence: In-Memory Only
- Rooms exist in DO memory
- No database for v2
- Rooms cleanup after game completion
- Game state lost on DO eviction (rare)
- Future: MongoDB for result persistence

---

## Not in v2 Scope

- User accounts / authentication
- Spectator mode
- Game history / replay
- Leaderboards
- Mobile app (web only)
- Voice / video chat

---

## Why These Choices?

**TypeScript + Vite (no framework)**
- Type safety without framework overhead
- Fast dev server, minimal config
- Can share types between client and worker

**Cloudflare Workers + Durable Objects**
- Persistent WebSocket (no timeouts)
- Each room is isolated DO instance
- Edge compute = low latency
- Simple deployment
- Generous free tier

**Monorepo with npm workspaces**
- Shared types between packages
- Single `npm run dev` starts everything
- Coordinated deployments
