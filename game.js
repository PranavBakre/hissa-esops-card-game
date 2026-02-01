// ESOP Wars - Game Logic

// Game State
let gameState = {
  phase: 'auction', // auction | seed | early | secondary-drop | secondary-hire | mature | exit | winner
  currentCardIndex: 0,
  teams: [],
  employeeDeck: [],
  reserveEmployees: [],
  droppedEmployees: [],
  marketDeck: [],
  usedMarketCards: [],
  currentBid: { teamIndex: null, amount: 0 },
  exitCard: null,
  secondaryHired: [] // Track which teams have hired in secondary auction
};

// Initialize game
function initGame() {
  // Initialize teams
  gameState.teams = teamDefinitions.map((def, index) => ({
    name: def.name,
    color: def.color,
    esopRemaining: 10,
    valuation: 25000000,
    employees: [],
    isComplete: false,
    isDisqualified: false
  }));

  // Shuffle and set up employee deck
  gameState.employeeDeck = shuffleArray([...employeeCards]);
  gameState.reserveEmployees = [...reserveEmployees];

  // Shuffle market deck
  gameState.marketDeck = shuffleArray([...marketCards]);

  // Reset other state
  gameState.phase = 'auction';
  gameState.currentCardIndex = 0;
  gameState.currentBid = { teamIndex: null, amount: 0 };
  gameState.droppedEmployees = [];
  gameState.usedMarketCards = [];
  gameState.exitCard = null;
  gameState.secondaryHired = [];

  saveState();
  render();
}

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Save state to localStorage
function saveState() {
  localStorage.setItem('esopWarsState', JSON.stringify(gameState));
}

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem('esopWarsState');
  if (saved) {
    gameState = JSON.parse(saved);
    return true;
  }
  return false;
}

// Get current employee card
function getCurrentCard() {
  if (gameState.phase === 'auction') {
    return gameState.employeeDeck[gameState.currentCardIndex];
  }
  return null;
}

// Place a bid
function placeBid(teamIndex, amount) {
  const team = gameState.teams[teamIndex];

  // Validation
  if (amount <= gameState.currentBid.amount) {
    showToast('Bid must be higher than current bid!', 'error');
    return false;
  }

  if (amount > team.esopRemaining) {
    showToast('Not enough ESOP remaining!', 'error');
    return false;
  }

  if (team.isComplete) {
    showToast('Team already has 3 employees!', 'error');
    return false;
  }

  gameState.currentBid = { teamIndex, amount };
  saveState();
  render();
  showToast(`${team.name} bids ${amount}%!`, 'success');
  return true;
}

// Close bidding and award employee
function closeBidding() {
  if (gameState.currentBid.teamIndex === null) {
    showToast('No bids placed!', 'error');
    return;
  }

  const winningTeam = gameState.teams[gameState.currentBid.teamIndex];
  const employee = getCurrentCard();

  // Award employee to winner
  winningTeam.employees.push({
    ...employee,
    bidAmount: gameState.currentBid.amount
  });
  winningTeam.esopRemaining -= gameState.currentBid.amount;
  winningTeam.esopRemaining = Math.round(winningTeam.esopRemaining * 100) / 100; // Fix floating point

  // Check if team is complete
  if (winningTeam.employees.length >= 3) {
    winningTeam.isComplete = true;
  }

  showToast(`${winningTeam.name} wins ${employee.name}!`, 'success');

  // Move to next card
  nextCard();
}

// Skip current card
function skipCard() {
  showToast('Card skipped - No hire', 'info');
  nextCard();
}

// Move to next card
function nextCard() {
  gameState.currentCardIndex++;
  gameState.currentBid = { teamIndex: null, amount: 0 };

  // Check if auction is complete
  if (gameState.currentCardIndex >= gameState.employeeDeck.length || allTeamsComplete()) {
    endAuction();
  } else {
    saveState();
    render();
  }
}

// Check if all teams have 3 employees
function allTeamsComplete() {
  return gameState.teams.every(t => t.isComplete);
}

// End auction phase
function endAuction() {
  // Mark teams with < 3 employees as disqualified
  gameState.teams.forEach(team => {
    if (team.employees.length < 3) {
      team.isDisqualified = true;
    }
  });

  gameState.phase = 'auction-summary';
  saveState();
  render();
}

// Start market rounds
function startMarketRounds() {
  gameState.phase = 'seed';
  saveState();
  render();
}

