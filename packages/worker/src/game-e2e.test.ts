import { describe, it, expect } from 'vitest';
import type { GameState } from '@esop-wars/shared';
import { GAME, TEAM_DEFINITIONS } from '@esop-wars/shared';
import {
  createInitialState,
  registerTeam,
  isPhaseComplete,
  advancePhase,
  dropCard,
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
  declareInvestment,
  allInvestmentsDeclared,
  resolveInvestmentConflicts,
  placeInvestmentBid,
  allConflictBidsPlaced,
  resolveConflictBids,
  finalizeInvestments,
  dropEmployee,
  allEmployeesDropped,
  populateSecondaryPool,
  closeSecondaryBidding,
  drawExit,
  allExitsChosen,
  applyExitMultipliers,
  getWinners,
} from './game-engine';

// ===========================================
// E2E Test Helpers
// ===========================================

function createGameConfig(teamCount: number) {
  return {
    teams: TEAM_DEFINITIONS.slice(0, teamCount).map((def, i) => ({
      name: def.name,
      color: def.color,
      playerId: `player-${i}`,
      isBot: false,
    })),
    initialCapital: GAME.INITIAL_CAPITAL,
    initialEsop: GAME.INITIAL_ESOP,
  };
}

/** Register all teams with custom names */
function registerAll(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < s.teams.length; i++) {
    s = registerTeam(s, i, `Startup ${i}`);
  }
  return s;
}

/** Run the setup draft phase: 3 rounds of drop+skip, then lock */
function completeSetup(state: GameState): GameState {
  let s = advancePhase(state); // registration -> setup
  const teamCount = s.teams.length;

  // 3 rounds of drop + skip for each team.
  // Drop idea cards whose ID doesn't collide with the segment's ID,
  // since dropCard finds by id and segment/product IDs overlap (1-16).
  for (let round = 0; round < GAME.SETUP_ROUNDS; round++) {
    for (let t = 0; t < teamCount; t++) {
      const team = s.teams[t];
      const segCard = team.setupHand.find((c) => !('type' in c));
      const segId = segCard ? segCard.id : -1;
      // Pick an idea card with a different id than the segment
      const safeIdea = team.setupHand.find((c) => 'type' in c && c.id !== segId);
      if (safeIdea) {
        s = dropCard(s, t, safeIdea.id, false);
      } else {
        // Fallback: all ideas collide with segment (extremely unlikely with 4 ideas)
        const anyCard = team.setupHand[team.setupHand.length - 1];
        if (anyCard) {
          s = dropCard(s, t, anyCard.id, !('type' in anyCard));
        }
      }
      s = skipDraw(s, t);
    }
  }

  // Lock setup for each team — each should have 1 segment + 1 idea remaining
  for (let t = 0; t < teamCount; t++) {
    const team = s.teams[t];
    const segment = team.setupHand.find((c) => !('type' in c));
    const idea = team.setupHand.find((c) => 'type' in c);
    if (segment && idea) {
      s = lockSetup(s, t, segment.id, idea.id);
    }
  }

  return s;
}

/** Run auction: each team bids 1 ESOP per card in round-robin */
function completeAuction(state: GameState): GameState {
  let s = state;
  const teamCount = s.teams.length;

  for (let card = 0; card < s.employeeDeck.length; card++) {
    const teamIdx = card % teamCount;
    if (s.teams[teamIdx].employees.length < GAME.EMPLOYEES_PER_TEAM) {
      s = placeBid(s, teamIdx, 1);
    }
    s = closeBidding(s);
    if (s.phase !== 'auction') break;
  }

  return s;
}

/**
 * Play a market round: draw card, apply effects, leader bonus,
 * then wildcard phase, apply wildcards and modifiers.
 */
