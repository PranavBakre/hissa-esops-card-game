# V3: Best Investor Mechanic

## Summary

After the auction phase, players can invest in another team's company. This adds a new winner category -- **Best Investor** -- alongside the existing Best Founder and Best Employer awards. Investment is a side bet: the investor pays from their own valuation, the company receives nothing, and the investor's return is calculated at game end based on how well that company performed.

---

## Phase: Investment Round

**When:** After `auction-summary`, before `seed` (first market round).

**Flow:**

1. **Reveal** -- All teams see each other's locked segment + idea combos and hired employees.
2. **Declare Interest** -- Each team may choose one other team to invest in, or pass. You cannot invest in your own team.
3. **Resolve Conflicts** -- If multiple teams want to invest in the same company:
   - An auction is held among the interested parties.
   - Bids start at $100,000 and go up to a maximum of $1,000,000.
   - Highest bidder wins the investment slot.
   - On a tie, the target company's owner chooses which investor they want.
4. **Deduct Investment** -- The winning investor's bid amount is deducted from their valuation. The invested company receives nothing.
5. **Record** -- Each company can have at most one investor. Each team can invest in at most one company.

Teams that pass or lose the auction keep their valuation intact and simply have no investment.

---

## Constraints

| Rule | Value |
|------|-------|
| Min investment (bid floor) | $100,000 |
| Max investment (bid cap) | $1,000,000 |
| Investors per company | 1 |
| Investments per team | 1 |
| Self-investment | Not allowed |

---

## Best Investor Award

**Scoring:** Return multiple = invested company's final valuation / invested company's valuation at time of investment.

The investor whose chosen company has the highest return multiple wins Best Investor. This is a standalone award, independent of the investor's own team valuation.

If no one invested, the award is not given.

**Tiebreaker:** If two investors have the same return multiple, the one who paid less for their investment wins (better ROI per dollar).

---

## Phase Order (Updated)

```
registration -> setup -> setup-lock -> setup-summary
  -> auction -> auction-summary
  -> investment                        <-- NEW
  -> seed -> early
  -> secondary-drop -> secondary-hire
  -> mature -> exit -> winner
```

---

## Winner Screen (Updated)

The winner screen currently shows Best Founder (highest valuation) and Best Employer (most spent on employees). V3 adds:

| Award | Criteria |
|-------|----------|
| Best Founder | Highest final valuation |
| Best Employer | Highest (ESOP% given to employees) x valuation |
| Best Investor | Highest return multiple on investment |

---

## Bot Behavior

Bots should:

- Decide whether to invest based on visible team strength (employee quality, setup bonus).
- Bid conservatively -- prefer lower bids unless the target company looks very strong.
- Never bid more than 5% of their current valuation.
- On tie resolution (when the bot owns the target company), prefer the investor who bid more.

---

## State Changes

### New Fields on `Team`

```
investedInTeamIndex: number | null   -- which team this team invested in
investmentAmount: number             -- how much they paid (0 if no investment)
investorTeamIndex: number | null     -- which team invested in this team (if any)
```

### New Fields on `GameState`

```
investmentBids: Record<number, { targetTeam: number; amount: number }>
investmentConflicts: Record<number, number[]>   -- targetTeam -> list of bidding teams
```

### New Phase

```
phase: 'investment'
```

---

## UI

### Investment Screen

1. **Company cards** -- Show each team's name, segment, idea, employees, and current valuation. Your own team is grayed out (can't self-invest).
2. **Invest button** -- Select a team and set your bid amount ($100K - $1M slider or input).
3. **Conflict resolution** -- If multiple investors target the same company, show the auction UI (same style as employee auction). On ties, the target company owner sees a picker.
4. **Summary** -- After resolution, show who invested in whom and for how much.

### Winner Screen Addition

Add a third award card for Best Investor with the return multiple displayed.

---

## What This Does NOT Change

- Valuation mechanics, market rounds, wildcards, secondary market, and exit are unchanged.
- The invested company gets no valuation boost from the investment.
- Investment has no effect on gameplay -- it is purely a side bet for the Best Investor award.
