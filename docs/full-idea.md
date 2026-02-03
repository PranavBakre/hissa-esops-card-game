# ESOP Wars — Full Game Spec

**One-liner:** Bid equity to build your startup team, survive market swings, exit rich.

**Purpose:** Help founders, marketers, and startup employees understand ESOPs through gameplay.

**Players:** 5 teams

**Winners:**
1. Highest company valuation at exit (best founder)
2. Most value delivered to employees (best employer)

---

## Starting State

| Resource | Amount |
|----------|--------|
| ESOP Pool | 10% |
| Starting Valuation | 25M |
| Starting Cash | 10M |

---

## Game Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: Company Setup (Rummy-style drafting)                  │
│  → Each team locks: 1 Market Segment + 1 Product/Service        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: Hiring (IPL-style Auction)                            │
│  → Main Auction: 18 employees, bid ESOP%, must hire 3           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: Growth Rounds                                         │
│                                                                 │
│  1. Seed Round         → Market card, recalc valuation          │
│  2. Early Scaling      → Market card, recalc valuation          │
│  3. Secondary Auction  → Drop 1, hire 1 from pool of 8          │
│  4. Mature Scaling     → Market card, recalc valuation          │
│  5. Exit               → Exit card, final multiplier, winners   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Company Setup

**Format:** Rummy-style card drafting

### Setup
- Each team receives 5 cards:
  - 1 Market Segment card
  - 2 Product cards
  - 2 Service cards

### Gameplay
- 3 rounds of drafting
- Each round: drop 1 card, pick 1 card from deck
- After 3 rounds, each team must have:
  - Exactly 1 Market Segment
  - At least 1 Idea (Product or Service)

### Market Segment Cards
Examples: B2B SaaS, D2C Consumer, Fintech, Healthtech, Edtech, etc.

### Product/Service Cards
Examples: Analytics Platform, Payment Gateway, HR Tool, Delivery Service, etc.

### Bonuses
Certain Segment + Idea combinations give bonuses to specific employee categories.

Example:
```
"B2B SaaS" + "Analytics Platform"
→ Engineering employees: +0.1 to hard skills
→ Sales employees: +0.1 to hard skills
```

---

## Stage 2: Hiring (Main Auction)

**Format:** IPL-style open outcry auction

### Employee Pool
- 18 cards in main auction
- 3 cards in reserve (for secondary auction)
- 21 total employees

### Employee Card Structure

| Field | Description | Example |
|-------|-------------|---------|
| Name | Flavor | "Priya Sharma" |
| Role | Job title | "Backend Engineer" |
| Category | One of 5 types | Engineering |
| Hard Skill | Technical ability (0-1) | 0.7 |
| Soft Skills | 1-2 traits from pool (each 0-1) | Resilience: 0.6 |

### Employee Categories
1. **Product** — PMs, designers, researchers
2. **Sales** — AEs, BDRs, account managers
3. **Engineering** — Developers, architects, DevOps
4. **Ops** — Operations, support, logistics
5. **Finance** — CFOs, accountants, analysts

### Soft Skill Pool
- Resilience
- Communication
- Pressure Handling
- Leadership
- Adaptability
- Problem Solving
- (expandable)

### Auction Rules
- Cards revealed one at a time
- Open outcry bidding — teams bid ESOP %
- Highest bidder wins the employee
- If no bids, card is discarded permanently
- Each team must end with exactly 3 employees
- Teams that fail to hire 3 are **disqualified**

### Constraints
- Max 10% ESOP total across all hires
- Cannot bid more than remaining ESOP pool

---

## Stage 3: Growth Rounds

### Round 1: Seed

1. Draw 1 market condition card at random
2. Apply skill modifiers to all employees
3. Recalculate team valuations
4. (Optional) Use wildcard

### Round 2: Early Scaling

1. Draw 1 market condition card
2. Apply modifiers
3. Recalculate valuations
4. (Optional) Use wildcard

