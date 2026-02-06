// ===========================================
// ESOP Wars v2 - Shared Types
// ===========================================

// ===========================================
// Game Phases
// ===========================================

export type Phase =
  | 'registration'
  | 'setup'
  | 'setup-lock'
  | 'setup-summary'
  | 'auction'
  | 'auction-summary'
  | 'seed'
  | 'early'
  | 'secondary-drop'
  | 'secondary-hire'
  | 'mature'
  | 'exit'
  | 'winner';

export type RoomStatus = 'LOBBY' | 'PLAYING' | 'FINISHED';

export type SetupPhase = 'drop' | 'draw';

export type WildcardChoice = 'double-down' | 'shield' | 'pass';

export type GameSpeed = 'normal' | 'fast' | 'instant';

export type PlayerRole = 'player' | 'spectator';

// ===========================================
// Room & Player Types
// ===========================================

export interface RoomState {
  code: string;
  status: RoomStatus;
  hostPlayerId: string;
  createdAt: number;
  players: PlayerSession[];
  gameState: GameState | null;
  spectatorMode: boolean;
  gameSpeed: GameSpeed;
}

export interface PlayerSession {
  playerId: string;
  playerName: string;
  teamIndex: number | null;
  isHost: boolean;
  connected: boolean;
  role: PlayerRole;
}

// ===========================================
// Game State
// ===========================================

export interface GameState {
  phase: Phase;
  teams: Team[];
  currentTurn: number;

  // Decks
  employeeDeck: EmployeeCard[];
  marketDeck: MarketCard[];
  segmentDeck: SegmentCard[];
  ideaDeck: IdeaCard[];

  // Auction
  currentCardIndex: number;
  currentBid: Bid | null;
  reserveEmployees: EmployeeCard[];

  // Setup
  setupRound: number;
  setupPhase: SetupPhase;
  setupDraftTurn: number;
  setupDiscard: (SegmentCard | IdeaCard)[];

  // Wildcard
  wildcardPhase: boolean;
  teamWildcardSelections: Record<number, WildcardChoice | null>;

  // Market
  currentMarketCard: MarketCard | null;
  usedMarketCards: MarketCard[];
  roundPerformance: RoundPerformance[];

  // Secondary
  droppedEmployees: DroppedEmployee[];
  secondaryPool: EmployeeCard[];

  // Exit
  exitCard: ExitCard | null;
}

export interface Bid {
  teamIndex: number;
  amount: number;
}

export interface RoundPerformance {
  teamIndex: number;
  previousValuation: number;
  newValuation: number;
  gain: number;
  percentChange: number;
}

export interface DroppedEmployee {
  employee: EmployeeCard;
  fromTeamIndex: number;
}

// ===========================================
// Team
// ===========================================

export interface Team {
  name: string;
  color: string;
  problemStatement: string;
  esopRemaining: number;
  valuation: number;
  employees: HiredEmployee[];
  isComplete: boolean;
  isDisqualified: boolean;
  isBot: boolean;
  playerId: string | null;

  // Setup
  lockedSegment: SegmentCard | null;
  lockedIdea: IdeaCard | null;
  setupBonus: SetupBonus | null;
  setupHand: (SegmentCard | IdeaCard)[];

  // Wildcard
  wildcardUsed: boolean;
  wildcardActiveThisRound: WildcardChoice | null;

  // Market Leader
  previousValuation: number;
  currentGain: number;
  isMarketLeader: boolean;
  marketLeaderCount: number;

  // Exit
  exitChoice: ExitCard | null;
  preExitValuation: number;
}

export interface TeamConfig {
  name: string;
  color: string;
  playerId: string | null;
  isBot: boolean;
}

// ===========================================
// Cards
// ===========================================

export interface EmployeeCard {
  id: number;
  name: string;
  role: string;
  category: EmployeeCategory;
  hardSkill: number;
  softSkills: Record<string, number>;
}

export interface HiredEmployee extends EmployeeCard {
  bidAmount: number;
}

