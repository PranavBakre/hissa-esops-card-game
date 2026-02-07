# ESOP Wars v2 - UI Facelift & Player Guidance

Feature doc for improving the game's visual design, adding in-game guidance, and creating a standalone rulebook.

---

## Problem

The current UI is functional but has gaps that hurt new-player experience:

1. **No onboarding** - Players are dropped into phases with no explanation of what to do or why
2. **Flat visual hierarchy** - Cards, stats, and actions all feel the same weight; hard to scan
3. **No contextual help** - Players must already know the rules to play effectively
4. **No rulebook** - No way to look up rules mid-game or learn before playing
5. **Weak phase transitions** - Phase changes are instant re-renders with no visual continuity
6. **Mobile experience** - Sidebar hides on mobile, losing critical team info
7. **Useless phase breadcrumbs** - The phase bar shows a non-interactive breadcrumb trail of all phases. These aren't clickable, the phase names are meaningless to new players, and they waste header space

---

## Goals

- A first-time player can play through a full game without external help
- Each phase clearly communicates: what's happening, what you need to do, and why it matters
- A standalone rulebook page serves as quick reference before/during a game
- The visual refresh makes the game feel polished and engaging

---

## Design System

Light theme using Inter font with indigo primary accent.

### Color Tokens

```css
/* Backgrounds */
--bg-base: #F8F9FC;
--bg-surface: #FFFFFF;
--bg-surface-raised: #F1F3F9;
--bg-surface-sunken: #EBEEF5;

/* Text */
--text-primary: #1A1D2E;
--text-secondary: #5A5F7A;
--text-muted: #8B90A8;

/* Borders */
--border-subtle: #E4E7F0;
--border-default: #D1D5E4;
--border-strong: #B8BDD4;

/* Primary accent (indigo) */
--accent-primary: #635BFF;
--accent-primary-hover: #524AE8;
--accent-primary-subtle: #EDEDFF;
--accent-primary-glow: rgba(99, 91, 255, 0.15);

/* Semantic colors */
--green: #10B981;   --green-text: #057A55;   --green-bg: #ECFDF5;   --green-border: #A7F3D0;
--red: #EF4444;     --red-text: #B91C1C;     --red-bg: #FEF2F2;     --red-border: #FECACA;
--amber: #F59E0B;   --amber-text: #B45309;   --amber-bg: #FFFBEB;   --amber-border: #FDE68A;
--blue: #3B82F6;    --blue-text: #1D4ED8;    --blue-bg: #EFF6FF;    --blue-border: #BFDBFE;
--purple: #8B5CF6;  --purple-text: #6D28D9;  --purple-bg: #F5F3FF;  --purple-border: #DDD6FE;

/* Employee category colors */
--cat-engineering: #0EA5E9;  --cat-engineering-bg: #F0F9FF;
--cat-product: #8B5CF6;      --cat-product-bg: #F5F3FF;
--cat-sales: #10B981;        --cat-sales-bg: #ECFDF5;
--cat-ops: #F59E0B;          --cat-ops-bg: #FFFBEB;
--cat-finance: #EF4444;      --cat-finance-bg: #FEF2F2;

/* Team colors */
--team-alpha: #FF6B6B;
--team-beta: #2DD4BF;
--team-gamma: #38BDF8;
--team-delta: #A3E635;
--team-omega: #FBBF24;
```

### Spacing & Radii

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;

