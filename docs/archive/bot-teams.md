# Idea: Bot Teams

## Summary

Allow starting the game with fewer than 5 human teams. Missing team slots are filled by AI-controlled bots that make autonomous decisions throughout all game phases.

## Problem Statement

Currently, the game requires exactly 5 human teams to start. This creates friction for:
- Solo players wanting to practice or explore mechanics
- Groups of 2-4 players who can't find additional participants
- Testing/debugging during development

## Proposed Solution

Add a "Start with Bots" option during registration that fills remaining team slots with AI players. Bots participate in all game phases and make strategic (but beatable) decisions.

---

## Decision Points Requiring Bot Logic

| Phase | Decision | Input Required |
|-------|----------|----------------|
| Registration | Team identity | Problem statement text |
| Setup Draft | Card management | Which card to drop, draw segment/idea/pass |
| Setup Lock | Final selection | Which segment + idea to lock |
| Auction | Bidding | Amount to bid, when to bid |
| Wildcard | Risk decision | Double / Shield / Pass (blind) |
| Secondary Drop | Employee release | Which employee to drop |
| Secondary Hire | Re-acquisition | Bid on pool employees |

---

## Bot Behavior Design

### 1. Registration Phase

**Behavior:** Auto-generate a unique startup concept.

**Implementation:**
```javascript
const botProblemStatements = [
  "AI-powered meal planning for busy families",
  "Blockchain-based credential verification",
  "Sustainable packaging marketplace for SMBs",
  "Remote team culture building platform",
  "Hyperlocal delivery network for pharmacies",
  // ... 10-15 options
];
```

**Logic:** Randomly select unused problem statement. Mark team as `isBot: true`.

---

### 2. Setup Draft Phase

#### 2a. Drop Decision

**Goal:** Keep cards that synergize well (high-bonus segment+idea combos).

**Logic:**
1. Evaluate each card's potential bonus with other cards in hand
2. Calculate "synergy score" for each card
3. Drop the lowest-scoring card

```javascript
// Pseudocode
function botDropDecision(team) {
  const scores = team.setupHand.map(card => {
    return calculateSynergyScore(card, team.setupHand);
  });
  return cardWithLowestScore;
}
```

**Synergy Score Calculation:**
- For segments: Sum of bonus values with all ideas in hand
- For ideas: Sum of bonus values with all segments in hand
- Tie-breaker: Prefer keeping segments (only 6 in deck vs 16 ideas)

#### 2b. Draw Decision

**Goal:** Improve hand toward high-value combos.

**Logic:**
1. If no segment in hand → Draw segment (critical)
2. If current combo bonus < threshold → 60% draw, 40% pass
3. Deck preference: Draw from deck that could improve combo most
4. Late rounds (round 2-3): More conservative, higher pass rate

```javascript
function botDrawDecision(team, round) {
  const hasSegment = team.setupHand.some(c => c.type === 'segment');
  if (!hasSegment) return { action: 'draw', deck: 'segment' };

  const currentBestBonus = findBestComboInHand(team.setupHand);
  const passChance = 0.2 + (round * 0.15); // 20% → 35% → 50%

  if (Math.random() < passChance && currentBestBonus >= 0.1) {
    return { action: 'pass' };
  }
  return { action: 'draw', deck: needsMoreIdeas ? 'idea' : 'segment' };
}
```

#### 2c. Lock Decision

**Goal:** Select the highest-bonus segment+idea combination.

**Logic:** Simply pick the combo with maximum `setupBonus` value.

```javascript
function botLockDecision(team) {
  let bestCombo = null;
  let bestBonus = -Infinity;

  for (segment of segments in hand) {
    for (idea of ideas in hand) {
      const bonus = getSetupBonus(segment.name, idea.name);
      if (bonus.modifier > bestBonus) {
        bestCombo = { segment, idea };
        bestBonus = bonus.modifier;
      }
    }
  }
  return bestCombo;
}
```

---

### 3. Auction Phase

**Goal:** Maximize employee value (`ESOP% × final valuation`) while ensuring 3 hires.

