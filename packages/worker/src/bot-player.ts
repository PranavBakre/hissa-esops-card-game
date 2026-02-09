// ===========================================
// ESOP Wars v2 - Bot Player AI
// ===========================================

import type {
  GameState,
  Team,
  EmployeeCard,
  SegmentCard,
  IdeaCard,
  WildcardChoice,
} from '@esop-wars/shared';
import { GAME } from '@esop-wars/shared';
import { getSetupBonus } from './data';

// ===========================================
// Bot Timing Constants
// ===========================================

export const BOT_TIMING = {
  MIN_DELAY_MS: 800,
  MAX_DELAY_MS: 2500,
  BID_DELAY_MS: 500,
  LOCK_STAGGER_MS: 300,
};

export function getBotDelay(speedMultiplier: number = 1.0): number {
  const base = BOT_TIMING.MIN_DELAY_MS + Math.random() * (BOT_TIMING.MAX_DELAY_MS - BOT_TIMING.MIN_DELAY_MS);
  return Math.max(10, Math.round(base * speedMultiplier));
}

// ===========================================
// Registration Decisions
// ===========================================

const BOT_NAMES = [
  'Quantum Phoenix Labs',
  'Azure Storm Tech',
  'Golden Nexus AI',
  'Emerald Pulse Systems',
  'Stellar Falcon Ventures',
  'Crimson Wave Co',
  'Lunar Spark Inc',
  'Solar Apex Works',
  'Cosmic Tiger Hub',
  'Prime Dragon Studio',
];

export interface RegistrationDecision {
  name: string;
}

export function decideRegistration(teamIndex: number, usedNames: string[]): RegistrationDecision {
  // Pick an unused name
  let name = BOT_NAMES[teamIndex % BOT_NAMES.length];
  let attempt = 0;
  while (usedNames.includes(name) && attempt < BOT_NAMES.length) {
    attempt++;
    name = BOT_NAMES[(teamIndex + attempt) % BOT_NAMES.length];
  }

  return { name };
}

// ===========================================
// Setup Decisions
// ===========================================

export interface SetupDropDecision {
  cardId: number;
  isSegment: boolean;
}

export function decideSetupDrop(state: GameState, teamIndex: number): SetupDropDecision | null {
  const team = state.teams[teamIndex];
  const hand = team.setupHand;

  if (hand.length === 0) {
    return null;
  }

  // Separate segments and ideas
  const segments = hand.filter((c): c is SegmentCard => !('type' in c));
  const ideas = hand.filter((c): c is IdeaCard => 'type' in c);

  // Score each card based on potential bonuses
  const scoredCards = hand.map((card) => {
    let score = 0;
    const isSegment = !('type' in card);

    if (isSegment) {
      // Score segments by how many ideas they pair with
      const segment = card;
      ideas.forEach((idea) => {
        const bonus = getSetupBonus(segment.name, idea.name);
        if (bonus) {
          score += bonus.bonus.modifier * 10;
        }
      });
    } else {
      // Score ideas by how many segments they pair with
      const idea = card;
      segments.forEach((segment) => {
        const bonus = getSetupBonus(segment.name, idea.name);
        if (bonus) {
          score += bonus.bonus.modifier * 10;
        }
      });
    }

    return { card, score, isSegment };
  });

  // Drop the lowest scoring card
  scoredCards.sort((a, b) => a.score - b.score);
  const toDrop = scoredCards[0];

  return {
    cardId: toDrop.card.id,
    isSegment: toDrop.isSegment,
  };
}

export interface SetupDrawDecision {
  action: 'draw' | 'skip';
  deckType?: 'segment' | 'idea';
}