--shadow-sm: 0 1px 2px rgba(26, 29, 46, 0.05);
--shadow-md: 0 4px 16px rgba(26, 29, 46, 0.08);
--shadow-lg: 0 8px 32px rgba(26, 29, 46, 0.12);
--shadow-card: 0 1px 3px rgba(26, 29, 46, 0.05), 0 0 0 1px rgba(26, 29, 46, 0.03);
--shadow-glow: 0 0 20px var(--accent-primary-glow);
```

### Typography

- Font: Inter (400, 500, 600, 700, 800, 900)
- Weight hierarchy: 900 for hero numbers, 800 for headings/labels, 700 for names, 600 for values, 500 for body emphasis, 400 for body
- Label pattern: 11px, 800 weight, uppercase, 1-2px letter-spacing, muted color

---

## Feature 1: In-Game Guidance System

### 1a. Phase Intro Banners [DONE]

When a new phase begins, show a brief banner (auto-dismisses after 5s, or click to dismiss) explaining the phase.

| Phase | Banner Text |
|-------|------------|
| Registration | "Name your startup and describe the problem you're solving" |
| Setup | "Draft segment and idea cards to define your startup's identity. Drop a card, then draw or skip." |
| Setup Lock | "Pick your final segment + idea combo. Matching pairs unlock bonus multipliers!" |
| Auction | "Bid ESOP equity to hire employees. Higher skills = bigger market impact, but ESOP is limited." |
| Seed / Early / Mature | "Market conditions are revealed. Your employees' skills determine how your valuation changes." |
| Secondary Drop | "Choose one employee to release. They'll enter the secondary market for all teams to bid on." |
| Secondary Hire | "Bid on employees from the secondary pool. Last chance to strengthen your team." |
| Exit | "Draw your exit card! Your fate is sealed by luck - will you IPO or Fire Sale?" |
| Winner | "Game over! See who built the best startup." |

**Implementation**: `renderPhaseIntro()` in `renderer.ts` returns a dismissible banner. Tracks `seenPhases` and `dismissedPhases` sets at module level. Auto-dismisses after 5s via `setTimeout`.

### 1b. Contextual Tooltips

Add `[?]` icons next to key terms that show tooltip on hover/tap:

| Term | Tooltip |
|------|---------|
| ESOP | "Equity you give employees. Spend wisely - you only have 12%." |
| Hard Skill | "Technical ability. Directly affects valuation growth each market round." |
| Soft Skills | "Interpersonal traits. Can be penalized or boosted by market conditions." |
| Valuation | "Your startup's current worth. Highest valuation at exit wins Best Founder." |
| Market Leader | "Top 2 gainers each round get a valuation bonus." |
| Setup Bonus | "Matching segment + idea pairs unlock a category multiplier." |
| Wildcard | "One-time ability: Double Down or Shield. Once used, it's gone." |
| Exit Multiplier | "Applied to your final valuation. IPO (2x) is best, Fire Sale (0.5x) is worst." |

**Implementation**: A `tooltip(term, text)` helper returns an inline `<span class="tooltip-trigger">` with a `<span class="tooltip-content">` positioned via CSS. CSS for tooltips is already in `style.css`.

### 1c. Action Hints [DONE]

Replace generic phase descriptions with specific, actionable guidance based on game state:

| Situation | Hint |
|-----------|------|
| Auction, no bids yet | "Be the first to bid! Starting bid is 1% ESOP." |
| Auction, someone bid | "Outbid {team} or pass. You have {esop}% remaining." |
| Setup, your turn to drop | "Drop a card you don't want. You'll draw a replacement next." |
| Setup, your turn to draw | "Draw from Segment or Idea deck, or skip to keep your hand." |
| Wildcard, not yet used | "This is your one-time wildcard. Use it when the stakes are highest." |
| Wildcard, already used | "You've used your wildcard. Click Pass to continue." |
| Exit, waiting to draw | "Click to draw your exit card. Good luck!" |
| Exit, card drawn | "You drew {exitCard}! {multiplier}x multiplier applied to your valuation." |

**Implementation**: Per-phase hint functions (`getAuctionHint()`, `getMarketHint()`, etc.) in `renderer.ts` return context-aware strings using `.action-hint` class.

---

## Feature 2: Visual Refresh

### 2a. Card Redesign [DONE]

**Employee Cards** (Auction & Secondary Hire):
- Category badge pill (`.emp-category-badge.{category}`) with category color
- Hard skill as a progress bar (`.skill-bar-track` / `.skill-bar-fill.hard`)
- Soft skills as small pills below (`.soft-pill`)
- Card has colored top border via `::before` pseudo-element

**Market Cards**:
- Revealed in a `.market-card-reveal` card with gradient top border
- Label ("MARKET CARD"), name, description prominently displayed
- Category modifiers as color-coded pills (`.modifier-pill.positive` / `.modifier-pill.negative`)

**Exit Cards**:
- Face-down deck shown as `.exit-card-back` (purple gradient, dashed inner border, hover scale)
- Click to draw (card-back is the button)
- Revealed card as `.exit-card-revealed` (color-coded border: green/amber/red by multiplier)
- All teams' draws shown as `.exit-team-draw` horizontal strip

### 2b. Replace Phase Breadcrumbs with Minimal Header [DONE]

Replaced the breadcrumb trail with a compact `.game-header`:

```
[← Exit]  ROOM_CODE  |  Phase Label (+ detail)  |  [Speed Controls]  [? Rules]
```

- **Left**: Exit button + room code
- **Center**: Phase label + contextual detail (e.g. "Card 4 of 15", "Round 2/3")
- **Right**: Speed controls (spectator only) + rules button

### 2c. Phase Transition Animations

- **Fade/slide** between phases instead of hard re-render
- **Card flip** animation when market/exit cards are revealed (`.cardReveal` keyframe exists)
- **Counting animation** on valuation changes (number ticks up/down)
- **Confetti/celebration** on winner phase

**Implementation**: Use CSS transitions and `requestAnimationFrame` for number counters. Add a `transitionPhase(oldPhase, newPhase)` wrapper around `render()` that applies exit/enter CSS classes.

### 2d. Improved Team Sidebar [DONE]

- Category-colored employee dots (`.emp-dot`)
- Wildcard status icon (available/used) (`.sidebar-wildcard`)
- "You" / "Bot" badges (`.badge-you` / `.badge-bot`)
- Valuation, ESOP remaining, hire count
- Mobile: horizontal scrollable team strip (`.mobile-team-strip` with `.mobile-team-chip`)

### 2e. Better Auction UX

- Bid timer bar (visual countdown)
- Bid history log showing who bid what (last 5 bids)
- Flash animation when a new bid comes in
- "Going once... going twice..." text progression near timeout
- Clear indication of who won each card

### 2f. Color & Typography Refinements [DONE]

- Light theme with Inter font, indigo primary (#635BFF)
- Semantic color system (green/red/amber/blue/purple with text/bg/border variants)
- Category colors for employee types
- Team colors for player identification
- Font weight hierarchy (900 for hero, 800 for headings, 700 for names, etc.)
- Card shadows, hover lifts, border radius system

---

## Feature 3: Standalone Rulebook Page

A `/rules` route (separate HTML page or client-side route) with the full game rules.

### Structure

```
1. Overview
   - What is ESOP Wars?
   - How to win (Best Founder + Best Employer)
   - Game flow diagram (visual phase timeline)

