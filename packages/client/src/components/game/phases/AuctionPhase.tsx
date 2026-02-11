// ===========================================
// Auction Phase + Summary
// ===========================================

import { createSignal, Show, For } from 'solid-js';
import { gameState, myTeamIndex, isHost, spectatorMode } from '../../../state/client';
import { placeBid, passBid, advancePhase } from '../../../state/websocket';
import { getCategoryColor } from '../../../utils';

export function AuctionPhase() {
  const [bidValue, setBidValue] = createSignal(1);

  const g = () => gameState.value;
  const myTeam = () => {
    const idx = myTeamIndex();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };
  const currentCard = () => {
    const gs = g();
    return gs ? gs.employeeDeck[gs.currentCardIndex] : null;
  };
  const currentBid = () => g()?.currentBid ?? null;

  const minBid = () => {
    const bid = currentBid();
    return bid ? bid.amount + 1 : 1;
  };

  // Reset bid value when min changes
  const effectiveMin = () => {
    const m = minBid();
    if (bidValue() < m) setBidValue(m);
    return m;
  };

  const canBid = () => {
    const team = myTeam();
    return team && !team.isDisqualified && team.employees.length < 3 && team.esopRemaining > 0;
  };

  const adjustBid = (inc: number) => {
    const max = myTeam()?.esopRemaining ?? 100;
    const newVal = Math.round((bidValue() + inc) * 10) / 10;
    setBidValue(Math.max(effectiveMin(), Math.min(max, newVal)));
  };

  const handleBid = () => {
    const amount = bidValue();
    if (!isNaN(amount) && amount > 0) {
      placeBid(amount);
    }
  };

  const hint = () => {
    const gs = g();
    const team = myTeam();
    if (!gs) return '';
    if (!team) return 'Watch teams bid for employees.';
    if (team.employees.length >= 3) return "You've filled your team! Watch the remaining bids.";
    const bid = currentBid();
    if (!bid) return `Be the first to bid! Starting bid is 1% ESOP. You have ${team.esopRemaining.toFixed(1)}% remaining.`;
    const bidderName = gs.teams[bid.teamIndex].name;
    return `Outbid ${bidderName} or pass. You have ${team.esopRemaining.toFixed(1)}% ESOP remaining.`;
  };

  return (
    <div class="auction-phase">
      <h2>Employee Auction</h2>
      <p class="action-hint" innerHTML={hint()} />

      <Show when={currentCard()} fallback={<div class="auction-complete">Auction complete!</div>}>
        {(card) => {
          const hardPct = () => (card().hardSkill * 100).toFixed(0);
          const categoryClass = () => card().category.toLowerCase();
          const progressPct = () =>
            ((g()!.currentCardIndex + 1) / g()!.employeeDeck.length * 100).toFixed(0);

          return (
            <>
              <div class="employee-card" style={`--card-accent: ${getCategoryColor(card().category)}`}>
                <span class={`emp-category-badge ${categoryClass()}`}>{card().category}</span>
                <div class="emp-name">{card().name}</div>
                <div class="emp-role">{card().role}</div>

                <div class="skill-bar-section">
                  <div class="skill-row">
                    <div class="skill-label">
                      <span>Hard Skill</span>
                      <span>{hardPct()}%</span>
                    </div>
                    <div class="skill-bar-track">
                      <div class="skill-bar-fill hard" style={`width: ${hardPct()}%`} />
                    </div>
                  </div>

                  <div class="soft-skill-pills">
                    <For each={Object.entries(card().softSkills)}>
                      {([skill, value]) => (
                        <span class="soft-pill">
                          {skill} <strong>{(value * 100).toFixed(0)}%</strong>
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </div>

              <div class="bid-status">
                <Show
                  when={currentBid()}
                  fallback={<div class="no-bid">No bids yet</div>}
                >
                  {(bid) => (
                    <div class="current-bid">
                      <span>Current Bid:</span>
                      <strong>{bid().amount}% ESOP</strong>
                      <span>by {g()!.teams[bid().teamIndex].name}</span>
                    </div>
                  )}
                </Show>
              </div>

              <Show when={canBid()} fallback={
                <Show when={myTeam()}>
                  <div class="cannot-bid">
                    {myTeam()!.employees.length >= 3 ? 'You have hired 3 employees' : 'No ESOP remaining'}
                  </div>
                </Show>
              }>
                <div class="bid-controls">
                  <div class="bid-inc-btns">
                    <button class="bid-inc-btn" onClick={() => adjustBid(0.5)}>+0.5</button>
                    <button class="bid-inc-btn" onClick={() => adjustBid(1)}>+1</button>
                    <button class="bid-inc-btn" onClick={() => adjustBid(2)}>+2</button>
                  </div>
                  <div class="bid-input-wrap">
                    <input
                      type="number"
                      value={bidValue()}
                      min={effectiveMin()}
                      max={myTeam()?.esopRemaining ?? 100}
                      step={0.5}
                      onInput={(e) => setBidValue(parseFloat(e.currentTarget.value) || effectiveMin())}
                      onKeyPress={(e) => e.key === 'Enter' && handleBid()}
                    />
                    <span class="suffix">%</span>
                  </div>
                  <div class="bid-actions">
                    <button class="btn btn-primary" onClick={handleBid}>Place Bid</button>
                    <button class="btn btn-secondary" onClick={passBid}>Pass</button>
                  </div>
                  <div class="esop-remaining">
                    Your ESOP: {myTeam()!.esopRemaining.toFixed(1)}% remaining
                  </div>
                </div>
              </Show>

              <div class="auction-progress">
                Card {g()!.currentCardIndex + 1} of {g()!.employeeDeck.length}
                <div class="progress-track">
                  <div class="progress-fill" style={`width: ${progressPct()}%`} />
                </div>
              </div>
            </>
          );
        }}
      </Show>
    </div>
  );
}

export function AuctionSummary() {
  const g = () => gameState.value;

  return (
    <div class="auction-summary">
      <h2>Auction Complete</h2>
      <p class="action-hint">
        Teams are set! Market rounds begin next — your employees' skills will be tested.
      </p>

      <div class="summary-grid">
        <For each={g()?.teams ?? []}>
          {(team) => (
            <div
              class={`team-summary ${team.isDisqualified ? 'disqualified' : ''}`}
              style={`--team-color: ${team.color}`}
            >
              <div class="team-header">{team.name}</div>
              <Show when={team.isDisqualified} fallback={
                <>
                  <div class="employees-list">
                    <For each={team.employees}>
                      {(emp) => (
                        <div class="employee-mini">
                          <span class="emp-name">{emp.name}</span>
                          <span class="emp-cost">{emp.bidAmount}%</span>
                        </div>
                      )}
                    </For>
                  </div>
                  <div class="team-stats">
                    <span>ESOP Remaining: {team.esopRemaining}%</span>
                  </div>
                </>
              }>
                <div class="disqualified-badge">Disqualified</div>
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
            Continue to Investment
          </button>
        </div>
      </Show>
      <Show when={!spectatorMode() && !isHost()}>
        <p class="summary-note">Waiting for host to continue...</p>
      </Show>
    </div>
  );
}
