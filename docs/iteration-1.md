# ESOP Wars — Build Approach

## Idea Confirmation

- **Game:** ESOP Wars
- **One-liner:** Bid equity to build your startup team, survive market swings, exit rich.
- **Format:** Card game (auction + market rounds)
- **Players:** 5 teams
- **Win:** Highest company valuation at exit

**One turn (auction):**
1. Reveal employee card
2. Teams bid ESOP %
3. Highest bidder wins the employee

---

## Tech Stack

**V1:** Vanilla HTML, CSS, JavaScript
- No build step
- Browser storage for state persistence
- Single shared screen (hot-seat mode)

**V2 (future):** Multi-device setup with backend

---

## Interaction Model: Hot-Seat

All 5 teams share one screen. Each team has their own panel/button to place bids.

### Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                      CARD 5 OF 18                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              PRIYA SHARMA                                 │  │
│  │              Backend Engineer                             │  │
│  │              Category: Engineering                        │  │
│  │                                                           │  │
│  │              Hard Skill: 0.7                              │  │
│  │              Resilience: 0.6 | Communication: 0.4         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│                 Current Bid: 2.5% (Team Alpha)                  │
└─────────────────────────────────────────────────────────────────┘

┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│   ALPHA   │ │   BETA    │ │   GAMMA   │ │   DELTA   │ │   OMEGA   │
│  ───────  │ │  ───────  │ │  ───────  │ │  ───────  │ │  ───────  │
│ ESOP: 7.5%│ │ ESOP: 10% │ │ ESOP: 10% │ │ ESOP: 10% │ │ ESOP: 10% │
│ Hired: 1  │ │ Hired: 0  │ │ Hired: 0  │ │ Hired: 0  │ │ Hired: 0  │
│           │ │           │ │           │ │           │ │           │
│  [ BID ]  │ │  [ BID ]  │ │  [ BID ]  │ │  [ BID ]  │ │  [ BID ]  │
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘

                      [ CLOSE BIDDING ]    [ SKIP CARD ]
```

### Bid Flow

1. Employee card displayed in center
2. Team taps their **[BID]** button
3. Bid modal appears with:
   - Current highest bid shown
   - Quick increment buttons: **[+0.5%]** **[+1%]** **[+2%]**
   - Manual input field
   - **[Confirm Bid]** button
4. Bid placed if valid (higher than current, within ESOP pool)
5. Other teams can outbid by tapping their button
6. Facilitator clicks **[CLOSE BIDDING]** → Employee awarded to highest bidder
7. **[SKIP CARD]** if no one wants to bid → Card discarded

### Touch-Friendly Requirements

- Large buttons (min 48px touch target)
- Color-coded team panels (easy identification)
- Clear visual feedback on current highest bidder
- Modal for bid entry (prevents mis-taps)

---

## Build Phases Overview

| Phase | Focus | Time |
|-------|-------|------|
| 1 | Core Auction Mechanic | ~20 min |
| 2 | Full Auction + Team Management | ~20 min |
| 3 | Market Rounds + Valuation | ~15 min |
| 4 | Secondary Auction + Exit + Polish | ~15 min |

---

## Phase 1: Core Auction Mechanic

**Goal:** One employee card, teams can bid via hot-seat UI, highest wins.

### Prompt (copy-paste into vibe coding tool)

```
Build a card game called ESOP Wars using vanilla HTML, CSS, and JavaScript.

Startups bid equity (ESOP %) to hire employees. This is a hot-seat game where 5 teams share one screen.

For this phase, I need:

LAYOUT:
- Top section: Employee card in the center showing Name, Role, Category, Hard Skill (0-1), and 1-2 Soft Skills (e.g., Resilience: 0.6)
- Below the card: "Current Bid: X% (Team Name)" display
- Bottom section: 5 team panels in a row, each showing:
  - Team name (Alpha, Beta, Gamma, Delta, Omega)
  - ESOP remaining (starts at 10%)
  - Number of employees hired
  - A large [BID] button

