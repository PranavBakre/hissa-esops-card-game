// ===========================================
// ESOP Wars v2 - Game Room Durable Object
// ===========================================

import type {
  RoomState,
  PlayerSession,
  ClientMessage,
  ServerMessage,
  TeamConfig,
  PlayerRole,
  GameSpeed,
} from '@esop-wars/shared';
import { TEAM_DEFINITIONS, GAME, TIMING, SPEED_MULTIPLIERS } from '@esop-wars/shared';
import {
  createInitialState,
  registerTeam,
  advancePhase,
  isPhaseComplete,
  dropCard,
  drawCard,
  skipDraw,
  lockSetup,
  placeBid,
  closeBidding,
  getCurrentCard,
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
  getSecondaryCard,
  closeSecondaryBidding,
  drawExit,
  allExitsChosen,
  applyExitMultipliers,
} from './game-engine';
import {
  validateDropCard,
  validateDrawCard,
  validateSkipDraw,
  validateLockSetup,
  validatePlaceBid,
  validateSelectWildcard,
  validateDrawMarket,
  validateDropEmployee,
  validateDrawExit,
} from './validators';
import {
  decideSetupDrop,
  decideSetupDraw,
  decideSetupLock,
  decideBid,
  decideWildcard,
  decideSecondaryDrop,
  getBotDelay,
  BOT_TIMING,
} from './bot-player';

// ===========================================
// Type Guards
// ===========================================

interface InitRequest {
  code: string;
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null;
}

function isInitRequest(data: unknown): data is InitRequest {
  if (!isRecord(data)) return false;
  return 'code' in data && typeof data.code === 'string';
}

function isClientMessage(data: unknown): data is ClientMessage {
  if (!isRecord(data)) return false;
  return 'type' in data && typeof data.type === 'string';
}

function getEventDataString(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return null;
}

// ===========================================
// Session Data
// ===========================================

interface SessionData {
  playerId: string;
  playerName: string;
  teamIndex: number | null;
  isHost: boolean;
  role: PlayerRole;
}

export class GameRoom {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, SessionData> = new Map();
  private roomState: RoomState | null = null;
  private initialized: boolean = false;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async loadState(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const stored = await this.state.storage.get<RoomState>('roomState');
    if (stored) {
      this.roomState = stored;
    }
  }

  private async saveState(): Promise<void> {
    if (this.roomState) {
      await this.state.storage.put('roomState', this.roomState);
    }
  }

