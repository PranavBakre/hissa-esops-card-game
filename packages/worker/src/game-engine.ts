// ===========================================
// ESOP Wars v2 - Game Engine (Pure Functions)
// ===========================================

import type {
  GameState,
  Team,
  GameConfig,
  Phase,
  EmployeeCard,
  SegmentCard,
  IdeaCard,
  WildcardChoice,
  MarketCard,
} from '@esop-wars/shared';
import { GAME } from '@esop-wars/shared';
import {
  employeeCards,
  reserveEmployees,
  marketCards,
  segmentCards,
  productCards,
  serviceCards,
  exitCards,
  getSetupBonus,
  categoryPerks,
} from './data';

// ===========================================
// Utilities
// ===========================================

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function isSegmentCard(card: SegmentCard | IdeaCard): card is SegmentCard {
  return !('type' in card);
}

function isIdeaCard(card: SegmentCard | IdeaCard): card is IdeaCard {
  return 'type' in card;
}

// ===========================================
// State Creation
// ===========================================

export function createInitialState(config: GameConfig): GameState {
  const teams: Team[] = config.teams.map((tc) => ({
    name: tc.name,
    color: tc.color,
    problemStatement: '',
    esopRemaining: config.initialEsop,
    valuation: config.initialValuation,
    employees: [],
    isComplete: false,
    isDisqualified: false,
    isBot: tc.isBot,
    playerId: tc.playerId,

    lockedSegment: null,
    lockedIdea: null,
    setupBonus: null,
    setupHand: [],

    wildcardUsed: false,
    wildcardActiveThisRound: null,

    previousValuation: config.initialValuation,
    currentGain: 0,
    isMarketLeader: false,
    marketLeaderCount: 0,
  }));

  // Shuffle decks
  const shuffledEmployees = shuffleArray(employeeCards);
  const shuffledMarket = shuffleArray(marketCards);
  const shuffledSegments = shuffleArray(segmentCards);
  const shuffledIdeas = shuffleArray([...productCards, ...serviceCards]);

  return {
    phase: 'registration',
    teams,
    currentTurn: 0,

    employeeDeck: shuffledEmployees,
    marketDeck: shuffledMarket,
    segmentDeck: shuffledSegments,
    ideaDeck: shuffledIdeas,

    currentCardIndex: 0,
    currentBid: null,
    reserveEmployees: [...reserveEmployees],

    setupRound: 0,
    setupPhase: 'drop',
    setupDraftTurn: 0,
    setupDiscard: [],

    wildcardPhase: false,
    teamWildcardSelections: {},

    currentMarketCard: null,
    usedMarketCards: [],
    roundPerformance: [],

    droppedEmployees: [],
    secondaryPool: [],

    exitCard: null,
  };
}

// ===========================================
// Registration
// ===========================================

export function registerTeam(
  state: GameState,
  teamIndex: number,
  name: string,
  problemStatement: string
): GameState {
  const newState = deepClone(state);
  newState.teams[teamIndex].name = name;
  newState.teams[teamIndex].problemStatement = problemStatement;
  return newState;
}

// ===========================================
// Phase Management
// ===========================================

export function isPhaseComplete(state: GameState): boolean {
  switch (state.phase) {
    case 'registration':
      // All teams must have non-default names (registered)
      return state.teams.every((t, i) => {
        const defaultName = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'][i];
        return t.name !== defaultName;
      });

    case 'setup':
      return state.setupRound >= GAME.SETUP_ROUNDS;

    case 'setup-lock':
      return state.teams.every((t) => t.lockedSegment !== null && t.lockedIdea !== null);

    case 'setup-summary':
      return true; // Manual advance

    case 'auction':
      return state.teams.every((t) => t.employees.length >= GAME.EMPLOYEES_PER_TEAM);

    case 'auction-summary':
      return true; // Manual advance

    case 'seed':
    case 'early':
    case 'mature':
      return state.currentMarketCard !== null; // Market card drawn

    case 'secondary-drop':
      return state.droppedEmployees.length >= state.teams.filter((t) => !t.isDisqualified).length;

    case 'secondary-hire':
      return state.secondaryPool.length === 0;

    case 'exit':
      return state.exitCard !== null;

    case 'winner':
      return false; // End state

    default:
      return false;
  }
}

