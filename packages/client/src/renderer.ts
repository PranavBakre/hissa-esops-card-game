// ===========================================
// ESOP Wars v2 - Client Renderer
// ===========================================

import type { Phase } from '@esop-wars/shared';
import { TEAM_DEFINITIONS, PHASE_LABELS } from '@esop-wars/shared';
import {
  state,
  createRoom,
  joinRoom,
  selectTeam,
  startGame,
  registerTeam,
  leaveRoom,
} from './app';

// ===========================================
// DOM Type Guards
// ===========================================

function isInputElement(el: EventTarget | Element | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement;
}

function isTextAreaElement(el: EventTarget | Element | null): el is HTMLTextAreaElement {
  return el instanceof HTMLTextAreaElement;
}

function getInputById(id: string): HTMLInputElement | null {
  const el = document.getElementById(id);
  return isInputElement(el) ? el : null;
}

function getTextAreaById(id: string): HTMLTextAreaElement | null {
  const el = document.getElementById(id);
  return isTextAreaElement(el) ? el : null;
}

// ===========================================
// Main Render
// ===========================================

export function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  switch (state.view) {
    case 'home':
      renderHome(app);
      break;
    case 'lobby':
      renderLobby(app);
      break;
    case 'game':
      renderGame(app);
      break;
  }
}

// ===========================================
// Home Screen
// ===========================================

function renderHome(app: HTMLElement): void {
  app.innerHTML = `
    <div class="home-screen">
      <h1 class="game-title">ESOP Wars</h1>
      <p class="game-subtitle">Build the highest-valued startup</p>

      <div class="home-actions">
        <button class="btn btn-primary btn-large" id="create-room-btn">
          Create Room
        </button>

        <div class="join-room-form">
          <input
            type="text"
            id="room-code-input"
            placeholder="Enter room code"
            maxlength="4"
            class="input-room-code"
          />
          <button class="btn btn-secondary" id="join-room-btn">
            Join
          </button>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('create-room-btn')?.addEventListener('click', () => {
    createRoom();
  });

  document.getElementById('join-room-btn')?.addEventListener('click', () => {
    const input = getInputById('room-code-input');
    if (input && input.value.length === 4) {
      joinRoom(input.value);
    } else {
      showToast('Please enter a 4-character room code', 'warning');
    }
  });

  const codeInput = getInputById('room-code-input');
  codeInput?.addEventListener('input', (e) => {
    if (e.target && isInputElement(e.target)) {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
  });

  codeInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('join-room-btn')?.click();
    }
  });
}

// ===========================================
// Lobby Screen
// ===========================================

function renderLobby(app: HTMLElement): void {
  if (!state.room) return;

  const teamSlots = TEAM_DEFINITIONS.map((def, index) => {
    const player = state.room?.players.find((p) => p.teamIndex === index);
    const isMyTeam = state.myTeamIndex === index;
    const isTaken = !!player && player.playerId !== state.playerId;

    return `
      <div
        class="team-slot ${isMyTeam ? 'selected' : ''} ${isTaken ? 'taken' : ''}"
        data-team-index="${index}"
        style="--team-color: ${def.color}"
      >
        <div class="team-color-bar"></div>
        <div class="team-name">${def.name}</div>
        <div class="team-player">
          ${player ? (player.playerId === state.playerId ? 'You' : player.playerName) : 'Empty'}
        </div>
        ${!player && !isMyTeam ? '<div class="team-action">Click to join</div>' : ''}
      </div>
    `;
  }).join('');

  const playersList = state.room.players
    .map((p) => `
      <div class="player-item ${!p.connected ? 'disconnected' : ''}">
        <span class="player-name">${p.playerName}</span>
        ${p.isHost ? '<span class="host-badge">Host</span>' : ''}
        ${!p.connected ? '<span class="status-badge">Offline</span>' : ''}
      </div>
    `)
    .join('');

  app.innerHTML = `
    <div class="lobby-screen">
      <div class="lobby-header">
        <h2>Room: ${state.room.code}</h2>
        <button class="btn btn-text" id="leave-btn">Leave</button>
      </div>

      <div class="lobby-content">
        <div class="team-selection">
          <h3>Select Your Team</h3>
          <div class="team-slots">
            ${teamSlots}
          </div>
        </div>

        <div class="players-panel">
          <h3>Players (${state.room.players.length})</h3>
          <div class="players-list">
            ${playersList}
          </div>
        </div>
      </div>

      <div class="lobby-footer">
        ${state.isHost ? `
          <button
            class="btn btn-primary btn-large"
            id="start-game-btn"
            ${state.room.players.some((p) => p.teamIndex !== null) ? '' : 'disabled'}
          >
            Start Game
          </button>
          <p class="lobby-hint">Empty team slots will be filled with bots</p>
        ` : `
          <p class="lobby-hint">Waiting for host to start the game...</p>
        `}
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('leave-btn')?.addEventListener('click', leaveRoom);

  document.querySelectorAll('.team-slot:not(.taken)').forEach((slot) => {
    slot.addEventListener('click', () => {
      const index = parseInt(slot.getAttribute('data-team-index') || '0', 10);
      selectTeam(index);
    });
  });

  document.getElementById('start-game-btn')?.addEventListener('click', startGame);
}

