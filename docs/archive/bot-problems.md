# Bot Teams Implementation - Problems & Solutions

## Problem 1: Teams Not Getting Ideas During Setup

**Issue**: Team 4 ended up with no idea cards during setup draft.

**Root Cause**: The initial deal tried to give 20 ideas (5 teams × 4 cards) but only 16 idea cards existed in `data.js`.

**Solution**: Expanded idea cards from 16 to 24 (12 products + 12 services) by adding:
- 4 new products: IoT Platform, Collaboration Tool, E-commerce Engine, Cloud Infrastructure
- 4 new services: Insurance Services, Legal Services, Customer Support, Data Services

---

## Problem 2: "Bids Must Be Higher Than Current Bid" Error

**Issue**: Bots were placing invalid bids that were equal to or lower than the current bid.

**Root Cause**: Race condition where a bot's calculated bid became stale between decision time and execution time (another bot had already bid higher).

**Solution**: Added verification before placing bids:
```javascript
if (selectedBid.bid > gameState.currentBid.amount) {
  placeBid(selectedBid.teamIndex, selectedBid.bid);
}
```

---

## Problem 3: "No Bids Placed" Causing Game Freeze

**Issue**: In spectator mode (all bots), when no one bid on an employee, the game would freeze.

**Root Cause**: `closeBidding()` was called but it returned early when `currentBid.teamIndex === null`, leaving the game stuck.

**Solution**: Call `skipCard()` instead when no bids are placed:
```javascript
if (gameState.currentBid.teamIndex === null) {
  skipCard();  // Move to next employee
} else {
  closeBidding();
}
```

---

## Problem 4: Bots Only Hiring 1 Employee

**Issue**: Bots would hire one employee and then stop, ending the game with teams having only 1 employee each.

**Root Cause**: Original bidding formula allowed spending ~7.5% on the first employee (62.5% of 12% total budget), leaving insufficient ESOP for remaining hires. A bot with 12% budget might bid 7.5% on the first employee, leaving only 4.5% for 2 more hires.

**Solution**: Implemented strict per-employee budget:
```javascript
const employeesNeeded = 3 - team.employees.length;
const maxPerHire = team.esopRemaining / employeesNeeded;
```

Also added randomized variance (±30%) and "desperation bidding" (15-45% chance to bid minimum even when outbid) to ensure variety while still completing hires.

---

## Problem 5: Secondary Drop Phase Not Advancing

**Issue**: After the main auction, if no team had more than 2 employees, the secondary-drop phase would render but never advance to secondary-hire.

**Root Cause**: `executeBotDropPhase()` only executed drops for teams with >2 employees. When no team met this criteria, the function did nothing and the phase never advanced.

**Solution**: Added auto-advance logic when no drops are needed:
```javascript
if (teamsNeedingDrop.length === 0) {
  console.log('No teams need to drop - advancing to secondary-hire');
  setTimeout(() => {
    gameState.phase = "secondary-hire";
    gameState.secondaryPool = [...gameState.droppedEmployees, ...gameState.reserveEmployees];
    gameState.secondaryHired = [];
    saveState();
    render();
  }, BOT_TIMING.actionDelay);
  return;
}
```

---

## Problem 6: Infinite Loop When No Bot Can Bid

**Issue**: In secondary-hire phase, if no bot could afford to bid on the selected card, the game would get stuck in an infinite loop.

**Root Cause**: When no bids were placed, the card was skipped but NOT removed from the pool. `autoSelectSecondaryCard` would then select the same "best" card again, creating an infinite loop.

**Solution**: Remove skipped cards from the pool:
```javascript
// No bids placed - remove this card from pool and try next
const cardIndex = gameState.secondaryPool.findIndex(
  (e) => e.id === gameState.selectedSecondaryCard
);
if (cardIndex !== -1) {
  gameState.secondaryPool.splice(cardIndex, 1);
}
```

---

## Problem 7: Game Stuck When Secondary Pool Exhausted

