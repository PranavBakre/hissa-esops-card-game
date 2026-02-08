# ESOP Wars - Changelog

## v2.2 (2026-02-08)

### Features
- **Remove problem statement from registration** -- Registration now only asks for a startup name. Problem statements were redundant since the team's identity comes from the locked segment + idea combo after setup. (`46ed5ba`)
- **Rework Best Employer award** -- Best Employer is now calculated as `(ESOP% given to employees) x valuation`, rewarding teams that both shared equity generously AND built a high-value company. Previously it just rewarded highest ESOP spent. (`6568fc6`)

### Docs
- **V3 Investor mechanic design doc** -- New feature design for a post-auction investment phase with a "Best Investor" award. (`6568fc6`)

---

## v2.1 (2026-02-08) -- PR #2

### Features
- **Flexible team counts (2-5 players)** -- Games no longer require 5 teams. Hosts can toggle "Fill empty slots with bots" on/off. When off, only human-occupied teams play, with a minimum of 2. (`9c156ff`)
- **Employee deck scaling** -- Employee card pool scales proportionally with team count (8/12/16/18 cards) with balanced category distribution. (`9c156ff`)
- **Market leader scaling** -- Number of market leaders per round scales with team count: `floor(teamCount / 2)`. (`9c156ff`)
- **ESOP refund on employee drop** -- Dropping an employee in the secondary market now refunds 50% of the original bid (floored to whole numbers). (`9e5c4f9`)
- **Unit test suite** -- Added Vitest with 140+ tests covering game engine, validators, and bot player logic. (`bac26c7`, `205726b`)
- **Coverage reporting** -- Added `@vitest/coverage-v8` for test coverage. (`df133f8`)

### Fixes
- **Secondary hire bid guard** -- Players can no longer bid in secondary hire when they already have 3 employees. (`9c156ff`)
- **Wildcard auto-pass** -- Clients now auto-send "pass" when a player's wildcard is already used, instead of showing unusable options. (`9c156ff`)
- **Bot registration guard** -- Bots no longer auto-register when `fillBots` is disabled. (`9e5c4f9`)
- **Registration check robustness** -- Default name detection uses a Set lookup instead of hardcoded index-based array, supporting variable team counts. (`9c156ff`)

### Docs
- **Flexible teams design doc** -- `docs/ideas/v2.1-flexible-teams.md` (`4dc6793`)
- **Testing strategy doc** -- `docs/ideas/testing.md` (`bac26c7`)

---

## v2.0 (2026-02-06) -- PR #1

### Features
- **Real-time multiplayer** -- Complete rewrite from v1 hot-seat to WebSocket-based multiplayer using Cloudflare Workers + Durable Objects. (`98b4795` - `facc450`)
- **Monorepo architecture** -- TypeScript monorepo with `packages/shared`, `packages/worker`, `packages/client`. (`98b4795`)
- **Room system** -- Create/join rooms with room codes, host controls, team selection lobby. (`98b4795`)
- **Bot players** -- AI-controlled teams fill empty slots with decision logic for all game phases. (`a634390`)
- **Full game loop** -- Registration, setup drafting, auction, seed/early/mature market rounds, wildcards, secondary market, exit, and winner phases. (`a634390`, `5de4f96`)
- **Spectator mode** -- Watch bot-only games with configurable speed (normal, fast, instant). (`0bd901e`)
- **Game speed control** -- Host can set game speed affecting bot action delays. (`0bd901e`)
- **Durable Object persistence** -- Game state survives worker restarts via Cloudflare Durable Object storage. (`d15c2a0`)
- **Setup drafting** -- 1 segment + 4 ideas dealt per team, 3 rounds of drop/draw, then lock choices with setup bonus detection. (`6af04af`)
- **Auction with pass** -- Bid ESOP to hire employees, with pass option and $1M penalty per missing employee. (`f688ba7`)
- **Deployment pipeline** -- Custom domain configuration for client and worker. (`facc450`)

### UI
- **UI facelift** -- Phase intro banners, updated home/lobby screens, new fonts. (`5d27cba`)
- **About modal** -- Structured credits and game description. (`3b3fb81`)
- **Spectator layout** -- Adjusted header layout and scroll behavior for spectator mode. (`6e1410c`)

---

## v2.0-hotfix (2026-02-06)

### Fixes
- **Play Again button** -- Fixed to properly call `leaveRoom()` via event listener instead of broken inline handler. (`6c5babd`)
- **Exit phase rework** -- Changed from simultaneous to turn-based card drawing for fairer exit card distribution. (`919297c`)

### Chores
- Remove wrangler dev dependency from worker package. (`76bc106`)
- GitHub Pages deployment action. (`78fb39d`)
- Moved docs to archive. (`338d4fc`)

---

## v1.0 (2026-02-01 - 2026-02-04)

### Features
- **Hot-seat card game** -- Single-browser multiplayer using vanilla HTML/CSS/JS with localStorage. (`8c3f7fc`, `7e84e17`)
- **Core game mechanics** -- 5 iterations building out segments, ideas, employees, market rounds, wildcards, and exit cards. (`11e4c9a` - `8b63bd6`)
- **Bot AI for single player** -- Automated opponent logic. (`b3e9ef5`)
- **Game restart** -- Restart with confirmation dialog. (`96adc3a`)

### Docs
- **Project documentation** -- Code organization rules, architecture overview, feature mapping. (`d0e8e17`, `b6287ce`)

---

## v0.0 (2026-02-01)

- Project initialized. (`1f1afd0`)