  async fetch(request: Request): Promise<Response> {
    // Load state from storage on first access
    await this.loadState();

    const url = new URL(request.url);

    // Initialize room
    if (url.pathname === '/init' && request.method === 'POST') {
      const body: unknown = await request.json();
      if (!isInitRequest(body)) {
        return new Response('Invalid request body', { status: 400 });
      }
      const { code } = body;
      this.roomState = {
        code,
        status: 'LOBBY',
        hostPlayerId: '',
        createdAt: Date.now(),
        players: [],
        gameState: null,
        spectatorMode: false,
        gameSpeed: 'normal',
        fillBots: true,
      };
      await this.saveState();
      return new Response('OK');
    }

    // Get room info
    if (url.pathname === '/info' && request.method === 'GET') {
      if (!this.roomState) {
        return new Response(JSON.stringify({ error: 'Room not found' }), {
          status: 404,
        });
      }
      return new Response(
        JSON.stringify({
          code: this.roomState.code,
          status: this.roomState.status,
          playerCount: this.roomState.players.length,
          phase: this.roomState.gameState?.phase ?? null,
        })
      );
    }

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      // Check if room is initialized before accepting WebSocket
      if (!this.roomState) {
        return new Response('Room not found', { status: 404 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleSession(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  private handleSession(ws: WebSocket): void {
    ws.accept();

    // Initialize empty session
    this.sessions.set(ws, {
      playerId: '',
      playerName: '',
      teamIndex: null,
      isHost: false,
      role: 'player',
    });

    ws.addEventListener('message', (event) => {
      try {
        const dataStr = getEventDataString(event.data);
        if (!dataStr) {
          this.send(ws, { type: 'error', message: 'Invalid message data' });
          return;
        }
        const parsed: unknown = JSON.parse(dataStr);
        if (!isClientMessage(parsed)) {
          this.send(ws, { type: 'error', message: 'Invalid message format' });
          return;
        }
        this.handleMessage(ws, parsed);
      } catch (error) {
        console.error('Failed to parse message:', error);
        this.send(ws, { type: 'error', message: 'Invalid message format' });
      }
    });

    ws.addEventListener('close', () => {
      this.handleClose(ws);
    });

    ws.addEventListener('error', () => {
      this.handleClose(ws);
    });
  }

  private async handleMessage(ws: WebSocket, msg: ClientMessage): Promise<void> {
    if (!this.roomState) {
      this.send(ws, { type: 'error', message: 'Room not initialized' });
      return;
    }

    const session = this.sessions.get(ws)!;

    switch (msg.type) {
      case 'join':
        this.handleJoin(ws, session, msg.playerName);
        break;

      case 'reconnect':
        this.handleReconnect(ws, session, msg.playerId);
        break;

      case 'select-team':
        this.handleSelectTeam(ws, session, msg.teamIndex);
        break;

      case 'start-game':
        this.handleStartGame(ws, session, msg.fillBots);
        break;

      case 'register-team':
        this.handleRegisterTeam(ws, session, msg.name, msg.problemStatement);
        break;

      case 'drop-card':
        this.handleDropCard(ws, session, msg.cardId, msg.isSegment);
        break;

      case 'draw-card':
        this.handleDrawCard(ws, session, msg.deckType);
        break;

      case 'skip-draw':
        this.handleSkipDraw(ws, session);
        break;

      case 'lock-setup':
        this.handleLockSetup(ws, session, msg.segmentId, msg.ideaId);
        break;

      case 'place-bid':
        this.handlePlaceBid(ws, session, msg.amount);
        break;

      case 'advance-phase':
        this.handleAdvancePhase(ws, session);
        break;

      case 'pass-bid':
        // Acknowledge the pass - no game state change needed
        this.send(ws, { type: 'bid-passed', teamIndex: session.teamIndex ?? -1 });
        break;

      case 'select-wildcard':
        this.handleSelectWildcard(ws, session, msg.choice);
        break;

      case 'draw-market':
        this.handleDrawMarket(ws, session);
        break;

      case 'drop-employee':
        this.handleDropEmployee(ws, session, msg.employeeId);
        break;

      case 'draw-exit':
        this.handleDrawExit(ws, session);
        break;

      case 'start-bot-game':
        this.handleStartBotGame(ws, session);
        break;

      case 'set-game-speed':
        this.handleSetGameSpeed(ws, session, msg.speed);
        break;

      default: {
        const unhandledMsg: { type: string } = msg;
        this.send(ws, { type: 'error', message: `Unknown message type: ${unhandledMsg.type}` });
      }
    }

    // Persist state after any message that may have modified it
    await this.saveState();
  }

  private handleJoin(ws: WebSocket, session: SessionData, playerName: string): void {
    if (!this.roomState) return;

    // Generate player ID
    const playerId = crypto.randomUUID();
    const isHost = this.roomState.players.length === 0;

    // Update session
    session.playerId = playerId;
    session.playerName = playerName;
    session.isHost = isHost;

    if (isHost) {
      this.roomState.hostPlayerId = playerId;
    }

    // Add to players list
    const playerSession: PlayerSession = {
      playerId,
      playerName,
      teamIndex: null,
      isHost,
      connected: true,
      role: 'player',
    };
    this.roomState.players.push(playerSession);

    // Send room state to joining player
    this.send(ws, {
      type: 'room-joined',
      room: this.roomState,
      playerId,
    });

    // Broadcast to others
    this.broadcastExcept(ws, {
      type: 'player-joined',
      player: playerSession,
    });
  }

  private handleReconnect(ws: WebSocket, session: SessionData, playerId: string): void {
    if (!this.roomState) return;

    const existingPlayer = this.roomState.players.find((p) => p.playerId === playerId);
    if (!existingPlayer) {
      this.send(ws, { type: 'error', message: 'Player not found' });
      return;
    }

    // Update session
    session.playerId = playerId;
    session.playerName = existingPlayer.playerName;
    session.teamIndex = existingPlayer.teamIndex;
    session.isHost = existingPlayer.isHost;
    session.role = existingPlayer.role;

    // Mark as connected
    existingPlayer.connected = true;

    // Send current state
    this.send(ws, {
      type: 'room-joined',
      room: this.roomState,
      playerId,
    });

    // Broadcast reconnection
    this.broadcastExcept(ws, {
      type: 'player-joined',
      player: existingPlayer,
    });
  }

  private handleSelectTeam(ws: WebSocket, session: SessionData, teamIndex: number): void {
    if (!this.roomState) return;

    if (this.roomState.status !== 'LOBBY') {
      this.send(ws, { type: 'error', message: 'Game already started' });
      return;
    }

    if (teamIndex < 0 || teamIndex >= GAME.MAX_TEAM_COUNT) {
      this.send(ws, { type: 'error', message: 'Invalid team index' });
      return;
    }

    // Check if team is already taken by another player
    const teamTaken = this.roomState.players.some(
      (p) => p.teamIndex === teamIndex && p.playerId !== session.playerId
    );
    if (teamTaken) {
      this.send(ws, { type: 'error', message: 'Team already taken' });
      return;
    }

    // Update player's team selection
    const player = this.roomState.players.find((p) => p.playerId === session.playerId);
    if (player) {
      player.teamIndex = teamIndex;
      session.teamIndex = teamIndex;
    }

    // Broadcast team selection
    this.broadcast({
      type: 'team-selected',
      playerId: session.playerId,
      teamIndex,
    });
  }

  private handleStartGame(ws: WebSocket, session: SessionData, fillBots: boolean): void {
    if (!this.roomState) return;

    if (!session.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can start the game' });
      return;
    }

    if (this.roomState.status !== 'LOBBY') {
      this.send(ws, { type: 'error', message: 'Game already started' });
      return;
    }

    this.roomState.fillBots = fillBots;

    let teamConfigs: TeamConfig[];

    if (fillBots) {
      // Original behavior: all 5 team slots, empty ones filled with bots
      teamConfigs = TEAM_DEFINITIONS.map((def, index) => {
        const player = this.roomState!.players.find((p) => p.teamIndex === index);
        return {
          name: def.name,
          color: def.color,
          playerId: player?.playerId ?? null,
          isBot: !player,
        };
      });
    } else {
      // Flexible teams: only include teams that have a human player assigned
      // Build a mapping from old team index to new (compact) team index
      const oldToNewIndex = new Map<number, number>();
      teamConfigs = [];

      for (let i = 0; i < TEAM_DEFINITIONS.length; i++) {
        const player = this.roomState.players.find((p) => p.teamIndex === i);
        if (player) {
          oldToNewIndex.set(i, teamConfigs.length);
          teamConfigs.push({
            name: TEAM_DEFINITIONS[i].name,
            color: TEAM_DEFINITIONS[i].color,
            playerId: player.playerId,
            isBot: false,
          });
        }
      }

      // Enforce minimum team count
      if (teamConfigs.length < GAME.MIN_TEAM_COUNT) {
        this.send(ws, {
          type: 'error',
          message: `Need at least ${GAME.MIN_TEAM_COUNT} players to start without bots`,
        });
        return;
      }

      // Remap player and session team indices to new compact positions
      for (const player of this.roomState.players) {
        if (player.teamIndex !== null) {
          const newIndex = oldToNewIndex.get(player.teamIndex);
          if (newIndex !== undefined) {
            player.teamIndex = newIndex;
          }
        }
      }
      for (const [, sess] of this.sessions) {
        if (sess.teamIndex !== null) {
          const newIndex = oldToNewIndex.get(sess.teamIndex);
          if (newIndex !== undefined) {
            sess.teamIndex = newIndex;
          }
        }
      }
    }

    // Create initial game state
    this.roomState.gameState = createInitialState({
      teams: teamConfigs,
      initialValuation: GAME.INITIAL_VALUATION,
      initialEsop: GAME.INITIAL_ESOP,
    });
    this.roomState.status = 'PLAYING';

    // Broadcast game state to all
    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Auto-register bots (only relevant when fillBots=true)
    this.autoRegisterBots();
  }

  private handleStartBotGame(ws: WebSocket, session: SessionData): void {
    if (!this.roomState) return;

    if (!session.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can start a bot game' });
      return;
    }

    if (this.roomState.status !== 'LOBBY') {
      this.send(ws, { type: 'error', message: 'Game already started' });
      return;
    }

    // Set spectator mode
    this.roomState.spectatorMode = true;

    // Build team config - all 5 teams are bots
    const teamConfigs: TeamConfig[] = TEAM_DEFINITIONS.map((def) => ({
      name: def.name,
      color: def.color,
      playerId: null,
      isBot: true,
    }));

    // Create initial game state
    this.roomState.gameState = createInitialState({
      teams: teamConfigs,
      initialValuation: GAME.INITIAL_VALUATION,
      initialEsop: GAME.INITIAL_ESOP,
    });
    this.roomState.status = 'PLAYING';

    // Broadcast game state to all
    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Auto-register bots
    this.autoRegisterBots();
  }

  private handleSetGameSpeed(ws: WebSocket, session: SessionData, speed: GameSpeed): void {
    if (!this.roomState) return;

    if (!session.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can change game speed' });
      return;
    }

    this.roomState.gameSpeed = speed;
  }

  private getSpeedMultiplier(): number {
    if (!this.roomState) return 1.0;
    return SPEED_MULTIPLIERS[this.roomState.gameSpeed];
  }

  private handleRegisterTeam(
    ws: WebSocket,
    session: SessionData,
    name: string,
    problemStatement: string
  ): void {
    if (!this.roomState?.gameState) return;

    if (session.teamIndex === null) {
      this.send(ws, { type: 'error', message: 'No team selected' });
      return;
    }

    if (this.roomState.gameState.phase !== 'registration') {
      this.send(ws, { type: 'error', message: 'Not in registration phase' });
      return;
    }

    const team = this.roomState.gameState.teams[session.teamIndex];
    const defaultTeamNames = new Set(TEAM_DEFINITIONS.map((d) => d.name));
    if (!defaultTeamNames.has(team.name)) {
      // Already registered (name changed from default)
      this.send(ws, { type: 'error', message: 'Team already registered' });
      return;
    }

    // Update team
    this.roomState.gameState = registerTeam(
      this.roomState.gameState,
      session.teamIndex,
      name,
      problemStatement
    );

    // Broadcast update
    this.broadcast({
      type: 'team-updated',
      teamIndex: session.teamIndex,
      team: this.roomState.gameState.teams[session.teamIndex],
    });

    // Check if registration complete
    this.checkPhaseCompletion();
  }

  // ===========================================
  // Phase Advance Handler
  // ===========================================

  private handleAdvancePhase(ws: WebSocket, session: SessionData): void {
    if (!this.roomState?.gameState) return;

    if (!session.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can advance phase' });
      return;
    }

    const phase = this.roomState.gameState.phase;
    const manualAdvancePhases = ['setup-summary', 'auction-summary'];

    if (!manualAdvancePhases.includes(phase)) {
      this.send(ws, { type: 'error', message: 'Cannot manually advance this phase' });
      return;
    }

    this.roomState.gameState = advancePhase(this.roomState.gameState);

    this.broadcast({
      type: 'phase-changed',
      phase: this.roomState.gameState.phase,
    });

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Start bot actions for new phase if needed
    this.scheduleBotTurnIfNeeded();
  }

  // ===========================================
  // Setup Phase Handlers
  // ===========================================

  private handleDropCard(
    ws: WebSocket,
    session: SessionData,
    cardId: number,
    isSegment: boolean
  ): void {
    if (!this.roomState?.gameState || session.teamIndex === null) return;

    const validation = validateDropCard(this.roomState.gameState, session.teamIndex, cardId);
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    this.roomState.gameState = dropCard(
      this.roomState.gameState,
      session.teamIndex,
      cardId,
      isSegment
    );

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Schedule bot draw if it's a bot's turn
    this.scheduleBotTurnIfNeeded();
  }

  private handleDrawCard(
    ws: WebSocket,
    session: SessionData,
    deckType: 'segment' | 'idea'
  ): void {
    if (!this.roomState?.gameState || session.teamIndex === null) return;

    const validation = validateDrawCard(this.roomState.gameState, session.teamIndex, deckType);
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    this.roomState.gameState = drawCard(
      this.roomState.gameState,
      session.teamIndex,
      deckType
    );

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    this.checkPhaseCompletion();
    this.scheduleBotTurnIfNeeded();
  }

  private handleSkipDraw(ws: WebSocket, session: SessionData): void {
    if (!this.roomState?.gameState || session.teamIndex === null) return;

    const validation = validateSkipDraw(this.roomState.gameState, session.teamIndex);
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    this.roomState.gameState = skipDraw(this.roomState.gameState, session.teamIndex);

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    this.checkPhaseCompletion();
    this.scheduleBotTurnIfNeeded();
  }

  private handleLockSetup(
    ws: WebSocket,
    session: SessionData,
    segmentId: number,
    ideaId: number
  ): void {
    if (!this.roomState?.gameState || session.teamIndex === null) return;

    const validation = validateLockSetup(
      this.roomState.gameState,
      session.teamIndex,
      segmentId,
      ideaId
    );
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    this.roomState.gameState = lockSetup(
      this.roomState.gameState,
      session.teamIndex,
      segmentId,
      ideaId
    );

    this.broadcast({
      type: 'team-updated',
      teamIndex: session.teamIndex,
      team: this.roomState.gameState.teams[session.teamIndex],
    });

    this.checkPhaseCompletion();
  }

  // ===========================================
  // Auction Phase Handlers
  // ===========================================

  private handlePlaceBid(ws: WebSocket, session: SessionData, amount: number): void {
    if (!this.roomState?.gameState || session.teamIndex === null) return;

    const validation = validatePlaceBid(this.roomState.gameState, session.teamIndex, amount);
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    this.roomState.gameState = placeBid(this.roomState.gameState, session.teamIndex, amount);

    this.broadcast({
      type: 'bid-placed',
      teamIndex: session.teamIndex,
      amount,
    });

    // Reset auction timer
    this.scheduleAuctionTimeout();

    // Trigger bot counter-bids
    this.scheduleBotBids();
  }

  // ===========================================
  // Wildcard Phase Handlers
  // ===========================================

  private handleSelectWildcard(
    ws: WebSocket,
    session: SessionData,
    choice: 'double-down' | 'shield' | 'pass'
  ): void {
    if (!this.roomState?.gameState || session.teamIndex === null) return;

    const validation = validateSelectWildcard(
      this.roomState.gameState,
      session.teamIndex,
      choice
    );
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    this.roomState.gameState = selectWildcard(
      this.roomState.gameState,
      session.teamIndex,
      choice
    );

    // Notify that selection was received (hidden from others)
    this.send(ws, { type: 'wildcard-selected', teamIndex: session.teamIndex });

    // Check if all selections are in
    if (allWildcardsSelected(this.roomState.gameState)) {
      this.revealAndApplyWildcards();
    }
  }

  private revealAndApplyWildcards(): void {
    if (!this.roomState?.gameState) return;

    // Apply wildcards (marks which teams used wildcards, exits wildcard phase)
    this.roomState.gameState = applyWildcards(this.roomState.gameState);

    // Apply wildcard modifiers to this round's results
    this.roomState.gameState = applyWildcardModifiers(this.roomState.gameState);

    // Broadcast wildcard reveals
    this.broadcast({
      type: 'wildcards-revealed',
      selections: this.roomState.gameState.teams.map((t) => t.wildcardActiveThisRound),
    });

    // Broadcast updated results with wildcard modifications
    this.broadcast({
      type: 'market-results',
      performance: this.roomState.gameState.roundPerformance,
      teams: this.roomState.gameState.teams,
    });

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Phase is now complete (wildcardPhase=false, roundPerformance populated)
    this.checkPhaseCompletion();
  }

  // ===========================================
  // Market Phase Handlers
  // ===========================================

  private handleDrawMarket(ws: WebSocket, session: SessionData): void {
    if (!this.roomState?.gameState) return;

    const validation = validateDrawMarket(
      this.roomState.gameState,
      session.teamIndex ?? -1,
      session.isHost
    );
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    // Draw market card
    this.roomState.gameState = drawMarketCard(this.roomState.gameState);

    // Broadcast drawn card
    this.broadcast({
      type: 'market-card-drawn',
      card: this.roomState.gameState.currentMarketCard,
    });

    // Apply market effects
    this.roomState.gameState = applyMarketEffects(this.roomState.gameState);

    // Apply market leader bonus
    this.roomState.gameState = applyMarketLeaderBonus(this.roomState.gameState);

    // Broadcast results (teams can now see their valuations before wildcard decision)
    this.broadcast({
      type: 'market-results',
      performance: this.roomState.gameState.roundPerformance,
      teams: this.roomState.gameState.teams,
    });

    // Enter wildcard phase — players now react to market results
    this.roomState.gameState.wildcardPhase = true;
    this.roomState.gameState.teamWildcardSelections = {};

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Schedule bot wildcards if needed
    this.scheduleBotTurnIfNeeded();
  }

  // ===========================================
  // Secondary Auction Handlers
  // ===========================================

  private handleDropEmployee(
    ws: WebSocket,
    session: SessionData,
    employeeId: number
  ): void {
    if (!this.roomState?.gameState || session.teamIndex === null) return;

    const validation = validateDropEmployee(
      this.roomState.gameState,
      session.teamIndex,
      employeeId
    );
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    this.roomState.gameState = dropEmployee(
      this.roomState.gameState,
      session.teamIndex,
      employeeId
    );

    // Notify that drop was received (hidden from others until all dropped)
    this.send(ws, { type: 'employee-dropped', teamIndex: session.teamIndex });

    // Check if all drops are in
    if (allEmployeesDropped(this.roomState.gameState)) {
      this.revealDropsAndStartSecondary();
    }
  }

  private revealDropsAndStartSecondary(): void {
    if (!this.roomState?.gameState) return;

    // Broadcast dropped employees
    this.broadcast({
      type: 'drops-revealed',
      dropped: this.roomState.gameState.droppedEmployees,
    });

    // Populate secondary pool
    this.roomState.gameState = populateSecondaryPool(this.roomState.gameState);

    // Advance to secondary-hire phase
    this.roomState.gameState.phase = 'secondary-hire';

    this.broadcast({
      type: 'phase-changed',
      phase: 'secondary-hire',
    });

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Start secondary auction timer
    this.scheduleAuctionTimeout();
    this.scheduleBotBids();
  }

  // ===========================================
  // Exit Phase Handlers
  // ===========================================

  private handleDrawExit(
    ws: WebSocket,
    session: SessionData
  ): void {
    if (!this.roomState?.gameState || session.teamIndex === null) return;

    const validation = validateDrawExit(
      this.roomState.gameState,
      session.teamIndex
    );
    if (!validation.valid) {
      this.send(ws, { type: 'error', message: validation.error ?? 'Invalid action' });
      return;
    }

    this.roomState.gameState = drawExit(
      this.roomState.gameState,
      session.teamIndex
    );

    const team = this.roomState.gameState.teams[session.teamIndex];

    // Broadcast the drawn exit card
    if (team.exitChoice) {
      this.broadcast({
        type: 'exit-chosen',
        teamIndex: session.teamIndex,
        exitCard: team.exitChoice,
      });
    }

    // Check if all exits are drawn
    if (allExitsChosen(this.roomState.gameState)) {
      this.applyExitsAndFinish();
    } else {
      // Broadcast updated game state (shows current exit turn)
      this.broadcast({
        type: 'game-state',
        state: this.roomState.gameState,
      });

      // Schedule next bot draw if needed
      this.scheduleBotExits();
    }
  }

  private applyExitsAndFinish(): void {
    if (!this.roomState?.gameState) return;

    // Apply all exit multipliers
    this.roomState.gameState = applyExitMultipliers(this.roomState.gameState);

    // Broadcast final results
    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Room is now finished
    this.roomState.status = 'FINISHED';
  }

  // ===========================================
  // Bot Scheduling
  // ===========================================

  private scheduleBotTurnIfNeeded(): void {
    if (!this.roomState?.gameState) return;

    const phase = this.roomState.gameState.phase;

    const multiplier = this.getSpeedMultiplier();

    if (phase === 'setup') {
      const currentTurn = this.roomState.gameState.setupDraftTurn;
      const team = this.roomState.gameState.teams[currentTurn];

      if (team.isBot) {
        this.scheduleAlarm(getBotDelay(multiplier));
      }
    } else if (phase === 'setup-lock') {
      // Schedule bot locks
      this.scheduleBotLocks();
    } else if (phase === 'auction' || phase === 'secondary-hire') {
      // Start auction timer
      this.scheduleAuctionTimeout();
      this.scheduleBotBids();
    } else if (this.roomState.gameState.wildcardPhase) {
      // Schedule bot wildcard selections
      this.scheduleBotWildcards();
    } else if (phase === 'secondary-drop') {
      // Schedule bot drops
      this.scheduleBotDrops();
    } else if (phase === 'exit') {
      // Schedule bot exit selections
      this.scheduleBotExits();
    }
  }

  private scheduleBotLocks(): void {
    if (!this.roomState?.gameState) return;

    const botsNeedingLock = this.roomState.gameState.teams
      .map((t, i) => ({ team: t, index: i }))
      .filter(({ team }) => team.isBot && team.lockedSegment === null);

    if (botsNeedingLock.length > 0) {
      this.scheduleAlarm(getBotDelay(this.getSpeedMultiplier()));
    }
  }

  private scheduleBotBids(): void {
    if (!this.roomState?.gameState) return;

    // Check if any bots want to bid
    const eligibleBots = this.roomState.gameState.teams
      .map((t, i) => ({ team: t, index: i }))
      .filter(
        ({ team }) =>
          team.isBot &&
          !team.isDisqualified &&
          team.employees.length < GAME.EMPLOYEES_PER_TEAM &&
          team.esopRemaining > 0
      );

    if (eligibleBots.length > 0) {
      const multiplier = this.getSpeedMultiplier();
      this.scheduleAlarm(Math.max(10, Math.round(BOT_TIMING.BID_DELAY_MS * multiplier)));
    }
  }

  private scheduleBotWildcards(): void {
    if (!this.roomState?.gameState) return;

    const botsNeedingSelection = this.roomState.gameState.teams
      .map((t, i) => ({ team: t, index: i }))
      .filter(
        ({ team, index }) =>
          team.isBot &&
          !team.isDisqualified &&
          this.roomState?.gameState?.teamWildcardSelections[index] === undefined
      );

    if (botsNeedingSelection.length > 0) {
      this.scheduleAlarm(getBotDelay(this.getSpeedMultiplier()));
    }
  }

  private scheduleBotDrops(): void {
    if (!this.roomState?.gameState) return;

    const botsNeedingDrop = this.roomState.gameState.teams
      .map((t, i) => ({ team: t, index: i }))
      .filter(
        ({ team, index }) =>
          team.isBot &&
          !team.isDisqualified &&
          !this.roomState?.gameState?.droppedEmployees.some((d) => d.fromTeamIndex === index)
      );

    if (botsNeedingDrop.length > 0) {
      this.scheduleAlarm(getBotDelay(this.getSpeedMultiplier()));
    }
  }

  private scheduleBotExits(): void {
    if (!this.roomState?.gameState) return;

    const turn = this.roomState.gameState.currentExitTurn;
    if (turn < 0) return; // All teams have drawn

    const team = this.roomState.gameState.teams[turn];
    if (team && team.isBot && !team.isDisqualified && team.exitChoice === null) {
      this.scheduleAlarm(getBotDelay(this.getSpeedMultiplier()));
    }
  }

  private scheduleAuctionTimeout(): void {
    const multiplier = this.getSpeedMultiplier();
    this.scheduleAlarm(Math.max(10, Math.round(TIMING.BID_TIMEOUT_MS * multiplier)));
  }

  private scheduleAlarm(delayMs: number): void {
    this.state.storage.setAlarm(Date.now() + delayMs);
  }

  private autoRegisterBots(): void {
    if (!this.roomState?.gameState) return;
    if (!this.roomState.fillBots) return;

    const botNames = [
      'Quantum Phoenix Labs',
      'Azure Storm Tech',
      'Golden Nexus AI',
      'Emerald Pulse Systems',
      'Stellar Falcon Ventures',
    ];

    const botProblems = [
      'AI-powered meal planning for busy families',
      'Blockchain-based credential verification',
      'Sustainable packaging marketplace for SMBs',
      'Remote team culture building platform',
      'Mental health support app for students',
    ];

    let botCounter = 0;
    this.roomState.gameState.teams.forEach((team, index) => {
      if (team.isBot) {
        const nameIndex = botCounter % botNames.length;
        this.roomState!.gameState = registerTeam(
          this.roomState!.gameState!,
          index,
          botNames[nameIndex],
          botProblems[nameIndex]
        );
        botCounter++;

        this.broadcast({
          type: 'team-updated',
          teamIndex: index,
          team: this.roomState!.gameState!.teams[index],
        });
      }
    });

    // Check if all registered
    this.checkPhaseCompletion();
  }

  private checkPhaseCompletion(): void {
    if (!this.roomState?.gameState) return;

    if (isPhaseComplete(this.roomState.gameState)) {
      this.roomState.gameState = advancePhase(this.roomState.gameState);

      this.broadcast({
        type: 'phase-changed',
        phase: this.roomState.gameState.phase,
      });

      this.broadcast({
        type: 'game-state',
        state: this.roomState.gameState,
      });

      // Schedule bot actions for the new phase
      this.scheduleBotTurnIfNeeded();

      // In spectator mode, auto-advance summary phases and auto-draw market cards
      if (this.roomState.spectatorMode) {
        this.scheduleSpectatorAutoAdvance();
      }
    }
  }

  private scheduleSpectatorAutoAdvance(): void {
    if (!this.roomState?.gameState) return;

    const phase = this.roomState.gameState.phase;
    const multiplier = this.getSpeedMultiplier();
    const autoAdvanceDelay = Math.max(10, Math.round(1500 * multiplier));

    if (phase === 'setup-summary' || phase === 'auction-summary') {
      this.scheduleAlarm(autoAdvanceDelay);
    } else if (phase === 'seed' || phase === 'early' || phase === 'mature') {
      // Auto-draw market card (if not yet drawn and not in wildcard phase)
      if (!this.roomState.gameState.wildcardPhase && this.roomState.gameState.roundPerformance.length === 0) {
        this.scheduleAlarm(autoAdvanceDelay);
      }
    }
  }

  private async handleClose(ws: WebSocket): Promise<void> {
    const session = this.sessions.get(ws);
    if (session && this.roomState) {
      const player = this.roomState.players.find((p) => p.playerId === session.playerId);
      if (player) {
        player.connected = false;

        this.broadcast({
          type: 'player-left',
          playerId: session.playerId,
        });

        // Persist state after marking player disconnected
        await this.saveState();
      }
    }
    this.sessions.delete(ws);
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  private broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(data);
      } catch (error) {
        console.error('Failed to broadcast:', error);
      }
    }
  }

  private broadcastExcept(excludeWs: WebSocket, message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.sessions.keys()) {
      if (ws !== excludeWs) {
        try {
          ws.send(data);
        } catch (error) {
          console.error('Failed to broadcast:', error);
        }
      }
    }
  }

  async alarm(): Promise<void> {
    // Load state in case DO hibernated
    await this.loadState();

    if (!this.roomState?.gameState) return;

    const phase = this.roomState.gameState.phase;

    if (phase === 'setup') {
      this.executeBotSetupTurn();
    } else if (phase === 'setup-lock') {
      this.executeBotLock();
    } else if (phase === 'auction' || phase === 'secondary-hire') {
      this.handleAuctionTimeout();
    } else if (this.roomState.gameState.wildcardPhase) {
      this.executeBotWildcard();
    } else if (phase === 'secondary-drop') {
      this.executeBotDrop();
    } else if (phase === 'exit') {
      this.executeBotExit();
    } else if (this.roomState.spectatorMode && (phase === 'setup-summary' || phase === 'auction-summary')) {
      this.executeSpectatorAdvance();
    } else if (this.roomState.spectatorMode && (phase === 'seed' || phase === 'early' || phase === 'mature')) {
      this.executeSpectatorMarketDraw();
    }

    // Persist state after bot actions
    await this.saveState();
  }

  private executeBotSetupTurn(): void {
    if (!this.roomState?.gameState) return;

    const currentTurn = this.roomState.gameState.setupDraftTurn;
    const team = this.roomState.gameState.teams[currentTurn];

    if (!team.isBot) return;

    if (this.roomState.gameState.setupPhase === 'drop') {
      const decision = decideSetupDrop(this.roomState.gameState, currentTurn);
      if (decision) {
        this.roomState.gameState = dropCard(
          this.roomState.gameState,
          currentTurn,
          decision.cardId,
          decision.isSegment
        );

        this.broadcast({
          type: 'game-state',
          state: this.roomState.gameState,
        });
      }
      // Always schedule draw phase (even if no drop happened)
      this.scheduleAlarm(getBotDelay(this.getSpeedMultiplier()));
    } else if (this.roomState.gameState.setupPhase === 'draw') {
      const decision = decideSetupDraw(this.roomState.gameState, currentTurn);

      if (decision.action === 'draw' && decision.deckType) {
        this.roomState.gameState = drawCard(
          this.roomState.gameState,
          currentTurn,
          decision.deckType
        );
      } else {
        this.roomState.gameState = skipDraw(this.roomState.gameState, currentTurn);
      }

      this.broadcast({
        type: 'game-state',
        state: this.roomState.gameState,
      });

      this.checkPhaseCompletion();
      this.scheduleBotTurnIfNeeded();
    }
  }

  private executeBotLock(): void {
    if (!this.roomState?.gameState) return;

    // Find first bot that needs to lock
    const botIndex = this.roomState.gameState.teams.findIndex(
      (t) => t.isBot && t.lockedSegment === null
    );

    if (botIndex === -1) return;

    const decision = decideSetupLock(this.roomState.gameState, botIndex);
    if (decision) {
      this.roomState.gameState = lockSetup(
        this.roomState.gameState,
        botIndex,
        decision.segmentId,
        decision.ideaId
      );

      this.broadcast({
        type: 'team-updated',
        teamIndex: botIndex,
        team: this.roomState.gameState.teams[botIndex],
      });

      this.checkPhaseCompletion();
    }
    // If decision is null, bot can't lock (missing cards) - same as V1 behavior
    // But we still need to try the next bot

    // Schedule next bot lock if still in setup-lock phase
    if (this.roomState.gameState.phase === 'setup-lock') {
      this.scheduleBotLocks();
    }
  }

  private handleAuctionTimeout(): void {
    if (!this.roomState?.gameState) return;

    const card = getCurrentCard(this.roomState.gameState);
    if (!card) return;

    // Try all eligible bots in shuffled order before closing
    const eligibleBots = this.roomState.gameState.teams
      .map((t, i) => ({ team: t, index: i }))
      .filter(
        ({ team, index }) =>
          team.isBot &&
          !team.isDisqualified &&
          team.employees.length < GAME.EMPLOYEES_PER_TEAM &&
          team.esopRemaining > 0 &&
          (this.roomState?.gameState?.currentBid?.teamIndex !== index)
      );

    // Shuffle to randomize who bids first
    for (let i = eligibleBots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleBots[i], eligibleBots[j]] = [eligibleBots[j], eligibleBots[i]];
    }

    for (const bot of eligibleBots) {
      const decision = decideBid(this.roomState.gameState, bot.index, card);

      if (decision.action === 'bid' && decision.amount !== undefined) {
        const validation = validatePlaceBid(
          this.roomState.gameState,
          bot.index,
          decision.amount
        );

        if (validation.valid) {
          this.roomState.gameState = placeBid(
            this.roomState.gameState,
            bot.index,
            decision.amount
          );

          this.broadcast({
            type: 'bid-placed',
            teamIndex: bot.index,
            amount: decision.amount,
          });

          // Reset timer for more bids
          this.scheduleAuctionTimeout();
          return;
        }
      }
    }

    // Close bidding if no more bids
    const previousBid = this.roomState.gameState.currentBid;
    const phase = this.roomState.gameState.phase;

    // Use appropriate close function based on phase
    if (phase === 'secondary-hire') {
      this.roomState.gameState = closeSecondaryBidding(this.roomState.gameState);
    } else {
      this.roomState.gameState = closeBidding(this.roomState.gameState);
    }

    this.broadcast({
      type: 'bidding-closed',
      winner: previousBid,
      card,
    });

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Check if auction/secondary complete
    if (this.roomState.gameState.phase === 'auction' || this.roomState.gameState.phase === 'secondary-hire') {
      // Start next card if there are more
      const nextCard = phase === 'secondary-hire'
        ? getSecondaryCard(this.roomState.gameState)
        : getCurrentCard(this.roomState.gameState);

      if (nextCard) {
        this.scheduleBotTurnIfNeeded();
      } else {
        this.checkPhaseCompletion();
      }
    } else {
      this.checkPhaseCompletion();
    }
  }

  private executeBotWildcard(): void {
    if (!this.roomState?.gameState || !this.roomState.gameState.wildcardPhase) return;

    // Find first bot that needs to select wildcard
    const botIndex = this.roomState.gameState.teams.findIndex(
      (t, i) =>
        t.isBot &&
        !t.isDisqualified &&
        this.roomState?.gameState?.teamWildcardSelections[i] === undefined
    );

    if (botIndex === -1) return;

    const choice = decideWildcard(this.roomState.gameState, botIndex);

    this.roomState.gameState = selectWildcard(
      this.roomState.gameState,
      botIndex,
      choice
    );

    // Check if all selections are in
    if (allWildcardsSelected(this.roomState.gameState)) {
      this.revealAndApplyWildcards();
    } else {
      // Schedule next bot wildcard
      this.scheduleBotWildcards();
    }
  }

  private executeBotDrop(): void {
    if (!this.roomState?.gameState || this.roomState.gameState.phase !== 'secondary-drop') return;

    // Find first bot that needs to drop
    const botIndex = this.roomState.gameState.teams.findIndex(
      (t, i) =>
        t.isBot &&
        !t.isDisqualified &&
        !this.roomState?.gameState?.droppedEmployees.some((d) => d.fromTeamIndex === i)
    );

    if (botIndex === -1) return;

    const employeeId = decideSecondaryDrop(this.roomState.gameState, botIndex);
    if (employeeId === null) return;

    this.roomState.gameState = dropEmployee(
      this.roomState.gameState,
      botIndex,
      employeeId
    );

    // Check if all drops are in
    if (allEmployeesDropped(this.roomState.gameState)) {
      this.revealDropsAndStartSecondary();
    } else {
      // Schedule next bot drop
      this.scheduleBotDrops();
    }
  }

  private executeBotExit(): void {
    if (!this.roomState?.gameState || this.roomState.gameState.phase !== 'exit') return;

    const turn = this.roomState.gameState.currentExitTurn;
    if (turn < 0) return;

    const team = this.roomState.gameState.teams[turn];
    if (!team || !team.isBot || team.isDisqualified || team.exitChoice !== null) return;

    // Bot just draws from the deck - no strategy needed
    this.roomState.gameState = drawExit(
      this.roomState.gameState,
      turn
    );

    // Broadcast the drawn exit card
    const updatedTeam = this.roomState.gameState.teams[turn];
    if (updatedTeam.exitChoice) {
      this.broadcast({
        type: 'exit-chosen',
        teamIndex: turn,
        exitCard: updatedTeam.exitChoice,
      });
    }

    // Check if all exits are drawn
    if (allExitsChosen(this.roomState.gameState)) {
      this.applyExitsAndFinish();
    } else {
      // Broadcast updated game state (shows current exit turn)
      this.broadcast({
        type: 'game-state',
        state: this.roomState.gameState,
      });

      // Schedule next bot exit draw
      this.scheduleBotExits();
    }
  }

  // ===========================================
  // Spectator Auto-Advance
  // ===========================================

  private executeSpectatorAdvance(): void {
    if (!this.roomState?.gameState) return;

    const phase = this.roomState.gameState.phase;
    const manualAdvancePhases = ['setup-summary', 'auction-summary'];

    if (!manualAdvancePhases.includes(phase)) return;

    this.roomState.gameState = advancePhase(this.roomState.gameState);

    this.broadcast({
      type: 'phase-changed',
      phase: this.roomState.gameState.phase,
    });

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Continue scheduling bot turns for the new phase
    this.scheduleBotTurnIfNeeded();

    // Continue auto-advancing if still in a spectator-advanceable phase
    if (this.roomState.spectatorMode) {
      this.scheduleSpectatorAutoAdvance();
    }
  }

  private executeSpectatorMarketDraw(): void {
    if (!this.roomState?.gameState) return;

    const phase = this.roomState.gameState.phase;
    if (phase !== 'seed' && phase !== 'early' && phase !== 'mature') return;

    // Don't draw if we're in wildcard phase (waiting for wildcard selections)
    if (this.roomState.gameState.wildcardPhase) return;

    // Draw market card
    this.roomState.gameState = drawMarketCard(this.roomState.gameState);

    // Broadcast drawn card
    this.broadcast({
      type: 'market-card-drawn',
      card: this.roomState.gameState.currentMarketCard,
    });

    // Apply market effects
    this.roomState.gameState = applyMarketEffects(this.roomState.gameState);

    // Apply market leader bonus
    this.roomState.gameState = applyMarketLeaderBonus(this.roomState.gameState);

    // Broadcast results (bots can now see valuations before wildcard decision)
    this.broadcast({
      type: 'market-results',
      performance: this.roomState.gameState.roundPerformance,
      teams: this.roomState.gameState.teams,
    });

    // Enter wildcard phase — bots react to market results
    this.roomState.gameState.wildcardPhase = true;
    this.roomState.gameState.teamWildcardSelections = {};

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Schedule bot wildcards
    this.scheduleBotWildcards();
  }
}
