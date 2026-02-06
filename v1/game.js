// ESOP Wars - Game Logic

// ==========================================
// Iteration 6: Bot Timing Configuration
// ==========================================
const BOT_TIMING = {
  thinkingDelay: 800,    // Time showing "thinking" overlay
  actionDelay: 600,      // Time between bot actions
  turnDelay: 500,        // Time before starting bot turn
  auctionDelay: 700,     // Time between auction bids
  lockStagger: 400,      // Stagger between bot locks in setup
  marketPause: 2000,     // Pause after market results for humans
};

const MARKET_TIMING = {
  eventRevealDelay: 2000,      // Time to show event card before effects
  effectsDisplayDelay: 2500,   // Time to show valuation changes
  wildcardTimeout: 30000,      // Max wait for human wildcard decisions
  resultsFinalDelay: 1500,     // Time after wildcards before next round
  spectatorMultiplier: 0.3,    // Faster timing for all-bot games
};

// Game State
let gameState = {
  phase: 'registration', // registration | setup | setup-lock | setup-summary | auction | seed | early | secondary-drop | secondary-hire | mature | exit | winner
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
  teamWildcardSelections: {},
  // Iteration 3: Company Setup
  setupRound: 0,
  setupDraftTurn: 0,
  setupPhase: 'drop', // 'drop' | 'draw'
  segmentDeck: [],
  ideaDeck: [],
  setupDiscard: [],
  // Iteration 5: Market Leader Bonus
  roundPerformance: [],
  // Iteration 6: Bot Teams
  botsEnabled: false,
  botCount: 0,
  botExecuting: false,
  fillWithBots: false,
  spectatorMode: false,
  botWildcardDecidedThisRound: {},
  // Wildcard response tracking for human-priority
  wildcardResponses: {},
  wildcardPhaseActive: false,
  currentRoundResults: null
};

