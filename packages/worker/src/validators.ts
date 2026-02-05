// ===========================================
// ESOP Wars v2 - Action Validators
// ===========================================

import type {
  GameState,
  ValidationResult,
  SegmentCard,
  IdeaCard,
} from '@esop-wars/shared';
import { GAME } from '@esop-wars/shared';

// ===========================================
// Registration Validators
// ===========================================

export function validateRegister(
  state: GameState,
  teamIndex: number,
  name: string,
  problemStatement: string
): ValidationResult {
  if (state.phase !== 'registration') {
    return { valid: false, error: 'Not in registration phase' };
  }

  if (teamIndex < 0 || teamIndex >= state.teams.length) {
    return { valid: false, error: 'Invalid team index' };
  }

  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (name.length > 30) {
    return { valid: false, error: 'Name must be 30 characters or less' };
  }

  if (!problemStatement || problemStatement.trim().length === 0) {
    return { valid: false, error: 'Problem statement is required' };
  }

  if (problemStatement.length > 100) {
    return { valid: false, error: 'Problem statement must be 100 characters or less' };
  }

  return { valid: true };
}

// ===========================================
// Setup Validators
// ===========================================

export function validateDropCard(
  state: GameState,
  teamIndex: number,
  cardId: number
): ValidationResult {
  if (state.phase !== 'setup') {
    return { valid: false, error: 'Not in setup phase' };
  }

  if (state.setupPhase !== 'drop') {
    return { valid: false, error: 'Not in drop phase' };
  }

  if (state.setupDraftTurn !== teamIndex) {
    return { valid: false, error: 'Not your turn' };
  }

  const team = state.teams[teamIndex];
  const cardExists = team.setupHand.some((c) => c.id === cardId);

  if (!cardExists) {
    return { valid: false, error: 'Card not in hand' };
  }

  return { valid: true };
}

export function validateDrawCard(
  state: GameState,
  teamIndex: number,
  deckType: 'segment' | 'idea'
): ValidationResult {
  if (state.phase !== 'setup') {
    return { valid: false, error: 'Not in setup phase' };
  }

  if (state.setupPhase !== 'draw') {
    return { valid: false, error: 'Not in draw phase' };
  }

  if (state.setupDraftTurn !== teamIndex) {
    return { valid: false, error: 'Not your turn' };
  }

  const deck = deckType === 'segment' ? state.segmentDeck : state.ideaDeck;
  if (deck.length === 0) {
    return { valid: false, error: `No cards left in ${deckType} deck` };
  }

  return { valid: true };
}

export function validateSkipDraw(
  state: GameState,
  teamIndex: number
): ValidationResult {
  if (state.phase !== 'setup') {
    return { valid: false, error: 'Not in setup phase' };
  }

  if (state.setupPhase !== 'draw') {
    return { valid: false, error: 'Not in draw phase' };
  }

  if (state.setupDraftTurn !== teamIndex) {
    return { valid: false, error: 'Not your turn' };
  }

  return { valid: true };
}

export function validateLockSetup(
  state: GameState,
  teamIndex: number,
  segmentId: number,
  ideaId: number
): ValidationResult {
  if (state.phase !== 'setup-lock') {
    return { valid: false, error: 'Not in setup-lock phase' };
  }

  const team = state.teams[teamIndex];

  if (team.lockedSegment !== null || team.lockedIdea !== null) {
    return { valid: false, error: 'Already locked' };
  }

  // Check segment exists in hand
  const segment = team.setupHand.find(
    (c): c is SegmentCard => c.id === segmentId && !('type' in c)
  );
  if (!segment) {
    return { valid: false, error: 'Segment not in hand' };
  }

  // Check idea exists in hand
  const idea = team.setupHand.find(
    (c): c is IdeaCard => c.id === ideaId && 'type' in c
  );
  if (!idea) {
    return { valid: false, error: 'Idea not in hand' };
  }

  return { valid: true };
}

// ===========================================
// Auction Validators
// ===========================================

export function validatePlaceBid(
  state: GameState,
  teamIndex: number,
  amount: number
): ValidationResult {
  if (state.phase !== 'auction' && state.phase !== 'secondary-hire') {
    return { valid: false, error: 'Not in auction phase' };
  }

  const team = state.teams[teamIndex];

  if (team.isDisqualified) {
    return { valid: false, error: 'Team is disqualified' };
  }

  if (team.employees.length >= GAME.EMPLOYEES_PER_TEAM) {
    return { valid: false, error: 'Team already has maximum employees' };
  }

  if (amount <= 0) {
    return { valid: false, error: 'Bid must be positive' };
  }

  if (amount > team.esopRemaining) {
    return { valid: false, error: 'Not enough ESOP remaining' };
  }

  if (state.currentBid && amount <= state.currentBid.amount) {
    return { valid: false, error: 'Bid must be higher than current bid' };
  }

  return { valid: true };
}

export function validatePassBid(
  state: GameState,
  teamIndex: number
): ValidationResult {
  if (state.phase !== 'auction' && state.phase !== 'secondary-hire') {
    return { valid: false, error: 'Not in auction phase' };
  }

  const team = state.teams[teamIndex];

  if (team.isDisqualified) {
    return { valid: false, error: 'Team is disqualified' };
  }

  return { valid: true };
}

// ===========================================
// Turn Validation
// ===========================================

export function isPlayersTurn(
  state: GameState,
  teamIndex: number
): boolean {
  if (state.phase === 'setup') {
    return state.setupDraftTurn === teamIndex;
  }

  // Auction allows any eligible team to bid
  if (state.phase === 'auction' || state.phase === 'secondary-hire') {
    const team = state.teams[teamIndex];
    return !team.isDisqualified && team.employees.length < GAME.EMPLOYEES_PER_TEAM;
  }

  // Setup-lock allows parallel locking
  if (state.phase === 'setup-lock') {
    const team = state.teams[teamIndex];
    return team.lockedSegment === null && team.lockedIdea === null;
  }

  return true;
}
