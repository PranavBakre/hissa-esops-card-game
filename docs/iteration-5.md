# ESOP Wars — Iteration 5 Plan

**Goal:** Add Market Leader Bonus mechanic

---

## Feature: Market Leader Bonus

### Concept

After each market round, the **top 2 teams by performance (gains)** in that round receive a **valuation doubling** bonus. This rewards teams who built strategically for the current market conditions.

**Key Points:**
- Based on **gains in that specific round**, not cumulative valuation
- Resets each round — different teams can win the bonus each time
- Creates dramatic swings and comeback opportunities
- Encourages diverse team composition to handle different market conditions

---

## Game Flow Impact

```
Market Round Flow:
1. Draw market card
2. Apply skill modifiers → Calculate base gains for each team
3. Rank teams by gains this round
4. Top 2 teams get valuation DOUBLED
5. Show leaderboard with Market Leader badges
6. Proceed to next round
```

---

## State Changes (`game.js`)

```javascript
// Add to gameState (for tracking round-by-round performance)
{
  ...existingState,
  roundPerformance: []  // Array of { round, gains: [{teamIndex, gain, isMarketLeader}] }
}

// Add to team object (for current round tracking)
{
  ...existingFields,
  previousValuation: 25000000,  // Valuation before current round
  currentGain: 0,               // Gain from current round (before bonus)
  isMarketLeader: false,        // Did they get the bonus this round?
  marketLeaderCount: 0          // Total times they've been market leader
}
```

---

## Logic Changes

### Modified `applyMarketCard()` Function

```javascript
function applyMarketCard(card) {
  // Store previous valuations
  gameState.teams.forEach(team => {
    if (!team.isDisqualified) {
      team.previousValuation = team.valuation;
    }
  });

  // Calculate base gains from skills (existing logic)
  gameState.teams.forEach((team, teamIndex) => {
    if (team.isDisqualified) return;

    let skillTotal = 0;

    team.employees.forEach(emp => {
      const hardMod = card.hardSkillModifiers[emp.category] || 0;
      const adjustedHard = Math.min(1, Math.max(0, emp.hardSkill + hardMod));

      let softTotal = 0;
      Object.entries(emp.softSkills).forEach(([skill, value]) => {
        const softMod = card.softSkillModifiers[skill] || 0;
        softTotal += Math.min(1, Math.max(0, value + softMod));
      });

      skillTotal += adjustedHard + softTotal;
    });

    // Apply wildcard effects if from Iteration 2
    let newValuation = Math.round(team.previousValuation * (1 + skillTotal * 0.1));

    // Apply setup bonus if from Iteration 3
    // Apply category perks if from Iteration 4
    // ... (other iteration effects)

    team.valuation = newValuation;
    team.currentGain = team.valuation - team.previousValuation;
    team.isMarketLeader = false;  // Reset, will be set below
  });

  // Apply Market Leader Bonus
  applyMarketLeaderBonus();

  saveState();
  render();
}

// New function: Apply Market Leader Bonus
function applyMarketLeaderBonus() {
  // Get active teams with their gains
  const teamGains = gameState.teams
    .map((team, idx) => ({
      teamIndex: idx,
      gain: team.isDisqualified ? -Infinity : team.currentGain,
      team: team
    }))
    .filter(t => !t.team.isDisqualified)
    .sort((a, b) => b.gain - a.gain);

  // Top 2 teams get valuation doubled
  const marketLeaders = teamGains.slice(0, 2);

  marketLeaders.forEach(leader => {
    const team = gameState.teams[leader.teamIndex];

    // Store pre-bonus valuation for UI display
    team.valuationBeforeBonus = team.valuation;

    // Double the valuation
    team.valuation = team.valuation * 2;
    team.isMarketLeader = true;
    team.marketLeaderCount = (team.marketLeaderCount || 0) + 1;

    // Update gain to include bonus
    team.totalGainThisRound = team.valuation - team.previousValuation;
  });

  // Store round performance for history/analytics
  const roundData = {
    round: gameState.phase,
    marketCard: gameState.currentMarketCard.name,
    gains: teamGains.map(t => ({
      teamIndex: t.teamIndex,
      teamName: t.team.name,
      baseGain: t.gain,
      isMarketLeader: t.team.isMarketLeader,
      finalValuation: t.team.valuation
    }))
  };

  gameState.roundPerformance = gameState.roundPerformance || [];
  gameState.roundPerformance.push(roundData);
}
```