export type EmployeeCategory = 'Engineering' | 'Product' | 'Sales' | 'Ops' | 'Finance';

export interface MarketCard {
  id: number;
  name: string;
  description: string;
  hardSkillModifiers: Record<EmployeeCategory, number>;
  softSkillModifiers: Record<string, number>;
}

export interface SegmentCard {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export interface IdeaCard {
  id: number;
  type: 'product' | 'service';
  name: string;
  description: string;
  icon: string;
}

export interface ExitCard {
  id: number;
  name: string;
  multiplier: number;
  description: string;
}

export interface SetupBonus {
  segment: string;
  idea: string;
  bonus: {
    category: EmployeeCategory;
    modifier: number;
  };
  description: string;
}

// ===========================================
// Category Perks
// ===========================================

export interface CategoryPerk {
  name: string;
  description: string;
  icon: string;
  effect: string;
}

export type CategoryPerks = Record<EmployeeCategory, CategoryPerk>;

// ===========================================
// Soft Skills
// ===========================================

export interface SoftSkill {
  name: string;
  icon: string;
  description: string;
}

// ===========================================
// WebSocket Messages
// ===========================================

// Client -> Server
export type ClientMessage =
  | { type: 'join'; playerName: string }
  | { type: 'reconnect'; playerId: string }
  | { type: 'select-team'; teamIndex: number }
  | { type: 'start-game' }
  | { type: 'start-bot-game' }
  | { type: 'set-game-speed'; speed: GameSpeed }
  | { type: 'register-team'; name: string; problemStatement: string }
  | { type: 'drop-card'; cardId: number; isSegment: boolean }
  | { type: 'draw-card'; deckType: 'segment' | 'idea' }
  | { type: 'skip-draw' }
  | { type: 'lock-setup'; segmentId: number; ideaId: number }
  | { type: 'place-bid'; amount: number }
  | { type: 'pass-bid' }
  | { type: 'advance-phase' }
  | { type: 'select-wildcard'; choice: WildcardChoice }
  | { type: 'draw-market' }
  | { type: 'drop-employee'; employeeId: number }
  | { type: 'select-secondary'; employeeId: number }
  | { type: 'select-exit'; exitId: number };

// Server -> Client
export type ServerMessage =
  | { type: 'room-joined'; room: RoomState; playerId: string }
  | { type: 'player-joined'; player: PlayerSession }
  | { type: 'player-left'; playerId: string }
  | { type: 'team-selected'; playerId: string; teamIndex: number }
  | { type: 'game-state'; state: GameState }
  | { type: 'team-updated'; teamIndex: number; team: Team }
  | { type: 'phase-changed'; phase: Phase }
  | { type: 'turn-changed'; teamIndex: number }
  | { type: 'bid-placed'; teamIndex: number; amount: number }
  | { type: 'bid-passed'; teamIndex: number }
  | { type: 'bidding-closed'; winner: Bid | null; card: EmployeeCard }
  | { type: 'wildcard-selected'; teamIndex: number }
  | { type: 'wildcards-revealed'; selections: (WildcardChoice | null)[] }
  | { type: 'market-card-drawn'; card: MarketCard | null }
  | { type: 'market-results'; performance: RoundPerformance[]; teams: Team[] }
  | { type: 'employee-dropped'; teamIndex: number }
  | { type: 'drops-revealed'; dropped: DroppedEmployee[] }
  | { type: 'exit-chosen'; teamIndex: number; exitCard: ExitCard }
  | { type: 'error'; message: string };

// ===========================================
// Validation
// ===========================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ===========================================
// Winners
// ===========================================

export interface Winners {
  founder: Team;
  employer: Team;
  sameTeam: boolean;
}

// ===========================================
// Game Config
// ===========================================

export interface GameConfig {
  teams: TeamConfig[];
  initialValuation: number;
  initialEsop: number;
}

// Default values
export const DEFAULT_INITIAL_VALUATION = 20_000_000;
export const DEFAULT_INITIAL_ESOP = 12;
export const TEAM_COUNT = 5;
export const EMPLOYEES_PER_TEAM = 3;
