# Claude.md - ESOP Wars

## Project Overview

ESOP Wars is a multiplayer card game where 5 teams compete to build the highest-valued startup by bidding equity (ESOP) to hire employees, surviving market conditions, and exiting successfully.

## Versions

| Version | Location | Tech Stack |
|---------|----------|------------|
| v1 (legacy) | `v1/` | Vanilla HTML/CSS/JS, hot-seat multiplayer, localStorage |
| v2 (active) | `packages/` | TypeScript monorepo, Cloudflare Workers, real-time multiplayer |

## Documentation

| Document | Purpose |
|----------|---------|
| `rules/code_organization.md` | Documentation workflow, feature-map tagging system |
| `docs/architecture.md` | v1 code structure, game state shape, phase flow |
| `docs/feature-map.md` | v1 features and functions |
| `docs/ideas/v2-*.md` | v2 architecture, build phases, decisions |

## v2 Source Files (packages/)

| Package | Purpose |
|---------|---------|
| `packages/shared/` | Shared types and constants |
| `packages/worker/` | Cloudflare Workers + Durable Objects backend |
| `packages/client/` | Vite + TypeScript frontend |

## v1 Source Files (v1/)

| File | Purpose |
|------|---------|
| `v1/index.html` | Entry point, modal markup |
| `v1/style.css` | All styling |
| `v1/data.js` | Static game data |
| `v1/game.js` | Game logic, state management, UI |

## Code Rules

- **No type assertions** - Never use `as` keyword or type assertions in TypeScript. Use proper typing, type guards, or generics instead.
- **Docs first, code second** - When building something new, write the documentation first, get user approval, then implement.

## Development

```bash
npm run dev          # Start both worker and client
npm run dev:worker   # Worker only (port 8787)
npm run dev:client   # Client only (port 3000)
```
