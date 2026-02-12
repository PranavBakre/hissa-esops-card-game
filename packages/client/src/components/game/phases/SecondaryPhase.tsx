// ===========================================
// Secondary Drop + Hire Phases
// ===========================================

import { createSignal, Show, For } from 'solid-js';
import { gameState, myTeamIndex, isHost } from '../../../state/client';
import { dropEmployeeAction, placeBid, passBid, advancePhase } from '../../../state/websocket';
import { getCategoryColor } from '../../../utils';

export function SecondaryDropPhase() {
  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();
  const myTeam = () => {
    const idx = myIdx();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };

  const hasDropped = () => {
    const idx = myIdx();
    return idx !== null && (g()?.droppedEmployees.some((d) => d.fromTeamIndex === idx) ?? false);
  };

  const hint = () => {
    const team = myTeam();
    if (!team || team.isDisqualified) return 'Watch teams release employees to the secondary market.';
    if (hasDropped()) return 'Employee released! Waiting for other teams to choose...';
    return "Choose one employee to release. They'll enter the secondary market for all teams to bid on.";
  };

  const handleDrop = (employeeId: number) => {
    if (confirm('Drop this employee to the secondary market?')) {
      dropEmployeeAction(employeeId);
    }
  };

  return (
    <div class="secondary-drop">
      <h2>Secondary Market - Drop Phase</h2>
      <p class="action-hint">{hint()}</p>

      <Show when={myTeam() && !myTeam()!.isDisqualified && !hasDropped()}>
        <div class="drop-selection">
          <h3>Select Employee to Drop</h3>
          <div class="employee-drop-grid">
            <For each={myTeam()!.employees}>
              {(emp) => (
                <div class="employee-drop-card" onClick={() => handleDrop(emp.id)}>
                  <div class="employee-category">{emp.category}</div>
                  <div class="employee-name">{emp.name}</div>
                  <div class="employee-role">{emp.role}</div>
                  <div class="employee-hired-for">Hired for {emp.bidAmount}%</div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={myTeam() && !myTeam()!.isDisqualified && hasDropped()}>
        <div class="drop-complete">
          <h3>Drop Submitted</h3>
          <p>Waiting for other teams...</p>
        </div>
      </Show>

      <Show when={!myTeam() || myTeam()!.isDisqualified}>
        <p>You are spectating or disqualified.</p>
      </Show>

      <div class="drop-status">
        <h3>Drop Status</h3>
        <For each={g()?.teams ?? []}>
          {(team, i) => {
            const hasDroppedEmp = () =>
              g()?.droppedEmployees.some((d) => d.fromTeamIndex === i()) ?? false;
            return (
              <Show when={!team.isDisqualified}>
                <div class={`drop-status-item ${hasDroppedEmp() ? 'dropped' : 'pending'}`}>
                  <span class="team-dot" style={`background: ${team.color}`} />
                  <span>{team.name}</span>
                  <span class="status">{hasDroppedEmp() ? 'Dropped' : 'Selecting...'}</span>
                </div>
              </Show>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export function SecondaryHirePhase() {
  const [bidValue, setBidValue] = createSignal(1);

  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();
  const myTeam = () => {
    const idx = myIdx();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };

  const pool = () => g()?.secondaryPool ?? [];
  const currentCard = () => {
    const gs = g();
    return gs ? pool()[gs.currentCardIndex] ?? null : null;
  };
  const currentBid = () => g()?.currentBid ?? null;

  const minBid = () => {
    const bid = currentBid();
    return bid ? bid.amount + 1 : 1;
  };

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
    const team = myTeam();
    const bid = currentBid();
    const gs = g();
    if (!gs || !team) return 'Watch teams bid on secondary market employees.';
    if (!bid) return `Last chance to strengthen your team! Starting bid is 1% ESOP. You have ${team.esopRemaining.toFixed(1)}% remaining.`;
    const bidderName = gs.teams[bid.teamIndex].name;
    return `Outbid ${bidderName} or pass. You have ${team.esopRemaining.toFixed(1)}% ESOP remaining.`;
  };

  // Secondary complete state
  const isComplete = () => !currentCard();

  return (
    <Show when={!isComplete()} fallback={
      <div class="secondary-complete">
        <h2>Secondary Market Complete</h2>
        <p>All employees have been placed.</p>
        <Show when={isHost()}>
          <div class="summary-actions">
            <button class="btn btn-primary btn-large" onClick={advancePhase}>
              Continue to Mature Round
            </button>
          </div>
        </Show>
        <Show when={!isHost()}>
          <p class="summary-note">Waiting for host to continue...</p>
        </Show>
      </div>
    }>
      <div class="secondary-hire auction-phase">
        <h2>Secondary Market - Hiring</h2>
        <p class="action-hint" innerHTML={hint()} />

        {(() => {
          const card = currentCard()!;
          const hardPct = () => (card.hardSkill * 100).toFixed(0);
          const categoryClass = () => card.category.toLowerCase();
          const progressPct = () =>
            ((g()!.currentCardIndex + 1) / pool().length * 100).toFixed(0);

          return (
            <>
              <div class="employee-card" style={`--card-accent: ${getCategoryColor(card.category)}`}>
                <span class={`emp-category-badge ${categoryClass()}`}>{card.category}</span>
                <div class="emp-name">{card.name}</div>
                <div class="emp-role">{card.role}</div>

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
                    <For each={Object.entries(card.softSkills)}>
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

              <Show when={canBid()} fallback={<p>You cannot bid in this round.</p>}>
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
                Card {g()!.currentCardIndex + 1} of {pool().length}
                <div class="progress-track">
                  <div class="progress-fill" style={`width: ${progressPct()}%`} />
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </Show>
  );
}