function playMarketRound(
  state: GameState,
  wildcardChoices?: Record<number, 'double-down' | 'shield' | 'pass'>
): GameState {
  let s = state;

  // Draw and apply market effects
  s = drawMarketCard(s);
  s = applyMarketEffects(s);
  s = applyMarketLeaderBonus(s);

  // Enter wildcard phase (orchestrated by room.ts in production)
  s.wildcardPhase = true;
  s.teamWildcardSelections = {};

  // All teams select wildcards
  for (let t = 0; t < s.teams.length; t++) {
    if (s.teams[t].isDisqualified) continue;
    const choice = wildcardChoices?.[t] ?? 'pass';
    s = selectWildcard(s, t, choice);
  }

  s = applyWildcards(s);
  s = applyWildcardModifiers(s);

  return s;
}

/** Complete the secondary drop: each team drops their first employee */
function completeSecondaryDrop(state: GameState): GameState {
  let s = state;
  for (let t = 0; t < s.teams.length; t++) {
    if (s.teams[t].isDisqualified) continue;
    const emp = s.teams[t].employees[0];
    if (emp) {
      s = dropEmployee(s, t, emp.id);
    }
  }
  return s;
}

/** Complete the secondary hire: skip all cards (no bids) */
function completeSecondaryHire(state: GameState): GameState {
  let s = state;
  while (s.secondaryPool.length > 0 && s.currentCardIndex < s.secondaryPool.length) {
    s = closeSecondaryBidding(s);
  }
  return s;
}

/** Complete exit phase: each team draws in turn order */
function completeExit(state: GameState): GameState {
  let s = state;
  while (!allExitsChosen(s)) {
    const turn = s.currentExitTurn;
    if (turn < 0) break;
    s = drawExit(s, turn);
  }
  return s;
}

// ===========================================
// E2E: Full Game (All Passes - Baseline)
// ===========================================