**Win Condition Context:**
- Best Employer (priority) = highest total employee value
- Employee Value = `(bidAmount / 100) × finalValuation`
- Strategy: Bid generously on quality employees, not conservatively

#### Evaluation Metrics

**Employee Quality Score** (affects valuation growth):
```javascript
function scoreEmployeeQuality(employee, team) {
  let score = employee.hardSkill * 10; // Base: 0-8 points

  // Soft skills contribution
  score += Object.values(employee.softSkills).reduce((a, b) => a + b, 0) * 2;

  // Category synergy with setup bonus
  if (team.setupBonus?.category === employee.category) {
    score *= 1.3; // 30% bonus for matching category
  }

  // Category diversity bonus (more perks = better)
  if (!hasCategoryPerk(team, employee.category)) {
    score *= 1.15; // New perk unlocked
  }

  // Diminishing returns for duplicate categories
  const categoryCount = countEmployeesByCategory(team, employee.category);
  if (categoryCount >= 1) score *= 0.85;
  if (categoryCount >= 2) score *= 0.7;

  return score;
}
```

#### Bidding Strategy

**Philosophy:** Higher bids = higher employee value IF valuation stays strong. Bots should bid aggressively on high-quality employees to maximize both ESOP spent AND valuation growth.

**Budget Management:**
```javascript
function calculateBidBudget(team, cardsRemaining) {
  const employeesNeeded = 3 - team.employees.length;

  // Generous reserve: only hold back minimum for future hires
  const minReserve = (employeesNeeded - 1) * 1.5; // 1.5% per future hire (low reserve)
  const availableBudget = team.esopRemaining - minReserve;

  return Math.max(availableBudget, 0);
}
```

**Bid Decision Logic:**
```javascript
function botBidDecision(team, employee, currentBid, cardsRemaining) {
  const quality = scoreEmployeeQuality(employee, team);
  const budget = calculateBidBudget(team, cardsRemaining);

  // Higher quality = willing to spend more ESOP (benefits employee value)
  const qualityMultiplier = 0.6 + (quality / 20); // 0.6 - 1.0 range

  // Calculate max willingness - BE GENEROUS
  const maxBid = Math.min(
    budget,
    team.esopRemaining * qualityMultiplier, // High quality = spend more
    team.esopRemaining - 0.3 // Tiny buffer
  );

  // Decide bid amount
  if (currentBid === null) {
    // Opening bid: Start strong (70-90% of max)
    return maxBid * (0.7 + Math.random() * 0.2);
  }

  if (currentBid.amount >= maxBid) {
    return null; // Pass
  }

  // Outbid: Willing to jump significantly for quality
  const increment = 0.5 + (quality / 15); // Better employee = bigger jumps
  return Math.min(currentBid.amount + increment, maxBid);
}
```

**Aggression Modifier:**
- Early auction (cards 1-6): Aggressive on high-quality (110% modifier)
- Mid auction (cards 7-12): Normal bidding
- Late auction (cards 13-18): Very aggressive if under 3 employees (130% modifier)
- Desperation: If 0-1 employees and <5 cards left, bid up to 95% of remaining ESOP

**Rationale:** Spending 4% on a great employee beats spending 2% on a mediocre one, because:
- Great employee → higher valuation growth
- 4% × high valuation > 2% × lower valuation

---

### 4. Wildcard Phase

**Mechanics:**
- Wildcard decision happens AFTER players see round results
- Each team has exactly ONE wildcard for the entire game
- Options: Double (amplify change) / Shield (negate change) / Pass (save for later)
- Once used, results update immediately and wildcard is consumed

**Goal:** Use the one-time wildcard on a significant swing that maximizes value.

**Decision Factors:**
1. **Swing magnitude** - Is this round's change worth the one-time use?
2. **Direction** - Positive swing → Double; Negative swing → Shield
3. **Game stage** - Final round is last chance to use
4. **Position** - Leaders amplify gains; Trailers protect against losses

**Swing Thresholds:**

