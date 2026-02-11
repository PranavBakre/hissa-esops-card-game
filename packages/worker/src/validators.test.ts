import { describe, it, expect } from 'vitest';
import type { GameState, HiredEmployee, EmployeeCategory } from '@esop-wars/shared';
import { GAME, TEAM_DEFINITIONS } from '@esop-wars/shared';
import {
  validateRegister,
  validateDropCard,
  validateDrawCard,
  validateSkipDraw,
  validateLockSetup,
  validatePlaceBid,
  validatePassBid,
  validateSelectWildcard,
  validateDrawMarket,
  validateDropEmployee,
  validateDrawExit,
  validateDeclareInvestment,
  validatePlaceInvestmentBid,
  validatePassInvestmentBid,
  validateResolveInvestmentTie,
  isPlayersTurn,
} from './validators';
import { createInitialState, registerTeam, advancePhase } from './game-engine';

// ===========================================
// Test Helpers
// ===========================================

function createTestState(teamCount: number = 3): GameState {
  return createInitialState({
    teams: TEAM_DEFINITIONS.slice(0, teamCount).map((def, i) => ({
      name: def.name,
      color: def.color,
      playerId: `player-${i}`,
      isBot: false,
    })),
    initialCapital: GAME.INITIAL_CAPITAL,
    initialEsop: GAME.INITIAL_ESOP,
  });
}

function makeEmployee(id: number, category: EmployeeCategory = 'Engineering'): HiredEmployee {
  return {
    id,
    name: `Emp ${id}`,
    role: 'Role',
    category,
    hardSkill: 0.5,
    softSkills: {},
    bidAmount: 2,
  };
}

// ===========================================
// Registration Validators
// ===========================================

describe('validateRegister', () => {
  it('rejects when not in registration phase', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validateRegister(state, 0, 'Test').valid).toBe(false);
  });

  it('rejects invalid team index', () => {
    const state = createTestState();
    expect(validateRegister(state, -1, 'Test').valid).toBe(false);
    expect(validateRegister(state, 10, 'Test').valid).toBe(false);
  });

  it('rejects empty name', () => {
    const state = createTestState();
    expect(validateRegister(state, 0, '').valid).toBe(false);
    expect(validateRegister(state, 0, '  ').valid).toBe(false);
  });

  it('rejects name over 30 chars', () => {
    const state = createTestState();
    expect(validateRegister(state, 0, 'A'.repeat(31)).valid).toBe(false);
  });

  it('accepts valid registration', () => {
    const state = createTestState();
    expect(validateRegister(state, 0, 'My Startup').valid).toBe(true);
  });
});

// ===========================================
// Setup Validators
// ===========================================

describe('validateDropCard', () => {
  it('rejects when not in setup phase', () => {
    const state = createTestState();
    expect(validateDropCard(state, 0, 1).valid).toBe(false);
  });

  it('rejects when not in drop sub-phase', () => {
    const state = createTestState();
    state.phase = 'setup';
    state.setupPhase = 'draw';
    expect(validateDropCard(state, 0, 1).valid).toBe(false);
  });

  it('rejects wrong turn', () => {
    const state = createTestState();
    state.phase = 'setup';
    state.setupPhase = 'drop';
    state.setupDraftTurn = 1;
    expect(validateDropCard(state, 0, 1).valid).toBe(false);
  });

  it('rejects card not in hand', () => {
    const state = createTestState();
    state.phase = 'setup';
    state.setupPhase = 'drop';
    state.setupDraftTurn = 0;
    state.teams[0].setupHand = [{ id: 5, name: 'B2B SaaS', description: '', icon: '' }];
    expect(validateDropCard(state, 0, 999).valid).toBe(false);
  });

  it('accepts valid drop', () => {
    const state = createTestState();
    state.phase = 'setup';
    state.setupPhase = 'drop';
    state.setupDraftTurn = 0;
    state.teams[0].setupHand = [{ id: 5, name: 'B2B SaaS', description: '', icon: '' }];
    expect(validateDropCard(state, 0, 5).valid).toBe(true);
  });
});

