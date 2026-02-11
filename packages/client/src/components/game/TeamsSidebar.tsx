// ===========================================
// Teams Sidebar
// ===========================================

import { For, Show } from 'solid-js';
import { gameState, myTeamIndex } from '../../state/client';
import { formatCurrency, getCategoryColor } from '../../utils';

export function TeamsSidebar() {
  const g = () => gameState.value;

  return (
    <Show when={g()}>
      <div class="teams-sidebar">
        <div class="sidebar-label">Teams</div>
        <For each={g()!.teams}>
          {(team, index) => {
            const isMe = () => myTeamIndex() === index();
            return (
              <div
                class={`sidebar-team ${isMe() ? 'my-team' : ''} ${team.isDisqualified ? 'disqualified' : ''}`}
                style={`--team-color: ${team.color}`}
              >
                <div class="sidebar-team-top">
                  <div class="sidebar-team-name">{team.name}</div>
                  {isMe() && <span class="badge badge-you">You</span>}
                  {team.isBot && <span class="badge badge-bot">Bot</span>}
                </div>
                <div class="sidebar-valuation">
                  {formatCurrency(team.capital)}
                </div>
                <div class="sidebar-meta">
                  <span>{team.esopRemaining.toFixed(1)}% ESOP</span>
                  <span>{team.employees.length}/3 hired</span>
                </div>
                <div class="sidebar-employees">
                  <For each={[0, 1, 2]}>
                    {(i) => {
                      const emp = team.employees[i];
                      return emp ? (
                        <div
                          class="emp-dot"
                          style={`background: ${getCategoryColor(emp.category)}`}
                        />
                      ) : (
                        <div
                          class="emp-dot"
                          style="background: var(--border-default); border: 2px dashed var(--text-muted)"
                        />
                      );
                    }}
                  </For>
                </div>
                <Show
                  when={!team.wildcardUsed}
                  fallback={
                    <div class="sidebar-wildcard used">
                      &#9733; Wildcard used
                    </div>
                  }
                >
                  <div class="sidebar-wildcard">&#9733; Wildcard ready</div>
                </Show>
                <Show when={team.investorTeamIndex !== null}>
                  <div class="sidebar-investor">
                    Investor:{' '}
                    {g()?.teams[team.investorTeamIndex!]?.name ?? '?'}
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

export function MobileTeamStrip() {
  const g = () => gameState.value;

  return (
    <Show when={g()}>
      <div class="mobile-team-strip">
        <For each={g()!.teams}>
          {(team, index) => {
            const isMe = () => myTeamIndex() === index();
            return (
              <div
                class={`mobile-team-chip ${isMe() ? 'my-team' : ''}`}
                style={`--team-color: ${team.color}`}
              >
                <span class="mobile-team-chip-name">{team.name}</span>
                <span class="mobile-team-chip-val">
                  {formatCurrency(team.capital)}
                </span>
                {isMe() && <span class="badge badge-you">You</span>}
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