| Swing % | Early Rounds | Final Round |
|---------|--------------|-------------|
| < 12%   | Pass         | Consider    |
| 12-20%  | Consider     | Use         |
| > 20%   | Use          | Definitely use |

**Implementation:**
```javascript
function botWildcardDecision(team, roundResults) {
  if (team.wildcardUsed) return null;

  const valuationChange = roundResults.valuationDelta;
  const swingPercent = Math.abs(valuationChange) / team.valuation;
  const rank = getValuationRank(team);
  const isFinalRound = gameState.phase === 'mature';

  // Determine threshold based on game stage
  const threshold = isFinalRound ? 0.12 : 0.18;

  // Small swing - save wildcard
  if (swingPercent < threshold) return null;

  // Positive swing - consider DOUBLE
  if (valuationChange > 0) {
    // Leaders double gains, or anyone on huge swing
    if (rank <= 2 || swingPercent > 0.25 || isFinalRound) {
      return 'double';
    }
  }

  // Negative swing - consider SHIELD
  if (valuationChange < 0) {
    // Trailers shield losses, or anyone on huge swing
    if (rank >= 4 || swingPercent > 0.25 || isFinalRound) {
      return 'shield';
    }
  }

  // Medium swing, middle position - save for better opportunity
  return null;
}
```

**Edge Cases:**
- If valuation change is 0, always pass
- On final round with unused wildcard: lower threshold to 10% (use it or lose it)
- Bots should slightly randomize threshold (±3%) to avoid predictable behavior

---

### 5. Secondary Auction

#### 5a. Drop Decision

**Goal:** Release lowest-value employee while maintaining category diversity.

**Logic:**
```javascript
function botDropDecision(team) {
  return team.employees.reduce((worst, emp) => {
    const value = scoreEmployee(emp, team);
    // Penalty for dropping last of a category (lose perk)
    const count = countEmployeesByCategory(team, emp.category);
    const adjustedValue = count === 1 ? value * 1.5 : value;

    return adjustedValue < worst.value
      ? { employee: emp, value: adjustedValue }
      : worst;
  }, { employee: null, value: Infinity }).employee;
}
```

#### 5b. Secondary Hire

**Behavior:** Same generous bidding logic as main auction. Since this is the last hiring opportunity:
- Urgency modifier: 120% of normal max bid
- Prioritize highest-quality available employee
- Spend remaining ESOP freely (no need to reserve for future hires)

---

## UI Changes

### Registration Screen

```
┌─────────────────────────────────────────┐
│  ESOP Wars - Team Registration          │
├─────────────────────────────────────────┤
│                                         │
│  [Alpha] [Beta] [Gamma] [Delta] [Omega] │
│    ✓       ✓      ○       ○       ○     │
│                                         │
│  2 of 5 teams registered                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [ ] Fill remaining with bots  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Start Game]  ← enabled when ≥1 human  │
│                  + checkbox OR 5 teams  │
└─────────────────────────────────────────┘
```

### Team Indicators

- Bot teams show 🤖 icon next to name
- Sidebar shows "(Bot)" label
- Bot decisions happen with brief delay (500ms) for visibility

### Bot Turn Visualization

During bot turns, show:
```
┌────────────────────────────────┐
│  🤖 Beta is thinking...        │
│  ████████░░░░░░░ 60%           │
└────────────────────────────────┘
```

Then reveal decision with 300ms delay before executing.

---

## Data Model Changes

### Team Object Extension

```javascript
team = {
  ...existingFields,
  isBot: false,           // true for AI-controlled teams
  botDifficulty: 'normal' // future: 'easy' | 'normal' | 'hard'
}
```

### Game State Extension

```javascript
gameState = {
  ...existingFields,
  botsEnabled: false,     // true if game started with bots
  botCount: 0,            // number of bot teams (0-4)
}
```

---

## Architectural Prerequisites

Before implementing bot logic, the following architectural changes are required. See `bot-problems.md` for detailed solutions.