export function decideSetupDraw(state: GameState, teamIndex: number): SetupDrawDecision {
  const team = state.teams[teamIndex];
  const hand = team.setupHand;

  const segments = hand.filter((c): c is SegmentCard => !('type' in c));
  const ideas = hand.filter((c): c is IdeaCard => 'type' in c);

  // Try to balance segments and ideas
  if (segments.length < ideas.length && state.segmentDeck.length > 0) {
    return { action: 'draw', deckType: 'segment' };
  }

  if (ideas.length < segments.length && state.ideaDeck.length > 0) {
    return { action: 'draw', deckType: 'idea' };
  }

  // Random choice if balanced, or skip if decks empty
  if (state.segmentDeck.length > 0 && state.ideaDeck.length > 0) {
    const deckType = Math.random() < 0.5 ? 'segment' : 'idea';
    return { action: 'draw', deckType };
  }

  if (state.segmentDeck.length > 0) {
    return { action: 'draw', deckType: 'segment' };
  }

  if (state.ideaDeck.length > 0) {
    return { action: 'draw', deckType: 'idea' };
  }

  return { action: 'skip' };
}

export interface SetupLockDecision {
  segmentId: number;
  ideaId: number;
}

export function decideSetupLock(state: GameState, teamIndex: number): SetupLockDecision | null {
  const team = state.teams[teamIndex];
  const hand = team.setupHand;

  const segments = hand.filter((c): c is SegmentCard => !('type' in c));
  const ideas = hand.filter((c): c is IdeaCard => 'type' in c);

  if (segments.length === 0 || ideas.length === 0) {
    return null;
  }

  // Find best combination
  let bestSegment = segments[0];
  let bestIdea = ideas[0];
  let bestScore = -1;

  segments.forEach((segment) => {
    ideas.forEach((idea) => {
      const bonus = getSetupBonus(segment.name, idea.name);
      const score = bonus ? bonus.bonus.modifier : 0;

      if (score > bestScore) {
        bestScore = score;
        bestSegment = segment;
        bestIdea = idea;
      }
    });
  });

  return {
    segmentId: bestSegment.id,
    ideaId: bestIdea.id,
  };
}

// ===========================================
// Auction Decisions
// ===========================================

export interface BidDecision {
  action: 'bid' | 'pass';
  amount?: number;
}

export function decideBid(
  state: GameState,
  teamIndex: number,
  card: EmployeeCard
): BidDecision {
  const team = state.teams[teamIndex];

  // Already have enough employees
  if (team.employees.length >= 3) {
    return { action: 'pass' };
  }

  // Calculate card value based on skills
  const skillValue = card.hardSkill * 2 + Object.values(card.softSkills).reduce((a, b) => a + b, 0);

  // Base bid calculation
  const baseBid = Math.floor(skillValue * 2);

  // Adjust based on remaining ESOP and employees needed
  const employeesNeeded = 3 - team.employees.length;
  const avgBudgetPerEmployee = Math.floor(team.esopRemaining / employeesNeeded);

  // Don't bid more than average budget unless card is really good
  let maxBid = avgBudgetPerEmployee;
  if (skillValue > 1.5) {
    maxBid = Math.floor(avgBudgetPerEmployee * 1.5);
  }

  // Ensure we have enough for remaining employees
  const minReserve = (employeesNeeded - 1);
  maxBid = Math.min(maxBid, team.esopRemaining - minReserve);

  if (maxBid < 1) {
    return { action: 'pass' };
  }

  // Current bid check
  const currentBidAmount = state.currentBid?.amount ?? 0;

  // Decide whether to bid
  const bidAmount = Math.max(currentBidAmount + 1, baseBid);

  if (bidAmount > maxBid) {
    // 30% chance to stretch budget for good cards
    if (skillValue > 1.3 && Math.random() < 0.3 && currentBidAmount + 1 <= team.esopRemaining - minReserve) {
      return { action: 'bid', amount: currentBidAmount + 1 };
    }
    return { action: 'pass' };
  }

  // Random chance to pass even on affordable cards (creates variety)
  if (Math.random() < 0.15) {
    return { action: 'pass' };
  }

  return { action: 'bid', amount: bidAmount };
}

// ===========================================
// Wildcard Decisions
// ===========================================

export function decideWildcard(
  state: GameState,
  teamIndex: number
): WildcardChoice {
  const team = state.teams[teamIndex];

  // Already used wildcard
  if (team.wildcardUsed) {
    return 'pass';
  }

  // Calculate team's position
  const activeTeams = state.teams.filter((t) => !t.isDisqualified);
  const sortedByCapital = [...activeTeams].sort((a, b) => b.capital - a.capital);
  const rank = sortedByCapital.findIndex((t) => t.name === team.name);

  // In lead - use shield to protect
  if (rank === 0 && Math.random() < 0.6) {
    return 'shield';
  }

  // Behind - use double-down to catch up
  if (rank >= 2 && Math.random() < 0.7) {
    return 'double-down';
  }

  // Middle position - strategic choice
  if (Math.random() < 0.4) {
    return Math.random() < 0.5 ? 'double-down' : 'shield';
  }

  return 'pass';
}