export function advancePhase(state: GameState): GameState {
  const newState = deepClone(state);
  const phaseOrder: Phase[] = [
    'registration',
    'setup',
    'setup-lock',
    'setup-summary',
    'auction',
    'auction-summary',
    'seed',
    'early',
    'secondary-drop',
    'secondary-hire',
    'mature',
    'exit',
    'winner',
  ];

  const currentIndex = phaseOrder.indexOf(state.phase);
  if (currentIndex < phaseOrder.length - 1) {
    newState.phase = phaseOrder[currentIndex + 1];

    // Phase-specific initialization
    switch (newState.phase) {
      case 'setup':
        return initSetupPhase(newState);
      case 'auction':
        newState.currentCardIndex = 0;
        newState.currentBid = null;
        break;
      case 'seed':
      case 'early':
      case 'mature':
        newState.currentMarketCard = null;
        newState.wildcardPhase = true;
        newState.teamWildcardSelections = {};
        break;
      case 'secondary-drop':
        newState.droppedEmployees = [];
        break;
      case 'secondary-hire':
        // Pool is populated during drop phase
        break;
    }
  }

  return newState;
}

// ===========================================
// Setup Phase
// ===========================================

function initSetupPhase(state: GameState): GameState {
  const newState = deepClone(state);

  // Deal initial hands (5 cards each: 1 segment, 4 ideas)
  // Players will drop/draw to finalize, then pick 1 segment + 1 idea to lock
  newState.teams.forEach((team, idx) => {
    const segment = newState.segmentDeck[idx];
    const ideas = [
      newState.ideaDeck[idx * 4],
      newState.ideaDeck[idx * 4 + 1],
      newState.ideaDeck[idx * 4 + 2],
      newState.ideaDeck[idx * 4 + 3],
    ].filter(Boolean);
    team.setupHand = segment ? [segment, ...ideas] : [...ideas];
  });

  // Remove dealt cards from decks
  newState.segmentDeck = newState.segmentDeck.slice(newState.teams.length);
  newState.ideaDeck = newState.ideaDeck.slice(newState.teams.length * 4);

  newState.setupRound = 0;
  newState.setupPhase = 'drop';
  newState.setupDraftTurn = 0;

  return newState;
}

export function dropCard(
  state: GameState,
  teamIndex: number,
  cardId: number,
  isSegment: boolean
): GameState {
  const newState = deepClone(state);
  const team = newState.teams[teamIndex];

  // Find and remove card from hand
  const cardIndex = team.setupHand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return state; // Card not found
  }

  const [droppedCard] = team.setupHand.splice(cardIndex, 1);
  newState.setupDiscard.push(droppedCard);

  // Move to draw phase
  newState.setupPhase = 'draw';

  return newState;
}

export function drawCard(
  state: GameState,
  teamIndex: number,
  deckType: 'segment' | 'idea'
): GameState {
  const newState = deepClone(state);
  const team = newState.teams[teamIndex];

  const deck = deckType === 'segment' ? newState.segmentDeck : newState.ideaDeck;

  if (deck.length === 0) {
    return state; // No cards to draw
  }

  const drawnCard = deck.shift();
  if (drawnCard) {
    team.setupHand.push(drawnCard);
  }

  // Advance to next turn
  return advanceSetupTurn(newState);
}

export function skipDraw(state: GameState, teamIndex: number): GameState {
  const newState = deepClone(state);
  return advanceSetupTurn(newState);
}

function advanceSetupTurn(state: GameState): GameState {
  const newState = deepClone(state);
  const activeTeamCount = newState.teams.filter((t) => !t.isDisqualified).length;

  // Move to next team
  newState.setupDraftTurn = (newState.setupDraftTurn + 1) % activeTeamCount;

  // If we've gone through all teams, check if round is complete
  if (newState.setupDraftTurn === 0) {
    newState.setupRound++;

    // Check if all setup rounds are complete (rounds 0, 1, 2 = 3 rounds)
    if (newState.setupRound >= GAME.SETUP_ROUNDS) {
      // Move to setup-lock phase
      newState.phase = 'setup-lock';
      return newState;
    }
  }

  // Reset to drop phase for next turn
  newState.setupPhase = 'drop';

  return newState;
}

export function lockSetup(
  state: GameState,
  teamIndex: number,
  segmentId: number,
  ideaId: number
): GameState {
  const newState = deepClone(state);
  const team = newState.teams[teamIndex];

  // Find segment and idea in hand
  const segmentCard = team.setupHand.find((c) => c.id === segmentId && isSegmentCard(c));
  const ideaCard = team.setupHand.find((c) => c.id === ideaId && isIdeaCard(c));

  if (!segmentCard || !ideaCard || !isSegmentCard(segmentCard) || !isIdeaCard(ideaCard)) {
    return state; // Cards not found
  }

  // Lock the selections
  team.lockedSegment = segmentCard;
  team.lockedIdea = ideaCard;

  // Find matching bonus
  team.setupBonus = getSetupBonus(segmentCard.name, ideaCard.name);

  // Clear setup hand
  team.setupHand = [];

  return newState;
}

