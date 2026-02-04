# Feature Map

Quick reference for all features, their functions, and iteration history.

---

<!-- @feature Registration @iteration 1,7 { -->
## Registration

Teams enter names and problem statements before starting the game.

### Functions
| Function | Purpose |
|----------|---------|
| `openRegistrationModal(teamIndex)` | Open modal for team registration |
| `closeRegistrationModal()` | Close registration modal |
| `saveRegistration()` | Save team name and problem statement |
| `renderRegistration(app)` | Render registration phase UI with restart button |

### Iterations
- **Iteration 7**: Added restart button to registration header
- **Iteration 1**: Initial implementation

<!-- } @feature-end Registration -->

---

<!-- @feature SetupDrafting @iteration 3 { -->
## Setup Drafting

Rummy-style card drafting where teams select a market segment and idea (product/service).

### Functions
| Function | Purpose |
|----------|---------|
| `initSetupPhase()` | Initialize decks and deal cards to teams |
| `dropSetupCard(teamIndex, cardId, isSegment)` | Drop a card during drafting |
| `drawSetupCard(teamIndex, deckType)` | Draw from segment or idea deck |
| `skipSetupDraw(teamIndex)` | Pass on drawing |
| `lockSetupCards(teamIndex, segmentId, ideaId)` | Lock final segment + idea selection |
| `startAuctionFromSetup()` | Transition to auction phase |
| `renderSetupPhase(app)` | Render drafting UI |
| `renderSetupLock(app)` | Render lock selection UI |
| `renderSetupSummary(app)` | Render summary before auction |
| `getPreviewBonus(segment, idea)` | Show potential bonus for selection |
| `updateSetupPreview(teamIndex)` | Update bonus preview on selection change |
| `lockFromUI(teamIndex)` | Handle lock button click |

### Data (data.js)
- `segmentCards` - 6 market segments
- `productCards` - 8 product ideas
- `serviceCards` - 8 service ideas
- `setupBonuses` - 18 segment+idea combinations
- `getSetupBonus(segmentName, ideaName)` - Find matching bonus

### Iterations
- **Iteration 3**: Full implementation

<!-- } @feature-end SetupDrafting -->

---

<!-- @feature Auction @iteration 1,4 @uses CategoryPerks { -->
## Auction

Teams bid ESOP to hire employees. Each team must hire 3 employees.

### Functions
| Function | Purpose |
|----------|---------|
| `startAuction()` | Begin auction (now calls initSetupPhase) |
| `getCurrentCard()` | Get current employee card |
| `placeBid(teamIndex, amount)` | Place a bid |
| `closeBidding()` | Award employee to highest bidder |
| `skipCard()` | Skip current card (no hire) |
| `nextCard()` | Move to next employee card |
| `allTeamsComplete()` | Check if all teams have 3 employees |
| `endAuction()` | End auction, disqualify incomplete teams |
| `openBidModal(teamIndex)` | Open bid input modal |
| `closeBidModal()` | Close bid modal |
| `adjustBid(increment)` | Adjust bid by increment |
| `confirmBid()` | Confirm bid from modal |
| `renderAuction(app)` | Render auction UI |
| `renderAuctionSummary(app)` | Render post-auction summary |

### Uses
- `CategoryPerks: getOpsDiscount, getEffectiveEsopCost` (ESOP discount)

### Iterations
- **Iteration 4**: Ops ESOP discount integration
- **Iteration 1**: Base auction mechanics

<!-- } @feature-end Auction -->

---

<!-- @feature MarketRound @iteration 1,3,4,5 @uses CategoryPerks,Wildcard,SetupDrafting,MarketLeaderBonus { -->
## Market Round

Draw market cards that affect team valuations based on employee skills.

### Functions
| Function | Purpose |
|----------|---------|
| `startMarketRounds()` | Begin seed round |
| `drawMarketCard()` | Draw and apply market card |
| `applyMarketCard(card)` | Calculate skill totals, apply modifiers |
| `nextRound()` | Transition to next phase |
| `renderMarketRound(app)` | Render market round UI |

### Uses
- `CategoryPerks: hasCategoryPerk, countEmployeesByCategory` (perk effects)
- `Wildcard: wildcardActiveThisRound` (wildcard effects)
- `SetupDrafting: setupBonus` (segment+idea bonus)
- `MarketLeader: applyMarketLeaderBonus` (top 2 bonus)

### Iterations
- **Iteration 5**: Market leader bonus - top 2 teams by gains get valuation doubled after each round
- **Iteration 4**: Category perks integration (Engineering +15% rapid scaling, Product 50% penalty reduction, Finance 25% crash protection); new balance formula with 0.08 multiplier clamped to [-0.3, +0.5]
- **Iteration 3**: Setup bonus integration - segment+idea bonuses apply to skill calculations

*Earlier: Iteration 1 - Base market mechanics*

<!-- } @feature-end MarketRound -->

---