// ===========================================
// Secondary Auction Decisions
// ===========================================

export function decideSecondaryDrop(
  state: GameState,
  teamIndex: number
): number | null {
  const team = state.teams[teamIndex];

  if (team.employees.length === 0) {
    return null;
  }

  // Drop lowest value employee
  const scored = team.employees.map((e) => ({
    id: e.id,
    score: e.hardSkill + Object.values(e.softSkills).reduce((a, b) => a + b, 0),
  }));

  scored.sort((a, b) => a.score - b.score);

  return scored[0].id;
}

// ===========================================
// Investment Decisions
// ===========================================

export function decideInvestmentTarget(
  state: GameState,
  teamIndex: number
): number | null {
  const team = state.teams[teamIndex];

  // Already invested
  if (team.investedInTeamIndex !== null) {
    return null;
  }

  // Find eligible targets: other active teams without an investor
  const eligible = state.teams
    .map((t, i) => ({ team: t, index: i }))
    .filter(({ team: t, index: i }) =>
      i !== teamIndex &&
      !t.isDisqualified &&
      t.investorTeamIndex === null
    );

  if (eligible.length === 0) {
    return null;
  }

  // 15% chance to pass
  if (Math.random() < 0.15) {
    return null;
  }

  // Pick uniformly at random
  const choice = eligible[Math.floor(Math.random() * eligible.length)];
  return choice.index;
}

export function decideBotMaxBid(): number {
  // Random ceiling between 500K and 1M, snapped to 50K increments
  const increments = Math.floor(Math.random() * 11); // 0-10 increments above 500K
  return GAME.INVESTMENT_MIN + increments * GAME.INVESTMENT_BID_INCREMENT;
}

export function decideInvestmentBid(
  state: GameState,
  teamIndex: number,
  currentHighestBid: number
): number | null {
  // Get bot's personal ceiling
  const ceiling = state.investmentBotCeilings[teamIndex] ?? GAME.INVESTMENT_MIN;

  // Starting bid or outbid
  let bidAmount: number;
  if (currentHighestBid <= 0) {
    bidAmount = GAME.INVESTMENT_MIN;
  } else {
    // Escalate by 1-2 increments with 30-40% randomness
    const baseIncrements = Math.random() < 0.5 ? 1 : 2;
    const randomFactor = 1 + (Math.random() * 0.1 + 0.3); // 1.3-1.4
    const increment = Math.round(baseIncrements * GAME.INVESTMENT_BID_INCREMENT * randomFactor);
    bidAmount = currentHighestBid + increment;
  }

  // Snap to increment boundaries
  bidAmount = Math.round(bidAmount / GAME.INVESTMENT_BID_INCREMENT) * GAME.INVESTMENT_BID_INCREMENT;

  // Clamp to range
  bidAmount = Math.max(GAME.INVESTMENT_MIN, bidAmount);
  bidAmount = Math.min(GAME.INVESTMENT_MAX, bidAmount);

  // If exceeds ceiling, drop out
  if (bidAmount > ceiling) {
    return null;
  }

  return bidAmount;
}

export function decideInvestmentTieResolution(
  state: GameState,
  targetTeamIndex: number,
  tiedTeams: { teamIndex: number; amount: number }[]
): number {
  // Pick the team that bid more
  const maxBid = Math.max(...tiedTeams.map((t) => t.amount));
  const maxBidders = tiedTeams.filter((t) => t.amount === maxBid);

  // If truly equal, pick randomly
  return maxBidders[Math.floor(Math.random() * maxBidders.length)].teamIndex;
}

// ===========================================
// Exit Decisions
// ===========================================

// With the draw mechanic, bots simply draw from the shuffled deck.
// No strategy needed - luck of the draw!
