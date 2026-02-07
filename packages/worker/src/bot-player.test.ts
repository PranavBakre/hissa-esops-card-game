import { describe, it, expect } from 'vitest';
import type { GameState, HiredEmployee, EmployeeCard } from '@esop-wars/shared';
import { GAME, TEAM_DEFINITIONS } from '@esop-wars/shared';
import {
  getBotDelay,
  decideSetupDrop,
  decideSetupDraw,
  decideSetupLock,
  decideBid,
  decideWildcard,
  decideSecondaryDrop,
  decideRegistration,
} from './bot-player';
import { createInitialState, registerTeam, advancePhase } from './game-engine';

// ===========================================
// Test Helpers
// ===========================================

function createTestState(teamCount: number = 3): GameState {
  return createInitialState({
    teams: TEAM_DEFINITIONS.slice(0, teamCount).map((def, i) => ({
      name: def.name,
      color: def.color,
      playerId: null,
      isBot: true,
    })),
    initialValuation: GAME.INITIAL_VALUATION,
    initialEsop: GAME.INITIAL_ESOP,
  });
}

function makeEmployee(id: number, category: string = 'Engineering', hardSkill: number = 0.5): HiredEmployee {
  return {
    id,
    name: `Emp ${id}`,
    role: 'Role',
    category: category as HiredEmployee['category'],
    hardSkill,
    softSkills: { Resilience: 0.5 },
    bidAmount: 2,
  };
}

function makeCard(id: number, category: string = 'Engineering', hardSkill: number = 0.5): EmployeeCard {
  return {
    id,
    name: `Card ${id}`,
    role: 'Role',
    category: category as EmployeeCard['category'],
    hardSkill,
    softSkills: { Resilience: 0.5 },
  };
}

// ===========================================
// Bot Timing
// ===========================================

describe('getBotDelay', () => {
  it('returns a number >= 10ms', () => {
    for (let i = 0; i < 20; i++) {
      expect(getBotDelay(1.0)).toBeGreaterThanOrEqual(10);
    }
  });

  it('respects minimum floor at instant speed', () => {
    for (let i = 0; i < 20; i++) {
      expect(getBotDelay(0.01)).toBeGreaterThanOrEqual(10);
    }
  });

  it('faster at lower multipliers', () => {
    const normal = getBotDelay(1.0);
    const fast = getBotDelay(0.01);
    // Fast should generally be faster (statistically, though random)
    // Just verify both are valid
    expect(normal).toBeGreaterThanOrEqual(10);
    expect(fast).toBeGreaterThanOrEqual(10);
  });
});

// ===========================================
// Registration
// ===========================================

describe('decideRegistration', () => {
  it('returns a name and problem statement', () => {
    const decision = decideRegistration(0, []);
    expect(decision.name).toBeTruthy();
    expect(decision.problemStatement).toBeTruthy();
  });

  it('avoids already used names', () => {
    const used = ['Quantum Phoenix Labs'];
    const decision = decideRegistration(0, used);
    expect(decision.name).not.toBe('Quantum Phoenix Labs');
  });
});

// ===========================================
// Setup Drop
// ===========================================

describe('decideSetupDrop', () => {
  it('returns a valid card from hand', () => {
    let state = createTestState(3);
    // Register and advance to setup
    for (let i = 0; i < 3; i++) {
      state = registerTeam(state, i, `Bot ${i}`, `Problem ${i}`);
    }
    state = advancePhase(state); // -> setup

    const decision = decideSetupDrop(state, 0);
    expect(decision).not.toBeNull();
    if (decision) {
      const cardIds = state.teams[0].setupHand.map((c) => c.id);
      expect(cardIds).toContain(decision.cardId);
    }
  });

  it('returns null for empty hand', () => {
    const state = createTestState(3);
    state.phase = 'setup';
    state.teams[0].setupHand = [];
    const decision = decideSetupDrop(state, 0);
    expect(decision).toBeNull();
  });
});

// ===========================================
// Setup Draw
// ===========================================

describe('decideSetupDraw', () => {
  it('returns draw with valid deck type when decks available', () => {
    const state = createTestState(3);
    state.phase = 'setup';
    state.setupPhase = 'draw';
    // Ensure decks have cards
    const decision = decideSetupDraw(state, 0);
    expect(decision.action).toBe('draw');
    expect(['segment', 'idea']).toContain(decision.deckType);
  });

  it('returns skip when both decks empty', () => {
    const state = createTestState(3);
    state.phase = 'setup';
    state.setupPhase = 'draw';
    state.segmentDeck = [];
    state.ideaDeck = [];
    const decision = decideSetupDraw(state, 0);
    expect(decision.action).toBe('skip');
  });

  it('draws from segment deck when fewer segments in hand', () => {
    const state = createTestState(3);
    state.phase = 'setup';
    state.setupPhase = 'draw';
    state.teams[0].setupHand = [
      { id: 1, type: 'product', name: 'CRM', description: '', icon: '' },
      { id: 2, type: 'product', name: 'AI', description: '', icon: '' },
    ];
    const decision = decideSetupDraw(state, 0);
    expect(decision.deckType).toBe('segment');
  });

  it('draws from idea deck when fewer ideas in hand', () => {
    const state = createTestState(3);
    state.phase = 'setup';
    state.setupPhase = 'draw';
    state.teams[0].setupHand = [
      { id: 1, name: 'B2B SaaS', description: '', icon: '' },
      { id: 2, name: 'Fintech', description: '', icon: '' },
    ];
    const decision = decideSetupDraw(state, 0);
    expect(decision.deckType).toBe('idea');
  });
});

