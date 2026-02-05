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
  dropCard,
  drawCard,
  skipDraw,
  lockSetup,
  placeBid,
  advancePhase,
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
      content = renderSetupPhase();
      break;
    case 'setup-lock':
      content = renderSetupLock();
      break;
    case 'setup-summary':
      content = renderSetupSummary();
      break;
    case 'auction':
      content = renderAuction();
      break;
    case 'auction-summary':
      content = renderAuctionSummary();
      break;
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
// Setup Phase
// ===========================================

function renderSetupPhase(): string {
  if (!state.gameState) return '';

  const isMyTurn = state.myTeamIndex === state.gameState.setupDraftTurn;
  const currentTeam = state.gameState.teams[state.gameState.setupDraftTurn];
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;

  const setupPhase = state.gameState.setupPhase;
  const round = state.gameState.setupRound;

  return `
    <div class="setup-phase">
      <h2>Setup Drafting - Round ${round}/3</h2>
      <p class="phase-description">Build your startup's identity</p>

      <div class="turn-indicator ${isMyTurn ? 'your-turn' : ''}">
        ${isMyTurn
          ? `<strong>Your turn!</strong> ${setupPhase === 'drop' ? 'Drop a card' : 'Draw or skip'}`
          : `Waiting for ${currentTeam.name}...`
        }
      </div>

      ${myTeam ? `
        <div class="setup-hand">
          <h3>Your Hand</h3>
          <div class="card-grid">
            ${myTeam.setupHand.map((card) => {
              const isSegment = !('type' in card);
              const canDrop = isMyTurn && setupPhase === 'drop';
              return `
                <div class="setup-card ${isSegment ? 'segment' : 'idea'} ${canDrop ? 'clickable' : ''}"
                     data-card-id="${card.id}" data-is-segment="${isSegment}">
                  <div class="card-type">${isSegment ? 'Segment' : card.type}</div>
                  <div class="card-name">${card.name}</div>
                  <div class="card-desc">${card.description}</div>
                  ${canDrop ? '<div class="card-action">Click to drop</div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${isMyTurn && setupPhase === 'draw' ? `
          <div class="draw-options">
            <h3>Draw a Card</h3>
            <div class="draw-buttons">
              <button class="btn btn-secondary" id="draw-segment-btn"
                ${state.gameState.segmentDeck.length === 0 ? 'disabled' : ''}>
                Draw Segment (${state.gameState.segmentDeck.length} left)
              </button>
              <button class="btn btn-secondary" id="draw-idea-btn"
                ${state.gameState.ideaDeck.length === 0 ? 'disabled' : ''}>
                Draw Idea (${state.gameState.ideaDeck.length} left)
              </button>
              <button class="btn btn-text" id="skip-draw-btn">
                Skip Draw
              </button>
            </div>
          </div>
        ` : ''}
      ` : '<p>You are spectating.</p>'}
    </div>
  `;
}

function renderSetupLock(): string {
  if (!state.gameState) return '';

  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  const isLocked = myTeam && myTeam.lockedSegment !== null;

  const segments = myTeam?.setupHand.filter((c) => !('type' in c)) ?? [];
  const ideas = myTeam?.setupHand.filter((c) => 'type' in c) ?? [];

  return `
    <div class="setup-lock-phase">
      <h2>Lock Your Selection</h2>
      <p class="phase-description">Choose your final segment and idea combination</p>

      ${myTeam && !isLocked ? `
        <div class="lock-selection">
          <div class="selection-group">
            <h3>Select Segment</h3>
            <div class="card-grid">
              ${segments.map((card) => `
                <div class="setup-card segment selectable" data-segment-id="${card.id}">
                  <div class="card-type">Segment</div>
                  <div class="card-name">${card.name}</div>
                  <div class="card-desc">${card.description}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="selection-group">
            <h3>Select Idea</h3>
            <div class="card-grid">
              ${ideas.map((card) => `
                <div class="setup-card idea selectable" data-idea-id="${card.id}">
                  <div class="card-type">${card.type}</div>
                  <div class="card-name">${card.name}</div>
                  <div class="card-desc">${card.description}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <button class="btn btn-primary btn-large" id="lock-btn" disabled>
            Lock Selection
          </button>
        </div>
      ` : myTeam && isLocked ? `
        <div class="lock-complete">
          <h3>Selection Locked!</h3>
          <div class="locked-cards">
            <div class="setup-card segment locked">
              <div class="card-type">Segment</div>
              <div class="card-name">${myTeam.lockedSegment?.name}</div>
            </div>
            <div class="setup-card idea locked">
              <div class="card-type">${myTeam.lockedIdea?.type}</div>
              <div class="card-name">${myTeam.lockedIdea?.name}</div>
            </div>
          </div>
          ${myTeam.setupBonus ? `
            <div class="bonus-display">
              Bonus: +${(myTeam.setupBonus.bonus.modifier * 100).toFixed(0)}% ${myTeam.setupBonus.bonus.category}
            </div>
          ` : ''}
        </div>
      ` : '<p>You are spectating.</p>'}

      <div class="teams-progress">
        <h3>Team Progress</h3>
        ${state.gameState.teams.map((team) => `
          <div class="team-progress-item ${team.lockedSegment ? 'locked' : 'pending'}">
            <span class="team-dot" style="background: ${team.color}"></span>
            <span>${team.name}</span>
            <span class="status">${team.lockedSegment ? 'Locked' : 'Selecting...'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSetupSummary(): string {
  if (!state.gameState) return '';

  return `
    <div class="setup-summary">
      <h2>Setup Complete</h2>
      <p class="phase-description">Review all team selections before the auction</p>

      <div class="summary-grid">
        ${state.gameState.teams.map((team) => `
          <div class="team-summary" style="--team-color: ${team.color}">
            <div class="team-header">${team.name}</div>
            <div class="team-problem">${team.problemStatement}</div>
            <div class="team-setup">
              <div class="segment-badge">${team.lockedSegment?.name ?? 'None'}</div>
              <div class="idea-badge">${team.lockedIdea?.name ?? 'None'}</div>
            </div>
            ${team.setupBonus ? `
              <div class="bonus-badge">
                +${(team.setupBonus.bonus.modifier * 100).toFixed(0)}% ${team.setupBonus.bonus.category}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      ${state.isHost ? `
        <div class="summary-actions">
          <button class="btn btn-primary btn-large" id="advance-phase-btn">
            Continue to Auction
          </button>
        </div>
      ` : `
        <p class="summary-note">Waiting for host to continue...</p>
      `}
    </div>
  `;
}

// ===========================================
// Auction Phase
// ===========================================

function renderAuction(): string {
  if (!state.gameState) return '';

  const currentCard = state.gameState.employeeDeck[state.gameState.currentCardIndex];
  const currentBid = state.gameState.currentBid;
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;

  if (!currentCard) {
    return '<div class="auction-complete">Auction complete!</div>';
  }

  const canBid = myTeam &&
    !myTeam.isDisqualified &&
    myTeam.employees.length < 3 &&
    myTeam.esopRemaining > 0;

  const minBid = currentBid ? currentBid.amount + 1 : 1;

  return `
    <div class="auction-phase">
      <h2>Employee Auction</h2>
      <p class="phase-description">Bid ESOP to hire employees for your team</p>

      <div class="auction-card">
        <div class="employee-card">
          <div class="employee-category">${currentCard.category}</div>
          <div class="employee-name">${currentCard.name}</div>
          <div class="employee-role">${currentCard.role}</div>
          <div class="employee-stats">
            <div class="stat">
              <span class="stat-label">Hard Skill</span>
              <span class="stat-value">${(currentCard.hardSkill * 100).toFixed(0)}%</span>
            </div>
            <div class="soft-skills">
              ${Object.entries(currentCard.softSkills).map(([skill, value]) => `
                <div class="soft-skill">
                  <span>${skill}</span>
                  <span>${(value * 100).toFixed(0)}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="bid-status">
        ${currentBid ? `
          <div class="current-bid">
            <span>Current Bid:</span>
            <strong>${currentBid.amount}% ESOP</strong>
            <span>by ${state.gameState.teams[currentBid.teamIndex].name}</span>
          </div>
        ` : `
          <div class="no-bid">No bids yet</div>
        `}
      </div>

      ${canBid ? `
        <div class="bid-controls">
          <div class="bid-input-group">
            <button class="btn btn-secondary" id="bid-decrease">-</button>
            <input type="number" id="bid-amount" value="${minBid}" min="${minBid}" max="${myTeam.esopRemaining}">
            <button class="btn btn-secondary" id="bid-increase">+</button>
          </div>
          <div class="bid-buttons">
            <button class="btn btn-primary" id="place-bid-btn">
              Place Bid
            </button>
          </div>
          <div class="esop-remaining">
            Your ESOP: ${myTeam.esopRemaining}% remaining
          </div>
        </div>
      ` : myTeam ? `
        <div class="cannot-bid">
          ${myTeam.employees.length >= 3 ? 'You have hired 3 employees' : 'No ESOP remaining'}
        </div>
      ` : '<p>You are spectating.</p>'}

      <div class="auction-progress">
        Card ${state.gameState.currentCardIndex + 1} of ${state.gameState.employeeDeck.length}
      </div>
    </div>
  `;
}

function renderAuctionSummary(): string {
  if (!state.gameState) return '';

  return `
    <div class="auction-summary">
      <h2>Auction Complete</h2>
      <p class="phase-description">Review hired employees before market rounds</p>

      <div class="summary-grid">
        ${state.gameState.teams.map((team) => `
          <div class="team-summary ${team.isDisqualified ? 'disqualified' : ''}" style="--team-color: ${team.color}">
            <div class="team-header">${team.name}</div>
            ${team.isDisqualified ? `
              <div class="disqualified-badge">Disqualified</div>
            ` : `
              <div class="employees-list">
                ${team.employees.map((emp) => `
                  <div class="employee-mini">
                    <span class="emp-name">${emp.name}</span>
                    <span class="emp-cost">${emp.bidAmount}%</span>
                  </div>
                `).join('')}
              </div>
              <div class="team-stats">
                <span>ESOP Remaining: ${team.esopRemaining}%</span>
              </div>
            `}
          </div>
        `).join('')}
      </div>

      ${state.isHost ? `
        <div class="summary-actions">
          <button class="btn btn-primary btn-large" id="advance-phase-btn">
            Start Market Rounds
          </button>
        </div>
      ` : `
        <p class="summary-note">Waiting for host to continue...</p>
      `}
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
      <p>This phase will be implemented in Phase 4</p>
    </div>
  `;
}

// ===========================================
// Event Listeners
// ===========================================

function attachPhaseEventListeners(phase: Phase): void {
  switch (phase) {
    case 'registration':
      attachRegistrationListeners();
      break;
    case 'setup':
      attachSetupListeners();
      break;
    case 'setup-lock':
      attachSetupLockListeners();
      break;
    case 'setup-summary':
    case 'auction-summary':
      attachSummaryListeners();
      break;
    case 'auction':
      attachAuctionListeners();
      break;
  }
}

function attachSummaryListeners(): void {
  document.getElementById('advance-phase-btn')?.addEventListener('click', () => {
    advancePhase();
  });
}

function attachRegistrationListeners(): void {
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

function attachSetupListeners(): void {
  // Click on cards to drop them
  document.querySelectorAll('.setup-card.clickable').forEach((card) => {
    card.addEventListener('click', () => {
      const cardId = card.getAttribute('data-card-id');
      const isSegmentAttr = card.getAttribute('data-is-segment');
      if (cardId && isSegmentAttr !== null) {
        const isSegment = isSegmentAttr === 'true';
        dropCard(parseInt(cardId, 10), isSegment);
      }
    });
  });

  // Draw buttons
  document.getElementById('draw-segment-btn')?.addEventListener('click', () => {
    drawCard('segment');
  });

  document.getElementById('draw-idea-btn')?.addEventListener('click', () => {
    drawCard('idea');
  });

  document.getElementById('skip-draw-btn')?.addEventListener('click', () => {
    skipDraw();
  });
}

function attachSetupLockListeners(): void {
  let selectedSegmentId: number | null = null;
  let selectedIdeaId: number | null = null;

  function updateLockButton(): void {
    const lockBtn = document.getElementById('lock-btn');
    if (lockBtn instanceof HTMLButtonElement) {
      lockBtn.disabled = selectedSegmentId === null || selectedIdeaId === null;
    }
  }

  // Segment card selection
  document.querySelectorAll('.setup-card.segment.selectable').forEach((card) => {
    card.addEventListener('click', () => {
      // Clear previous selection
      document.querySelectorAll('.setup-card.segment.selectable').forEach((c) => {
        c.classList.remove('selected');
      });
      // Select this card
      card.classList.add('selected');
      const id = card.getAttribute('data-segment-id');
      selectedSegmentId = id ? parseInt(id, 10) : null;
      updateLockButton();
    });
  });

  // Idea card selection
  document.querySelectorAll('.setup-card.idea.selectable').forEach((card) => {
    card.addEventListener('click', () => {
      // Clear previous selection
      document.querySelectorAll('.setup-card.idea.selectable').forEach((c) => {
        c.classList.remove('selected');
      });
      // Select this card
      card.classList.add('selected');
      const id = card.getAttribute('data-idea-id');
      selectedIdeaId = id ? parseInt(id, 10) : null;
      updateLockButton();
    });
  });

  // Lock button
  document.getElementById('lock-btn')?.addEventListener('click', () => {
    if (selectedSegmentId !== null && selectedIdeaId !== null) {
      lockSetup(selectedSegmentId, selectedIdeaId);
    }
  });
}

function attachAuctionListeners(): void {
  const bidInput = getInputById('bid-amount');
  if (!bidInput) return;

  // Increment button
  document.getElementById('bid-increase')?.addEventListener('click', () => {
    const current = parseInt(bidInput.value, 10) || 0;
    const max = parseInt(bidInput.max, 10) || 100;
    if (current < max) {
      bidInput.value = String(current + 1);
    }
  });

  // Decrement button
  document.getElementById('bid-decrease')?.addEventListener('click', () => {
    const current = parseInt(bidInput.value, 10) || 0;
    const min = parseInt(bidInput.min, 10) || 1;
    if (current > min) {
      bidInput.value = String(current - 1);
    }
  });

  // Place bid button
  document.getElementById('place-bid-btn')?.addEventListener('click', () => {
    const amount = parseInt(bidInput.value, 10);
    if (!isNaN(amount) && amount > 0) {
      placeBid(amount);
    }
  });

  // Enter key on input
  bidInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('place-bid-btn')?.click();
    }
  });
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
