// ===========================================
// ESOP Wars v2 - WebSocket Connection & Messages
// ===========================================

import type {
  ClientMessage,
  ServerMessage,
  RoomState,
  GameState,
  GameSpeed,
} from '@esop-wars/shared';
import {
  playerId, setPlayerId,
  playerName, setPlayerName,
  roomCode, setRoomCode,
  myTeamIndex,
  setMyTeamIndex,
  setIsHost,
  setConnected,
  setView,
  setSpectatorMode,
  setGameSpeed,
  pendingBotGame, setPendingBotGame,
  fillBots, setFillBots,
  setRoom,
  room,
  gameState,
  setGameState,
  updateGameState,
  updateRoom,
  clearSession,
} from './client';
import { showToast } from '../components/common/Toast';

// ===========================================
// Configuration
// ===========================================

const API_URL = import.meta.env.PROD
  ? 'https://esop-game-api.psbakre.dev'
  : 'http://localhost:8787';

const WS_URL = import.meta.env.PROD
  ? 'wss://esop-game-api.psbakre.dev'
  : 'ws://localhost:8787';

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
// WebSocket State
// ===========================================

let ws: WebSocket | null = null;

// ===========================================
// Send
// ===========================================

export function send(message: ClientMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.error('WebSocket not connected');
    showToast('Not connected to server', 'error');
  }
}

// ===========================================
// Connection
// ===========================================