// ===========================================
// Auction Phase
// ===========================================

export function placeBid(
  state: GameState,
  teamIndex: number,
  amount: number
): GameState {
  const newState = deepClone(state);
  const team = newState.teams[teamIndex];

  // Validate bid
  if (amount > team.esopRemaining) {
    return state; // Not enough ESOP
  }

  if (newState.currentBid && amount <= newState.currentBid.amount) {
    return state; // Bid must be higher
  }

  newState.currentBid = { teamIndex, amount };

  return newState;
}

export function closeBidding(state: GameState): GameState {
  const newState = deepClone(state);
  const currentCard = newState.employeeDeck[newState.currentCardIndex];

  if (!currentCard) {
    return state;
  }

  if (newState.currentBid) {
    const winningTeam = newState.teams[newState.currentBid.teamIndex];

    // Award card to winner
    const hiredEmployee = {
      ...currentCard,
      bidAmount: newState.currentBid.amount,
    };
    winningTeam.employees.push(hiredEmployee);
    winningTeam.esopRemaining -= newState.currentBid.amount;

    // Check if team is complete
    if (winningTeam.employees.length >= GAME.EMPLOYEES_PER_TEAM) {
      winningTeam.isComplete = true;
    }
  }

  // Move to next card
  newState.currentCardIndex++;
  newState.currentBid = null;

  // Check if auction is complete
  const allComplete = newState.teams.every(
    (t) => t.employees.length >= GAME.EMPLOYEES_PER_TEAM
  );

  if (allComplete || newState.currentCardIndex >= newState.employeeDeck.length) {
    // Apply $1M penalty per missing employee (V1 behavior - no disqualification)
    newState.teams.forEach((team) => {
      const missingEmployees = GAME.EMPLOYEES_PER_TEAM - team.employees.length;
      if (missingEmployees > 0) {
        const penalty = missingEmployees * 1_000_000;
        team.valuation = Math.max(0, team.valuation - penalty);
      }
    });
    newState.phase = 'auction-summary';
  }

  return newState;
}

export function skipCard(state: GameState): GameState {
  const newState = deepClone(state);

  // Move to next card without awarding
  newState.currentCardIndex++;
  newState.currentBid = null;

  // Check if auction is complete
  if (newState.currentCardIndex >= newState.employeeDeck.length) {
    // Apply $1M penalty per missing employee (V1 behavior - no disqualification)
    newState.teams.forEach((team) => {
      const missingEmployees = GAME.EMPLOYEES_PER_TEAM - team.employees.length;
      if (missingEmployees > 0) {
        const penalty = missingEmployees * 1_000_000;
        team.valuation = Math.max(0, team.valuation - penalty);
      }
    });
    newState.phase = 'auction-summary';
  }

  return newState;
}

// ===========================================
// Query Functions
// ===========================================

export function canTeamAct(state: GameState, teamIndex: number): boolean {
  const team = state.teams[teamIndex];
  if (team.isDisqualified) return false;

  switch (state.phase) {
    case 'setup':
      return state.setupDraftTurn === teamIndex;
    case 'auction':
      return team.employees.length < GAME.EMPLOYEES_PER_TEAM && team.esopRemaining > 0;
    default:
      return true;
  }
}

export function getCurrentCard(state: GameState): EmployeeCard | null {
  if (state.phase !== 'auction' && state.phase !== 'secondary-hire') {
    return null;
  }
  return state.employeeDeck[state.currentCardIndex] ?? null;
}

export function getActiveTeams(state: GameState): Team[] {
  return state.teams.filter((t) => !t.isDisqualified);
}

export function getWinners(state: GameState): { founder: Team; employer: Team; sameTeam: boolean } | null {
  if (state.phase !== 'winner') return null;

  const activeTeams = getActiveTeams(state);
  if (activeTeams.length === 0) return null;

  // Best Founder: Highest valuation
  const founder = activeTeams.reduce((best, team) =>
    team.valuation > best.valuation ? team : best
  );

  // Best Employer: Highest total ESOP given to employees
  const employer = activeTeams.reduce((best, team) => {
    const teamValue = team.employees.reduce((sum, e) => sum + e.bidAmount, 0);
    const bestValue = best.employees.reduce((sum, e) => sum + e.bidAmount, 0);
    return teamValue > bestValue ? team : best;
  });

  return {
    founder,
    employer,
    sameTeam: founder.name === employer.name,
  };
}

