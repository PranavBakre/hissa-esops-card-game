import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameConfig, TeamConfig, GameState, EmployeeCard } from '@esop-wars/shared';
import { GAME, TEAM_DEFINITIONS } from '@esop-wars/shared';
import {
  createInitialState,
  registerTeam,
  isPhaseComplete,
  advancePhase,
  dropCard,
  drawCard,
  skipDraw,
  lockSetup,
  placeBid,
  closeBidding,
  skipCard,
  selectWildcard,
  allWildcardsSelected,
  applyWildcards,
  drawMarketCard,
  applyMarketEffects,
  applyMarketLeaderBonus,
  applyWildcardModifiers,
  dropEmployee,
  allEmployeesDropped,
  populateSecondaryPool,
  closeSecondaryBidding,
  drawExit,
  allExitsChosen,
  applyExitMultipliers,
  getOpsDiscount,
  getEffectiveEsopCost,
  canTeamAct,
  getActiveTeams,
  getWinners,
} from './game-engine';
import { employeeCards } from './data';

// ===========================================
// Test Helpers
// ===========================================

function createTestConfig(teamCount: number, options?: { bots?: boolean[] }): GameConfig {
  const teams: TeamConfig[] = [];
  for (let i = 0; i < teamCount; i++) {
    const def = TEAM_DEFINITIONS[i];
    teams.push({
      name: def.name,
      color: def.color,
      playerId: options?.bots?.[i] ? null : `player-${i}`,
      isBot: options?.bots?.[i] ?? false,
    });
  }
  return {
    teams,
    initialValuation: GAME.INITIAL_VALUATION,
    initialEsop: GAME.INITIAL_ESOP,
  };
}

function createTestState(teamCount: number = 5): GameState {
  return createInitialState(createTestConfig(teamCount));
}

/** Register all teams so we can advance past registration */
function registerAllTeams(state: GameState): GameState {
  let s = state;
  s.teams.forEach((_, i) => {
    s = registerTeam(s, i, `Startup ${i}`, `Problem ${i}`);
  });
  return s;
}

/** Advance through setup by making each team drop+skip for 3 rounds, then lock */
function completeSetup(state: GameState): GameState {
  let s = advancePhase(state); // registration -> setup

  // 3 rounds of drop + skip for each team
  for (let round = 0; round < GAME.SETUP_ROUNDS; round++) {
    for (let teamIdx = 0; teamIdx < s.teams.length; teamIdx++) {
      const team = s.teams[teamIdx];
      if (team.setupHand.length > 0) {
        s = dropCard(s, teamIdx, team.setupHand[0].id, !('type' in team.setupHand[0]));
      }
      s = skipDraw(s, teamIdx);
    }
  }

  // Lock setup for each team
  for (let teamIdx = 0; teamIdx < s.teams.length; teamIdx++) {
    const team = s.teams[teamIdx];
    const segment = team.setupHand.find((c) => !('type' in c));
    const idea = team.setupHand.find((c) => 'type' in c);
    if (segment && idea) {
      s = lockSetup(s, teamIdx, segment.id, idea.id);
    }
  }

  return s;
}

// ===========================================
// State Creation
// ===========================================