describe('validateDrawCard', () => {
  it('rejects when not in draw sub-phase', () => {
    const state = createTestState();
    state.phase = 'setup';
    state.setupPhase = 'drop';
    expect(validateDrawCard(state, 0, 'segment').valid).toBe(false);
  });

  it('rejects when deck is empty', () => {
    const state = createTestState();
    state.phase = 'setup';
    state.setupPhase = 'draw';
    state.setupDraftTurn = 0;
    state.segmentDeck = [];
    expect(validateDrawCard(state, 0, 'segment').valid).toBe(false);
  });
});

describe('validateSkipDraw', () => {
  it('rejects wrong turn', () => {
    const state = createTestState();
    state.phase = 'setup';
    state.setupPhase = 'draw';
    state.setupDraftTurn = 1;
    expect(validateSkipDraw(state, 0).valid).toBe(false);
  });
});

describe('validateLockSetup', () => {
  it('rejects when not in setup-lock phase', () => {
    const state = createTestState();
    expect(validateLockSetup(state, 0, 1, 1).valid).toBe(false);
  });

  it('rejects already locked team', () => {
    const state = createTestState();
    state.phase = 'setup-lock';
    state.teams[0].lockedSegment = { id: 1, name: 'B2B SaaS', description: '', icon: '' };
    expect(validateLockSetup(state, 0, 1, 1).valid).toBe(false);
  });

  it('rejects segment not in hand', () => {
    const state = createTestState();
    state.phase = 'setup-lock';
    state.teams[0].setupHand = [
      { id: 1, type: 'product', name: 'CRM', description: '', icon: '' },
    ];
    expect(validateLockSetup(state, 0, 999, 1).valid).toBe(false);
  });

  it('rejects idea not in hand', () => {
    const state = createTestState();
    state.phase = 'setup-lock';
    state.teams[0].setupHand = [
      { id: 1, name: 'B2B SaaS', description: '', icon: '' },
    ];
    expect(validateLockSetup(state, 0, 1, 999).valid).toBe(false);
  });
});

// ===========================================
// Auction Validators
// ===========================================

describe('validatePlaceBid', () => {
  it('rejects when not in auction phase', () => {
    const state = createTestState();
    expect(validatePlaceBid(state, 0, 1).valid).toBe(false);
  });

  it('rejects disqualified team', () => {
    const state = createTestState();
    state.phase = 'auction';
    state.teams[0].isDisqualified = true;
    expect(validatePlaceBid(state, 0, 1).valid).toBe(false);
  });

  it('rejects full team (3 employees)', () => {
    const state = createTestState();
    state.phase = 'auction';
    state.teams[0].employees = [makeEmployee(1), makeEmployee(2), makeEmployee(3)];
    expect(validatePlaceBid(state, 0, 1).valid).toBe(false);
  });

  it('rejects zero bid', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validatePlaceBid(state, 0, 0).valid).toBe(false);
  });

  it('rejects negative bid', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validatePlaceBid(state, 0, -1).valid).toBe(false);
  });

  it('rejects bid exceeding ESOP remaining', () => {
    const state = createTestState();
    state.phase = 'auction';
    state.teams[0].esopRemaining = 3;
    expect(validatePlaceBid(state, 0, 4).valid).toBe(false);
  });

  it('rejects bid not higher than current bid', () => {
    const state = createTestState();
    state.phase = 'auction';
    state.currentBid = { teamIndex: 1, amount: 5 };
    expect(validatePlaceBid(state, 0, 5).valid).toBe(false);
    expect(validatePlaceBid(state, 0, 3).valid).toBe(false);
  });

  it('accepts valid bid', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validatePlaceBid(state, 0, 2).valid).toBe(true);
  });

  it('accepts bid in secondary-hire phase', () => {
    const state = createTestState();
    state.phase = 'secondary-hire';
    expect(validatePlaceBid(state, 0, 1).valid).toBe(true);
  });
});

describe('validatePassBid', () => {
  it('rejects when not in auction phase', () => {
    const state = createTestState();
    expect(validatePassBid(state, 0).valid).toBe(false);
  });

  it('rejects disqualified team', () => {
    const state = createTestState();
    state.phase = 'auction';
    state.teams[0].isDisqualified = true;
    expect(validatePassBid(state, 0).valid).toBe(false);
  });

  it('accepts valid pass', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validatePassBid(state, 0).valid).toBe(true);
  });
});