**Issue**: If the secondary pool ran out before all teams had 3 employees, the game would get stuck because `autoSelectSecondaryCard` would just return when the pool was empty.

**Root Cause**: No handling for the case where pool is empty but teams still need employees.

**Solution**: Created `finishSecondaryHire()` function that applies penalties and advances the game:
```javascript
function finishSecondaryHire() {
  gameState.teams.forEach((team) => {
    if (team.isDisqualified) return;
    const missingEmployees = 3 - team.employees.length;
    if (missingEmployees > 0) {
      const penalty = missingEmployees * 1000000;
      team.valuation = Math.max(0, team.valuation - penalty);
      team.hiringPenalty = (team.hiringPenalty || 0) + penalty;
    }
  });
  gameState.phase = "mature";
  saveState();
  render();
}
```

Called from:
- `autoSelectSecondaryCard()` when pool is empty
- `executeBotSecondaryBidding()` when pool is empty after skipping
- `closeSecondaryBidding()` when pool is empty after awarding

---

## Problem 8: Same Bot Always Winning Auctions

**Issue**: The same bot would consistently win every auction because bids were deterministic.

**Root Cause**: Bot bid calculations were based purely on employee value without any variance, so the bot with the most remaining ESOP would always outbid others.

**Solution**: Added randomized variance factor:
```javascript
const variance = 0.7 + Math.random() * 0.6;  // 0.7 to 1.3 (±30%)
maxBid = Math.min(maxBid * variance, team.esopRemaining);
```

Also added "desperation chance" - a probability that a bot will bid minimum even when outbid:
```javascript
const desperationChance = 0.15 + (0.3 * (1 - team.esopRemaining / 12));
if (Math.random() < desperationChance) {
  return { bid: minBid, rationale: `Desperate bid...` };
}
```

---

## Design Decision: Penalties vs Disqualification

**Original Approach**: Teams with fewer than 3 employees were disqualified from the game.

**Problem**: This was too harsh and could eliminate teams for circumstances outside their control (e.g., running out of ESOP in a bidding war).

**Final Approach**: Apply a $1M valuation penalty per missing employee instead:
```javascript
const missingEmployees = 3 - team.employees.length;
if (missingEmployees > 0) {
  const penalty = missingEmployees * 1000000;
  team.valuation = Math.max(0, team.valuation - penalty);
  team.hiringPenalty = penalty;
}
```

This keeps teams in the game but with a significant competitive disadvantage.

---

## Configurable Bot Timing

To allow speeding up bot actions during testing or for impatient users:

```javascript
const BOT_TIMING = {
  thinkingDelay: 600,   // Time showing "thinking" overlay
  actionDelay: 400,     // Time between bot actions
  turnDelay: 500,       // Time before starting bot turn
  auctionDelay: 500,    // Time between auction bids
  lockStagger: 300,     // Stagger between bot locks in setup
};
```

All bot timeouts use these values, making it easy to adjust game speed.

---

# New Problems Identified (Not Yet Implemented)

The following problems were identified during architectural analysis of the existing codebase. These represent implementation challenges that need solutions before bot functionality can be built.

---

## Problem 9: Modal-Driven Architecture Incompatibility

**Issue**: The current game flow relies heavily on modal dialogs for player input (e.g., `openBidModal()`, confirmation dialogs). Bots cannot interact with modals.

**Root Cause**: The architecture assumes a human will click buttons in modals to confirm actions:
```javascript
openBidModal(teamIndex)  // Shows UI, waits for click
confirmBid()              // Only called by human clicking button
```

**Impact**: Every phase that uses modals needs an alternative code path for bots.

**Solution**: Create programmatic action functions that bypass modal UI:
```javascript
function executeBotBid(teamIndex, amount) {
  // Skip modal entirely, directly modify state
  if (amount > gameState.currentBid.amount) {
    gameState.currentBid = { teamIndex, amount };
    saveState();
    render();
  }
}

// Modify render to detect bot turns and call appropriate executor
function render() {
  // ... existing render logic ...

  // After render, check if it's a bot's turn
  if (shouldExecuteBotTurn()) {
    setTimeout(() => executeBotTurn(), BOT_TIMING.turnDelay);
  }
}
```

