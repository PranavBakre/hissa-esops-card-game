# V3: Investor Mechanic -- Implementation Plan

## Design Decisions

Decisions made during review of the original design doc (`v3-investor-mechanic.md`):

1. **Rename "valuation" to "capital"** across the codebase. The game's valuation field is used as both company value and spending money -- "capital" better represents this dual nature.

2. **Investment mechanics:**
   - Investor pays $X → their capital decreases by $X.
   - Target receives $X → their capital increases by $X.
   - Investor receives 5% equity in the target company.
   - Return multiple at end of game: `(0.05 × target's final capital) / investmentAmount`.

3. **Sub-phases needed.** The investment phase has distinct stages (declare interest, resolve conflicts, summary) tracked via `investmentSubPhase`.

4. **Conflict resolution is sequential.** When multiple conflicts exist, they resolve one at a time in order of lowest target team index first.

5. **Players can drop out of conflicts.** Both humans and bots can pass/withdraw during conflict bidding via a `pass-investment-bid` message.

6. **One investor per company.** A team can only receive one investor. Intentional design constraint.

7. **Phase placement before seed round.** Investment happens after auction-summary, before seed. This mirrors the original game's pitch round where teams convince others to invest based on conviction, not data.

8. **Best Investor is a separate award.** The `sameTeam` flag remains founder+employer only. Investor award is independent.

9. **Summary uses existing `advance-phase` message.** Same pattern as auction-summary.

10. **Bot bid ceilings stored in GameState.** `investmentBotCeilings` is technically visible via WebSocket inspection but acceptable for a casual game.

11. **Lost auction -- no penalty.** Teams that lose the conflict auction keep their capital intact. Losers don't pay anything.

---

## Implementation Steps

### Step 0: Rename Valuation to Capital

Rename `valuation` → `capital` across all packages:

| Old | New |
|-----|-----|
| `Team.valuation` | `Team.capital` |
| `Team.previousValuation` | `Team.previousCapital` |
| `Team.preExitValuation` | `Team.preExitCapital` |
| `RoundPerformance.previousValuation` | `RoundPerformance.previousCapital` |
| `RoundPerformance.newValuation` | `RoundPerformance.newCapital` |
| `GAME.INITIAL_VALUATION` | `GAME.INITIAL_CAPITAL` |
| `VALUATION` constants object | `CAPITAL` |
| `DEFAULT_INITIAL_VALUATION` | `DEFAULT_INITIAL_CAPITAL` |

All references in game-engine, bot-player, validators, renderer, and constants. This is a mechanical rename with no logic changes.

---

### Step 1: Shared Types (`packages/shared/src/types.ts`)

**Phase type** -- Add `'investment'` to the `Phase` union:
```
| 'investment'
```

**InvestmentSubPhase** -- New type:
```
type InvestmentSubPhase = 'declare' | 'conflict' | 'resolve-tie' | 'summary';
```

- `declare` -- All teams choose a target or pass.
- `conflict` -- Teams competing for the same target bid against each other.
- `resolve-tie` -- Target company owner picks among tied bidders.
- `summary` -- Show final investment results before advancing.

**Team fields** -- Add to `Team` interface:
```
investedInTeamIndex: number | null
investmentAmount: number
investorTeamIndex: number | null
capitalAtInvestment: number    // snapshot of target's capital before transfer (for display)
```

**GameState fields** -- Add to `GameState` interface:
```
// Investment
investmentSubPhase: InvestmentSubPhase
investmentDeclarations: Record<number, number | null>   // teamIndex -> targetTeamIndex (null = pass)
investmentBids: Record<number, number>                  // teamIndex -> bid amount (during conflict)
investmentConflicts: Record<number, number[]>           // targetTeamIndex -> list of competing teamIndexes
investmentTieTarget: number | null                      // which target has a tie needing resolution
investmentBotCeilings: Record<number, number>           // bot teamIndex -> their random max bid
```

