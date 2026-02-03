// ESOP Wars - Game Logic

// Game State
let gameState = {
  phase: 'registration', // registration | auction | seed | early | secondary-drop | secondary-hire | mature | exit | winner
  currentCardIndex: 0,
  teams: [],
  employeeDeck: [],
  reserveEmployees: [],
  droppedEmployees: [],
  marketDeck: [],
  usedMarketCards: [],
  currentBid: { teamIndex: null, amount: 0 },
  exitCard: null,
  secondaryHired: [],
  registeredTeams: 0,
  // Iteration 2: Wildcard
  wildcardPhase: false,
  teamWildcardSelections: {}
};

// Initialize game
function initGame() {
  // Initialize teams with registration state
  gameState.teams = teamDefinitions.map((def) => ({
    name: def.name,
    color: def.color,
    problemStatement: '',
    isRegistered: false,
    esopRemaining: 10,
    valuation: 25000000,
    employees: [],
    isComplete: false,
    isDisqualified: false,
    // Iteration 2: Wildcard
    wildcardUsed: false,
    wildcardActiveThisRound: null // 'double' | 'shield' | null
  }));

  // Shuffle and set up employee deck
  gameState.employeeDeck = shuffleArray([...employeeCards]);
  gameState.reserveEmployees = [...reserveEmployees];

  // Shuffle market deck
  gameState.marketDeck = shuffleArray([...marketCards]);

  // Reset other state
  gameState.phase = 'registration';
  gameState.currentCardIndex = 0;
  gameState.currentBid = { teamIndex: null, amount: 0 };
  gameState.droppedEmployees = [];
  gameState.usedMarketCards = [];
  gameState.exitCard = null;
  gameState.secondaryHired = [];
  gameState.registeredTeams = 0;
  // Iteration 2: Wildcard
  gameState.wildcardPhase = false;
  gameState.teamWildcardSelections = {};

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

// Open team registration modal
function openRegistrationModal(teamIndex) {
  const team = gameState.teams[teamIndex];
  const modal = document.getElementById('registrationModal');

  document.getElementById('regTeamIndex').value = teamIndex;
  document.getElementById('regTeamName').value = team.name;
  document.getElementById('regTeamName').style.borderColor = team.color;
  document.getElementById('regProblemStatement').value = team.problemStatement || '';
  document.getElementById('regModalTitle').style.color = team.color;
  document.getElementById('regModalTitle').textContent = `Register ${team.name}`;

  modal.classList.add('show');
}

// Close registration modal
function closeRegistrationModal() {
  document.getElementById('registrationModal').classList.remove('show');
}

// Save team registration
function saveRegistration() {
  const teamIndex = parseInt(document.getElementById('regTeamIndex').value);
  const teamName = document.getElementById('regTeamName').value.trim();
  const problemStatement = document.getElementById('regProblemStatement').value.trim();

  if (!teamName) {
    showToast('Please enter a team name!', 'error');
    return;
  }

  if (!problemStatement) {
    showToast('Please enter your problem statement!', 'error');
    return;
  }

  const team = gameState.teams[teamIndex];
  const wasRegistered = team.isRegistered;

  team.name = teamName;
  team.problemStatement = problemStatement;
  team.isRegistered = true;

  if (!wasRegistered) {
    gameState.registeredTeams++;
  }

  saveState();
  closeRegistrationModal();
  render();

  showToast(`${teamName} registered successfully!`, 'success');
}

// Start auction (after all teams registered)
function startAuction() {
  if (gameState.registeredTeams < 5) {
    showToast('All 5 teams must register first!', 'error');
    return;
  }

  gameState.phase = 'auction';
  saveState();
  render();
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

  winningTeam.employees.push({
    ...employee,
    bidAmount: gameState.currentBid.amount
  });
  winningTeam.esopRemaining -= gameState.currentBid.amount;
  winningTeam.esopRemaining = Math.round(winningTeam.esopRemaining * 100) / 100;

  if (winningTeam.employees.length >= 3) {
    winningTeam.isComplete = true;
  }

  showToast(`${winningTeam.name} wins ${employee.name}!`, 'success');
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

  applyMarketCard(card);

  saveState();
  render();
}

// Apply market card modifiers
function applyMarketCard(card) {
  gameState.teams.forEach(team => {
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

    // Iteration 2: Apply wildcard effects
    const wildcardChoice = team.wildcardActiveThisRound;
    if (wildcardChoice === 'double' && change > 0) {
      // Double the gains
      change = change * 2;
      newValuation = previousValuation + change;
      team.wildcardEffect = 'doubled';
    } else if (wildcardChoice === 'shield' && change < 0) {
      // Block all losses
      change = 0;
      newValuation = previousValuation;
      team.wildcardEffect = 'shielded';
    } else {
      team.wildcardEffect = null;
    }

    team.valuation = newValuation;
    team.lastChange = change;
    team.wildcardActiveThisRound = null; // Clear for next round
  });
}

// Iteration 2: Start wildcard decision phase
function startWildcardPhase() {
  gameState.wildcardPhase = true;
  gameState.teamWildcardSelections = {};

  // Pre-fill teams that can't use wildcard (already used or disqualified)
  gameState.teams.forEach((team, idx) => {
    if (team.isDisqualified || team.wildcardUsed) {
      gameState.teamWildcardSelections[idx] = null;
    }
  });

  saveState();
  render();
}

// Iteration 2: Team selects wildcard option
function selectWildcard(teamIndex, choice) {
  const team = gameState.teams[teamIndex];

  // choice: 'double' | 'shield' | null (pass)
  if (team.wildcardUsed && choice !== null) {
    showToast('Wildcard already used!', 'error');
    return;
  }

  gameState.teamWildcardSelections[teamIndex] = choice;

  if (choice !== null) {
    team.wildcardActiveThisRound = choice;
    team.wildcardUsed = true;
    showToast(`${team.name} plays ${choice === 'double' ? 'Double Down' : 'Shield'}!`, 'success');
  }

  saveState();
  render();

  // Check if all teams have decided
  if (allWildcardsDecided()) {
    setTimeout(() => {
      endWildcardPhase();
    }, 500);
  }
}

// Iteration 2: Check if all teams have decided
function allWildcardsDecided() {
  const activeTeamCount = gameState.teams.filter(t => !t.isDisqualified).length;
  const decidedCount = Object.keys(gameState.teamWildcardSelections).length;
  return decidedCount >= activeTeamCount;
}

// Iteration 2: End wildcard phase and draw market card
function endWildcardPhase() {
  gameState.wildcardPhase = false;
  saveState();
  render();
}

// Iteration 2: Calculate employee value for a team
function calculateEmployeeValue(team) {
  return team.employees.reduce((total, emp) => {
    const employeeValue = (emp.bidAmount / 100) * team.valuation;
    return total + employeeValue;
  }, 0);
}

// Iteration 2: Get best employer
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

// Iteration 2: Get both winners
function getWinners() {
  const bestFounder = getWinner(); // Existing function (highest valuation)
  const bestEmployer = getBestEmployer();

  return {
    founder: bestFounder,
    employer: bestEmployer,
    sameTeam: bestFounder.name === bestEmployer.name
  };
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

  const allDropped = gameState.teams.every(t => t.isDisqualified || t.employees.length === 2);
  if (allDropped) {
    gameState.phase = 'secondary-hire';
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

  winningTeam.employees.push({
    ...employee,
    bidAmount: gameState.currentBid.amount
  });
  winningTeam.esopRemaining -= gameState.currentBid.amount;
  winningTeam.esopRemaining = Math.round(winningTeam.esopRemaining * 100) / 100;
  winningTeam.isComplete = true;

  gameState.secondaryPool.splice(empIndex, 1);
  gameState.secondaryHired.push(gameState.currentBid.teamIndex);

  gameState.selectedSecondaryCard = null;
  gameState.currentBid = { teamIndex: null, amount: 0 };

  showToast(`${winningTeam.name} wins ${employee.name}!`, 'success');

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

// View team details
function viewTeamDetails(teamIndex) {
  const team = gameState.teams[teamIndex];
  const modal = document.getElementById('teamDetailModal');

  document.getElementById('teamDetailName').textContent = team.name;
  document.getElementById('teamDetailName').style.color = team.color;
  document.getElementById('teamDetailProblem').textContent = team.problemStatement || 'No problem statement';
  document.getElementById('teamDetailEsop').textContent = `${team.esopRemaining.toFixed(1)}%`;
  document.getElementById('teamDetailValuation').textContent = formatCurrency(team.valuation);

  const employeesList = document.getElementById('teamDetailEmployees');
  if (team.employees.length === 0) {
    employeesList.innerHTML = '<div class="no-employees">No employees hired yet</div>';
  } else {
    employeesList.innerHTML = team.employees.map(emp => `
      <div class="detail-employee">
        <div class="detail-emp-header">
          <span class="detail-emp-name">${emp.name}</span>
          <span class="detail-emp-category ${emp.category.toLowerCase()}">${emp.category}</span>
        </div>
        <div class="detail-emp-role">${emp.role}</div>
        <div class="detail-emp-stats">
          <span>Hard: ${emp.hardSkill.toFixed(1)}</span>
          ${Object.entries(emp.softSkills).map(([s, v]) => `<span>${s}: ${v.toFixed(1)}</span>`).join('')}
        </div>
        <div class="detail-emp-bid">Hired for ${emp.bidAmount}%</div>
      </div>
    `).join('');
  }

  modal.classList.add('show');
}

// Close team detail modal
function closeTeamDetailModal() {
  document.getElementById('teamDetailModal').classList.remove('show');
}

// Main render function
function render() {
  const app = document.getElementById('app');

  switch (gameState.phase) {
    case 'registration':
      renderRegistration(app);
      break;
    case 'auction':
      renderAuction(app);
      break;
    case 'auction-summary':
      renderAuctionSummary(app);
      break;
    case 'seed':
    case 'early':
    case 'mature':
      // Iteration 2: Check if we need wildcard phase first
      if (gameState.wildcardPhase) {
        renderWildcardPhase(app);
      } else {
        renderMarketRound(app);
      }
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

// Render registration phase
function renderRegistration(app) {
  app.innerHTML = `
    <div class="game-container">
      <header class="game-header">
        <div class="logo">
          <span class="logo-icon">💼</span>
          <h1>ESOP Wars</h1>
        </div>
        <p class="tagline">Bid equity to build your startup team, survive market swings, exit rich.</p>
      </header>

      <main class="registration-main">
        <div class="registration-hero">
          <h2>Team Registration</h2>
          <p>Register all 5 teams before starting the auction. Each team needs a name and problem statement.</p>
          <div class="registration-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(gameState.registeredTeams / 5) * 100}%"></div>
            </div>
            <span class="progress-text">${gameState.registeredTeams}/5 Teams Registered</span>
          </div>
        </div>

        <div class="registration-grid">
          ${gameState.teams.map((team, index) => `
            <div class="registration-card ${team.isRegistered ? 'registered' : ''}" style="--team-color: ${team.color}">
              <div class="reg-card-header">
                <div class="reg-card-icon" style="background: ${team.color}">${team.name.charAt(0)}</div>
                <div class="reg-card-title">
                  <h3>${team.name}</h3>
                  ${team.isRegistered
                    ? '<span class="reg-status registered">Registered</span>'
                    : '<span class="reg-status pending">Pending</span>'}
                </div>
              </div>
              ${team.isRegistered ? `
                <div class="reg-card-problem">
                  <strong>Problem Statement:</strong>
                  <p>${team.problemStatement}</p>
                </div>
              ` : ''}
              <button class="reg-card-btn ${team.isRegistered ? 'edit' : ''}"
                      onclick="openRegistrationModal(${index})">
                ${team.isRegistered ? 'Edit Details' : 'Register Team'}
              </button>
            </div>
          `).join('')}
        </div>

        <div class="registration-actions">
          <button class="action-btn primary large ${gameState.registeredTeams < 5 ? 'disabled' : ''}"
                  onclick="startAuction()"
                  ${gameState.registeredTeams < 5 ? 'disabled' : ''}>
            ${gameState.registeredTeams < 5
              ? `Register ${5 - gameState.registeredTeams} More Team${5 - gameState.registeredTeams > 1 ? 's' : ''} to Start`
              : 'Start Auction'}
          </button>
        </div>
      </main>

      <footer class="game-footer">
        <div class="game-rules">
          <h4>Quick Rules</h4>
          <ul>
            <li>Each team starts with 10% ESOP pool</li>
            <li>Bid equity to hire employees (3 per team)</li>
            <li>Market conditions affect valuations</li>
            <li>Highest valuation at exit wins!</li>
          </ul>
        </div>
      </footer>
    </div>
  `;
}

// Render phase bar
function renderPhaseBar(activePhase) {
  const phases = [
    { id: 'registration', label: 'Register', icon: '📝' },
    { id: 'auction', label: 'Auction', icon: '🔨' },
    { id: 'seed', label: 'Seed', icon: '🌱' },
    { id: 'early', label: 'Early', icon: '📈' },
    { id: 'secondary', label: 'Secondary', icon: '🔄' },
    { id: 'mature', label: 'Mature', icon: '🏢' },
    { id: 'exit', label: 'Exit', icon: '🚀' }
  ];

  const phaseOrder = ['registration', 'auction', 'seed', 'early', 'secondary', 'mature', 'exit'];
  const activeIndex = phaseOrder.indexOf(activePhase);

  return `
    <nav class="phase-nav">
      ${phases.map((phase, idx) => {
        let status = '';
        if (idx < activeIndex) status = 'done';
        else if (idx === activeIndex) status = 'active';
        return `
          <div class="phase-item ${status}">
            <span class="phase-icon">${phase.icon}</span>
            <span class="phase-label">${phase.label}</span>
          </div>
        `;
      }).join('')}
    </nav>
  `;
}

// Render teams sidebar
function renderTeamsSidebar() {
  return `
    <aside class="teams-sidebar">
      <h3>Teams</h3>
      ${gameState.teams.map((team, index) => `
        <div class="sidebar-team ${team.isComplete ? 'complete' : ''} ${team.isDisqualified ? 'disqualified' : ''}"
             style="--team-color: ${team.color}"
             onclick="viewTeamDetails(${index})">
          <div class="sidebar-team-header">
            <span class="sidebar-team-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
            <span class="sidebar-team-name">${team.name}</span>
          </div>
          <div class="sidebar-team-stats">
            <div class="sidebar-stat">
              <span class="stat-icon">💰</span>
              <span>${team.esopRemaining.toFixed(1)}%</span>
            </div>
            <div class="sidebar-stat">
              <span class="stat-icon">👥</span>
              <span>${team.employees.length}/3</span>
            </div>
          </div>
          ${team.isComplete ? '<span class="sidebar-badge complete">Complete</span>' : ''}
          ${team.isDisqualified ? '<span class="sidebar-badge dq">DQ</span>' : ''}
          ${!team.isDisqualified ? `
            <div class="sidebar-wildcard ${team.wildcardUsed ? 'used' : 'ready'}">
              🃏 ${team.wildcardUsed ? 'Used' : 'Ready'}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </aside>
  `;
}

// Render auction phase
function renderAuction(app) {
  const card = getCurrentCard();

  app.innerHTML = `
    <div class="game-container with-sidebar">
      ${renderPhaseBar('auction')}

      <div class="game-layout">
        ${renderTeamsSidebar()}

        <main class="game-main">
          <div class="auction-header">
            <div class="card-counter">
              <span class="counter-current">${gameState.currentCardIndex + 1}</span>
              <span class="counter-divider">/</span>
              <span class="counter-total">${gameState.employeeDeck.length}</span>
            </div>
            <h2>Talent Auction</h2>
          </div>

          <div class="auction-content">
            <div class="employee-card">
              <div class="card-badge ${card.category.toLowerCase()}">${card.category}</div>
              <div class="card-avatar">
                <span>${card.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <h2 class="card-name">${card.name}</h2>
              <p class="card-role">${card.role}</p>

              <div class="card-skills">
                <div class="skill-item primary">
                  <div class="skill-header">
                    <span class="skill-label">Hard Skill</span>
                    <span class="skill-value">${card.hardSkill.toFixed(1)}</span>
                  </div>
                  <div class="skill-bar">
                    <div class="skill-fill" style="width: ${card.hardSkill * 100}%"></div>
                  </div>
                </div>
                ${Object.entries(card.softSkills).map(([skill, value]) => `
                  <div class="skill-item secondary">
                    <div class="skill-header">
                      <span class="skill-label">${skill}</span>
                      <span class="skill-value">${value.toFixed(1)}</span>
                    </div>
                    <div class="skill-bar">
                      <div class="skill-fill" style="width: ${value * 100}%"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="bid-section">
              <div class="current-bid-display ${gameState.currentBid.teamIndex !== null ? 'has-bid' : ''}">
                ${gameState.currentBid.teamIndex !== null
                  ? `
                    <div class="bid-label">Current Bid</div>
                    <div class="bid-amount">${gameState.currentBid.amount}%</div>
                    <div class="bid-team" style="color: ${gameState.teams[gameState.currentBid.teamIndex].color}">
                      ${gameState.teams[gameState.currentBid.teamIndex].name}
                    </div>
                  `
                  : `
                    <div class="no-bid">
                      <span class="no-bid-icon">🔨</span>
                      <span>No bids yet</span>
                    </div>
                  `}
              </div>

              <div class="bid-teams-grid">
                ${gameState.teams.map((team, index) => `
                  <button class="bid-team-btn ${team.isComplete ? 'complete' : ''} ${gameState.currentBid.teamIndex === index ? 'leading' : ''}"
                          style="--team-color: ${team.color}"
                          onclick="openBidModal(${index})"
                          ${team.isComplete || team.esopRemaining <= gameState.currentBid.amount ? 'disabled' : ''}>
                    <span class="btn-team-name">${team.name}</span>
                    <span class="btn-team-esop">${team.esopRemaining.toFixed(1)}%</span>
                    ${team.isComplete ? '<span class="btn-badge">Full</span>' : ''}
                  </button>
                `).join('')}
              </div>

              <div class="auction-actions">
                <button class="action-btn primary" onclick="closeBidding()"
                  ${gameState.currentBid.teamIndex === null ? 'disabled' : ''}>
                  Award to Winner
                </button>
                <button class="action-btn secondary" onclick="skipCard()">
                  Skip Card
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;
}

// Render auction summary
function renderAuctionSummary(app) {
  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('auction')}

      <main class="summary-main">
        <div class="summary-header">
          <h1>Auction Complete!</h1>
          <p>Review your teams before entering the market rounds</p>
        </div>

        <div class="summary-grid">
          ${gameState.teams.map(team => `
            <div class="summary-card ${team.isDisqualified ? 'disqualified' : ''}" style="--team-color: ${team.color}">
              <div class="summary-card-header">
                <div class="summary-team-icon" style="background: ${team.color}">${team.name.charAt(0)}</div>
                <div>
                  <h3>${team.name}</h3>
                  ${team.isDisqualified
                    ? '<span class="dq-badge">DISQUALIFIED</span>'
                    : `<span class="esop-remaining">${team.esopRemaining.toFixed(1)}% ESOP remaining</span>`}
                </div>
              </div>

              <div class="summary-problem">
                <strong>Building:</strong> ${team.problemStatement}
              </div>

              <div class="summary-roster">
                <h4>Team Roster</h4>
                ${team.employees.length > 0 ? team.employees.map(emp => `
                  <div class="summary-employee">
                    <span class="emp-name">${emp.name}</span>
                    <span class="emp-category ${emp.category.toLowerCase()}">${emp.category}</span>
                    <span class="emp-cost">${emp.bidAmount}%</span>
                  </div>
                `).join('') : '<div class="no-employees">No employees hired</div>'}
                ${team.employees.length < 3 && !team.isDisqualified ? `
                  <div class="missing-slots">${3 - team.employees.length} slot(s) missing</div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="summary-actions">
          <button class="action-btn primary large" onclick="startMarketRounds()">
            Enter Market Rounds
          </button>
        </div>
      </main>
    </div>
  `;
}

// Render market round
function renderMarketRound(app) {
  const phaseNames = { seed: 'Seed Round', early: 'Early Scaling', mature: 'Mature Scaling' };
  const phaseDescriptions = {
    seed: 'Your startup is just getting started. First market conditions apply.',
    early: 'Growing fast! Market dynamics shift.',
    mature: 'Final market conditions before exit.'
  };

  const sortedTeams = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  app.innerHTML = `
    <div class="game-container with-sidebar">
      ${renderPhaseBar(gameState.phase)}

      <div class="game-layout">
        ${renderTeamsSidebar()}

        <main class="game-main">
          <div class="market-header">
            <h1>${phaseNames[gameState.phase]}</h1>
            <p>${phaseDescriptions[gameState.phase]}</p>
          </div>

          ${!gameState.currentMarketCard ? `
            <div class="market-draw-section">
              <div class="draw-card-placeholder">
                <span class="draw-icon">🎴</span>
                <p>Before drawing the market card, teams can use their wildcard</p>
                <button class="action-btn secondary large" onclick="startWildcardPhase()" style="margin-bottom: 12px;">
                  🃏 Wildcard Decisions
                </button>
                <button class="action-btn primary large" onclick="drawMarketCard()">
                  Draw Market Card
                </button>
              </div>
            </div>
          ` : `
            <div class="market-result">
              <div class="market-card-display">
                <div class="market-card-icon">📊</div>
                <h2>${gameState.currentMarketCard.name}</h2>
                <p class="market-card-desc">${gameState.currentMarketCard.description}</p>

                <div class="modifiers-grid">
                  <div class="modifier-section">
                    <h4>Category Modifiers</h4>
                    <div class="modifier-list">
                      ${Object.entries(gameState.currentMarketCard.hardSkillModifiers).map(([cat, mod]) => `
                        <div class="modifier ${mod > 0 ? 'positive' : (mod < 0 ? 'negative' : 'neutral')}">
                          <span class="mod-name">${cat}</span>
                          <span class="mod-value">${mod > 0 ? '+' : ''}${mod}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  <div class="modifier-section">
                    <h4>Soft Skill Modifiers</h4>
                    <div class="modifier-list">
                      ${Object.entries(gameState.currentMarketCard.softSkillModifiers).map(([skill, mod]) => `
                        <div class="modifier ${mod > 0 ? 'positive' : (mod < 0 ? 'negative' : 'neutral')}">
                          <span class="mod-name">${skill}</span>
                          <span class="mod-value">${mod > 0 ? '+' : ''}${mod}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <div class="leaderboard-section">
                <h3>Leaderboard</h3>
                <div class="leaderboard">
                  ${sortedTeams.map((team, idx) => `
                    <div class="lb-entry ${idx === 0 ? 'leader' : ''}" style="--team-color: ${team.color}">
                      <span class="lb-rank">${idx + 1}</span>
                      <span class="lb-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                      <span class="lb-name">${team.name}</span>
                      <span class="lb-value">${formatCurrency(team.valuation)}</span>
                      ${team.wildcardEffect === 'doubled' ? '<span class="lb-wildcard doubled">⚡2x</span>' : ''}
                      ${team.wildcardEffect === 'shielded' ? '<span class="lb-wildcard shielded">🛡️</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="market-actions">
                <button class="action-btn primary large" onclick="nextRound()">
                  ${gameState.phase === 'early' ? 'Start Secondary Auction' :
                    gameState.phase === 'mature' ? 'Proceed to Exit' : 'Next Round'}
                </button>
              </div>
            </div>
          `}
        </main>
      </div>
    </div>
  `;
}

// Render secondary drop phase
function renderSecondaryDrop(app) {
  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('secondary')}

      <main class="secondary-main">
        <div class="secondary-header">
          <h1>Secondary Auction - Drop Phase</h1>
          <p>Each team must release one employee to the talent pool</p>
        </div>

        <div class="drop-grid">
          ${gameState.teams.filter(t => !t.isDisqualified).map((team, teamIdx) => `
            <div class="drop-card ${team.employees.length === 2 ? 'dropped' : ''}" style="--team-color: ${team.color}">
              <div class="drop-card-header">
                <div class="drop-team-icon" style="background: ${team.color}">${team.name.charAt(0)}</div>
                <div>
                  <h3>${team.name}</h3>
                  ${team.employees.length === 2
                    ? '<span class="drop-status done">Employee Dropped</span>'
                    : '<span class="drop-status pending">Select to Drop</span>'}
                </div>
              </div>

              <div class="drop-employees">
                ${team.employees.map(emp => `
                  <div class="drop-employee">
                    <div class="drop-emp-info">
                      <span class="drop-emp-name">${emp.name}</span>
                      <span class="drop-emp-role">${emp.role}</span>
                    </div>
                    ${team.employees.length > 2 ? `
                      <button class="drop-btn" onclick="dropEmployee(${teamIdx}, ${emp.id})">
                        Drop
                      </button>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="talent-pool-section">
          <h3>Talent Pool</h3>
          <p>${gameState.droppedEmployees.length} employees available</p>
          <div class="pool-grid">
            ${gameState.droppedEmployees.map(emp => `
              <div class="pool-employee">
                <span class="pool-emp-name">${emp.name}</span>
                <span class="pool-emp-category ${emp.category.toLowerCase()}">${emp.category}</span>
              </div>
            `).join('')}
            ${gameState.droppedEmployees.length === 0 ? '<div class="pool-empty">Waiting for teams to drop employees...</div>' : ''}
          </div>
        </div>
      </main>
    </div>
  `;
}

// Render secondary hire phase
function renderSecondaryHire(app) {
  const availableCards = gameState.secondaryPool || [];
  const selectedCard = availableCards.find(e => e.id === gameState.selectedSecondaryCard);

  app.innerHTML = `
    <div class="game-container with-sidebar">
      ${renderPhaseBar('secondary')}

      <div class="game-layout">
        ${renderTeamsSidebar()}

        <main class="game-main">
          <div class="secondary-hire-header">
            <h1>Secondary Auction - Hiring Phase</h1>
            <p>Select a candidate and bid to hire. Each team hires one employee.</p>
          </div>

          <div class="hire-pool">
            ${availableCards.map(emp => `
              <div class="hire-card ${gameState.selectedSecondaryCard === emp.id ? 'selected' : ''}"
                   onclick="selectSecondaryCard(${emp.id})">
                <div class="hire-card-badge ${emp.category.toLowerCase()}">${emp.category}</div>
                <h4>${emp.name}</h4>
                <p>${emp.role}</p>
                <div class="hire-card-stats">
                  <span>Hard: ${emp.hardSkill.toFixed(1)}</span>
                </div>
              </div>
            `).join('')}
          </div>

          ${selectedCard ? `
            <div class="hire-bid-section">
              <div class="selected-candidate">
                <h3>Bidding on: ${selectedCard.name}</h3>
                <p>${selectedCard.role} - ${selectedCard.category}</p>
              </div>

              <div class="current-bid-display ${gameState.currentBid.teamIndex !== null ? 'has-bid' : ''}">
                ${gameState.currentBid.teamIndex !== null
                  ? `
                    <div class="bid-amount">${gameState.currentBid.amount}%</div>
                    <div class="bid-team" style="color: ${gameState.teams[gameState.currentBid.teamIndex].color}">
                      ${gameState.teams[gameState.currentBid.teamIndex].name}
                    </div>
                  `
                  : '<div class="no-bid">No bids yet</div>'}
              </div>

              <div class="bid-teams-grid">
                ${gameState.teams.map((team, index) => {
                  const hasHired = gameState.secondaryHired.includes(index);
                  const canBid = !team.isDisqualified && !hasHired && team.employees.length < 3;
                  return `
                    <button class="bid-team-btn ${hasHired ? 'complete' : ''}"
                            style="--team-color: ${team.color}"
                            onclick="openBidModal(${index})"
                            ${!canBid || team.esopRemaining <= gameState.currentBid.amount ? 'disabled' : ''}>
                      <span class="btn-team-name">${team.name}</span>
                      <span class="btn-team-esop">${team.esopRemaining.toFixed(1)}%</span>
                      ${hasHired ? '<span class="btn-badge">Hired</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>

              ${gameState.currentBid.teamIndex !== null ? `
                <button class="action-btn primary" onclick="closeSecondaryBidding()">
                  Award to Winner
                </button>
              ` : ''}
            </div>
          ` : `
            <div class="select-prompt">
              <p>Select a candidate above to start bidding</p>
            </div>
          `}
        </main>
      </div>
    </div>
  `;
}

// Render exit phase
function renderExit(app) {
  const sortedTeams = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('exit')}

      <main class="exit-main">
        <div class="exit-header">
          <h1>Exit Round</h1>
          <p>The moment of truth! Your exit type determines your final multiplier.</p>
        </div>

        ${!gameState.exitCard ? `
          <div class="exit-draw-section">
            <div class="exit-draw-card">
              <span class="exit-icon">🚀</span>
              <p>Draw an exit card to determine your company's fate</p>
              <button class="action-btn primary large" onclick="drawExitCard()">
                Draw Exit Card
              </button>
            </div>

            <div class="pre-exit-standings">
              <h3>Current Standings</h3>
              <div class="standings-list">
                ${sortedTeams.map((team, idx) => `
                  <div class="standing-entry" style="--team-color: ${team.color}">
                    <span class="standing-rank">#${idx + 1}</span>
                    <span class="standing-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                    <span class="standing-name">${team.name}</span>
                    <span class="standing-value">${formatCurrency(team.valuation)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : `
          <div class="exit-result">
            <div class="exit-card-reveal">
              <div class="exit-type">${gameState.exitCard.name}</div>
              <div class="exit-multiplier">${gameState.exitCard.multiplier}x</div>
              <p class="exit-desc">${gameState.exitCard.description}</p>
            </div>

            <div class="final-standings">
              <h3>Final Valuations</h3>
              <div class="standings-list final">
                ${sortedTeams.map((team, idx) => `
                  <div class="standing-entry ${idx === 0 ? 'winner' : ''}" style="--team-color: ${team.color}">
                    <span class="standing-rank">#${idx + 1}</span>
                    <span class="standing-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                    <span class="standing-name">${team.name}</span>
                    <span class="standing-value">${formatCurrency(team.valuation)}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <button class="action-btn primary large" onclick="declareWinner()">
              Declare Winner
            </button>
          </div>
        `}
      </main>
    </div>
  `;
}

// Iteration 2: Render wildcard decision phase
function renderWildcardPhase(app) {
  const phaseNames = { seed: 'Seed Round', early: 'Early Scaling', mature: 'Mature Scaling' };
  const activeTeams = gameState.teams.filter(t => !t.isDisqualified);
  const decidedCount = Object.keys(gameState.teamWildcardSelections).length;

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
                  <div class="wildcard-decision ${decision}">
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
          ${decidedCount >= activeTeams.length ? `
            <button class="action-btn primary large" onclick="endWildcardPhase()">
              Continue to Market Card
            </button>
          ` : ''}
        </div>
      </main>
    </div>
  `;
}

// Render winner screen
function renderWinner(app) {
  const winners = getWinners();
  const sortedTeams = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  // Sort by employee value for best employer ranking
  const sortedByEmployeeValue = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .map(team => ({
      ...team,
      employeeValue: calculateEmployeeValue(team)
    }))
    .sort((a, b) => b.employeeValue - a.employeeValue);

  app.innerHTML = `
    <div class="winner-container dual-winners">
      ${winners.sameTeam ? `
        <div class="double-winner-banner">
          🎉 ${winners.founder.name} wins BOTH categories! 🎉
        </div>
      ` : ''}

      <div class="winners-display">
        <!-- Best Founder -->
        <div class="winner-card founder">
          <div class="winner-badge-icon">🏢</div>
          <h2>Best Founder</h2>
          <p class="winner-subtitle">Highest Company Valuation</p>
          <div class="trophy">🏆</div>
          <div class="winner-team-name" style="color: ${winners.founder.color}">
            ${winners.founder.name}
          </div>
          <div class="winner-value">${formatCurrency(winners.founder.valuation)}</div>
          <div class="winner-detail">
            <strong>Building:</strong> ${winners.founder.problemStatement}
          </div>
        </div>

        <!-- Best Employer -->
        <div class="winner-card employer">
          <div class="winner-badge-icon">💼</div>
          <h2>Best Employer</h2>
          <p class="winner-subtitle">Most Value to Employees</p>
          <div class="trophy">🎖️</div>
          <div class="winner-team-name" style="color: ${winners.employer.color}">
            ${winners.employer.name}
          </div>
          <div class="winner-value">${formatCurrency(winners.employer.employeeValue)}</div>
          <div class="winner-detail">
            <strong>ESOP Given:</strong> ${(10 - winners.employer.esopRemaining).toFixed(1)}%
          </div>
        </div>
      </div>

      <div class="rankings-section">
        <div class="ranking-column">
          <h3>💰 Valuation Ranking</h3>
          <div class="ranking-list">
            ${sortedTeams.map((team, idx) => `
              <div class="rank-entry" style="--team-color: ${team.color}">
                <span class="rank">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
                <span class="rank-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                <span class="rank-name">${team.name}</span>
                <span class="rank-value">${formatCurrency(team.valuation)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="ranking-column">
          <h3>💼 Employee Value Ranking</h3>
          <div class="ranking-list">
            ${sortedByEmployeeValue.map((team, idx) => `
              <div class="rank-entry" style="--team-color: ${team.color}">
                <span class="rank">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
                <span class="rank-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                <span class="rank-name">${team.name}</span>
                <span class="rank-value">${formatCurrency(team.employeeValue)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="employee-breakdown">
        <h3>Employee ESOP Breakdown</h3>
        <div class="breakdown-grid">
          ${gameState.teams.filter(t => !t.isDisqualified).map(team => {
            const employeeValue = calculateEmployeeValue(team);
            return `
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
                  <span>Total:</span>
                  <strong>${formatCurrency(employeeValue)}</strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <button class="action-btn primary large" onclick="resetGame()">
        Play Again
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