// Draw market card
function drawMarketCard() {
  if (gameState.marketDeck.length === 0) {
    showToast('No more market cards!', 'error');
    return;
  }

  const card = gameState.marketDeck.pop();
  gameState.usedMarketCards.push(card);
  gameState.currentMarketCard = card;

  // Apply modifiers and calculate new valuations
  applyMarketCard(card);

  saveState();
  render();
}

// Apply market card modifiers
function applyMarketCard(card) {
  gameState.teams.forEach(team => {
    if (team.isDisqualified) return;

    let skillTotal = 0;

    team.employees.forEach(emp => {
      // Adjusted hard skill
      const hardMod = card.hardSkillModifiers[emp.category] || 0;
      const adjustedHard = Math.min(1, Math.max(0, emp.hardSkill + hardMod));

      // Adjusted soft skills
      let softTotal = 0;
      Object.entries(emp.softSkills).forEach(([skill, value]) => {
        const softMod = card.softSkillModifiers[skill] || 0;
        softTotal += Math.min(1, Math.max(0, value + softMod));
      });

      skillTotal += adjustedHard + softTotal;
    });

    // New valuation formula
    team.valuation = Math.round(team.valuation * (1 + skillTotal * 0.1));
  });
}

// Next round
function nextRound() {
  const phases = ['seed', 'early', 'secondary-drop', 'secondary-hire', 'mature', 'exit'];
  const currentIndex = phases.indexOf(gameState.phase);

  if (currentIndex < phases.length - 1) {
    gameState.phase = phases[currentIndex + 1];
    gameState.currentMarketCard = null;
  }

  saveState();
  render();
}

// Secondary auction - drop employee
function dropEmployee(teamIndex, employeeId) {
  const team = gameState.teams[teamIndex];
  const empIndex = team.employees.findIndex(e => e.id === employeeId);

  if (empIndex === -1) return;

  const [dropped] = team.employees.splice(empIndex, 1);
  gameState.droppedEmployees.push(dropped);
  team.isComplete = false;

  // Check if all teams have dropped
  const allDropped = gameState.teams.every(t => t.isDisqualified || t.employees.length === 2);
  if (allDropped) {
    gameState.phase = 'secondary-hire';
    // Add reserve employees to pool
    gameState.secondaryPool = [...gameState.droppedEmployees, ...gameState.reserveEmployees];
    gameState.secondaryHired = [];
  }

  saveState();
  render();
}

// Secondary auction - select card to bid on
function selectSecondaryCard(employeeId) {
  gameState.selectedSecondaryCard = employeeId;
  gameState.currentBid = { teamIndex: null, amount: 0 };
  saveState();
  render();
}

// Secondary auction - close bidding on selected card
function closeSecondaryBidding() {
  if (gameState.currentBid.teamIndex === null) {
    showToast('No bids placed!', 'error');
    return;
  }

  const winningTeam = gameState.teams[gameState.currentBid.teamIndex];
  const empIndex = gameState.secondaryPool.findIndex(e => e.id === gameState.selectedSecondaryCard);
  const employee = gameState.secondaryPool[empIndex];

  // Award employee
  winningTeam.employees.push({
    ...employee,
    bidAmount: gameState.currentBid.amount
  });
  winningTeam.esopRemaining -= gameState.currentBid.amount;
  winningTeam.esopRemaining = Math.round(winningTeam.esopRemaining * 100) / 100;
  winningTeam.isComplete = true;

  // Remove from pool
  gameState.secondaryPool.splice(empIndex, 1);
  gameState.secondaryHired.push(gameState.currentBid.teamIndex);

  // Reset selection
  gameState.selectedSecondaryCard = null;
  gameState.currentBid = { teamIndex: null, amount: 0 };

  showToast(`${winningTeam.name} wins ${employee.name}!`, 'success');

  // Check if all teams have hired
  const allHired = gameState.teams.every(t => t.isDisqualified || t.employees.length === 3);
  if (allHired) {
    gameState.phase = 'mature';
  }

  saveState();
  render();
}

// Draw exit card
function drawExitCard() {
  const card = exitCards[Math.floor(Math.random() * exitCards.length)];
  gameState.exitCard = card;

  // Apply multiplier
  gameState.teams.forEach(team => {
    if (!team.isDisqualified) {
      team.valuation = Math.round(team.valuation * card.multiplier);
    }
  });

  saveState();
  render();
}