describe('createInitialState', () => {
  it('creates correct number of teams', () => {
    for (const count of [2, 3, 4, 5]) {
      const state = createTestState(count);
      expect(state.teams).toHaveLength(count);
    }
  });

  it('sets initial team values correctly', () => {
    const state = createTestState(3);
    for (const team of state.teams) {
      expect(team.valuation).toBe(GAME.INITIAL_VALUATION);
      expect(team.esopRemaining).toBe(GAME.INITIAL_ESOP);
      expect(team.employees).toHaveLength(0);
      expect(team.isComplete).toBe(false);
      expect(team.isDisqualified).toBe(false);
      expect(team.lockedSegment).toBeNull();
      expect(team.lockedIdea).toBeNull();
      expect(team.wildcardUsed).toBe(false);
      expect(team.exitChoice).toBeNull();
    }
  });

  it('starts in registration phase', () => {
    const state = createTestState(3);
    expect(state.phase).toBe('registration');
  });

  it('scales employee deck for 2 teams (8 cards)', () => {
    const state = createTestState(2);
    expect(state.employeeDeck).toHaveLength(8);
  });

  it('scales employee deck for 3 teams (12 cards)', () => {
    const state = createTestState(3);
    expect(state.employeeDeck).toHaveLength(12);
  });

  it('scales employee deck for 4 teams (16 cards)', () => {
    const state = createTestState(4);
    expect(state.employeeDeck).toHaveLength(16);
  });

  it('uses all 18 cards for 5 teams', () => {
    const state = createTestState(5);
    expect(state.employeeDeck).toHaveLength(18);
  });

  it('maintains category balance in scaled decks', () => {
    const expectedDistribution: Record<number, Record<string, number>> = {
      2: { Engineering: 2, Product: 2, Sales: 2, Ops: 1, Finance: 1 },
      3: { Engineering: 3, Product: 3, Sales: 2, Ops: 2, Finance: 2 },
      4: { Engineering: 4, Product: 4, Sales: 3, Ops: 3, Finance: 2 },
    };

    for (const teamCount of [2, 3, 4]) {
      const state = createTestState(teamCount);
      const counts: Record<string, number> = {};
      for (const card of state.employeeDeck) {
        counts[card.category] = (counts[card.category] ?? 0) + 1;
      }
      expect(counts).toEqual(expectedDistribution[teamCount]);
    }
  });

  it('does not include reserve employees in main deck', () => {
    const state = createTestState(5);
    const deckIds = new Set(state.employeeDeck.map((c) => c.id));
    // Reserve IDs are 19, 20, 21
    expect(deckIds.has(19)).toBe(false);
    expect(deckIds.has(20)).toBe(false);
    expect(deckIds.has(21)).toBe(false);
  });

  it('stores reserve employees separately', () => {
    const state = createTestState(5);
    expect(state.reserveEmployees).toHaveLength(3);
  });

  it('has segment, idea, and market decks', () => {
    const state = createTestState(3);
    expect(state.segmentDeck.length).toBeGreaterThan(0);
    expect(state.ideaDeck.length).toBeGreaterThan(0);
    expect(state.marketDeck.length).toBeGreaterThan(0);
  });
});

// ===========================================
// Registration
// ===========================================

describe('registration', () => {
  it('registerTeam updates name and problem statement', () => {
    const state = createTestState(3);
    const updated = registerTeam(state, 0, 'My Startup', 'Solve world hunger');
    expect(updated.teams[0].name).toBe('My Startup');
    expect(updated.teams[0].problemStatement).toBe('Solve world hunger');
  });

  it('isPhaseComplete returns false when teams have default names', () => {
    const state = createTestState(3);
    expect(isPhaseComplete(state)).toBe(false);
  });

  it('isPhaseComplete returns false when some teams still have default names', () => {
    let state = createTestState(3);
    state = registerTeam(state, 0, 'My Startup', 'Problem');
    state = registerTeam(state, 1, 'Other Startup', 'Problem');
    // Team 2 still has default name "Gamma"
    expect(isPhaseComplete(state)).toBe(false);
  });

  it('isPhaseComplete returns true when all teams renamed', () => {
    const state = registerAllTeams(createTestState(3));
    expect(isPhaseComplete(state)).toBe(true);
  });

  it('works with 2-team games', () => {
    const state = registerAllTeams(createTestState(2));
    expect(isPhaseComplete(state)).toBe(true);
  });
});

// ===========================================
// Setup Phase
// ===========================================

