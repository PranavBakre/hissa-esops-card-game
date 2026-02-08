// ===========================================
// ESOP Wars v2 - Action Validators
// ===========================================

import type {
  GameState,
  ValidationResult,
  SegmentCard,
  IdeaCard,
  WildcardChoice,
} from '@esop-wars/shared';
import { GAME } from '@esop-wars/shared';

// ===========================================
// Registration Validators
// ===========================================

export function validateRegister(
  state: GameState,
  teamIndex: number,
  name: string
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
// Wildcard Validators
// ===========================================

export function validateSelectWildcard(
  state: GameState,
  teamIndex: number,
  choice: WildcardChoice
): ValidationResult {
  if (!state.wildcardPhase) {
    return { valid: false, error: 'Not in wildcard phase' };
  }

  const team = state.teams[teamIndex];

  if (team.isDisqualified) {
    return { valid: false, error: 'Team is disqualified' };
  }

  // Check if already submitted
  if (state.teamWildcardSelections[teamIndex] !== undefined) {
    return { valid: false, error: 'Wildcard already selected this round' };
  }

  // Validate choice
  if (choice !== 'double-down' && choice !== 'shield' && choice !== 'pass') {
    return { valid: false, error: 'Invalid wildcard choice' };
  }

  // Check if wildcard already used (can only pass)
  if (team.wildcardUsed && choice !== 'pass') {
    return { valid: false, error: 'Wildcard already used in a previous round' };
  }

  return { valid: true };
}

// ===========================================
// Market Validators
// ===========================================

export function validateDrawMarket(
  state: GameState,
  teamIndex: number,
  isHost: boolean
): ValidationResult {
  const marketPhases = ['seed', 'early', 'mature'];
  if (!marketPhases.includes(state.phase)) {
    return { valid: false, error: 'Not in a market phase' };
  }

  if (!isHost) {
    return { valid: false, error: 'Only host can draw market card' };
  }

  if (state.wildcardPhase) {
    return { valid: false, error: 'Wildcard phase must complete first' };
  }

  if (state.marketDeck.length === 0) {
    return { valid: false, error: 'No market cards remaining' };
  }

  return { valid: true };
}

// ===========================================
// Secondary Auction Validators
// ===========================================

export function validateDropEmployee(
  state: GameState,
  teamIndex: number,
  employeeId: number
): ValidationResult {
  if (state.phase !== 'secondary-drop') {
    return { valid: false, error: 'Not in secondary drop phase' };
  }

  const team = state.teams[teamIndex];

  if (team.isDisqualified) {
    return { valid: false, error: 'Team is disqualified' };
  }

  // Check if already dropped
  const alreadyDropped = state.droppedEmployees.some(
    (d) => d.fromTeamIndex === teamIndex
  );
  if (alreadyDropped) {
    return { valid: false, error: 'Already dropped an employee this round' };
  }

  // Check if employee exists in team
  const hasEmployee = team.employees.some((e) => e.id === employeeId);
  if (!hasEmployee) {
    return { valid: false, error: 'Employee not on team' };
  }

  return { valid: true };
}

// ===========================================
// Exit Validators
// ===========================================

export function validateDrawExit(
  state: GameState,
  teamIndex: number
): ValidationResult {
  if (state.phase !== 'exit') {
    return { valid: false, error: 'Not in exit phase' };
  }

  const team = state.teams[teamIndex];

  if (team.isDisqualified) {
    return { valid: false, error: 'Team is disqualified' };
  }

  if (team.exitChoice !== null) {
    return { valid: false, error: 'Exit already drawn' };
  }

  if (state.currentExitTurn !== teamIndex) {
    return { valid: false, error: 'Not your turn to draw' };
  }

  if (state.exitDeck.length === 0) {
    return { valid: false, error: 'No exit cards remaining' };
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

  // Wildcard allows parallel selection
  if (state.wildcardPhase) {
    return state.teamWildcardSelections[teamIndex] === undefined;
  }

  // Secondary drop allows parallel drops
  if (state.phase === 'secondary-drop') {
    return !state.droppedEmployees.some((d) => d.fromTeamIndex === teamIndex);
  }

  // Exit is turn-based (draw from deck)
  if (state.phase === 'exit') {
    return state.currentExitTurn === teamIndex;
  }

  return true;
}