function connect(code: string, isReconnect: boolean): void {
  if (ws) {
    ws.close();
  }

  const socket = new WebSocket(`${WS_URL}/api/rooms/${code}/ws`);
  let connectionOpened = false;

  socket.onopen = () => {
    connectionOpened = true;
    ws = socket;
    setConnected(true);

    const pid = playerId();
    if (isReconnect && pid) {
      send({ type: 'reconnect', playerId: pid });
    } else {
      const name = playerName();
      if (name) {
        send({ type: 'join', playerName: name });
      }
    }
  };

  socket.onmessage = (event) => {
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

  socket.onclose = () => {
    setConnected(false);
    ws = null;

    if (!connectionOpened) {
      showToast('Room not found', 'error');
      clearSession();
      return;
    }

    const rc = roomCode();
    if (rc) {
      showToast('Disconnected. Reconnecting...', 'warning');
      setTimeout(() => {
        const currentRoomCode = roomCode();
        const pid = playerId();
        if (currentRoomCode && pid) {
          connect(currentRoomCode, true);
        }
      }, 2000);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// ===========================================
// Room Management
// ===========================================

function promptPlayerName(): string | null {
  const savedName = localStorage.getItem('esop-wars-playerName');
  const name = prompt('Enter your name:', savedName || '');

  if (name && name.trim()) {
    setPlayerName(name.trim());
    localStorage.setItem('esop-wars-playerName', name.trim());
    return name.trim();
  }

  return null;
}

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
    setRoomCode(data.code);

    const name = promptPlayerName();
    if (name) {
      connect(data.code, false);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    showToast('Failed to create room', 'error');
  }
}

export function joinRoom(code: string): void {
  const name = promptPlayerName();
  if (name) {
    setRoomCode(code.toUpperCase());
    connect(code.toUpperCase(), false);
  }
}

export async function watchBotGame(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    setRoomCode(data.code);
    setPlayerName('Spectator');
    localStorage.setItem('esop-wars-playerName', 'Spectator');

    setPendingBotGame(true);
    connect(data.code, false);
  } catch (error) {
    console.error('Error creating bot game room:', error);
    showToast('Failed to create room', 'error');
  }
}

// ===========================================
// Initialization
// ===========================================

export function init(): void {
  const savedPlayerId = localStorage.getItem('esop-wars-playerId');
  const savedRoomCode = localStorage.getItem('esop-wars-roomCode');
  const savedPlayerName = localStorage.getItem('esop-wars-playerName');

  if (savedPlayerId && savedRoomCode && savedPlayerName) {
    setPlayerId(savedPlayerId);
    setRoomCode(savedRoomCode);
    setPlayerName(savedPlayerName);
    connect(savedRoomCode, true);
  }
}

// ===========================================
// Actions
// ===========================================

export function selectTeam(teamIndex: number): void {
  send({ type: 'select-team', teamIndex });
}

export function startGame(): void {
  send({ type: 'start-game', fillBots: fillBots() });
}

export function toggleFillBots(): void {
  setFillBots(!fillBots());
}

export function startBotGame(): void {
  setSpectatorMode(true);
  send({ type: 'start-bot-game' });
}

export function setGameSpeedAction(speed: GameSpeed): void {
  setGameSpeed(speed);
  send({ type: 'set-game-speed', speed });
}

export function registerTeam(name: string): void {
  send({ type: 'register-team', name });
}

export function leaveRoom(): void {
  if (ws) {
    ws.close();
  }
  setConnected(false);
  clearSession();
}

// Setup Phase Actions
export function dropCard(cardId: number, isSegment: boolean): void {
  send({ type: 'drop-card', cardId, isSegment });
}

export function drawCard(deckType: 'segment' | 'idea'): void {
  send({ type: 'draw-card', deckType });
}

export function skipDraw(): void {
  send({ type: 'skip-draw' });
}

export function lockSetup(segmentId: number, ideaId: number): void {
  send({ type: 'lock-setup', segmentId, ideaId });
}

// Auction Phase Actions
export function placeBid(amount: number): void {
  send({ type: 'place-bid', amount });
}

export function passBid(): void {
  send({ type: 'pass-bid' });
}

export function advancePhase(): void {
  send({ type: 'advance-phase' });
}

// Wildcard Actions
export function selectWildcard(choice: 'double-down' | 'shield' | 'pass'): void {
  send({ type: 'select-wildcard', choice });
}

// Market Actions
export function drawMarket(): void {
  send({ type: 'draw-market' });
}

// Secondary Auction Actions
export function dropEmployeeAction(employeeId: number): void {
  send({ type: 'drop-employee', employeeId });
}

// Investment Actions
export function declareInvestment(targetTeamIndex: number | null): void {
  send({ type: 'declare-investment', targetTeamIndex });
}

export function placeInvestmentBid(amount: number): void {
  send({ type: 'place-investment-bid', amount });
}

export function passInvestmentBid(): void {
  send({ type: 'pass-investment-bid' });
}

export function resolveInvestmentTie(chosenTeamIndex: number): void {
  send({ type: 'resolve-investment-tie', chosenTeamIndex });
}

// Exit Actions
export function drawExit(): void {
  send({ type: 'draw-exit' });
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
      if (room.value) {
        const existingIndex = room.value.players.findIndex(
          (p) => p.playerId === msg.player.playerId
        );
        if (existingIndex >= 0) {
          setRoom('value', 'players', existingIndex, msg.player);
        } else {
          setRoom('value', 'players', room.value.players.length, msg.player);
        }
      }
      break;

    case 'player-left':
      if (room.value) {
        const idx = room.value.players.findIndex((p) => p.playerId === msg.playerId);
        if (idx >= 0) {
          setRoom('value', 'players', idx, 'connected', false);
        }
      }
      break;

    case 'team-selected':
      if (room.value) {
        // Clear previous selection from other players
        room.value.players.forEach((p, i) => {
          if (p.teamIndex === msg.teamIndex && p.playerId !== msg.playerId) {
            setRoom('value', 'players', i, 'teamIndex', null);
          }
        });
        const playerIdx = room.value.players.findIndex((p) => p.playerId === msg.playerId);
        if (playerIdx >= 0) {
          setRoom('value', 'players', playerIdx, 'teamIndex', msg.teamIndex);
        }
        if (msg.playerId === playerId()) {
          setMyTeamIndex(msg.teamIndex);
        }
      }
      break;

    case 'game-state':
      updateGameState(msg.state);
      setView('game');
      break;

    case 'team-updated':
      if (gameState.value) {
        setGameState('value', 'teams', msg.teamIndex, msg.team);
      }
      break;

    case 'phase-changed':
      if (gameState.value) {
        setGameState('value', 'phase', msg.phase);
      }
      break;

    case 'turn-changed':
      if (gameState.value) {
        setGameState('value', 'currentTurn', msg.teamIndex);
      }
      break;

    case 'bid-placed':
      if (gameState.value) {
        setGameState('value', 'currentBid', {
          teamIndex: msg.teamIndex,
          amount: msg.amount,
        });
      }
      break;

    case 'bid-passed':
      if (msg.teamIndex === myTeamIndex()) {
        showToast('You passed on this card', 'warning');
      }
      break;

    case 'bidding-closed':
      if (gameState.value && msg.winner) {
        const winnerTeam = gameState.value.teams[msg.winner.teamIndex];
        if (winnerTeam) {
          showToast(`${winnerTeam.name} won ${msg.card.name} for ${msg.winner.amount}% ESOP`, 'success');
        }
      } else if (msg.card) {
        showToast(`No bids for ${msg.card.name}`, 'warning');
      }
      break;

    case 'wildcard-selected':
      showToast('Wildcard choice submitted', 'success');
      break;

    case 'wildcards-revealed':
      if (gameState.value) {
        msg.selections.forEach((choice, index) => {
          if (choice && choice !== 'pass') {
            const team = gameState.value?.teams[index];
            if (team) {
              showToast(`${team.name} used ${choice}!`, 'warning');
            }
          }
        });
      }
      break;

    case 'market-card-drawn':
      if (msg.card) {
        showToast(`Market: ${msg.card.name}`, 'warning');
      }
      break;

    case 'market-results':
      // Reactive store will auto-update UI
      break;

    case 'employee-dropped':
      showToast('Employee drop submitted', 'success');
      break;

    case 'drops-revealed':
      showToast(`${msg.dropped.length} employees entering secondary pool`, 'warning');
      break;

    case 'exit-chosen':
      if (gameState.value && msg.exitCard) {
        setGameState('value', 'teams', msg.teamIndex, 'exitChoice', msg.exitCard);
        const team = gameState.value.teams[msg.teamIndex];
        if (team) {
          showToast(`${team.name} drew ${msg.exitCard.name} (${msg.exitCard.multiplier}x)`, 'success');
        }
      }
      break;

    case 'investment-declared': {
      if (gameState.value) {
        const team = gameState.value.teams[msg.teamIndex];
        if (team) {
          showToast(`${team.name} submitted investment decision`, 'success');
        }
      }
      break;
    }

    case 'investment-conflict':
      if (gameState.value) {
        const target = gameState.value.teams[msg.targetTeamIndex];
        if (target) {
          showToast(`Bidding war for ${target.name}!`, 'warning');
        }
      }
      break;

    case 'investment-bid-placed':
      if (gameState.value) {
        const bidder = gameState.value.teams[msg.teamIndex];
        if (bidder) {
          showToast(`${bidder.name} bids $${(msg.amount / 1000).toFixed(0)}K`, 'success');
        }
      }
      break;

    case 'investment-bid-passed':
      if (gameState.value) {
        const passer = gameState.value.teams[msg.teamIndex];
        if (passer) {
          showToast(`${passer.name} drops out of bidding`, 'warning');
        }
      }
      break;

    case 'investment-resolved':
      if (gameState.value) {
        msg.investments.forEach((inv) => {
          const investor = gameState.value?.teams[inv.investor];
          const target = gameState.value?.teams[inv.target];
          if (investor && target) {
            showToast(`${investor.name} invests $${(inv.amount / 1000).toFixed(0)}K in ${target.name}`, 'success');
          }
        });
      }
      break;

    case 'investment-tie':
      if (gameState.value) {
        const target = gameState.value.teams[msg.targetTeamIndex];
        if (target) {
          showToast(`Tie for ${target.name}! Owner must decide.`, 'warning');
        }
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
  setPlayerId(msg.playerId);
  updateRoom(msg.room);
  if (msg.room.gameState) {
    updateGameState(msg.room.gameState);
  } else {
    setGameState({ value: null });
  }
  setView(msg.room.status === 'LOBBY' ? 'lobby' : 'game');
  setSpectatorMode(msg.room.spectatorMode);
  setGameSpeed(msg.room.gameSpeed);

  const myPlayer = msg.room.players.find((p) => p.playerId === msg.playerId);
  if (myPlayer) {
    setMyTeamIndex(myPlayer.teamIndex);
    setIsHost(myPlayer.isHost);
  }

  localStorage.setItem('esop-wars-playerId', msg.playerId);
  localStorage.setItem('esop-wars-roomCode', msg.room.code);

  if (pendingBotGame()) {
    setPendingBotGame(false);
    startBotGame();
  }
}

