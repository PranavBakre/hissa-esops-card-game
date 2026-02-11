// ===========================================
// Registration Phase
// ===========================================

import { createSignal, Show, For } from 'solid-js';
import { TEAM_DEFINITIONS } from '@esop-wars/shared';
import { gameState, myTeamIndex } from '../../../state/client';
import { registerTeam } from '../../../state/websocket';

export function RegistrationPhase() {
  const [teamName, setTeamName] = createSignal('');

  const g = () => gameState.value;
  const myTeam = () => {
    const idx = myTeamIndex();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };

  const isRegistered = () => {
    const team = myTeam();
    const idx = myTeamIndex();
    if (!team || idx === null) return false;
    return team.name !== TEAM_DEFINITIONS[idx].name;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (teamName().trim()) {
      registerTeam(teamName().trim());
    }
  };

  return (
    <div class="registration-phase">
      <h2>Registration</h2>
      <p class="action-hint">Name your startup to get started.</p>

      <Show
        when={myTeam()}
        fallback={<p>You are spectating this game.</p>}
      >
        <Show
          when={!isRegistered()}
          fallback={
            <div class="registration-complete">
              <h3>Registered!</h3>
              <p>
                <strong>{myTeam()!.name}</strong>
              </p>
            </div>
          }
        >
          <form class="registration-form" onSubmit={handleSubmit}>
            <div class="form-group">
              <label for="team-name">Startup Name</label>
              <input
                type="text"
                id="team-name"
                placeholder="Enter your startup name"
                maxLength={30}
                required
                value={teamName()}
                onInput={(e) => setTeamName(e.currentTarget.value)}
              />
            </div>
            <button type="submit" class="btn btn-primary">
              Register
            </button>
          </form>
        </Show>
      </Show>

      <div class="registration-status">
        <h3>Teams</h3>
        <For each={g()?.teams ?? []}>
          {(team, index) => {
            const defaultName = TEAM_DEFINITIONS[index()].name;
            const registered = team.name !== defaultName;
            return (
              <div
                class={`registration-team ${registered ? 'registered' : 'pending'}`}
              >
                <span class="team-dot" style={`background: ${team.color}`} />
                <span class="team-name">{team.name}</span>
                <span class="registration-badge">
                  {registered ? 'Registered' : 'Pending'}
                </span>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