// ===========================================
// Wildcard Phase
// ===========================================

export function selectWildcard(
  state: GameState,
  teamIndex: number,
  choice: WildcardChoice
): GameState {
  const newState = deepClone(state);
  const team = newState.teams[teamIndex];

  // Can't use wildcard if already used
  if (team.wildcardUsed && choice !== 'pass') {
    newState.teamWildcardSelections[teamIndex] = 'pass';
  } else {
    newState.teamWildcardSelections[teamIndex] = choice;
  }

  return newState;
}

export function allWildcardsSelected(state: GameState): boolean {
  const activeTeams = state.teams.filter((t) => !t.isDisqualified);
  return activeTeams.every((_, i) => state.teamWildcardSelections[i] !== undefined);
}

export function applyWildcards(state: GameState): GameState {
  const newState = deepClone(state);

  // Apply wildcard choices
  newState.teams.forEach((team, index) => {
    if (team.isDisqualified) return;

    const choice = newState.teamWildcardSelections[index];
    if (choice && choice !== 'pass') {
      team.wildcardUsed = true;
      team.wildcardActiveThisRound = choice;
    } else {
      team.wildcardActiveThisRound = null;
    }
  });

  // Clear selections and exit wildcard phase
  newState.wildcardPhase = false;

  return newState;
}

// ===========================================
// Market Round
// ===========================================

export function drawMarketCard(state: GameState): GameState {
  const newState = deepClone(state);

  if (newState.marketDeck.length === 0) {
    return state; // No cards left
  }

  const card = newState.marketDeck.shift();
  if (card) {
    newState.currentMarketCard = card;
  }

  return newState;
}

export function applyMarketEffects(state: GameState): GameState {
  const newState = deepClone(state);
  const card = newState.currentMarketCard;

  if (!card) return state;

  // Store previous valuations and calculate new ones
  newState.roundPerformance = [];

  newState.teams.forEach((team, index) => {
    if (team.isDisqualified) return;

    const previousValuation = team.valuation;
    team.previousValuation = previousValuation;

    // Calculate base change from employees
    let totalChange = 0;

    team.employees.forEach((employee) => {
      // Hard skill contribution
      const hardSkillMod = card.hardSkillModifiers[employee.category] ?? 0;
      totalChange += employee.hardSkill * hardSkillMod;

      // Soft skill contribution
      Object.entries(employee.softSkills).forEach(([skillName, skillValue]) => {
        const softSkillMod = card.softSkillModifiers[skillName] ?? 0;
        totalChange += skillValue * softSkillMod;
      });
    });

    // Apply setup bonus if relevant
    if (team.setupBonus) {
      const bonusCategory = team.setupBonus.bonus.category;
      const hasMatchingEmployee = team.employees.some((e) => e.category === bonusCategory);
      if (hasMatchingEmployee) {
        totalChange += team.setupBonus.bonus.modifier;
      }
    }

    // Apply category perks
    const categoryCount: Record<string, number> = {};
    team.employees.forEach((e) => {
      categoryCount[e.category] = (categoryCount[e.category] ?? 0) + 1;
    });

    // Sales synergy: +5% with 2+ Sales
    if ((categoryCount['Sales'] ?? 0) >= 2) {
      totalChange += 0.05;
    }

    // Finance crash shield: 25% loss reduction during Market Crash
    if (card.name === 'Market Crash' && (categoryCount['Finance'] ?? 0) > 0) {
      if (totalChange < 0) {
        totalChange *= 0.75;
      }
    }

    // Engineering scaling bonus during Rapid Scaling
    if (card.name === 'Rapid Scaling' && (categoryCount['Engineering'] ?? 0) > 0) {
      totalChange += 0.05 * (categoryCount['Engineering'] ?? 0);
    }

    // Apply wildcard effects
    if (team.wildcardActiveThisRound === 'double-down') {
      totalChange *= 2;
    } else if (team.wildcardActiveThisRound === 'shield' && totalChange < 0) {
      totalChange = 0;
    }

    // Calculate new valuation
    const valuationChange = previousValuation * totalChange;
    const newValuation = Math.max(0, previousValuation + valuationChange);

    team.valuation = Math.round(newValuation);
    team.currentGain = Math.round(valuationChange);

    // Record performance
    newState.roundPerformance.push({
      teamIndex: index,
      previousValuation,
      newValuation: team.valuation,
      gain: team.currentGain,
      percentChange: totalChange * 100,
    });
  });

  // Move card to used pile
  newState.usedMarketCards.push(card);
  newState.currentMarketCard = null;

  // Clear wildcard active status
  newState.teams.forEach((team) => {
    team.wildcardActiveThisRound = null;
  });

  return newState;
}

