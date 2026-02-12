// ===========================================
// Winner Phase
// ===========================================

import { Show, For } from 'solid-js';
import { GAME } from '@esop-wars/shared';
import { gameState } from '../../../state/client';
import { leaveRoom } from '../../../state/websocket';
import { formatCurrency } from '../../../utils';

export function WinnerPhase() {
  const g = () => gameState.value;

  const sortedTeams = () =>
    [...(g()?.teams ?? [])]
      .filter((t) => !t.isDisqualified)
      .sort((a, b) => b.capital - a.capital);

  const founder = () => sortedTeams()[0] ?? null;

  const employer = () => {
    const teams = sortedTeams();
    if (teams.length === 0) return null;
    return teams.reduce((best, team) => {
      const teamEsop = team.employees.reduce((sum, e) => sum + e.bidAmount, 0);
      const bestEsop = best.employees.reduce((sum, e) => sum + e.bidAmount, 0);
      const teamScore = (teamEsop / GAME.INITIAL_ESOP) * team.capital;
      const bestScore = (bestEsop / GAME.INITIAL_ESOP) * best.capital;
      return teamScore > bestScore ? team : best;
    });
  };

  const employerEsop = () =>
    employer()?.employees.reduce((sum, e) => sum + e.bidAmount, 0) ?? 0;

  const employerScore = () =>
    (employerEsop() / GAME.INITIAL_ESOP) * (employer()?.capital ?? 0);

  const bestInvestor = () => {
    const gs = g();
    if (!gs) return null;

    const investors = gs.teams.filter(
      (t) => !t.isDisqualified && t.investedInTeamIndex !== null && t.investmentAmount > 0
    );
    if (investors.length === 0) return null;

    const best = investors.reduce((bestT, team) => {
      const targetCapital =
        team.investedInTeamIndex !== null
          ? gs.teams[team.investedInTeamIndex]?.capital ?? 0
          : 0;
      const returnMult = (GAME.INVESTOR_EQUITY * targetCapital) / team.investmentAmount;

      const bestTargetCapital =
        bestT.investedInTeamIndex !== null
          ? gs.teams[bestT.investedInTeamIndex]?.capital ?? 0
          : 0;
      const bestReturnMult = (GAME.INVESTOR_EQUITY * bestTargetCapital) / bestT.investmentAmount;

      return returnMult > bestReturnMult ? team : bestT;
    });

    const bestTargetCapital =
      best.investedInTeamIndex !== null
        ? gs.teams[best.investedInTeamIndex]?.capital ?? 0
        : 0;
    const bestReturn = (GAME.INVESTOR_EQUITY * bestTargetCapital) / best.investmentAmount;
    const targetName =
      best.investedInTeamIndex !== null
        ? gs.teams[best.investedInTeamIndex]?.name ?? '?'
        : '?';

    return { team: best, returnMultiple: bestReturn, targetName };
  };

  return (
    <div class="winner-phase">
      <div class="winner-layout">
        <div class="winner-title">Game Over!</div>

        <div class="winner-cards">
          <Show when={founder()}>
            {(f) => (
              <div class="winner-card founder">
                <div class="winner-card-label">Best Founder</div>
                <div class="winner-card-team" style={`color: ${f().color}`}>
                  {f().name}
                </div>
                <div class="winner-card-stat">{formatCurrency(f().capital)}</div>
                <div class="winner-card-desc">Highest final capital</div>
              </div>
            )}
          </Show>

          <Show when={employer()}>
            {(e) => (
              <div class="winner-card employer">
                <div class="winner-card-label">Best Employer</div>
                <div class="winner-card-team" style={`color: ${e().color}`}>
                  {e().name}
                </div>
                <div class="winner-card-stat">{formatCurrency(employerScore())}</div>
                <div class="winner-card-desc">
                  {employerEsop()} ESOP given, {formatCurrency(e().capital)} capital
                </div>
              </div>
            )}
          </Show>

          <Show when={bestInvestor()}>
            {(inv) => (
              <div class="winner-card investor">
                <div class="winner-card-label">Best Investor</div>
                <div class="winner-card-team" style={`color: ${inv().team.color}`}>
                  {inv().team.name}
                </div>
                <div class="winner-card-stat">{inv().returnMultiple.toFixed(2)}x return</div>
                <div class="winner-card-desc">
                  ${(inv().team.investmentAmount / 1000).toFixed(0)}K invested in{' '}
                  {inv().targetName}
                </div>
              </div>
            )}
          </Show>
        </div>

        <div class="standings">
          <div class="standings-title">Final Standings</div>
          <For each={sortedTeams()}>
            {(team, index) => (
              <div class="standing-row">
                <span class="standing-rank">#{index() + 1}</span>
                <span class="standing-dot" style={`background: ${team.color}`} />
                <span class="standing-name">{team.name}</span>
                <span class="standing-val">{formatCurrency(team.capital)}</span>
              </div>
            )}
          </For>
        </div>

        <button class="btn btn-primary btn-lg" onClick={leaveRoom}>
          Play Again
        </button>
      </div>
    </div>
  );
}
