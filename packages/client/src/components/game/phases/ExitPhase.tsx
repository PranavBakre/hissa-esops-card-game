// ===========================================
// Exit Phase
// ===========================================

import { Show, For } from 'solid-js';
import { gameState, myTeamIndex } from '../../../state/client';
import { drawExit } from '../../../state/websocket';
import { formatCurrency, getMultiplierClass } from '../../../utils';

export function ExitPhase() {
  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();
  const myTeam = () => {
    const idx = myIdx();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };

  const hasDrawn = () => myTeam()?.exitChoice !== null;
  const isMyTurn = () => myIdx() !== null && g()?.currentExitTurn === myIdx();
  const currentTurn = () => g()?.currentExitTurn ?? -1;
  const currentTeamName = () => {
    const turn = currentTurn();
    return turn >= 0 ? g()?.teams[turn]?.name ?? '' : '';
  };
  const cardsRemaining = () => g()?.exitDeck.length ?? 0;

  const hint = () => {
    const team = myTeam();
    if (team?.exitChoice) {
      return `You drew ${team.exitChoice.name}! ${team.exitChoice.multiplier}x multiplier applied to your capital.`;
    }
    if (isMyTurn()) return "It's your turn! Click to draw your exit card. Good luck!";
    if (!team) return 'Watch teams draw their exit cards.';
    return 'Wait for your turn to draw an exit card...';
  };

  const exitCardColor = (multiplier: number) => {
    const cls = getMultiplierClass(multiplier);
    if (cls === 'high') return 'var(--green)';
    if (cls === 'moderate') return 'var(--amber)';
    return 'var(--red)';
  };

  return (
    <div class="exit-phase">
      <h2>Exit Phase</h2>
      <p class="action-hint" innerHTML={hint()} />

      <div class="exit-layout">
        <div class="exit-draw-area">
          <Show when={!hasDrawn() && currentTurn() >= 0 && cardsRemaining() > 0}>
            <div
              class="exit-card-back"
              role={isMyTurn() ? 'button' : undefined}
              tabIndex={isMyTurn() ? 0 : undefined}
              onClick={() => isMyTurn() && drawExit()}
            >
              <div>
                <div class="exit-card-back-label">{'\u{1F3B2}'} EXIT</div>
                <div class="exit-card-back-hint">
                  {isMyTurn() ? 'Click to draw' : `${currentTeamName()}'s turn`}
                </div>
              </div>
            </div>
          </Show>

          <Show when={hasDrawn() && myTeam()?.exitChoice}>
            {(() => {
              const choice = myTeam()!.exitChoice!;
              return (
                <div class="exit-card-revealed">
                  <div class="exit-name">{choice.name}</div>
                  <div class={`exit-multiplier ${getMultiplierClass(choice.multiplier)}`}>
                    {choice.multiplier}x
                  </div>
                  <div class="exit-desc">{choice.description}</div>
                </div>
              );
            })()}
          </Show>

          <div class="exit-team-draws">
            <For each={g()?.teams ?? []}>
              {(team, i) => {
                const hasChosenExit = () => team.exitChoice !== null;
                const isThisTurn = () => currentTurn() === i();

                return (
                  <Show when={!team.isDisqualified}>
                    <div
                      class="exit-team-draw"
                      style={`border-color: ${hasChosenExit() ? team.color : 'var(--border-default)'}`}
                    >
                      <div
                        class="exit-team-draw-name"
                        style={`color: ${hasChosenExit() ? team.color : 'var(--text-muted)'}`}
                      >
                        {team.name}
                      </div>
                      <div
                        class="exit-team-draw-card"
                        style={!hasChosenExit() ? 'color: var(--text-muted)' : undefined}
                      >
                        {hasChosenExit() && team.exitChoice
                          ? team.exitChoice.name
                          : isThisTurn()
                            ? 'Drawing...'
                            : 'Waiting...'}
                      </div>
                      <div
                        class="exit-team-draw-mult"
                        style={`color: ${
                          hasChosenExit() && team.exitChoice
                            ? exitCardColor(team.exitChoice.multiplier)
                            : 'var(--text-muted)'
                        }`}
                      >
                        {hasChosenExit() && team.exitChoice
                          ? `${team.exitChoice.multiplier}x`
                          : '?'}
                      </div>
                    </div>
                  </Show>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}
