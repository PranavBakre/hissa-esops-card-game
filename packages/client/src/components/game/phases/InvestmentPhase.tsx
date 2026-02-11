// ===========================================
// Investment Phase (Declare, Conflict, Tie, Summary)
// ===========================================

import { createSignal, Show, For } from 'solid-js';
import { GAME } from '@esop-wars/shared';
import { gameState, myTeamIndex, isHost, spectatorMode } from '../../../state/client';
import {
  declareInvestment,
  placeInvestmentBid,
  passInvestmentBid,
  resolveInvestmentTie,
  advancePhase,
} from '../../../state/websocket';
import { formatCurrency } from '../../../utils';

export function InvestmentPhase() {
  const subPhase = () => gameState.value?.investmentSubPhase ?? 'declare';

  return (
    <>
      <Show when={subPhase() === 'declare'}>
        <InvestmentDeclare />
      </Show>
      <Show when={subPhase() === 'conflict'}>
        <InvestmentConflict />
      </Show>
      <Show when={subPhase() === 'resolve-tie'}>
        <InvestmentTie />
      </Show>
      <Show when={subPhase() === 'summary'}>
        <InvestmentSummary />
      </Show>
    </>
  );
}

function InvestmentDeclare() {
  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();
  const myTeam = () => {
    const idx = myIdx();
    return idx !== null ? g()?.teams[idx] ?? null : null;
  };

  const hasDeclared = () => {
    const idx = myIdx();
    return idx !== null && g()?.investmentDeclarations[idx] !== undefined;
  };

  const eligibleTargets = () =>
    (g()?.teams ?? [])
      .map((team, i) => ({ team, index: i }))
      .filter(({ team, index }) =>
        index !== myIdx() &&
        !team.isDisqualified &&
        team.investorTeamIndex === null
      );

  const hint = () => {
    const team = myTeam();
    if (!team) return 'Watch teams make investment decisions.';
    if (hasDeclared()) return 'Investment declared. Waiting for other teams...';
    if (team.investedInTeamIndex !== null) return "You've already invested. Waiting for others...";
    return 'Choose a team to invest in, or pass. Investing costs capital but earns 5% equity.';
  };

  return (
    <div class="investment-phase">
      <h2>Investment Round</h2>
      <p class="action-hint">{hint()}</p>

      <Show when={myTeam() && !myTeam()!.isDisqualified && !hasDeclared() && myTeam()!.investedInTeamIndex === null}>
        <div class="investment-declare">
          <h3>Choose a Team to Invest In</h3>
          <p class="investment-info">Invest $500K–$1M capital for 5% equity in another team.</p>
          <div class="investment-targets">
            <For each={eligibleTargets()}>
              {({ team, index }) => (
                <div
                  class="investment-target-card"
                  style={`--team-color: ${team.color}`}
                  onClick={() => declareInvestment(index)}
                >
                  <div class="target-name">{team.name}</div>
                  <div class="target-capital">{formatCurrency(team.capital)}</div>
                  <div class="target-employees">{team.employees.length}/3 employees</div>
                </div>
              )}
            </For>
          </div>
          <button class="btn btn-secondary" onClick={() => declareInvestment(null)}>
            Pass (Don't Invest)
          </button>
        </div>
      </Show>

      <Show when={myTeam() && !myTeam()!.isDisqualified && hasDeclared()}>
        <div class="investment-waiting">
          <h3>Declaration Submitted</h3>
          <p>Waiting for other teams to decide...</p>
        </div>
      </Show>

      <Show when={!myTeam() || myTeam()!.isDisqualified}>
        <p>You are spectating or disqualified.</p>
      </Show>

      <div class="investment-status">
        <h3>Declaration Status</h3>
        <For each={g()?.teams ?? []}>
          {(team, i) => {
            const declared = () => g()?.investmentDeclarations[i()] !== undefined;
            return (
              <Show when={!team.isDisqualified}>
                <div class={`investment-status-item ${declared() ? 'declared' : 'pending'}`}>
                  <span class="team-dot" style={`background: ${team.color}`} />
                  <span>{team.name}</span>
                  <span class="status">{declared() ? 'Declared' : 'Deciding...'}</span>
                </div>
              </Show>
            );
          }}
        </For>
      </div>
    </div>
  );
}

function InvestmentConflict() {
  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();

  const conflictEntries = () => Object.entries(g()?.investmentConflicts ?? {});
  const firstConflict = () => {
    const entries = conflictEntries();
    if (entries.length === 0) return null;
    const [targetStr, competitors] = entries[0];
    return { targetIndex: parseInt(targetStr, 10), competitors };
  };

  const targetTeam = () => {
    const fc = firstConflict();
    return fc ? g()?.teams[fc.targetIndex] ?? null : null;
  };

  const competitors = () => firstConflict()?.competitors ?? [];

  const isCompetitor = () => {
    const idx = myIdx();
    return idx !== null && competitors().includes(idx);
  };

  const hasBid = () => {
    const idx = myIdx();
    return idx !== null && g()?.investmentBids[idx] !== undefined;
  };

  const highestBid = () => {
    const bids = g()?.investmentBids ?? {};
    let highest = 0;
    for (const comp of competitors()) {
      const bid = bids[comp];
      if (bid !== undefined && bid > highest) highest = bid;
    }
    return highest;
  };

  const highestBidder = () => {
    const bids = g()?.investmentBids ?? {};
    let highest = 0;
    let name = '';
    for (const comp of competitors()) {
      const bid = bids[comp];
      if (bid !== undefined && bid > highest) {
        highest = bid;
        name = g()?.teams[comp]?.name ?? '';
      }
    }
    return name;
  };

  const defaultBidValue = () =>
    Math.max(GAME.INVESTMENT_MIN, highestBid() + GAME.INVESTMENT_BID_INCREMENT);

  const [bidAmount, setBidAmount] = createSignal(defaultBidValue());

  const handleBid = () => {
    const amount = bidAmount();
    const minBid = Math.max(GAME.INVESTMENT_MIN, highestBid());
    if (!isNaN(amount) && amount >= minBid && amount <= GAME.INVESTMENT_MAX) {
      placeInvestmentBid(amount);
    }
  };

  return (
    <div class="investment-phase">
      <h2>Investment Conflict</h2>
      <p class="action-hint">Multiple teams want the same target! Bid to win the investment rights.</p>

      <Show when={targetTeam()}>
        <div class="conflict-target" style={`--team-color: ${targetTeam()!.color}`}>
          <div class="conflict-label">Bidding for investment in:</div>
          <div class="conflict-team-name">{targetTeam()!.name}</div>
          <div class="conflict-team-capital">{formatCurrency(targetTeam()!.capital)}</div>
        </div>
      </Show>

      <div class="conflict-competitors">
        <h3>Competitors</h3>
        <For each={competitors()}>
          {(comp) => {
            const team = () => g()?.teams[comp];
            const bid = () => g()?.investmentBids[comp];
            return (
              <Show when={team()}>
                <div class="competitor-row" style={`--team-color: ${team()!.color}`}>
                  <span class="team-dot" style={`background: ${team()!.color}`} />
                  <span class="competitor-name">{team()!.name}</span>
                  <span class="competitor-bid">
                    {bid() !== undefined ? `$${(bid()! / 1000).toFixed(0)}K` : 'Deciding...'}
                  </span>
                </div>
              </Show>
            );
          }}
        </For>
      </div>

      <Show when={highestBid() > 0}>
        <div class="bid-status">
          <div class="current-bid">
            <span>Highest Bid:</span>
            <strong>${(highestBid() / 1000).toFixed(0)}K</strong>
            <span>by {highestBidder()}</span>
          </div>
        </div>
      </Show>

      <Show when={isCompetitor() && !hasBid()}>
        <div class="investment-bid-controls">
          <div class="bid-input-wrap">
            <span class="prefix">$</span>
            <input
              type="number"
              value={bidAmount()}
              min={Math.max(GAME.INVESTMENT_MIN, highestBid())}
              max={GAME.INVESTMENT_MAX}
              step={GAME.INVESTMENT_BID_INCREMENT}
              onInput={(e) => setBidAmount(parseInt(e.currentTarget.value, 10) || defaultBidValue())}
            />
            <span class="suffix">capital</span>
          </div>
          <div class="bid-actions">
            <button class="btn btn-primary" onClick={handleBid}>Place Bid</button>
            <button class="btn btn-secondary" onClick={passInvestmentBid}>Drop Out</button>
          </div>
        </div>
      </Show>

      <Show when={isCompetitor() && hasBid()}>
        <div class="investment-waiting">
          <p>Bid submitted. Waiting for others...</p>
        </div>
      </Show>
    </div>
  );
}

function InvestmentTie() {
  const g = () => gameState.value;
  const myIdx = () => myTeamIndex();
  const tieTarget = () => g()?.investmentTieTarget ?? null;
  const targetTeam = () => {
    const tt = tieTarget();
    return tt !== null ? g()?.teams[tt] ?? null : null;
  };
  const isOwner = () => myIdx() === tieTarget();

  const competitors = () => {
    const tt = tieTarget();
    return tt !== null ? g()?.investmentConflicts[tt] ?? [] : [];
  };

  const tieAmount = () => {
    const bids = g()?.investmentBids ?? {};
    let highest = 0;
    for (const comp of competitors()) {
      const bid = bids[comp];
      if (bid !== undefined && bid > highest) highest = bid;
    }
    return highest;
  };

  const tiedTeams = () => {
    const bids = g()?.investmentBids ?? {};
    const amt = tieAmount();
    return competitors().filter((comp) => bids[comp] === amt);
  };

  const hint = () => {
    if (isOwner()) return 'You own the target company. Choose which investor to accept!';
    return 'Waiting for the target company owner to break the tie...';
  };

  return (
    <div class="investment-phase">
      <h2>Investment Tie</h2>
      <p class="action-hint">{hint()}</p>

      <Show when={targetTeam()}>
        <div class="conflict-target" style={`--team-color: ${targetTeam()!.color}`}>
          <div class="conflict-label">Tie for investment in:</div>
          <div class="conflict-team-name">{targetTeam()!.name}</div>
          <div class="tie-amount">Both bid ${(tieAmount() / 1000).toFixed(0)}K</div>
        </div>
      </Show>

      <Show when={isOwner()}>
        <div class="tie-resolution">
          <h3>Choose Your Investor</h3>
          <p>As the target company owner, you decide who gets to invest.</p>
          <div class="tie-options">
            <For each={tiedTeams()}>
              {(comp) => {
                const team = () => g()?.teams[comp];
                return (
                  <Show when={team()}>
                    <div
                      class="tie-option-card"
                      style={`--team-color: ${team()!.color}`}
                      onClick={() => resolveInvestmentTie(comp)}
                    >
                      <div class="tie-option-name">{team()!.name}</div>
                      <div class="tie-option-capital">{formatCurrency(team()!.capital)}</div>
                    </div>
                  </Show>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      <Show when={!isOwner()}>
        <div class="investment-waiting">
          <p>Waiting for {targetTeam()?.name}'s owner to break the tie...</p>
        </div>
      </Show>
    </div>
  );
}

function InvestmentSummary() {
  const g = () => gameState.value;

  const investments = () =>
    (g()?.teams ?? [])
      .map((team, i) => ({ team, index: i }))
      .filter(({ team }) => team.investedInTeamIndex !== null);

  return (
    <div class="investment-phase">
      <h2>Investment Summary</h2>
      <p class="action-hint">Review the investment results.</p>

      <Show when={investments().length > 0} fallback={
        <div class="no-investments">
          <p>No investments were made this round.</p>
        </div>
      }>
        <div class="investment-results">
          <For each={investments()}>
            {({ team }) => {
              const target = () =>
                team.investedInTeamIndex !== null
                  ? g()?.teams[team.investedInTeamIndex] ?? null
                  : null;
              return (
                <Show when={target()}>
                  <div class="investment-result-card">
                    <div class="investment-arrow">
                      <span class="investor-name" style={`color: ${team.color}`}>{team.name}</span>
                      <span class="arrow-icon">&rarr;</span>
                      <span class="target-name" style={`color: ${target()!.color}`}>{target()!.name}</span>
                    </div>
                    <div class="investment-detail">
                      ${(team.investmentAmount / 1000).toFixed(0)}K for 5% equity
                    </div>
                  </div>
                </Show>
              );
            }}
          </For>
        </div>
      </Show>

      <div class="summary-grid">
        <For each={g()?.teams ?? []}>
          {(team) => (
            <div class="team-summary" style={`--team-color: ${team.color}`}>
              <div class="team-header">{team.name}</div>
              <div class="sidebar-valuation">{formatCurrency(team.capital)}</div>
              <Show when={team.investedInTeamIndex !== null}>
                <div class="investment-badge investor">
                  Invested in {g()?.teams[team.investedInTeamIndex!]?.name}
                </div>
              </Show>
              <Show when={team.investorTeamIndex !== null}>
                <div class="investment-badge target">
                  Funded by {g()?.teams[team.investorTeamIndex!]?.name}
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
            Start Market Rounds
          </button>
        </div>
      </Show>
      <Show when={!spectatorMode() && !isHost()}>
        <p class="summary-note">Waiting for host to continue...</p>
      </Show>
    </div>
  );
}
