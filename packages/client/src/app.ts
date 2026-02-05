// ===========================================
// ESOP Wars v2 - Client Application
// ===========================================

import type {
  RoomState,
  GameState,
  ClientMessage,
  ServerMessage,
} from '@esop-wars/shared';
import { render, showToast } from './renderer';

// ===========================================
// Type Guards
// ===========================================

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null;
}

function isServerMessage(data: unknown): data is ServerMessage {
  if (!isRecord(data)) return false;
  return 'type' in data && typeof data.type === 'string';
}

// ===========================================
// Configuration
// ===========================================

const API_URL = import.meta.env.PROD
  ? 'https://esop-wars.workers.dev'
  : 'http://localhost:8787';

const WS_URL = import.meta.env.PROD
  ? 'wss://esop-wars.workers.dev'
  : 'ws://localhost:8787';

// ===========================================
// Client State
// ===========================================

export interface ClientState {
  playerId: string | null;
  playerName: string | null;
  roomCode: string | null;
  myTeamIndex: number | null;
  isHost: boolean;
  room: RoomState | null;
  gameState: GameState | null;
  ws: WebSocket | null;
  connected: boolean;
  view: 'home' | 'lobby' | 'game';
}

export const state: ClientState = {
  playerId: null,
  playerName: null,
  roomCode: null,
  myTeamIndex: null,
  isHost: false,
  room: null,
  gameState: null,
  ws: null,
  connected: false,
  view: 'home',
};

// ===========================================
// Initialization
// ===========================================

export function init(): void {
  // Check for saved session
  const savedPlayerId = localStorage.getItem('esop-wars-playerId');
  const savedRoomCode = localStorage.getItem('esop-wars-roomCode');
  const savedPlayerName = localStorage.getItem('esop-wars-playerName');

  if (savedPlayerId && savedRoomCode && savedPlayerName) {
    state.playerId = savedPlayerId;
    state.roomCode = savedRoomCode;
    state.playerName = savedPlayerName;

    // Attempt reconnection
    connect(savedRoomCode, true);
  } else {
    render();
  }
}

// ===========================================
// Room Management
// ===========================================

export async function createRoom(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    state.roomCode = data.code;

    // Prompt for name and connect
    const playerName = promptPlayerName();
    if (playerName) {
      connect(data.code, false);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    showToast('Failed to create room', 'error');
  }
}

export function joinRoom(code: string): void {
  const playerName = promptPlayerName();
  if (playerName) {
    state.roomCode = code.toUpperCase();
    connect(code.toUpperCase(), false);
  }
}

function promptPlayerName(): string | null {
  const savedName = localStorage.getItem('esop-wars-playerName');
  const name = prompt('Enter your name:', savedName || '');

  if (name && name.trim()) {
    state.playerName = name.trim();
    localStorage.setItem('esop-wars-playerName', name.trim());
    return name.trim();
  }

  return null;
}

// ===========================================
// WebSocket Connection
// ===========================================

function connect(roomCode: string, isReconnect: boolean): void {
  if (state.ws) {
    state.ws.close();
  }

  const ws = new WebSocket(`${WS_URL}/api/rooms/${roomCode}/ws`);

  ws.onopen = () => {
    state.ws = ws;
    state.connected = true;

    if (isReconnect && state.playerId) {
      send({ type: 'reconnect', playerId: state.playerId });
    } else {
      send({ type: 'join', playerName: state.playerName! });
    }
  };

  ws.onmessage = (event) => {
    try {
      const parsed: unknown = JSON.parse(event.data);
      if (!isServerMessage(parsed)) {
        console.error('Invalid server message:', parsed);
        return;
      }
      handleMessage(parsed);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  };

  ws.onclose = () => {
    state.connected = false;
    state.ws = null;

    // Attempt reconnection after delay
    if (state.roomCode) {
      showToast('Disconnected. Reconnecting...', 'warning');
      setTimeout(() => {
        if (state.roomCode && state.playerId) {
          connect(state.roomCode, true);
        }
      }, 2000);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    showToast('Connection error', 'error');
  };
}

export function send(message: ClientMessage): void {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(message));
  } else {
    console.error('WebSocket not connected');
    showToast('Not connected to server', 'error');
  }
}