2. Setup Phase
   - Segment & Idea cards explained
   - Drafting rules (drop then draw, 3 rounds)
   - Setup bonuses (matching combos table)

3. Auction Phase
   - How bidding works (ESOP as currency)
   - 3 employees per team limit
   - Disqualification rule (0 employees)

4. Market Rounds
   - How valuation changes (skill formula simplified)
   - Market card effects
   - Category perks table
   - Market Leader bonus

5. Wildcards
   - Double Down vs Shield
   - One-time use, timing strategy

6. Secondary Market
   - Drop phase rules
   - Re-hiring auction

7. Exit
   - Exit cards are drawn (luck-based), not chosen
   - Possible exit cards and their multipliers
   - Final valuation calculation

8. Glossary
   - All key terms with definitions
```

### Design

- Sticky sidebar navigation (jump to section)
- Collapsible sections for detailed rules
- Visual examples (screenshots or illustrated card examples)
- "Back to game" button if accessed from in-game
- Link from home screen: "How to Play" button
- Link from game header: `[?]` icon opens rulebook anchored to the current phase

**Implementation**:
- New file: `packages/client/src/rules.ts` for rulebook content/rendering
- Add route handling in `main.ts` (hash-based: `#/rules`, `#/rules#auction`, etc.)
- Add "How to Play" link on home screen and `[?]` in phase bar

---

## Feature 4: Mobile Improvements

### 4a. Mobile Team Strip [DONE]

Replace the hidden sidebar with a horizontal scrollable team strip at the top of the game area on mobile (≤ 600px). Shows: team color border, name, valuation, and "You" badge. Hidden on desktop, shown at ≤ 600px.

### 4b. Bottom Action Bar

On mobile, move primary actions (bid buttons, draw buttons, lock button) to a fixed bottom bar for thumb-friendly access. Fixed to bottom of viewport with shadow to separate from content. Main content area gets extra bottom padding to prevent overlap.

### 4c. Swipeable Cards

In setup and exit phases, allow swiping through cards horizontally instead of grid layout. Needs JS touch handling.

---

## Implementation Status

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | Replace phase breadcrumbs with minimal header (2b) | Done |
| P0 | Phase intro banners (1a) | Done |
| P0 | Action hints (1c) | Done |
| P0 | Rulebook page (3) | Not started |
| P1 | Contextual tooltips (1b) | Not started |
| P1 | Card redesign (2a) | Done |
| P1 | Improved team sidebar (2d) | Done |
| P1 | Rulebook link from header (3) | Not started |
| P1 | Mobile team strip (4a) | Done |
| P1 | Bottom action bar (4b) | Not started |
| P2 | Phase transition animations (2c) | Partial (card reveal keyframe exists) |
| P2 | Better auction UX (2e) | Not started |
| P2 | Color & typography (2f) | Done |
| P3 | Swipeable cards (4c) | Not started |

---

## Non-Goals

- No framework migration (stays vanilla DOM)
- No sound effects (future consideration)
- No player avatars/profiles
- No chat/emotes system
- No redesign of the game mechanics themselves (exit draw mechanic is a separate feature: `v2-exit-draw.md`)
