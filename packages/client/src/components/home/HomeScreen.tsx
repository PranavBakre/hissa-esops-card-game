// ===========================================
// Home Screen
// ===========================================

import { createSignal } from 'solid-js';
import { createRoom, joinRoom, watchBotGame } from '../../state/websocket';
import { showToast } from '../common/Toast';
import { openRulesModal, openAboutModal } from '../common/RulesModal';

export function HomeScreen() {
  const [code, setCode] = createSignal('');

  const handleJoin = () => {
    if (code().length === 4) {
      joinRoom(code());
    } else {
      showToast('Please enter a 4-character room code', 'warning');
    }
  };

  return (
    <div class="home-screen">
      <div class="game-logo">
        <span class="logo-esop">ESOP</span>{' '}
        <span class="logo-wars">Wars</span>
      </div>
      <div class="game-tagline">Build the highest-valued startup</div>

      <div class="home-actions">
        <button
          class="btn btn-primary btn-lg"
          style="width:100%"
          onClick={() => createRoom()}
        >
          Create Room
        </button>

        <div class="join-form">
          <input
            type="text"
            placeholder="CODE"
            maxLength={4}
            class="input-code"
            value={code()}
            onInput={(e) =>
              setCode(e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
            }
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button class="btn btn-secondary btn-lg" onClick={handleJoin}>
            Join
          </button>
        </div>

        <div class="home-divider">or</div>

        <button
          class="btn btn-secondary btn-lg"
          style="width:100%"
          onClick={() => watchBotGame()}
        >
          Watch Bot Game
        </button>

        <div class="home-links">
          <a onClick={() => openRulesModal('overview')}>How to Play</a>
          <a onClick={() => openAboutModal()}>About</a>
        </div>
      </div>
    </div>
  );
}