describe('setup phase', () => {
  let state: GameState;

  beforeEach(() => {
    const registered = registerAllTeams(createTestState(3));
    state = advancePhase(registered); // -> setup
  });

  it('deals 5 cards per team (1 segment + 4 ideas)', () => {
    for (const team of state.teams) {
      expect(team.setupHand).toHaveLength(5);
      const segments = team.setupHand.filter((c) => !('type' in c));
      const ideas = team.setupHand.filter((c) => 'type' in c);
      expect(segments).toHaveLength(1);
      expect(ideas).toHaveLength(4);
    }
  });

  it('starts at round 0, drop phase, turn 0', () => {
    expect(state.setupRound).toBe(0);
    expect(state.setupPhase).toBe('drop');
    expect(state.setupDraftTurn).toBe(0);
  });

  it('dropCard removes card from hand and adds to discard', () => {
    const cardId = state.teams[0].setupHand[0].id;
    const isSegment = !('type' in state.teams[0].setupHand[0]);
    const updated = dropCard(state, 0, cardId, isSegment);

    expect(updated.teams[0].setupHand).toHaveLength(4);
    expect(updated.setupDiscard).toHaveLength(1);
    expect(updated.setupPhase).toBe('draw');
  });

  it('drawCard pulls from segment deck', () => {
    // Drop first, then draw
    const cardId = state.teams[0].setupHand[0].id;
    const isSegment = !('type' in state.teams[0].setupHand[0]);
    let s = dropCard(state, 0, cardId, isSegment);

    const segDeckBefore = s.segmentDeck.length;
    s = drawCard(s, 0, 'segment');
    expect(s.segmentDeck).toHaveLength(segDeckBefore - 1);
    // Hand should be back to 5 (dropped 1, drew 1)
    expect(s.teams[0].setupHand).toHaveLength(5);
  });

  it('skipDraw advances turn without changing hand', () => {
    const cardId = state.teams[0].setupHand[0].id;
    const isSegment = !('type' in state.teams[0].setupHand[0]);
    let s = dropCard(state, 0, cardId, isSegment);
    s = skipDraw(s, 0);

    expect(s.teams[0].setupHand).toHaveLength(4);
    expect(s.setupDraftTurn).toBe(1);
  });

  it('completes after 3 rounds', () => {
    let s = state;
    for (let round = 0; round < GAME.SETUP_ROUNDS; round++) {
      for (let teamIdx = 0; teamIdx < s.teams.length; teamIdx++) {
        const team = s.teams[teamIdx];
        if (team.setupHand.length > 0) {
          s = dropCard(s, teamIdx, team.setupHand[0].id, !('type' in team.setupHand[0]));
        }
        s = skipDraw(s, teamIdx);
      }
    }
    expect(s.phase).toBe('setup-lock');
  });

  it('lockSetup sets locked segment and idea', () => {
    // Fast-forward to setup-lock
    let s = state;
    for (let round = 0; round < GAME.SETUP_ROUNDS; round++) {
      for (let teamIdx = 0; teamIdx < s.teams.length; teamIdx++) {
        const team = s.teams[teamIdx];
        if (team.setupHand.length > 0) {
          s = dropCard(s, teamIdx, team.setupHand[0].id, !('type' in team.setupHand[0]));
        }
        s = skipDraw(s, teamIdx);
      }
    }

    const team = s.teams[0];
    const segment = team.setupHand.find((c) => !('type' in c));
    const idea = team.setupHand.find((c) => 'type' in c);

    if (segment && idea) {
      const locked = lockSetup(s, 0, segment.id, idea.id);
      expect(locked.teams[0].lockedSegment).not.toBeNull();
      expect(locked.teams[0].lockedIdea).not.toBeNull();
      expect(locked.teams[0].setupHand).toHaveLength(0);
    }
  });
});

// ===========================================
// Auction
// ===========================================