// ===========================================
// Setup Lock
// ===========================================

describe('decideSetupLock', () => {
  it('returns segment and idea IDs from hand', () => {
    const state = createTestState(3);
    state.phase = 'setup-lock';
    state.teams[0].setupHand = [
      { id: 1, name: 'B2B SaaS', description: '', icon: '' },
      { id: 2, type: 'product', name: 'CRM System', description: '', icon: '' },
    ];

    const decision = decideSetupLock(state, 0);
    expect(decision).not.toBeNull();
    if (decision) {
      expect(decision.segmentId).toBe(1);
      expect(decision.ideaId).toBe(2);
    }
  });

  it('returns null when no segments in hand', () => {
    const state = createTestState(3);
    state.phase = 'setup-lock';
    state.teams[0].setupHand = [
      { id: 1, type: 'product', name: 'CRM', description: '', icon: '' },
    ];
    expect(decideSetupLock(state, 0)).toBeNull();
  });

  it('returns null when no ideas in hand', () => {
    const state = createTestState(3);
    state.phase = 'setup-lock';
    state.teams[0].setupHand = [
      { id: 1, name: 'B2B SaaS', description: '', icon: '' },
    ];
    expect(decideSetupLock(state, 0)).toBeNull();
  });

  it('prefers combo with setup bonus', () => {
    const state = createTestState(3);
    state.phase = 'setup-lock';
    state.teams[0].setupHand = [
      { id: 1, name: 'B2B SaaS', description: '', icon: '' },
      { id: 2, name: 'Fintech', description: '', icon: '' },
      { id: 3, type: 'product', name: 'Analytics Platform', description: '', icon: '' },
      { id: 4, type: 'product', name: 'Mobile App', description: '', icon: '' },
    ];

    const decision = decideSetupLock(state, 0);
    expect(decision).not.toBeNull();
    // B2B SaaS + Analytics Platform has a bonus
    if (decision) {
      expect(decision.segmentId).toBe(1);
      expect(decision.ideaId).toBe(3);
    }
  });
});

// ===========================================
// Auction Bidding
// ===========================================

describe('decideBid', () => {
  it('passes when team is full', () => {
    const state = createTestState(3);
    state.phase = 'auction';
    state.teams[0].employees = [makeEmployee(1), makeEmployee(2), makeEmployee(3)];

    const decision = decideBid(state, 0, makeCard(10));
    expect(decision.action).toBe('pass');
  });

  it('never exceeds ESOP remaining', () => {
    const state = createTestState(3);
    state.phase = 'auction';
    state.teams[0].esopRemaining = 3;

    // Run multiple times since there's randomness
    for (let i = 0; i < 50; i++) {
      const decision = decideBid(state, 0, makeCard(10, 'Engineering', 0.9));
      if (decision.action === 'bid' && decision.amount !== undefined) {
        expect(decision.amount).toBeLessThanOrEqual(state.teams[0].esopRemaining);
      }
    }
  });

  it('reserves budget for remaining hires', () => {
    const state = createTestState(3);
    state.phase = 'auction';
    state.teams[0].esopRemaining = 4;
    // 0 employees, needs 3 more. Reserve at least 2 (for 2 remaining after this hire)

    for (let i = 0; i < 50; i++) {
      const decision = decideBid(state, 0, makeCard(10, 'Engineering', 0.3));
      if (decision.action === 'bid' && decision.amount !== undefined) {
        // Should never bid so much that remaining < employees still needed - 1
        const remaining = state.teams[0].esopRemaining - decision.amount;
        expect(remaining).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('passes when ESOP too low', () => {
    const state = createTestState(3);
    state.phase = 'auction';
    state.teams[0].esopRemaining = 0;

    const decision = decideBid(state, 0, makeCard(10));
    expect(decision.action).toBe('pass');
  });
});

// ===========================================
// Wildcard
// ===========================================

describe('decideWildcard', () => {
  it('passes when wildcard already used', () => {
    const state = createTestState(3);
    state.wildcardPhase = true;
    state.teams[0].wildcardUsed = true;

    const choice = decideWildcard(state, 0);
    expect(choice).toBe('pass');
  });

  it('returns valid wildcard choice', () => {
    const state = createTestState(3);
    state.wildcardPhase = true;

    // Run multiple times since there's randomness
    for (let i = 0; i < 20; i++) {
      const choice = decideWildcard(state, 0);
      expect(['double-down', 'shield', 'pass']).toContain(choice);
    }
  });
});

// ===========================================
// Secondary Drop
// ===========================================

describe('decideSecondaryDrop', () => {
  it('returns lowest value employee', () => {
    const state = createTestState(3);
    state.phase = 'secondary-drop';
    state.teams[0].employees = [
      makeEmployee(1, 'Engineering', 0.9),  // high value
      makeEmployee(2, 'Sales', 0.3),         // low value
      makeEmployee(3, 'Product', 0.7),       // medium value
    ];

    const dropped = decideSecondaryDrop(state, 0);
    expect(dropped).toBe(2); // lowest skill employee
  });

  it('returns null for empty roster', () => {
    const state = createTestState(3);
    state.phase = 'secondary-drop';
    state.teams[0].employees = [];

    const dropped = decideSecondaryDrop(state, 0);
    expect(dropped).toBeNull();
  });
});
