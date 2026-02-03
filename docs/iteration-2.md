# ESOP Wars — Iteration 2 Plan

**Goal:** Add Wildcard mechanic + Second Winner (Best Employer)

---

## Feature 1: Wildcard Mechanic

### Concept
Each team has **1 wildcard** usable once per game during market rounds (Seed, Early Scaling, or Mature Scaling).

**Options when played:**
- **Double Down:** 2x gains from this market round
- **Shield:** Skip all losses from this market round

Must declare **before** the market card is revealed.

### Data Changes (`data.js`)

No new card data needed. Wildcard is a team resource.

### State Changes (`game.js`)

```javascript
// Add to team object in initGame()
{
  ...existingFields,
  wildcardUsed: false,
  wildcardType: null,  // 'double' | 'shield' | null for current round
}

// Add to gameState
{
  ...existingState,
  wildcardPhase: false,  // true when collecting wildcard decisions before market draw
  teamWildcardSelections: {}  // { teamIndex: 'double' | 'shield' | null }
}
```

### UI Changes

#### 1. Wildcard Decision Phase (before each market round)

Before drawing the market card, show a "Wildcard Decision" screen:

```
┌─────────────────────────────────────────────────────────────────┐
│  🃏 WILDCARD DECISION - SEED ROUND                              │
│                                                                 │
│  Use your wildcard now? You won't see the market card first!   │
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │     ALPHA       │ │      BETA       │ │     GAMMA       │   │
│  │                 │ │                 │ │                 │   │
│  │ [Double Down]   │ │ [Double Down]   │ │  🃏 USED        │   │
│  │ [Shield]        │ │ [Shield]        │ │                 │   │
│  │ [Pass]          │ │ [Pass]          │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  Teams locked: 2/5                                              │
│                                                                 │
│  [All Teams Decided - Draw Market Card]                         │
└─────────────────────────────────────────────────────────────────┘
```

**UI Elements:**
- Show each team's panel with 3 buttons: `Double Down`, `Shield`, `Pass`
- Once a team selects, lock their decision and show selection badge
- Teams who already used wildcard show "USED" badge (greyed out)
- Disqualified teams skipped
- Progress indicator: "Teams locked: X/5"
- Main action button enabled when all teams have decided

#### 2. Wildcard Badge in Market Results

After market card revealed, show wildcard effects in the leaderboard:

```
┌──────────────────────────────────────────────────────────────┐
│  LEADERBOARD                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. Alpha   ₹45M  [🃏 DOUBLE: +₹20M → +₹40M]           │  │
│  │ 2. Beta    ₹38M  [🛡️ SHIELD: Losses blocked]          │  │
│  │ 3. Gamma   ₹32M                                        │  │
│  │ 4. Delta   ₹28M                                        │  │
│  │ 5. Omega   ₹25M                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### 3. Wildcard Status in Team Sidebar

Add wildcard indicator to sidebar team panels:

```
┌───────────┐
│   ALPHA   │
│  ───────  │
│ ESOP: 7%  │
│ Hired: 3  │
│ 🃏 Ready  │  ← or "🃏 Used" if consumed
└───────────┘
```

### Logic Changes

#### New Functions

```javascript
// Start wildcard decision phase
function startWildcardPhase() {
  gameState.wildcardPhase = true;
  gameState.teamWildcardSelections = {};

  // Pre-fill teams that can't use wildcard (used or disqualified)
  gameState.teams.forEach((team, idx) => {
    if (team.isDisqualified || team.wildcardUsed) {
      gameState.teamWildcardSelections[idx] = null;
    }
  });

  saveState();
  render();
}

// Team selects wildcard option
function selectWildcard(teamIndex, choice) {
  // choice: 'double' | 'shield' | null (pass)
  if (gameState.teams[teamIndex].wildcardUsed && choice !== null) {
    showToast('Wildcard already used!', 'error');
    return;
  }

  gameState.teamWildcardSelections[teamIndex] = choice;

  if (choice !== null) {
    gameState.teams[teamIndex].wildcardType = choice;
    gameState.teams[teamIndex].wildcardUsed = true;
  }

  saveState();
  render();
}

