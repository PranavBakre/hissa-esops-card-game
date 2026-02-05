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
} from '@esop-wars/shared';
import { TEAM_DEFINITIONS, GAME, TIMING } from '@esop-wars/shared';
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
} from './game-engine';
import {
  validateDropCard,
  validateDrawCard,
  validateSkipDraw,
  validateLockSetup,
  validatePlaceBid,
} from './validators';
import {
  decideSetupDrop,
  decideSetupDraw,
  decideSetupLock,
  decideBid,
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

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
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
      };
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

  private handleMessage(ws: WebSocket, msg: ClientMessage): void {
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
        this.handleStartGame(ws, session);
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
        // No action needed for pass, just acknowledge
        break;

      default: {
        const unhandledMsg: { type: string } = msg;
        this.send(ws, { type: 'error', message: `Unknown message type: ${unhandledMsg.type}` });
      }
    }
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

    if (teamIndex < 0 || teamIndex >= GAME.TEAM_COUNT) {
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

  private handleStartGame(ws: WebSocket, session: SessionData): void {
    if (!this.roomState) return;

    if (!session.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can start the game' });
      return;
    }

    if (this.roomState.status !== 'LOBBY') {
      this.send(ws, { type: 'error', message: 'Game already started' });
      return;
    }

    // Build team config - fill empty slots with bots
    const teamConfigs: TeamConfig[] = TEAM_DEFINITIONS.map((def, index) => {
      const player = this.roomState!.players.find((p) => p.teamIndex === index);
      return {
        name: def.name,
        color: def.color,
        playerId: player?.playerId ?? null,
        isBot: !player,
      };
    });

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
    if (team.name !== TEAM_DEFINITIONS[session.teamIndex].name) {
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
  // Bot Scheduling
  // ===========================================

  private scheduleBotTurnIfNeeded(): void {
    if (!this.roomState?.gameState) return;

    const phase = this.roomState.gameState.phase;

    if (phase === 'setup') {
      const currentTurn = this.roomState.gameState.setupDraftTurn;
      const team = this.roomState.gameState.teams[currentTurn];

      if (team.isBot) {
        this.scheduleAlarm(getBotDelay());
      }
    } else if (phase === 'setup-lock') {
      // Schedule bot locks
      this.scheduleBotLocks();
    } else if (phase === 'auction') {
      // Start auction timer
      this.scheduleAuctionTimeout();
      this.scheduleBotBids();
    }
  }

  private scheduleBotLocks(): void {
    if (!this.roomState?.gameState) return;

    const botsNeedingLock = this.roomState.gameState.teams
      .map((t, i) => ({ team: t, index: i }))
      .filter(({ team }) => team.isBot && team.lockedSegment === null);

    if (botsNeedingLock.length > 0) {
      this.scheduleAlarm(getBotDelay());
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
      this.scheduleAlarm(BOT_TIMING.BID_DELAY_MS);
    }
  }

  private scheduleAuctionTimeout(): void {
    this.scheduleAlarm(TIMING.BID_TIMEOUT_MS);
  }

  private scheduleAlarm(delayMs: number): void {
    this.state.storage.setAlarm(Date.now() + delayMs);
  }

  private autoRegisterBots(): void {
    if (!this.roomState?.gameState) return;

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

    this.roomState.gameState.teams.forEach((team, index) => {
      if (team.isBot) {
        this.roomState!.gameState = registerTeam(
          this.roomState!.gameState!,
          index,
          botNames[index],
          botProblems[index]
        );

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
    }
  }

  private handleClose(ws: WebSocket): void {
    const session = this.sessions.get(ws);
    if (session && this.roomState) {
      const player = this.roomState.players.find((p) => p.playerId === session.playerId);
      if (player) {
        player.connected = false;

        this.broadcast({
          type: 'player-left',
          playerId: session.playerId,
        });
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
    if (!this.roomState?.gameState) return;

    const phase = this.roomState.gameState.phase;

    if (phase === 'setup') {
      this.executeBotSetupTurn();
    } else if (phase === 'setup-lock') {
      this.executeBotLock();
    } else if (phase === 'auction' || phase === 'secondary-hire') {
      this.handleAuctionTimeout();
    }
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

        // Schedule draw phase
        this.scheduleAlarm(getBotDelay());
      }
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

      // Schedule next bot lock if needed
      if (this.roomState.gameState.phase === 'setup-lock') {
        this.scheduleBotLocks();
      }
    }
  }

  private handleAuctionTimeout(): void {
    if (!this.roomState?.gameState) return;

    const card = getCurrentCard(this.roomState.gameState);
    if (!card) return;

    // First check if any bots want to bid
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

    // Let a random eligible bot try to bid
    if (eligibleBots.length > 0) {
      const randomBot = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
      const decision = decideBid(this.roomState.gameState, randomBot.index, card);

      if (decision.action === 'bid' && decision.amount !== undefined) {
        const validation = validatePlaceBid(
          this.roomState.gameState,
          randomBot.index,
          decision.amount
        );

        if (validation.valid) {
          this.roomState.gameState = placeBid(
            this.roomState.gameState,
            randomBot.index,
            decision.amount
          );

          this.broadcast({
            type: 'bid-placed',
            teamIndex: randomBot.index,
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
    this.roomState.gameState = closeBidding(this.roomState.gameState);

    this.broadcast({
      type: 'bidding-closed',
      winner: previousBid,
      card,
    });

    this.broadcast({
      type: 'game-state',
      state: this.roomState.gameState,
    });

    // Check if auction complete
    if (this.roomState.gameState.phase === 'auction') {
      // Start next card
      this.scheduleBotTurnIfNeeded();
    } else {
      this.checkPhaseCompletion();
    }
  }
}
