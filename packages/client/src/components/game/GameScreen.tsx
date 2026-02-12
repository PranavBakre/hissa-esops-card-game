// ===========================================
// Game Screen (Container)
// ===========================================

import { Show, Switch, Match } from 'solid-js';
import { gameState } from '../../state/client';
import { GameHeader } from './GameHeader';
import { TeamsSidebar, MobileTeamStrip } from './TeamsSidebar';
import { DecisionLog } from './DecisionLog';
import { PhaseIntro } from '../common/PhaseIntro';
import { RegistrationPhase } from './phases/RegistrationPhase';
import { SetupDraftPhase, SetupLockPhase, SetupSummary } from './phases/SetupPhase';
import { AuctionPhase, AuctionSummary } from './phases/AuctionPhase';
import { InvestmentPhase } from './phases/InvestmentPhase';
import { MarketPhase } from './phases/MarketPhase';
import { SecondaryDropPhase, SecondaryHirePhase } from './phases/SecondaryPhase';
import { ExitPhase } from './phases/ExitPhase';
import { WinnerPhase } from './phases/WinnerPhase';

export function GameScreen() {
  const phase = () => gameState.value?.phase ?? null;

  return (
    <Show when={gameState.value}>
      <div class="game-screen">
        <GameHeader />
        <MobileTeamStrip />
        <div class="game-layout">
          <TeamsSidebar />
          <div class="game-main">
            <PhaseIntro />
            <Switch fallback={<p>Unknown phase</p>}>
              <Match when={phase() === 'registration'}>
                <RegistrationPhase />
              </Match>
              <Match when={phase() === 'setup'}>
                <SetupDraftPhase />
              </Match>
              <Match when={phase() === 'setup-lock'}>
                <SetupLockPhase />
              </Match>
              <Match when={phase() === 'setup-summary'}>
                <SetupSummary />
              </Match>
              <Match when={phase() === 'auction'}>
                <AuctionPhase />
              </Match>
              <Match when={phase() === 'auction-summary'}>
                <AuctionSummary />
              </Match>
              <Match when={phase() === 'investment'}>
                <InvestmentPhase />
              </Match>
              <Match when={phase() === 'seed' || phase() === 'early' || phase() === 'mature'}>
                <MarketPhase />
              </Match>
              <Match when={phase() === 'secondary-drop'}>
                <SecondaryDropPhase />
              </Match>
              <Match when={phase() === 'secondary-hire'}>
                <SecondaryHirePhase />
              </Match>
              <Match when={phase() === 'exit'}>
                <ExitPhase />
              </Match>
              <Match when={phase() === 'winner'}>
                <WinnerPhase />
              </Match>
            </Switch>
          </div>
        </div>
        <DecisionLog />
      </div>
    </Show>
  );
}