describe('auction', () => {
  let state: GameState;

  beforeEach(() => {
    const registered = registerAllTeams(createTestState(3));
    state = completeSetup(registered);
    // Advance to auction (setup-lock -> setup-summary -> auction)
    state = advancePhase(state); // -> setup-summary
    state = advancePhase(state); // -> auction
  });

  it('starts in auction phase', () => {
    expect(state.phase).toBe('auction');
  });

  it('placeBid sets current bid', () => {
    const updated = placeBid(state, 0, 2);
    expect(updated.currentBid).toEqual({ teamIndex: 0, amount: 2 });
  });

  it('placeBid rejects bid lower than current', () => {
    let s = placeBid(state, 0, 3);
    s = placeBid(s, 1, 2);
    // Bid should still be from team 0
    expect(s.currentBid).toEqual({ teamIndex: 0, amount: 3 });
  });

  it('placeBid rejects bid exceeding ESOP', () => {
    const s = placeBid(state, 0, 100);
    // No bid set since 100 > 12
    expect(s.currentBid).toBeNull();
  });

  it('closeBidding awards card to winner', () => {
    let s = placeBid(state, 0, 2);
    s = closeBidding(s);
    expect(s.teams[0].employees).toHaveLength(1);
    expect(s.teams[0].esopRemaining).toBeLessThan(GAME.INITIAL_ESOP);
  });

  it('closeBidding with no bids skips card', () => {
    const s = closeBidding(state);
    expect(s.currentCardIndex).toBe(1);
    expect(s.teams.every((t) => t.employees.length === 0)).toBe(true);
  });

  it('closeBidding marks team complete at 3 employees', () => {
    let s = state;
    // Give team 0 three employees
    for (let i = 0; i < 3; i++) {
      s = placeBid(s, 0, 1);
      s = closeBidding(s);
    }
    expect(s.teams[0].isComplete).toBe(true);
  });

  it('closeBidding ends auction when all teams full', () => {
    let s = state;
    // Fill all 3 teams (3 employees each = 9 cards)
    for (let card = 0; card < 12; card++) {
      const teamIdx = card % 3;
      if (s.teams[teamIdx].employees.length < 3) {
        s = placeBid(s, teamIdx, 1);
      }
      s = closeBidding(s);
      if (s.phase !== 'auction') break;
    }
    expect(s.phase).toBe('auction-summary');
  });

  it('skipCard ends auction when all teams full', () => {
    let s = state;
    // Manually fill all teams
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < 3; t++) {
        s = placeBid(s, t, 1);
        s = closeBidding(s);
        if (s.phase !== 'auction') break;
      }
      if (s.phase !== 'auction') break;
    }

    // If still in auction, skip should end it since all teams full
    if (s.phase === 'auction') {
      s = skipCard(s);
      expect(s.phase).toBe('auction-summary');
    }
  });

  it('skipCard ends auction when cards exhausted', () => {
    let s = state;
    // Skip all cards
    for (let i = 0; i < s.employeeDeck.length; i++) {
      s = skipCard(s);
      if (s.phase !== 'auction') break;
    }
    expect(s.phase).toBe('auction-summary');
  });

  it('applies missing employee penalty ($1M each)', () => {
    let s = state;
    // Skip all cards so no one gets hired
    for (let i = 0; i < s.employeeDeck.length; i++) {
      s = skipCard(s);
      if (s.phase !== 'auction') break;
    }
    // Each team missing 3 employees = $3M penalty
    for (const team of s.teams) {
      expect(team.valuation).toBe(GAME.INITIAL_VALUATION - 3_000_000);
    }
  });

  it('applies Ops ESOP discount after first ops hire', () => {
    const mockTeam = {
      employees: [{ category: 'Ops' }],
    };
    // @ts-expect-error - partial team for testing
    expect(getOpsDiscount(mockTeam)).toBe(0.1);
    // @ts-expect-error - partial team for testing
    expect(getEffectiveEsopCost(mockTeam, 2)).toBeCloseTo(1.8);
  });

  it('no Ops discount without Ops hire', () => {
    const mockTeam = {
      employees: [{ category: 'Engineering' }],
    };
    // @ts-expect-error - partial team for testing
    expect(getOpsDiscount(mockTeam)).toBe(0);
  });
});

// ===========================================
// Market Rounds
// ===========================================