export function applyMarketLeaderBonus(state: GameState): GameState {
  const newState = deepClone(state);

  // Reset leader status
  newState.teams.forEach((team) => {
    team.isMarketLeader = false;
  });

  // Find top 2 teams by valuation
  const activeTeams = newState.teams
    .map((t, i) => ({ team: t, index: i }))
    .filter(({ team }) => !team.isDisqualified)
    .sort((a, b) => b.team.valuation - a.team.valuation);

  // Top 2 get market leader status and bonus
  const leaderBonus = 0.05; // 5% bonus
  activeTeams.slice(0, 2).forEach(({ team }) => {
    team.isMarketLeader = true;
    team.marketLeaderCount++;
    team.valuation = Math.round(team.valuation * (1 + leaderBonus));
  });

  return newState;
}

// ===========================================
// Secondary Auction
// ===========================================

export function dropEmployee(
  state: GameState,
  teamIndex: number,
  employeeId: number
): GameState {
  const newState = deepClone(state);
  const team = newState.teams[teamIndex];

  // Find employee
  const empIndex = team.employees.findIndex((e) => e.id === employeeId);
  if (empIndex === -1) return state;

  // Remove from team and add to dropped list
  const [employee] = team.employees.splice(empIndex, 1);

  // Convert back to base EmployeeCard (remove bidAmount)
  const baseEmployee: EmployeeCard = {
    id: employee.id,
    name: employee.name,
    role: employee.role,
    category: employee.category,
    hardSkill: employee.hardSkill,
    softSkills: employee.softSkills,
  };

  newState.droppedEmployees.push({
    employee: baseEmployee,
    fromTeamIndex: teamIndex,
  });

  return newState;
}

export function allEmployeesDropped(state: GameState): boolean {
  const activeTeamCount = state.teams.filter((t) => !t.isDisqualified).length;
  return state.droppedEmployees.length >= activeTeamCount;
}

export function populateSecondaryPool(state: GameState): GameState {
  const newState = deepClone(state);

  // Add reserve employees to pool
  newState.secondaryPool = [
    ...newState.droppedEmployees.map((d) => d.employee),
    ...newState.reserveEmployees,
  ];

  // Shuffle the pool
  newState.secondaryPool = shuffleArray(newState.secondaryPool);

  // Reset for secondary hiring
  newState.currentCardIndex = 0;
  newState.currentBid = null;

  return newState;
}

export function getSecondaryCard(state: GameState): EmployeeCard | null {
  if (state.phase !== 'secondary-hire') return null;
  return state.secondaryPool[state.currentCardIndex] ?? null;
}

export function closeSecondaryBidding(state: GameState): GameState {
  const newState = deepClone(state);
  const currentCard = newState.secondaryPool[newState.currentCardIndex];

  if (!currentCard) return state;

  if (newState.currentBid) {
    const winningTeam = newState.teams[newState.currentBid.teamIndex];

    // Award card to winner
    const hiredEmployee = {
      ...currentCard,
      bidAmount: newState.currentBid.amount,
    };
    winningTeam.employees.push(hiredEmployee);
    winningTeam.esopRemaining -= newState.currentBid.amount;
  }

  // Move to next card
  newState.currentCardIndex++;
  newState.currentBid = null;

  // Check if secondary auction is complete
  if (newState.currentCardIndex >= newState.secondaryPool.length) {
    newState.secondaryPool = [];
  }

  return newState;
}

// ===========================================
// Exit Phase
// ===========================================

export function drawExitCard(state: GameState): GameState {
  const newState = deepClone(state);

  // Pick random exit card
  const randomIndex = Math.floor(Math.random() * exitCards.length);
  newState.exitCard = exitCards[randomIndex];

  return newState;
}

export function applyExitMultiplier(state: GameState): GameState {
  const newState = deepClone(state);

  if (!newState.exitCard) return state;

  // Apply multiplier to all active teams
  newState.teams.forEach((team) => {
    if (!team.isDisqualified && newState.exitCard) {
      team.valuation = Math.round(team.valuation * newState.exitCard.multiplier);
    }
  });

  // Move to winner phase
  newState.phase = 'winner';

  return newState;
}
