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
  Winners,
} from '@esop-wars/shared';
import { GAME, TEAM_DEFINITIONS } from '@esop-wars/shared';
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
// Employee Deck Scaling
// ===========================================

// Category distribution per team count (proportional selection from 18-card pool)
// Ensures balanced categories at every team count
const EMPLOYEE_DISTRIBUTION: Record<number, Record<string, number>> = {
  2: { Engineering: 2, Product: 2, Sales: 2, Ops: 1, Finance: 1 }, // 8 total
  3: { Engineering: 3, Product: 3, Sales: 2, Ops: 2, Finance: 2 }, // 12 total
  4: { Engineering: 4, Product: 4, Sales: 3, Ops: 3, Finance: 2 }, // 16 total
};

function buildEmployeeDeck(teamCount: number): EmployeeCard[] {
  // At 5 teams, use the full 18-card deck
  if (teamCount >= 5) {
    return shuffleArray([...employeeCards]);
  }

  const distribution = EMPLOYEE_DISTRIBUTION[teamCount];
  if (!distribution) {
    return shuffleArray([...employeeCards]);
  }

  // Group cards by category
  const byCategory: Record<string, EmployeeCard[]> = {};
  for (const card of employeeCards) {
    const cat = card.category;
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(card);
  }

  // Select proportionally from each category
  const selected: EmployeeCard[] = [];
  for (const [category, count] of Object.entries(distribution)) {
    const available = byCategory[category];
    if (available) {
      const shuffled = shuffleArray(available);
      selected.push(...shuffled.slice(0, count));
    }
  }

  return shuffleArray(selected);
}

// ===========================================
// Market Leader Count Scaling
// ===========================================

function getMarketLeaderCount(teamCount: number): number {
  return Math.max(1, Math.floor(teamCount / 2));
}

// ===========================================
// State Creation
// ===========================================

export function createInitialState(config: GameConfig): GameState {
  const teams: Team[] = config.teams.map((tc) => ({
    name: tc.name,
    color: tc.color,
    esopRemaining: config.initialEsop,
    capital: config.initialCapital,
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

    previousCapital: config.initialCapital,
    currentGain: 0,
    isMarketLeader: false,
    marketLeaderCount: 0,

    investedInTeamIndex: null,
    investmentAmount: 0,
    investorTeamIndex: null,
    capitalAtInvestment: 0,

    exitChoice: null,
    preExitCapital: 0,
  }));

  // Build scaled employee deck based on team count
  const scaledEmployeeDeck = buildEmployeeDeck(config.teams.length);
  const shuffledMarket = shuffleArray(marketCards);
  const shuffledSegments = shuffleArray(segmentCards);
  const shuffledIdeas = shuffleArray([...productCards, ...serviceCards]);

  return {
    phase: 'registration',
    teams,
    currentTurn: 0,

    employeeDeck: scaledEmployeeDeck,
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

    investmentSubPhase: 'declare',
    investmentDeclarations: {},
    investmentBids: {},
    investmentConflicts: {},
    investmentTieTarget: null,
    investmentBotCeilings: {},

    droppedEmployees: [],
    secondaryPool: [],

    exitDeck: [],
    currentExitTurn: 0,

    decisionLog: [],
  };
}

// ===========================================
// Registration
// ===========================================

export function registerTeam(
  state: GameState,
  teamIndex: number,
  name: string
): GameState {
  const newState = deepClone(state);
  newState.teams[teamIndex].name = name;
  return newState;
}

// ===========================================
// Phase Management
// ===========================================