describe('market rounds', () => {
  it('drawMarketCard pops from deck', () => {
    let state = createTestState(3);
    state.phase = 'seed';
    const deckBefore = state.marketDeck.length;
    state = drawMarketCard(state);
    expect(state.marketDeck).toHaveLength(deckBefore - 1);
    expect(state.currentMarketCard).not.toBeNull();
  });

  it('applyMarketEffects changes valuations and records performance', () => {
    let state = createTestState(3);
    state = registerAllTeams(state);
    state = completeSetup(state);
    state = advancePhase(state); // -> setup-summary
    state = advancePhase(state); // -> auction

    // Give each team one employee so market effects apply
    for (let t = 0; t < 3; t++) {
      state = placeBid(state, t, 1);
      state = closeBidding(state);
    }

    // Skip remaining cards to end auction
    while (state.phase === 'auction') {
      state = skipCard(state);
    }

    state = advancePhase(state); // auction-summary -> seed
    state = drawMarketCard(state);
    const prevValuations = state.teams.map((t) => t.valuation);
    state = applyMarketEffects(state);

    expect(state.roundPerformance).toHaveLength(3);
    // At least some valuations should change (employees have skills)
    const changed = state.teams.some((t, i) => t.valuation !== prevValuations[i]);
    expect(changed).toBe(true);
  });

  it('applyMarketLeaderBonus: 2 teams → 1 leader', () => {
    let state = createTestState(2);
    state.teams[0].currentGain = 1000;
    state.teams[1].currentGain = 500;
    state = applyMarketLeaderBonus(state);
    expect(state.teams[0].isMarketLeader).toBe(true);
    expect(state.teams[1].isMarketLeader).toBe(false);
  });

  it('applyMarketLeaderBonus: 3 teams → 1 leader', () => {
    let state = createTestState(3);
    state.teams[0].currentGain = 1000;
    state.teams[1].currentGain = 500;
    state.teams[2].currentGain = 200;
    state = applyMarketLeaderBonus(state);
    const leaders = state.teams.filter((t) => t.isMarketLeader);
    expect(leaders).toHaveLength(1);
  });

  it('applyMarketLeaderBonus: 4 teams → 2 leaders', () => {
    let state = createTestState(4);
    state.teams[0].currentGain = 1000;
    state.teams[1].currentGain = 800;
    state.teams[2].currentGain = 500;
    state.teams[3].currentGain = 200;
    state = applyMarketLeaderBonus(state);
    const leaders = state.teams.filter((t) => t.isMarketLeader);
    expect(leaders).toHaveLength(2);
  });

  it('applyMarketLeaderBonus: 5 teams → 2 leaders', () => {
    let state = createTestState(5);
    state.teams[0].currentGain = 1000;
    state.teams[1].currentGain = 800;
    state.teams[2].currentGain = 500;
    state.teams[3].currentGain = 300;
    state.teams[4].currentGain = 100;
    state = applyMarketLeaderBonus(state);
    const leaders = state.teams.filter((t) => t.isMarketLeader);
    expect(leaders).toHaveLength(2);
  });

  it('market leader gets 20% valuation bonus', () => {
    let state = createTestState(2);
    state.teams[0].valuation = 10_000_000;
    state.teams[0].currentGain = 1000;
    state.teams[1].valuation = 8_000_000;
    state.teams[1].currentGain = 500;
    state = applyMarketLeaderBonus(state);
    expect(state.teams[0].valuation).toBe(12_000_000); // 10M * 1.2
  });
});

// ===========================================
// Wildcards
// ===========================================

describe('wildcards', () => {
  it('selectWildcard records choice', () => {
    let state = createTestState(3);
    state.wildcardPhase = true;
    state = selectWildcard(state, 0, 'double-down');
    expect(state.teamWildcardSelections[0]).toBe('double-down');
  });

  it('forces pass when wildcard already used', () => {
    let state = createTestState(3);
    state.wildcardPhase = true;
    state.teams[0].wildcardUsed = true;
    state = selectWildcard(state, 0, 'double-down');
    expect(state.teamWildcardSelections[0]).toBe('pass');
  });

  it('allWildcardsSelected checks all active teams', () => {
    let state = createTestState(3);
    state.wildcardPhase = true;
    expect(allWildcardsSelected(state)).toBe(false);
    state = selectWildcard(state, 0, 'pass');
    state = selectWildcard(state, 1, 'pass');
    expect(allWildcardsSelected(state)).toBe(false);
    state = selectWildcard(state, 2, 'pass');
    expect(allWildcardsSelected(state)).toBe(true);
  });

  it('applyWildcards marks wildcards as used', () => {
    let state = createTestState(3);
    state.wildcardPhase = true;
    state = selectWildcard(state, 0, 'double-down');
    state = selectWildcard(state, 1, 'shield');
    state = selectWildcard(state, 2, 'pass');
    state = applyWildcards(state);
    expect(state.teams[0].wildcardUsed).toBe(true);
    expect(state.teams[1].wildcardUsed).toBe(true);
    expect(state.teams[2].wildcardUsed).toBe(false);
    expect(state.wildcardPhase).toBe(false);
  });

  it('double-down doubles the round gain', () => {
    let state = createTestState(2);
    state.teams[0].previousValuation = 10_000_000;
    state.teams[0].valuation = 12_000_000; // gained 2M
    state.teams[0].wildcardActiveThisRound = 'double-down';
    state.roundPerformance = [{
      teamIndex: 0,
      previousValuation: 10_000_000,
      newValuation: 12_000_000,
      gain: 2_000_000,
      percentChange: 20,
    }];
    state = applyWildcardModifiers(state);
    expect(state.teams[0].valuation).toBe(14_000_000); // 12M + 2M doubled
  });

  it('shield reverts losses', () => {
    let state = createTestState(2);
    state.teams[0].previousValuation = 10_000_000;
    state.teams[0].valuation = 8_000_000; // lost 2M
    state.teams[0].wildcardActiveThisRound = 'shield';
    state.roundPerformance = [{
      teamIndex: 0,
      previousValuation: 10_000_000,
      newValuation: 8_000_000,
      gain: -2_000_000,
      percentChange: -20,
    }];
    state = applyWildcardModifiers(state);
    expect(state.teams[0].valuation).toBe(10_000_000); // restored
  });

  it('shield does nothing on gains', () => {
    let state = createTestState(2);
    state.teams[0].previousValuation = 10_000_000;
    state.teams[0].valuation = 12_000_000; // gained 2M
    state.teams[0].wildcardActiveThisRound = 'shield';
    state.roundPerformance = [{
      teamIndex: 0,
      previousValuation: 10_000_000,
      newValuation: 12_000_000,
      gain: 2_000_000,
      percentChange: 20,
    }];
    state = applyWildcardModifiers(state);
    expect(state.teams[0].valuation).toBe(12_000_000); // unchanged
  });
});