<!-- @feature Wildcard @iteration 2 { -->
## Wildcard

One-time use card: Double Down (2x gains) or Shield (block losses).

### Functions
| Function | Purpose |
|----------|---------|
| `startWildcardPhase()` | Begin wildcard decision phase |
| `selectWildcard(teamIndex, choice)` | Team selects wildcard option |
| `allWildcardsDecided()` | Check if all teams decided |
| `endWildcardPhase()` | End wildcard phase |
| `renderWildcardPhase(app)` | Render wildcard decision UI |

### Iterations
- **Iteration 2**: Full implementation

<!-- } @feature-end Wildcard -->

---

<!-- @feature CategoryPerks @iteration 4 { -->
## Category Perks

Each employee category provides a unique perk when hired.

### Functions
| Function | Purpose |
|----------|---------|
| `countEmployeesByCategory(team, category)` | Count employees of a category |
| `hasCategoryPerk(team, category)` | Check if team has category |
| `getOpsDiscount(team)` | Calculate Ops 10% ESOP discount |
| `getEffectiveEsopCost(team, bidAmount)` | Apply Ops discount to bid |
| `getActivePerks(team)` | Get list of active perks for team |

### Data (data.js)
- `categoryPerks` - Perk definitions for all 5 categories

### Iterations
- **Iteration 4**: Full implementation

<!-- } @feature-end CategoryPerks -->

---

<!-- @feature MarketLeaderBonus @iteration 5 { -->
## Market Leader Bonus

Top 2 teams by gains each round get valuation doubled.

### Functions
| Function | Purpose |
|----------|---------|
| `applyMarketLeaderBonus()` | Double valuation of top 2 teams |
| `getRoundPerformanceSummary()` | Get sorted performance for UI |
| `renderMarketLeadersAnnouncement()` | Render animated announcement |
| `renderRoundPerformance()` | Render gains/losses list |

### Iterations
- **Iteration 5**: Full implementation

<!-- } @feature-end MarketLeaderBonus -->

---

<!-- @feature SecondaryAuction @iteration 1 { -->
## Secondary Auction

Mid-game auction where teams drop and re-hire employees.

### Functions
| Function | Purpose |
|----------|---------|
| `dropEmployee(teamIndex, employeeId)` | Drop employee to pool |
| `selectSecondaryCard(employeeId)` | Select card to bid on |
| `closeSecondaryBidding()` | Award employee in secondary |
| `renderSecondaryDrop(app)` | Render drop phase UI |
| `renderSecondaryHire(app)` | Render hire phase UI |

### Iterations
- **Iteration 1**: Base implementation

<!-- } @feature-end SecondaryAuction -->

---

<!-- @feature ExitPhase @iteration 1,4 { -->
## Exit Phase

Draw exit card and apply final multiplier to valuations.

### Functions
| Function | Purpose |
|----------|---------|
| `drawExitCard()` | Draw random exit card, apply multiplier |
| `declareWinner()` | Transition to winner phase |
| `renderExit(app)` | Render exit phase UI |

### Data (data.js)
- `exitCards` - IPO (2.2x), M&A (1.8x), Joint Venture (1.5x)

### Iterations
- **Iteration 4**: Rebalanced multipliers
- **Iteration 1**: Base implementation

<!-- } @feature-end ExitPhase -->

---

<!-- @feature DualWinner @iteration 2,5 { -->
## Dual Winner

Two winners: Best Founder (highest valuation) and Best Employer (highest employee value).

### Functions
| Function | Purpose |
|----------|---------|
| `calculateEmployeeValue(team)` | Calculate total ESOP value for employees |
| `getBestEmployer()` | Get team with highest employee value |
| `getWinners()` | Get both winners |
| `getWinner()` | Get highest valuation team |
| `renderWinner(app)` | Render winner screen with both categories |

### Iterations
- **Iteration 5**: Added market leader stats display
- **Iteration 2**: Dual winner implementation

<!-- } @feature-end DualWinner -->

---

<!-- @feature Utilities @iteration 1,3,4,5,7 { -->
## Utilities

Helper functions used across features.

### Functions
| Function | Purpose |
|----------|---------|
| `initGame()` | Initialize/reset game state |
| `shuffleArray(array)` | Fisher-Yates shuffle |
| `saveState()` | Save to localStorage |
| `loadState()` | Load from localStorage |
| `showToast(message, type)` | Show notification |
| `formatCurrency(value)` | Format as ₹XXM/B |
| `render()` | Main render dispatcher |
| `renderPhaseBar(activePhase)` | Render phase navigation with restart button |
| `renderTeamsSidebar()` | Render teams sidebar |
| `viewTeamDetails(teamIndex)` | Open team detail modal |
| `closeTeamDetailModal()` | Close team detail modal |
| `resetGame()` | Clear state and restart |
| `confirmRestart()` | Show confirmation dialog before restart |

### Iterations
- **Iteration 7**: Added restart button accessible from any phase (in phase bar and registration header) with confirmation dialog
- **Iteration 5**: Added market leader count display in sidebar
- **Iteration 4**: Added perks display in teams sidebar

*Earlier: Iteration 1 - Base utilities (init, shuffle, save/load, render) → Iteration 3 - Added setup phase to phase bar*

<!-- } @feature-end Utilities -->
