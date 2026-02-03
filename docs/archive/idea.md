# ESOP Wars — Iteration 1 Spec

**One-liner:** Bid equity to build your startup team, survive market swings, exit rich.

**Players:** 5 teams
**Win Condition:** Highest company valuation at exit

---

## Starting State

| Resource | Amount |
|----------|--------|
| ESOP Pool | 10% |
| Starting Valuation | 25M |

---

## Cards

### Employee Cards (18 main + 3 reserve = 21 total)

Each card contains:

| Field | Description | Example |
|-------|-------------|---------|
| Name | Flavor | "Priya Sharma" |
| Role | Job title | "Backend Engineer" |
| Category | One of 5 types | Engineering |
| Hard Skill | Technical ability | 0.7 |
| Soft Skills | 1-2 traits from pool, each scored 0-1 | Resilience: 0.6, Communication: 0.4 |

**Categories:** Product, Sales, Engineering, Ops, Finance

**Soft Skill Pool:** Resilience, Communication, Pressure Handling, (others TBD)

---

### Market Condition Cards (4 total — one per growth stage)

Each card modifies skill scores based on category and skill type.

Example:
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
```

---

### Exit Cards (3 total — one drawn at random)

| Exit Type | Multiplier |
|-----------|------------|
| IPO | TBD |
| M&A | TBD |
| Joint Venture | TBD |

---

## Game Flow

### Phase 1: Main Auction

- 18 employee cards, revealed one at a time
- Open outcry bidding — teams bid ESOP %
- If no bids, card is discarded (cannot be bid on later)
- Each team must end with exactly 3 employees
- Teams that fail to hire 3 are disqualified

### Phase 2: Seed Round

- Draw 1 market condition card
- Apply modifiers to all employee skills
- Recalculate team valuations

### Phase 3: Early Scaling Round

- Draw 1 market condition card
- Apply modifiers
- Recalculate valuations

### Phase 4: Secondary Auction

- Each team drops 1 employee → 5 cards returned to pool
- Add 3 reserve cards → 8 total available
- Free-for-all open outcry (all cards available simultaneously)
- Each team hires exactly 1 employee

### Phase 5: Mature Scaling Round

- Draw 1 market condition card
- Apply modifiers
- Recalculate valuations

### Phase 6: Exit

- Draw 1 exit card at random
- Apply exit multiplier to final valuation
- Highest valuation wins

---

## Valuation Formula

After each market round:

```
Skill Total = Σ (hard skill + soft skills) for all employees (after modifiers)
New Valuation = Previous Valuation × (1 + Skill Total)
```

---

## Constraints

- Max ESOP pool: 10% total across all hires
- Must have 3 employees after main auction (or disqualified)
- Unhired cards in main auction are permanently removed

---

## Deferred to Later Iterations

- [ ] Wildcard (double gains / skip losses) — Iteration 2
- [ ] Two winners (best for employees + best investor) — Iteration 2
- [ ] Stage 1: Rummy-style drafting for market segment + product/service — Iteration 3
- [ ] Full 5 employee categories with detailed perks — Iteration 4
