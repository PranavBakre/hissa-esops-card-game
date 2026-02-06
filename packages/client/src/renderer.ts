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
  drawExit,
} from './app';

// ===========================================
// Phase Intro Banner State
// ===========================================

const seenPhases = new Set<Phase>();
const dismissedPhases = new Set<Phase>();

const PHASE_INTRO_TEXT: Partial<Record<Phase, { icon: string; title: string; desc: string }>> = {
  registration: {
    icon: '&#128221;',
    title: 'Registration',
    desc: 'Name your startup and describe the problem you\'re solving.',
  },
  setup: {
    icon: '&#127183;',
    title: 'Draft Your Cards',
    desc: 'Draft segment and idea cards to define your startup\'s identity. Drop a card, then draw or skip.',
  },
  'setup-lock': {
    icon: '&#128274;',
    title: 'Lock Your Selection',
    desc: 'Pick your final segment + idea combo. Matching pairs unlock bonus multipliers!',
  },
  auction: {
    icon: '&#128176;',
    title: 'Auction',
    desc: 'Bid ESOP equity to hire employees. Higher skills = bigger market impact, but ESOP is limited.',
  },
  seed: {
    icon: '&#127793;',
    title: 'Seed Round',
    desc: 'Market conditions are revealed. Your employees\' skills determine how your valuation changes.',
  },
  early: {
    icon: '&#128200;',
    title: 'Early Stage',
    desc: 'Market conditions are revealed. Your employees\' skills determine how your valuation changes.',
  },
  'secondary-drop': {
    icon: '&#128100;',
    title: 'Secondary Drop',
    desc: 'Choose one employee to release. They\'ll enter the secondary market for all teams to bid on.',
  },
  'secondary-hire': {
    icon: '&#129309;',
    title: 'Secondary Hire',
    desc: 'Bid on employees from the secondary pool. Last chance to strengthen your team.',
  },
  mature: {
    icon: '&#127942;',
    title: 'Mature Stage',
    desc: 'Market conditions are revealed. Your employees\' skills determine how your valuation changes.',
  },
  exit: {
    icon: '&#127922;',
    title: 'Exit',
    desc: 'Draw your exit card! Your fate is sealed by luck \u2014 will you IPO or Fire Sale?',
  },
  winner: {
    icon: '&#127881;',
    title: 'Game Over!',
    desc: 'See who built the best startup.',
  },
};

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
      <div class="game-logo"><span class="logo-esop">ESOP</span> <span class="logo-wars">Wars</span></div>
      <div class="game-tagline">Build the highest-valued startup</div>

      <div class="home-actions">
        <button class="btn btn-primary btn-lg" style="width:100%" id="create-room-btn">
          Create Room
        </button>

        <div class="join-form">
          <input
            type="text"
            id="room-code-input"
            placeholder="CODE"
            maxlength="4"
            class="input-code"
          />
          <button class="btn btn-secondary btn-lg" id="join-room-btn">
            Join
          </button>
        </div>

        <div class="home-divider">or</div>

        <button class="btn btn-secondary btn-lg" style="width:100%" id="watch-bot-game-btn">
          Watch Bot Game
        </button>

        <div class="home-links">
          <a id="how-to-play-link">How to Play</a>
          <a id="about-link">About</a>
        </div>
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

  document.getElementById('how-to-play-link')?.addEventListener('click', () => {
    openRulesModal('overview');
  });

  document.getElementById('about-link')?.addEventListener('click', () => {
    openAboutModal();
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

    const statusClass = isMyTeam ? 'you' : '';
    const statusText = player
      ? (player.playerId === state.playerId ? 'You' : player.playerName)
      : 'Empty';

    return `
      <div
        class="team-slot ${isMyTeam ? 'selected' : ''} ${isTaken ? 'taken' : ''}"
        data-team-index="${index}"
      >
        <div class="team-color-dot" style="background: ${def.color}"></div>
        <div class="team-slot-name">${def.name}</div>
        <div class="team-slot-status ${statusClass}">${statusText}</div>
      </div>
    `;
  }).join('');

  const playersList = state.room.players
    .map((p) => `
      <div class="player-list-item ${!p.connected ? 'disconnected' : ''}">
        <div class="player-list-name">${p.playerName}</div>
        ${p.isHost ? '<span class="badge badge-host">Host</span>' : ''}
        ${!p.connected ? '<span class="status-badge">Offline</span>' : ''}
      </div>
    `)
    .join('');

  app.innerHTML = `
    <div class="lobby-screen">
      <div class="lobby-header">
        <h2>Room <span class="lobby-code">${state.room.code}</span></h2>
        <button class="btn btn-ghost" id="leave-btn">Leave</button>
      </div>

      <div class="lobby-grid">
        <div>
          <div class="lobby-section-title">Teams</div>
          <div class="team-slots">
            ${teamSlots}
          </div>
        </div>

        <div>
          <div class="lobby-section-title">Players (${state.room.players.length})</div>
          ${playersList}
        </div>
      </div>

      <div class="lobby-footer">
        ${state.isHost ? `
          <div class="lobby-start-buttons">
            <button
              class="btn btn-primary btn-lg"
              id="start-game-btn"
              ${state.room.players.some((p) => p.teamIndex !== null) ? '' : 'disabled'}
            >
              Start Game
            </button>
            <button class="btn btn-secondary btn-lg" id="start-bot-game-btn">
              Start Bot Game
            </button>
          </div>
          <div class="lobby-hint">Empty team slots will be filled with bots</div>
        ` : `
          <div class="lobby-hint">Waiting for host to start the game...</div>
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
      ${renderMobileTeamStrip()}
      <div class="game-layout">
        ${renderTeamsSidebar()}
        <div class="game-main">
          ${renderPhaseIntro()}
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

  // Phase intro dismiss listener
  document.getElementById('dismiss-phase-intro')?.addEventListener('click', () => {
    if (state.gameState) {
      dismissedPhases.add(state.gameState.phase);
    }
    const banner = document.getElementById('phase-intro-banner');
    if (banner) {
      banner.style.display = 'none';
    }
  });

  // Rules button listener
  document.getElementById('rules-btn')?.addEventListener('click', () => {
    openRulesModal();
  });

  // Attach event listeners based on phase
  attachPhaseEventListeners(phase);
}

