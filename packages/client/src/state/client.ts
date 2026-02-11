// ===========================================
// ESOP Wars v2 - Client State (SolidJS Signals)
// ===========================================

import { createSignal } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import type {
  RoomState,
  GameState,
  GameSpeed,
  Phase,
} from '@esop-wars/shared';

// ===========================================
// Signals
// ===========================================

export const [playerId, setPlayerId] = createSignal<string | null>(null);
export const [playerName, setPlayerName] = createSignal<string | null>(null);
export const [roomCode, setRoomCode] = createSignal<string | null>(null);
export const [myTeamIndex, setMyTeamIndex] = createSignal<number | null>(null);
export const [isHost, setIsHost] = createSignal(false);
export const [connected, setConnected] = createSignal(false);
export const [view, setView] = createSignal<'home' | 'lobby' | 'game'>('home');
export const [spectatorMode, setSpectatorMode] = createSignal(false);
export const [gameSpeed, setGameSpeed] = createSignal<GameSpeed>('normal');
export const [pendingBotGame, setPendingBotGame] = createSignal(false);
export const [fillBots, setFillBots] = createSignal(true);

// ===========================================
// Stores (for deeply nested objects)
// ===========================================

export const [room, setRoom] = createStore<{ value: RoomState | null }>({ value: null });
export const [gameState, setGameState] = createStore<{ value: GameState | null }>({ value: null });

// ===========================================
// Derived State
// ===========================================

export const myTeam = () => {
  const g = gameState.value;
  const idx = myTeamIndex();
  if (!g || idx === null) return null;
  return g.teams[idx] ?? null;
};

export const isMyTurn = () => {
  const g = gameState.value;
  const idx = myTeamIndex();
  if (!g || idx === null) return false;
  return g.currentTurn === idx;
};

export const currentPhase = (): Phase | null => {
  return gameState.value?.phase ?? null;
};

// ===========================================
// UI State Signals
// ===========================================

export const [decisionLogOpen, setDecisionLogOpen] = createSignal(false);

// Phase intro tracking
const seenPhases = new Set<Phase>();
const dismissedPhases = new Set<Phase>();

export function hasSeenPhase(phase: Phase): boolean {
  return seenPhases.has(phase);
}

export function markPhaseSeen(phase: Phase): void {
  seenPhases.add(phase);
}

export function isDismissedPhase(phase: Phase): boolean {
  return dismissedPhases.has(phase);
}

export function dismissPhase(phase: Phase): void {
  dismissedPhases.add(phase);
}

// ===========================================
// Session Management
// ===========================================

export function clearSession(): void {
  localStorage.removeItem('esop-wars-playerId');
  localStorage.removeItem('esop-wars-roomCode');

  setPlayerId(null);
  setRoomCode(null);
  setMyTeamIndex(null);
  setIsHost(false);
  setRoom({ value: null });
  setGameState({ value: null });
  setView('home');
  setSpectatorMode(false);
  setGameSpeed('normal');
  setPendingBotGame(false);
}

// ===========================================
// State Update Helpers
// ===========================================

export function updateGameState(newState: GameState): void {
  setGameState('value', reconcile(newState));
}

export function updateRoom(newRoom: RoomState): void {
  setRoom('value', reconcile(newRoom));
}
