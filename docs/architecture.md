# ESOP Wars - Architecture

## Overview

ESOP Wars is a hot-seat multiplayer card game where 5 teams compete to build the highest-valued startup by bidding equity (ESOP) to hire employees, surviving market conditions, and exiting successfully.

## File Structure

```
card-game/
├── index.html      # Entry point, modals markup
├── style.css       # All styling
├── data.js         # Game data (cards, teams, perks, bonuses)
├── game.js         # Game logic and rendering
└── docs/           # Documentation
```

## Source Files

| File | Purpose |
|------|---------|
| `data.js` | Static game data: cards, teams, perks, bonuses |
| `game.js` | Game logic, state management, UI rendering |

See [feature-map.md](feature-map.md) for function-level details.

## Game State

```javascript
gameState = {
  // Core
  phase: 'registration',     // Current game phase
  teams: [],                 // Array of 5 team objects

  // Auction
  employeeDeck: [],          // Shuffled employee cards
  currentCardIndex: 0,       // Current auction card
  currentBid: { teamIndex, amount },

  // Market
  marketDeck: [],            // Shuffled market cards
  usedMarketCards: [],
  currentMarketCard: null,

  // Setup (Iteration 3)
  setupRound: 0,
  setupDraftTurn: 0,
  setupPhase: 'drop',
  segmentDeck: [],
  ideaDeck: [],

  // Wildcard (Iteration 2)
  wildcardPhase: false,
  teamWildcardSelections: {},

  // Market Leader (Iteration 5)
  roundPerformance: [],

  // Other
  exitCard: null,
  secondaryPool: [],
}
```

## Team Object

```javascript
team = {
  name: 'Alpha',
  color: '#FF6B6B',
  problemStatement: '',
  esopRemaining: 12,         // Iteration 4: was 10
  valuation: 20000000,       // Iteration 4: was 25M
  employees: [],
  isComplete: false,
  isDisqualified: false,

  // Setup (Iteration 3)
  lockedSegment: null,
  lockedIdea: null,
  setupBonus: null,

  // Wildcard (Iteration 2)
  wildcardUsed: false,
  wildcardActiveThisRound: null,

  // Market Leader (Iteration 5)
  previousValuation: 0,
  currentGain: 0,
  isMarketLeader: false,
  marketLeaderCount: 0,
}
```

## Game Phases

```
registration → setup → setup-lock → setup-summary → auction → auction-summary
     ↓
   seed → early → secondary-drop → secondary-hire → mature → exit → winner
     ↑_______________|_______________|________________|
     (wildcard decisions before each market round)
```

### Phase Descriptions

| Phase | Description |
|-------|-------------|
| `registration` | Teams enter names and problem statements |
| `setup` | Rummy-style drafting of segment/idea cards (3 rounds) |
| `setup-lock` | Teams lock their segment + idea selection |
| `setup-summary` | Review all team setups before auction |
| `auction` | Bid ESOP to hire employees (3 per team) |
| `auction-summary` | Review teams before market rounds |
| `seed` | First market round |
| `early` | Second market round |
| `secondary-drop` | Each team drops 1 employee |
| `secondary-hire` | Bid on dropped + reserve employees |
| `mature` | Final market round |
| `exit` | Draw exit card, apply multiplier |
| `winner` | Display Best Founder + Best Employer |

## Key Mechanics

### Valuation Formula (Iteration 4)
```javascript
growthRate = clamp(skillTotal * 0.08, -0.3, +0.5)
newValuation = previousValuation * (1 + growthRate)
```

### Market Leader Bonus (Iteration 5)
After each market round, top 2 teams by gains get valuation doubled.

### Category Perks (Iteration 4)
| Category | Perk | Effect |
|----------|------|--------|
| Engineering | Ship Fast | +15% during Rapid Scaling |
| Product | User Focus | 50% soft skill penalty reduction |
| Sales | Deal Closer | +5% with 2+ Sales employees |
| Ops | Efficiency | 10% ESOP discount |
| Finance | Cost Control | 25% loss reduction in Market Crash |

### Wildcard (Iteration 2)
Each team has one wildcard (used once per game):
- **Double Down**: 2x gains this round
- **Shield**: Block all losses this round

## Rendering

All UI is rendered via `render()` which switches on `gameState.phase` and calls the appropriate `render*()` function. Each render function generates full HTML and replaces `#app` contents.

## Persistence

State is saved to `localStorage` as JSON after every state change via `saveState()`. On page load, `loadState()` restores the game.