// ===========================================
// Phase Bar
// ===========================================

function getPhaseDetail(): string {
  if (!state.gameState) return '';
  const phase = state.gameState.phase;

  if (phase === 'auction' || phase === 'secondary-hire') {
    const deck = phase === 'auction' ? state.gameState.employeeDeck : state.gameState.secondaryPool;
    return `Card ${state.gameState.currentCardIndex + 1} of ${deck.length}`;
  }
  if (phase === 'setup') {
    return `Round ${state.gameState.setupRound}/3`;
  }
  return '';
}

function renderPhaseBar(): string {
  if (!state.gameState) return '';

  const phaseLabel = PHASE_LABELS[state.gameState.phase] || state.gameState.phase;
  const phaseDetail = getPhaseDetail();

  return `
    <div class="game-header">
      <div class="header-left">
        <button class="header-exit" id="exit-room-btn">&#8592; Exit</button>
        <span class="header-room-code">${state.room?.code ?? ''}</span>
        ${state.spectatorMode ? '<span class="spectator-badge">Spectator</span>' : ''}
      </div>
      <div class="header-center">
        <span class="header-phase">${phaseLabel}</span>
        ${phaseDetail ? `<span class="header-phase-detail">${phaseDetail}</span>` : ''}
      </div>
      <div class="header-right">
        ${state.spectatorMode ? `
          <div class="speed-controls">
            <button class="btn-speed ${state.gameSpeed === 'normal' ? 'active' : ''}" data-speed="normal">Normal</button>
            <button class="btn-speed ${state.gameSpeed === 'fast' ? 'active' : ''}" data-speed="fast">Fast</button>
            <button class="btn-speed ${state.gameSpeed === 'instant' ? 'active' : ''}" data-speed="instant">Instant</button>
          </div>
        ` : ''}
        <button class="btn-rules" id="rules-btn" title="Rules">?</button>
      </div>
    </div>
  `;
}

// ===========================================
// Teams Sidebar
// ===========================================

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Engineering': return 'var(--cat-engineering)';
    case 'Product': return 'var(--cat-product)';
    case 'Sales': return 'var(--cat-sales)';
    case 'Ops': return 'var(--cat-ops)';
    case 'Finance': return 'var(--cat-finance)';
    default: return 'var(--text-muted)';
  }
}

