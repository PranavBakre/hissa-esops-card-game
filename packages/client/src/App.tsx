// ===========================================
// ESOP Wars v4 - Root App Component
// ===========================================

import { Switch, Match, onMount } from 'solid-js';
import { view } from './state/client';
import { init } from './state/websocket';
import { HomeScreen } from './components/home/HomeScreen';
import { LobbyScreen } from './components/lobby/LobbyScreen';
import { GameScreen } from './components/game/GameScreen';

export function App() {
  onMount(() => {
    init();
  });

  return (
    <Switch>
      <Match when={view() === 'home'}>
        <HomeScreen />
      </Match>
      <Match when={view() === 'lobby'}>
        <LobbyScreen />
      </Match>
      <Match when={view() === 'game'}>
        <GameScreen />
      </Match>
    </Switch>
  );
}