---

## Problem 10: No Bot Turn Detection Mechanism

**Issue**: There's no way to determine if the current turn belongs to a bot or human player.

**Root Cause**: The team object doesn't have an `isBot` flag, and there's no helper function to check turn ownership.

**Impact**: The render function can't know when to auto-execute bot actions vs wait for human input.

**Solution**: Add infrastructure for bot detection:
```javascript
// Add to team object during registration
team.isBot = false;  // true for AI-controlled teams

// Helper function
function isBotTurn() {
  const phase = gameState.phase;

  if (phase === 'setup-draft') {
    const currentTeam = gameState.teams[gameState.setupDraftTurn];
    return currentTeam?.isBot === true;
  }

  if (phase === 'auction' || phase === 'secondary-hire') {
    // In auction, check if only bots remain who haven't passed
    const activeTeams = getActiveAuctionTeams();
    return activeTeams.every(t => t.isBot);
  }

  // ... other phases
  return false;
}

function shouldExecuteBotTurn() {
  return gameState.botsEnabled && isBotTurn() && !gameState.botExecuting;
}
```

---

## Problem 11: Render-Then-Wait Pattern Blocks Bot Execution

**Issue**: The current rendering pattern renders UI and then waits indefinitely for user input. There's no mechanism to auto-advance after rendering when it's a bot's turn.

**Root Cause**: Each render function (e.g., `renderSetupPhase()`, `renderAuctionPhase()`) only draws UI and exits. Nothing triggers the next action.

**Example Flow (current)**:
```
render() → renderSetupPhase() → displays UI → WAIT FOREVER
```

**Example Flow (needed for bots)**:
```
render() → renderSetupPhase() → displays UI → detect bot turn → setTimeout → executeBotSetupAction()
```

**Solution**: Add a post-render hook that checks for bot turns:
```javascript
function render() {
  const phase = gameState.phase;

  // ... existing phase rendering ...

  // Post-render bot execution check
  scheduleNextBotAction();
}

function scheduleNextBotAction() {
  if (!gameState.botsEnabled) return;
  if (gameState.botExecuting) return;  // Prevent re-entry

  if (shouldExecuteBotTurn()) {
    gameState.botExecuting = true;
    setTimeout(() => {
      executeBotTurn();
      gameState.botExecuting = false;
    }, BOT_TIMING.turnDelay);
  }
}
```

---

## Problem 12: Wildcard Decision After Round Results

**Issue**: Wildcard decisions happen AFTER players see round results, not before. Each team has exactly ONE wildcard for the entire game. How should bots decide when to use their one-time wildcard?

**Clarification on Wildcard Mechanics**:
- Players see round results first (valuation changes from market events)
- Then each team decides: Double (amplify change) / Shield (negate change) / Pass (save wildcard)
- Once used, the wildcard is consumed - cannot be used again
- Results are updated immediately after each team's decision

**Bot Decision Challenge**: When should a bot use its one-time wildcard?
- Using it early on a small swing wastes potential
- Saving it too long risks never using it optimally
- Need to evaluate: "Is this swing worth my one-time use?"

