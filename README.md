# ESOP Wars

A multiplayer card game where 5 teams compete to build the highest-valued startup by bidding equity (ESOP) to hire employees, surviving market conditions, and exiting successfully.

## How It Works

1. **Registration** - Name your startup and describe your problem statement
2. **Setup Drafting** - Draft segment and idea cards to define your startup's identity
3. **Auction** - Bid ESOP equity to hire employees (up to 3 per team)
4. **Market Rounds** (Seed, Early, Mature) - Market cards affect valuations based on your employees' skills
5. **Secondary Market** - Drop and re-hire employees in a second auction
6. **Exit** - Draw an exit card (IPO, Acquisition, Merger, Downround, or Fire Sale) that multiplies your final valuation

**Best Founder** wins with the highest valuation. **Best Employer** wins by sharing the most equity.

## Tech Stack

| Layer    | Technology                            |
| -------- | ------------------------------------- |
| Frontend | TypeScript, Vite                      |
| Backend  | Cloudflare Workers, Durable Objects   |
| Realtime | WebSockets                            |
| Shared   | TypeScript types and constants        |

## Project Structure

```
├── packages/
│   ├── shared/    # Shared types and constants
│   ├── worker/    # Cloudflare Workers backend
│   └── client/    # Vite + TypeScript frontend
├── v1/            # Legacy version (vanilla JS, hot-seat multiplayer)
└── docs/          # Architecture and feature documentation
```

## Getting Started

```bash
npm install
npm run dev        # Start worker (port 8787) and client (port 3000)
```

Or run them individually:

```bash
npm run dev:worker   # Worker only
npm run dev:client   # Client only
```

## Other Commands

```bash
npm run build        # Build all packages
npm run typecheck    # Type-check all packages
npm run deploy       # Deploy worker + client to Cloudflare
```

## Game Modes

- **Multiplayer** - Create a room, share the 4-letter code, and play with friends. Empty slots are filled with bots.
- **Watch Bot Game** - Spectate a fully automated game with adjustable speed (Normal / Fast / Instant).