**ClientMessage** -- Add:
```
| { type: 'declare-investment'; targetTeamIndex: number | null }
| { type: 'place-investment-bid'; amount: number }
| { type: 'pass-investment-bid' }
| { type: 'resolve-investment-tie'; chosenTeamIndex: number }
```

**CLIENT_MESSAGE_TYPES** -- Add to array in `constants.ts`:
```
'declare-investment',
'place-investment-bid',
'pass-investment-bid',
'resolve-investment-tie',
```

**ServerMessage** -- Add:
```
| { type: 'investment-declared'; teamIndex: number }
| { type: 'investment-conflict'; targetTeamIndex: number; competitors: number[] }
| { type: 'investment-bid-placed'; teamIndex: number; amount: number }
| { type: 'investment-bid-passed'; teamIndex: number }
| { type: 'investment-resolved'; investments: { investor: number; target: number; amount: number }[] }
| { type: 'investment-tie'; targetTeamIndex: number; tiedTeams: { teamIndex: number; amount: number }[] }
```

**Winners** -- Update interface:
```
interface Winners {
  founder: Team;
  employer: Team;
  investor: { team: Team; returnMultiple: number } | null;
  sameTeam: boolean;  // founder + employer only; investor is separate
}
```

**Constants** -- Add to `GAME` in `constants.ts`:
```
INVESTMENT_MIN: 500_000
INVESTMENT_MAX: 1_000_000
INVESTMENT_BID_INCREMENT: 50_000
INVESTOR_EQUITY: 0.05
```

**PHASE_LABELS** -- Add:
```
investment: 'Investment'
```

---

### Step 2: Game Engine (`packages/worker/src/game-engine.ts`)

**Phase order** -- Insert `'investment'` between `'auction-summary'` and `'seed'` in both `advancePhase` and `isPhaseComplete`.

**`advancePhase` initialization** -- When entering `'investment'`:
```
case 'investment':
  newState.investmentSubPhase = 'declare';
  newState.investmentDeclarations = {};
  newState.investmentBids = {};
  newState.investmentConflicts = {};
  newState.investmentTieTarget = null;
  newState.investmentBotCeilings = {};
  break;
```

**`isPhaseComplete`** -- For `'investment'`:
```
case 'investment':
  return newState.investmentSubPhase === 'summary';
```
Summary sub-phase is advanced via the existing `advance-phase` message (same pattern as auction-summary).

**Capital transfer** -- When an investment is finalized:
1. Snapshot target's capital before transfer: `investor.capitalAtInvestment = target.capital`.
2. Deduct from investor: `investor.capital -= investmentAmount`.
3. Add to target: `target.capital += investmentAmount`.

**New engine functions:**

| Function | Purpose |
|----------|---------|
| `declareInvestment(state, teamIndex, targetTeamIndex \| null)` | Record a team's investment choice (or pass). When all declared, compute conflicts and advance sub-phase. |
| `allInvestmentsDeclared(state)` | Check if all active teams have declared. |
| `resolveInvestmentConflicts(state)` | Identify targets with >1 interested investor. If none, finalize. If conflicts, set sub-phase to `'conflict'`. Multiple conflicts resolve sequentially, lowest target team index first. |
| `placeInvestmentBid(state, teamIndex, amount)` | During conflict sub-phase, record a bid. |
| `passInvestmentBid(state, teamIndex)` | During conflict sub-phase, withdraw from the conflict. |
| `allConflictBidsPlaced(state, targetTeamIndex)` | Check if all competitors for a target have bid or passed. |
| `resolveConflictBids(state, targetTeamIndex)` | Find highest bidder. If tie, set sub-phase to `'resolve-tie'`. If all passed, no investment happens for this target. Otherwise finalize that investment. |
| `resolveInvestmentTie(state, targetTeamIndex, chosenTeamIndex)` | Target company owner picks the winner among tied bidders. |
| `finalizeInvestments(state)` | Transfer capital (deduct from investors, add to targets), snapshot target capital, set sub-phase to `'summary'`. |
| `getInvestorWinner(state)` | Compute return multiples and find Best Investor. |