**Solution**: Evaluate wildcard value based on swing magnitude and game position:
```javascript
function botWildcardDecision(team, roundResults) {
  if (team.wildcardUsed) return null;  // Already used

  const valuationChange = roundResults.valuationDelta;  // This round's change
  const currentValuation = team.valuation;
  const swingPercent = Math.abs(valuationChange) / currentValuation;
  const rank = getValuationRank(team);
  const round = gameState.phase;  // 'seed', 'early', 'mature'

  // Calculate "swing significance" - is this worth using wildcard?
  const isLargeSwing = swingPercent > 0.15;  // >15% valuation change
  const isFinalRound = round === 'mature';

  // Positive swing (valuation increased) - consider DOUBLE
  if (valuationChange > 0) {
    if (isFinalRound && isLargeSwing) return 'double';  // Lock in big gain at end
    if (rank <= 2 && isLargeSwing) return 'double';      // Leaders amplify gains
    if (swingPercent > 0.25) return 'double';            // Huge swing, always double
  }

  // Negative swing (valuation decreased) - consider SHIELD
  if (valuationChange < 0) {
    if (isFinalRound && isLargeSwing) return 'shield';  // Protect at end
    if (rank >= 4 && isLargeSwing) return 'shield';      // Trailers protect position
    if (swingPercent > 0.25) return 'shield';            // Huge loss, always shield
  }

  // Small swing or early game - save wildcard
  return null;  // Pass, keep wildcard for later
}
```

**Thresholds**:
- `swingPercent > 0.15` (15%): Consider using wildcard
- `swingPercent > 0.25` (25%): Strongly consider using
- Final round: Lower threshold (12%) since it's last chance
- Early rounds: Higher threshold (20%) to preserve optionality

---

## Problem 13: Spectator Mode Phase Advancement

**Issue**: In spectator mode (0 human players, all bots), who triggers phase transitions that normally require human clicks?

**Root Cause**: Phase transitions like "Start Game", "End Auction", "Continue to Next Round" are button-driven. With no humans, nothing clicks these buttons.

**Affected Transitions**:
- Registration → Setup Draft (requires "Start Game" click)
- Setup Lock completion → Auction (requires confirmation)
- Auction end → Wildcard (automatic but needs verification)
- Wildcard → Secondary Drop → Secondary Hire → Mature (chain of transitions)
- Mature → End Game (requires "See Results")

**Solution**: Add auto-advance for spectator mode:
```javascript
function isSpectatorMode() {
  return gameState.botsEnabled &&
         gameState.teams.every(t => t.isBot || t.isDisqualified);
}

function checkAutoAdvance() {
  if (!isSpectatorMode()) return;

  const phase = gameState.phase;

  // Auto-start game when all bots registered
  if (phase === 'registration' && allTeamsRegistered()) {
    setTimeout(() => startGame(), BOT_TIMING.actionDelay);
    return;
  }

  // Auto-advance auction when complete
  if (phase === 'auction' && isAuctionComplete()) {
    setTimeout(() => endAuction(), BOT_TIMING.actionDelay);
    return;
  }

  // ... other phase transitions
}

// Call after each bot action
function afterBotAction() {
  saveState();
  render();
  checkAutoAdvance();
}
```

---

## Problem 14: Rapid State Changes During Bot Execution

**Issue**: When multiple bots take actions in quick succession (especially in auction), `saveState()` is called repeatedly, potentially causing performance issues or race conditions with localStorage.

**Root Cause**: Each bot action calls `saveState()` independently:
```javascript
executeBotBid()  → saveState()  // Bot 1 bids
executeBotBid()  → saveState()  // Bot 2 outbids (400ms later)
executeBotBid()  → saveState()  // Bot 3 outbids (400ms later)
// 3 saves in 1.2 seconds
```

**Impact**:
- localStorage writes might not complete before next write
- Page refresh during bot actions could load inconsistent state
- Performance degradation with complex state objects

**Solution**: Implement debounced state saving:
```javascript
let saveTimeout = null;
const SAVE_DEBOUNCE = 200;  // ms

function saveState() {
  // Clear pending save
  if (saveTimeout) clearTimeout(saveTimeout);

  // Schedule new save
  saveTimeout = setTimeout(() => {
    localStorage.setItem('gameState', JSON.stringify(gameState));
    saveTimeout = null;
  }, SAVE_DEBOUNCE);
}

// Force immediate save for critical transitions
function saveStateImmediate() {
  if (saveTimeout) clearTimeout(saveTimeout);
  localStorage.setItem('gameState', JSON.stringify(gameState));
  saveTimeout = null;
}
```

Use `saveStateImmediate()` for phase transitions, `saveState()` for incremental updates.

---