// ===========================================
// Game Screen
// ===========================================

function renderGame(app: HTMLElement): void {
  if (!state.gameState) return;

  const phase = state.gameState.phase;

  let content = '';
  switch (phase) {
    case 'registration':
      content = renderRegistration();
      break;
    case 'setup':
    case 'setup-lock':
    case 'setup-summary':
    case 'auction':
    case 'auction-summary':
    case 'seed':
    case 'early':
    case 'secondary-drop':
    case 'secondary-hire':
    case 'mature':
    case 'exit':
    case 'winner':
      content = renderPlaceholder(phase);
      break;
    default:
      content = '<p>Unknown phase</p>';
  }

  app.innerHTML = `
    <div class="game-screen">
      ${renderPhaseBar()}
      <div class="game-layout">
        ${renderTeamsSidebar()}
        <div class="game-main">
          ${content}
        </div>
      </div>
    </div>
  `;

  // Attach event listeners based on phase
  attachPhaseEventListeners(phase);
}

// ===========================================
// Phase Bar
// ===========================================

function renderPhaseBar(): string {
  if (!state.gameState) return '';

  const mainPhases: Phase[] = [
    'registration',
    'setup',
    'auction',
    'seed',
    'early',
    'mature',
    'exit',
    'winner',
  ];

  const currentIndex = mainPhases.indexOf(state.gameState.phase);

  return `
    <div class="phase-bar">
      ${mainPhases.map((phase, index) => `
        <div class="phase-item ${state.gameState?.phase === phase ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}">
          ${PHASE_LABELS[phase] || phase}
        </div>
      `).join('')}
    </div>
  `;
}

// ===========================================
// Teams Sidebar
// ===========================================

function renderTeamsSidebar(): string {
  if (!state.gameState) return '';

  return `
    <div class="teams-sidebar">
      <h3>Teams</h3>
      ${state.gameState.teams.map((team, index) => `
        <div
          class="sidebar-team ${state.myTeamIndex === index ? 'my-team' : ''} ${team.isDisqualified ? 'disqualified' : ''}"
          style="--team-color: ${team.color}"
        >
          <div class="sidebar-team-header">
            <span class="team-name">${team.name}</span>
            ${team.isBot ? '<span class="bot-badge">Bot</span>' : ''}
          </div>
          <div class="team-valuation">${formatCurrency(team.valuation)}</div>
          <div class="team-esop">${team.esopRemaining}% ESOP</div>
          <div class="team-employees">${team.employees.length}/3 employees</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ===========================================
// Registration Phase
// ===========================================

function renderRegistration(): string {
  if (!state.gameState) return '';

  const myTeam = state.myTeamIndex !== null
    ? state.gameState.teams[state.myTeamIndex]
    : null;

  const isRegistered = myTeam && myTeam.name !== TEAM_DEFINITIONS[state.myTeamIndex!].name;

  return `
    <div class="registration-phase">
      <h2>Registration</h2>
      <p class="phase-description">Register your startup details</p>

      ${myTeam && !isRegistered ? `
        <form class="registration-form" id="registration-form">
          <div class="form-group">
            <label for="team-name">Startup Name</label>
            <input
              type="text"
              id="team-name"
              placeholder="Enter your startup name"
              maxlength="30"
              required
            />
          </div>
          <div class="form-group">
            <label for="problem-statement">Problem Statement</label>
            <textarea
              id="problem-statement"
              placeholder="What problem are you solving?"
              maxlength="100"
              rows="3"
              required
            ></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Register</button>
        </form>
      ` : myTeam ? `
        <div class="registration-complete">
          <h3>Registered!</h3>
          <p><strong>${myTeam.name}</strong></p>
          <p>${myTeam.problemStatement}</p>
        </div>
      ` : `
        <p>You are spectating this game.</p>
      `}

      <div class="registration-status">
        <h3>Teams</h3>
        ${state.gameState.teams.map((team, index) => {
          const defaultName = TEAM_DEFINITIONS[index].name;
          const isRegistered = team.name !== defaultName;
          return `
            <div class="registration-team ${isRegistered ? 'registered' : 'pending'}">
              <span class="team-dot" style="background: ${team.color}"></span>
              <span class="team-name">${team.name}</span>
              <span class="registration-badge">${isRegistered ? 'Registered' : 'Pending'}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ===========================================
// Placeholder for other phases
// ===========================================

function renderPlaceholder(phase: Phase): string {
  return `
    <div class="phase-placeholder">
      <h2>${PHASE_LABELS[phase] || phase}</h2>
      <p>This phase will be implemented in Phase 3+</p>
    </div>
  `;
}

// ===========================================
// Event Listeners
// ===========================================

function attachPhaseEventListeners(phase: Phase): void {
  if (phase === 'registration') {
    const form = document.getElementById('registration-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = getInputById('team-name');
      const problemInput = getTextAreaById('problem-statement');

      if (nameInput && problemInput && nameInput.value.trim() && problemInput.value.trim()) {
        registerTeam(nameInput.value.trim(), problemInput.value.trim());
      }
    });
  }
}

// ===========================================
// Utilities
// ===========================================

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `₹${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `₹${(value / 1_000_000).toFixed(0)}M`;
  }
  return `₹${value.toLocaleString()}`;
}

export function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