// Initialize game
function initGame() {
  // Initialize teams with registration state
  // Iteration 4: Balance - 12% ESOP pool, ₹20M starting valuation
  gameState.teams = teamDefinitions.map((def) => ({
    name: def.name,
    color: def.color,
    problemStatement: '',
    isRegistered: false,
    esopRemaining: 12, // Iteration 4: Increased from 10% to 12%
    valuation: 20000000, // Iteration 4: Reduced from ₹25M to ₹20M
    employees: [],
    isComplete: false,
    isDisqualified: false,
    // Iteration 2: Wildcard
    wildcardUsed: false,
    wildcardActiveThisRound: null, // 'double' | 'shield' | null
    // Iteration 3: Company Setup
    setupHand: [],
    lockedSegment: null,
    lockedIdea: null,
    setupBonus: null,
    // Iteration 5: Market Leader Bonus
    previousValuation: 20000000,
    currentGain: 0,
    isMarketLeader: false,
    marketLeaderCount: 0,
    valuationBeforeBonus: 0,
    // Iteration 6: Bot Teams
    isBot: false,
    botDifficulty: 'normal'
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
  // Iteration 3: Company Setup
  gameState.setupRound = 0;
  gameState.setupDraftTurn = 0;
  gameState.setupPhase = 'drop';
  gameState.segmentDeck = [];
  gameState.ideaDeck = [];
  gameState.setupDiscard = [];
  // Iteration 5: Market Leader Bonus
  gameState.roundPerformance = [];
  // Iteration 6: Bot Teams
  gameState.botsEnabled = false;
  gameState.botCount = 0;
  gameState.botExecuting = false;
  gameState.fillWithBots = false;
  gameState.wildcardResponses = {};
  gameState.wildcardPhaseActive = false;
  gameState.currentRoundResults = null;

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

  // Iteration 3: Go to setup phase instead of auction
  initSetupPhase();
}

// Iteration 3: Initialize company setup phase
function initSetupPhase() {
  // Shuffle segment and idea decks
  const shuffledSegments = shuffleArray([...segmentCards]);
  const shuffledProducts = shuffleArray([...productCards]);
  const shuffledServices = shuffleArray([...serviceCards]);
  const shuffledIdeas = shuffleArray([...shuffledProducts, ...shuffledServices]);

  // Deal initial hands to each team (1 segment, 2 products, 2 services ideally)
  // Since we have 6 segments and 5 teams, deal 1 segment per team
  // For ideas, deal 4 cards per team (mix of products and services)
  gameState.teams.forEach((team, idx) => {
    team.setupHand = [
      shuffledSegments[idx], // 1 segment card
      shuffledIdeas[idx * 4],
      shuffledIdeas[idx * 4 + 1],
      shuffledIdeas[idx * 4 + 2],
      shuffledIdeas[idx * 4 + 3]
    ].filter(Boolean);
  });

  // Remaining cards go to decks
  gameState.segmentDeck = shuffledSegments.slice(5);
  gameState.ideaDeck = shuffledIdeas.slice(20);

  gameState.setupRound = 0;
  gameState.setupDraftTurn = 0;
  gameState.setupPhase = 'drop';
  gameState.setupDiscard = [];
  gameState.phase = 'setup';

  saveState();
  render();
}

// Iteration 3: Drop a card during setup
function dropSetupCard(teamIndex, cardId, isSegment) {
  if (teamIndex !== gameState.setupDraftTurn) {
    showToast("Not your turn!", 'error');
    return;
  }

  const team = gameState.teams[teamIndex];
  const cardIndex = team.setupHand.findIndex(c => {
    if (isSegment) {
      return c.id === cardId && !c.type;
    } else {
      return c.id === cardId && c.type;
    }
  });

  if (cardIndex === -1) {
    showToast("Card not found!", 'error');
    return;
  }

  const [dropped] = team.setupHand.splice(cardIndex, 1);
  gameState.setupDiscard.push(dropped);

  gameState.setupPhase = 'draw';
  saveState();
  render();

  showToast(`${team.name} dropped ${dropped.name}`, 'info');
}

// Iteration 3: Draw a card during setup
function drawSetupCard(teamIndex, deckType) {
  if (teamIndex !== gameState.setupDraftTurn) {
    showToast("Not your turn!", 'error');
    return;
  }

  const team = gameState.teams[teamIndex];
  let card = null;

  if (deckType === 'segment' && gameState.segmentDeck.length > 0) {
    card = gameState.segmentDeck.pop();
  } else if (deckType === 'idea' && gameState.ideaDeck.length > 0) {
    card = gameState.ideaDeck.pop();
  }

  if (card) {
    team.setupHand.push(card);
    showToast(`${team.name} drew ${card.name}`, 'success');
  } else {
    showToast("No cards left in that deck!", 'error');
    return;
  }

  // Move to next team
  gameState.setupDraftTurn++;
  gameState.setupPhase = 'drop';

  // Check if round complete
  if (gameState.setupDraftTurn >= 5) {
    gameState.setupRound++;
    gameState.setupDraftTurn = 0;

    // Shuffle discard back into decks
    const discardedSegments = gameState.setupDiscard.filter(c => !c.type);
    const discardedIdeas = gameState.setupDiscard.filter(c => c.type);

    gameState.segmentDeck = shuffleArray([...gameState.segmentDeck, ...discardedSegments]);
    gameState.ideaDeck = shuffleArray([...gameState.ideaDeck, ...discardedIdeas]);
    gameState.setupDiscard = [];
  }

  // Check if all 3 rounds complete
  if (gameState.setupRound >= 3) {
    gameState.phase = 'setup-lock';
  }

  saveState();
  render();
}

// Iteration 3: Skip drawing (pass)
function skipSetupDraw(teamIndex) {
  if (teamIndex !== gameState.setupDraftTurn) {
    showToast("Not your turn!", 'error');
    return;
  }

  const team = gameState.teams[teamIndex];
  showToast(`${team.name} passed on drawing`, 'info');

  // Move to next team
  gameState.setupDraftTurn++;
  gameState.setupPhase = 'drop';

  if (gameState.setupDraftTurn >= 5) {
    gameState.setupRound++;
    gameState.setupDraftTurn = 0;

    const discardedSegments = gameState.setupDiscard.filter(c => !c.type);
    const discardedIdeas = gameState.setupDiscard.filter(c => c.type);

    gameState.segmentDeck = shuffleArray([...gameState.segmentDeck, ...discardedSegments]);
    gameState.ideaDeck = shuffleArray([...gameState.ideaDeck, ...discardedIdeas]);
    gameState.setupDiscard = [];
  }

  if (gameState.setupRound >= 3) {
    gameState.phase = 'setup-lock';
  }

  saveState();
  render();
}

// Iteration 3: Lock setup selections
function lockSetupCards(teamIndex, segmentId, ideaId) {
  const team = gameState.teams[teamIndex];

  const segment = team.setupHand.find(c => c.id === segmentId && !c.type);
  const idea = team.setupHand.find(c => c.id === ideaId && c.type);

  if (!segment) {
    showToast('Please select a market segment!', 'error');
    return;
  }

  if (!idea) {
    showToast('Please select an idea (product or service)!', 'error');
    return;
  }

  team.lockedSegment = segment;
  team.lockedIdea = idea;
  team.setupBonus = getSetupBonus(segment.name, idea.name);

  saveState();
  render();

  if (team.setupBonus) {
    showToast(`${team.name} locked: ${segment.name} + ${idea.name} (${team.setupBonus.bonus.category} +${team.setupBonus.bonus.modifier})`, 'success');
  } else {
    showToast(`${team.name} locked: ${segment.name} + ${idea.name}`, 'success');
  }

  // Check if all teams locked
  const allLocked = gameState.teams.every(t => t.lockedSegment && t.lockedIdea);
  if (allLocked) {
    setTimeout(() => {
      gameState.phase = 'setup-summary';
      saveState();
      render();
    }, 500);
  }
}

// Iteration 3: Start auction from setup summary
function startAuctionFromSetup() {
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

// Iteration 4: Calculate Ops discount for a team
function getOpsDiscount(team) {
  // 10% ESOP discount after first Ops hire
  const hasOps = team.employees.some(emp => emp.category === 'Ops');
  return hasOps ? 0.1 : 0; // 10% discount
}

// Iteration 4: Calculate effective ESOP cost with Ops discount
function getEffectiveEsopCost(team, bidAmount) {
  const discount = getOpsDiscount(team);
  return Math.round(bidAmount * (1 - discount) * 100) / 100;
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

  // Iteration 6: Trigger bot counter-bidding (for both human and bot bids)
  if (gameState.botsEnabled) {
    triggerBotCounterBid();
  }

  return true;
}

// Trigger bots to consider counter-bidding after any bid
function triggerBotCounterBid() {
  if (gameState.botExecuting) return;

  // Give bots a moment to "think" then respond
  gameState.botExecuting = true;
  setTimeout(() => {
    gameState.botExecuting = false;
    if (gameState.phase === 'auction') {
      executeBotAuctionBidding();
    } else if (gameState.phase === 'secondary-hire') {
      executeBotSecondaryBidding();
    }
  }, BOT_TIMING.auctionDelay);
}

// Close bidding and award employee
function closeBidding() {
  if (gameState.currentBid.teamIndex === null) {
    showToast('No bids placed!', 'error');
    return;
  }

  const winningTeam = gameState.teams[gameState.currentBid.teamIndex];
  const employee = getCurrentCard();
  const bidAmount = gameState.currentBid.amount;

  // Iteration 4: Apply Ops ESOP discount
  const effectiveCost = getEffectiveEsopCost(winningTeam, bidAmount);
  const hadDiscount = effectiveCost < bidAmount;

  winningTeam.employees.push({
    ...employee,
    bidAmount: bidAmount, // Record original bid
    effectiveCost: effectiveCost // Record actual cost paid
  });
  winningTeam.esopRemaining -= effectiveCost;
  winningTeam.esopRemaining = Math.round(winningTeam.esopRemaining * 100) / 100;

  if (winningTeam.employees.length >= 3) {
    winningTeam.isComplete = true;
  }

  if (hadDiscount) {
    showToast(`${winningTeam.name} wins ${employee.name}! (Ops discount: ${bidAmount}% → ${effectiveCost}%)`, 'success');
  } else {
    showToast(`${winningTeam.name} wins ${employee.name}!`, 'success');
  }
  nextCard();
}

// Skip current card
function skipCard() {
  showToast('Card skipped - No hire', 'info');
  nextCard();
}

// End bidding - automatically awards or skips based on whether there's a bid
function endBidding() {
  if (gameState.currentBid.teamIndex !== null) {
    closeBidding();
  } else {
    skipCard();
  }
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
  // Iteration 6: Apply $1M penalty per missing employee instead of disqualification
  gameState.teams.forEach(team => {
    const missingEmployees = 3 - team.employees.length;
    if (missingEmployees > 0) {
      const penalty = missingEmployees * 1000000;
      team.valuation = Math.max(0, team.valuation - penalty);
      team.hiringPenalty = (team.hiringPenalty || 0) + penalty;
      showToast(`${team.name} penalized ${formatCurrency(penalty)} for ${missingEmployees} missing employee(s)`, 'warning');
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

  // Reset bot wildcard decisions for this round
  gameState.botWildcardDecidedThisRound = {};

  applyMarketCard(card);

  saveState();
  render();
}

// Iteration 4: Count employees by category for a team
function countEmployeesByCategory(team, category) {
  return team.employees.filter(emp => emp.category === category).length;
}

// Iteration 4: Check if team has category perk active
function hasCategoryPerk(team, category) {
  return team.employees.some(emp => emp.category === category);
}

// Apply market card modifiers
function applyMarketCard(card) {
  // Iteration 5: Store previous valuations and reset market leader status
  gameState.teams.forEach(team => {
    if (!team.isDisqualified) {
      team.previousValuation = team.valuation;
      team.isMarketLeader = false;
      team.currentGain = 0;
      team.valuationBeforeBonus = 0;
    }
  });

  gameState.teams.forEach(team => {
    if (team.isDisqualified) return;

    const previousValuation = team.previousValuation;
    let skillTotal = 0;

    // Iteration 4: Check for category perks
    const hasEngineering = hasCategoryPerk(team, 'Engineering');
    const hasProduct = hasCategoryPerk(team, 'Product');
    const hasSales = hasCategoryPerk(team, 'Sales');
    const hasFinance = hasCategoryPerk(team, 'Finance');
    const salesCount = countEmployeesByCategory(team, 'Sales');

    // Check if this is Rapid Scaling (for Engineering perk)
    const isRapidScaling = card.name === 'Rapid Scaling';
    // Check if this is Market Crash (for Finance perk)
    const isMarketCrash = card.name === 'Market Crash';

    team.employees.forEach(emp => {
      // Base hard skill modifier from market card
      let hardMod = card.hardSkillModifiers[emp.category] || 0;

      // Iteration 3: Add setup bonus if category matches
      if (team.setupBonus && team.setupBonus.bonus.category === emp.category) {
        hardMod += team.setupBonus.bonus.modifier;
      }

      // Iteration 4: Engineering perk - Extra boost during Rapid Scaling
      if (isRapidScaling && hasEngineering && emp.category === 'Engineering') {
        hardMod += 0.15; // Extra 15% boost for Engineering during scaling
      }

      const adjustedHard = Math.min(1, Math.max(0, emp.hardSkill + hardMod));

      let softTotal = 0;
      Object.entries(emp.softSkills).forEach(([skill, value]) => {
        let softMod = card.softSkillModifiers[skill] || 0;

        // Iteration 4: Product perk - 50% reduction in soft skill penalties
        if (hasProduct && softMod < 0) {
          softMod = softMod * 0.5; // Reduce penalty by 50%
        }

        softTotal += Math.min(1, Math.max(0, value + softMod));
      });

      skillTotal += adjustedHard + softTotal;
    });

    // Iteration 4: Balance - Cap growth rate between -30% and +50%
    const growthRate = Math.max(-0.3, Math.min(0.5, skillTotal * 0.08));
    let newValuation = Math.round(previousValuation * (1 + growthRate));
    let change = newValuation - previousValuation;

    // Iteration 4: Sales perk - +5% valuation with 2+ Sales employees
    if (salesCount >= 2) {
      const salesBonus = Math.round(newValuation * 0.05);
      newValuation += salesBonus;
      change += salesBonus;
      team.salesSynergyActive = true;
    } else {
      team.salesSynergyActive = false;
    }

    // Iteration 4: Finance perk - 25% loss reduction during Market Crash
    if (isMarketCrash && hasFinance && change < 0) {
      const reducedLoss = Math.round(change * 0.75); // 25% reduction
      change = reducedLoss;
      newValuation = previousValuation + change;
      team.financeShieldActive = true;
    } else {
      team.financeShieldActive = false;
    }

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
    team.currentGain = change; // Iteration 5: Track gain for market leader calculation
    team.wildcardActiveThisRound = null; // Clear for next round
  });

  // Iteration 5: Apply Market Leader Bonus
  applyMarketLeaderBonus();
}

// Iteration 5: Apply Market Leader Bonus to top 2 teams by gains
function applyMarketLeaderBonus() {
  // Get active teams with their gains
  const teamGains = gameState.teams
    .map((team, idx) => ({
      teamIndex: idx,
      gain: team.isDisqualified ? -Infinity : team.currentGain,
      valuation: team.valuation, // For tiebreaker
      team: team
    }))
    .filter(t => !t.team.isDisqualified)
    .sort((a, b) => {
      // Sort by gain descending, use valuation as tiebreaker
      if (b.gain !== a.gain) return b.gain - a.gain;
      return b.valuation - a.valuation;
    });

  // Top 2 teams get valuation doubled (or fewer if less than 2 active teams)
  const leadersCount = Math.min(2, teamGains.length);
  const marketLeaders = teamGains.slice(0, leadersCount);

  marketLeaders.forEach(leader => {
    const team = gameState.teams[leader.teamIndex];

    // Store pre-bonus valuation for UI display
    team.valuationBeforeBonus = team.valuation;

    // Double the valuation
    team.valuation = team.valuation * 2;
    team.isMarketLeader = true;
    team.marketLeaderCount = (team.marketLeaderCount || 0) + 1;

    // Update lastChange to include bonus
    team.lastChange = team.valuation - team.previousValuation;
  });

  // Store round performance for history
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

// Iteration 5: Get round performance summary for UI
function getRoundPerformanceSummary() {
  return gameState.teams
    .map((team, idx) => ({
      teamIndex: idx,
      name: team.name,
      color: team.color,
      previousValuation: team.previousValuation,
      baseGain: team.currentGain,
      isMarketLeader: team.isMarketLeader,
      finalValuation: team.valuation,
      bonusAmount: team.isMarketLeader ? team.valuationBeforeBonus : 0,
      isDisqualified: team.isDisqualified
    }))
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.baseGain - a.baseGain);
}

// Iteration 5: Render market leaders announcement
function renderMarketLeadersAnnouncement() {
  const performance = getRoundPerformanceSummary();
  const marketLeaders = performance.filter(p => p.isMarketLeader);

  if (marketLeaders.length === 0) return '';

  return `
    <div class="market-leaders-announcement">
      <div class="leaders-icon">🚀</div>
      <h3>Market Leaders!</h3>
      <p>${marketLeaders.map(l => l.name).join(' and ')} led this round!</p>
      <p class="leaders-subtitle">Valuations DOUBLED!</p>
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
  `;
}

// Iteration 5: Render round performance list
function renderRoundPerformance() {
  const performance = getRoundPerformanceSummary();

  return `
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
  `;
}

// Iteration 6: Render inline wildcard section (after seeing results)
function renderWildcardSection() {
  // Check if any team can still use wildcard
  const teamsWithWildcard = gameState.teams.filter(t =>
    !t.isDisqualified && !t.wildcardUsed
  );

  if (teamsWithWildcard.length === 0) {
    return '<div class="wildcard-section used"><p>All wildcards have been used</p></div>';
  }

  return `
    <div class="wildcard-section">
      <h3>🃏 Wildcard Decisions</h3>
      <p>After seeing results, teams can use their one-time wildcard:</p>
      <div class="wildcard-teams-grid">
        ${gameState.teams.map((team, idx) => {
          if (team.isDisqualified) return '';

          const valuationChange = team.valuation - team.previousValuation;
          const changePercent = ((valuationChange / team.previousValuation) * 100).toFixed(1);
          const isPositive = valuationChange >= 0;

          if (team.wildcardUsed) {
            return `
              <div class="wildcard-team-card used" style="--team-color: ${team.color}">
                <div class="wc-team-name">${team.isBot ? '🤖 ' : ''}${team.name}</div>
                <div class="wc-change ${isPositive ? 'positive' : 'negative'}">
                  ${isPositive ? '+' : ''}${formatCurrency(valuationChange)} (${isPositive ? '+' : ''}${changePercent}%)
                </div>
                <div class="wc-status used">Wildcard Used</div>
              </div>
            `;
          }

          return `
            <div class="wildcard-team-card" style="--team-color: ${team.color}">
              <div class="wc-team-name">${team.isBot ? '🤖 ' : ''}${team.name}</div>
              <div class="wc-change ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '+' : ''}${formatCurrency(valuationChange)} (${isPositive ? '+' : ''}${changePercent}%)
              </div>
              <div class="wc-actions">
                ${isPositive ? `
                  <button class="wc-btn double" onclick="useWildcard(${idx}, 'double')" title="Double your gains">
                    ⚡ Double
                  </button>
                ` : `
                  <button class="wc-btn shield" onclick="useWildcard(${idx}, 'shield')" title="Block your losses">
                    🛡️ Shield
                  </button>
                `}
                <button class="wc-btn pass" onclick="useWildcard(${idx}, 'pass')" title="Save for later">
                  ➡️ Pass
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Use wildcard after seeing round results
function useWildcard(teamIndex, choice) {
  const team = gameState.teams[teamIndex];

  if (team.wildcardUsed && choice !== 'pass') {
    showToast('Wildcard already used!', 'error');
    return;
  }

  if (choice === 'pass') {
    showToast(`${team.name} saved their wildcard for later`, 'info');
    saveState();
    render();
    return;
  }

  // Apply wildcard effect
  const valuationChange = team.valuation - team.previousValuation;

  if (choice === 'double' && valuationChange > 0) {
    // Double the gains
    team.valuation = team.previousValuation + (valuationChange * 2);
    team.wildcardEffect = 'doubled';
    showToast(`${team.name} doubled their gains! +${formatCurrency(valuationChange)} → +${formatCurrency(valuationChange * 2)}`, 'success');
  } else if (choice === 'shield' && valuationChange < 0) {
    // Block the losses
    team.valuation = team.previousValuation;
    team.wildcardEffect = 'shielded';
    showToast(`${team.name} blocked their losses! ${formatCurrency(valuationChange)} → ${formatCurrency(0)}`, 'success');
  } else {
    showToast(`Wildcard had no effect (wrong choice for this situation)`, 'warning');
  }

  team.wildcardUsed = true;
  team.wildcardActiveThisRound = choice;

  saveState();
  render();
}

// Iteration 2: Start wildcard decision phase (legacy - kept for compatibility)
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
    gameState.botWildcardDecidedThisRound = {};
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
    gameState.currentBid = { teamIndex: null, amount: 0 };

    // Auto-select first card in spectator mode
    if (isSpectatorMode() && gameState.secondaryPool.length > 0) {
      gameState.selectedSecondaryCard = gameState.secondaryPool[0].id;
    }
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
  const bidAmount = gameState.currentBid.amount;

  // Iteration 4: Apply Ops ESOP discount
  const effectiveCost = getEffectiveEsopCost(winningTeam, bidAmount);
  const hadDiscount = effectiveCost < bidAmount;

  winningTeam.employees.push({
    ...employee,
    bidAmount: bidAmount,
    effectiveCost: effectiveCost
  });
  winningTeam.esopRemaining -= effectiveCost;
  winningTeam.esopRemaining = Math.round(winningTeam.esopRemaining * 100) / 100;
  winningTeam.isComplete = true;

  gameState.secondaryPool.splice(empIndex, 1);
  gameState.secondaryHired.push(gameState.currentBid.teamIndex);

  gameState.selectedSecondaryCard = null;
  gameState.currentBid = { teamIndex: null, amount: 0 };

  if (hadDiscount) {
    showToast(`${winningTeam.name} wins ${employee.name}! (Ops discount: ${bidAmount}% → ${effectiveCost}%)`, 'success');
  } else {
    showToast(`${winningTeam.name} wins ${employee.name}!`, 'success');
  }

  const allHired = gameState.teams.every(t => t.isDisqualified || t.employees.length === 3);
  if (allHired) {
    gameState.phase = 'mature';
  }

  saveState();
  render();
}

// End secondary bidding - awards if there's a bid, skips candidate if not
function endSecondaryBidding() {
  if (gameState.currentBid.teamIndex !== null) {
    closeSecondaryBidding();
  } else {
    // Skip this candidate - remove from pool
    const cardIndex = gameState.secondaryPool.findIndex(e => e.id === gameState.selectedSecondaryCard);
    if (cardIndex !== -1) {
      const skipped = gameState.secondaryPool.splice(cardIndex, 1)[0];
      showToast(`${skipped.name} not hired - removed from pool`, 'info');
    }

    gameState.selectedSecondaryCard = null;
    gameState.currentBid = { teamIndex: null, amount: 0 };

    // Check if pool is empty
    if (gameState.secondaryPool.length === 0) {
      finishSecondaryHire();
    } else {
      saveState();
      render();
    }
  }
}

// Legacy draw exit card - now each team picks individually
function drawExitCard() {
  // No longer used - each team picks their own exit
  saveState();
  render();
}

// Team chooses their exit strategy
function chooseExit(teamIndex, exitId) {
  const team = gameState.teams[teamIndex];
  const exitCard = exitCards.find(e => e.id === exitId);

  if (!exitCard) {
    showToast('Invalid exit choice!', 'error');
    return;
  }

  if (team.exitChoice) {
    showToast('Exit already chosen!', 'error');
    return;
  }

  // Store choice and apply multiplier
  team.exitChoice = exitCard;
  team.preExitValuation = team.valuation;
  team.valuation = Math.round(team.valuation * exitCard.multiplier);

  showToast(`${team.name} chose ${exitCard.name} (${exitCard.multiplier}x)!`, 'success');

  saveState();
  render();

  // Check if all teams have chosen - then allow proceeding
  const allChosen = gameState.teams.every(t => t.isDisqualified || t.exitChoice);
  if (allChosen) {
    gameState.exitCard = { name: 'Individual Exits', multiplier: 0 };
    saveState();
    render();

    // Auto-declare winner in spectator mode
    if (isSpectatorMode()) {
      setTimeout(() => {
        declareWinner();
      }, BOT_TIMING.marketPause * 2);
    }
  }
}

// Bot chooses exit strategy
function botChooseExit(teamIndex) {
  const team = gameState.teams[teamIndex];
  if (team.exitChoice || team.isDisqualified) return;

  // Bot strategy: Trailing teams take MORE risk to catch up, leaders play safe
  const rank = getValuationRank(team);

  let chosenExit;
  if (rank <= 2) {
    // Leaders protect their lead with safer exits
    // M&A (1.8x) is solid, JV (1.5x) is safest
    if (Math.random() < 0.6) {
      chosenExit = exitCards.find(e => e.name === 'M&A');
    } else if (Math.random() < 0.7) {
      chosenExit = exitCards.find(e => e.name === 'Joint Venture');
    } else {
      // 12% chance to go for IPO anyway
      chosenExit = exitCards.find(e => e.name === 'IPO');
    }
  } else if (rank === 3) {
    // Middle teams - balanced choice
    const roll = Math.random();
    if (roll < 0.4) {
      chosenExit = exitCards.find(e => e.name === 'IPO');
    } else if (roll < 0.8) {
      chosenExit = exitCards.find(e => e.name === 'M&A');
    } else {
      chosenExit = exitCards.find(e => e.name === 'Joint Venture');
    }
  } else {
    // Trailing teams (rank 4-5) - GO BIG OR GO HOME
    // They need the 2.2x multiplier to have any chance
    if (Math.random() < 0.75) {
      chosenExit = exitCards.find(e => e.name === 'IPO');
    } else {
      chosenExit = exitCards.find(e => e.name === 'M&A');
    }
  }

  // Fallback to first exit card if none found
  if (!chosenExit) {
    chosenExit = exitCards[0];
  }

  showBotThinking(team, `Choosing ${chosenExit.name}...`);
  setTimeout(() => {
    hideBotThinking();
    chooseExit(teamIndex, chosenExit.id);
  }, BOT_TIMING.thinkingDelay);
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

// Confirm restart with user
function confirmRestart() {
  if (confirm('Are you sure you want to restart? All progress will be lost.')) {
    resetGame();
  }
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

// ==========================================
// Iteration 6: Bot Helper Functions
// ==========================================

// Check if any human players are in the game
function hasHumanPlayers() {
  return gameState.teams.some(t => !t.isBot && !t.isDisqualified && t.isRegistered);
}

// Check if game is in spectator mode (all bots)
function isSpectatorMode() {
  return gameState.spectatorMode || (gameState.botsEnabled &&
    gameState.teams.every(t => t.isBot || t.isDisqualified || !t.isRegistered));
}

// Check if it's currently a bot's turn
function isBotTurn() {
  const phase = gameState.phase;

  if (phase === 'setup') {
    const currentTeam = gameState.teams[gameState.setupDraftTurn];
    return currentTeam?.isBot === true;
  }

  if (phase === 'setup-lock') {
    // Check if any bot still needs to lock
    return gameState.teams.some(t => t.isBot && !t.isDisqualified && !t.lockedSegment);
  }

  if (phase === 'auction') {
    // Bots can bid anytime during auction
    return gameState.botsEnabled;
  }

  if (phase === 'secondary-drop') {
    // Check if any bot needs to drop
    return gameState.teams.some(t => t.isBot && !t.isDisqualified && t.employees.length > 2);
  }

  if (phase === 'secondary-hire') {
    return gameState.botsEnabled;
  }

  return false;
}

// Check if bot execution should be scheduled
function shouldExecuteBotTurn() {
  return gameState.botsEnabled && isBotTurn() && !gameState.botExecuting;
}

// Get appropriate delay based on whether humans are playing
function getMarketDelay(baseDelay) {
  if (!hasHumanPlayers()) {
    return Math.floor(baseDelay * MARKET_TIMING.spectatorMultiplier);
  }
  return baseDelay;
}

// Get teams that can still bid in auction
function getActiveBiddingTeams() {
  return gameState.teams.filter(t =>
    !t.isDisqualified &&
    !t.isComplete &&
    t.esopRemaining > gameState.currentBid.amount
  );
}

// Get valuation rank for a team (1 = highest)
function getValuationRank(team) {
  const sortedTeams = gameState.teams
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  const rank = sortedTeams.findIndex(t => t.name === team.name) + 1;
  return rank || sortedTeams.length;
}

// ==========================================
// Iteration 6: Bot Decision Functions
// ==========================================

// Calculate synergy score for a card based on potential bonuses
function calculateSynergyScore(card, hand) {
  let score = 0;

  // Check if this is a segment card (no type property) or idea card (has type property)
  const isSegment = !card.type;

  if (isSegment) {
    // For segments, score based on potential bonuses with ideas in hand
    const ideas = hand.filter(c => c.type);
    ideas.forEach(idea => {
      const bonus = getSetupBonus(card.name, idea.name);
      if (bonus) {
        score += bonus.bonus.modifier * 100; // Convert to points
      }
    });
    // Segments are more valuable (only 6 in deck vs 16 ideas)
    score += 5;
  } else {
    // For ideas, score based on potential bonuses with segments in hand
    const segments = hand.filter(c => !c.type);
    segments.forEach(segment => {
      const bonus = getSetupBonus(segment.name, card.name);
      if (bonus) {
        score += bonus.bonus.modifier * 100;
      }
    });
  }

  return score;
}

// Bot decision: which card to drop during setup draft
function botDropDecision(team) {
  const hand = team.setupHand;
  if (hand.length === 0) return null;

  // Score each card by synergy
  const scoredCards = hand.map(card => ({
    card,
    score: calculateSynergyScore(card, hand)
  }));

  // Sort by score ascending (lowest score = best to drop)
  scoredCards.sort((a, b) => a.score - b.score);

  // Return the lowest-scoring card
  return scoredCards[0].card;
}

// Bot decision: whether to draw and from which deck
function botDrawDecision(team, round) {
  const hand = team.setupHand;
  const hasSegment = hand.some(c => !c.type);
  const segmentDeckEmpty = gameState.segmentDeck.length === 0;
  const ideaDeckEmpty = gameState.ideaDeck.length === 0;

  // Critical: must have at least one segment
  if (!hasSegment && !segmentDeckEmpty) {
    return { action: 'draw', deck: 'segment' };
  }

  // Calculate current best combo value
  let bestBonus = 0;
  const segments = hand.filter(c => !c.type);
  const ideas = hand.filter(c => c.type);

  segments.forEach(seg => {
    ideas.forEach(idea => {
      const bonus = getSetupBonus(seg.name, idea.name);
      if (bonus && bonus.bonus.modifier > bestBonus) {
        bestBonus = bonus.bonus.modifier;
      }
    });
  });

  // Later rounds = more conservative (higher pass chance)
  const passChance = 0.2 + (round * 0.15); // 20% → 35% → 50%

  // If we have a good combo, consider passing
  if (bestBonus >= 0.1 && Math.random() < passChance) {
    return { action: 'pass' };
  }

  // Decide which deck to draw from
  if (segmentDeckEmpty && ideaDeckEmpty) {
    return { action: 'pass' };
  }

  if (segmentDeckEmpty) {
    return { action: 'draw', deck: 'idea' };
  }

  if (ideaDeckEmpty) {
    return { action: 'draw', deck: 'segment' };
  }

  // Prefer drawing what we need more
  const segmentCount = segments.length;
  const ideaCount = ideas.length;

  if (segmentCount < 1) {
    return { action: 'draw', deck: 'segment' };
  }

  // Generally prefer ideas as there are more combos
  return { action: 'draw', deck: Math.random() < 0.7 ? 'idea' : 'segment' };
}

// Bot decision: which segment + idea to lock
function botLockDecision(team) {
  const hand = team.setupHand;
  const segments = hand.filter(c => !c.type);
  const ideas = hand.filter(c => c.type);

  if (segments.length === 0 || ideas.length === 0) {
    // Fallback: pick first available
    return {
      segment: segments[0] || null,
      idea: ideas[0] || null
    };
  }

  let bestCombo = { segment: segments[0], idea: ideas[0] };
  let bestBonus = -Infinity;

  segments.forEach(segment => {
    ideas.forEach(idea => {
      const bonus = getSetupBonus(segment.name, idea.name);
      const value = bonus ? bonus.bonus.modifier : 0;

      if (value > bestBonus) {
        bestBonus = value;
        bestCombo = { segment, idea };
      }
    });
  });

  return bestCombo;
}

// Score employee quality for auction bidding
function scoreEmployeeQuality(employee, team) {
  let score = employee.hardSkill * 10; // Base: 0-10 points

  // Soft skills contribution
  const softSkillTotal = Object.values(employee.softSkills).reduce((a, b) => a + b, 0);
  score += softSkillTotal * 2;

  // Category synergy with setup bonus
  if (team.setupBonus?.bonus.category === employee.category) {
    score *= 1.3; // 30% bonus for matching category
  }

  // Category diversity bonus (new perk = better)
  if (!hasCategoryPerk(team, employee.category)) {
    score *= 1.15; // New perk unlocked
  }

  // Diminishing returns for duplicate categories
  const categoryCount = countEmployeesByCategory(team, employee.category);
  if (categoryCount >= 1) score *= 0.85;
  if (categoryCount >= 2) score *= 0.7;

  return score;
}

// Calculate budget for bot bidding
function calculateBotBudget(team, cardsRemaining) {
  const employeesNeeded = 3 - team.employees.length;

  if (employeesNeeded <= 0) return 0;

  // Strict per-employee budget
  const maxPerHire = team.esopRemaining / employeesNeeded;

  // Add variance (±30%)
  const variance = 0.7 + Math.random() * 0.6;

  return Math.min(maxPerHire * variance, team.esopRemaining - 0.3);
}

// Bot decision: how much to bid on an employee
function botBidDecision(team, employee, currentBid, cardsRemaining) {
  const quality = scoreEmployeeQuality(employee, team);
  const budget = calculateBotBudget(team, cardsRemaining);
  const minBid = (currentBid || 0) + 0.5;

  // Team can't afford to bid
  if (minBid > team.esopRemaining || minBid > budget) {
    return null; // Pass
  }

  // Desperation: if running low on ESOP but need employees
  const employeesNeeded = 3 - team.employees.length;
  const cardsLeft = cardsRemaining;
  const desperate = employeesNeeded > 0 && cardsLeft <= employeesNeeded * 2;

  if (desperate) {
    // Bid more aggressively
    const desperateBid = Math.min(team.esopRemaining * 0.8, budget * 1.3);
    if (desperateBid > minBid) {
      return {
        bid: Math.round(Math.max(minBid, desperateBid * 0.9) * 10) / 10,
        rationale: `Desperate for employees (${employeesNeeded} needed, ${cardsLeft} cards left)`
      };
    }
  }

  // Quality-based bidding
  const qualityMultiplier = 0.5 + (quality / 20); // 0.5 - 1.0 range
  let maxBid = Math.min(budget, team.esopRemaining * qualityMultiplier);

  // Opening bid: start at 60-80% of max
  if (currentBid === 0 || currentBid === null) {
    const openingBid = maxBid * (0.6 + Math.random() * 0.2);
    return {
      bid: Math.round(Math.max(0.5, openingBid) * 10) / 10,
      rationale: `Opening bid for ${employee.name} (quality: ${quality.toFixed(1)})`
    };
  }

  // Can't outbid
  if (currentBid >= maxBid) {
    // Small chance to bid anyway (desperation)
    const desperationChance = 0.15 + (0.3 * (1 - team.esopRemaining / 12));
    if (Math.random() < desperationChance && minBid <= team.esopRemaining) {
      return {
        bid: Math.round(minBid * 10) / 10,
        rationale: `Desperation bid for ${employee.name}`
      };
    }
    return null; // Pass
  }

  // Outbid: increment by quality-based amount
  const increment = 0.5 + (quality / 15);
  const newBid = Math.min(currentBid + increment, maxBid);

  return {
    bid: Math.round(newBid * 10) / 10,
    rationale: `Outbidding for ${employee.name} (quality: ${quality.toFixed(1)})`
  };
}

// Bot decision: wildcard usage based on round results
function botWildcardDecision(team, roundResults) {
  if (team.wildcardUsed) return null;

  const valuationChange = roundResults?.valuationDelta || (team.valuation - team.previousValuation);
  const swingPercent = Math.abs(valuationChange) / team.previousValuation;
  const rank = getValuationRank(team);
  const isFinalRound = gameState.phase === 'mature';

  // Determine threshold based on game stage
  const threshold = isFinalRound ? 0.08 : 0.12;

  // Small swing - usually save wildcard
  if (swingPercent < threshold) {
    // Final round: higher chance to use it (use it or lose it)
    if (isFinalRound && Math.random() < 0.5) {
      return valuationChange > 0 ? 'double' : 'shield';
    }
    return null; // Pass
  }

  // TRAILING TEAMS (rank 4-5): Aggressive catch-up strategy
  if (rank >= 4) {
    if (valuationChange > 0) {
      // Big gains? DOUBLE to catch up! (80% chance)
      if (Math.random() < 0.8) return 'double';
    } else if (valuationChange < 0 && swingPercent > 0.20) {
      // Only shield catastrophic losses
      return 'shield';
    }
    // Otherwise save for a better opportunity
    return null;
  }

  // LEADERS (rank 1-2): Conservative - protect the lead
  if (rank <= 2) {
    if (valuationChange < 0 && swingPercent > 0.15) {
      // Shield losses to protect lead (70% chance)
      if (Math.random() < 0.7) return 'shield';
    } else if (valuationChange > 0 && isFinalRound) {
      // Only double in final round to secure win
      return 'double';
    }
    // Otherwise save - they're already ahead
    return null;
  }

  // MIDDLE TEAMS (rank 3): Balanced approach
  if (valuationChange > 0 && swingPercent > 0.15) {
    return Math.random() < 0.5 ? 'double' : null;
  } else if (valuationChange < 0 && swingPercent > 0.18) {
    return Math.random() < 0.5 ? 'shield' : null;
  }

  return null; // Save for later
}

// Bot decision: which employee to drop in secondary phase
function botSecondaryDropDecision(team) {
  if (team.employees.length <= 2) return null;

  // Score each employee (lower = worse = drop candidate)
  const scoredEmployees = team.employees.map(emp => {
    let value = scoreEmployeeQuality(emp, team);

    // Penalty for dropping last of a category (lose perk)
    const categoryCount = countEmployeesByCategory(team, emp.category);
    if (categoryCount === 1) {
      value *= 1.5; // Don't want to drop this one
    }

    return { employee: emp, value };
  });

  // Sort by value ascending (lowest = best to drop)
  scoredEmployees.sort((a, b) => a.value - b.value);

  return scoredEmployees[0].employee;
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

  // Iteration 4: Check for Ops discount
  const discount = getOpsDiscount(team);
  const hasOpsDiscount = discount > 0;

  document.getElementById('bidTeamName').textContent = team.name;
  document.getElementById('bidTeamName').style.color = team.color;
  document.getElementById('currentBidDisplay').textContent =
    gameState.currentBid.amount > 0
      ? `${gameState.currentBid.amount}% (${gameState.teams[gameState.currentBid.teamIndex].name})`
      : 'No bids yet';
  document.getElementById('maxBidDisplay').textContent = `${team.esopRemaining}%`;

  // Iteration 4: Show Ops discount info
  const discountDisplay = document.getElementById('opsDiscountDisplay');
  if (discountDisplay) {
    if (hasOpsDiscount) {
      discountDisplay.innerHTML = `<span class="ops-discount-badge">⚡ Ops Discount: 10% off ESOP cost</span>`;
      discountDisplay.style.display = 'block';
    } else {
      discountDisplay.style.display = 'none';
    }
  }

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
  const activePerks = getActivePerks(team);

  document.getElementById('teamDetailName').textContent = team.name;
  document.getElementById('teamDetailName').style.color = team.color;
  document.getElementById('teamDetailProblem').textContent = team.problemStatement || 'No problem statement';
  document.getElementById('teamDetailEsop').textContent = `${team.esopRemaining.toFixed(1)}%`;
  document.getElementById('teamDetailValuation').textContent = formatCurrency(team.valuation);

  const employeesList = document.getElementById('teamDetailEmployees');
  if (team.employees.length === 0) {
    employeesList.innerHTML = '<div class="no-employees">No employees hired yet</div>';
  } else {
    // Iteration 4: Show active perks
    let perksHtml = '';
    if (activePerks.length > 0) {
      perksHtml = `
        <div class="detail-perks">
          <h5>Active Perks</h5>
          <div class="detail-perks-list">
            ${activePerks.map(perk => `
              <div class="detail-perk ${perk.category.toLowerCase()}">
                <span class="detail-perk-icon">${perk.icon}</span>
                <span class="detail-perk-name">${perk.name}</span>
                <span class="detail-perk-desc">${perk.description}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    employeesList.innerHTML = perksHtml + team.employees.map(emp => {
      const perk = categoryPerks[emp.category];
      const effectiveCost = emp.effectiveCost || emp.bidAmount;
      const hadDiscount = effectiveCost < emp.bidAmount;

      return `
        <div class="detail-employee">
          <div class="detail-emp-header">
            <span class="detail-emp-name">${emp.name}</span>
            <span class="detail-emp-category ${emp.category.toLowerCase()}">${emp.category}</span>
          </div>
          <div class="detail-emp-role">${emp.role}</div>
          <div class="detail-emp-perk">
            ${perk ? `<span class="emp-perk-badge">${perk.icon} ${perk.name}</span>` : ''}
          </div>
          <div class="detail-emp-stats">
            <span>Hard: ${emp.hardSkill.toFixed(1)}</span>
            ${Object.entries(emp.softSkills).map(([s, v]) => `<span>${s}: ${v.toFixed(1)}</span>`).join('')}
          </div>
          <div class="detail-emp-bid">
            Hired for ${emp.bidAmount}%
            ${hadDiscount ? `<span class="discount-note">(paid ${effectiveCost}% with Ops discount)</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
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
    // Iteration 3: Setup phases
    case 'setup':
      renderSetupPhase(app);
      break;
    case 'setup-lock':
      renderSetupLock(app);
      break;
    case 'setup-summary':
      renderSetupSummary(app);
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

  // Iteration 6: Schedule bot actions after render
  scheduleNextBotAction();
}

// ==========================================
// Iteration 6: Bot Execution System
// ==========================================

// Schedule the next bot action if applicable
function scheduleNextBotAction() {
  if (!gameState.botsEnabled) return;
  if (gameState.botExecuting) return;

  const phase = gameState.phase;

  // Setup draft - bot's turn
  if (phase === 'setup' && isBotTurn()) {
    gameState.botExecuting = true;
    setTimeout(() => {
      executeBotSetupTurn();
      gameState.botExecuting = false;
    }, BOT_TIMING.turnDelay);
    return;
  }

  // Setup lock - bots lock their cards
  if (phase === 'setup-lock') {
    const botsNeedingLock = gameState.teams.filter(t =>
      t.isBot && !t.isDisqualified && !t.lockedSegment
    );
    if (botsNeedingLock.length > 0) {
      gameState.botExecuting = true;
      executeBotSetupLocks();
      return;
    }
  }

  // Auction - bots place bids
  if (phase === 'auction') {
    // Give a delay then have bots consider bidding
    gameState.botExecuting = true;
    setTimeout(() => {
      executeBotAuctionBidding();
      gameState.botExecuting = false;
    }, BOT_TIMING.auctionDelay);
    return;
  }

  // Wildcard phase - bots make decisions
  // Wildcard phase - process bots one at a time
  if (gameState.wildcardPhase) {
    const botNeedingDecision = gameState.teams.findIndex((t, idx) =>
      t.isBot && !t.isDisqualified && gameState.teamWildcardSelections[idx] === undefined
    );
    if (botNeedingDecision !== -1) {
      gameState.botExecuting = true;
      setTimeout(() => {
        executeSingleBotWildcard(botNeedingDecision);
        setTimeout(() => {
          gameState.botExecuting = false;
          scheduleNextBotAction();
        }, BOT_TIMING.thinkingDelay + BOT_TIMING.actionDelay);
      }, BOT_TIMING.actionDelay);
      return;
    }
  }

  // Secondary drop - bots drop employees
  if (phase === 'secondary-drop') {
    const botsNeedingDrop = gameState.teams.filter(t =>
      t.isBot && !t.isDisqualified && t.employees.length > 2
    );
    if (botsNeedingDrop.length > 0) {
      gameState.botExecuting = true;
      setTimeout(() => {
        executeBotSecondaryDrops();
        gameState.botExecuting = false;
      }, BOT_TIMING.actionDelay);
      return;
    } else if (isSpectatorMode()) {
      // No drops needed - auto-advance in spectator mode
      gameState.botExecuting = true;
      setTimeout(() => {
        gameState.botExecuting = false;
        advanceFromSecondaryDrop();
      }, BOT_TIMING.actionDelay);
      return;
    }
  }

  // Secondary hire - bots place bids
  if (phase === 'secondary-hire') {
    // First check if a card needs to be selected
    if (!gameState.selectedSecondaryCard && isSpectatorMode() && gameState.secondaryPool.length > 0) {
      gameState.botExecuting = true;
      setTimeout(() => {
        // Auto-select best card for bots
        let bestCard = gameState.secondaryPool[0];
        let bestScore = -Infinity;

        gameState.secondaryPool.forEach(emp => {
          const avgScore = gameState.teams
            .filter(t => t.isBot && !t.isDisqualified && !gameState.secondaryHired.includes(gameState.teams.indexOf(t)))
            .reduce((sum, t) => sum + scoreEmployeeQuality(emp, t), 0);
          if (avgScore > bestScore) {
            bestScore = avgScore;
            bestCard = emp;
          }
        });

        gameState.botExecuting = false;
        selectSecondaryCard(bestCard.id);
      }, BOT_TIMING.actionDelay);
      return;
    }

    // Card is selected, bots can bid
    if (gameState.selectedSecondaryCard) {
      gameState.botExecuting = true;
      setTimeout(() => {
        gameState.botExecuting = false;
        executeBotSecondaryBidding();
      }, BOT_TIMING.auctionDelay);
      return;
    }
  }

  // Exit phase - bots choose their exit strategy (process one at a time)
  if (phase === 'exit') {
    const botNeedingExit = gameState.teams.find(t =>
      t.isBot && !t.isDisqualified && !t.exitChoice
    );
    if (botNeedingExit) {
      gameState.botExecuting = true;
      const teamIndex = gameState.teams.indexOf(botNeedingExit);

      setTimeout(() => {
        botChooseExit(teamIndex);
        // After thinking delay, allow next bot to be scheduled
        setTimeout(() => {
          gameState.botExecuting = false;
          scheduleNextBotAction();
        }, BOT_TIMING.thinkingDelay + BOT_TIMING.actionDelay);
      }, BOT_TIMING.lockStagger);
      return;
    }
  }

  // Market rounds - bots make wildcard decisions after results (works in both mixed and spectator mode)
  if (['seed', 'early', 'mature'].includes(phase) && gameState.currentMarketCard && gameState.botsEnabled) {
    // Find a bot that hasn't made a wildcard decision this round
    const botToDecide = gameState.teams.find((t, idx) =>
      t.isBot && !t.isDisqualified && !t.wildcardUsed &&
      !gameState.botWildcardDecidedThisRound?.[idx]
    );

    if (botToDecide) {
      gameState.botExecuting = true;
      const teamIndex = gameState.teams.indexOf(botToDecide);

      setTimeout(() => {
        executeBotWildcardInline(teamIndex);
        setTimeout(() => {
          gameState.botExecuting = false;
          scheduleNextBotAction();
        }, BOT_TIMING.thinkingDelay + BOT_TIMING.actionDelay);
      }, BOT_TIMING.actionDelay);
      return;
    }
  }

  // Spectator mode auto-actions for phases that need user interaction
  if (isSpectatorMode()) {
    // Market rounds - auto-draw if no card drawn yet
    if (['seed', 'early', 'mature'].includes(phase) && !gameState.currentMarketCard) {
      gameState.botExecuting = true;
      setTimeout(() => {
        gameState.botExecuting = false;
        drawMarketCard();
        // After drawing, schedule bot wildcard decisions
        scheduleNextBotAction();
      }, BOT_TIMING.marketPause);
      return;
    }

    // Market rounds - all bots decided, auto-continue to next round
    if (['seed', 'early', 'mature'].includes(phase) && gameState.currentMarketCard) {
      gameState.botExecuting = true;
      setTimeout(() => {
        // Reset wildcard decisions for next round
        gameState.botWildcardDecidedThisRound = {};
        gameState.botExecuting = false;
        nextRound();
      }, BOT_TIMING.marketPause);
      return;
    }

    // Auction summary - auto-continue
    if (phase === 'auction-summary') {
      gameState.botExecuting = true;
      setTimeout(() => {
        gameState.botExecuting = false;
        startMarketRounds();
      }, BOT_TIMING.marketPause);
      return;
    }

    // Setup summary - auto-continue
    if (phase === 'setup-summary') {
      gameState.botExecuting = true;
      setTimeout(() => {
        gameState.botExecuting = false;
        startAuctionFromSetup();
      }, BOT_TIMING.marketPause);
      return;
    }
  }
}

// Execute bot's turn during setup draft
function executeBotSetupTurn() {
  const teamIndex = gameState.setupDraftTurn;
  const team = gameState.teams[teamIndex];

  if (!team.isBot) return;

  // Drop phase
  if (gameState.setupPhase === 'drop') {
    const cardToDrop = botDropDecision(team);
    if (cardToDrop) {
      const isSegment = !cardToDrop.type;
      showBotThinking(team, 'Deciding which card to drop...');
      setTimeout(() => {
        hideBotThinking();
        dropSetupCard(teamIndex, cardToDrop.id, isSegment);
      }, BOT_TIMING.thinkingDelay);
    }
  }
  // Draw phase
  else if (gameState.setupPhase === 'draw') {
    const decision = botDrawDecision(team, gameState.setupRound);
    showBotThinking(team, decision.action === 'pass' ? 'Deciding to pass...' : `Drawing from ${decision.deck} deck...`);
    setTimeout(() => {
      hideBotThinking();
      if (decision.action === 'draw') {
        drawSetupCard(teamIndex, decision.deck);
      } else {
        skipSetupDraw(teamIndex);
      }
    }, BOT_TIMING.thinkingDelay);
  }
}

// Execute bot lock decisions during setup-lock phase
function executeBotSetupLocks() {
  const botsNeedingLock = gameState.teams.filter(t =>
    t.isBot && !t.isDisqualified && !t.lockedSegment
  );

  let delay = 0;
  botsNeedingLock.forEach((team) => {
    const teamIndex = gameState.teams.indexOf(team);
    setTimeout(() => {
      const decision = botLockDecision(team);
      if (decision.segment && decision.idea) {
        showBotThinking(team, 'Locking segment and idea...');
        setTimeout(() => {
          hideBotThinking();
          lockSetupCards(teamIndex, decision.segment.id, decision.idea.id);
        }, BOT_TIMING.thinkingDelay);
      }
    }, delay);
    delay += BOT_TIMING.lockStagger;
  });

  // Reset botExecuting after all locks complete
  setTimeout(() => {
    gameState.botExecuting = false;
  }, delay + BOT_TIMING.thinkingDelay + 100);
}

// Execute bot bidding during auction
function executeBotAuctionBidding() {
  const currentCard = getCurrentCard();
  if (!currentCard) return;

  const cardsRemaining = gameState.employeeDeck.length - gameState.currentCardIndex;

  // Get bots that can still bid
  const eligibleBots = gameState.teams.filter((t, idx) =>
    t.isBot &&
    !t.isDisqualified &&
    !t.isComplete &&
    t.esopRemaining > gameState.currentBid.amount &&
    idx !== gameState.currentBid.teamIndex // Don't outbid self
  );

  if (eligibleBots.length === 0) {
    // No bots can bid - check if we should close bidding in spectator mode
    if (isSpectatorMode()) {
      setTimeout(() => {
        if (gameState.currentBid.teamIndex !== null) {
          closeBidding();
        } else {
          skipCard();
        }
      }, BOT_TIMING.actionDelay);
    }
    return;
  }

  // Have each eligible bot decide whether to bid
  const bids = [];
  eligibleBots.forEach((team) => {
    const decision = botBidDecision(team, currentCard, gameState.currentBid.amount, cardsRemaining);
    if (decision) {
      bids.push({
        team,
        teamIndex: gameState.teams.indexOf(team),
        ...decision
      });
    }
  });

  if (bids.length === 0) {
    // No bots want to bid - close bidding in spectator mode
    if (isSpectatorMode()) {
      setTimeout(() => {
        if (gameState.currentBid.teamIndex !== null) {
          closeBidding();
        } else {
          skipCard();
        }
      }, BOT_TIMING.actionDelay);
    }
    return;
  }

  // Pick a random bot to bid (add variety)
  const selectedBid = bids[Math.floor(Math.random() * bids.length)];

  // Verify bid is still valid (race condition check)
  if (selectedBid.bid > gameState.currentBid.amount &&
      selectedBid.bid <= selectedBid.team.esopRemaining) {
    showBotThinking(selectedBid.team, selectedBid.rationale);
    setTimeout(() => {
      hideBotThinking();
      placeBid(selectedBid.teamIndex, selectedBid.bid);
    }, BOT_TIMING.thinkingDelay);
  }
}

// Execute bot wildcard decisions
// Execute wildcard decision for a single bot (legacy phase-based)
function executeSingleBotWildcard(teamIndex) {
  const team = gameState.teams[teamIndex];
  if (!team.isBot || team.isDisqualified || gameState.teamWildcardSelections[teamIndex] !== undefined) {
    return;
  }

  const roundResults = {
    valuationDelta: team.valuation - team.previousValuation
  };
  const decision = botWildcardDecision(team, roundResults);

  showBotThinking(team, decision ? `Playing ${decision === 'double' ? 'Double Down ⚡' : 'Shield 🛡️'}...` : 'Passing on wildcard...');
  setTimeout(() => {
    hideBotThinking();
    selectWildcard(teamIndex, decision);
  }, BOT_TIMING.thinkingDelay);
}

// Execute inline wildcard decision for spectator mode
function executeBotWildcardInline(teamIndex) {
  const team = gameState.teams[teamIndex];
  if (!team.isBot || team.isDisqualified || team.wildcardUsed) {
    // Mark as decided this round
    if (!gameState.botWildcardDecidedThisRound) {
      gameState.botWildcardDecidedThisRound = {};
    }
    gameState.botWildcardDecidedThisRound[teamIndex] = true;
    return;
  }

  const roundResults = {
    valuationDelta: team.valuation - team.previousValuation
  };
  const decision = botWildcardDecision(team, roundResults);

  // Mark as decided this round
  if (!gameState.botWildcardDecidedThisRound) {
    gameState.botWildcardDecidedThisRound = {};
  }
  gameState.botWildcardDecidedThisRound[teamIndex] = true;

  if (decision) {
    showBotThinking(team, `Playing ${decision === 'double' ? 'Double Down ⚡' : 'Shield 🛡️'}...`);
    setTimeout(() => {
      hideBotThinking();
      useWildcard(teamIndex, decision);
    }, BOT_TIMING.thinkingDelay);
  } else {
    // Bot passes - just mark as decided, don't need to call useWildcard
    showBotThinking(team, 'Saving wildcard for later...');
    setTimeout(() => {
      hideBotThinking();
    }, BOT_TIMING.thinkingDelay / 2);
  }
}

// Execute bot drops during secondary-drop phase
function executeBotSecondaryDrops() {
  gameState.teams.forEach((team, idx) => {
    if (team.isBot && !team.isDisqualified && team.employees.length > 2) {
      const employeeToDrop = botSecondaryDropDecision(team);
      if (employeeToDrop) {
        showBotThinking(team, `Dropping ${employeeToDrop.name}...`);
        setTimeout(() => {
          hideBotThinking();
          dropEmployee(idx, employeeToDrop.id);
        }, BOT_TIMING.thinkingDelay);
      }
    }
  });
}

// Advance from secondary-drop to secondary-hire
function advanceFromSecondaryDrop() {
  // Check if any team still needs to drop
  const teamsNeedingDrop = gameState.teams.filter(t =>
    !t.isDisqualified && t.employees.length > 2
  );

  if (teamsNeedingDrop.length === 0) {
    // Advance to secondary-hire
    gameState.phase = 'secondary-hire';
    gameState.secondaryPool = [...gameState.droppedEmployees, ...gameState.reserveEmployees];
    gameState.secondaryHired = [];
    gameState.currentBid = { teamIndex: null, amount: 0 };

    // Auto-select first card in spectator mode
    if (isSpectatorMode() && gameState.secondaryPool.length > 0) {
      gameState.selectedSecondaryCard = gameState.secondaryPool[0].id;
    }

    saveState();
    render();
  }
}

// Execute bot bidding during secondary-hire
function executeBotSecondaryBidding() {
  if (!gameState.selectedSecondaryCard) {
    // Card selection is now handled in scheduleNextBotAction
    return;
  }

  const selectedEmployee = gameState.secondaryPool.find(e => e.id === gameState.selectedSecondaryCard);
  if (!selectedEmployee) return;

  // Get bots that can still bid (haven't hired in secondary yet)
  const eligibleBots = gameState.teams.filter((t, idx) =>
    t.isBot &&
    !t.isDisqualified &&
    !gameState.secondaryHired.includes(idx) &&
    t.esopRemaining > gameState.currentBid.amount &&
    idx !== gameState.currentBid.teamIndex
  );

  if (eligibleBots.length === 0) {
    // No bots can bid
    if (isSpectatorMode()) {
      setTimeout(() => {
        if (gameState.currentBid.teamIndex !== null) {
          closeSecondaryBidding();
        } else {
          // Remove card from pool and try next
          const cardIndex = gameState.secondaryPool.findIndex(e => e.id === gameState.selectedSecondaryCard);
          if (cardIndex !== -1) {
            gameState.secondaryPool.splice(cardIndex, 1);
          }
          gameState.selectedSecondaryCard = null;
          gameState.currentBid = { teamIndex: null, amount: 0 };

          if (gameState.secondaryPool.length === 0) {
            finishSecondaryHire();
          } else {
            saveState();
            render();
            // Trigger next bot action after render
            scheduleNextBotAction();
          }
        }
      }, BOT_TIMING.actionDelay);
    }
    return;
  }

  // Have bots decide
  const bids = [];
  eligibleBots.forEach((team) => {
    // Use urgency modifier for secondary auction
    const decision = botBidDecision(team, selectedEmployee, gameState.currentBid.amount, gameState.secondaryPool.length);
    if (decision) {
      bids.push({
        team,
        teamIndex: gameState.teams.indexOf(team),
        bid: Math.min(decision.bid * 1.2, team.esopRemaining), // 20% urgency boost
        rationale: decision.rationale
      });
    }
  });

  if (bids.length === 0) {
    if (isSpectatorMode()) {
      setTimeout(() => {
        if (gameState.currentBid.teamIndex !== null) {
          closeSecondaryBidding();
        } else {
          // Skip this card
          const cardIndex = gameState.secondaryPool.findIndex(e => e.id === gameState.selectedSecondaryCard);
          if (cardIndex !== -1) {
            gameState.secondaryPool.splice(cardIndex, 1);
          }
          gameState.selectedSecondaryCard = null;
          gameState.currentBid = { teamIndex: null, amount: 0 };

          if (gameState.secondaryPool.length === 0) {
            finishSecondaryHire();
          } else {
            saveState();
            render();
          }
        }
      }, BOT_TIMING.actionDelay);
    }
    return;
  }

  const selectedBid = bids[Math.floor(Math.random() * bids.length)];

  if (selectedBid.bid > gameState.currentBid.amount) {
    showBotThinking(selectedBid.team, selectedBid.rationale);
    setTimeout(() => {
      hideBotThinking();
      placeBid(selectedBid.teamIndex, Math.round(selectedBid.bid * 10) / 10);
    }, BOT_TIMING.thinkingDelay);
  }
}

// Finish secondary hire phase
function finishSecondaryHire() {
  // Apply penalties for teams with fewer than 3 employees
  gameState.teams.forEach((team) => {
    if (team.isDisqualified) return;
    const missingEmployees = 3 - team.employees.length;
    if (missingEmployees > 0) {
      const penalty = missingEmployees * 1000000;
      team.valuation = Math.max(0, team.valuation - penalty);
      team.hiringPenalty = (team.hiringPenalty || 0) + penalty;
      showToast(`${team.name} penalized ${formatCurrency(penalty)} for missing ${missingEmployees} employee(s)`, 'warning');
    }
  });

  // Advance to mature phase
  gameState.phase = 'mature';
  saveState();
  render();
}

// Show bot thinking overlay
function showBotThinking(team, message) {
  let overlay = document.getElementById('botThinkingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'botThinkingOverlay';
    overlay.className = 'bot-thinking-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="bot-thinking-content" style="--team-color: ${team.color}">
      <div class="bot-thinking-icon">🤖</div>
      <div class="bot-thinking-team">${team.name}</div>
      <div class="bot-thinking-message">${message}</div>
      <div class="bot-thinking-spinner"></div>
    </div>
  `;
  overlay.classList.add('visible');
}

// Hide bot thinking overlay
function hideBotThinking() {
  const overlay = document.getElementById('botThinkingOverlay');
  if (overlay) {
    overlay.classList.remove('visible');
  }
}

// Render registration phase
function renderRegistration(app) {
  const canStartWithBots = gameState.fillWithBots && gameState.registeredTeams >= 1;
  const canStart = gameState.registeredTeams >= 5 || canStartWithBots;
  const botsNeeded = 5 - gameState.registeredTeams;

  app.innerHTML = `
    <div class="game-container">
      <header class="game-header">
        <div class="header-top">
          <div class="logo">
            <span class="logo-icon">💼</span>
            <h1>ESOP Wars</h1>
          </div>
          <button class="restart-btn" onclick="confirmRestart()" title="Restart Game">
            🔄 <span>Restart</span>
          </button>
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
            <div class="registration-card ${team.isRegistered ? 'registered' : ''} ${team.isBot ? 'is-bot' : ''}" style="--team-color: ${team.color}">
              <div class="reg-card-header">
                <div class="reg-card-icon" style="background: ${team.color}">
                  ${team.isBot ? '🤖' : team.name.charAt(0)}
                </div>
                <div class="reg-card-title">
                  <h3>${team.isBot ? team.name : team.name} ${team.isBot ? '<span class="bot-badge">BOT</span>' : ''}</h3>
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
              ${!team.isBot ? `
                <button class="reg-card-btn ${team.isRegistered ? 'edit' : ''}"
                        onclick="openRegistrationModal(${index})">
                  ${team.isRegistered ? 'Edit Details' : 'Register Team'}
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="registration-actions">
          <div class="bot-option">
            <label class="bot-checkbox-label">
              <input type="checkbox"
                     id="fillWithBots"
                     ${gameState.fillWithBots ? 'checked' : ''}
                     onchange="toggleFillWithBots(this.checked)">
              <span class="bot-checkbox-text">
                🤖 Fill remaining slots with bots
                ${gameState.fillWithBots && botsNeeded > 0 ? `<span class="bot-count">(${botsNeeded} bot${botsNeeded > 1 ? 's' : ''})</span>` : ''}
              </span>
            </label>
          </div>

          <div class="registration-buttons">
            <button class="action-btn primary large ${!canStart ? 'disabled' : ''}"
                    onclick="startGameWithBots()"
                    ${!canStart ? 'disabled' : ''}>
              ${getStartButtonText(canStart, canStartWithBots, botsNeeded)}
            </button>

            <button class="action-btn secondary spectator-btn"
                    onclick="startSpectatorMode()">
              👁️ Watch Bots Play
            </button>
          </div>
        </div>
      </main>

      <footer class="game-footer">
        <div class="game-rules">
          <h4>Quick Rules</h4>
          <ul>
            <li>Each team starts with 12% ESOP pool</li>
            <li>Bid equity to hire employees (3 per team)</li>
            <li>Market conditions affect valuations</li>
            <li>Highest valuation at exit wins!</li>
          </ul>
        </div>
      </footer>
    </div>
  `;
}

// Get appropriate text for start button
function getStartButtonText(canStart, canStartWithBots, botsNeeded) {
  if (!canStart) {
    if (gameState.fillWithBots) {
      return 'Register at least 1 team to start';
    }
    return `Register ${5 - gameState.registeredTeams} More Team${5 - gameState.registeredTeams > 1 ? 's' : ''} to Start`;
  }

  if (canStartWithBots && botsNeeded > 0) {
    return `Start with ${botsNeeded} Bot${botsNeeded > 1 ? 's' : ''} 🤖`;
  }

  return 'Start Game';
}

// Toggle fill with bots option
function toggleFillWithBots(checked) {
  gameState.fillWithBots = checked;
  saveState();
  render();
}

// Start game with bots filling empty slots
function startGameWithBots() {
  const registeredTeams = gameState.teams.filter(t => t.isRegistered);
  const emptySlots = 5 - registeredTeams.length;

  if (emptySlots > 0 && gameState.fillWithBots) {
    const usedNames = [];
    const usedStatements = [];

    // Create bots for empty slots
    gameState.teams.forEach((team, idx) => {
      if (!team.isRegistered) {
        const botName = generateBotName(usedNames);
        usedNames.push(botName);

        const problemStatement = getRandomBotProblemStatement(usedStatements);
        usedStatements.push(problemStatement);

        team.isRegistered = true;
        team.isBot = true;
        team.name = botName;
        team.problemStatement = problemStatement;
        gameState.registeredTeams++;
      }
    });

    gameState.botCount = emptySlots;
  }

  gameState.botsEnabled = gameState.botCount > 0;

  saveState();

  // Start the actual game (setup phase)
  startAuction();
}

// Start spectator mode - all 5 teams are bots
function startSpectatorMode() {
  const usedNames = [];
  const usedStatements = [];

  // Make all teams bots
  gameState.teams.forEach((team) => {
    const botName = generateBotName(usedNames);
    usedNames.push(botName);

    const problemStatement = getRandomBotProblemStatement(usedStatements);
    usedStatements.push(problemStatement);

    team.isRegistered = true;
    team.isBot = true;
    team.name = botName;
    team.problemStatement = problemStatement;
  });

  gameState.registeredTeams = 5;
  gameState.botCount = 5;
  gameState.botsEnabled = true;
  gameState.spectatorMode = true;

  showToast('Spectator Mode: Watch the bots compete!', 'info');

  saveState();
  startAuction();
}

// Render phase bar
function renderPhaseBar(activePhase) {
  const phases = [
    { id: 'registration', label: 'Register', icon: '📝' },
    { id: 'setup', label: 'Setup', icon: '🎴' },
    { id: 'auction', label: 'Auction', icon: '🔨' },
    { id: 'seed', label: 'Seed', icon: '🌱' },
    { id: 'early', label: 'Early', icon: '📈' },
    { id: 'secondary', label: 'Secondary', icon: '🔄' },
    { id: 'mature', label: 'Mature', icon: '🏢' },
    { id: 'exit', label: 'Exit', icon: '🚀' }
  ];

  const phaseOrder = ['registration', 'setup', 'auction', 'seed', 'early', 'secondary', 'mature', 'exit'];
  // Map setup-lock and setup-summary to setup for phase bar
  const normalizedPhase = activePhase.startsWith('setup') ? 'setup' : activePhase;
  const activeIndex = phaseOrder.indexOf(normalizedPhase);

  const spectatorBadge = isSpectatorMode() ? `
    <div class="spectator-indicator">
      <span class="eye-icon">👁️</span>
      <span>Spectator Mode</span>
    </div>
  ` : '';

  return `
    <div class="phase-bar-container">
      ${spectatorBadge}
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
      <button class="restart-btn" onclick="confirmRestart()" title="Restart Game">
        🔄 <span>Restart</span>
      </button>
    </div>
  `;
}

// Iteration 4: Get active category perks for a team
function getActivePerks(team) {
  const perks = [];
  const categories = ['Engineering', 'Product', 'Sales', 'Ops', 'Finance'];

  categories.forEach(cat => {
    if (team.employees.some(emp => emp.category === cat)) {
      const perk = categoryPerks[cat];
      perks.push({
        category: cat,
        ...perk
      });
    }
  });

  return perks;
}

// Render teams sidebar
function renderTeamsSidebar() {
  return `
    <aside class="teams-sidebar">
      <h3>Teams</h3>
      ${gameState.teams.map((team, index) => {
        const activePerks = getActivePerks(team);
        const salesCount = countEmployeesByCategory(team, 'Sales');

        return `
          <div class="sidebar-team ${team.isComplete ? 'complete' : ''} ${team.isDisqualified ? 'disqualified' : ''} ${team.isBot ? 'is-bot' : ''}"
               style="--team-color: ${team.color}"
               onclick="viewTeamDetails(${index})">
            <div class="sidebar-team-header">
              <span class="sidebar-team-icon" style="background: ${team.color}">${team.isBot ? '🤖' : team.name.charAt(0)}</span>
              <span class="sidebar-team-name">${team.name}</span>
            </div>
            ${team.lockedSegment && team.lockedIdea ? `
              <div class="sidebar-setup">
                <span class="sidebar-setup-item">${team.lockedSegment.icon} ${team.lockedSegment.name}</span>
                <span class="sidebar-setup-item">${team.lockedIdea.icon} ${team.lockedIdea.name}</span>
                ${team.setupBonus ? `
                  <span class="sidebar-bonus">+${team.setupBonus.bonus.modifier} ${team.setupBonus.bonus.category}</span>
                ` : ''}
              </div>
            ` : ''}
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
            ${activePerks.length > 0 ? `
              <div class="sidebar-perks">
                ${activePerks.map(perk => `
                  <span class="perk-badge ${perk.category.toLowerCase()}" title="${perk.description}">
                    ${perk.icon} ${perk.name}
                    ${perk.category === 'Sales' && salesCount >= 2 ? '<span class="perk-active">★</span>' : ''}
                  </span>
                `).join('')}
              </div>
            ` : ''}
            ${team.isComplete ? '<span class="sidebar-badge complete">Complete</span>' : ''}
            ${team.isDisqualified ? '<span class="sidebar-badge dq">DQ</span>' : ''}
            ${!team.isDisqualified ? `
              <div class="sidebar-wildcard ${team.wildcardUsed ? 'used' : 'ready'}">
                🃏 ${team.wildcardUsed ? 'Used' : 'Ready'}
              </div>
            ` : ''}
            ${team.marketLeaderCount > 0 ? `
              <div class="sidebar-market-leader">
                🚀 Leader <span class="leader-count">${team.marketLeaderCount}x</span>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
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

              ${categoryPerks[card.category] ? `
                <div class="category-perk-preview">
                  <span class="perk-icon">${categoryPerks[card.category].icon}</span>
                  <span class="perk-name">${categoryPerks[card.category].name}</span>
                  <span class="perk-desc">${categoryPerks[card.category].description}</span>
                </div>
              ` : ''}

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
                  <button class="bid-team-btn ${team.isComplete ? 'complete' : ''} ${gameState.currentBid.teamIndex === index ? 'leading' : ''} ${team.isBot ? 'is-bot' : ''}"
                          style="--team-color: ${team.color}"
                          onclick="openBidModal(${index})"
                          ${team.isComplete || team.esopRemaining <= gameState.currentBid.amount ? 'disabled' : ''}>
                    <span class="btn-team-name">${team.isBot ? '🤖 ' : ''}${team.name}</span>
                    <span class="btn-team-esop">${team.esopRemaining.toFixed(1)}%</span>
                    ${team.isComplete ? '<span class="btn-badge">Full</span>' : ''}
                  </button>
                `).join('')}
              </div>

              <div class="auction-actions">
                <button class="action-btn primary" onclick="endBidding()">
                  ${gameState.currentBid.teamIndex !== null ? 'End Bidding & Award' : 'End Bidding (No Hire)'}
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
                <p>Draw a market condition card to see how the market affects your team</p>
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

              ${renderMarketLeadersAnnouncement()}

              ${renderRoundPerformance()}

              <div class="leaderboard-section">
                <h3>Overall Standings</h3>
                <div class="leaderboard">
                  ${sortedTeams.map((team, idx) => `
                    <div class="lb-entry ${idx === 0 ? 'leader' : ''} ${team.isMarketLeader ? 'market-leader' : ''}" style="--team-color: ${team.color}">
                      <span class="lb-rank">${idx + 1}</span>
                      <span class="lb-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                      <span class="lb-name">${team.name}</span>
                      <span class="lb-value">${formatCurrency(team.valuation)}</span>
                      ${team.isMarketLeader ? '<span class="lb-market-leader">🚀</span>' : ''}
                      ${team.wildcardEffect === 'doubled' ? '<span class="lb-wildcard doubled">⚡2x</span>' : ''}
                      ${team.wildcardEffect === 'shielded' ? '<span class="lb-wildcard shielded">🛡️</span>' : ''}
                      ${team.salesSynergyActive ? '<span class="lb-perk sales">🤝+5%</span>' : ''}
                      ${team.financeShieldActive ? '<span class="lb-perk finance">🛡️-25%loss</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>

              ${renderWildcardSection()}

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
                    <button class="bid-team-btn ${hasHired ? 'complete' : ''} ${team.isBot ? 'is-bot' : ''}"
                            style="--team-color: ${team.color}"
                            onclick="openBidModal(${index})"
                            ${!canBid || team.esopRemaining <= gameState.currentBid.amount ? 'disabled' : ''}>
                      <span class="btn-team-name">${team.isBot ? '🤖 ' : ''}${team.name}</span>
                      <span class="btn-team-esop">${team.esopRemaining.toFixed(1)}%</span>
                      ${hasHired ? '<span class="btn-badge">Hired</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>

              <button class="action-btn primary" onclick="endSecondaryBidding()">
                ${gameState.currentBid.teamIndex !== null ? 'End Bidding & Award' : 'Skip This Candidate'}
              </button>
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

// Render exit phase - each team picks their own exit
function renderExit(app) {
  const sortedTeams = [...gameState.teams]
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  const allChosen = gameState.teams.every(t => t.isDisqualified || t.exitChoice);

  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('exit')}

      <main class="exit-main">
        <div class="exit-header">
          <h1>Exit Round</h1>
          <p>Each team chooses their exit strategy. Higher multipliers mean bigger rewards!</p>
        </div>

        <div class="exit-options-info">
          <h3>Available Exit Strategies</h3>
          <div class="exit-options-grid">
            ${exitCards.map(exit => `
              <div class="exit-option-card">
                <div class="exit-option-name">${exit.name}</div>
                <div class="exit-option-multiplier">${exit.multiplier}x</div>
                <p class="exit-option-desc">${exit.description}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="exit-teams-section">
          <h3>Team Exit Choices</h3>
          <div class="exit-teams-grid">
            ${gameState.teams.map((team, idx) => {
              if (team.isDisqualified) return '';

              if (team.exitChoice) {
                return `
                  <div class="exit-team-card chosen" style="--team-color: ${team.color}">
                    <div class="exit-team-header">
                      <span class="exit-team-icon" style="background: ${team.color}">${team.isBot ? '🤖' : team.name.charAt(0)}</span>
                      <span class="exit-team-name">${team.name}</span>
                    </div>
                    <div class="exit-team-choice">
                      <div class="chosen-exit">${team.exitChoice.name}</div>
                      <div class="chosen-multiplier">${team.exitChoice.multiplier}x</div>
                    </div>
                    <div class="exit-team-valuation">
                      <span class="pre-exit">${formatCurrency(team.preExitValuation)}</span>
                      <span class="arrow">→</span>
                      <span class="post-exit">${formatCurrency(team.valuation)}</span>
                    </div>
                  </div>
                `;
              }

              // Team hasn't chosen yet
              return `
                <div class="exit-team-card pending" style="--team-color: ${team.color}">
                  <div class="exit-team-header">
                    <span class="exit-team-icon" style="background: ${team.color}">${team.isBot ? '🤖' : team.name.charAt(0)}</span>
                    <span class="exit-team-name">${team.name}</span>
                  </div>
                  <div class="exit-team-current">
                    Current: ${formatCurrency(team.valuation)}
                  </div>
                  ${team.isBot ? `
                    <div class="exit-team-waiting">🤖 Deciding...</div>
                  ` : `
                    <div class="exit-buttons">
                      ${exitCards.map(exit => `
                        <button class="exit-btn" onclick="chooseExit(${idx}, ${exit.id})">
                          ${exit.name} (${exit.multiplier}x)
                        </button>
                      `).join('')}
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${allChosen ? `
          <div class="final-standings">
            <h3>Final Valuations</h3>
            <div class="standings-list final">
              ${sortedTeams.map((team, idx) => `
                <div class="standing-entry ${idx === 0 ? 'winner' : ''}" style="--team-color: ${team.color}">
                  <span class="standing-rank">#${idx + 1}</span>
                  <span class="standing-icon" style="background: ${team.color}">${team.isBot ? '🤖' : team.name.charAt(0)}</span>
                  <span class="standing-name">${team.name}</span>
                  <span class="standing-exit">${team.exitChoice?.name || ''}</span>
                  <span class="standing-value">${formatCurrency(team.valuation)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <button class="action-btn primary large" onclick="declareWinner()">
            Declare Winner
          </button>
        ` : `
          <div class="waiting-message">
            <p>Waiting for all teams to choose their exit strategy...</p>
          </div>
        `}
      </main>
    </div>
  `;
}

// Iteration 3: Render setup drafting phase
function renderSetupPhase(app) {
  const currentTeam = gameState.teams[gameState.setupDraftTurn];
  const isDropPhase = gameState.setupPhase === 'drop';

  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('setup')}

      <main class="setup-main">
        <div class="setup-header">
          <div class="setup-icon">🎴</div>
          <h1>Company Setup</h1>
          <p>Round ${gameState.setupRound + 1} of 3 - Draft your market segment and idea</p>
        </div>

        <div class="setup-turn-indicator">
          <span class="turn-team" style="color: ${currentTeam.color}">
            ${currentTeam.name}'s Turn
          </span>
          <span class="turn-action">
            ${isDropPhase ? '📤 Drop 1 card' : '📥 Draw 1 card (or pass)'}
          </span>
        </div>

        <div class="setup-hand">
          <h3>Your Hand (${currentTeam.setupHand.length} cards)</h3>
          <div class="hand-cards">
            ${currentTeam.setupHand.map(card => {
              const isSegment = !card.type;
              const cardType = isSegment ? 'segment' : card.type;
              return `
                <div class="setup-card ${cardType}">
                  <div class="setup-card-icon">${card.icon}</div>
                  <div class="setup-card-name">${card.name}</div>
                  <div class="setup-card-type">${isSegment ? 'SEGMENT' : card.type.toUpperCase()}</div>
                  <div class="setup-card-desc">${card.description}</div>
                  ${isDropPhase ? `
                    <button class="drop-card-btn" onclick="dropSetupCard(${gameState.setupDraftTurn}, ${card.id}, ${isSegment})">
                      Drop
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${!isDropPhase ? `
          <div class="setup-decks">
            <h3>Draw From</h3>
            <div class="deck-options">
              <button class="deck-btn segment"
                      onclick="drawSetupCard(${gameState.setupDraftTurn}, 'segment')"
                      ${gameState.segmentDeck.length === 0 ? 'disabled' : ''}>
                <span class="deck-icon">🏢</span>
                <span class="deck-label">Segments</span>
                <span class="deck-count">${gameState.segmentDeck.length} left</span>
              </button>
              <button class="deck-btn idea"
                      onclick="drawSetupCard(${gameState.setupDraftTurn}, 'idea')"
                      ${gameState.ideaDeck.length === 0 ? 'disabled' : ''}>
                <span class="deck-icon">💡</span>
                <span class="deck-label">Ideas</span>
                <span class="deck-count">${gameState.ideaDeck.length} left</span>
              </button>
              <button class="deck-btn pass" onclick="skipSetupDraw(${gameState.setupDraftTurn})">
                <span class="deck-icon">⏭️</span>
                <span class="deck-label">Pass</span>
                <span class="deck-count">Skip drawing</span>
              </button>
            </div>
          </div>
        ` : ''}

        <div class="other-teams-status">
          <h4>Other Teams</h4>
          <div class="teams-status-row">
            ${gameState.teams.map((team, idx) => {
              if (idx === gameState.setupDraftTurn) return '';
              const segments = team.setupHand.filter(c => !c.type).length;
              const ideas = team.setupHand.filter(c => c.type).length;
              return `
                <div class="team-status-badge" style="--team-color: ${team.color}">
                  <span class="team-status-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                  <span class="team-status-name">${team.name}</span>
                  <span class="team-status-cards">${segments}S / ${ideas}I</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
}

// Iteration 3: Render setup lock phase
function renderSetupLock(app) {
  const lockedCount = gameState.teams.filter(t => t.lockedSegment && t.lockedIdea).length;

  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('setup')}

      <main class="setup-lock-main">
        <div class="setup-header">
          <div class="setup-icon">🔒</div>
          <h1>Lock Your Company Setup</h1>
          <p>Each team: Select 1 Segment + 1 Idea (Product or Service)</p>
        </div>

        <div class="lock-teams-grid">
          ${gameState.teams.map((team, idx) => {
            const isLocked = team.lockedSegment && team.lockedIdea;
            const segments = team.setupHand.filter(c => !c.type);
            const ideas = team.setupHand.filter(c => c.type);

            return `
              <div class="lock-card ${isLocked ? 'locked' : ''}" style="--team-color: ${team.color}">
                <div class="lock-card-header">
                  <span class="team-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                  <span class="team-name">${team.name}</span>
                  ${isLocked ? '<span class="locked-badge">✓ Locked</span>' : ''}
                </div>

                ${isLocked ? `
                  <div class="locked-selections">
                    <div class="locked-item segment">
                      <span class="locked-item-icon">${team.lockedSegment.icon}</span>
                      <span>${team.lockedSegment.name}</span>
                    </div>
                    <span class="locked-x">×</span>
                    <div class="locked-item idea">
                      <span class="locked-item-icon">${team.lockedIdea.icon}</span>
                      <span>${team.lockedIdea.name}</span>
                    </div>
                  </div>
                  ${team.setupBonus ? `
                    <div class="bonus-display">
                      🎯 ${team.setupBonus.bonus.category} +${team.setupBonus.bonus.modifier}
                      <p class="bonus-desc">${team.setupBonus.description}</p>
                    </div>
                  ` : `
                    <div class="no-bonus">No combo bonus</div>
                  `}
                ` : `
                  <div class="selection-section">
                    <h4>Select Segment</h4>
                    <div class="selection-options" id="segments-${idx}">
                      ${segments.map((s, i) => `
                        <label class="selection-option ${i === 0 ? 'selected' : ''}">
                          <input type="radio" name="segment-${idx}" value="${s.id}" ${i === 0 ? 'checked' : ''}
                                 onchange="updateSetupPreview(${idx})">
                          <span class="option-icon">${s.icon}</span>
                          <span class="option-name">${s.name}</span>
                        </label>
                      `).join('')}
                      ${segments.length === 0 ? '<div class="no-cards">No segments!</div>' : ''}
                    </div>
                  </div>

                  <div class="selection-section">
                    <h4>Select Idea</h4>
                    <div class="selection-options" id="ideas-${idx}">
                      ${ideas.map((i, index) => `
                        <label class="selection-option ${index === 0 ? 'selected' : ''}">
                          <input type="radio" name="idea-${idx}" value="${i.id}" ${index === 0 ? 'checked' : ''}
                                 onchange="updateSetupPreview(${idx})">
                          <span class="option-icon">${i.icon}</span>
                          <span class="option-name">${i.name}</span>
                          <span class="option-type">${i.type}</span>
                        </label>
                      `).join('')}
                      ${ideas.length === 0 ? '<div class="no-cards">No ideas!</div>' : ''}
                    </div>
                  </div>

                  <div class="bonus-preview" id="preview-${idx}">
                    ${getPreviewBonus(segments[0], ideas[0])}
                  </div>

                  <button class="lock-btn"
                          onclick="lockFromUI(${idx})"
                          ${segments.length === 0 || ideas.length === 0 ? 'disabled' : ''}>
                    Lock Selections
                  </button>
                `}
              </div>
            `;
          }).join('')}
        </div>

        <div class="lock-progress">
          <div class="progress-text">Teams Locked: ${lockedCount}/5</div>
        </div>
      </main>
    </div>
  `;
}

// Iteration 3: Helper to get preview bonus HTML
function getPreviewBonus(segment, idea) {
  if (!segment || !idea) return '<div class="no-bonus-preview">Select both to see bonus</div>';
  const bonus = getSetupBonus(segment.name, idea.name);
  if (bonus) {
    return `
      <div class="has-bonus">
        🎯 Bonus: ${bonus.bonus.category} +${bonus.bonus.modifier}
        <p class="bonus-desc">${bonus.description}</p>
      </div>
    `;
  }
  return '<div class="no-bonus-preview">No combo bonus for this selection</div>';
}

// Iteration 3: Update preview when selection changes
function updateSetupPreview(teamIndex) {
  const team = gameState.teams[teamIndex];
  const segments = team.setupHand.filter(c => !c.type);
  const ideas = team.setupHand.filter(c => c.type);

  const segmentRadio = document.querySelector(`input[name="segment-${teamIndex}"]:checked`);
  const ideaRadio = document.querySelector(`input[name="idea-${teamIndex}"]:checked`);

  const selectedSegment = segmentRadio ? segments.find(s => s.id === parseInt(segmentRadio.value)) : null;
  const selectedIdea = ideaRadio ? ideas.find(i => i.id === parseInt(ideaRadio.value)) : null;

  const previewEl = document.getElementById(`preview-${teamIndex}`);
  if (previewEl) {
    previewEl.innerHTML = getPreviewBonus(selectedSegment, selectedIdea);
  }

  // Update selected class on options
  document.querySelectorAll(`#segments-${teamIndex} .selection-option`).forEach(opt => {
    const radio = opt.querySelector('input');
    opt.classList.toggle('selected', radio.checked);
  });
  document.querySelectorAll(`#ideas-${teamIndex} .selection-option`).forEach(opt => {
    const radio = opt.querySelector('input');
    opt.classList.toggle('selected', radio.checked);
  });
}

// Iteration 3: Lock from UI
function lockFromUI(teamIndex) {
  const segmentRadio = document.querySelector(`input[name="segment-${teamIndex}"]:checked`);
  const ideaRadio = document.querySelector(`input[name="idea-${teamIndex}"]:checked`);

  if (!segmentRadio || !ideaRadio) {
    showToast('Please select both a segment and an idea!', 'error');
    return;
  }

  lockSetupCards(teamIndex, parseInt(segmentRadio.value), parseInt(ideaRadio.value));
}

// Iteration 3: Render setup summary
function renderSetupSummary(app) {
  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('setup')}

      <main class="setup-summary-main">
        <div class="setup-header">
          <div class="setup-icon">✅</div>
          <h1>Company Setup Complete</h1>
          <p>All teams have defined their market focus</p>
        </div>

        <div class="setup-summary-grid">
          ${gameState.teams.map(team => `
            <div class="setup-summary-card" style="--team-color: ${team.color}">
              <div class="summary-card-header">
                <span class="team-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                <div class="team-info">
                  <h3>${team.name}</h3>
                  <p class="problem-statement">${team.problemStatement}</p>
                </div>
              </div>

              <div class="company-setup">
                <div class="setup-item segment">
                  <span class="setup-item-icon">${team.lockedSegment.icon}</span>
                  <div class="setup-item-info">
                    <span class="setup-item-name">${team.lockedSegment.name}</span>
                    <span class="setup-item-type">Market Segment</span>
                  </div>
                </div>
                <div class="setup-item idea">
                  <span class="setup-item-icon">${team.lockedIdea.icon}</span>
                  <div class="setup-item-info">
                    <span class="setup-item-name">${team.lockedIdea.name}</span>
                    <span class="setup-item-type">${team.lockedIdea.type}</span>
                  </div>
                </div>
              </div>

              ${team.setupBonus ? `
                <div class="bonus-badge">
                  🎯 ${team.setupBonus.bonus.category} +${team.setupBonus.bonus.modifier}
                </div>
              ` : `
                <div class="no-bonus-badge">No combo bonus</div>
              `}
            </div>
          `).join('')}
        </div>

        <div class="setup-summary-actions">
          <button class="action-btn primary large" onclick="startAuctionFromSetup()">
            Start Talent Auction
          </button>
        </div>
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
                ${team.marketLeaderCount > 0 ? `<span class="rank-leader">🚀${team.marketLeaderCount}</span>` : ''}
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

      <div class="market-leader-stats">
        <h3>🚀 Market Leader Awards</h3>
        <div class="leader-stats-grid">
          ${sortedTeams
            .filter(t => t.marketLeaderCount > 0)
            .sort((a, b) => b.marketLeaderCount - a.marketLeaderCount)
            .map(team => `
              <div class="leader-stat-card" style="--team-color: ${team.color}">
                <span class="leader-stat-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                <span class="leader-stat-name">${team.name}</span>
                <span class="leader-stat-count">${team.marketLeaderCount}x</span>
              </div>
            `).join('') || '<p class="no-leaders">No market leaders this game</p>'}
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