### Helper Function: Get Round Performance Summary

```javascript
function getRoundPerformanceSummary() {
  const activeTeams = gameState.teams.filter(t => !t.isDisqualified);

  return activeTeams
    .map((team, idx) => ({
      teamIndex: idx,
      name: team.name,
      color: team.color,
      previousValuation: team.previousValuation,
      baseGain: team.currentGain,
      isMarketLeader: team.isMarketLeader,
      finalValuation: team.valuation,
      bonusAmount: team.isMarketLeader ? team.valuationBeforeBonus : 0
    }))
    .sort((a, b) => b.baseGain - a.baseGain);
}
```

---

## UI Changes

### 1. Leaderboard with Market Leader Badges

After market card is revealed and applied:

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 SEED ROUND RESULTS                                               │
│                                                                      │
│  Market Condition: AI Hype Cycle                                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  PERFORMANCE THIS ROUND                                        │  │
│  │                                                                │  │
│  │  🚀 #1  ALPHA    +₹8M gain  →  ₹66M → ₹132M  [2x BONUS]       │  │
│  │  🚀 #2  GAMMA    +₹6M gain  →  ₹62M → ₹124M  [2x BONUS]       │  │
│  │     #3  BETA     +₹4M gain  →  ₹54M                            │  │
│  │     #4  DELTA    +₹2M gain  →  ₹52M                            │  │
│  │     #5  OMEGA    -₹1M loss  →  ₹49M                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  OVERALL STANDINGS                                             │  │
│  │                                                                │  │
│  │  1. ALPHA   ₹132M  🚀                                         │  │
│  │  2. GAMMA   ₹124M  🚀                                         │  │
│  │  3. BETA    ₹54M                                              │  │
│  │  4. DELTA   ₹52M                                              │  │
│  │  5. OMEGA   ₹49M                                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Next Round]                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### 2. Market Leader Animation

When bonus is applied, show a dramatic animation:

```
┌─────────────────────────────────────────┐
│                                         │
│           🚀 MARKET LEADERS! 🚀          │
│                                         │
│    ALPHA and GAMMA led the market!      │
│                                         │
│         Valuations DOUBLED!             │
│                                         │
│    ALPHA: ₹66M  →  ₹132M               │
│    GAMMA: ₹62M  →  ₹124M               │
│                                         │
└─────────────────────────────────────────┘
```

### 3. Team Sidebar with Market Leader History

```
┌───────────┐
│   ALPHA   │
│  ───────  │
│ ESOP: 7%  │
│ Hired: 3  │
│ Val: ₹132M│
│           │
│ 🚀 Leader │
│    2x     │  ← Times they've been market leader
└───────────┘
```

### 4. Updated Phase Results Display