// ===========================================
// Wildcard Validators
// ===========================================

describe('validateSelectWildcard', () => {
  it('rejects when not in wildcard phase', () => {
    const state = createTestState();
    state.wildcardPhase = false;
    expect(validateSelectWildcard(state, 0, 'pass').valid).toBe(false);
  });

  it('rejects duplicate selection this round', () => {
    const state = createTestState();
    state.wildcardPhase = true;
    state.teamWildcardSelections = { 0: 'pass' };
    expect(validateSelectWildcard(state, 0, 'double-down').valid).toBe(false);
  });

  it('rejects used wildcard with non-pass choice', () => {
    const state = createTestState();
    state.wildcardPhase = true;
    state.teams[0].wildcardUsed = true;
    expect(validateSelectWildcard(state, 0, 'double-down').valid).toBe(false);
    expect(validateSelectWildcard(state, 0, 'shield').valid).toBe(false);
  });

  it('accepts pass for used wildcard', () => {
    const state = createTestState();
    state.wildcardPhase = true;
    state.teams[0].wildcardUsed = true;
    expect(validateSelectWildcard(state, 0, 'pass').valid).toBe(true);
  });

  it('accepts valid wildcard choice', () => {
    const state = createTestState();
    state.wildcardPhase = true;
    expect(validateSelectWildcard(state, 0, 'double-down').valid).toBe(true);
    expect(validateSelectWildcard(state, 0, 'shield').valid).toBe(true);
    expect(validateSelectWildcard(state, 0, 'pass').valid).toBe(true);
  });
});

// ===========================================
// Market Validators
// ===========================================

describe('validateDrawMarket', () => {
  it('rejects when not in market phase', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validateDrawMarket(state, 0, true).valid).toBe(false);
  });

  it('rejects non-host', () => {
    const state = createTestState();
    state.phase = 'seed';
    expect(validateDrawMarket(state, 0, false).valid).toBe(false);
  });

  it('rejects during wildcard phase', () => {
    const state = createTestState();
    state.phase = 'seed';
    state.wildcardPhase = true;
    expect(validateDrawMarket(state, 0, true).valid).toBe(false);
  });

  it('rejects when no cards left', () => {
    const state = createTestState();
    state.phase = 'seed';
    state.marketDeck = [];
    expect(validateDrawMarket(state, 0, true).valid).toBe(false);
  });

  it('accepts valid market draw', () => {
    const state = createTestState();
    state.phase = 'seed';
    expect(validateDrawMarket(state, 0, true).valid).toBe(true);
  });
});

// ===========================================
// Secondary Drop Validators
// ===========================================

describe('validateDropEmployee', () => {
  it('rejects when not in secondary-drop phase', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validateDropEmployee(state, 0, 1).valid).toBe(false);
  });

  it('rejects already dropped team', () => {
    const state = createTestState();
    state.phase = 'secondary-drop';
    state.droppedEmployees = [{ employee: makeEmployee(1), fromTeamIndex: 0 }];
    expect(validateDropEmployee(state, 0, 2).valid).toBe(false);
  });

  it('rejects employee not on team', () => {
    const state = createTestState();
    state.phase = 'secondary-drop';
    state.teams[0].employees = [makeEmployee(1)];
    expect(validateDropEmployee(state, 0, 999).valid).toBe(false);
  });

  it('accepts valid drop', () => {
    const state = createTestState();
    state.phase = 'secondary-drop';
    state.teams[0].employees = [makeEmployee(1)];
    expect(validateDropEmployee(state, 0, 1).valid).toBe(true);
  });
});

// ===========================================
// Exit Validators
// ===========================================