**`getWinners` update** -- Add investor calculation:
```
const investor = getInvestorWinner(state);
```

Where `getInvestorWinner`:
- Filters teams where `investedInTeamIndex !== null`.
- For each, calculates: `(GAME.INVESTOR_EQUITY * targetTeam.capital) / team.investmentAmount`.
- Highest return multiple wins. Tiebreaker: lower `investmentAmount`.
- Returns `null` if no one invested.

**`sameTeam`** remains `founder === employer` only. Investor is a separate, independent award.

**`createInitialState` update** -- Initialize new team fields to defaults:
```
investedInTeamIndex: null
investmentAmount: 0
investorTeamIndex: null
capitalAtInvestment: 0
```

And new GameState fields:
```
investmentSubPhase: 'declare'
investmentDeclarations: {}
investmentBids: {}
investmentConflicts: {}
investmentTieTarget: null
investmentBotCeilings: {}
```

---

### Step 3: Validators (`packages/worker/src/validators.ts`)

| Validator | Rules |
|-----------|-------|
| `validateDeclareInvestment(state, teamIndex, target)` | Phase is `'investment'`, sub-phase is `'declare'`, team hasn't declared yet, team hasn't already invested (`investedInTeamIndex` is null), target is not self, target doesn't already have an investor (`investorTeamIndex` is null), target is valid index or null. |
| `validatePlaceInvestmentBid(state, teamIndex, amount)` | Phase is `'investment'`, sub-phase is `'conflict'`, team is in the current conflict, amount >= $500K, amount <= $1M, amount > current highest bid for this conflict (or equal, creating a tie). |
| `validatePassInvestmentBid(state, teamIndex)` | Phase is `'investment'`, sub-phase is `'conflict'`, team is in the current conflict, team hasn't already passed or bid. |
| `validateResolveInvestmentTie(state, teamIndex, chosenTeamIndex)` | Phase is `'investment'`, sub-phase is `'resolve-tie'`, teamIndex owns the target company, chosenTeamIndex is one of the tied bidders. |

---

### Step 4: Room Handler (`packages/worker/src/room.ts`)

**Message routing** -- Add cases in the message switch:
```
case 'declare-investment':
case 'place-investment-bid':
case 'pass-investment-bid':
case 'resolve-investment-tie':
```

**Handler functions:**

`handleDeclareInvestment(ws, session, targetTeamIndex)`:
1. Validate.
2. Call `declareInvestment()`.
3. Broadcast `investment-declared`.
4. If `allInvestmentsDeclared()`, call `resolveInvestmentConflicts()`.
   - If no conflicts: `finalizeInvestments()`, broadcast `investment-resolved`, advance sub-phase to `'summary'`.
   - If conflicts: broadcast `investment-conflict` for the first conflict (lowest target team index), advance sub-phase to `'conflict'`, schedule bot bids.

`handlePlaceInvestmentBid(ws, session, amount)`:
1. Validate.
2. Call `placeInvestmentBid()`.
3. Broadcast `investment-bid-placed`.
4. If `allConflictBidsPlaced()`, call `resolveConflictBids()`.
   - If tie: broadcast `investment-tie`, set sub-phase to `'resolve-tie'`, schedule bot resolution.
   - If winner: finalize that conflict, check remaining conflicts, proceed to next conflict or finalize.
5. When all conflicts resolved: `finalizeInvestments()`, advance to `'summary'`.

`handlePassInvestmentBid(ws, session)`:
1. Validate.
2. Call `passInvestmentBid()`.
3. Broadcast `investment-bid-passed`.
4. If `allConflictBidsPlaced()`, resolve as above.

`handleResolveInvestmentTie(ws, session, chosenTeamIndex)`:
1. Validate.
2. Call `resolveInvestmentTie()`.
3. Finalize, check remaining conflicts, proceed as above.

**Bot scheduling** -- Add to `scheduleBotTurnIfNeeded()`:
```
case 'investment':
  this.scheduleBotInvestment();
  break;
```

**Spectator auto-advance** -- Add `'investment'` summary to spectator auto-advance (same pattern as `'auction-summary'`).