### Secondary Auction

After Early Scaling:

1. Each team drops 1 employee → 5 cards returned
2. Add 3 reserve cards → 8 total available
3. Free-for-all open outcry (all cards visible simultaneously)
4. Each team hires exactly 1 employee
5. Remaining cards are discarded

### Round 3: Mature Scaling

1. Draw 1 market condition card
2. Apply modifiers
3. Recalculate valuations
4. (Optional) Use wildcard

### Round 4: Exit

1. Draw 1 exit card at random
2. Apply exit multiplier
3. Calculate final valuations
4. Declare winners

---

## Market Condition Cards

Each card represents market conditions that favor or hurt certain skills.

### Structure
```
📈 "AI Hype Cycle"

Hard Skill Modifiers:
  Engineering: +0.3
  Product: +0.1
  Sales: -0.2
  Ops: 0
  Finance: 0

Soft Skill Modifiers:
  Resilience: +0.2
  Communication: 0
  Pressure Handling: -0.1
  Leadership: +0.1
  Adaptability: +0.2
  Problem Solving: +0.1
```

### Example Market Conditions
- "AI Hype Cycle" — Engineering boom
- "Funding Winter" — Finance and resilience matter
- "Growth at All Costs" — Sales surge, ops suffer
- "Regulatory Crackdown" — Finance and ops critical
- "Talent War" — Soft skills premium
- "Market Crash" — Pressure handling essential

---

## Exit Cards

| Exit Type | Description | Multiplier |
|-----------|-------------|------------|
| **IPO** | Public offering, high reward | 2.5x |
| **M&A** | Acquired by larger company | 2.0x |
| **Joint Venture** | Strategic partnership | 1.5x |

(Multipliers are indicative — balance during playtesting)

---

## Wildcard

Each team has **1 wildcard** usable once per game.

**Options when played:**
- **Double Down:** 2x gains from this round
- **Shield:** Skip all losses from this round

Must declare before market card is revealed.

---

## Valuation Formula

### After Each Market Round

```
Adjusted Skill = Base Skill + Market Modifier

Skill Total = Σ (adjusted hard skill + adjusted soft skills) for all employees

New Valuation = Previous Valuation × (1 + Skill Total)
```

### At Exit

```
Final Valuation = Pre-Exit Valuation × Exit Multiplier
```

---

## Winning Conditions

### Winner 1: Best Founder
Highest final company valuation.

### Winner 2: Best Employer
Calculated by total value delivered to employees:

```
Employee Value = Σ (ESOP % given × Final Valuation) for all employees
```

The team that gave the most total value to their employees wins this category.

---

## Disqualification Rules

A team is disqualified if:
- They fail to hire 3 employees in main auction
- They exceed 10% ESOP pool (impossible if enforced, but included for clarity)

---

## Iteration Roadmap

### Iteration 1 (MVP)
- [x] Main auction (18 cards, ESOP bidding)
- [x] 4 market rounds (Seed, Early, Mature, Exit)
- [x] Secondary auction
- [x] Single winner (highest valuation)
- [ ] Skip Stage 1 (no rummy drafting)
- [ ] No wildcard

### Iteration 2
- [ ] Add wildcard mechanic
- [ ] Add second winner (best employer)

### Iteration 3
- [ ] Add Stage 1 (rummy drafting)
- [ ] Segment + Idea bonuses

### Iteration 4
- [ ] Full employee category details
- [ ] Expanded soft skill pool
- [ ] Playtesting balance pass

---

## Open Design Questions

1. **Soft skill pool size** — How many soft skills total? 6? 10?
2. **Employee distribution** — How many of each category in the 21 cards?
3. **Market card count** — Exactly 4, or more with random selection?
4. **Segment/Idea combinations** — How many? What bonuses?
5. **Tie-breakers** — What if two teams have same valuation?
6. **ESOP vesting** — Does timing of hire affect employee value calculation?