## Problem 15: Setup Draft Round Synchronization

**Issue**: Setup draft has 3 rounds where ALL teams must complete the current round before advancing. With mixed human/bot teams, bots might "lap" humans by completing multiple rounds instantly.

**Root Cause**: The design shows bots executing decisions with delays, but doesn't enforce round barriers:
```javascript
// Bots could theoretically do:
Round 1: Bot drops card (400ms) → Bot draws (400ms)
Round 2: Bot drops card (400ms) → Bot draws (400ms)  // Human still on Round 1!
```

**Expected Behavior**: Bot completes Round 1 → waits for all teams → Round 2 begins for everyone.

**Solution**: Enforce round synchronization:
```javascript
function canAdvanceSetupRound() {
  const currentRound = gameState.setupDraftRound;
  return gameState.teams.every(team =>
    team.isDisqualified || team.setupRoundComplete >= currentRound
  );
}

function executeBotSetupAction(teamIndex) {
  const team = gameState.teams[teamIndex];

  // Execute drop
  botDropDecision(team);

  // Execute draw/pass
  const drawDecision = botDrawDecision(team, gameState.setupDraftRound);
  if (drawDecision.action === 'draw') {
    drawSetupCard(teamIndex, drawDecision.deck);
  } else {
    skipSetupDraw(teamIndex);
  }

  // Mark round complete for this team
  team.setupRoundComplete = gameState.setupDraftRound;

  // Check if round can advance
  if (canAdvanceSetupRound()) {
    advanceSetupRound();
  }

  saveState();
  render();
}
```

---

## Problem 16: Employee Value Calculation Timing for Best Employer

**Issue**: The "Best Employer" winner is determined by total employee value (`ESOP% × final valuation`). But valuation changes throughout the game. When exactly is "final valuation" calculated?

**Root Cause**: The formula in the design doc assumes a single final valuation, but:
- Valuation changes after each market event
- Wildcard can double/shield valuation changes
- Hiring penalties reduce valuation
- When exactly do we "snapshot" for employee value calculation?

**Impact**: Bots need to optimize bidding strategy, but the optimal strategy depends on when employee values are calculated.

**Clarification Needed**: Is employee value calculated:
1. At game end using final valuation? (Bots should bid more if confident in valuation growth)
2. At time of hire using current valuation? (Bots should bid conservatively early)
3. Using some weighted average?

**Proposed Solution**: Calculate at game end using final valuation:
```javascript
function calculateEmployeeValue(team) {
  const finalValuation = team.valuation;  // After all market events

  return team.employees.reduce((total, emp) => {
    // ESOP% was the bid amount when hired
    const esopPercent = emp.esopGranted / 100;
    return total + (esopPercent * finalValuation);
  }, 0);
}

function determineBestEmployer() {
  const values = gameState.teams
    .filter(t => !t.isDisqualified)
    .map(t => ({
      team: t,
      employeeValue: calculateEmployeeValue(t)
    }))
    .sort((a, b) => b.employeeValue - a.employeeValue);

  return values[0]?.team;
}
```

---

## Problem 17: Bot Registration Race with Human Players

**Issue**: If "Fill with bots" is checked before all human teams register, when do bots get created? Could a human "steal" a bot's slot?

**Scenario**:
1. Teams Alpha and Beta register (humans)
2. Host checks "Fill with bots" - expects Gamma, Delta, Omega to be bots
3. Before clicking "Start Game", team Gamma registers (human)
4. What happens? 2 bots or 3 bots?

**Solution**: Only create bots at game start, filling remaining empty slots:
```javascript
function startGameWithBots() {
  const registeredTeams = gameState.teams.filter(t => t.registered);
  const emptySlots = 5 - registeredTeams.length;

  if (emptySlots > 0 && gameState.fillWithBots) {
    const botNames = generateBotNames(emptySlots);

    gameState.teams.forEach((team, idx) => {
      if (!team.registered) {
        team.registered = true;
        team.isBot = true;
        team.name = botNames.shift();
        team.problemStatement = getRandomBotProblemStatement();
      }
    });

    gameState.botCount = emptySlots;
  }

  gameState.botsEnabled = gameState.botCount > 0;
  startGame();
}
```