---

### Step 5: Bot Player (`packages/worker/src/bot-player.ts`)

**New functions:**

`decideInvestmentTarget(state, teamIndex)`:
- If this bot has already invested (`investedInTeamIndex !== null`), always return `null` (pass).
- Filter eligible targets: other active teams that don't already have an investor (`investorTeamIndex` is null).
- If no eligible targets, return `null`.
- Pick uniformly at random among eligible targets (no scoring -- pre-market conviction bet).
- Small chance to pass (~15%).
- Return target team index or `null`.

`decideBotMaxBid(state, teamIndex)`:
- Called once per bot when a conflict starts.
- Randomly pick a personal max bid ceiling between $500K and $1M (uniform random, snapped to $50K increments).
- Store this ceiling in `investmentBotCeilings` on GameState.
- This ensures bots naturally drop out at different price points, creating clear winners without constant tie-breaking.

`decideInvestmentBid(state, teamIndex, targetTeamIndex, currentHighestBid)`:
- Start at $500K minimum (the floor for all investment bids).
- If outbidding: take current highest bid + 1-2 increments ($50K each) + 30-40% randomness on the increment (same pattern as existing auction bot logic).
- If the resulting bid would exceed this bot's personal max ceiling, the bot passes (drops out of the conflict).
- Cap at $1M (the absolute max bid).
- Bots should NOT jump straight to $1M -- they escalate incrementally, creating back-and-forth bidding.
- Return bid amount clamped to [$500K, bot's ceiling], or `null` to pass.

`decideInvestmentTieResolution(state, targetTeamIndex, tiedTeams)`:
- Pick the team that bid more (same as what the design doc says).
- If truly equal, pick randomly.

---

### Step 6: Client Renderer (`packages/client/src/renderer.ts`)

**New render function: `renderInvestment()`**

Sub-phase `'declare'`:
- Grid of all teams showing name, color, segment+idea, employees, capital.
- Your own team is grayed out with "Your team" label.
- If your team has already invested (`investedInTeamIndex !== null`): show "Already invested" message, auto-pass, no buttons.
- Teams that already have an investor (`investorTeamIndex !== null`): card is disabled with "Has investor" label, no "Invest" button.
- Eligible teams (no investor yet): show "Invest" button.
- A "Pass" button to skip investing.
- Once declared, show "Waiting for other teams..."

Sub-phase `'conflict'`:
- Show the contested target company.
- If you're a competitor: bid input ($500K-$1M) with "Place Bid" and "Drop Out" buttons.
- If you're not competing: "Auction in progress..." waiting state.
- Show current highest bid.

Sub-phase `'resolve-tie'`:
- If you own the target company: show the tied investors with their bid amounts, "Choose Investor" buttons.
- Otherwise: "Waiting for [company name] to decide..."

Sub-phase `'summary'`:
- Show all investments: "Team A invested $500K in Team B".
- Show capital changes: "Team A: $20M → $19.5M" / "Team B: $20M → $20.5M".
- Teams that passed: "Team C passed".
- Host can advance (or auto-advance in spectator mode) via existing `advance-phase` message.

**Update `renderWinner()`:**
- Add a third winner card for "Best Investor" if someone invested.
- Show return multiple: e.g., "3.2x return".
- Show which company they invested in.
- `sameTeam` badge only applies to founder + employer.

**New client functions in `app.ts`:**
```
declareInvestment(targetTeamIndex: number | null)
placeInvestmentBid(amount: number)
passInvestmentBid()
resolveInvestmentTie(chosenTeamIndex: number)
```

---

### Step 7: CSS (`packages/client/src/style.css`)

- `.investment-phase` layout (grid of team cards)
- `.investment-card` with team color border
- `.investment-card.self` grayed out style
- `.investment-card.selected` highlight
- `.investment-bid` input styling (reuse auction bid styles)
- `.investment-conflict` auction area
- `.investment-summary` results display
- `.winner-card.investor` card styling (alongside founder/employer)

---

### Step 8: Tests (`packages/worker/src/`)

**game-engine.test.ts:**
- `declareInvestment` records choice correctly.
- `allInvestmentsDeclared` returns true/false properly.
- No conflicts when all targets are unique: investments finalize directly.
- Conflict detected when 2+ teams target the same company.
- `placeInvestmentBid` records bid and rejects invalid amounts.
- `passInvestmentBid` removes team from conflict.
- All competitors passing means no investment for that target.
- Highest bidder wins conflict.
- Tie triggers resolve-tie sub-phase.
- `resolveInvestmentTie` picks the chosen team.
- `finalizeInvestments` transfers capital: deducts from investor, adds to target.
- `finalizeInvestments` snapshots target capital before transfer.
- `getInvestorWinner` returns highest return multiple using `(0.05 * targetFinalCapital) / investmentAmount`.
- `getInvestorWinner` tiebreaker favors lower investment amount.
- `getInvestorWinner` returns null when no one invested.
- Self-investment rejected by engine.
- Team that already invested cannot declare again.
- Target that already has an investor cannot be selected.
- Phase order includes `'investment'` between `'auction-summary'` and `'seed'`.
- Multiple conflicts resolve sequentially (lowest target team index first).

**validators.test.ts:**
- `validateDeclareInvestment` rejects wrong phase, self-target, duplicate declaration, invalid index.
- `validatePlaceInvestmentBid` rejects out-of-range amounts, wrong sub-phase, non-competitor.
- `validatePassInvestmentBid` rejects wrong sub-phase, non-competitor, already acted.
- `validateResolveInvestmentTie` rejects non-owner, invalid choice.

**bot-player.test.ts:**
- `decideInvestmentTarget` returns a valid team index or null, never self, never a team that already has an investor. Always passes if bot already invested. Distribution is approximately uniform (random).
- `decideBotMaxBid` returns a ceiling in [$500K, $1M] snapped to $50K increments.
- `decideInvestmentBid` returns amount in [$500K, bot's ceiling], escalates incrementally, or returns null (drops out) when ceiling exceeded.
- `decideInvestmentTieResolution` returns a valid tied team index.

---

## Implementation Order

| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| 0 | Rename valuation → capital across codebase | -- | Medium |
| 1 | Shared types: Phase, Team fields, GameState fields, messages, constants | 0 | Small |
| 2 | Game engine: new functions, phase order, state init, getWinners update | 1 | Medium |
| 3 | Validators: 4 new validators | 1 | Small |
| 4 | Engine + validator tests | 2, 3 | Medium |
| 5 | Room handler: message routing, handlers, bot scheduling | 2, 3 | Medium |
| 6 | Bot player: 4 new decision functions | 2 | Small |
| 7 | Bot player tests | 6 | Small |
| 8 | Client app.ts: 4 new action functions | 1 | Small |
| 9 | Client renderer: investment phase UI, winner screen update | 8 | Medium |
| 10 | CSS | 9 | Small |
| 11 | Type-check and full test pass | All | Small |

Total: ~12 incremental steps. Step 0 is a prerequisite. Steps 2-3 can be parallel. Steps 6-7 can be parallel with 5.

---

## Edge Cases

| Case | Handling |
|------|---------|
| 2-player game | Only 1 possible target, no conflicts possible. Skip conflict sub-phase. |
| Everyone passes | No investments recorded. Best Investor award not given. Advance to summary immediately. |
| All teams target the same company | Single large auction among all teams. |
| All competitors drop out of a conflict | No investment happens for that target. Move to next conflict or finalize. |
| Bot owns target company in a tie | Bot picks highest bidder (or random if equal). |
| Team is disqualified | Disqualified teams can't declare investments and can't be invested in. |
| Team already has an investor | A team that already has `investorTeamIndex !== null` cannot be targeted for investment. Only one investor per company. |
| Multiple simultaneous conflicts | Resolved sequentially, lowest target team index first. |
| Spectator mode | All bots invest and resolve automatically via alarms. Summary auto-advances. |