describe('validateDrawExit', () => {
  it('rejects when not in exit phase', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validateDrawExit(state, 0).valid).toBe(false);
  });

  it('rejects wrong turn', () => {
    const state = createTestState();
    state.phase = 'exit';
    state.currentExitTurn = 1;
    expect(validateDrawExit(state, 0).valid).toBe(false);
  });

  it('rejects already drawn', () => {
    const state = createTestState();
    state.phase = 'exit';
    state.currentExitTurn = 0;
    state.teams[0].exitChoice = { id: 1, name: 'IPO', multiplier: 2.0, description: '' };
    expect(validateDrawExit(state, 0).valid).toBe(false);
  });

  it('rejects when no exit cards left', () => {
    const state = createTestState();
    state.phase = 'exit';
    state.currentExitTurn = 0;
    state.exitDeck = [];
    expect(validateDrawExit(state, 0).valid).toBe(false);
  });

  it('accepts valid draw', () => {
    const state = createTestState();
    state.phase = 'exit';
    state.currentExitTurn = 0;
    state.exitDeck = [{ id: 1, name: 'IPO', multiplier: 2.0, description: '' }];
    expect(validateDrawExit(state, 0).valid).toBe(true);
  });
});

// ===========================================
// Turn Validation
// ===========================================

describe('isPlayersTurn', () => {
  it('setup: only current draft turn can act', () => {
    const state = createTestState();
    state.phase = 'setup';
    state.setupDraftTurn = 1;
    expect(isPlayersTurn(state, 0)).toBe(false);
    expect(isPlayersTurn(state, 1)).toBe(true);
  });

  it('auction: any team with room and ESOP can bid', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(isPlayersTurn(state, 0)).toBe(true);

    state.teams[0].employees = [makeEmployee(1), makeEmployee(2), makeEmployee(3)];
    expect(isPlayersTurn(state, 0)).toBe(false);
  });

  it('exit: only current exit turn can draw', () => {
    const state = createTestState();
    state.phase = 'exit';
    state.currentExitTurn = 2;
    expect(isPlayersTurn(state, 0)).toBe(false);
    expect(isPlayersTurn(state, 2)).toBe(true);
  });

  it('wildcard: any team that hasnt selected yet', () => {
    const state = createTestState();
    state.wildcardPhase = true;
    state.teamWildcardSelections = { 0: 'pass' };
    expect(isPlayersTurn(state, 0)).toBe(false);
    expect(isPlayersTurn(state, 1)).toBe(true);
  });

  it('secondary-drop: any team that hasnt dropped yet', () => {
    const state = createTestState();
    state.phase = 'secondary-drop';
    state.droppedEmployees = [{ employee: makeEmployee(1), fromTeamIndex: 0 }];
    expect(isPlayersTurn(state, 0)).toBe(false);
    expect(isPlayersTurn(state, 1)).toBe(true);
  });

  it('investment declare: any team that hasnt declared yet', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    state.investmentDeclarations = { 0: 1 };
    expect(isPlayersTurn(state, 0)).toBe(false);
    expect(isPlayersTurn(state, 1)).toBe(true);
  });

  it('investment conflict: only competitors who havent bid yet', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    state.investmentBids = { 0: 500_000 };
    expect(isPlayersTurn(state, 0)).toBe(false);
    expect(isPlayersTurn(state, 1)).toBe(true);
    expect(isPlayersTurn(state, 2)).toBe(false); // not a competitor
  });

  it('investment resolve-tie: only target owner', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'resolve-tie';
    state.investmentTieTarget = 2;
    expect(isPlayersTurn(state, 0)).toBe(false);
    expect(isPlayersTurn(state, 2)).toBe(true);
  });
});

// ===========================================
// Investment Validators
// ===========================================