---

## Problem 18: Bot Auction Timeout - When to Force Close

**Issue**: In the auction phase, how long do we wait for bots to bid before closing bidding on a card? With all bots, we need automatic timeout handling.

**Root Cause**: Human games have a "Close Bidding" button. Bot games need automatic closure.

**Questions**:
- After no new bids for X seconds, auto-close?
- After N bidding rounds, force close?
- Different timing for mixed vs all-bot games?

**Solution**: Implement auction timeout with configurable thresholds:
```javascript
const AUCTION_CONFIG = {
  idleTimeout: 3000,      // Close bidding after 3s of no new bids
  maxBidRounds: 10,       // Force close after 10 bid rounds per card
  mixedGameTimeout: 5000, // Longer timeout when humans playing
};

let auctionIdleTimer = null;

function resetAuctionTimer() {
  if (auctionIdleTimer) clearTimeout(auctionIdleTimer);

  const timeout = isSpectatorMode()
    ? AUCTION_CONFIG.idleTimeout
    : AUCTION_CONFIG.mixedGameTimeout;

  auctionIdleTimer = setTimeout(() => {
    if (gameState.phase === 'auction' && gameState.currentCard) {
      forceCloseBidding();
    }
  }, timeout);
}

function forceCloseBidding() {
  if (gameState.currentBid.teamIndex === null) {
    skipCard();
  } else {
    closeBidding();
  }
}

// Call resetAuctionTimer() after each bid
function placeBid(teamIndex, amount) {
  // ... existing bid logic ...
  resetAuctionTimer();
}
```

---

## Problem 19: Human Priority in Wildcard Decisions (Mixed Games)

**Issue**: After each market round, EVERY team should have the opportunity to use their wildcard. In mixed human/bot games, bots must not auto-advance past the wildcard phase before humans have decided.

**Risk**: If bots execute their wildcard decisions immediately and then auto-advance to the next phase, human players lose their opportunity to act.

**Expected Flow**:
```
Market Round Results Shown
    ↓
ALL teams get wildcard prompt (simultaneous or sequential)
    ↓
Wait for ALL teams to respond (Double/Shield/Pass)
    ↓
Apply wildcard effects & update results
    ↓
THEN advance to next phase
```

**Root Cause**: The bot execution system might execute bot wildcards and immediately call `checkAutoAdvance()`, skipping human teams who haven't responded yet.

**Solution**: Implement explicit wildcard collection phase with human-first priority:

```javascript
// Track wildcard responses for the current round
gameState.wildcardResponses = {};  // teamIndex -> 'double'|'shield'|'pass'|null

function startWildcardPhase(roundResults) {
  // Store round results for reference
  gameState.currentRoundResults = roundResults;
  gameState.wildcardResponses = {};

  // Initialize all teams as "pending"
  gameState.teams.forEach((team, idx) => {
    if (!team.isDisqualified) {
      gameState.wildcardResponses[idx] = null;  // Awaiting response
    }
  });

  gameState.wildcardPhaseActive = true;
  saveState();
  render();  // Shows wildcard UI for humans, triggers bot decisions
}

function submitWildcardResponse(teamIndex, decision) {
  // Validate: can only respond once, must have wildcard if using it
  if (gameState.wildcardResponses[teamIndex] !== null) return;

  const team = gameState.teams[teamIndex];
  if (decision !== 'pass' && team.wildcardUsed) {
    console.error('Team already used wildcard');
    return;
  }

  // Record response
  gameState.wildcardResponses[teamIndex] = decision || 'pass';

  // Check if all teams have responded
  if (allWildcardResponsesReceived()) {
    applyAllWildcards();
  } else {
    saveState();
    render();
  }
}

function allWildcardResponsesReceived() {
  return Object.values(gameState.wildcardResponses).every(r => r !== null);
}

function applyAllWildcards() {
  // Apply effects for teams that used wildcard
  Object.entries(gameState.wildcardResponses).forEach(([idx, decision]) => {
    if (decision === 'double' || decision === 'shield') {
      applyWildcardEffect(parseInt(idx), decision);
    }
  });

  // Clear wildcard phase
  gameState.wildcardPhaseActive = false;
  gameState.wildcardResponses = {};

  // NOW advance to next phase
  advanceToNextPhase();
}
```