// ===========================================
// Message Handling
// ===========================================

function handleMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'room-joined':
      handleRoomJoined(msg);
      break;

    case 'player-joined':
      if (state.room) {
        // Check if player already exists (reconnect)
        const existingIndex = state.room.players.findIndex(
          (p) => p.playerId === msg.player.playerId
        );
        if (existingIndex >= 0) {
          state.room.players[existingIndex] = msg.player;
        } else {
          state.room.players.push(msg.player);
        }
        render();
      }
      break;

    case 'player-left':
      if (state.room) {
        const player = state.room.players.find((p) => p.playerId === msg.playerId);
        if (player) {
          player.connected = false;
        }
        render();
      }
      break;

    case 'team-selected':
      if (state.room) {
        const player = state.room.players.find((p) => p.playerId === msg.playerId);
        if (player) {
          // Clear previous selection from other players
          state.room.players.forEach((p) => {
            if (p.teamIndex === msg.teamIndex && p.playerId !== msg.playerId) {
              p.teamIndex = null;
            }
          });
          player.teamIndex = msg.teamIndex;
        }
        if (msg.playerId === state.playerId) {
          state.myTeamIndex = msg.teamIndex;
        }
        render();
      }
      break;

    case 'game-state':
      state.gameState = msg.state;
      state.view = 'game';
      render();
      break;

    case 'team-updated':
      if (state.gameState) {
        state.gameState.teams[msg.teamIndex] = msg.team;
        render();
      }
      break;

    case 'phase-changed':
      if (state.gameState) {
        state.gameState.phase = msg.phase;
        render();
      }
      break;

    case 'turn-changed':
      if (state.gameState) {
        state.gameState.currentTurn = msg.teamIndex;
        render();
      }
      break;

    case 'bid-placed':
      if (state.gameState) {
        state.gameState.currentBid = {
          teamIndex: msg.teamIndex,
          amount: msg.amount,
        };
        render();
      }
      break;

    case 'error':
      showToast(msg.message, 'error');
      break;

    default:
      console.log('Unhandled message:', msg);
  }
}

function handleRoomJoined(msg: { room: RoomState; playerId: string }): void {
  state.playerId = msg.playerId;
  state.room = msg.room;
  state.gameState = msg.room.gameState;
  state.view = msg.room.status === 'LOBBY' ? 'lobby' : 'game';

  // Find my team
  const myPlayer = msg.room.players.find((p) => p.playerId === msg.playerId);
  if (myPlayer) {
    state.myTeamIndex = myPlayer.teamIndex;
    state.isHost = myPlayer.isHost;
  }

  // Save session
  localStorage.setItem('esop-wars-playerId', msg.playerId);
  localStorage.setItem('esop-wars-roomCode', msg.room.code);

  render();
}

// ===========================================
// Actions
// ===========================================

export function selectTeam(teamIndex: number): void {
  send({ type: 'select-team', teamIndex });
}

export function startGame(): void {
  send({ type: 'start-game' });
}

export function registerTeam(name: string, problemStatement: string): void {
  send({ type: 'register-team', name, problemStatement });
}

export function leaveRoom(): void {
  if (state.ws) {
    state.ws.close();
  }

  localStorage.removeItem('esop-wars-playerId');
  localStorage.removeItem('esop-wars-roomCode');

  state.playerId = null;
  state.roomCode = null;
  state.myTeamIndex = null;
  state.isHost = false;
  state.room = null;
  state.gameState = null;
  state.connected = false;
  state.view = 'home';

  render();
}