// Declare winner
function declareWinner() {
  gameState.phase = 'winner';
  saveState();
  render();
}

// Get winner
function getWinner() {
  return gameState.teams
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation)[0];
}

// Reset game
function resetGame() {
  localStorage.removeItem('esopWarsState');
  initGame();
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Format currency
function formatCurrency(value) {
  if (value >= 1000000000) {
    return `₹${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `₹${(value / 1000000).toFixed(1)}M`;
  }
  return `₹${value.toLocaleString()}`;
}

// Open bid modal
function openBidModal(teamIndex) {
  const team = gameState.teams[teamIndex];

  if (team.isComplete) {
    showToast('Team already complete!', 'error');
    return;
  }

  if (team.esopRemaining <= gameState.currentBid.amount) {
    showToast('Not enough ESOP to outbid!', 'error');
    return;
  }

  const modal = document.getElementById('bidModal');
  const minBid = gameState.currentBid.amount + 0.5;

  document.getElementById('bidTeamName').textContent = team.name;
  document.getElementById('bidTeamName').style.color = team.color;
  document.getElementById('currentBidDisplay').textContent =
    gameState.currentBid.amount > 0
      ? `${gameState.currentBid.amount}% (${gameState.teams[gameState.currentBid.teamIndex].name})`
      : 'No bids yet';
  document.getElementById('maxBidDisplay').textContent = `${team.esopRemaining}%`;
  document.getElementById('bidInput').value = minBid;
  document.getElementById('bidInput').min = minBid;
  document.getElementById('bidInput').max = team.esopRemaining;

  modal.dataset.teamIndex = teamIndex;
  modal.classList.add('show');
}

// Close bid modal
function closeBidModal() {
  document.getElementById('bidModal').classList.remove('show');
}

// Adjust bid by increment
function adjustBid(increment) {
  const input = document.getElementById('bidInput');
  const newValue = Math.round((parseFloat(input.value) + increment) * 10) / 10;
  const max = parseFloat(input.max);
  const min = parseFloat(input.min);
  input.value = Math.max(min, Math.min(max, newValue));
}

// Confirm bid from modal
function confirmBid() {
  const modal = document.getElementById('bidModal');
  const teamIndex = parseInt(modal.dataset.teamIndex);
  const amount = parseFloat(document.getElementById('bidInput').value);

  if (placeBid(teamIndex, amount)) {
    closeBidModal();
  }
}

// Main render function
function render() {
  const app = document.getElementById('app');

  switch (gameState.phase) {
    case 'auction':
      renderAuction(app);
      break;
    case 'auction-summary':
      renderAuctionSummary(app);
      break;
    case 'seed':
    case 'early':
    case 'mature':
      renderMarketRound(app);
      break;
    case 'secondary-drop':
      renderSecondaryDrop(app);
      break;
    case 'secondary-hire':
      renderSecondaryHire(app);
      break;
    case 'exit':
      renderExit(app);
      break;
    case 'winner':
      renderWinner(app);
      break;
  }
}

// Render auction phase
function renderAuction(app) {
  const card = getCurrentCard();

  app.innerHTML = `
    <div class="phase-bar">
      <div class="phase active">Auction</div>
      <div class="phase">Seed</div>
      <div class="phase">Early</div>
      <div class="phase">Secondary</div>
      <div class="phase">Mature</div>
      <div class="phase">Exit</div>
    </div>

    <div class="card-progress">CARD ${gameState.currentCardIndex + 1} OF ${gameState.employeeDeck.length}</div>

    <div class="employee-card">
      <div class="card-header">
        <span class="card-category ${card.category.toLowerCase()}">${card.category}</span>
      </div>
      <h2 class="card-name">${card.name}</h2>
      <p class="card-role">${card.role}</p>
      <div class="card-stats">
        <div class="stat">
          <span class="stat-label">Hard Skill</span>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${card.hardSkill * 100}%"></div>
          </div>
          <span class="stat-value">${card.hardSkill.toFixed(1)}</span>
        </div>
        ${Object.entries(card.softSkills).map(([skill, value]) => `
          <div class="stat soft">
            <span class="stat-label">${skill}</span>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${value * 100}%"></div>
            </div>
            <span class="stat-value">${value.toFixed(1)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="current-bid">
      ${gameState.currentBid.teamIndex !== null
        ? `Current Bid: <strong>${gameState.currentBid.amount}%</strong>
           <span style="color: ${gameState.teams[gameState.currentBid.teamIndex].color}">
             (${gameState.teams[gameState.currentBid.teamIndex].name})
           </span>`
        : 'No bids yet'}
    </div>

    <div class="teams-row">
      ${gameState.teams.map((team, index) => `
        <div class="team-panel ${team.isComplete ? 'complete' : ''}" style="--team-color: ${team.color}">
          <h3 class="team-name">${team.name}</h3>
          <div class="team-stats">
            <div>ESOP: ${team.esopRemaining.toFixed(1)}%</div>
            <div>Hired: ${team.employees.length}/3</div>
          </div>
          ${team.isComplete
            ? '<div class="team-badge complete">COMPLETE</div>'
            : `<button class="bid-button" onclick="openBidModal(${index})"
                ${team.esopRemaining <= gameState.currentBid.amount ? 'disabled' : ''}>
                BID
              </button>`
          }
        </div>
      `).join('')}
    </div>

    <div class="action-buttons">
      <button class="action-btn primary" onclick="closeBidding()"
        ${gameState.currentBid.teamIndex === null ? 'disabled' : ''}>
        CLOSE BIDDING
      </button>
      <button class="action-btn secondary" onclick="skipCard()">
        SKIP CARD
      </button>
    </div>
  `;
}

// Render auction summary
function renderAuctionSummary(app) {
  const hasDisqualified = gameState.teams.some(t => t.isDisqualified);

  app.innerHTML = `
    <div class="summary-screen">
      <h1>Auction Complete!</h1>

      <div class="summary-teams">
        ${gameState.teams.map(team => `
          <div class="summary-team ${team.isDisqualified ? 'disqualified' : ''}"
               style="--team-color: ${team.color}">
            <h3>${team.name} ${team.isDisqualified ? '<span class="dq-badge">DISQUALIFIED</span>' : ''}</h3>
            <div class="summary-esop">ESOP Remaining: ${team.esopRemaining.toFixed(1)}%</div>
            <div class="summary-employees">
              ${team.employees.map(emp => `
                <div class="summary-emp">
                  <span>${emp.name}</span>
                  <span class="emp-role">${emp.role}</span>
                  <span class="emp-bid">${emp.bidAmount}%</span>
                </div>
              `).join('')}
              ${team.employees.length < 3 ? `
                <div class="summary-emp missing">
                  ${3 - team.employees.length} employee(s) missing
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <button class="action-btn primary large" onclick="startMarketRounds()">
        START MARKET ROUNDS
      </button>
    </div>
  `;
}

// Render market round
function renderMarketRound(app) {
  const phaseNames = { seed: 'SEED ROUND', early: 'EARLY SCALING', mature: 'MATURE SCALING' };
  const phaseName = phaseNames[gameState.phase];

  const sortedTeams = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  app.innerHTML = `
    <div class="phase-bar">
      <div class="phase done">Auction</div>
      <div class="phase ${gameState.phase === 'seed' ? 'active' : 'done'}">Seed</div>
      <div class="phase ${gameState.phase === 'early' ? 'active' : (gameState.phase === 'mature' ? 'done' : '')}">Early</div>
      <div class="phase ${gameState.phase === 'mature' ? 'done' : ''}">Secondary</div>
      <div class="phase ${gameState.phase === 'mature' ? 'active' : ''}">Mature</div>
      <div class="phase">Exit</div>
    </div>

    <h1 class="round-title">${phaseName}</h1>

    ${!gameState.currentMarketCard ? `
      <div class="market-draw">
        <p>Draw a market condition card to see how the market affects your team!</p>
        <button class="action-btn primary large" onclick="drawMarketCard()">
          DRAW MARKET CARD
        </button>
      </div>
    ` : `
      <div class="market-card">
        <h2>${gameState.currentMarketCard.name}</h2>
        <p class="market-desc">${gameState.currentMarketCard.description}</p>
        <div class="modifiers">
          <div class="mod-section">
            <h4>Hard Skill Modifiers</h4>
            ${Object.entries(gameState.currentMarketCard.hardSkillModifiers).map(([cat, mod]) => `
              <div class="mod ${mod > 0 ? 'positive' : (mod < 0 ? 'negative' : '')}">
                ${cat}: ${mod > 0 ? '+' : ''}${mod}
              </div>
            `).join('')}
          </div>
          <div class="mod-section">
            <h4>Soft Skill Modifiers</h4>
            ${Object.entries(gameState.currentMarketCard.softSkillModifiers).map(([skill, mod]) => `
              <div class="mod ${mod > 0 ? 'positive' : (mod < 0 ? 'negative' : '')}">
                ${skill}: ${mod > 0 ? '+' : ''}${mod}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="leaderboard">
        <h3>Leaderboard</h3>
        ${sortedTeams.map((team, idx) => `
          <div class="lb-row" style="--team-color: ${team.color}">
            <span class="lb-rank">#${idx + 1}</span>
            <span class="lb-name">${team.name}</span>
            <span class="lb-val">${formatCurrency(team.valuation)}</span>
          </div>
        `).join('')}
      </div>

      <button class="action-btn primary large" onclick="nextRound()">
        ${gameState.phase === 'early' ? 'START SECONDARY AUCTION' :
          gameState.phase === 'mature' ? 'PROCEED TO EXIT' : 'NEXT ROUND'}
      </button>
    `}
  `;
}

// Render secondary drop phase
function renderSecondaryDrop(app) {
  app.innerHTML = `
    <div class="phase-bar">
      <div class="phase done">Auction</div>
      <div class="phase done">Seed</div>
      <div class="phase done">Early</div>
      <div class="phase active">Secondary</div>
      <div class="phase">Mature</div>
      <div class="phase">Exit</div>
    </div>

    <h1 class="round-title">SECONDARY AUCTION - Drop Phase</h1>
    <p class="round-subtitle">Each team must drop 1 employee to the talent pool</p>

    <div class="drop-teams">
      ${gameState.teams.filter(t => !t.isDisqualified).map((team, teamIdx) => `
        <div class="drop-team" style="--team-color: ${team.color}">
          <h3>${team.name} ${team.employees.length === 2 ? '<span class="dropped-badge">DROPPED</span>' : ''}</h3>
          <div class="drop-employees">
            ${team.employees.map(emp => `
              <div class="drop-emp">
                <div>
                  <strong>${emp.name}</strong>
                  <span class="emp-role">${emp.role}</span>
                </div>
                ${team.employees.length > 2 ? `
                  <button class="drop-btn" onclick="dropEmployee(${teamIdx}, ${emp.id})">DROP</button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="talent-pool">
      <h3>Talent Pool (${gameState.droppedEmployees.length} dropped)</h3>
      <div class="pool-cards">
        ${gameState.droppedEmployees.map(emp => `
          <div class="pool-card">
            <strong>${emp.name}</strong>
            <span>${emp.role}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Render secondary hire phase
function renderSecondaryHire(app) {
  const availableCards = gameState.secondaryPool || [];
  const selectedCard = availableCards.find(e => e.id === gameState.selectedSecondaryCard);

  app.innerHTML = `
    <div class="phase-bar">
      <div class="phase done">Auction</div>
      <div class="phase done">Seed</div>
      <div class="phase done">Early</div>
      <div class="phase active">Secondary</div>
      <div class="phase">Mature</div>
      <div class="phase">Exit</div>
    </div>

    <h1 class="round-title">SECONDARY AUCTION - Hiring Phase</h1>
    <p class="round-subtitle">Select a card and bid to hire. Each team hires 1 employee.</p>

    <div class="secondary-pool">
      ${availableCards.map(emp => `
        <div class="secondary-card ${gameState.selectedSecondaryCard === emp.id ? 'selected' : ''}"
             onclick="selectSecondaryCard(${emp.id})">
          <span class="card-category ${emp.category.toLowerCase()}">${emp.category}</span>
          <h3>${emp.name}</h3>
          <p>${emp.role}</p>
          <div class="mini-stats">
            <span>Hard: ${emp.hardSkill.toFixed(1)}</span>
            ${Object.entries(emp.softSkills).map(([s, v]) => `<span>${s}: ${v.toFixed(1)}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    ${selectedCard ? `
      <div class="current-bid">
        Bidding on: <strong>${selectedCard.name}</strong>
        ${gameState.currentBid.teamIndex !== null
          ? ` — Current Bid: <strong>${gameState.currentBid.amount}%</strong>
             <span style="color: ${gameState.teams[gameState.currentBid.teamIndex].color}">
               (${gameState.teams[gameState.currentBid.teamIndex].name})
             </span>`
          : ' — No bids yet'}
      </div>
    ` : ''}

    <div class="teams-row">
      ${gameState.teams.map((team, index) => {
        const hasHired = gameState.secondaryHired.includes(index);
        const canBid = !team.isDisqualified && !hasHired && team.employees.length < 3;
        return `
          <div class="team-panel ${hasHired ? 'complete' : ''}" style="--team-color: ${team.color}">
            <h3 class="team-name">${team.name}</h3>
            <div class="team-stats">
              <div>ESOP: ${team.esopRemaining.toFixed(1)}%</div>
              <div>Hired: ${team.employees.length}/3</div>
            </div>
            ${hasHired
              ? '<div class="team-badge complete">HIRED</div>'
              : canBid && gameState.selectedSecondaryCard
                ? `<button class="bid-button" onclick="openBidModal(${index})"
                    ${team.esopRemaining <= gameState.currentBid.amount ? 'disabled' : ''}>
                    BID
                  </button>`
                : '<div class="team-badge">SELECT CARD</div>'
            }
          </div>
        `;
      }).join('')}
    </div>

    ${gameState.selectedSecondaryCard && gameState.currentBid.teamIndex !== null ? `
      <div class="action-buttons">
        <button class="action-btn primary" onclick="closeSecondaryBidding()">
          CLOSE BIDDING
        </button>
      </div>
    ` : ''}
  `;
}

// Render exit phase
function renderExit(app) {
  const sortedTeams = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  app.innerHTML = `
    <div class="phase-bar">
      <div class="phase done">Auction</div>
      <div class="phase done">Seed</div>
      <div class="phase done">Early</div>
      <div class="phase done">Secondary</div>
      <div class="phase done">Mature</div>
      <div class="phase active">Exit</div>
    </div>

    <h1 class="round-title">EXIT ROUND</h1>

    ${!gameState.exitCard ? `
      <div class="exit-draw">
        <p>The moment of truth! Draw an exit card to determine your final multiplier.</p>
        <button class="action-btn primary large" onclick="drawExitCard()">
          DRAW EXIT CARD
        </button>
      </div>

      <div class="leaderboard">
        <h3>Current Standings</h3>
        ${sortedTeams.map((team, idx) => `
          <div class="lb-row" style="--team-color: ${team.color}">
            <span class="lb-rank">#${idx + 1}</span>
            <span class="lb-name">${team.name}</span>
            <span class="lb-val">${formatCurrency(team.valuation)}</span>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="exit-card">
        <h2>${gameState.exitCard.name}</h2>
        <div class="exit-multiplier">${gameState.exitCard.multiplier}x</div>
        <p>${gameState.exitCard.description}</p>
      </div>

      <div class="leaderboard final">
        <h3>Final Valuations</h3>
        ${sortedTeams.map((team, idx) => `
          <div class="lb-row ${idx === 0 ? 'winner' : ''}" style="--team-color: ${team.color}">
            <span class="lb-rank">#${idx + 1}</span>
            <span class="lb-name">${team.name}</span>
            <span class="lb-val">${formatCurrency(team.valuation)}</span>
          </div>
        `).join('')}
      </div>

      <button class="action-btn primary large" onclick="declareWinner()">
        DECLARE WINNER
      </button>
    `}
  `;
}

// Render winner screen
function renderWinner(app) {
  const winner = getWinner();
  const sortedTeams = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  app.innerHTML = `
    <div class="winner-screen">
      <div class="confetti"></div>
      <h1 class="winner-title">🏆 WINNER 🏆</h1>
      <div class="winner-name" style="color: ${winner.color}">${winner.name}</div>
      <div class="winner-valuation">${formatCurrency(winner.valuation)}</div>

      <div class="winner-journey">
        <h3>The Journey</h3>
        <div class="journey-line">
          <span>Starting: ₹25M</span>
          <span>→</span>
          <span>Final: ${formatCurrency(winner.valuation)}</span>
        </div>
      </div>

      <div class="final-leaderboard">
        <h3>Final Standings</h3>
        ${sortedTeams.map((team, idx) => `
          <div class="final-row ${idx === 0 ? 'winner' : ''}" style="--team-color: ${team.color}">
            <span class="rank">#${idx + 1}</span>
            <span class="name">${team.name}</span>
            <span class="val">${formatCurrency(team.valuation)}</span>
          </div>
        `).join('')}
      </div>

      <button class="action-btn primary large" onclick="resetGame()">
        PLAY AGAIN
      </button>
    </div>
  `;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  if (!loadState()) {
    initGame();
  } else {
    render();
  }
});