function renderTeamsSidebar(): string {
  if (!state.gameState) return '';

  return `
    <div class="teams-sidebar">
      <div class="sidebar-label">Teams</div>
      ${state.gameState.teams.map((team, index) => {
        const isMe = state.myTeamIndex === index;
        const empDots = [];
        for (let i = 0; i < 3; i++) {
          const emp = team.employees[i];
          if (emp) {
            empDots.push(`<div class="emp-dot" style="background: ${getCategoryColor(emp.category)}"></div>`);
          } else {
            empDots.push(`<div class="emp-dot" style="background: var(--border-default); border: 2px dashed var(--text-muted)"></div>`);
          }
        }

        return `
          <div
            class="sidebar-team ${isMe ? 'my-team' : ''} ${team.isDisqualified ? 'disqualified' : ''}"
            style="--team-color: ${team.color}"
          >
            <div class="sidebar-team-top">
              <div class="sidebar-team-name">${team.name}</div>
              ${isMe ? '<span class="badge badge-you">You</span>' : ''}
              ${team.isBot ? '<span class="badge badge-bot">Bot</span>' : ''}
            </div>
            <div class="sidebar-valuation">${formatCurrency(team.valuation)}</div>
            <div class="sidebar-meta">
              <span>${team.esopRemaining.toFixed(1)}% ESOP</span>
              <span>${team.employees.length}/3 hired</span>
            </div>
            <div class="sidebar-employees">${empDots.join('')}</div>
            ${!team.wildcardUsed
              ? '<div class="sidebar-wildcard">&#9733; Wildcard ready</div>'
              : '<div class="sidebar-wildcard used">&#9733; Wildcard used</div>'
            }
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPhaseIntro(): string {
  if (!state.gameState) return '';

  const phase = state.gameState.phase;
  const intro = PHASE_INTRO_TEXT[phase];

  // Don't show for summary phases or if no intro defined
  if (!intro) return '';

  // Don't show if already dismissed
  if (dismissedPhases.has(phase)) return '';

  // Mark as seen (for auto-dismiss timer)
  if (!seenPhases.has(phase)) {
    seenPhases.add(phase);
    // Auto-dismiss after 5s
    setTimeout(() => {
      dismissedPhases.add(phase);
      const banner = document.getElementById('phase-intro-banner');
      if (banner) {
        banner.style.display = 'none';
      }
    }, 5000);
  }

  return `
    <div class="phase-intro" id="phase-intro-banner">
      <div class="phase-intro-icon">${intro.icon}</div>
      <div class="phase-intro-text">
        <h3>${intro.title}</h3>
        <p>${intro.desc}</p>
      </div>
      <button class="phase-intro-dismiss" id="dismiss-phase-intro">&times;</button>
    </div>
  `;
}

function renderMobileTeamStrip(): string {
  if (!state.gameState) return '';

  return `
    <div class="mobile-team-strip">
      ${state.gameState.teams.map((team, index) => {
        const isMe = state.myTeamIndex === index;
        return `
          <div class="mobile-team-chip ${isMe ? 'my-team' : ''}" style="--team-color: ${team.color}">
            <span class="mobile-team-chip-name">${team.name}</span>
            <span class="mobile-team-chip-val">${formatCurrency(team.valuation)}</span>
            ${isMe ? '<span class="badge badge-you">You</span>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ===========================================
// Action Hint Helpers
// ===========================================

function getSetupHint(): string {
  if (!state.gameState) return '';
  const isMyTurn = state.myTeamIndex === state.gameState.setupDraftTurn;
  const setupPhase = state.gameState.setupPhase;
  if (!isMyTurn) {
    return 'Wait for your turn to draft cards.';
  }
  if (setupPhase === 'drop') {
    return 'Drop a card you don\'t want. You\'ll draw a replacement next.';
  }
  return 'Draw from Segment or Idea deck, or skip to keep your hand.';
}

function getAuctionHint(): string {
  if (!state.gameState) return '';
  const currentBid = state.gameState.currentBid;
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  if (!myTeam) return 'Watch teams bid for employees.';
  if (myTeam.employees.length >= 3) return 'You\'ve filled your team! Watch the remaining bids.';
  if (!currentBid) {
    return `Be the first to bid! Starting bid is 1% ESOP. You have <strong>${myTeam.esopRemaining.toFixed(1)}%</strong> remaining.`;
  }
  const bidderName = state.gameState.teams[currentBid.teamIndex].name;
  return `Outbid <strong>${bidderName}</strong> or pass. You have <strong>${myTeam.esopRemaining.toFixed(1)}%</strong> ESOP remaining.`;
}

function getMarketHint(): string {
  if (!state.gameState) return '';
  const isWildcardPhase = state.gameState.wildcardPhase;
  const hasResults = state.gameState.roundPerformance.length > 0;
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;

  if (isWildcardPhase) {
    if (!myTeam) return 'Teams are choosing their wildcard strategy.';
    const hasSelected = state.myTeamIndex !== null &&
      state.gameState.teamWildcardSelections[state.myTeamIndex] !== undefined;
    if (hasSelected) return 'Your choice is locked in. Waiting for other teams...';
    if (myTeam.wildcardUsed) return 'You\'ve already used your wildcard. Click <strong>Pass</strong> to continue.';
    return 'This is your one-time wildcard. Use it when the stakes are highest!';
  }

  if (hasResults) {
    return 'Market results are in! Review how your team performed this round.';
  }

  if (state.isHost) {
    return 'Draw the market card to reveal this round\'s conditions.';
  }
  return 'Waiting for the host to draw the market card...';
}

function getSecondaryDropHint(): string {
  if (!state.gameState) return '';
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  if (!myTeam || myTeam.isDisqualified) return 'Watch teams release employees to the secondary market.';
  const hasDropped = state.myTeamIndex !== null &&
    state.gameState.droppedEmployees.some((d) => d.fromTeamIndex === state.myTeamIndex);
  if (hasDropped) return 'Employee released! Waiting for other teams to choose...';
  return 'Choose one employee to release. They\'ll enter the secondary market for all teams to bid on.';
}

function getSecondaryHireHint(): string {
  if (!state.gameState) return '';
  const currentBid = state.gameState.currentBid;
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  if (!myTeam) return 'Watch teams bid on secondary market employees.';
  if (!currentBid) {
    return `Last chance to strengthen your team! Starting bid is 1% ESOP. You have <strong>${myTeam.esopRemaining.toFixed(1)}%</strong> remaining.`;
  }
  const bidderName = state.gameState.teams[currentBid.teamIndex].name;
  return `Outbid <strong>${bidderName}</strong> or pass. You have <strong>${myTeam.esopRemaining.toFixed(1)}%</strong> ESOP remaining.`;
}

function getExitHint(): string {
  if (!state.gameState) return '';
  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  const isMyTurn = state.myTeamIndex !== null && state.gameState.currentExitTurn === state.myTeamIndex;

  if (myTeam?.exitChoice) {
    return `You drew <strong>${myTeam.exitChoice.name}</strong>! ${myTeam.exitChoice.multiplier}x multiplier applied to your valuation.`;
  }
  if (isMyTurn) {
    return 'It\'s your turn! Click to draw your exit card. Good luck!';
  }
  if (!myTeam) return 'Watch teams draw their exit cards.';
  return 'Wait for your turn to draw an exit card...';
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
      <p class="action-hint">Name your startup and describe the problem you're solving.</p>

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
      <p class="action-hint">${getSetupHint()}</p>

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
      <p class="action-hint">Pick your final segment + idea combo. <strong>Matching pairs unlock bonus multipliers!</strong></p>

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
      <p class="action-hint">Review all team selections. The auction is next \u2014 plan your hiring budget!</p>

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

  const hardPct = (currentCard.hardSkill * 100).toFixed(0);
  const categoryClass = currentCard.category.toLowerCase();
  const progressPct = ((state.gameState.currentCardIndex + 1) / state.gameState.employeeDeck.length * 100).toFixed(0);

  return `
    <div class="auction-phase">
      <h2>Employee Auction</h2>
      <p class="action-hint">${getAuctionHint()}</p>

      <div class="employee-card" style="--card-accent: ${getCategoryColor(currentCard.category)}">
        <span class="emp-category-badge ${categoryClass}">${currentCard.category}</span>
        <div class="emp-name">${currentCard.name}</div>
        <div class="emp-role">${currentCard.role}</div>

        <div class="skill-bar-section">
          <div class="skill-row">
            <div class="skill-label">
              <span>Hard Skill</span>
              <span>${hardPct}%</span>
            </div>
            <div class="skill-bar-track">
              <div class="skill-bar-fill hard" style="width: ${hardPct}%"></div>
            </div>
          </div>

          <div class="soft-skill-pills">
            ${Object.entries(currentCard.softSkills).map(([skill, value]) =>
              `<span class="soft-pill">${skill} <strong>${(value * 100).toFixed(0)}%</strong></span>`
            ).join('')}
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
          <div class="bid-inc-btns">
            <button class="bid-inc-btn" id="bid-inc-05">+0.5</button>
            <button class="bid-inc-btn" id="bid-inc-1">+1</button>
            <button class="bid-inc-btn" id="bid-inc-2">+2</button>
          </div>
          <div class="bid-input-wrap">
            <input type="number" id="bid-amount" value="${minBid}" min="${minBid}" max="${myTeam.esopRemaining}" step="0.5">
            <span class="suffix">%</span>
          </div>
          <div class="bid-actions">
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
        <div class="progress-track"><div class="progress-fill" style="width: ${progressPct}%"></div></div>
      </div>
    </div>
  `;
}

function renderAuctionSummary(): string {
  if (!state.gameState) return '';

  return `
    <div class="auction-summary">
      <h2>Auction Complete</h2>
      <p class="action-hint">Teams are set! Market rounds begin next \u2014 your employees' skills will be tested.</p>

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

  const marketCard = state.gameState.currentMarketCard;

  return `
    <div class="market-round">
      <h2>${phaseName} Round</h2>
      <p class="action-hint">${getMarketHint()}</p>

      <div class="market-layout">
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

        ${marketCard ? `
          <div class="market-card-reveal">
            <div class="market-card-label">Market Card</div>
            <div class="market-card-name">${marketCard.name}</div>
            <div class="market-card-desc">${marketCard.description}</div>
            <div class="market-modifiers">
              ${Object.entries(marketCard.hardSkillModifiers)
                .filter(([, v]) => v !== 0)
                .map(([cat, v]) =>
                  `<span class="modifier-pill ${v > 0 ? 'positive' : 'negative'}">${cat} ${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%</span>`
                ).join('')}
            </div>
          </div>
        ` : ''}

        ${hasResults ? `
          <div class="results-heading">Round Results</div>
          <div class="results-grid">
            ${state.gameState.roundPerformance.map((perf) => {
              const team = state.gameState?.teams[perf.teamIndex];
              if (!team) return '';
              return `
                <div class="result-card" style="--team-color: ${team.color}">
                  <div class="result-team-name">${team.name}</div>
                  <div class="result-change ${perf.gain >= 0 ? 'positive' : 'negative'}">
                    ${perf.gain >= 0 ? '+' : ''}${formatCurrency(perf.gain)}
                  </div>
                  <div class="result-val">${formatCurrency(team.valuation)}</div>
                  ${team.isMarketLeader ? '<span class="leader-badge">Market Leader</span>' : ''}
                </div>
              `;
            }).join('')}
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
    </div>
  `;
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
      <p class="action-hint">${getSecondaryDropHint()}</p>

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

  const hardPct = (currentCard.hardSkill * 100).toFixed(0);
  const categoryClass = currentCard.category.toLowerCase();
  const progressPct = ((state.gameState.currentCardIndex + 1) / pool.length * 100).toFixed(0);

  return `
    <div class="secondary-hire auction-phase">
      <h2>Secondary Market - Hiring</h2>
      <p class="action-hint">${getSecondaryHireHint()}</p>

      <div class="employee-card" style="--card-accent: ${getCategoryColor(currentCard.category)}">
        <span class="emp-category-badge ${categoryClass}">${currentCard.category}</span>
        <div class="emp-name">${currentCard.name}</div>
        <div class="emp-role">${currentCard.role}</div>

        <div class="skill-bar-section">
          <div class="skill-row">
            <div class="skill-label">
              <span>Hard Skill</span>
              <span>${hardPct}%</span>
            </div>
            <div class="skill-bar-track">
              <div class="skill-bar-fill hard" style="width: ${hardPct}%"></div>
            </div>
          </div>

          <div class="soft-skill-pills">
            ${Object.entries(currentCard.softSkills).map(([skill, value]) =>
              `<span class="soft-pill">${skill} <strong>${(value * 100).toFixed(0)}%</strong></span>`
            ).join('')}
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
          <div class="bid-inc-btns">
            <button class="bid-inc-btn" id="bid-inc-05">+0.5</button>
            <button class="bid-inc-btn" id="bid-inc-1">+1</button>
            <button class="bid-inc-btn" id="bid-inc-2">+2</button>
          </div>
          <div class="bid-input-wrap">
            <input type="number" id="bid-amount" value="${minBid}" min="${minBid}" max="${myTeam.esopRemaining}" step="0.5">
            <span class="suffix">%</span>
          </div>
          <div class="bid-actions">
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
        <div class="progress-track"><div class="progress-fill" style="width: ${progressPct}%"></div></div>
      </div>
    </div>
  `;
}

// ===========================================
// Exit Phase
// ===========================================

function getMultiplierClass(multiplier: number): string {
  if (multiplier >= 1.5) return 'high';
  if (multiplier >= 1.0) return 'moderate';
  return 'low';
}

function renderExitPhase(): string {
  if (!state.gameState) return '';

  const myTeam = state.myTeamIndex !== null ? state.gameState.teams[state.myTeamIndex] : null;
  const hasDrawn = myTeam !== null && myTeam.exitChoice !== null;
  const isMyTurn = state.myTeamIndex !== null && state.gameState.currentExitTurn === state.myTeamIndex;
  const currentTurn = state.gameState.currentExitTurn;
  const currentTeamName = currentTurn >= 0 ? state.gameState.teams[currentTurn].name : '';
  const cardsRemaining = state.gameState.exitDeck.length;

  return `
    <div class="exit-phase">
      <h2>Exit Phase</h2>
      <p class="action-hint">${getExitHint()}</p>

      <div class="exit-layout">
        <div class="exit-draw-area">
          ${!hasDrawn && currentTurn >= 0 && cardsRemaining > 0 ? `
            <div class="exit-card-back" ${isMyTurn ? 'id="draw-exit-btn" role="button" tabindex="0"' : ''}>
              <div>
                <div class="exit-card-back-label">&#127922; EXIT</div>
                <div class="exit-card-back-hint">${isMyTurn ? 'Click to draw' : `${currentTeamName}'s turn`}</div>
              </div>
            </div>
          ` : ''}

          ${hasDrawn && myTeam?.exitChoice ? `
            <div class="exit-card-revealed" style="border-color: var(--${getMultiplierClass(myTeam.exitChoice.multiplier) === 'high' ? 'green' : getMultiplierClass(myTeam.exitChoice.multiplier) === 'moderate' ? 'amber' : 'red'})">
              <div class="exit-name">${myTeam.exitChoice.name}</div>
              <div class="exit-multiplier ${getMultiplierClass(myTeam.exitChoice.multiplier)}">${myTeam.exitChoice.multiplier}x</div>
              <div class="exit-desc">${myTeam.exitChoice.description}</div>
            </div>
          ` : ''}

          <div class="exit-team-draws">
            ${state.gameState.teams.map((team, i) => {
              const hasChosenExit = team.exitChoice !== null;
              const isThisTurn = currentTurn === i;
              if (team.isDisqualified) return '';
              return `
                <div class="exit-team-draw" style="border-color: ${hasChosenExit ? team.color : 'var(--border-default)'}">
                  <div class="exit-team-draw-name" style="color: ${hasChosenExit ? team.color : 'var(--text-muted)'}">${team.name}</div>
                  <div class="exit-team-draw-card" ${!hasChosenExit ? 'style="color: var(--text-muted)"' : ''}>
                    ${hasChosenExit && team.exitChoice ? team.exitChoice.name : isThisTurn ? 'Drawing...' : 'Waiting...'}
                  </div>
                  <div class="exit-team-draw-mult" style="color: ${hasChosenExit && team.exitChoice ? (team.exitChoice.multiplier >= 1.5 ? 'var(--green)' : team.exitChoice.multiplier >= 1.0 ? 'var(--amber)' : 'var(--red)') : 'var(--text-muted)'}">
                    ${hasChosenExit && team.exitChoice ? `${team.exitChoice.multiplier}x` : '?'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
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

  const employerEsop = employer.employees.reduce((sum, e) => sum + e.bidAmount, 0);

  return `
    <div class="winner-phase">
      <div class="winner-layout">
        <div class="winner-title">Game Over!</div>

        <div class="winner-cards">
          <div class="winner-card founder">
            <div class="winner-card-label">Best Founder</div>
            <div class="winner-card-team" style="color: ${founder.color}">${founder.name}</div>
            <div class="winner-card-stat">${formatCurrency(founder.valuation)}</div>
            <div class="winner-card-desc">Highest final valuation</div>
          </div>

          <div class="winner-card employer">
            <div class="winner-card-label">Best Employer</div>
            <div class="winner-card-team" style="color: ${employer.color}">${employer.name}</div>
            <div class="winner-card-stat">${employerEsop.toFixed(1)}% ESOP</div>
            <div class="winner-card-desc">Most equity shared with employees</div>
          </div>
        </div>

        <div class="standings">
          <div class="standings-title">Final Standings</div>
          ${teams.map((team, index) => `
            <div class="standing-row">
              <span class="standing-rank">#${index + 1}</span>
              <span class="standing-dot" style="background: ${team.color}"></span>
              <span class="standing-name">${team.name}</span>
              <span class="standing-val">${formatCurrency(team.valuation)}</span>
            </div>
          `).join('')}
        </div>

        <button class="btn btn-primary btn-lg" id="play-again-btn">Play Again</button>
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
  document.getElementById('draw-exit-btn')?.addEventListener('click', () => {
    drawExit();
  });
}

// ===========================================
// Utilities
// ===========================================

// ===========================================
// Rules Modal
// ===========================================

const RULES_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    content: `
      <h3>What is ESOP Wars?</h3>
      <p>5 teams compete to build the highest-valued startup. You'll draft your identity, hire employees by bidding equity (ESOP), survive market rounds, and draw your exit card.</p>
      <h3>How to Win</h3>
      <p><strong>Best Founder</strong> — Highest final valuation after exit multiplier.</p>
      <p><strong>Best Employer</strong> — Most total ESOP shared with employees.</p>
      <h3>Game Flow</h3>
      <p>Registration → Setup Drafting → Auction → Seed Round → Early Stage → Secondary Market → Mature Stage → Exit → Winner</p>
    `,
  },
  {
    id: 'setup',
    label: 'Setup',
    content: `
      <h3>Drafting (3 rounds)</h3>
      <p>Each team starts with 2 segment cards and 2 idea cards. On your turn: <strong>drop</strong> one card, then <strong>draw</strong> from either deck (or skip).</p>
      <h3>Lock Selection</h3>
      <p>After drafting, pick your final segment + idea combo. <strong>Matching pairs</strong> (e.g. a tech segment with a tech idea) unlock a category bonus multiplier during market rounds.</p>
    `,
  },
  {
    id: 'auction',
    label: 'Auction',
    content: `
      <h3>Bidding</h3>
      <p>Employee cards are revealed one at a time. Teams bid ESOP equity (starting at 12%) to hire them. Highest bid wins.</p>
      <h3>Limits</h3>
      <p>Each team hires up to <strong>3 employees</strong>. Teams with 0 employees are <strong>disqualified</strong>.</p>
      <h3>Employee Stats</h3>
      <p><strong>Hard Skill</strong> — Directly impacts valuation each market round.</p>
      <p><strong>Soft Skills</strong> — Can be boosted or penalized by market card conditions.</p>
    `,
  },
  {
    id: 'market',
    label: 'Market',
    content: `
      <h3>How It Works</h3>
      <p>A market card is drawn revealing conditions that affect different employee categories. Your employees' skills determine your valuation change.</p>
      <h3>Market Leader</h3>
      <p>The <strong>top 2 gainers</strong> each round receive a bonus valuation bump.</p>
      <h3>Wildcards</h3>
      <p>After seeing round results, each team can play their <strong>one-time</strong> wildcard:</p>
      <p><strong>Double Down</strong> — 2x your gains or losses this round.</p>
      <p><strong>Shield</strong> — Block any losses this round (gains still apply).</p>
      <p><strong>Pass</strong> — Save it for a future round.</p>
    `,
  },
  {
    id: 'secondary',
    label: 'Secondary',
    content: `
      <h3>Drop Phase</h3>
      <p>Each team must release one employee to the secondary pool.</p>
      <h3>Hire Phase</h3>
      <p>Released employees are auctioned off — same bidding rules as the main auction. Last chance to strengthen your team.</p>
    `,
  },
  {
    id: 'exit',
    label: 'Exit',
    content: `
      <h3>Drawing</h3>
      <p>Teams take turns drawing from a shuffled exit deck. Your card is <strong>random</strong> — no choosing.</p>
      <h3>Exit Cards</h3>
      <p><strong>IPO (2.0x)</strong> — Best outcome. Double your valuation.</p>
      <p><strong>Acquisition (1.5x)</strong> — Strong exit. 50% boost.</p>
      <p><strong>Merger (1.0x)</strong> — Neutral. Keep your valuation.</p>
      <p><strong>Downround (0.75x)</strong> — Rough exit. 25% loss.</p>
      <p><strong>Fire Sale (0.5x)</strong> — Worst outcome. Half your valuation.</p>
    `,
  },
  {
    id: 'glossary',
    label: 'Glossary',
    content: `
      <p><strong>ESOP</strong> — Equity you give employees. You start with 12%.</p>
      <p><strong>Valuation</strong> — Your startup's worth. Highest at exit wins Best Founder.</p>
      <p><strong>Hard Skill</strong> — Technical ability. Directly affects valuation growth.</p>
      <p><strong>Soft Skills</strong> — Interpersonal traits. Affected by market conditions.</p>
      <p><strong>Market Leader</strong> — Top 2 gainers each round get a valuation bonus.</p>
      <p><strong>Setup Bonus</strong> — Matching segment + idea pairs unlock a category multiplier.</p>
      <p><strong>Wildcard</strong> — One-time ability: Double Down or Shield.</p>
      <p><strong>Exit Multiplier</strong> — Applied to your final valuation. IPO (2x) best, Fire Sale (0.5x) worst.</p>
    `,
  },
];

function getPhaseRulesSection(): string {
  if (!state.gameState) return 'overview';
  const phase = state.gameState.phase;
  if (phase === 'setup' || phase === 'setup-lock' || phase === 'setup-summary') return 'setup';
  if (phase === 'auction' || phase === 'auction-summary') return 'auction';
  if (phase === 'seed' || phase === 'early' || phase === 'mature') return 'market';
  if (phase === 'secondary-drop' || phase === 'secondary-hire') return 'secondary';
  if (phase === 'exit') return 'exit';
  return 'overview';
}

function openRulesModal(section?: string): void {
  const modal = document.getElementById('rules-modal');
  if (!modal) return;

  const activeSection = section ?? getPhaseRulesSection();

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>How to Play</h2>
        <button class="modal-close" id="close-rules-btn">&times;</button>
      </div>
      <div class="rules-nav">
        ${RULES_SECTIONS.map((s) =>
          `<span class="rules-nav-item ${s.id === activeSection ? 'active' : ''}" data-section="${s.id}">${s.label}</span>`
        ).join('')}
      </div>
      <div class="modal-body">
        ${RULES_SECTIONS.map((s) =>
          `<div class="rules-section ${s.id === activeSection ? 'active' : ''}" data-section="${s.id}">${s.content}</div>`
        ).join('')}
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  // Close button
  document.getElementById('close-rules-btn')?.addEventListener('click', closeRulesModal);

  // Backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeRulesModal();
  });

  // Nav tabs
  modal.querySelectorAll('.rules-nav-item').forEach((tab) => {
    tab.addEventListener('click', () => {
      const sectionId = tab.getAttribute('data-section');
      if (!sectionId) return;
      modal.querySelectorAll('.rules-nav-item').forEach((t) => t.classList.remove('active'));
      modal.querySelectorAll('.rules-section').forEach((s) => s.classList.remove('active'));
      tab.classList.add('active');
      modal.querySelector(`.rules-section[data-section="${sectionId}"]`)?.classList.add('active');
    });
  });
}

function openAboutModal(): void {
  const modal = document.getElementById('rules-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal about-modal">
      <div class="modal-header">
        <h2>About</h2>
        <button class="modal-close" id="close-rules-btn">&times;</button>
      </div>
      <div class="modal-body about-body">
        <div class="about-logo"><span class="logo-esop">ESOP</span> <span class="logo-wars">Wars</span></div>
        <div class="about-version">v2.0</div>
        <p class="about-desc">A multiplayer card game about building startups, hiring talent, and surviving the market. Compete with friends or watch bots battle it out.</p>
        <div class="about-credits">
          <div class="about-row">
            <span class="about-label">Idea Credit</span>
            <span class="about-value">Hissa Fund</span>
          </div>
          <div class="about-row">
            <span class="about-label">Design & Development</span>
            <span class="about-value">Pranav Bakre</span>
          </div>
          <div class="about-row">
            <span class="about-label">Built with</span>
            <span class="about-value">TypeScript, Cloudflare Workers</span>
          </div>
          <div class="about-row">
            <span class="about-label">Players</span>
            <span class="about-value">1\u20135 (bots fill empty slots)</span>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  document.getElementById('close-rules-btn')?.addEventListener('click', closeRulesModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeRulesModal();
  });
}

function closeRulesModal(): void {
  const modal = document.getElementById('rules-modal');
  if (modal) modal.style.display = 'none';
}

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