// ===========================================
// Secondary Market
// ===========================================

describe('secondary market', () => {
  it('dropEmployee removes employee from team', () => {
    let state = createTestState(2);
    // Manually add an employee
    state.phase = 'secondary-drop';
    state.teams[0].employees = [{
      id: 1, name: 'Test', role: 'Test', category: 'Engineering',
      hardSkill: 0.5, softSkills: {}, bidAmount: 3,
    }];
    state = dropEmployee(state, 0, 1);
    expect(state.teams[0].employees).toHaveLength(0);
  });

  it('dropEmployee refunds 50% of bid ESOP', () => {
    let state = createTestState(2);
    state.phase = 'secondary-drop';
    state.teams[0].esopRemaining = 8;
    state.teams[0].employees = [{
      id: 1, name: 'Test', role: 'Test', category: 'Engineering',
      hardSkill: 0.5, softSkills: {}, bidAmount: 4,
    }];
    state = dropEmployee(state, 0, 1);
    expect(state.teams[0].esopRemaining).toBe(10); // 8 + 50% of 4
  });

  it('dropEmployee adds to dropped list', () => {
    let state = createTestState(2);
    state.phase = 'secondary-drop';
    state.teams[0].employees = [{
      id: 1, name: 'Test', role: 'Test', category: 'Engineering',
      hardSkill: 0.5, softSkills: {}, bidAmount: 2,
    }];
    state = dropEmployee(state, 0, 1);
    expect(state.droppedEmployees).toHaveLength(1);
    expect(state.droppedEmployees[0].fromTeamIndex).toBe(0);
  });

  it('allEmployeesDropped checks all active teams', () => {
    let state = createTestState(2);
    state.phase = 'secondary-drop';
    state.teams[0].employees = [{
      id: 1, name: 'A', role: 'A', category: 'Engineering',
      hardSkill: 0.5, softSkills: {}, bidAmount: 2,
    }];
    state.teams[1].employees = [{
      id: 2, name: 'B', role: 'B', category: 'Sales',
      hardSkill: 0.5, softSkills: {}, bidAmount: 2,
    }];

    state = dropEmployee(state, 0, 1);
    expect(allEmployeesDropped(state)).toBe(false);
    state = dropEmployee(state, 1, 2);
    expect(allEmployeesDropped(state)).toBe(true);
  });

  it('populateSecondaryPool includes dropped + reserve employees', () => {
    let state = createTestState(2);
    state.droppedEmployees = [
      { employee: { id: 1, name: 'A', role: 'A', category: 'Engineering', hardSkill: 0.5, softSkills: {} }, fromTeamIndex: 0 },
      { employee: { id: 2, name: 'B', role: 'B', category: 'Sales', hardSkill: 0.5, softSkills: {} }, fromTeamIndex: 1 },
    ];
    state = populateSecondaryPool(state);
    // 2 dropped + 3 reserve = 5
    expect(state.secondaryPool).toHaveLength(5);
  });
});