export function isPhaseComplete(state: GameState): boolean {
  switch (state.phase) {
    case 'registration': {
      // All teams must have non-default names (registered)
      const defaultNames = new Set(TEAM_DEFINITIONS.map((d) => d.name));
      return state.teams.every((t) => !defaultNames.has(t.name));
    }

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

    case 'investment':
      return state.investmentSubPhase === 'summary';

    case 'seed':
    case 'early':
    case 'mature':
      // Complete when wildcards are resolved and market effects have been applied
      return !state.wildcardPhase && state.roundPerformance.length > 0;

    case 'secondary-drop':
      return state.droppedEmployees.length >= state.teams.filter((t) => !t.isDisqualified).length;

    case 'secondary-hire':
      return state.secondaryPool.length === 0;

    case 'exit':
      // All active teams must have chosen their exit strategy
      return state.teams.every((t) => t.isDisqualified || t.exitChoice !== null);

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
    'investment',
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
      case 'investment':
        newState.investmentSubPhase = 'declare';
        newState.investmentDeclarations = {};
        newState.investmentBids = {};
        newState.investmentConflicts = {};
        newState.investmentTieTarget = null;
        newState.investmentBotCeilings = {};
        break;
      case 'seed':
      case 'early':
      case 'mature':
        newState.currentMarketCard = null;
        newState.wildcardPhase = false;
        newState.teamWildcardSelections = {};
        newState.roundPerformance = [];
        break;
      case 'secondary-drop':
        newState.droppedEmployees = [];
        break;
      case 'secondary-hire':
        // Pool is populated during drop phase
        break;
      case 'exit':
        newState.exitDeck = shuffleArray([...exitCards]);
        newState.currentExitTurn = findFirstActiveTeam(newState);
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
    const bidAmount = newState.currentBid.amount;

    // Apply Ops ESOP discount (10% off after first Ops hire)
    const effectiveCost = getEffectiveEsopCost(winningTeam, bidAmount);

    // Award card to winner
    const hiredEmployee = {
      ...currentCard,
      bidAmount: bidAmount,
    };
    winningTeam.employees.push(hiredEmployee);
    winningTeam.esopRemaining -= effectiveCost;

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
        team.capital = Math.max(0, team.capital - penalty);
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

  // Check if auction is complete (all teams full OR no cards left)
  const allComplete = newState.teams.every(
    (t) => t.employees.length >= GAME.EMPLOYEES_PER_TEAM
  );

  if (allComplete || newState.currentCardIndex >= newState.employeeDeck.length) {
    // Apply $1M penalty per missing employee (V1 behavior - no disqualification)
    newState.teams.forEach((team) => {
      const missingEmployees = GAME.EMPLOYEES_PER_TEAM - team.employees.length;
      if (missingEmployees > 0) {
        const penalty = missingEmployees * 1_000_000;
        team.capital = Math.max(0, team.capital - penalty);
      }
    });
    newState.phase = 'auction-summary';
  }

  return newState;
}

// ===========================================
// Query Functions
// ===========================================

// Ops ESOP Discount: 10% discount after first Ops hire
export function getOpsDiscount(team: Team): number {
  const hasOps = team.employees.some((emp) => emp.category === 'Ops');
  return hasOps ? 0.1 : 0;
}

export function getEffectiveEsopCost(team: Team, bidAmount: number): number {
  const discount = getOpsDiscount(team);
  return Math.round(bidAmount * (1 - discount) * 100) / 100;
}

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

export function getWinners(state: GameState): Winners | null {
  if (state.phase !== 'winner') return null;

  const activeTeams = getActiveTeams(state);
  if (activeTeams.length === 0) return null;

  // Best Founder: Highest capital
  const founder = activeTeams.reduce((best, team) =>
    team.capital > best.capital ? team : best
  );

  // Best Employer: Highest (ESOP% given to employees) x capital
  const employer = activeTeams.reduce((best, team) => {
    const teamEsop = team.employees.reduce((sum, e) => sum + e.bidAmount, 0);
    const bestEsop = best.employees.reduce((sum, e) => sum + e.bidAmount, 0);
    const teamScore = (teamEsop / GAME.INITIAL_ESOP) * team.capital;
    const bestScore = (bestEsop / GAME.INITIAL_ESOP) * best.capital;
    return teamScore > bestScore ? team : best;
  });

  // Best Investor: Highest return multiple
  const investor = getInvestorWinner(state);

  return {
    founder,
    employer,
    investor,
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

  // Store previous capital and calculate new values
  newState.roundPerformance = [];

  newState.teams.forEach((team, index) => {
    if (team.isDisqualified) return;

    const previousCapital = team.capital;
    team.previousCapital = previousCapital;

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

    // Calculate new capital
    const capitalChange = previousCapital * totalChange;
    const newCapital = Math.max(0, previousCapital + capitalChange);

    team.capital = Math.round(newCapital);
    team.currentGain = Math.round(capitalChange);

    // Record performance
    newState.roundPerformance.push({
      teamIndex: index,
      previousCapital,
      newCapital: team.capital,
      gain: team.currentGain,
      percentChange: totalChange * 100,
    });
  });

  // Move card to used pile
  newState.usedMarketCards.push(card);
  newState.currentMarketCard = null;

  return newState;
}

export function applyMarketLeaderBonus(state: GameState): GameState {
  const newState = deepClone(state);

  // Reset leader status
  newState.teams.forEach((team) => {
    team.isMarketLeader = false;
  });

  // Find top 2 teams by GAINS (not capital) - V1 behavior
  // Sort by gains descending, use capital as tiebreaker
  const activeTeams = newState.teams
    .map((t, i) => ({ team: t, index: i }))
    .filter(({ team }) => !team.isDisqualified)
    .sort((a, b) => {
      if (b.team.currentGain !== a.team.currentGain) {
        return b.team.currentGain - a.team.currentGain;
      }
      return b.team.capital - a.team.capital;
    });

  // Top N get market leader status and bonus (scales with team count)
  const leaderCount = getMarketLeaderCount(newState.teams.length);
  const leaderBonus = 0.20; // 20% bonus
  activeTeams.slice(0, leaderCount).forEach(({ team }) => {
    team.isMarketLeader = true;
    team.marketLeaderCount++;
    team.capital = Math.round(team.capital * (1 + leaderBonus));
  });

  return newState;
}

export function applyWildcardModifiers(state: GameState): GameState {
  const newState = deepClone(state);

  newState.teams.forEach((team, index) => {
    if (team.isDisqualified) return;

    const choice = team.wildcardActiveThisRound;
    if (!choice || choice === 'pass') return;

    // Use previousCapital (set before market effects) to compute the round's gain
    const roundGain = team.capital - team.previousCapital;

    if (choice === 'double-down') {
      // Double the gain/loss from this round
      team.capital = Math.max(0, team.capital + roundGain);
      team.currentGain = roundGain * 2;
    } else if (choice === 'shield' && roundGain < 0) {
      // Revert losses — restore to pre-market capital
      team.capital = team.previousCapital;
      team.currentGain = 0;
    }

    // Update round performance entry
    const perfEntry = newState.roundPerformance.find((p) => p.teamIndex === index);
    if (perfEntry) {
      perfEntry.newCapital = team.capital;
      perfEntry.gain = team.currentGain;
      perfEntry.percentChange = team.previousCapital > 0
        ? (team.currentGain / team.previousCapital) * 100
        : 0;
    }
  });

  // Clear wildcard active status
  newState.teams.forEach((team) => {
    team.wildcardActiveThisRound = null;
  });

  return newState;
}

// ===========================================
// Investment Phase
// ===========================================

export function declareInvestment(
  state: GameState,
  teamIndex: number,
  targetTeamIndex: number | null
): GameState {
  const newState = deepClone(state);
  newState.investmentDeclarations[teamIndex] = targetTeamIndex;
  return newState;
}

export function allInvestmentsDeclared(state: GameState): boolean {
  const activeTeams = state.teams.filter((t) => !t.isDisqualified);
  return activeTeams.every((_, i) => i in state.investmentDeclarations);
}

export function resolveInvestmentConflicts(state: GameState): GameState {
  const newState = deepClone(state);

  // Group declarations by target (excluding passes)
  const targetMap: Record<number, number[]> = {};
  for (const [teamStr, target] of Object.entries(newState.investmentDeclarations)) {
    if (target === null) continue;
    const teamIdx = Number(teamStr);
    if (!targetMap[target]) {
      targetMap[target] = [];
    }
    targetMap[target].push(teamIdx);
  }

  // Separate conflicts (>1 investor) from direct investments
  const conflicts: Record<number, number[]> = {};
  for (const [targetStr, investors] of Object.entries(targetMap)) {
    const targetIdx = Number(targetStr);
    if (investors.length > 1) {
      conflicts[targetIdx] = investors;
    }
  }

  newState.investmentConflicts = conflicts;

  if (Object.keys(conflicts).length === 0) {
    // No conflicts - finalize directly
    return finalizeInvestments(newState);
  }

  // Set up first conflict (lowest target team index)
  const sortedTargets = Object.keys(conflicts).map(Number).sort((a, b) => a - b);
  newState.investmentSubPhase = 'conflict';
  newState.investmentTieTarget = sortedTargets[0];
  newState.investmentBids = {};

  return newState;
}

export function placeInvestmentBid(
  state: GameState,
  teamIndex: number,
  amount: number
): GameState {
  const newState = deepClone(state);
  newState.investmentBids[teamIndex] = amount;
  return newState;
}

export function passInvestmentBid(
  state: GameState,
  teamIndex: number
): GameState {
  const newState = deepClone(state);
  // Mark as passed with -1 (distinguishes from "hasn't acted yet")
  newState.investmentBids[teamIndex] = -1;
  return newState;
}

export function allConflictBidsPlaced(state: GameState, targetTeamIndex: number): boolean {
  const competitors = state.investmentConflicts[targetTeamIndex];
  if (!competitors) return true;
  return competitors.every((teamIdx) => teamIdx in state.investmentBids);
}

export function resolveConflictBids(state: GameState, targetTeamIndex: number): GameState {
  const newState = deepClone(state);
  const competitors = newState.investmentConflicts[targetTeamIndex];
  if (!competitors) return state;

  // Find active bidders (exclude those who passed with -1)
  const activeBids = competitors
    .filter((teamIdx) => newState.investmentBids[teamIdx] > 0)
    .map((teamIdx) => ({ teamIndex: teamIdx, amount: newState.investmentBids[teamIdx] }));

  if (activeBids.length === 0) {
    // All passed - no investment for this target
    delete newState.investmentConflicts[targetTeamIndex];
    return advanceToNextConflictOrFinalize(newState);
  }

  // Find highest bid
  const maxBid = Math.max(...activeBids.map((b) => b.amount));
  const tiedBidders = activeBids.filter((b) => b.amount === maxBid);

  if (tiedBidders.length > 1) {
    // Tie - target owner resolves
    newState.investmentSubPhase = 'resolve-tie';
    newState.investmentTieTarget = targetTeamIndex;
    return newState;
  }

  // Clear winner - record this investment
  const winner = tiedBidders[0];
  newState.investmentDeclarations[winner.teamIndex] = targetTeamIndex;
  // Update the declaration amounts for finalization
  // Store the winning bid amount on the team
  newState.teams[winner.teamIndex].investmentAmount = winner.amount;

  // Remove losing bidders' declarations for this target
  for (const teamIdx of competitors) {
    if (teamIdx !== winner.teamIndex) {
      newState.investmentDeclarations[teamIdx] = null;
    }
  }

  delete newState.investmentConflicts[targetTeamIndex];
  return advanceToNextConflictOrFinalize(newState);
}

export function resolveInvestmentTie(
  state: GameState,
  targetTeamIndex: number,
  chosenTeamIndex: number
): GameState {
  const newState = deepClone(state);
  const competitors = newState.investmentConflicts[targetTeamIndex];
  if (!competitors) return state;

  const chosenBid = newState.investmentBids[chosenTeamIndex];
  newState.teams[chosenTeamIndex].investmentAmount = chosenBid;

  // Remove losing bidders' declarations
  for (const teamIdx of competitors) {
    if (teamIdx !== chosenTeamIndex) {
      newState.investmentDeclarations[teamIdx] = null;
    }
  }

  delete newState.investmentConflicts[targetTeamIndex];
  return advanceToNextConflictOrFinalize(newState);
}

function advanceToNextConflictOrFinalize(state: GameState): GameState {
  const newState = deepClone(state);
  const remainingConflicts = Object.keys(newState.investmentConflicts).map(Number).sort((a, b) => a - b);

  if (remainingConflicts.length > 0) {
    // More conflicts to resolve
    newState.investmentSubPhase = 'conflict';
    newState.investmentTieTarget = remainingConflicts[0];
    newState.investmentBids = {};
    return newState;
  }

  // All conflicts resolved - finalize
  return finalizeInvestments(newState);
}

export function finalizeInvestments(state: GameState): GameState {
  const newState = deepClone(state);

  // Process each declaration
  for (const [teamStr, target] of Object.entries(newState.investmentDeclarations)) {
    if (target === null) continue;
    const investorIdx = Number(teamStr);
    const investor = newState.teams[investorIdx];
    const targetTeam = newState.teams[target];

    // Use stored investmentAmount if set (from conflict resolution), otherwise use minimum
    const amount = investor.investmentAmount > 0 ? investor.investmentAmount : GAME.INVESTMENT_MIN;

    // Snapshot target capital before transfer
    investor.capitalAtInvestment = targetTeam.capital;

    // Transfer capital
    investor.capital -= amount;
    targetTeam.capital += amount;

    // Record investment
    investor.investedInTeamIndex = target;
    investor.investmentAmount = amount;
    targetTeam.investorTeamIndex = investorIdx;
  }

  newState.investmentSubPhase = 'summary';
  return newState;
}

export function getInvestorWinner(state: GameState): { team: Team; returnMultiple: number } | null {
  const investors = state.teams
    .map((team, index) => ({ team, index }))
    .filter(({ team }) => team.investedInTeamIndex !== null && !team.isDisqualified);

  if (investors.length === 0) return null;

  const scored = investors.map(({ team, index }) => {
    const targetTeam = state.teams[team.investedInTeamIndex!];
    const returnMultiple = (GAME.INVESTOR_EQUITY * targetTeam.capital) / team.investmentAmount;
    return { team, index, returnMultiple };
  });

  // Sort by return multiple descending, then by lower investment amount (tiebreaker)
  scored.sort((a, b) => {
    if (b.returnMultiple !== a.returnMultiple) {
      return b.returnMultiple - a.returnMultiple;
    }
    return a.team.investmentAmount - b.team.investmentAmount;
  });

  return {
    team: scored[0].team,
    returnMultiple: scored[0].returnMultiple,
  };
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

  // Refund 50% of the original bid ESOP (floor to keep ESOP as whole numbers)
  const refund = Math.floor(employee.bidAmount * 0.5);
  team.esopRemaining += refund;

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
    const bidAmount = newState.currentBid.amount;

    // Apply Ops ESOP discount (10% off after first Ops hire)
    const effectiveCost = getEffectiveEsopCost(winningTeam, bidAmount);

    // Award card to winner
    const hiredEmployee = {
      ...currentCard,
      bidAmount: bidAmount,
    };
    winningTeam.employees.push(hiredEmployee);
    winningTeam.esopRemaining -= effectiveCost;
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

function findFirstActiveTeam(state: GameState): number {
  return state.teams.findIndex((t) => !t.isDisqualified);
}

function findNextActiveTeam(state: GameState, afterIndex: number): number {
  for (let i = afterIndex + 1; i < state.teams.length; i++) {
    if (!state.teams[i].isDisqualified && state.teams[i].exitChoice === null) {
      return i;
    }
  }
  return -1; // All teams have drawn
}

export function drawExit(
  state: GameState,
  teamIndex: number
): GameState {
  const newState = deepClone(state);
  const team = newState.teams[teamIndex];

  if (team.isDisqualified) return state;
  if (team.exitChoice !== null) return state; // Already drawn
  if (newState.exitDeck.length === 0) return state; // No cards left

  // Pop top card from shuffled deck
  const drawnCard = newState.exitDeck.shift();
  if (!drawnCard) return state;

  // Store pre-exit capital and set choice
  team.preExitCapital = team.capital;
  team.exitChoice = drawnCard;

  // Advance to next team's turn
  newState.currentExitTurn = findNextActiveTeam(newState, teamIndex);

  return newState;
}

export function allExitsChosen(state: GameState): boolean {
  return state.teams.every((t) => t.isDisqualified || t.exitChoice !== null);
}

export function applyExitMultipliers(state: GameState): GameState {
  const newState = deepClone(state);

  // Apply each team's individual exit multiplier
  newState.teams.forEach((team) => {
    if (!team.isDisqualified && team.exitChoice) {
      team.capital = Math.round(team.capital * team.exitChoice.multiplier);
    }
  });

  // Move to winner phase
  newState.phase = 'winner';

  return newState;
}
