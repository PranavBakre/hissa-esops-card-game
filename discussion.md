# ESOP Wars — Design Discussion Log

## Initial Concept

The user proposed a card game for founders, marketers, and startup employees to help them understand ESOPs through gameplay.

### Original Vision (Full Scope)

**Three Stages:**

1. **Stage 1 — Company Setup**
   - Rummy-style card game
   - Each team gets 5 cards (1 market segment, 2 products, 2 services)
   - After 3 loops, must have 1 segment + at least 1 idea

2. **Stage 2 — Hiring (IPL-style Auction)**
   - 5 employee categories: Product, Sales, Engineering, Ops, Finance
   - Employees have perks, ESOP demands, hard skills, soft skills
   - Each team needs 3 employees

3. **Stage 3 — Market Rounds**
   - 4 growth stages: Seed, Early Scaling, Mature Scaling, Exit
   - Random market condition cards affect skill multipliers
   - Wildcard: double gains or skip losses (once per team)
   - Exit types: M&A, Joint Venture, IPO (each with own multiplier)

**Two Winners:**
1. Most value delivered to employees
2. Best investment return

---

## Iteration Breakdown

Following the ideation.md guidelines (keep it buildable in 60 min chunks), we split the game into iterations:

### Iteration 1: Core Loop
- Skip Stage 1 (no rummy drafting)
- Simplified auction + market rounds + exit
- Single winner (highest valuation)

### Iteration 2: Add Volatility
- 4 growth stages with market cards
- Wildcard mechanic

### Iteration 3: Add Company Identity
- Stage 1 rummy drafting
- Segment/product bonuses

### Iteration 4: Full Game
- All employee categories with full detail
- Two winners
- Disqualification rules

---

## Key Decisions Made

### Auction Mechanics

**Q: How many employee cards?**
A: 21 total — 18 in main auction, 3 reserve for secondary auction.

**Q: What happens to unhired cards in main auction?**
A: They're gone. Cannot be bid on later.

**Q: Secondary auction structure?**
A: After 2 market rounds, each team drops 1 employee. Dropped cards + 3 new cards = 8 available. Free-for-all open outcry. Each team hires 1.

**Q: Bidding currency?**
A: ESOP only (not salary). Each team has 10% pool to distribute across all hires.

**Q: Bidding style?**
A: Open outcry for both main and secondary auctions.

---

### Employee Cards

**Q: What's on an employee card?**
A: Name, Role, Category, Hard Skill (0-1), Soft Skills (1-2 variable traits, each 0-1).

**Q: Are soft skills fixed or variable?**
A: Variable — each employee has 1-2 soft skills from a larger pool (Resilience, Communication, Pressure Handling, etc.).

---

### Economy

**Q: Starting budget?**
A: 10% ESOP pool + 25M starting valuation.

**Q: Max ESOP allowed?**
A: 10% total across all hires.

---

### Valuation

**Q: How is valuation calculated?**
A: After each market round:
```
Skill Total = Σ (hard + soft skills) for all employees (with modifiers)
New Valuation = Previous Valuation × (1 + Skill Total)
```

---

### Deferred Decisions

- Wildcard mechanic → Iteration 2
- Two winners → Iteration 2
- Rummy drafting (Stage 1) → Iteration 3
- Specific market card effects → Define during build
- Exit multiplier values → Define during build
- Full soft skill pool → Define during build
