// ===========================================
// Lobby Screen
// ===========================================

import { Show, For } from 'solid-js';
import { TEAM_DEFINITIONS } from '@esop-wars/shared';
import {
  room,
  myTeamIndex,
  playerId,
  isHost,
  fillBots,
} from '../../state/client';
import {
  selectTeam,
  startGame,
  startBotGame,
  leaveRoom,
  toggleFillBots,
} from '../../state/websocket';

export function LobbyScreen() {
  const roomVal = () => room.value;

  const playersWithTeams = () =>
    roomVal()?.players.filter((p) => p.teamIndex !== null) ?? [];

  const humanTeamCount = () => playersWithTeams().length;

  const canStart = () =>
    fillBots() ? humanTeamCount() > 0 : humanTeamCount() >= 2;

  const startButtonLabel = () =>
    fillBots() ? 'Start Game' : `Start Game (${humanTeamCount()} players)`;

  const lobbyHint = () =>
    fillBots()
      ? 'Empty team slots will be filled with bots'
      : humanTeamCount() < 2
        ? 'Need at least 2 players to start without bots'
        : `${humanTeamCount()} of 5 teams ready`;

  return (
    <Show when={roomVal()}>
      <div class="lobby-screen">
        <div class="lobby-header">
          <h2>
            Room <span class="lobby-code">{roomVal()!.code}</span>
          </h2>
          <button class="btn btn-ghost" onClick={leaveRoom}>
            Leave
          </button>
        </div>

        <div class="lobby-grid">
          <div>
            <div class="lobby-section-title">Teams</div>
            <div class="team-slots">
              <For each={TEAM_DEFINITIONS}>
                {(def, index) => {
                  const player = () =>
                    roomVal()?.players.find((p) => p.teamIndex === index());
                  const isMyTeam = () => myTeamIndex() === index();
                  const isTaken = () => {
                    const p = player();
                    return !!p && p.playerId !== playerId();
                  };

                  const statusText = () => {
                    const p = player();
                    if (p) {
                      return p.playerId === playerId() ? 'You' : p.playerName;
                    }
                    return fillBots() ? 'Empty' : 'Not playing';
                  };

                  return (
                    <div
                      class={`team-slot ${isMyTeam() ? 'selected' : ''} ${isTaken() ? 'taken' : ''}`}
                      data-team-index={index()}
                      onClick={() => !isTaken() && selectTeam(index())}
                    >
                      <div
                        class="team-color-dot"
                        style={`background: ${def.color}`}
                      />
                      <div class="team-slot-name">{def.name}</div>
                      <div class={`team-slot-status ${isMyTeam() ? 'you' : ''}`}>
                        {statusText()}
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          <div>
            <div class="lobby-section-title">
              Players ({roomVal()?.players.length ?? 0})
            </div>
            <For each={roomVal()?.players ?? []}>
              {(p) => (
                <div
                  class={`player-list-item ${!p.connected ? 'disconnected' : ''}`}
                >
                  <div class="player-list-name">{p.playerName}</div>
                  {p.isHost && <span class="badge badge-host">Host</span>}
                  {!p.connected && <span class="status-badge">Offline</span>}
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="lobby-footer">
          <Show
            when={isHost()}
            fallback={
              <div class="lobby-hint">
                Waiting for host to start the game...
              </div>
            }
          >
            <div class="lobby-option">
              <label class="toggle-label">
                <input
                  type="checkbox"
                  checked={fillBots()}
                  onChange={toggleFillBots}
                />
                <span>Fill empty slots with bots</span>
              </label>
            </div>
            <div class="lobby-start-buttons">
              <button
                class="btn btn-primary btn-lg"
                disabled={!canStart()}
                onClick={startGame}
              >
                {startButtonLabel()}
              </button>
              <button
                class="btn btn-secondary btn-lg"
                onClick={startBotGame}
              >
                Watch Bot Game
              </button>
            </div>
            <div class="lobby-hint">{lobbyHint()}</div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
