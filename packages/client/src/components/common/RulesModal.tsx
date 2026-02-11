// ===========================================
// Rules & About Modals
// ===========================================

import { createSignal } from 'solid-js';
import { gameState } from '../../state/client';

const RULES_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    content: `
      <h3>What is ESOP Wars?</h3>
      <p>5 teams compete to build the highest-valued startup. You'll draft your identity, hire employees by bidding equity (ESOP), survive market rounds, and draw your exit card.</p>
      <h3>How to Win</h3>
      <p><strong>Best Founder</strong> — Highest final capital after exit multiplier.</p>
      <p><strong>Best Employer</strong> — Highest ESOP% given to employees multiplied by capital.</p>
      <h3>Game Flow</h3>
      <p>Registration → Setup Drafting → Auction → Seed Round → Early Stage → Secondary Market → Mature Stage → Exit → Winner</p>
    `,
  },
  {
    id: 'setup',
    label: 'Setup',
    content: `
      <h3>Drafting (3 rounds)</h3>
      <p>Each team starts with 2 segment cards and 2 idea cards. On your turn: <strong>drop</strong> one card, then <strong>draw</strong> from either deck (or skip).</p>
      <h3>Lock Selection</h3>
      <p>After drafting, pick your final segment + idea combo. <strong>Matching pairs</strong> (e.g. a tech segment with a tech idea) unlock a category bonus multiplier during market rounds.</p>
    `,
  },
  {
    id: 'auction',
    label: 'Auction',
    content: `
      <h3>Bidding</h3>
      <p>Employee cards are revealed one at a time. Teams bid ESOP equity (starting at 12%) to hire them. Highest bid wins.</p>
      <h3>Limits</h3>
      <p>Each team hires up to <strong>3 employees</strong>. Teams with 0 employees are <strong>disqualified</strong>.</p>
      <h3>Employee Stats</h3>
      <p><strong>Hard Skill</strong> — Directly impacts capital each market round.</p>
      <p><strong>Soft Skills</strong> — Can be boosted or penalized by market card conditions.</p>
    `,
  },
  {
    id: 'investment',
    label: 'Invest',
    content: `
      <h3>How It Works</h3>
      <p>After the auction, each team can invest capital in another team for <strong>5% equity</strong>.</p>
      <h3>Declaration</h3>
      <p>All teams simultaneously choose a target or pass. If multiple teams target the same startup, a <strong>bidding war</strong> begins.</p>
      <h3>Bidding Wars</h3>
      <p>Competing investors bid between <strong>$500K\u2013$1M</strong> (in $50K increments). Highest bidder wins. Ties are broken by the target company's owner.</p>
      <h3>Returns</h3>
      <p>At the end of the game, your return multiple is: <strong>(5% \u00d7 target's final capital) / investment amount</strong>.</p>
    `,
  },
  {
    id: 'market',
    label: 'Market',
    content: `
      <h3>How It Works</h3>
      <p>A market card is drawn revealing conditions that affect different employee categories. Your employees' skills determine your capital change.</p>
      <h3>Market Leader</h3>
      <p>The <strong>top 2 gainers</strong> each round receive a bonus capital bump.</p>
      <h3>Wildcards</h3>
      <p>After seeing round results, each team can play their <strong>one-time</strong> wildcard:</p>
      <p><strong>Double Down</strong> — 2x your gains or losses this round.</p>
      <p><strong>Shield</strong> — Block any losses this round (gains still apply).</p>
      <p><strong>Pass</strong> — Save it for a future round.</p>
    `,
  },
  {
    id: 'secondary',
    label: 'Secondary',
    content: `
      <h3>Drop Phase</h3>
      <p>Each team must release one employee to the secondary pool.</p>
      <h3>Hire Phase</h3>
      <p>Released employees are auctioned off — same bidding rules as the main auction. Last chance to strengthen your team.</p>
    `,
  },
  {
    id: 'exit',
    label: 'Exit',
    content: `
      <h3>Drawing</h3>
      <p>Teams take turns drawing from a shuffled exit deck. Your card is <strong>random</strong> — no choosing.</p>
      <h3>Exit Cards</h3>
      <p><strong>IPO (2.0x)</strong> — Best outcome. Double your capital.</p>
      <p><strong>Acquisition (1.5x)</strong> — Strong exit. 50% boost.</p>
      <p><strong>Merger (1.0x)</strong> — Neutral. Keep your capital.</p>
      <p><strong>Downround (0.75x)</strong> — Rough exit. 25% loss.</p>
      <p><strong>Fire Sale (0.5x)</strong> — Worst outcome. Half your capital.</p>
    `,
  },
  {
    id: 'glossary',
    label: 'Glossary',
    content: `
      <p><strong>ESOP</strong> — Equity you give employees. You start with 12%.</p>
      <p><strong>Capital</strong> — A combination of your startup's cash and valuation. It grows from market performance, shrinks when you invest, and determines your final score. Highest at exit wins Best Founder.</p>
      <p><strong>Hard Skill</strong> — Technical ability. Directly affects capital growth.</p>
      <p><strong>Soft Skills</strong> — Interpersonal traits. Affected by market conditions.</p>
      <p><strong>Market Leader</strong> — Top 2 gainers each round get a capital bonus.</p>
      <p><strong>Setup Bonus</strong> — Matching segment + idea pairs unlock a category multiplier.</p>
      <p><strong>Wildcard</strong> — One-time ability: Double Down or Shield.</p>
      <p><strong>Exit Multiplier</strong> — Applied to your final capital. IPO (2x) best, Fire Sale (0.5x) worst.</p>
    `,
  },
];