```javascript
function renderMarketRoundResults(app) {
  const performance = getRoundPerformanceSummary();
  const marketLeaders = performance.filter(p => p.isMarketLeader);

  const phaseNames = { seed: 'Seed Round', early: 'Early Scaling', mature: 'Mature Scaling' };

  app.innerHTML = `
    <div class="game-container with-sidebar">
      ${renderPhaseBar(gameState.phase)}

      <div class="game-layout">
        ${renderTeamsSidebar()}

        <main class="game-main">
          <div class="market-header">
            <h1>${phaseNames[gameState.phase]} Complete</h1>
          </div>

          <!-- Market Card Display -->
          <div class="market-card-display">
            <div class="market-card-icon">📊</div>
            <h2>${gameState.currentMarketCard.name}</h2>
            <p>${gameState.currentMarketCard.description}</p>
          </div>

          <!-- Market Leaders Announcement -->
          ${marketLeaders.length > 0 ? `
            <div class="market-leaders-announcement">
              <div class="leaders-icon">🚀</div>
              <h3>Market Leaders!</h3>
              <p>${marketLeaders.map(l => l.name).join(' and ')} led this round!</p>
              <div class="leaders-bonus">
                ${marketLeaders.map(l => `
                  <div class="leader-bonus-item" style="--team-color: ${l.color}">
                    <span class="leader-name">${l.name}</span>
                    <span class="leader-calc">
                      ${formatCurrency(l.bonusAmount)} → ${formatCurrency(l.finalValuation)}
                    </span>
                    <span class="leader-badge">2x</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Round Performance -->
          <div class="round-performance">
            <h3>Round Performance</h3>
            <div class="performance-list">
              ${performance.map((p, idx) => `
                <div class="performance-entry ${p.isMarketLeader ? 'market-leader' : ''}"
                     style="--team-color: ${p.color}">
                  <span class="perf-rank">${p.isMarketLeader ? '🚀' : ''} #${idx + 1}</span>
                  <span class="perf-icon" style="background: ${p.color}">${p.name.charAt(0)}</span>
                  <span class="perf-name">${p.name}</span>
                  <span class="perf-gain ${p.baseGain >= 0 ? 'positive' : 'negative'}">
                    ${p.baseGain >= 0 ? '+' : ''}${formatCurrency(p.baseGain)}
                  </span>
                  <span class="perf-final">${formatCurrency(p.finalValuation)}</span>
                  ${p.isMarketLeader ? '<span class="perf-bonus">[2x]</span>' : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Overall Leaderboard -->
          <div class="overall-leaderboard">
            <h3>Overall Standings</h3>
            ${renderLeaderboard()}
          </div>

          <div class="market-actions">
            <button class="action-btn primary large" onclick="nextRound()">
              ${gameState.phase === 'early' ? 'Start Secondary Auction' :
                gameState.phase === 'mature' ? 'Proceed to Exit' : 'Next Round'}
            </button>
          </div>
        </main>
      </div>
    </div>
  `;
}
```

---

## CSS Additions

```css
/* Market Leaders Announcement */
.market-leaders-announcement {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 107, 107, 0.15));
  border: 2px solid gold;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  margin: 2rem 0;
  animation: leaderGlow 2s ease-in-out infinite alternate;
}

@keyframes leaderGlow {
  from {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  to {
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
  }
}

.leaders-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  animation: rocketBounce 0.5s ease-in-out infinite alternate;
}

@keyframes rocketBounce {
  from { transform: translateY(0); }
  to { transform: translateY(-10px); }
}

.market-leaders-announcement h3 {
  font-size: 1.5rem;
  color: gold;
  margin-bottom: 0.5rem;
}

.leaders-bonus {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
}

.leader-bonus-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border-left: 4px solid var(--team-color);
}

.leader-name {
  font-weight: 700;
  color: var(--team-color);
  font-size: 1.125rem;
}

.leader-calc {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0.25rem 0;
}

.leader-badge {
  background: gold;
  color: black;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

/* Round Performance List */
.round-performance {
  margin: 2rem 0;
}

.round-performance h3 {
  margin-bottom: 1rem;
}

.performance-list {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
}

.performance-entry {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s;
}

.performance-entry:last-child {
  border-bottom: none;
}

.performance-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.performance-entry.market-leader {
  background: rgba(255, 215, 0, 0.1);
}

.perf-rank {
  width: 3rem;
  font-weight: 600;
}

.perf-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
}

.perf-name {
  flex: 1;
  font-weight: 600;
}

.perf-gain {
  font-weight: 600;
  min-width: 80px;
  text-align: right;
}

.perf-gain.positive {
  color: var(--success);
}

.perf-gain.negative {
  color: var(--danger);
}

.perf-final {
  min-width: 100px;
  text-align: right;
  color: var(--primary);
  font-weight: 600;
}