BIDDING FLOW:
- When a team clicks their [BID] button, show a modal with:
  - Current highest bid displayed
  - Quick increment buttons: [+0.5%] [+1%] [+2%]
  - A manual input field for custom bid
  - [Confirm Bid] button
- Bids must be higher than current highest bid
- Bids cannot exceed team's remaining ESOP pool
- After confirming, update the "Current Bid" display

CLOSE BIDDING:
- A [CLOSE BIDDING] button awards the employee to highest bidder
- Winner's ESOP pool decreases by bid amount
- Employee is added to winner's team (just track the count for now)
- A [SKIP CARD] button discards the card if no bids

Make buttons large and touch-friendly (min 48px). Use distinct colors for each team panel.

This phase is DONE when: I can see an employee card, tap a team's BID button, place a bid via modal, see the current bid update, close bidding, and see the winner's ESOP pool decrease.

Use vanilla JS with browser localStorage. No frameworks, no backend.
```

### Done Criteria
- [ ] Employee card displays with all stats
- [ ] 5 team panels with BID buttons
- [ ] Bid modal with increment buttons works
- [ ] Current highest bid updates correctly
- [ ] Close bidding assigns employee to winner
- [ ] Winner's ESOP pool decreases
- [ ] Skip card discards without hiring

---

## Phase 2: Full Auction + Team Management

**Goal:** Auction through 18 employees, each team must hire 3.

### Prompt

```
Continue building ESOP Wars (vanilla HTML/CSS/JS, hot-seat mode).

We now need to run a full auction with 18 employee cards. Each of the 5 teams must end up with exactly 3 employees.

EMPLOYEE CARD DATA (create in a separate data.js file):
- 18 employee cards with variety:
  - 5 categories: Product, Sales, Engineering, Ops, Finance (roughly 3-4 of each)
  - Each has: Name, Role, Category, Hard Skill (0.3-0.9), 1-2 Soft Skills from pool
  - Soft skill pool: Resilience, Communication, Pressure Handling, Leadership, Adaptability
  - Use diverse Indian names and startup-relevant roles

AUCTION FLOW:
- Show "Card X of 18" progress indicator at top
- [NEXT CARD] button reveals the next employee after each hire/skip
- Keep the hot-seat bidding UI from Phase 1
- If [SKIP CARD] is clicked with no bids, show "NO HIRE" toast message

BIDDING RULES:
- Teams cannot bid more than their remaining ESOP pool (disable BID button or show error)
- Teams who already have 3 employees cannot bid (disable their BID button, show "FULL" badge)

TEAM PANEL UPDATES:
- Show employees hired count: "Hired: 2/3"
- When a team hires their 3rd employee, show "COMPLETE" badge and disable their BID button
- Clicking on a team panel expands to show their hired employees with stats

END OF AUCTION:
- After card 18 (or all teams full), show auction summary screen
- List each team with their employees and remaining ESOP
- Teams with fewer than 3 employees show "DISQUALIFIED" in red
- [START MARKET ROUNDS] button to proceed (disabled if any team disqualified? or continue anyway?)

This phase is DONE when: I can run through all 18 cards, see teams hire employees, track ESOP pools, see complete/disqualified status, and reach the summary screen.

Use vanilla JS with localStorage. No frameworks, no backend.
```

### Done Criteria
- [ ] 18 unique employee cards in data.js
- [ ] Card progress indicator works
- [ ] Auction progresses card by card
- [ ] ESOP pool enforced (can't overbid)
- [ ] Teams lock at 3 employees with COMPLETE badge
- [ ] Team panel expands to show hired employees
- [ ] Disqualification shown for incomplete teams
- [ ] Summary screen at end of auction

---

## Phase 3: Market Rounds + Valuation

**Goal:** Apply market conditions, calculate valuations after each round.

### Prompt

```
Continue building ESOP Wars (vanilla HTML/CSS/JS).

After the auction, we enter market rounds where random conditions affect employee skills and company valuations.