// Check if all teams have decided
function allWildcardsDecided() {
  const activeTeams = gameState.teams.filter(t => !t.isDisqualified);
  return activeTeams.every((_, idx) =>
    gameState.teamWildcardSelections.hasOwnProperty(idx)
  );
}

// End wildcard phase and proceed to market draw
function endWildcardPhase() {
  gameState.wildcardPhase = false;
  saveState();
  render();
}
```

#### Modified Functions

**`applyMarketCard(card)`** - Add wildcard effects:

```javascript
function applyMarketCard(card) {
  gameState.teams.forEach((team, teamIndex) => {
    if (team.isDisqualified) return;

    const previousValuation = team.valuation;
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

    let newValuation = Math.round(previousValuation * (1 + skillTotal * 0.1));
    let change = newValuation - previousValuation;

    // Apply wildcard effects
    const wildcardChoice = team.wildcardType;
    if (wildcardChoice === 'double' && change > 0) {
      change = change * 2;
      newValuation = previousValuation + change;
    } else if (wildcardChoice === 'shield' && change < 0) {
      change = 0;
      newValuation = previousValuation;
    }

    team.valuation = newValuation;
    team.lastChange = change;  // Store for UI display
    team.wildcardType = null;  // Clear for next round
  });
}
```

**`renderMarketRound(app)`** - Add wildcard phase rendering:

```javascript
function renderMarketRound(app) {
  // Check if we need wildcard phase first
  if (!gameState.wildcardPhase && !gameState.currentMarketCard) {
    // Render wildcard decision screen
    renderWildcardPhase(app);
    return;
  }

  // ... existing market round render logic
}
```

### New Render Function

```javascript
function renderWildcardPhase(app) {
  const phaseNames = { seed: 'Seed Round', early: 'Early Scaling', mature: 'Mature Scaling' };
  const decidedCount = Object.keys(gameState.teamWildcardSelections).length;
  const activeTeams = gameState.teams.filter(t => !t.isDisqualified);

  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar(gameState.phase)}

      <main class="wildcard-main">
        <div class="wildcard-header">
          <div class="wildcard-icon">🃏</div>
          <h1>Wildcard Decision</h1>
          <p>${phaseNames[gameState.phase]} is coming. Use your wildcard now?</p>
          <p class="wildcard-warning">⚠️ You won't see the market card before deciding!</p>
        </div>

        <div class="wildcard-grid">
          ${gameState.teams.map((team, idx) => {
            if (team.isDisqualified) return '';

            const hasDecided = gameState.teamWildcardSelections.hasOwnProperty(idx);
            const decision = gameState.teamWildcardSelections[idx];
            const alreadyUsed = team.wildcardUsed && !hasDecided;

            return `
              <div class="wildcard-card ${hasDecided ? 'decided' : ''}" style="--team-color: ${team.color}">
                <div class="wildcard-card-header">
                  <span class="team-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                  <span class="team-name">${team.name}</span>
                </div>

                ${alreadyUsed ? `
                  <div class="wildcard-used">
                    <span class="used-icon">🃏</span>
                    <span>Wildcard Used</span>
                  </div>
                ` : hasDecided ? `
                  <div class="wildcard-decision">
                    ${decision === 'double' ? '⚡ Double Down' :
                      decision === 'shield' ? '🛡️ Shield' : '➡️ Pass'}
                  </div>
                ` : `
                  <div class="wildcard-options">
                    <button class="wildcard-btn double" onclick="selectWildcard(${idx}, 'double')">
                      <span class="btn-icon">⚡</span>
                      <span class="btn-label">Double Down</span>
                      <span class="btn-desc">2x gains this round</span>
                    </button>
                    <button class="wildcard-btn shield" onclick="selectWildcard(${idx}, 'shield')">
                      <span class="btn-icon">🛡️</span>
                      <span class="btn-label">Shield</span>
                      <span class="btn-desc">Block all losses</span>
                    </button>
                    <button class="wildcard-btn pass" onclick="selectWildcard(${idx}, null)">
                      <span class="btn-icon">➡️</span>
                      <span class="btn-label">Pass</span>
                      <span class="btn-desc">Save for later</span>
                    </button>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>

        <div class="wildcard-progress">
          <div class="progress-text">Teams decided: ${decidedCount}/${activeTeams.length}</div>
          ${decidedCount === activeTeams.length ? `
            <button class="action-btn primary large" onclick="endWildcardPhase()">
              Draw Market Card
            </button>
          ` : ''}
        </div>
      </main>
    </div>
  `;
}
```

### CSS Additions (`style.css`)

```css
/* Wildcard Phase */
.wildcard-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.wildcard-header {
  text-align: center;
  margin-bottom: 2rem;
}

.wildcard-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.wildcard-warning {
  color: var(--warning);
  font-weight: 600;
  margin-top: 0.5rem;
}

.wildcard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.wildcard-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.wildcard-card.decided {
  border-color: var(--team-color);
  opacity: 0.8;
}

.wildcard-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.wildcard-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.wildcard-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  cursor: pointer;
  transition: all 0.2s;
}

.wildcard-btn:hover {
  border-color: var(--team-color);
}

.wildcard-btn.double:hover {
  background: rgba(255, 215, 0, 0.1);
  border-color: gold;
}

.wildcard-btn.shield:hover {
  background: rgba(74, 144, 226, 0.1);
  border-color: #4a90e2;
}

.btn-icon {
  font-size: 1.5rem;
}

.btn-label {
  font-weight: 600;
  margin-top: 0.25rem;
}

.btn-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.wildcard-decision {
  text-align: center;
  padding: 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.wildcard-used {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-muted);
}

.wildcard-progress {
  text-align: center;
}

/* Wildcard indicator in sidebar */
.sidebar-wildcard {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.sidebar-wildcard.ready {
  color: gold;
}

.sidebar-wildcard.used {
  color: var(--text-muted);
}

/* Leaderboard wildcard effect */
.lb-wildcard-effect {
  font-size: 0.75rem;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.lb-wildcard-effect.double {
  background: rgba(255, 215, 0, 0.2);
  color: gold;
}

.lb-wildcard-effect.shield {
  background: rgba(74, 144, 226, 0.2);
  color: #4a90e2;
}
```

---

## Feature 2: Second Winner (Best Employer)

### Concept
In addition to "Best Founder" (highest valuation), award "Best Employer" to the team that delivered the most value to their employees.

**Employee Value Formula:**
```
Employee Value = Σ (ESOP % given × Final Valuation) for all employees
```

The team with highest total Employee Value wins "Best Employer."

### State Changes (`game.js`)

No new state needed. Calculate at winner screen.

### Logic Changes

#### New Function

```javascript
// Calculate employee value for a team
function calculateEmployeeValue(team) {
  return team.employees.reduce((total, emp) => {
    const employeeValue = (emp.bidAmount / 100) * team.valuation;
    return total + employeeValue;
  }, 0);
}

// Get best employer
function getBestEmployer() {
  const teamsWithValue = gameState.teams
    .filter(t => !t.isDisqualified)
    .map(team => ({
      ...team,
      employeeValue: calculateEmployeeValue(team)
    }))
    .sort((a, b) => b.employeeValue - a.employeeValue);

  return teamsWithValue[0];
}

// Get winner details for both categories
function getWinners() {
  const bestFounder = getWinner();  // Existing function (highest valuation)
  const bestEmployer = getBestEmployer();

  return {
    founder: bestFounder,
    employer: bestEmployer,
    sameTeam: bestFounder.name === bestEmployer.name
  };
}
```

### UI Changes

#### Modified Winner Screen

```javascript
function renderWinner(app) {
  const winners = getWinners();
  const sortedTeams = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  const sortedByEmployeeValue = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .map(team => ({
      ...team,
      employeeValue: calculateEmployeeValue(team)
    }))
    .sort((a, b) => b.employeeValue - a.employeeValue);

  app.innerHTML = `
    <div class="winner-container dual-winners">
      <div class="winners-display">
        <!-- Best Founder -->
        <div class="winner-card founder">
          <div class="winner-badge">🏢</div>
          <h2>Best Founder</h2>
          <p class="winner-subtitle">Highest Company Valuation</p>
          <div class="trophy">🏆</div>
          <div class="winner-team" style="color: ${winners.founder.color}">
            ${winners.founder.name}
          </div>
          <div class="winner-valuation">${formatCurrency(winners.founder.valuation)}</div>
          <div class="winner-detail">
            <strong>Building:</strong> ${winners.founder.problemStatement}
          </div>
        </div>

        <!-- Best Employer -->
        <div class="winner-card employer">
          <div class="winner-badge">💼</div>
          <h2>Best Employer</h2>
          <p class="winner-subtitle">Most Value to Employees</p>
          <div class="trophy">🎖️</div>
          <div class="winner-team" style="color: ${winners.employer.color}">
            ${winners.employer.name}
          </div>
          <div class="winner-valuation">${formatCurrency(winners.employer.employeeValue)}</div>
          <div class="winner-detail">
            <strong>ESOP Given:</strong> ${(10 - winners.employer.esopRemaining).toFixed(1)}%
          </div>
        </div>
      </div>

      ${winners.sameTeam ? `
        <div class="double-winner-banner">
          🎉 ${winners.founder.name} wins BOTH categories! 🎉
        </div>
      ` : ''}

      <div class="rankings-section">
        <div class="ranking-column">
          <h3>💰 Valuation Ranking</h3>
          ${sortedTeams.map((team, idx) => `
            <div class="rank-entry" style="--team-color: ${team.color}">
              <span class="rank">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
              <span class="rank-name">${team.name}</span>
              <span class="rank-value">${formatCurrency(team.valuation)}</span>
            </div>
          `).join('')}
        </div>

        <div class="ranking-column">
          <h3>💼 Employee Value Ranking</h3>
          ${sortedByEmployeeValue.map((team, idx) => `
            <div class="rank-entry" style="--team-color: ${team.color}">
              <span class="rank">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
              <span class="rank-name">${team.name}</span>
              <span class="rank-value">${formatCurrency(team.employeeValue)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="employee-breakdown">
        <h3>Employee ESOP Breakdown</h3>
        <div class="breakdown-grid">
          ${gameState.teams.filter(t => !t.isDisqualified).map(team => `
            <div class="breakdown-card" style="--team-color: ${team.color}">
              <h4>${team.name}</h4>
              <div class="breakdown-employees">
                ${team.employees.map(emp => {
                  const value = (emp.bidAmount / 100) * team.valuation;
                  return `
                    <div class="emp-value-row">
                      <span class="emp-name">${emp.name}</span>
                      <span class="emp-esop">${emp.bidAmount}%</span>
                      <span class="emp-value">${formatCurrency(value)}</span>
                    </div>
                  `;
                }).join('')}
              </div>
              <div class="breakdown-total">
                <span>Total Employee Value:</span>
                <strong>${formatCurrency(calculateEmployeeValue(team))}</strong>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <button class="action-btn primary large" onclick="resetGame()">
        Play Again
      </button>
    </div>
  `;
}
```

### CSS Additions for Dual Winners

```css
/* Dual Winner Display */
.winner-container.dual-winners {
  padding: 2rem;
}

.winners-display {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto 2rem;
}

.winner-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  border: 3px solid transparent;
}

.winner-card.founder {
  border-color: gold;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), transparent);
}

.winner-card.employer {
  border-color: #4ECDC4;
  background: linear-gradient(135deg, rgba(78, 205, 196, 0.1), transparent);
}

.winner-badge {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.winner-subtitle {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.winner-card .trophy {
  font-size: 4rem;
  margin: 1rem 0;
}

.double-winner-banner {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  padding: 1rem;
  background: linear-gradient(90deg, gold, #4ECDC4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 2rem;
}

.rankings-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 800px;
  margin: 0 auto 2rem;
}

.ranking-column {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
}

.ranking-column h3 {
  margin-bottom: 1rem;
  text-align: center;
}

.rank-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.rank-entry:hover {
  background: rgba(255, 255, 255, 0.05);
}

.rank {
  width: 2rem;
  text-align: center;
}

.rank-name {
  flex: 1;
  font-weight: 600;
}

.rank-value {
  color: var(--primary);
  font-weight: 600;
}

/* Employee Breakdown */
.employee-breakdown {
  max-width: 1000px;
  margin: 0 auto 2rem;
}

.employee-breakdown h3 {
  text-align: center;
  margin-bottom: 1rem;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.breakdown-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid var(--team-color);
}

.breakdown-card h4 {
  color: var(--team-color);
  margin-bottom: 0.75rem;
}

.emp-value-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.emp-name {
  flex: 1;
}

.emp-esop {
  color: var(--text-muted);
  margin: 0 1rem;
}

.emp-value {
  color: var(--success);
  font-weight: 600;
}

.breakdown-total {
  display: flex;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 2px solid var(--border);
}
```

---

## Implementation Checklist

### Wildcard Mechanic
- [ ] Add `wildcardUsed` and `wildcardType` to team state
- [ ] Add `wildcardPhase` and `teamWildcardSelections` to game state
- [ ] Implement `startWildcardPhase()` function
- [ ] Implement `selectWildcard(teamIndex, choice)` function
- [ ] Implement `allWildcardsDecided()` function
- [ ] Implement `endWildcardPhase()` function
- [ ] Modify `applyMarketCard()` to apply wildcard effects
- [ ] Modify market round flow to include wildcard phase
- [ ] Create `renderWildcardPhase()` function
- [ ] Add wildcard indicator to team sidebar
- [ ] Add wildcard CSS styles
- [ ] Show wildcard effects in leaderboard after market card

### Second Winner (Best Employer)
- [ ] Implement `calculateEmployeeValue(team)` function
- [ ] Implement `getBestEmployer()` function
- [ ] Implement `getWinners()` function
- [ ] Update `renderWinner()` to show dual winners
- [ ] Add valuation ranking column
- [ ] Add employee value ranking column
- [ ] Add employee ESOP breakdown section
- [ ] Handle same-team double winner case
- [ ] Add dual-winner CSS styles

---

## Testing Scenarios

### Wildcard
1. Use Double Down when market card is positive → Gains doubled
2. Use Double Down when market card is negative → No effect (still loses)
3. Use Shield when market card is negative → Losses blocked
4. Use Shield when market card is positive → No effect (still gains)
5. Pass on wildcard → Saved for later round
6. Try to use wildcard twice → Should be disabled after first use
7. All teams pass → Market card draws normally

### Best Employer
1. Team A has high valuation but low ESOP spending → May not win Best Employer
2. Team B has medium valuation but high ESOP → May win Best Employer
3. Same team wins both → Double winner banner shown
4. Different teams win each → Both displayed equally

---

## File Changes Summary

| File | Changes |
|------|---------|
| `game.js` | Add wildcard state, wildcard functions, modify market round flow, add employee value calculation, update winner render |
| `style.css` | Add wildcard phase styles, dual winner styles, employee breakdown styles |
| `data.js` | No changes needed |
| `index.html` | No changes needed |
