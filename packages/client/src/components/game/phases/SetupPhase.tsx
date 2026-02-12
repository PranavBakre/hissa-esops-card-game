// ===========================================
// Setup Phase (Draft + Lock + Summary)
// ===========================================

import { createSignal, Show, For } from 'solid-js';
import { gameState, myTeamIndex, isHost, spectatorMode } from '../../../state/client';
import { dropCard, drawCard, skipDraw, lockSetup, advancePhase } from '../../../state/websocket';

export function SetupDraftPhase() {
  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();
  const isMyTurn = () => myIdx() === g()?.setupDraftTurn;
  const currentTeam = () => {
    const gs = g();
    return gs ? gs.teams[gs.setupDraftTurn] : null;
  };
  const myTeam = () => {
    const idx = myIdx();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };

  const hint = () => {
    const gs = g();
    if (!gs) return '';
    if (!isMyTurn()) return 'Wait for your turn to draft cards.';
    if (gs.setupPhase === 'drop') return "Drop a card you don't want. You'll draw a replacement next.";
    return 'Draw from Segment or Idea deck, or skip to keep your hand.';
  };

  return (
    <div class="setup-phase">
      <h2>Setup Drafting - Round {g()?.setupRound}/3</h2>
      <p class="action-hint">{hint()}</p>

      <div class={`turn-indicator ${isMyTurn() ? 'your-turn' : ''}`}>
        {isMyTurn()
          ? <><strong>Your turn!</strong> {g()?.setupPhase === 'drop' ? 'Drop a card' : 'Draw or skip'}</>
          : <>Waiting for {currentTeam()?.name}...</>
        }
      </div>

      <Show when={myTeam()} fallback={<p>You are spectating.</p>}>
        <div class="setup-hand">
          <h3>Your Hand</h3>
          <div class="card-grid">
            <For each={myTeam()!.setupHand}>
              {(card) => {
                const isSegment = !('type' in card);
                const canDrop = () => isMyTurn() && g()?.setupPhase === 'drop';
                return (
                  <div
                    class={`setup-card ${isSegment ? 'segment' : 'idea'} ${canDrop() ? 'clickable' : ''}`}
                    onClick={() => canDrop() && dropCard(card.id, isSegment)}
                  >
                    <div class="card-type">
                      {isSegment ? 'Segment' : ('type' in card ? card.type : '')}
                    </div>
                    <div class="card-name">{card.name}</div>
                    <div class="card-desc">{card.description}</div>
                    {canDrop() && <div class="card-action">Click to drop</div>}
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        <Show when={isMyTurn() && g()?.setupPhase === 'draw'}>
          <div class="draw-options">
            <h3>Draw a Card</h3>
            <div class="draw-buttons">
              <button
                class="btn btn-secondary"
                disabled={g()?.segmentDeck.length === 0}
                onClick={() => drawCard('segment')}
              >
                Draw Segment ({g()?.segmentDeck.length} left)
              </button>
              <button
                class="btn btn-secondary"
                disabled={g()?.ideaDeck.length === 0}
                onClick={() => drawCard('idea')}
              >
                Draw Idea ({g()?.ideaDeck.length} left)
              </button>
              <button class="btn btn-text" onClick={skipDraw}>
                Skip Draw
              </button>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}

export function SetupLockPhase() {
  const [selectedSegmentId, setSelectedSegmentId] = createSignal<number | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = createSignal<number | null>(null);

  const g = () => gameState.value;
  const myTeam = () => {
    const idx = myTeamIndex();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };
  const isLocked = () => myTeam()?.lockedSegment !== null;

  const segments = () =>
    myTeam()?.setupHand.filter((c) => !('type' in c)) ?? [];
  const ideas = () =>
    myTeam()?.setupHand.filter((c) => 'type' in c) ?? [];

  const handleLock = () => {
    const seg = selectedSegmentId();
    const idea = selectedIdeaId();
    if (seg !== null && idea !== null) {
      lockSetup(seg, idea);
    }
  };

  return (
    <div class="setup-lock-phase">
      <h2>Lock Your Selection</h2>
      <p class="action-hint">
        Pick your final segment + idea combo. <strong>Matching pairs unlock bonus multipliers!</strong>
      </p>

      <Show when={myTeam()} fallback={<p>You are spectating.</p>}>
        <Show
          when={!isLocked()}
          fallback={
            <div class="lock-complete">
              <h3>Selection Locked!</h3>
              <div class="locked-cards">
                <div class="setup-card segment locked">
                  <div class="card-type">Segment</div>
                  <div class="card-name">{myTeam()!.lockedSegment?.name}</div>
                </div>
                <div class="setup-card idea locked">
                  <div class="card-type">{myTeam()!.lockedIdea?.type}</div>
                  <div class="card-name">{myTeam()!.lockedIdea?.name}</div>
                </div>
              </div>
              <Show when={myTeam()!.setupBonus}>
                <div class="bonus-display">
                  Bonus: +{((myTeam()!.setupBonus!.bonus.modifier) * 100).toFixed(0)}%{' '}
                  {myTeam()!.setupBonus!.bonus.category}
                </div>
              </Show>
            </div>
          }
        >
          <div class="lock-selection">
            <div class="selection-group">
              <h3>Select Segment</h3>
              <div class="card-grid">
                <For each={segments()}>
                  {(card) => (
                    <div
                      class={`setup-card segment selectable ${selectedSegmentId() === card.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSegmentId(card.id)}
                    >
                      <div class="card-type">Segment</div>
                      <div class="card-name">{card.name}</div>
                      <div class="card-desc">{card.description}</div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            <div class="selection-group">
              <h3>Select Idea</h3>
              <div class="card-grid">
                <For each={ideas()}>
                  {(card) => (
                    <div
                      class={`setup-card idea selectable ${selectedIdeaId() === card.id ? 'selected' : ''}`}
                      onClick={() => setSelectedIdeaId(card.id)}
                    >
                      <div class="card-type">{'type' in card ? card.type : ''}</div>
                      <div class="card-name">{card.name}</div>
                      <div class="card-desc">{card.description}</div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            <button
              class="btn btn-primary btn-large"
              disabled={selectedSegmentId() === null || selectedIdeaId() === null}
              onClick={handleLock}
            >
              Lock Selection
            </button>
          </div>
        </Show>
      </Show>

      <div class="teams-progress">
        <h3>Team Progress</h3>
        <For each={g()?.teams ?? []}>
          {(team) => (
            <div class={`team-progress-item ${team.lockedSegment ? 'locked' : 'pending'}`}>
              <span class="team-dot" style={`background: ${team.color}`} />
              <span>{team.name}</span>
              <span class="status">{team.lockedSegment ? 'Locked' : 'Selecting...'}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export function SetupSummary() {
  const g = () => gameState.value;

  return (
    <div class="setup-summary">
      <h2>Setup Complete</h2>
      <p class="action-hint">
        Review all team selections. The auction is next — plan your hiring budget!
      </p>

      <div class="summary-grid">
        <For each={g()?.teams ?? []}>
          {(team) => (
            <div class="team-summary" style={`--team-color: ${team.color}`}>
              <div class="team-header">{team.name}</div>
              <div class="team-setup">
                <div class="segment-badge">{team.lockedSegment?.name ?? 'None'}</div>
                <div class="idea-badge">{team.lockedIdea?.name ?? 'None'}</div>
              </div>
              <Show when={team.setupBonus}>
                <div class="bonus-badge">
                  +{((team.setupBonus!.bonus.modifier) * 100).toFixed(0)}%{' '}
                  {team.setupBonus!.bonus.category}
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>

      <Show when={spectatorMode()}>
        <p class="summary-note">Auto-advancing...</p>
      </Show>
      <Show when={!spectatorMode() && isHost()}>
        <div class="summary-actions">
          <button class="btn btn-primary btn-large" onClick={advancePhase}>
            Continue to Auction
          </button>
        </div>
      </Show>
      <Show when={!spectatorMode() && !isHost()}>
        <p class="summary-note">Waiting for host to continue...</p>
      </Show>
    </div>
  );
}