**Bot Execution During Wildcard Phase**:
```javascript
function scheduleNextBotAction() {
  // ... existing checks ...

  // During wildcard phase, only execute for bots who haven't responded
  if (gameState.wildcardPhaseActive) {
    gameState.teams.forEach((team, idx) => {
      if (team.isBot &&
          !team.isDisqualified &&
          gameState.wildcardResponses[idx] === null) {
        setTimeout(() => {
          const decision = botWildcardDecision(team, gameState.currentRoundResults);
          submitWildcardResponse(idx, decision || 'pass');
        }, BOT_TIMING.actionDelay);
      }
    });
    return;  // Don't do other bot actions during wildcard phase
  }

  // ... rest of bot execution logic ...
}
```

**UI Behavior**:
- Human teams see: "Use Wildcard?" with Double/Shield/Pass buttons
- Bot teams show: "🤖 Thinking..." then their decision
- Phase does NOT advance until all teams respond
- Timeout (optional): After 30s, auto-pass for unresponsive humans

**Key Guarantee**: `advanceToNextPhase()` is ONLY called from `applyAllWildcards()`, which ONLY runs when ALL teams have responded. This ensures humans always get their turn.

---

## Problem 20: Market Round Pacing in Mixed Games

**Issue**: Related to Problem 19 - the entire market round flow needs to pause for human comprehension, not just wildcard decisions.

**Expected Experience**:
1. Market event card revealed → **PAUSE** for humans to read
2. Effects calculated and shown → **PAUSE** for humans to understand impact
3. Wildcard opportunity → **WAIT** for all responses
4. Results finalized → **PAUSE** before next round

**Risk**: In spectator mode or with impatient bot timing, market rounds might fly by too fast for humans to follow.

**Solution**: Add configurable pacing with human-presence detection:

```javascript
const MARKET_TIMING = {
  eventRevealDelay: 2000,      // Time to show event card before effects
  effectsDisplayDelay: 3000,   // Time to show valuation changes
  wildcardTimeout: 30000,      // Max wait for human wildcard decisions
  resultsFinalDelay: 2000,     // Time after wildcards before next round

  // Spectator mode (all bots) - faster
  spectatorMultiplier: 0.3,    // 30% of normal delays
};

function hasHumanPlayers() {
  return gameState.teams.some(t => !t.isBot && !t.isDisqualified);
}

function getMarketDelay(baseDelay) {
  if (!hasHumanPlayers()) {
    return baseDelay * MARKET_TIMING.spectatorMultiplier;
  }
  return baseDelay;
}

async function executeMarketRound() {
  // 1. Reveal event
  const event = drawMarketEvent();
  gameState.currentMarketEvent = event;
  render();
  await delay(getMarketDelay(MARKET_TIMING.eventRevealDelay));

  // 2. Calculate and show effects
  const results = calculateMarketEffects(event);
  gameState.currentRoundResults = results;
  render();
  await delay(getMarketDelay(MARKET_TIMING.effectsDisplayDelay));

  // 3. Wildcard phase (waits for all responses)
  await executeWildcardPhase(results);

  // 4. Finalize results
  applyFinalResults();
  render();
  await delay(getMarketDelay(MARKET_TIMING.resultsFinalDelay));

  // 5. Continue or end
  if (hasMoreRounds()) {
    executeMarketRound();
  } else {
    endMarketPhase();
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Key Principle**: The game should never auto-advance past a decision point while humans still have pending actions. Bots adapt to human pace, not the other way around.
