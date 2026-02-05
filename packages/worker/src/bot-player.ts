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

export function getBotDelay(): number {
  return BOT_TIMING.MIN_DELAY_MS + Math.random() * (BOT_TIMING.MAX_DELAY_MS - BOT_TIMING.MIN_DELAY_MS);
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

const BOT_PROBLEMS = [
  'AI-powered meal planning for busy families',
  'Blockchain-based credential verification',
  'Sustainable packaging marketplace for SMBs',
  'Remote team culture building platform',
  'Mental health support app for students',
  'Hyperlocal delivery network for pharmacies',
  'Carbon footprint tracking for e-commerce',
  'Micro-learning platform for blue-collar workers',
  'Peer-to-peer equipment rental for construction',
  'Smart inventory management for retail',
];

export interface RegistrationDecision {
  name: string;
  problemStatement: string;
}

export function decideRegistration(teamIndex: number, usedNames: string[]): RegistrationDecision {
  // Pick an unused name
  let name = BOT_NAMES[teamIndex % BOT_NAMES.length];
  let attempt = 0;
  while (usedNames.includes(name) && attempt < BOT_NAMES.length) {
    attempt++;
    name = BOT_NAMES[(teamIndex + attempt) % BOT_NAMES.length];
  }

  const problemStatement = BOT_PROBLEMS[Math.floor(Math.random() * BOT_PROBLEMS.length)];

  return { name, problemStatement };
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
  const sortedByValuation = [...activeTeams].sort((a, b) => b.valuation - a.valuation);
  const rank = sortedByValuation.findIndex((t) => t.name === team.name);

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