// ===========================================
// Exit
// ===========================================

describe('exit', () => {
  it('drawExit assigns card and advances turn', () => {
    let state = createTestState(3);
    state.phase = 'exit';
    state.exitDeck = [
      { id: 1, name: 'IPO', multiplier: 2.0, description: '' },
      { id: 2, name: 'Fire Sale', multiplier: 0.5, description: '' },
      { id: 3, name: 'Merger', multiplier: 1.3, description: '' },
    ];
    state.currentExitTurn = 0;

    state = drawExit(state, 0);
    expect(state.teams[0].exitChoice).not.toBeNull();
    expect(state.currentExitTurn).toBeGreaterThan(0);
  });

  it('allExitsChosen returns true when all active teams drawn', () => {
    let state = createTestState(2);
    state.phase = 'exit';
    state.exitDeck = [
      { id: 1, name: 'IPO', multiplier: 2.0, description: '' },
      { id: 2, name: 'Fire Sale', multiplier: 0.5, description: '' },
    ];
    state.currentExitTurn = 0;

    state = drawExit(state, 0);
    expect(allExitsChosen(state)).toBe(false);
    state = drawExit(state, 1);
    expect(allExitsChosen(state)).toBe(true);
  });

  it('applyExitMultipliers multiplies valuations', () => {
    let state = createTestState(2);
    state.teams[0].valuation = 10_000_000;
    state.teams[0].exitChoice = { id: 1, name: 'IPO', multiplier: 2.0, description: '' };
    state.teams[1].valuation = 10_000_000;
    state.teams[1].exitChoice = { id: 6, name: 'Fire Sale', multiplier: 0.5, description: '' };

    state = applyExitMultipliers(state);
    expect(state.teams[0].valuation).toBe(20_000_000);
    expect(state.teams[1].valuation).toBe(5_000_000);
    expect(state.phase).toBe('winner');
  });
});

// ===========================================
// Phase Flow
// ===========================================

describe('advancePhase', () => {
  it('follows correct phase order', () => {
    const expectedOrder = [
      'registration', 'setup', 'setup-lock', 'setup-summary',
      'auction', 'auction-summary', 'seed', 'early',
      'secondary-drop', 'secondary-hire', 'mature', 'exit', 'winner',
    ];

    let state = createTestState(2);
    const phases: string[] = [state.phase];
    for (let i = 0; i < expectedOrder.length - 1; i++) {
      state = advancePhase(state);
      phases.push(state.phase);
    }
    expect(phases).toEqual(expectedOrder);
  });
});

// ===========================================
// Query Functions
// ===========================================

describe('query functions', () => {
  it('canTeamAct returns false for disqualified team', () => {
    let state = createTestState(2);
    state.teams[0].isDisqualified = true;
    expect(canTeamAct(state, 0)).toBe(false);
  });

  it('getActiveTeams filters disqualified', () => {
    let state = createTestState(3);
    state.teams[1].isDisqualified = true;
    expect(getActiveTeams(state)).toHaveLength(2);
  });

  it('getWinners returns null outside winner phase', () => {
    const state = createTestState(2);
    expect(getWinners(state)).toBeNull();
  });

  it('getWinners returns founder and employer', () => {
    let state = createTestState(2);
    state.phase = 'winner';
    state.teams[0].valuation = 30_000_000;
    state.teams[0].employees = [
      { id: 1, name: 'A', role: 'A', category: 'Engineering', hardSkill: 0.5, softSkills: {}, bidAmount: 5 },
    ];
    state.teams[1].valuation = 20_000_000;
    state.teams[1].employees = [
      { id: 2, name: 'B', role: 'B', category: 'Sales', hardSkill: 0.5, softSkills: {}, bidAmount: 8 },
    ];

    const winners = getWinners(state);
    expect(winners).not.toBeNull();
    expect(winners!.founder.name).toBe(state.teams[0].name);
    expect(winners!.employer.name).toBe(state.teams[1].name);
    expect(winners!.sameTeam).toBe(false);
  });
});
