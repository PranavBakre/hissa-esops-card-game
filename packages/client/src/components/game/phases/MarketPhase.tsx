// ===========================================
// Market Round Phase (Seed, Early, Mature)
// ===========================================

import { Show, For, onMount } from 'solid-js';
import { PHASE_LABELS } from '@esop-wars/shared';
import { gameState, myTeamIndex, isHost, spectatorMode } from '../../../state/client';
import { drawMarket, selectWildcard } from '../../../state/websocket';
import { formatCurrency } from '../../../utils';

export function MarketPhase() {
  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();
  const myTeam = () => {
    const idx = myIdx();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };

  const phaseName = () => {
    const gs = g();
    return gs ? (PHASE_LABELS[gs.phase] || gs.phase) : '';
  };

  const isWildcardPhase = () => g()?.wildcardPhase ?? false;
  const hasResults = () => (g()?.roundPerformance.length ?? 0) > 0;
  const needsDraw = () => !isWildcardPhase() && !hasResults();
  const marketCard = () => g()?.currentMarketCard ?? null;

  const hasSelectedWildcard = () => {
    const idx = myIdx();
    return idx !== null && g()?.teamWildcardSelections[idx] !== undefined;
  };

  const hint = () => {
    const gs = g();
    const team = myTeam();
    if (!gs) return '';

    if (isWildcardPhase()) {
      if (!team) return 'Teams are choosing their wildcard strategy.';
      if (hasSelectedWildcard()) return 'Your choice is locked in. Waiting for other teams...';
      if (team.wildcardUsed) return "You've already used your wildcard. Click Pass to continue.";
      return 'This is your one-time wildcard. Use it when the stakes are highest!';
    }

    if (hasResults()) return 'Market results are in! Review how your team performed this round.';
    if (isHost()) return "Draw the market card to reveal this round's conditions.";
    return 'Waiting for the host to draw the market card...';
  };

  return (
    <div class="market-round">
      <h2>{phaseName()} Round</h2>
      <p class="action-hint">{hint()}</p>

      <div class="market-layout">
        <Show when={needsDraw()}>
          <div class="market-draw">
            <Show when={spectatorMode()}>
              <p class="summary-note">Drawing market card...</p>
            </Show>
            <Show when={!spectatorMode() && isHost()}>
              <button class="btn btn-primary btn-large" onClick={drawMarket}>
                Draw Market Card
              </button>
            </Show>
            <Show when={!spectatorMode() && !isHost()}>
              <p class="summary-note">Waiting for host to draw market card...</p>
            </Show>
          </div>
        </Show>

        <Show when={marketCard()}>
          {(card) => (
            <div class="market-card-reveal">
              <div class="market-card-label">Market Card</div>
              <div class="market-card-name">{card().name}</div>
              <div class="market-card-desc">{card().description}</div>
              <div class="market-modifiers">
                <For each={Object.entries(card().hardSkillModifiers).filter(([, v]) => v !== 0)}>
                  {([cat, v]) => (
                    <span class={`modifier-pill ${v > 0 ? 'positive' : 'negative'}`}>
                      {cat} {v > 0 ? '+' : ''}{(v * 100).toFixed(0)}%
                    </span>
                  )}
                </For>
              </div>
            </div>
          )}
        </Show>

        <Show when={hasResults()}>
          <div class="results-heading">Round Results</div>
          <div class="results-grid">
            <For each={g()?.roundPerformance ?? []}>
              {(perf) => {
                const team = () => g()?.teams[perf.teamIndex];
                return (
                  <Show when={team()}>
                    <div class="result-card" style={`--team-color: ${team()!.color}`}>
                      <div class="result-team-name">{team()!.name}</div>
                      <div class={`result-change ${perf.gain >= 0 ? 'positive' : 'negative'}`}>
                        {perf.gain >= 0 ? '+' : ''}{formatCurrency(perf.gain)}
                      </div>
                      <div class="result-val">{formatCurrency(team()!.capital)}</div>
                      {team()!.isMarketLeader && <span class="leader-badge">Market Leader</span>}
                    </div>
                  </Show>
                );
              }}
            </For>
          </div>
        </Show>

        <Show when={isWildcardPhase()}>
          <WildcardSection />
        </Show>
      </div>
    </div>
  );
}

function WildcardSection() {
  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();
  const myTeam = () => {
    const idx = myIdx();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };

  const hasSelected = () => {
    const idx = myIdx();
    return idx !== null && g()?.teamWildcardSelections[idx] !== undefined;
  };

  // Auto-pass if wildcard already used
  onMount(() => {
    const team = myTeam();
    if (team && team.wildcardUsed && !hasSelected()) {
      selectWildcard('pass');
    }
  });

  return (
    <div class="wildcard-phase">
      <h3>Wildcard Decision</h3>
      <p class="wildcard-context">
        Now that you've seen the market results, choose your wildcard strategy:
      </p>

      <Show when={myTeam() && !hasSelected() && !myTeam()!.wildcardUsed}>
        <div class="wildcard-options">
          <div class="wildcard-option" onClick={() => selectWildcard('double-down')}>
            <div class="wildcard-name">Double Down</div>
            <div class="wildcard-desc">Double your gains or losses this round</div>
          </div>
          <div class="wildcard-option" onClick={() => selectWildcard('shield')}>
            <div class="wildcard-name">Shield</div>
            <div class="wildcard-desc">Revert any losses this round</div>
          </div>
          <div class="wildcard-option pass" onClick={() => selectWildcard('pass')}>
            <div class="wildcard-name">Pass</div>
            <div class="wildcard-desc">Save wildcard for later</div>
          </div>
        </div>
      </Show>

      <Show when={myTeam() && !hasSelected() && myTeam()!.wildcardUsed}>
        <div class="wildcard-waiting">
          <p>Wildcard already used. Auto-passing...</p>
        </div>
      </Show>

      <Show when={myTeam() && hasSelected()}>
        <div class="wildcard-waiting">
          <p>Your choice submitted. Waiting for other teams...</p>
        </div>
      </Show>

      <Show when={!myTeam()}>
        <p>You are spectating.</p>
      </Show>

      <div class="wildcard-status">
        <For each={g()?.teams ?? []}>
          {(team, i) => {
            const selected = () => g()?.teamWildcardSelections[i()] !== undefined;
            return (
              <div class={`wildcard-status-item ${selected() ? 'selected' : 'pending'}`}>
                <span class="team-dot" style={`background: ${team.color}`} />
                <span>{team.name}</span>
                <span class="status">{selected() ? 'Ready' : 'Deciding...'}</span>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
