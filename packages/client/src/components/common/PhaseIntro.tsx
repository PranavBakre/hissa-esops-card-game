// ===========================================
// Phase Intro Banner
// ===========================================

import { Show, onMount } from 'solid-js';
import type { Phase } from '@esop-wars/shared';
import { gameState, isDismissedPhase, hasSeenPhase, markPhaseSeen, dismissPhase } from '../../state/client';

const PHASE_INTRO_TEXT: Partial<Record<Phase, { icon: string; title: string; desc: string }>> = {
  registration: {
    icon: '\u{1F4DD}',
    title: 'Registration',
    desc: 'Name your startup to get started.',
  },
  setup: {
    icon: '\u{1F0CF}',
    title: 'Draft Your Cards',
    desc: "Draft segment and idea cards to define your startup's identity. Drop a card, then draw or skip.",
  },
  'setup-lock': {
    icon: '\u{1F512}',
    title: 'Lock Your Selection',
    desc: 'Pick your final segment + idea combo. Matching pairs unlock bonus multipliers!',
  },
  auction: {
    icon: '\u{1F4B0}',
    title: 'Auction',
    desc: 'Bid ESOP equity to hire employees. Higher skills = bigger market impact, but ESOP is limited.',
  },
  investment: {
    icon: '\u{1F4B0}',
    title: 'Investment Round',
    desc: 'Invest capital in other teams for 5% equity. If multiple teams target the same startup, a bidding war begins!',
  },
  seed: {
    icon: '\u{1F331}',
    title: 'Seed Round',
    desc: "Market conditions are revealed. Your employees' skills determine how your capital changes.",
  },
  early: {
    icon: '\u{1F4C8}',
    title: 'Early Stage',
    desc: "Market conditions are revealed. Your employees' skills determine how your capital changes.",
  },
  'secondary-drop': {
    icon: '\u{1F464}',
    title: 'Secondary Drop',
    desc: "Choose one employee to release. They'll enter the secondary market for all teams to bid on.",
  },
  'secondary-hire': {
    icon: '\u{1F91D}',
    title: 'Secondary Hire',
    desc: 'Bid on employees from the secondary pool. Last chance to strengthen your team.',
  },
  mature: {
    icon: '\u{1F3C6}',
    title: 'Mature Stage',
    desc: "Market conditions are revealed. Your employees' skills determine how your capital changes.",
  },
  exit: {
    icon: '\u{1F3B2}',
    title: 'Exit',
    desc: 'Draw your exit card! Your fate is sealed by luck \u2014 will you IPO or Fire Sale?',
  },
  winner: {
    icon: '\u{1F389}',
    title: 'Game Over!',
    desc: 'See who built the best startup.',
  },
};

export function PhaseIntro() {
  const phase = () => gameState.value?.phase ?? null;
  const intro = () => {
    const p = phase();
    return p ? PHASE_INTRO_TEXT[p] ?? null : null;
  };

  const shouldShow = () => {
    const p = phase();
    if (!p || !intro()) return false;
    return !isDismissedPhase(p);
  };

  onMount(() => {
    const p = phase();
    if (p && !hasSeenPhase(p)) {
      markPhaseSeen(p);
      setTimeout(() => {
        if (p) dismissPhase(p);
      }, 5000);
    }
  });

  return (
    <Show when={shouldShow()}>
      <div class="phase-intro" id="phase-intro-banner">
        <div class="phase-intro-icon">{intro()?.icon}</div>
        <div class="phase-intro-text">
          <h3>{intro()?.title}</h3>
          <p>{intro()?.desc}</p>
        </div>
        <button class="phase-intro-dismiss" onClick={() => {
          const p = phase();
          if (p) dismissPhase(p);
        }}>&times;</button>
      </div>
    </Show>
  );
}
