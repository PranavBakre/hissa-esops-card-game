// ===========================================
// ESOP Wars v2 - Shared Constants
// ===========================================

import type { Phase, EmployeeCategory } from './types';

// ===========================================
// Game Phases
// ===========================================

export const PHASES: Phase[] = [
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

export const MARKET_PHASES: Phase[] = ['seed', 'early', 'mature'];

export const PHASE_LABELS: Record<Phase, string> = {
  registration: 'Registration',
  setup: 'Setup',
  'setup-lock': 'Lock Selection',
  'setup-summary': 'Setup Summary',
  auction: 'Auction',
  'auction-summary': 'Auction Summary',
  seed: 'Seed Round',
  early: 'Early Stage',
  'secondary-drop': 'Secondary Drop',
  'secondary-hire': 'Secondary Hire',
  mature: 'Mature Stage',
  exit: 'Exit',
  winner: 'Winner',
};

// ===========================================
// WebSocket Message Types
// ===========================================

export const CLIENT_MESSAGE_TYPES = [
  'join',
  'reconnect',
  'select-team',
  'start-game',
  'register-team',
  'drop-card',
  'draw-card',
  'skip-draw',
  'lock-setup',
  'place-bid',
  'pass-bid',
  'select-wildcard',
  'draw-market',
  'drop-employee',
  'select-secondary',
  'draw-exit',
] as const;

export const SERVER_MESSAGE_TYPES = [
  'room-joined',
  'player-joined',
  'player-left',
  'team-selected',
  'game-state',
  'team-updated',
  'phase-changed',
  'turn-changed',
  'bid-placed',
  'bidding-closed',
  'wildcards-revealed',
  'market-result',
  'market-leaders',
  'exit-drawn',
  'error',
] as const;

// ===========================================
// Timing Constants
// ===========================================

export const TIMING = {
  // Auction
  BID_TIMEOUT_MS: 20_000, // 20s per round

  // Bot delays
  BOT_MIN_DELAY_MS: 800,
  BOT_MAX_DELAY_MS: 2500,
  BOT_BID_DELAY_MS: 500,

  // AFK
  AFK_TIMEOUT_MS: 60_000, // 60s per turn

  // Reconnection
  RECONNECT_GRACE_MS: 30_000, // 30s grace period

  // Room cleanup
  ROOM_INACTIVE_CLEANUP_MS: 60 * 60 * 1000, // 1 hour
};

// ===========================================
// Game Constants
// ===========================================

export const GAME = {
  TEAM_COUNT: 5,
  EMPLOYEES_PER_TEAM: 3,
  INITIAL_VALUATION: 20_000_000,
  INITIAL_ESOP: 12,
  SETUP_ROUNDS: 3,
  SETUP_INITIAL_HAND: 3,
  MARKET_ROUNDS: 3,
};

// ===========================================
// Valuation Formula Constants
// ===========================================

export const VALUATION = {
  SKILL_MULTIPLIER: 0.08,
  MIN_GROWTH_RATE: -0.3,
  MAX_GROWTH_RATE: 0.5,
};

// ===========================================
// Categories
// ===========================================

export const EMPLOYEE_CATEGORIES: EmployeeCategory[] = [
  'Engineering',
  'Product',
  'Sales',
  'Ops',
  'Finance',
];

// ===========================================
// Room Code
// ===========================================

export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous I,O,0,1

// ===========================================
// Team Colors (default)
// ===========================================

export const TEAM_DEFINITIONS = [
  { name: 'Alpha', color: '#FF6B6B' },
  { name: 'Beta', color: '#4ECDC4' },
  { name: 'Gamma', color: '#45B7D1' },
  { name: 'Delta', color: '#96CEB4' },
  { name: 'Omega', color: '#FFEAA7' },
];