describe('validateDeclareInvestment', () => {
  it('rejects when not in investment phase', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validateDeclareInvestment(state, 0, 1).valid).toBe(false);
  });

  it('rejects wrong sub-phase', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    expect(validateDeclareInvestment(state, 0, 1).valid).toBe(false);
  });

  it('rejects self-investment', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    expect(validateDeclareInvestment(state, 0, 0).valid).toBe(false);
  });

  it('rejects duplicate declaration', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    state.investmentDeclarations = { 0: 1 };
    expect(validateDeclareInvestment(state, 0, 2).valid).toBe(false);
  });

  it('rejects invalid target index', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    expect(validateDeclareInvestment(state, 0, 99).valid).toBe(false);
    expect(validateDeclareInvestment(state, 0, -1).valid).toBe(false);
  });

  it('rejects target that already has investor', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    state.teams[1].investorTeamIndex = 2;
    expect(validateDeclareInvestment(state, 0, 1).valid).toBe(false);
  });

  it('rejects disqualified target', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    state.teams[1].isDisqualified = true;
    expect(validateDeclareInvestment(state, 0, 1).valid).toBe(false);
  });

  it('accepts valid declaration', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    expect(validateDeclareInvestment(state, 0, 1).valid).toBe(true);
  });

  it('accepts null (pass)', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    expect(validateDeclareInvestment(state, 0, null).valid).toBe(true);
  });
});

describe('validatePlaceInvestmentBid', () => {
  it('rejects wrong phase', () => {
    const state = createTestState();
    state.phase = 'auction';
    expect(validatePlaceInvestmentBid(state, 0, 500_000).valid).toBe(false);
  });

  it('rejects wrong sub-phase', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    expect(validatePlaceInvestmentBid(state, 0, 500_000).valid).toBe(false);
  });

  it('rejects non-competitor', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    expect(validatePlaceInvestmentBid(state, 2, 500_000).valid).toBe(false);
  });

  it('rejects already bid', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    state.investmentBids = { 0: 500_000 };
    expect(validatePlaceInvestmentBid(state, 0, 600_000).valid).toBe(false);
  });

  it('rejects bid below minimum', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    expect(validatePlaceInvestmentBid(state, 0, 100_000).valid).toBe(false);
  });

  it('rejects bid above maximum', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    expect(validatePlaceInvestmentBid(state, 0, 2_000_000).valid).toBe(false);
  });

  it('rejects bid below current highest', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    state.investmentBids = { 0: 700_000 }; // team 0 already bid 700K
    expect(validatePlaceInvestmentBid(state, 1, 600_000).valid).toBe(false);
  });

  it('accepts bid equal to current highest (creates tie)', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    state.investmentBids = { 0: 700_000 };
    expect(validatePlaceInvestmentBid(state, 1, 700_000).valid).toBe(true);
  });

  it('accepts valid bid', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    expect(validatePlaceInvestmentBid(state, 0, 750_000).valid).toBe(true);
  });
});

describe('validatePassInvestmentBid', () => {
  it('rejects wrong sub-phase', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'declare';
    expect(validatePassInvestmentBid(state, 0).valid).toBe(false);
  });

  it('rejects non-competitor', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    expect(validatePassInvestmentBid(state, 2).valid).toBe(false);
  });

  it('rejects already acted', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    state.investmentBids = { 0: -1 };
    expect(validatePassInvestmentBid(state, 0).valid).toBe(false);
  });

  it('accepts valid pass', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentTieTarget = 2;
    expect(validatePassInvestmentBid(state, 0).valid).toBe(true);
  });
});

describe('validateResolveInvestmentTie', () => {
  it('rejects wrong sub-phase', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'conflict';
    expect(validateResolveInvestmentTie(state, 2, 0).valid).toBe(false);
  });

  it('rejects non-owner', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'resolve-tie';
    state.investmentTieTarget = 2;
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentBids = { 0: 600_000, 1: 600_000 };
    expect(validateResolveInvestmentTie(state, 0, 1).valid).toBe(false);
  });

  it('rejects choosing non-tied team', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'resolve-tie';
    state.investmentTieTarget = 2;
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentBids = { 0: 600_000, 1: 500_000 }; // only team 0 is at max
    expect(validateResolveInvestmentTie(state, 2, 1).valid).toBe(false);
  });

  it('accepts valid tie resolution', () => {
    const state = createTestState();
    state.phase = 'investment';
    state.investmentSubPhase = 'resolve-tie';
    state.investmentTieTarget = 2;
    state.investmentConflicts = { 2: [0, 1] };
    state.investmentBids = { 0: 600_000, 1: 600_000 };
    expect(validateResolveInvestmentTie(state, 2, 0).valid).toBe(true);
    expect(validateResolveInvestmentTie(state, 2, 1).valid).toBe(true);
  });
});