.perf-bonus {
  background: gold;
  color: black;
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

/* Market Leader indicator in sidebar */
.sidebar-market-leader {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: gold;
  margin-top: 0.25rem;
}

.sidebar-market-leader .leader-count {
  background: rgba(255, 215, 0, 0.2);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}
```

---

## Edge Cases

### 1. Tie for 2nd Place
If multiple teams have the same gain for 2nd place:
```javascript
// Option A: All tied teams get the bonus
// Option B: Random selection among tied teams
// Option C: Use overall valuation as tiebreaker

// Recommended: Option C - higher overall valuation wins tie
const teamGains = gameState.teams
  .map((team, idx) => ({
    teamIndex: idx,
    gain: team.currentGain,
    valuation: team.valuation  // Tiebreaker
  }))
  .sort((a, b) => {
    if (b.gain !== a.gain) return b.gain - a.gain;
    return b.valuation - a.valuation;  // Higher valuation wins tie
  });
```

### 2. Negative Gains
If all teams have negative gains:
- Top 2 teams with the **least negative** gains still get doubled
- This means they recover faster from bad market conditions

### 3. Only 1-2 Active Teams
If teams are disqualified and fewer than 2 remain:
```javascript
const activeTeams = teamGains.filter(t => !t.team.isDisqualified);
const leadersCount = Math.min(2, activeTeams.length);
const marketLeaders = activeTeams.slice(0, leadersCount);
```

---

## Integration with Other Iterations

### With Iteration 2 (Wildcard)
- Wildcard effects apply **before** market leader calculation
- A team using "Double Down" might gain more and become market leader
- A team using "Shield" might avoid losses and become market leader

### With Iteration 3 (Setup Bonuses)
- Setup bonuses affect skill totals, influencing gains
- Teams with good segment+idea combos may more easily become market leaders

### With Iteration 4 (Category Perks)
- Category perks apply during gain calculation
- Engineering's "Ship Fast" during Rapid Scaling could help secure market leader

---

## Implementation Checklist

### State
- [ ] Add `roundPerformance` array to gameState
- [ ] Add `previousValuation`, `currentGain`, `isMarketLeader`, `marketLeaderCount` to team object
- [ ] Add `valuationBeforeBonus` for UI display

### Logic
- [ ] Modify `applyMarketCard()` to store previous valuations
- [ ] Implement `applyMarketLeaderBonus()` function
- [ ] Implement `getRoundPerformanceSummary()` helper
- [ ] Handle tie-breaker logic
- [ ] Handle edge cases (negative gains, few active teams)

### UI
- [ ] Create market leaders announcement component
- [ ] Update leaderboard to show round performance
- [ ] Add market leader badges (🚀)
- [ ] Add 2x bonus indicators
- [ ] Update team sidebar with market leader count
- [ ] Add rocket bounce animation
- [ ] Add glow animation for announcement

### CSS
- [ ] Style market leaders announcement
- [ ] Style round performance list
- [ ] Add animations (glow, bounce)
- [ ] Style sidebar market leader indicator

---

## Testing Scenarios

1. **Normal case**: Top 2 teams by gains get doubled
2. **Tie for 2nd**: Tiebreaker by valuation works
3. **All negative gains**: Least negative teams still get bonus
4. **Single active team**: Only 1 team gets bonus
5. **Different leaders each round**: Market leaders change based on performance
6. **Integration with wildcard**: Double Down affects gain calculation correctly
7. **Dramatic comeback**: Low-valuation team becomes market leader and catches up

---

## Balance Considerations

This mechanic creates significant variance:
- **Snowballing**: Good teams can pull ahead quickly
- **Comebacks**: Any team can become market leader with right composition
- **Strategy depth**: Teams must balance for multiple market conditions

**Potential balance levers:**
- Change bonus from 2x to 1.5x if too swingy
- Give bonus to only 1 team instead of 2
- Cap the bonus amount (e.g., max +₹50M from bonus)

---

## File Changes Summary

| File | Changes |
|------|---------|
| `game.js` | Modify `applyMarketCard()`, add `applyMarketLeaderBonus()`, add `getRoundPerformanceSummary()`, update team state tracking |
| `style.css` | Add market leader announcement styles, performance list styles, animations |
| `data.js` | No changes needed |
| `index.html` | No changes needed |