STARTING STATE:
- Each team starts with 25M valuation
- Load team data and their hired employees from previous phase

MARKET CONDITION CARDS (add to data.js):
Create 4 market condition cards with modifiers. Example:

{
  name: "AI Hype Cycle",
  description: "AI investment is booming. Tech skills are hot.",
  hardSkillModifiers: {
    Engineering: +0.3,
    Product: +0.1,
    Sales: -0.2,
    Ops: 0,
    Finance: -0.1
  },
  softSkillModifiers: {
    Resilience: +0.1,
    Communication: 0,
    "Pressure Handling": +0.2,
    Leadership: 0,
    Adaptability: +0.1
  }
}

Create 4 diverse conditions: one tech-favoring, one sales-favoring, one crisis (soft skills matter), one balanced.

VALUATION FORMULA:
Skill Total = sum of (adjusted hard skill + adjusted soft skills) for all employees
New Valuation = Previous Valuation × (1 + Skill Total)

MARKET ROUND UI:
- Phase indicator: "SEED ROUND" / "EARLY SCALING" / "MATURE SCALING"
- [DRAW MARKET CARD] button reveals a random condition (remove from pool after drawn)
- Display the market card prominently with name, description, and all modifiers
- Show each team's employees with adjusted skill values (base → adjusted)
- Calculate and animate the new valuation for each team
- Show LEADERBOARD ranking teams by current valuation
- [NEXT ROUND] button to proceed

RUN 3 ROUNDS:
1. Seed Round → draw card, calculate, show leaderboard
2. Early Scaling → draw card, calculate, show leaderboard
3. (Secondary auction happens here - Phase 4)
4. Mature Scaling → draw card, calculate, show leaderboard

This phase is DONE when: I can progress through Seed and Early Scaling rounds, see market cards affect skills, watch valuations update, and see leaderboard after each round.

Use vanilla JS with localStorage. No frameworks, no backend.
```

### Done Criteria
- [ ] 4 market condition cards in data.js
- [ ] Phase indicator shows current round name
- [ ] Market card displays with all modifiers
- [ ] Employee skills show adjusted values
- [ ] Valuation formula calculates correctly
- [ ] Leaderboard ranks teams by valuation
- [ ] 2 rounds playable (Seed, Early Scaling) before Phase 4

---

## Phase 4: Secondary Auction + Exit + Polish

**Goal:** Complete game loop with secondary auction, exit, and winner declaration.

### Prompt

```
Continue building ESOP Wars (vanilla HTML/CSS/JS, hot-seat mode).

After the Early Scaling round (round 2), we have a secondary auction. Then Mature Scaling, then Exit.

SECONDARY AUCTION (after Early Scaling):

Drop Phase:
- Show all teams with their 3 employees
- Each team must drop 1 employee: show [DROP] button next to each employee
- When dropped, employee moves to "Available Pool"
- Team panel shows "2/3 employees - SELECT NEW HIRE"
- Once all 5 teams have dropped, proceed to hiring

Hiring Phase:
- Add 3 reserve employees (from data.js) to the pool → 8 total available
- Display all 8 cards in a grid (not sequential like main auction)
- Hot-seat bidding: teams can tap any available card to bid on it
- When a card is tapped, show bid modal (same as main auction)
- Any team can outbid by tapping the same card
- [CLOSE BIDDING ON THIS CARD] awards to highest bidder
- Once a team hires 1 employee, they cannot bid on other cards (show "HIRED" badge)
- Continue until all 5 teams have hired

MATURE SCALING ROUND:
- Same as other market rounds
- Draw remaining market card, apply modifiers, update valuations

EXIT ROUND:
- Show "EXIT ROUND" phase indicator
- 3 exit cards in data.js: IPO (2.5x), M&A (2.0x), Joint Venture (1.5x)
- [DRAW EXIT CARD] reveals random exit type
- Display exit card with multiplier and flavor text
- Apply multiplier to all team valuations with animation
- Show dramatic reveal of final valuations

