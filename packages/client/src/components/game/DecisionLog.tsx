// ===========================================
// Decision Log Panel
// ===========================================

import { Show, For } from 'solid-js';
import { PHASE_LABELS } from '@esop-wars/shared';
import { gameState, decisionLogOpen, setDecisionLogOpen } from '../../state/client';

export function DecisionLog() {
  const entries = () => gameState.value?.decisionLog ?? [];

  return (
    <div
      class={`decision-log-panel ${decisionLogOpen() ? 'open' : ''}`}
      id="decision-log-panel"
    >
      <div class="log-header">
        <span class="log-title">Decision Log</span>
        <button class="log-close" onClick={() => setDecisionLogOpen(false)}>
          &times;
        </button>
      </div>
      <div class="log-body">
        <Show
          when={entries().length > 0}
          fallback={<div class="log-empty">No decisions yet.</div>}
        >
          <For each={entries()}>
            {(entry) => {
              const teamName =
                entry.teamIndex !== null
                  ? gameState.value?.teams[entry.teamIndex]?.name ?? '?'
                  : null;
              const teamColor =
                entry.teamIndex !== null
                  ? gameState.value?.teams[entry.teamIndex]?.color ??
                    'var(--text-muted)'
                  : null;
              const phaseLabel = PHASE_LABELS[entry.phase] ?? entry.phase;
              return (
                <div class="log-entry">
                  <span class="log-phase">{phaseLabel}</span>
                  <Show when={teamName}>
                    <span class="log-team" style={`color: ${teamColor}`}>
                      {teamName}
                    </span>
                  </Show>
                  <span class="log-message">{entry.message}</span>
                </div>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
}
