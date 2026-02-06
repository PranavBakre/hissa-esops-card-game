# ESOP Wars v2 - Multiplayer Proposal

High-level overview of v2 goals and approach. For implementation details, see linked docs.

---

## v2 Documentation Index

| # | Document | Purpose |
|---|----------|---------|
| 1 | **v2-multiplayer-proposal.md** (this file) | Goals, rationale, success criteria |
| 2 | [v2-decisions.md](v2-decisions.md) | Locked decisions and tech stack |
| 3 | [v2-build-phases.md](v2-build-phases.md) | Step-by-step implementation guide |
| 4 | [v2-architecture.md](v2-architecture.md) | Technical reference (structures, protocols, code patterns) |
| 5 | [v2-feature-map.md](v2-feature-map.md) | Function-level reference |

---

## Why v2?

### Current State (v1)

- **Hot-seat**: All players share one device, pass it around
- **Frontend-only**: Game logic runs entirely in browser
- **localStorage**: State tied to single device
- **Limited reach**: Can't play remotely with friends

### Target State (v2)

- **Multi-device**: Each player on their own phone/laptop
- **Real-time**: See other players' actions instantly
- **Room-based**: Share a code, join from anywhere
- **Persistent sessions**: Reconnect if you drop

---

## Core Concept

```
1. Host creates room → Gets code "ESOP-7X3K"
2. Players join via code → Each claims a team
3. Host starts game → Server coordinates everything
4. Players act on their turn → Server validates and broadcasts
5. All clients stay in sync → Game completes
```

---

## Why Cloudflare Workers + Durable Objects?

| Need | Solution |
|------|----------|
| Persistent WebSocket | Durable Objects keep connections open indefinitely |
| Stateful rooms | Each room = one DO instance with its own memory |
| Low latency | Edge compute, runs close to users |
| Simple deploy | Single `wrangler deploy` command |
| Cost effective | Generous free tier |

See [v2-decisions.md](v2-decisions.md) for full tech stack.

---

## What Changes from v1?

### Game Logic
- Moves from browser → server (Durable Object)
- All actions validated server-side
- Bots run on server, not client

### Client
- Becomes "view + input" only
- Receives state via WebSocket
- Sends actions, doesn't compute outcomes

### Phases Adapted for Multiplayer
| Phase | v1 | v2 |
|-------|----|----|
| Registration | One form for all teams | Each player fills their own |
| Setup Drafting | Sequential on one screen | Turn-based, wait indicators |
| Auction | Anyone taps to bid | Real-time bidding, 10s timeout |
| Wildcard | Sequential decisions | Parallel (hidden until all submit) |
| Market | One player clicks draw | Any player triggers, all see result |

---

## Success Criteria

- [ ] 5 players on 5 devices complete a full game
- [ ] Disconnected player can reconnect and continue
- [ ] Bots work seamlessly alongside humans
- [ ] State consistent across all clients
- [ ] Actions feel instant (<100ms latency)

---

## What's Reusable from v1?

Most game logic transfers directly:
- `shuffleArray`, `formatCurrency` - Utilities
- `applyMarketCard`, `applyMarketLeaderBonus` - Market logic
- `bot*Decision` functions - Bot AI
- All card/team/perk data from `data.js`

The rendering code stays in client, adapted to receive state from server instead of computing it locally.

---

---

## Future (v3)

- **MongoDB persistence**: Game history, analytics, leaderboards
- **Spectator mode**: View-only connections
- **Resume games**: Rejoin interrupted games from database

---

## Next Steps

1. Review [v2-decisions.md](v2-decisions.md) - Confirm tech choices
2. Read [v2-architecture.md](v2-architecture.md) - Understand the structure
3. Follow [v2-build-phases.md](v2-build-phases.md) - Build it phase by phase
