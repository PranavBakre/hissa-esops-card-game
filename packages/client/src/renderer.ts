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
  startBotGame,
  setGameSpeed,
  watchBotGame,
  registerTeam,
  leaveRoom,
  dropCard,
  drawCard,
  skipDraw,
  lockSetup,
  placeBid,
  passBid,
  advancePhase,
  selectWildcard,
  drawMarket,
  dropEmployeeAction,
  selectExit,
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

        <button class="btn btn-secondary btn-large" id="watch-bot-game-btn">
          Watch Bot Game
        </button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('create-room-btn')?.addEventListener('click', () => {
    createRoom();
  });

  document.getElementById('watch-bot-game-btn')?.addEventListener('click', () => {
    watchBotGame();
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
          <div class="lobby-start-buttons">
            <button
              class="btn btn-primary btn-large"
              id="start-game-btn"
              ${state.room.players.some((p) => p.teamIndex !== null) ? '' : 'disabled'}
            >
              Start Game
            </button>
            <button class="btn btn-secondary btn-large" id="start-bot-game-btn">
              Start Bot Game
            </button>
          </div>
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
  document.getElementById('start-bot-game-btn')?.addEventListener('click', startBotGame);
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
    case 'mature':
      content = renderMarketRound();
      break;
    case 'secondary-drop':
      content = renderSecondaryDrop();
      break;
    case 'secondary-hire':
      content = renderSecondaryHire();
      break;
    case 'exit':
      content = renderExitPhase();
      break;
    case 'winner':
      content = renderWinner();
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

  // Exit room button listener
  document.getElementById('exit-room-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave this game?')) {
      leaveRoom();
    }
  });

  // Speed control listeners (spectator mode)
  document.querySelectorAll('.btn-speed').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = btn.getAttribute('data-speed');
      if (speed === 'normal' || speed === 'fast' || speed === 'instant') {
        setGameSpeed(speed);
      }
    });
  });

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
      <div class="phase-bar-left">
        <button class="btn btn-text btn-exit-room" id="exit-room-btn" title="Exit Room">
          ← Exit
        </button>
        <span class="room-code">Room: ${state.room?.code ?? ''}</span>
        ${state.spectatorMode ? '<span class="spectator-badge">Spectator Mode</span>' : ''}
      </div>
      <div class="phase-bar-phases">
        ${mainPhases.map((phase, index) => `
          <div class="phase-item ${state.gameState?.phase === phase ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}">
            ${PHASE_LABELS[phase] || phase}
          </div>
        `).join('')}
      </div>
      ${state.spectatorMode ? `
        <div class="speed-controls">
          <button class="btn btn-speed ${state.gameSpeed === 'normal' ? 'active' : ''}" data-speed="normal">Normal</button>
          <button class="btn btn-speed ${state.gameSpeed === 'fast' ? 'active' : ''}" data-speed="fast">Fast</button>
          <button class="btn btn-speed ${state.gameSpeed === 'instant' ? 'active' : ''}" data-speed="instant">Instant</button>
        </div>
      ` : ''}
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

      ${state.spectatorMode ? `
        <p class="summary-note">Auto-advancing...</p>
      ` : state.isHost ? `
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
          <div class="bid-increment-buttons">
            <button class="btn btn-secondary" id="bid-inc-05">+0.5%</button>
            <button class="btn btn-secondary" id="bid-inc-1">+1%</button>
            <button class="btn btn-secondary" id="bid-inc-2">+2%</button>
          </div>
          <div class="bid-input-group">
            <input type="number" id="bid-amount" value="${minBid}" min="${minBid}" max="${myTeam.esopRemaining}" step="0.5">
            <span class="bid-suffix">%</span>
          </div>
          <div class="bid-buttons">
            <button class="btn btn-primary" id="place-bid-btn">Place Bid</button>
            <button class="btn btn-secondary" id="pass-bid-btn">Pass</button>
          </div>
          <div class="esop-remaining">
            Your ESOP: ${myTeam.esopRemaining.toFixed(1)}% remaining
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

      ${state.spectatorMode ? `
        <p class="summary-note">Auto-advancing...</p>
      ` : state.isHost ? `
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
// Market Round Phase
// ===========================================

function renderMarketRound(): string {
  if (!state.gameState) return '';

  const phase = state.gameState.phase;
  const phaseName = PHASE_LABELS[phase] || phase;
  const isWildcardPhase = state.gameState.wildcardPhase;
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  const hasSelectedWildcard = state.myTeamIndex !== null &&
    state.gameState.teamWildcardSelections[state.myTeamIndex] !== undefined;

  const hasResults = state.gameState.roundPerformance.length > 0;
  const needsDraw = !isWildcardPhase && !hasResults;

  return `
    <div class="market-round">
      <h2>${phaseName} Round</h2>
      <p class="phase-description">${getMarketPhaseDescription(phase)}</p>

      ${needsDraw ? `
        <div class="market-draw">
          ${state.spectatorMode ? `
            <p class="summary-note">Drawing market card...</p>
          ` : state.isHost ? `
            <button class="btn btn-primary btn-large" id="draw-market-btn">
              Draw Market Card
            </button>
          ` : `
            <p class="summary-note">Waiting for host to draw market card...</p>
          `}
        </div>
      ` : ''}

      ${hasResults ? `
        <div class="market-results">
          <h3>Round Results</h3>
          <div class="results-grid">
            ${state.gameState.roundPerformance.map((perf) => {
              const team = state.gameState?.teams[perf.teamIndex];
              if (!team) return '';
              return `
                <div class="result-card" style="--team-color: ${team.color}">
                  <div class="result-team">${team.name}</div>
                  <div class="result-change ${perf.gain >= 0 ? 'positive' : 'negative'}">
                    ${perf.gain >= 0 ? '+' : ''}${formatCurrency(perf.gain)}
                  </div>
                  <div class="result-valuation">${formatCurrency(team.valuation)}</div>
                  ${team.isMarketLeader ? '<div class="leader-badge">Market Leader</div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${isWildcardPhase ? `
        <div class="wildcard-phase">
          <h3>Wildcard Decision</h3>
          <p class="wildcard-context">Now that you've seen the market results, choose your wildcard strategy:</p>
          ${myTeam && !hasSelectedWildcard ? `
            <div class="wildcard-options">
              ${!myTeam.wildcardUsed ? `
                <div class="wildcard-option" data-choice="double-down">
                  <div class="wildcard-name">Double Down</div>
                  <div class="wildcard-desc">Double your gains or losses this round</div>
                </div>
                <div class="wildcard-option" data-choice="shield">
                  <div class="wildcard-name">Shield</div>
                  <div class="wildcard-desc">Revert any losses this round</div>
                </div>
              ` : `
                <p class="wildcard-used-note">You've already used your wildcard in a previous round.</p>
              `}
              <div class="wildcard-option pass" data-choice="pass">
                <div class="wildcard-name">Pass</div>
                <div class="wildcard-desc">Save wildcard for later</div>
              </div>
            </div>
          ` : myTeam ? `
            <div class="wildcard-waiting">
              <p>Your choice submitted. Waiting for other teams...</p>
            </div>
          ` : '<p>You are spectating.</p>'}

          <div class="wildcard-status">
            ${state.gameState.teams.map((team, i) => {
              const hasSelected = state.gameState?.teamWildcardSelections[i] !== undefined;
              return `
                <div class="wildcard-status-item ${hasSelected ? 'selected' : 'pending'}">
                  <span class="team-dot" style="background: ${team.color}"></span>
                  <span>${team.name}</span>
                  <span class="status">${hasSelected ? 'Ready' : 'Deciding...'}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function getMarketPhaseDescription(phase: string): string {
  switch (phase) {
    case 'seed': return 'Seed stage - Early market conditions shape your startup';
    case 'early': return 'Early stage - Growth pressures intensify';
    case 'mature': return 'Mature stage - Final market test before exit';
    default: return 'Market conditions affect your valuation';
  }
}

// ===========================================
// Secondary Drop Phase
// ===========================================

function renderSecondaryDrop(): string {
  if (!state.gameState) return '';

  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  const hasDropped = state.myTeamIndex !== null &&
    state.gameState.droppedEmployees.some((d) => d.fromTeamIndex === state.myTeamIndex);

  return `
    <div class="secondary-drop">
      <h2>Secondary Market - Drop Phase</h2>
      <p class="phase-description">Choose an employee to release to the secondary market</p>

      ${myTeam && !myTeam.isDisqualified && !hasDropped ? `
        <div class="drop-selection">
          <h3>Select Employee to Drop</h3>
          <div class="employee-drop-grid">
            ${myTeam.employees.map((emp) => `
              <div class="employee-drop-card" data-employee-id="${emp.id}">
                <div class="employee-category">${emp.category}</div>
                <div class="employee-name">${emp.name}</div>
                <div class="employee-role">${emp.role}</div>
                <div class="employee-hired-for">Hired for ${emp.bidAmount}%</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : myTeam && !myTeam.isDisqualified && hasDropped ? `
        <div class="drop-complete">
          <h3>Drop Submitted</h3>
          <p>Waiting for other teams...</p>
        </div>
      ` : '<p>You are spectating or disqualified.</p>'}

      <div class="drop-status">
        <h3>Drop Status</h3>
        ${state.gameState.teams.map((team, i) => {
          const hasDroppedEmp = state.gameState?.droppedEmployees.some((d) => d.fromTeamIndex === i);
          return team.isDisqualified ? '' : `
            <div class="drop-status-item ${hasDroppedEmp ? 'dropped' : 'pending'}">
              <span class="team-dot" style="background: ${team.color}"></span>
              <span>${team.name}</span>
              <span class="status">${hasDroppedEmp ? 'Dropped' : 'Selecting...'}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ===========================================
// Secondary Hire Phase
// ===========================================

function renderSecondaryHire(): string {
  if (!state.gameState) return '';

  const pool = state.gameState.secondaryPool;
  const currentCard = pool[state.gameState.currentCardIndex];
  const currentBid = state.gameState.currentBid;
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;

  if (!currentCard) {
    return `
      <div class="secondary-complete">
        <h2>Secondary Market Complete</h2>
        <p>All employees have been placed.</p>
        ${state.isHost ? `
          <div class="summary-actions">
            <button class="btn btn-primary btn-large" id="advance-phase-btn">
              Continue to Mature Round
            </button>
          </div>
        ` : `
          <p class="summary-note">Waiting for host to continue...</p>
        `}
      </div>
    `;
  }

  const canBid = myTeam && !myTeam.isDisqualified && myTeam.esopRemaining > 0;
  const minBid = currentBid ? currentBid.amount + 1 : 1;

  return `
    <div class="secondary-hire">
      <h2>Secondary Market - Hiring</h2>
      <p class="phase-description">Bid on employees from the secondary pool</p>

      <div class="auction-card">
        <div class="employee-card secondary">
          <div class="employee-category">${currentCard.category}</div>
          <div class="employee-name">${currentCard.name}</div>
          <div class="employee-role">${currentCard.role}</div>
          <div class="employee-stats">
            <div class="stat">
              <span class="stat-label">Hard Skill</span>
              <span class="stat-value">${(currentCard.hardSkill * 100).toFixed(0)}%</span>
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
          <div class="bid-increment-buttons">
            <button class="btn btn-secondary" id="bid-inc-05">+0.5%</button>
            <button class="btn btn-secondary" id="bid-inc-1">+1%</button>
            <button class="btn btn-secondary" id="bid-inc-2">+2%</button>
          </div>
          <div class="bid-input-group">
            <input type="number" id="bid-amount" value="${minBid}" min="${minBid}" max="${myTeam.esopRemaining}" step="0.5">
            <span class="bid-suffix">%</span>
          </div>
          <div class="bid-buttons">
            <button class="btn btn-primary" id="place-bid-btn">Place Bid</button>
            <button class="btn btn-secondary" id="pass-bid-btn">Pass</button>
          </div>
          <div class="esop-remaining">
            Your ESOP: ${myTeam.esopRemaining.toFixed(1)}% remaining
          </div>
        </div>
      ` : '<p>You cannot bid in this round.</p>'}

      <div class="auction-progress">
        Card ${state.gameState.currentCardIndex + 1} of ${pool.length}
      </div>
    </div>
  `;
}

// ===========================================
// Exit Phase
// ===========================================

// Exit cards available for selection (from data.ts)
const EXIT_CARDS = [
  { id: 1, name: 'IPO', multiplier: 2.0, description: 'Go public with a massive initial public offering!' },
  { id: 2, name: 'Acquisition', multiplier: 1.5, description: 'Get acquired by a tech giant.' },
  { id: 3, name: 'Strategic Merger', multiplier: 1.3, description: 'Merge with a complementary company.' },
  { id: 4, name: 'Private Equity Buyout', multiplier: 1.2, description: 'Sell to a private equity firm.' },
  { id: 5, name: 'Management Buyout', multiplier: 0.8, description: 'The management team buys out investors.' },
  { id: 6, name: 'Fire Sale', multiplier: 0.5, description: 'Desperate times call for desperate measures.' },
];

function renderExitPhase(): string {
  if (!state.gameState) return '';

  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  const hasChosen = myTeam && myTeam.exitChoice !== null;

  return `
    <div class="exit-phase">
      <h2>Exit Phase</h2>
      <p class="phase-description">Choose your exit strategy! Each team selects their own exit multiplier.</p>

      ${myTeam && !myTeam.isDisqualified && !hasChosen ? `
        <div class="exit-selection">
          <h3>Select Your Exit Strategy</h3>
          <div class="exit-cards-grid">
            ${EXIT_CARDS.map((card) => `
              <div class="exit-card-option" data-exit-id="${card.id}">
                <div class="exit-type">${card.name}</div>
                <div class="exit-multiplier">${card.multiplier}x</div>
                <div class="exit-desc">${card.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : myTeam && !myTeam.isDisqualified && hasChosen ? `
        <div class="exit-chosen">
          <h3>Exit Choice Submitted</h3>
          <div class="exit-card selected">
            <div class="exit-type">${myTeam.exitChoice?.name}</div>
            <div class="exit-multiplier">${myTeam.exitChoice?.multiplier}x</div>
            <div class="exit-desc">${myTeam.exitChoice?.description}</div>
          </div>
          <p>Waiting for other teams to select their exit...</p>
        </div>
      ` : '<p>You are spectating or disqualified.</p>'}

      <div class="exit-status">
        <h3>Exit Status</h3>
        ${state.gameState.teams.map((team) => {
          const hasChosenExit = team.exitChoice !== null;
          return team.isDisqualified ? '' : `
            <div class="exit-status-item ${hasChosenExit ? 'chosen' : 'pending'}">
              <span class="team-dot" style="background: ${team.color}"></span>
              <span>${team.name}</span>
              <span class="status">${hasChosenExit ? `${team.exitChoice?.name} (${team.exitChoice?.multiplier}x)` : 'Selecting...'}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ===========================================
// Winner Phase
// ===========================================

function renderWinner(): string {
  if (!state.gameState) return '';

  const teams = [...state.gameState.teams]
    .filter((t) => !t.isDisqualified)
    .sort((a, b) => b.valuation - a.valuation);

  // Best Founder: Highest valuation
  const founder = teams[0];

  // Best Employer: Most ESOP given
  const employer = teams.reduce((best, team) => {
    const teamEsop = team.employees.reduce((sum, e) => sum + e.bidAmount, 0);
    const bestEsop = best.employees.reduce((sum, e) => sum + e.bidAmount, 0);
    return teamEsop > bestEsop ? team : best;
  });

  return `
    <div class="winner-phase">
      <h2>Game Over!</h2>

      <div class="winners">
        <div class="winner-card founder">
          <div class="winner-title">Best Founder</div>
          <div class="winner-team" style="--team-color: ${founder.color}">
            ${founder.name}
          </div>
          <div class="winner-stat">${formatCurrency(founder.valuation)}</div>
          <div class="winner-desc">Highest final valuation</div>
        </div>

        <div class="winner-card employer">
          <div class="winner-title">Best Employer</div>
          <div class="winner-team" style="--team-color: ${employer.color}">
            ${employer.name}
          </div>
          <div class="winner-stat">
            ${employer.employees.reduce((sum, e) => sum + e.bidAmount, 0)}% ESOP
          </div>
          <div class="winner-desc">Most ESOP given to employees</div>
        </div>
      </div>

      <div class="final-standings">
        <h3>Final Standings</h3>
        <div class="standings-list">
          ${teams.map((team, index) => `
            <div class="standing-item" style="--team-color: ${team.color}">
              <span class="rank">#${index + 1}</span>
              <span class="team-name">${team.name}</span>
              <span class="valuation">${formatCurrency(team.valuation)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="game-over-actions">
        <button class="btn btn-secondary" id="play-again-btn">
          Play Again
        </button>
      </div>
    </div>
  `;
}

// ===========================================
// Event Listeners
// ===========================================

function attachPhaseEventListeners(phase: Phase): void {
  // Check for wildcard phase first (applies to seed, early, mature)
  if (state.gameState?.wildcardPhase) {
    attachWildcardListeners();
    return;
  }

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
    case 'seed':
    case 'early':
    case 'mature':
      attachMarketListeners();
      break;
    case 'secondary-drop':
      attachSecondaryDropListeners();
      break;
    case 'secondary-hire':
      attachAuctionListeners(); // Same as regular auction
      break;
    case 'exit':
      attachExitListeners();
      break;
    case 'winner':
      document.getElementById('play-again-btn')?.addEventListener('click', () => {
        leaveRoom();
      });
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

  const adjustBid = (increment: number): void => {
    const current = parseFloat(bidInput.value) || 0;
    const max = parseFloat(bidInput.max) || 100;
    const min = parseFloat(bidInput.min) || 0.5;
    const newValue = Math.round((current + increment) * 10) / 10;
    bidInput.value = String(Math.max(min, Math.min(max, newValue)));
  };

  // Increment buttons
  document.getElementById('bid-inc-05')?.addEventListener('click', () => adjustBid(0.5));
  document.getElementById('bid-inc-1')?.addEventListener('click', () => adjustBid(1));
  document.getElementById('bid-inc-2')?.addEventListener('click', () => adjustBid(2));

  // Place bid button
  document.getElementById('place-bid-btn')?.addEventListener('click', () => {
    const amount = parseFloat(bidInput.value);
    if (!isNaN(amount) && amount > 0) {
      placeBid(amount);
    }
  });

  // Pass button
  document.getElementById('pass-bid-btn')?.addEventListener('click', () => {
    passBid();
  });

  // Enter key on input
  bidInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('place-bid-btn')?.click();
    }
  });
}

function attachWildcardListeners(): void {
  document.querySelectorAll('.wildcard-option').forEach((option) => {
    option.addEventListener('click', () => {
      const choice = option.getAttribute('data-choice');
      if (choice === 'double-down' || choice === 'shield' || choice === 'pass') {
        selectWildcard(choice);
      }
    });
  });
}

function attachMarketListeners(): void {
  // Draw market button
  document.getElementById('draw-market-btn')?.addEventListener('click', () => {
    drawMarket();
  });

  // Advance phase button (after results shown)
  document.getElementById('advance-phase-btn')?.addEventListener('click', () => {
    advancePhase();
  });
}

function attachSecondaryDropListeners(): void {
  document.querySelectorAll('.employee-drop-card').forEach((card) => {
    card.addEventListener('click', () => {
      const employeeId = card.getAttribute('data-employee-id');
      if (employeeId) {
        // Add visual selection before confirming
        document.querySelectorAll('.employee-drop-card').forEach((c) => {
          c.classList.remove('selected');
        });
        card.classList.add('selected');

        // Confirm and drop
        if (confirm('Drop this employee to the secondary market?')) {
          dropEmployeeAction(parseInt(employeeId, 10));
        } else {
          card.classList.remove('selected');
        }
      }
    });
  });
}

function attachExitListeners(): void {
  document.querySelectorAll('.exit-card-option').forEach((card) => {
    card.addEventListener('click', () => {
      const exitId = card.getAttribute('data-exit-id');
      if (exitId) {
        // Add visual selection
        document.querySelectorAll('.exit-card-option').forEach((c) => {
          c.classList.remove('selected');
        });
        card.classList.add('selected');

        // Confirm and select
        const exitName = card.querySelector('.exit-type')?.textContent ?? 'this exit';
        if (confirm(`Select "${exitName}" as your exit strategy?`)) {
          selectExit(parseInt(exitId, 10));
        } else {
          card.classList.remove('selected');
        }
      }
    });
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
