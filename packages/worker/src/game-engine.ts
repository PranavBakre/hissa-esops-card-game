// ===========================================
// ESOP Wars v2 - Game Engine (Pure Functions)
// ===========================================

import type {
  GameState,
  Team,
  GameConfig,
  Phase,
  EmployeeCard,
} from '@esop-wars/shared';
import { GAME } from '@esop-wars/shared';
import {
  employeeCards,
  reserveEmployees,
  marketCards,
  segmentCards,
  productCards,
  serviceCards,
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
      return state.teams.every((t) => t.employees.length >= GAME.EMPLOYEES_PER_TEAM || t.isDisqualified);

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

  // Deal initial hands (3 cards each: 2 segments, 1 idea)
  newState.teams.forEach((team) => {
    const segments = newState.segmentDeck.splice(0, 2);
    const ideas = newState.ideaDeck.splice(0, 1);
    team.setupHand = [...segments, ...ideas];
  });

  newState.setupRound = 1;
  newState.setupPhase = 'drop';
  newState.setupDraftTurn = 0;

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