### 1. Bot Turn Detection System
```javascript
// Required infrastructure
team.isBot = false;              // Flag on team object
gameState.botsEnabled = false;   // Game-level flag
gameState.botExecuting = false;  // Prevents re-entry

function isBotTurn() { /* phase-specific logic */ }
function shouldExecuteBotTurn() { /* combines checks */ }
```

### 2. Post-Render Bot Execution Hook
The render function must check for bot turns after drawing UI:
```javascript
function render() {
  // ... existing render logic ...
  scheduleNextBotAction();  // NEW: check if bot should act
}
```

### 3. Programmatic Action Functions
Each human action needs a bot-callable equivalent that bypasses modals:
- `openBidModal()` → `executeBotBid(teamIndex, amount)`
- `dropSetupCard()` → `executeBotDrop(teamIndex, cardId)`
- `confirmWildcard()` → `executeBotWildcard(teamIndex, decision)`

### 4. Debounced State Saving
Prevent rapid localStorage writes during bot action sequences:
```javascript
function saveState() { /* debounced, 200ms delay */ }
function saveStateImmediate() { /* for phase transitions */ }
```

### 5. Spectator Mode Auto-Advance
With 0 human players, phase transitions must happen automatically.

### 6. Human-Priority in Mixed Games
**Critical**: Bots must NEVER auto-advance past decision points where humans have pending actions.

```javascript
// Track pending human decisions
gameState.wildcardResponses = {};  // teamIndex -> decision or null (pending)

function allHumansResponded() {
  return gameState.teams.every((team, idx) =>
    team.isBot ||
    team.isDisqualified ||
    gameState.wildcardResponses[idx] !== null
  );
}

// Phase advances ONLY when all teams (human AND bot) have responded
function canAdvancePhase() {
  if (gameState.wildcardPhaseActive) {
    return Object.values(gameState.wildcardResponses).every(r => r !== null);
  }
  return true;
}
```

### 7. Market Round Pacing
Market rounds must pause for human comprehension:
1. Event revealed → pause for reading
2. Effects shown → pause for understanding
3. Wildcard phase → wait for ALL responses
4. Results finalized → pause before next round

Spectator mode uses faster timings (30% of normal delays).

---

## Implementation Phases

### Phase 1: Core Bot Infrastructure (PREREQUISITE)
- Add `isBot`, `botDifficulty` to team object schema
- Add `botsEnabled`, `botCount`, `botExecuting` to gameState
- Add `wildcardResponses`, `wildcardPhaseActive` to gameState
- Define `BOT_TIMING` and `MARKET_TIMING` constants
- Implement `isBotTurn()` and `shouldExecuteBotTurn()` helpers
- Implement `hasHumanPlayers()` and `allHumansResponded()` helpers
- Add `scheduleNextBotAction()` post-render hook
- Implement debounced `saveState()` / `saveStateImmediate()`
- Add `isSpectatorMode()` detection
- Add `canAdvancePhase()` gate (blocks until all teams respond)

### Phase 2: Registration & Bot Creation
- Add "Fill with bots" checkbox to registration UI
- Generate unique bot names (three random words)
- Auto-assign problem statements from pool
- Create bots at game start (not during registration)
- Implement `startGameWithBots()` function

### Phase 3: Setup Draft Bot
- Implement synergy scoring algorithm
- `botDropDecision()` - evaluate cards, drop lowest synergy
- `botDrawDecision()` - probability-based draw/pass
- `botLockDecision()` - select highest-bonus combo
- Add round synchronization barrier
- Auto-advance turns for bot teams

### Phase 4: Auction Bot
- `scoreEmployeeQuality()` - hard skill + soft skills + synergies
- `calculateBidBudget()` - strict per-employee allocation
- `botBidDecision()` - with variance (±30%) and desperation
- `executeBotBid()` - programmatic bid placement
- Bid stale-check before placement (race condition fix)
- Auto-close bidding with timeout
- Handle "no bids" case (skip card)

