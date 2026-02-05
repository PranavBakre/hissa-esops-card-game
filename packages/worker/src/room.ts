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
import { TEAM_DEFINITIONS, GAME } from '@esop-wars/shared';
import { createInitialState, registerTeam, advancePhase, isPhaseComplete } from './game-engine';

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

      // Additional handlers will be added in Phase 3+
      default: {
        // TypeScript narrows msg to never in exhaustive switch, but we may have unhandled types
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
    // Handle timers (bid timeout, AFK, etc.)
    // Will be implemented in Phase 3+
  }
}
