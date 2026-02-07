# ESOP Wars - Testing Strategy

Add unit and integration tests for game logic, validators, and bot AI. Start with the highest-value targets: pure functions in the worker package that contain all game rules.

---

## Setup

### Framework

**Vitest** — already compatible with the Vite + TypeScript toolchain. Runs `.test.ts` files with zero config.

Install at the workspace root:

```bash
npm install -D vitest
```

### Scripts

```jsonc
// package.json (root)
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Test Location

Co-locate tests next to source files:

```
packages/worker/src/
  game-engine.ts
  game-engine.test.ts
  validators.ts
  validators.test.ts
  bot-player.ts
  bot-player.test.ts
```

---

## Priority 1: Game Engine (`game-engine.test.ts`)

Pure functions, no side effects, no mocks needed. Highest coverage value.

### State Creation

| Test | What it verifies |
|------|-----------------|
| `createInitialState` creates correct number of teams | Teams array length matches config |
| Initial team values are set correctly | Valuation, ESOP, empty employees, etc. |
| Employee deck scales with team count (2 teams = 8 cards) | `buildEmployeeDeck` proportional selection |
| Employee deck scales with team count (3 teams = 12 cards) | Category balance at 3 teams |
| Employee deck scales with team count (4 teams = 16 cards) | Category balance at 4 teams |
| Employee deck at 5 teams uses all 18 cards | Full deck, no subsetting |
| Category distribution is balanced per team count | Check each category count matches `EMPLOYEE_DISTRIBUTION` |
| Segment, idea, market decks are shuffled | Decks are present and contain expected card counts |
| Reserve employees are not in the main deck | `reserveEmployees` are separate |

### Registration

| Test | What it verifies |
|------|-----------------|
| `registerTeam` updates name and problem | Team fields change |
| `isPhaseComplete('registration')` false when teams have default names | Uses default name set check |
| `isPhaseComplete('registration')` true when all teams renamed | All non-default names |

### Setup Phase

| Test | What it verifies |
|------|-----------------|
| `initSetupPhase` deals 1 segment + 4 ideas per team | Hand composition |
| `dropCard` removes card from hand, adds to discard | Hand shrinks, discard grows |
| `drawCard` pulls from correct deck | Segment vs idea deck |
| `skipDraw` advances turn without drawing | Turn increments, hand unchanged |
| `advanceSetupTurn` wraps around and increments round | Round counter, turn reset |
| Setup completes after 3 rounds | `isPhaseComplete` returns true |
| `lockSetup` sets locked segment and idea | Team lock fields populated |
| `lockSetup` applies setup bonus if matching | `team.setupBonus` set |
| `lockSetup` no bonus for non-matching combo | `team.setupBonus` null |

### Auction

| Test | What it verifies |
|------|-----------------|
| `placeBid` sets current bid | Bid amount and team index |
| `placeBid` rejects bid lower than current | State unchanged |
| `placeBid` rejects bid exceeding ESOP | State unchanged |
| `closeBidding` awards card to winner | Employee added, ESOP deducted |
| `closeBidding` with no bids skips card | Card index increments, no hire |
| `closeBidding` marks team complete at 3 employees | `isComplete` flag |
| `closeBidding` ends auction when all teams full | Phase becomes `auction-summary` |
| `skipCard` ends auction when all teams full | Phase becomes `auction-summary` |
| `skipCard` ends auction when cards exhausted | Phase becomes `auction-summary` |
| Missing employee penalty applied ($1M each) | Valuation reduced |
| Ops ESOP discount (10%) applied after first ops hire | Effective cost reduced |

### Market Rounds

| Test | What it verifies |
|------|-----------------|
| `drawMarketCard` pops from deck | Deck shrinks, `currentMarketCard` set |
| `applyMarketEffects` changes valuations based on employees | Valuation changes, performance recorded |
| Setup bonus modifier applied during market | Higher valuation for matching bonus |
| Sales synergy (+5% with 2+ Sales) | Bonus applied |
| Finance crash shield (25% loss reduction) | Reduced negative change |
| Engineering scaling bonus during Rapid Scaling | Extra bonus per engineering employee |
| `applyMarketLeaderBonus` awards top N teams | N = `floor(teamCount/2)` |
| Market leader count: 2 teams → 1 leader | Only top gainer gets bonus |
| Market leader count: 3 teams → 1 leader | Same |
| Market leader count: 4 teams → 2 leaders | Top 2 gainers |
| Market leader count: 5 teams → 2 leaders | Unchanged from before |
| Leader gets 20% valuation bonus | Valuation increased |

### Wildcards

| Test | What it verifies |
|------|-----------------|
| `selectWildcard` records choice | `teamWildcardSelections` updated |
| Can't use wildcard if already used (forced to pass) | Selection becomes `pass` |
| `allWildcardsSelected` checks all active teams | Returns true when all selected |
| `applyWildcards` marks wildcards as used | `wildcardUsed = true` |
| Double-down doubles the round gain/loss | Valuation doubled from round change |
| Shield reverts losses | Valuation restored to pre-market |
| Shield does nothing on gains | Valuation unchanged |
| Pass has no effect | No valuation change |

### Secondary Market

| Test | What it verifies |
|------|-----------------|
| `dropEmployee` removes employee from team | Employees array shrinks |
| `dropEmployee` refunds 50% of bid ESOP | `esopRemaining` increases |
| `dropEmployee` adds to dropped list | `droppedEmployees` grows |
| `populateSecondaryPool` includes dropped + reserves | Pool = dropped employees + 3 reserves |
| `closeSecondaryBidding` awards card to winner | Employee added from pool |
| Secondary auction ends when pool exhausted | Pool empty |

### Exit

| Test | What it verifies |
|------|-----------------|
| `drawExit` assigns card and advances turn | `exitChoice` set, `currentExitTurn` moves |
| `allExitsChosen` true when all active teams drawn | Skips disqualified teams |
| `applyExitMultipliers` multiplies valuations | IPO = 2x, Fire Sale = 0.5x, etc. |
| Phase advances to `winner` after exit | Phase is `winner` |

### Phase Flow

| Test | What it verifies |
|------|-----------------|
| `advancePhase` follows correct order | Each phase transitions to the next |
| Full game simulation (2 teams, no bots) | Runs through all phases without errors |
| Full game simulation (5 teams) | Runs through all phases without errors |

---

## Priority 2: Validators (`validators.test.ts`)

Thin wrappers but important for guarding game integrity.

| Test | What it verifies |
|------|-----------------|
| `validatePlaceBid` rejects full team | `employees.length >= 3` |
| `validatePlaceBid` rejects zero/negative bid | `amount <= 0` |
| `validatePlaceBid` rejects bid over ESOP | Insufficient ESOP |
| `validatePlaceBid` rejects bid not higher than current | Must outbid |
| `validatePlaceBid` rejects wrong phase | Not in auction/secondary-hire |
| `validateDropCard` rejects wrong turn | `setupDraftTurn !== teamIndex` |
| `validateDropCard` rejects card not in hand | Card ID not found |
| `validateLockSetup` rejects already locked team | Already has locked segment/idea |
| `validateSelectWildcard` rejects if already selected this round | Duplicate selection |
| `validateSelectWildcard` rejects used wildcard (non-pass) | `wildcardUsed && choice !== 'pass'` |
| `validateDropEmployee` rejects already dropped | One drop per round |
| `validateDrawExit` rejects wrong turn | `currentExitTurn !== teamIndex` |
| `validateDrawExit` rejects already drawn | `exitChoice !== null` |

---

## Priority 3: Bot Player (`bot-player.test.ts`)

Bot decisions involve randomness, so tests verify constraints and boundaries rather than exact outcomes.

| Test | What it verifies |
|------|-----------------|
| `decideSetupDrop` returns valid card from hand | Returned card ID exists in hand |
| `decideSetupDrop` returns null for empty hand | No crash |
| `decideSetupDraw` returns valid deck type | `segment` or `idea` when decks have cards |
| `decideSetupDraw` returns skip when both decks empty | `action: 'skip'` |
| `decideSetupLock` picks best bonus combo when available | Returns segment + idea with highest bonus |
| `decideSetupLock` returns null if missing segments/ideas | No crash |
| `decideBid` passes when team is full | `action: 'pass'` |
| `decideBid` never exceeds ESOP remaining | `amount <= esopRemaining` |
| `decideBid` reserves budget for remaining hires | Doesn't blow entire budget on one card |
| `decideWildcard` passes when already used | Returns `'pass'` |
| `decideSecondaryDrop` returns lowest value employee | Returns valid employee ID |
| `decideSecondaryDrop` returns null for empty roster | No crash |
| `getBotDelay` respects minimum floor of 10ms | Even at instant speed |

---

## Priority 4: Integration Tests (Future)

These require more setup (mocking WebSocket, Durable Object state) and can come later.

| Area | What to test |
|------|-------------|
| Room lifecycle | Create → join → select team → start game → play through |
| `fillBots=false` flow | 2-player game creates only 2 teams, indices remapped |
| `fillBots=true` flow | Empty slots become bots, 5 teams always |
| Bot game (spectator) | All bots play through to winner phase |
| Reconnection | Player disconnects and reconnects mid-game |
| Alarm-driven bot turns | Bot actions fire in correct order |

---

## Test Helpers

### `createTestState(overrides?)`

Factory function that returns a valid `GameState` with sensible defaults, accepting partial overrides. Avoids repeating boilerplate in every test.

```typescript
function createTestConfig(teamCount: number, options?: { bots?: boolean[] }): GameConfig
function createTestState(teamCount?: number): GameState
```

### Deterministic shuffling

For tests that need predictable deck order, mock `Math.random` or provide a seeded shuffle to the engine. Vitest supports `vi.spyOn(Math, 'random')`.

---

## What We Don't Test

- **Client rendering** — Vanilla DOM, no JSDOM benefit. Visual correctness verified manually.
- **WebSocket transport** — Integration concern, not unit-testable without a full Durable Object mock.
- **CSS / styling** — Manual/visual testing only.
- **Cloudflare-specific APIs** (`DurableObjectState`, `storage`, `alarm`) — Would need `miniflare` for integration tests (future).