WINNER DECLARATION:
- Full-screen winner announcement: "TEAM [NAME] WINS!"
- Show final valuation prominently
- Final leaderboard with all teams ranked 1-5
- Show each team's journey: starting 25M → final valuation
- [PLAY AGAIN] button clears localStorage and restarts

POLISH:
- Consistent card styling throughout (employees, market, exit)
- Phase progress bar at top: Auction → Seed → Early → Secondary → Mature → Exit
- Smooth transitions/animations between phases
- Color coding: green for gains, red for losses
- Touch-friendly for hot-seat play

This phase is DONE when: I can play the complete game from auction to exit, drop/hire in secondary auction, see winner declared, and restart.

Use vanilla JS with localStorage. No frameworks, no backend.
```

### Done Criteria
- [ ] Secondary auction drop phase works
- [ ] Secondary auction hiring with grid display
- [ ] Mature Scaling round works
- [ ] Exit card drawn and multiplier applied
- [ ] Winner declared with celebration
- [ ] Final leaderboard shows all teams
- [ ] Play Again restarts correctly
- [ ] Phase progress bar visible
- [ ] UI is polished and consistent

---

## Pre-Demo Checklist

Before demoing, verify:

1. ✅ Does it load without errors?
2. ✅ Can someone complete the main auction (hire 3 employees)?
3. ✅ Do market rounds change valuations?
4. ✅ Is there a winner at the end?

If all four: Ready to demo.

---

## Time Checkpoints

| Checkpoint | Status |
|------------|--------|
| Phase 1 complete | ~20 min in |
| Phase 2 complete | ~40 min in |
| Phase 3 complete | ~55 min in |
| Phase 4 complete | ~70 min in |

If running behind:
- Skip secondary auction (keep same 3 employees throughout)
- Use only 2 market rounds instead of 3
- Skip exit multiplier (final valuation = post-market valuation)

---

## Debugging Quick Reference

If something breaks:

```
There's an issue with [specific feature].

Current behavior: [what's happening]
Expected behavior: [what should happen]

Please fix this so that [clear description of working state].
```

If stuck for more than 5 minutes on one bug: cut the feature and move on.

---

## File Structure

```
/card-game
├── index.html          # Main game HTML
├── style.css           # All styling
├── data.js             # Employee cards, market cards, exit cards
├── game.js             # Game logic, state management
└── /rules
    ├── idea.md         # Iteration 1 spec
    ├── full-idea.md    # Complete game spec
    ├── discussion.md   # Decision log
    └── approach.md     # This file
```

### State Structure (game.js)

```javascript
const gameState = {
  phase: 'auction', // auction | seed | early | secondary | mature | exit | winner
  currentCardIndex: 0,
  teams: [
    {
      name: 'Alpha',
      color: '#FF6B6B',
      esopRemaining: 10,
      valuation: 25000000,
      employees: [],
      isComplete: false,
      isDisqualified: false
    },
    // ... 4 more teams
  ],
  employeeDeck: [], // shuffled from data.js
  reserveEmployees: [], // 3 cards for secondary auction
  droppedEmployees: [], // during secondary auction
  marketDeck: [], // shuffled from data.js
  usedMarketCards: [],
  currentBid: { teamIndex: null, amount: 0 },
  exitCard: null
};
```

---

## Build Complete Checklist

When done, you'll have built:

- [x] Hot-seat auction UI with bid modals
- [x] 18 employee cards with skills
- [x] Team management (3 employees each)
- [x] Market condition cards with modifiers
- [x] Valuation calculation and leaderboard
- [x] Secondary auction (drop 1, hire 1)
- [x] Exit round with multiplier
- [x] Winner declaration and Play Again

Ship it.

---

## V2 Roadmap (Multi-Device)

Future iteration for networked play:
- WebSocket server for real-time sync
- Each team on separate device
- QR code to join game room
- Facilitator dashboard
- Timer for bidding rounds