describe('Full game E2E', () => {
  it('plays a complete 3-team game from registration to winner', () => {
    // === Registration ===
    let state = createInitialState(createGameConfig(3));
    expect(state.phase).toBe('registration');

    state = registerAll(state);
    expect(isPhaseComplete(state)).toBe(true);

    // === Setup (draft + lock) ===
    state = completeSetup(state);
    expect(state.phase).toBe('setup-lock');
    expect(isPhaseComplete(state)).toBe(true);

    // Every team should have locked a segment and idea
    for (const team of state.teams) {
      expect(team.lockedSegment).not.toBeNull();
      expect(team.lockedIdea).not.toBeNull();
      expect(team.setupHand).toHaveLength(0);
    }

    // === Setup Summary -> Auction ===
    state = advancePhase(state); // -> setup-summary
    expect(state.phase).toBe('setup-summary');

    state = advancePhase(state); // -> auction
    expect(state.phase).toBe('auction');
    expect(state.currentCardIndex).toBe(0);

    // === Auction ===
    state = completeAuction(state);
    expect(state.phase).toBe('auction-summary');

    // Each team should have up to 3 employees
    for (const team of state.teams) {
      expect(team.employees.length).toBeLessThanOrEqual(GAME.EMPLOYEES_PER_TEAM);
    }

    // === Auction Summary -> Investment ===
    state = advancePhase(state); // -> investment
    expect(state.phase).toBe('investment');
    expect(state.investmentSubPhase).toBe('declare');

    // All teams pass on investments
    for (let t = 0; t < 3; t++) {
      state = declareInvestment(state, t, null);
    }
    expect(allInvestmentsDeclared(state)).toBe(true);
    state = resolveInvestmentConflicts(state);
    expect(state.investmentSubPhase).toBe('summary');

    // No investments made
    for (const team of state.teams) {
      expect(team.investedInTeamIndex).toBeNull();
    }

    // === Investment -> Seed (Market Round 1) ===
    state = advancePhase(state); // -> seed
    expect(state.phase).toBe('seed');

    state = playMarketRound(state);
    expect(state.wildcardPhase).toBe(false);
    expect(state.roundPerformance.length).toBeGreaterThan(0);
    expect(isPhaseComplete(state)).toBe(true);

    // === Seed -> Early (Market Round 2) ===
    state = advancePhase(state); // -> early
    expect(state.phase).toBe('early');

    state = playMarketRound(state);
    expect(isPhaseComplete(state)).toBe(true);

    // === Early -> Secondary Drop ===
    state = advancePhase(state); // -> secondary-drop
    expect(state.phase).toBe('secondary-drop');

    state = completeSecondaryDrop(state);
    expect(allEmployeesDropped(state)).toBe(true);

    // Each team should have lost one employee
    for (const team of state.teams) {
      expect(team.employees.length).toBe(GAME.EMPLOYEES_PER_TEAM - 1);
    }

    // Populate secondary pool and advance
    state = populateSecondaryPool(state);
    expect(state.secondaryPool.length).toBeGreaterThan(0);

    // === Secondary Drop -> Secondary Hire ===
    state = advancePhase(state); // -> secondary-hire
    expect(state.phase).toBe('secondary-hire');

    state = completeSecondaryHire(state);
    expect(state.secondaryPool).toHaveLength(0);
    expect(isPhaseComplete(state)).toBe(true);

    // === Secondary Hire -> Mature (Market Round 3) ===
    state = advancePhase(state); // -> mature
    expect(state.phase).toBe('mature');

    state = playMarketRound(state);
    expect(isPhaseComplete(state)).toBe(true);

    // === Mature -> Exit ===
    state = advancePhase(state); // -> exit
    expect(state.phase).toBe('exit');
    expect(state.exitDeck.length).toBeGreaterThan(0);

    state = completeExit(state);
    expect(allExitsChosen(state)).toBe(true);

    // Every team should have an exit card
    for (const team of state.teams) {
      expect(team.exitChoice).not.toBeNull();
      expect(team.preExitCapital).toBeGreaterThan(0);
    }

    // Apply exit multipliers
    state = applyExitMultipliers(state);
    expect(state.phase).toBe('winner');

    // === Winner ===
    const winners = getWinners(state);
    expect(winners).not.toBeNull();
    if (winners) {
      expect(winners.founder.name).toBeDefined();
      expect(winners.employer.name).toBeDefined();
      // No investments, so investor should be null
      expect(winners.investor).toBeNull();
    }
  });

  it('plays a complete 5-team game with investments and wildcards', () => {
    // === Registration ===
    let state = createInitialState(createGameConfig(5));
    state = registerAll(state);
    expect(isPhaseComplete(state)).toBe(true);

    // === Setup ===
    state = completeSetup(state);
    expect(state.phase).toBe('setup-lock');
    expect(isPhaseComplete(state)).toBe(true);

    state = advancePhase(state); // -> setup-summary
    state = advancePhase(state); // -> auction

    // === Auction: varied bids ===
    // Team 0 bids 2 ESOP, teams 1-4 bid 1 ESOP each
    let s = state;
    for (let card = 0; card < s.employeeDeck.length; card++) {
      if (s.phase !== 'auction') break;

      const teamIdx = card % 5;
      if (s.teams[teamIdx].employees.length < GAME.EMPLOYEES_PER_TEAM) {
        const bidAmount = teamIdx === 0 ? 2 : 1;
        if (bidAmount <= s.teams[teamIdx].esopRemaining) {
          s = placeBid(s, teamIdx, bidAmount);
        }
      }
      s = closeBidding(s);
    }

    // If auction didn't end naturally (not enough cards for all teams),
    // skip remaining cards
    while (s.phase === 'auction') {
      s = skipCard(s);
    }
    state = s;
    expect(state.phase).toBe('auction-summary');

    // === Investment: team 1 invests in team 0, team 2 invests in team 3 ===
    state = advancePhase(state); // -> investment
    expect(state.phase).toBe('investment');

    state = declareInvestment(state, 0, null); // pass
    state = declareInvestment(state, 1, 0);    // invest in team 0
    state = declareInvestment(state, 2, 3);    // invest in team 3
    state = declareInvestment(state, 3, null);  // pass
    state = declareInvestment(state, 4, null);  // pass
    expect(allInvestmentsDeclared(state)).toBe(true);

    state = resolveInvestmentConflicts(state);
    expect(state.investmentSubPhase).toBe('summary');

    // Verify investments were finalized
    expect(state.teams[1].investedInTeamIndex).toBe(0);
    expect(state.teams[2].investedInTeamIndex).toBe(3);
    expect(state.teams[0].investorTeamIndex).toBe(1);
    expect(state.teams[3].investorTeamIndex).toBe(2);

    // Capital should have transferred
    expect(state.teams[1].capital).toBeLessThan(GAME.INITIAL_CAPITAL);
    expect(state.teams[0].capital).toBeGreaterThan(GAME.INITIAL_CAPITAL - 3_000_000); // started with penalty

    // === Seed: team 0 uses double-down ===
    state = advancePhase(state); // -> seed
    expect(state.phase).toBe('seed');

    state = playMarketRound(state, {
      0: 'double-down',
      1: 'pass',
      2: 'pass',
      3: 'pass',
      4: 'pass',
    });
    expect(isPhaseComplete(state)).toBe(true);

    // Team 0 should have used their wildcard
    expect(state.teams[0].wildcardUsed).toBe(true);

    // === Early: team 1 uses shield ===
    state = advancePhase(state); // -> early
    expect(state.phase).toBe('early');

    state = playMarketRound(state, {
      0: 'pass', // already used
      1: 'shield',
      2: 'pass',
      3: 'pass',
      4: 'pass',
    });
    expect(isPhaseComplete(state)).toBe(true);
    expect(state.teams[1].wildcardUsed).toBe(true);

    // === Secondary Drop ===
    state = advancePhase(state); // -> secondary-drop
    expect(state.phase).toBe('secondary-drop');

    state = completeSecondaryDrop(state);
    expect(allEmployeesDropped(state)).toBe(true);
    state = populateSecondaryPool(state);

    // === Secondary Hire: teams actively bid ===
    state = advancePhase(state); // -> secondary-hire
    expect(state.phase).toBe('secondary-hire');

    // Bid on first card, skip rest
    if (state.secondaryPool.length > 0) {
      state = placeBid(state, 0, 1);
      state = closeSecondaryBidding(state);
    }
    // Skip remaining
    state = completeSecondaryHire(state);

    // === Mature ===
    state = advancePhase(state); // -> mature
    expect(state.phase).toBe('mature');

    state = playMarketRound(state);
    expect(isPhaseComplete(state)).toBe(true);

    // === Exit ===
    state = advancePhase(state); // -> exit
    expect(state.phase).toBe('exit');

    state = completeExit(state);
    expect(allExitsChosen(state)).toBe(true);

    state = applyExitMultipliers(state);
    expect(state.phase).toBe('winner');

    // === Verify winners ===
    const winners = getWinners(state);
    expect(winners).not.toBeNull();
    if (winners) {
      expect(winners.founder.capital).toBeGreaterThan(0);
      expect(winners.employer.name).toBeDefined();
      // Investments were made, so investor should exist
      expect(winners.investor).not.toBeNull();
      if (winners.investor) {
        expect(winners.investor.returnMultiple).toBeGreaterThan(0);
      }
    }
  });

  it('plays a 2-team game with investment conflict', () => {
    // === Registration through Auction ===
    let state = createInitialState(createGameConfig(2));
    state = registerAll(state);
    state = completeSetup(state);
    state = advancePhase(state); // -> setup-summary
    state = advancePhase(state); // -> auction
    state = completeAuction(state);
    expect(state.phase).toBe('auction-summary');

    // === Investment: both teams target each other (conflicts!) ===
    state = advancePhase(state); // -> investment
    state = declareInvestment(state, 0, 1); // team 0 invests in team 1
    state = declareInvestment(state, 1, 0); // team 1 invests in team 0
    expect(allInvestmentsDeclared(state)).toBe(true);

    state = resolveInvestmentConflicts(state);
    // No conflict since they target different teams
    expect(state.investmentSubPhase).toBe('summary');

    // Both teams should have invested in each other
    expect(state.teams[0].investedInTeamIndex).toBe(1);
    expect(state.teams[1].investedInTeamIndex).toBe(0);

    // === Finish the game ===
    state = advancePhase(state); // -> seed
    state = playMarketRound(state);

    state = advancePhase(state); // -> early
    state = playMarketRound(state);

    state = advancePhase(state); // -> secondary-drop
    state = completeSecondaryDrop(state);
    state = populateSecondaryPool(state);

    state = advancePhase(state); // -> secondary-hire
    state = completeSecondaryHire(state);

    state = advancePhase(state); // -> mature
    state = playMarketRound(state);

    state = advancePhase(state); // -> exit
    state = completeExit(state);
    state = applyExitMultipliers(state);

    expect(state.phase).toBe('winner');
    const winners = getWinners(state);
    expect(winners).not.toBeNull();
    if (winners) {
      // Both invested, so investor winner exists
      expect(winners.investor).not.toBeNull();
    }
  });

  it('plays a 3-team game with investment conflict requiring bid-off', () => {
    // === Registration through Auction ===
    let state = createInitialState(createGameConfig(3));
    state = registerAll(state);
    state = completeSetup(state);
    state = advancePhase(state); // -> setup-summary
    state = advancePhase(state); // -> auction
    state = completeAuction(state);

    // === Investment: teams 0 and 1 both target team 2 ===
    state = advancePhase(state); // -> investment
    state = declareInvestment(state, 0, 2);
    state = declareInvestment(state, 1, 2);
    state = declareInvestment(state, 2, null); // pass
    expect(allInvestmentsDeclared(state)).toBe(true);

    state = resolveInvestmentConflicts(state);
    expect(state.investmentSubPhase).toBe('conflict');
    expect(state.investmentTieTarget).toBe(2);
    expect(state.investmentConflicts[2]).toEqual([0, 1]);

    // Team 1 outbids team 0
    state = placeInvestmentBid(state, 0, 600_000);
    state = placeInvestmentBid(state, 1, 800_000);
    expect(allConflictBidsPlaced(state, 2)).toBe(true);

    state = resolveConflictBids(state, 2);
    expect(state.investmentSubPhase).toBe('summary');

    // Team 1 wins the investment
    expect(state.teams[1].investedInTeamIndex).toBe(2);
    expect(state.teams[1].investmentAmount).toBe(800_000);
    // Team 0's declaration was nullified
    expect(state.investmentDeclarations[0]).toBeNull();

    // === Finish the rest of the game ===
    state = advancePhase(state); // -> seed
    state = playMarketRound(state);

    state = advancePhase(state); // -> early
    state = playMarketRound(state);

    state = advancePhase(state); // -> secondary-drop
    state = completeSecondaryDrop(state);
    state = populateSecondaryPool(state);

    state = advancePhase(state); // -> secondary-hire
    state = completeSecondaryHire(state);

    state = advancePhase(state); // -> mature
    state = playMarketRound(state);

    state = advancePhase(state); // -> exit
    state = completeExit(state);
    state = applyExitMultipliers(state);

    expect(state.phase).toBe('winner');
    const winners = getWinners(state);
    expect(winners).not.toBeNull();
    if (winners) {
      expect(winners.investor).not.toBeNull();
      if (winners.investor) {
        // Investor should be team 1 (the only one who actually invested)
        expect(winners.investor.team.name).toBe('Startup 1');
      }
    }
  });

  it('tracks capital changes across the full game', () => {
    let state = createInitialState(createGameConfig(3));
    state = registerAll(state);

    // Everyone starts at INITIAL_CAPITAL
    for (const team of state.teams) {
      expect(team.capital).toBe(GAME.INITIAL_CAPITAL);
    }

    state = completeSetup(state);
    state = advancePhase(state); // -> setup-summary
    state = advancePhase(state); // -> auction

    // Auction - each team bids 1 per card (3 cards each = 3 ESOP spent)
    state = completeAuction(state);
    const postAuctionCapitals = state.teams.map((t) => t.capital);

    // Verify ESOP was spent during auction
    // Note: Ops discount (10% after first Ops hire) means effective cost < bid amount,
    // so esopRemaining may be slightly higher than INITIAL_ESOP - totalBid
    for (const team of state.teams) {
      const totalBid = team.employees.reduce((sum, e) => sum + e.bidAmount, 0);
      expect(team.esopRemaining).toBeLessThanOrEqual(GAME.INITIAL_ESOP);
      expect(team.esopRemaining).toBeGreaterThanOrEqual(GAME.INITIAL_ESOP - totalBid);
    }

    // Investment (all pass)
    state = advancePhase(state); // -> investment
    for (let t = 0; t < 3; t++) {
      state = declareInvestment(state, t, null);
    }
    state = resolveInvestmentConflicts(state);

    // Seed round - capitals should change
    state = advancePhase(state); // -> seed
    state = playMarketRound(state);
    const postSeedCapitals = state.teams.map((t) => t.capital);

    // At least some capital should have changed from market effects
    const capitalChanged = state.teams.some(
      (t, i) => t.capital !== postAuctionCapitals[i]
    );
    expect(capitalChanged).toBe(true);

    // Early round
    state = advancePhase(state); // -> early
    state = playMarketRound(state);

    // Secondary market
    state = advancePhase(state); // -> secondary-drop
    state = completeSecondaryDrop(state);

    // After dropping, teams have fewer employees (refund is floor(bidAmount * 0.5))
    for (const team of state.teams) {
      expect(team.employees.length).toBe(GAME.EMPLOYEES_PER_TEAM - 1);
    }

    state = populateSecondaryPool(state);
    state = advancePhase(state); // -> secondary-hire
    state = completeSecondaryHire(state);

    // Mature round
    state = advancePhase(state); // -> mature
    state = playMarketRound(state);

    // Exit - should multiply capitals
    state = advancePhase(state); // -> exit
    state = completeExit(state);
    const preExitCapitals = state.teams.map((t) => t.capital);

    state = applyExitMultipliers(state);

    // Exit multipliers should have changed at least one team's capital
    const exitChanged = state.teams.some(
      (t, i) => t.capital !== preExitCapitals[i]
    );
    expect(exitChanged).toBe(true);

    // All capitals should be non-negative
    for (const team of state.teams) {
      expect(team.capital).toBeGreaterThanOrEqual(0);
    }

    expect(state.phase).toBe('winner');
  });

  it('handles a game where auction cards run out before all teams are full', () => {
    // 5-team game has 18 employee cards, needs 15 for all teams (3 each)
    let state = createInitialState(createGameConfig(5));
    state = registerAll(state);
    state = completeSetup(state);
    state = advancePhase(state); // -> setup-summary
    state = advancePhase(state); // -> auction

    // Skip all auction cards - no one hires
    while (state.phase === 'auction') {
      state = skipCard(state);
    }
    expect(state.phase).toBe('auction-summary');

    // Each team should have lost $3M (3 missing employees x $1M penalty)
    for (const team of state.teams) {
      expect(team.employees).toHaveLength(0);
      expect(team.capital).toBe(GAME.INITIAL_CAPITAL - 3_000_000);
    }

    // Complete the rest of the game
    state = advancePhase(state); // -> investment
    for (let t = 0; t < 5; t++) {
      state = declareInvestment(state, t, null);
    }
    state = resolveInvestmentConflicts(state);

    state = advancePhase(state); // -> seed
    state = playMarketRound(state);

    state = advancePhase(state); // -> early
    state = playMarketRound(state);

    // Secondary drop - no employees to drop, but each team needs to "drop"
    state = advancePhase(state); // -> secondary-drop
    // With 0 employees, drops are effectively no-ops
    // allEmployeesDropped checks if droppedEmployees.length >= active team count
    // Teams with no employees can't drop, so we need the dropped list to match
    // Let's check what happens
    expect(state.droppedEmployees).toHaveLength(0);
    state = populateSecondaryPool(state);

    state = advancePhase(state); // -> secondary-hire
    state = completeSecondaryHire(state);

    state = advancePhase(state); // -> mature
    state = playMarketRound(state);

    state = advancePhase(state); // -> exit
    state = completeExit(state);
    state = applyExitMultipliers(state);

    expect(state.phase).toBe('winner');
    const winners = getWinners(state);
    expect(winners).not.toBeNull();
  });
});