function getPhaseRulesSection(): string {
  const g = gameState.value;
  if (!g) return 'overview';
  const phase = g.phase;
  if (phase === 'setup' || phase === 'setup-lock' || phase === 'setup-summary') return 'setup';
  if (phase === 'auction' || phase === 'auction-summary') return 'auction';
  if (phase === 'investment') return 'investment';
  if (phase === 'seed' || phase === 'early' || phase === 'mature') return 'market';
  if (phase === 'secondary-drop' || phase === 'secondary-hire') return 'secondary';
  if (phase === 'exit') return 'exit';
  return 'overview';
}

export function openRulesModal(section?: string): void {
  const modal = document.getElementById('rules-modal');
  if (!modal) return;

  const activeSection = section ?? getPhaseRulesSection();

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>How to Play</h2>
        <button class="modal-close" id="close-rules-btn">&times;</button>
      </div>
      <div class="rules-nav">
        ${RULES_SECTIONS.map((s) =>
          `<span class="rules-nav-item ${s.id === activeSection ? 'active' : ''}" data-section="${s.id}">${s.label}</span>`
        ).join('')}
      </div>
      <div class="modal-body">
        ${RULES_SECTIONS.map((s) =>
          `<div class="rules-section ${s.id === activeSection ? 'active' : ''}" data-section="${s.id}">${s.content}</div>`
        ).join('')}
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  document.getElementById('close-rules-btn')?.addEventListener('click', closeRulesModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeRulesModal();
  });

  modal.querySelectorAll('.rules-nav-item').forEach((tab) => {
    tab.addEventListener('click', () => {
      const sectionId = tab.getAttribute('data-section');
      if (!sectionId) return;
      modal.querySelectorAll('.rules-nav-item').forEach((t) => t.classList.remove('active'));
      modal.querySelectorAll('.rules-section').forEach((s) => s.classList.remove('active'));
      tab.classList.add('active');
      modal.querySelector(`.rules-section[data-section="${sectionId}"]`)?.classList.add('active');
    });
  });
}

export function openAboutModal(): void {
  const modal = document.getElementById('rules-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal about-modal">
      <div class="modal-header">
        <h2>About</h2>
        <button class="modal-close" id="close-rules-btn">&times;</button>
      </div>
      <div class="modal-body about-body">
        <div class="about-logo"><span class="logo-esop">ESOP</span> <span class="logo-wars">Wars</span></div>
        <div class="about-version">v2.0</div>
        <p class="about-desc">A multiplayer card game about building startups, hiring talent, and surviving the market. Compete with friends or watch bots battle it out.</p>
        <div class="about-credits">
          <div class="about-row">
            <span class="about-label">Idea Credit</span>
            <span class="about-value">Hissa Fund</span>
          </div>
          <div class="about-row">
            <span class="about-label">Design & Development</span>
            <span class="about-value">Pranav Bakre</span>
          </div>
          <div class="about-row">
            <span class="about-label">Built with</span>
            <span class="about-value">TypeScript, Cloudflare Workers, SolidJS</span>
          </div>
          <div class="about-row">
            <span class="about-label">Players</span>
            <span class="about-value">1\u20135 (bots fill empty slots)</span>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  document.getElementById('close-rules-btn')?.addEventListener('click', closeRulesModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeRulesModal();
  });
}

function closeRulesModal(): void {
  const modal = document.getElementById('rules-modal');
  if (modal) modal.style.display = 'none';
}
