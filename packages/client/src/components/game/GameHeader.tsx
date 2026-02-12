// ===========================================
// Game Header / Phase Bar
// ===========================================

import { Show } from 'solid-js';
import { PHASE_LABELS } from '@esop-wars/shared';
import type { GameSpeed } from '@esop-wars/shared';
import {
  gameState,
  room,
  spectatorMode,
  gameSpeed,
  decisionLogOpen,
  setDecisionLogOpen,
} from '../../state/client';
import { leaveRoom, setGameSpeedAction } from '../../state/websocket';
import { openRulesModal } from '../common/RulesModal';

export function GameHeader() {
  const phaseLabel = () => {
    const g = gameState.value;
    return g ? (PHASE_LABELS[g.phase] || g.phase) : '';
  };

  const phaseDetail = () => {
    const g = gameState.value;
    if (!g) return '';
    const phase = g.phase;

    if (phase === 'auction' || phase === 'secondary-hire') {
      const deck = phase === 'auction' ? g.employeeDeck : g.secondaryPool;
      return `Card ${g.currentCardIndex + 1} of ${deck.length}`;
    }
    if (phase === 'setup') {
      return `Round ${g.setupRound}/3`;
    }
    return '';
  };

  const handleSpeed = (speed: GameSpeed) => {
    setGameSpeedAction(speed);
  };

  return (
    <div class="game-header">
      <div class="header-left">
        <button
          class="header-exit"
          onClick={() => {
            if (confirm('Are you sure you want to leave this game?')) {
              leaveRoom();
            }
          }}
        >
          &larr; Exit
        </button>
        <span class="header-room-code">{room.value?.code ?? ''}</span>
        <Show when={spectatorMode()}>
          <span class="spectator-badge">Spectator</span>
        </Show>
      </div>

      <div class="header-center">
        <span class="header-phase">{phaseLabel()}</span>
        <Show when={phaseDetail()}>
          <span class="header-phase-detail">{phaseDetail()}</span>
        </Show>
      </div>

      <div class="header-right">
        <Show when={spectatorMode()}>
          <div class="speed-controls">
            <button
              class={`btn-speed ${gameSpeed() === 'normal' ? 'active' : ''}`}
              onClick={() => handleSpeed('normal')}
            >
              Normal
            </button>
            <button
              class={`btn-speed ${gameSpeed() === 'fast' ? 'active' : ''}`}
              onClick={() => handleSpeed('fast')}
            >
              Fast
            </button>
            <button
              class={`btn-speed ${gameSpeed() === 'instant' ? 'active' : ''}`}
              onClick={() => handleSpeed('instant')}
            >
              Instant
            </button>
          </div>
        </Show>
        <button
          class="btn-rules"
          title="Decision Log"
          onClick={() => setDecisionLogOpen(!decisionLogOpen())}
        >
          &#128220;
        </button>
        <button
          class="btn-rules"
          title="Rules"
          onClick={() => openRulesModal()}
        >
          ?
        </button>
      </div>
    </div>
  );
}