### Phase 5: Market Rounds & Wildcard Bot
- Implement `executeMarketRound()` with proper pacing delays
- `startWildcardPhase()` - initialize response tracking for all teams
- `submitWildcardResponse()` - record decision, check if all responded
- `applyAllWildcards()` - apply effects only when ALL teams responded
- `botWildcardDecision()` - swing-based strategy (see Section 4)
- Track `team.wildcardUsed` to enforce one-time use
- **Human-priority**: phase advances ONLY after all humans respond
- Configurable timing: slower for mixed games, faster for spectator mode

### Phase 6: Secondary Auction Bot
- `botSecondaryDropDecision()` - preserve category diversity
- Reuse auction bidding logic with urgency modifier
- Handle empty pool → apply penalties → advance phase
- Remove skipped cards from pool (infinite loop fix)
- `finishSecondaryHire()` for graceful completion

### Phase 7: Polish & Testing
- Bot thinking overlay/animation
- Decision delay for visibility
- Bot 🤖 indicators in team displays
- Decision rationale messages
- Edge case testing (see bot-problems.md)
- Performance testing with rapid bot actions
- Bot difficulty levels (future enhancement)

---

## Design Decisions

1. **Bot Naming:** Random three words (e.g., "Crimson Lunar Spark")

2. **Difficulty Levels:** Basic difficulty only for v1

3. **Bot Visibility:** Yes - show bot decision rationale (e.g., "Beta values Engineering highly")

4. **Pause on Bot Turn:** Auto-advance (no click required)

5. **Minimum Humans:** Yes - allow 0 human teams (full bot game for testing/spectating)

---

## Success Criteria

### Functional Requirements
- [ ] Game playable with 0-4 human teams (0 = spectator mode)
- [ ] Bots complete all phases without errors
- [ ] Bots make reasonable (not random) decisions
- [ ] Bots optimize for Best Employer (generous ESOP + valuation growth)
- [ ] Bot teams win Best Employer ~40-60% of games against humans
- [ ] All teams end with 3 employees (or receive hiring penalty)

### Technical Requirements
- [ ] No UI freezing during bot turns
- [ ] No infinite loops in any phase
- [ ] Race conditions handled (stale bid checks)
- [ ] State persists correctly through rapid bot actions
- [ ] Page refresh during bot turn resumes correctly
- [ ] Auction auto-closes after idle timeout
- [ ] **Human-priority**: Bots never skip human decision opportunities
- [ ] Market rounds pause for human comprehension in mixed games
- [ ] Wildcard phase waits for ALL teams before advancing

### UX Requirements
- [ ] Clear visual distinction between human/bot teams (🤖 indicator)
- [ ] Bot decision rationale visible to players
- [ ] Appropriate delays between bot actions for visibility
- [ ] Spectator mode progresses without human intervention
- [ ] Wildcard decision shows reasoning (e.g., "15% swing - using Shield")

---

## Dependencies

- **Architectural refactor** required before bot logic (see Prerequisites above)
- Existing game mechanics must support programmatic action execution
- State management must handle rapid bot updates

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race conditions in bidding | Game freeze or invalid state | Stale-check before execution, atomic updates |
| Infinite loops in secondary hire | Game unplayable | Remove cards from pool when skipped |
| Modal architecture incompatibility | Major refactor needed | Create parallel programmatic action paths |
| State corruption during rapid saves | Lost progress | Debounced saves + immediate saves for transitions |
| Unfair wildcard timing | Player complaints | Commit-reveal pattern for mixed games |

## Iteration Target

**Iteration 6**

## Estimated Scope

- `game.js`: ~500-600 new lines
  - Bot infrastructure & helpers: ~100 lines
  - Decision functions: ~250 lines
  - Phase execution & auto-advance: ~150 lines
- `data.js`: ~30 lines (bot problem statements, bot name words)
- `style.css`: ~50 lines (bot indicators, thinking animation, overlay)

## Related Documentation

- `bot-problems.md` - Detailed problem analysis and solutions
- Problems 1-8: Historical issues from design review
- Problems 9-18: Architectural challenges identified pre-implementation

