# ESOP Wars — Iteration 3 Plan

**Goal:** Add Stage 1 (Rummy-style drafting) + Segment/Idea bonuses

---

## Feature Overview

Before the auction phase, teams participate in a **Company Setup** stage where they draft cards to define:
1. **Market Segment** — B2B SaaS, D2C, Fintech, Healthtech, etc.
2. **Product/Service Idea** — What they're building

Certain combinations give bonuses to specific employee categories during the game.

---

## New Game Flow

```
Registration → Company Setup (NEW) → Auction → Market Rounds → Exit → Winner
                   ↓
         Rummy-style drafting
         Lock: 1 Segment + 1 Idea
```

---

## Feature 1: Company Setup Cards

### Data Additions (`data.js`)

```javascript
// Market Segment Cards (6 total, 1 per team + 1 extra in deck)
const segmentCards = [
  {
    id: 1,
    name: "B2B SaaS",
    description: "Enterprise software solutions for businesses",
    icon: "🏢"
  },
  {
    id: 2,
    name: "D2C Consumer",
    description: "Direct-to-consumer products and brands",
    icon: "🛒"
  },
  {
    id: 3,
    name: "Fintech",
    description: "Financial technology and payments",
    icon: "💳"
  },
  {
    id: 4,
    name: "Healthtech",
    description: "Healthcare technology and wellness",
    icon: "🏥"
  },
  {
    id: 5,
    name: "Edtech",
    description: "Education technology and learning platforms",
    icon: "📚"
  },
  {
    id: 6,
    name: "Logistics",
    description: "Supply chain and delivery solutions",
    icon: "🚚"
  }
];

// Product Cards (8 total)
const productCards = [
  {
    id: 1,
    type: "product",
    name: "Analytics Platform",
    description: "Data insights and business intelligence",
    icon: "📊"
  },
  {
    id: 2,
    type: "product",
    name: "Payment Gateway",
    description: "Transaction processing infrastructure",
    icon: "💰"
  },
  {
    id: 3,
    type: "product",
    name: "HR Tool",
    description: "People management and hiring",
    icon: "👥"
  },
  {
    id: 4,
    type: "product",
    name: "CRM System",
    description: "Customer relationship management",
    icon: "📇"
  },
  {
    id: 5,
    type: "product",
    name: "Security Suite",
    description: "Cybersecurity and compliance",
    icon: "🔒"
  },
  {
    id: 6,
    type: "product",
    name: "AI Assistant",
    description: "Intelligent automation and chatbots",
    icon: "🤖"
  },
  {
    id: 7,
    type: "product",
    name: "Marketplace",
    description: "Multi-sided platform connecting buyers/sellers",
    icon: "🏪"
  },
  {
    id: 8,
    type: "product",
    name: "Mobile App",
    description: "Consumer-facing mobile application",
    icon: "📱"
  }
];

// Service Cards (8 total)
const serviceCards = [
  {
    id: 1,
    type: "service",
    name: "Delivery Service",
    description: "Last-mile logistics and fulfillment",
    icon: "📦"
  },
  {
    id: 2,
    type: "service",
    name: "Consulting",
    description: "Expert advisory and implementation",
    icon: "💼"
  },
  {
    id: 3,
    type: "service",
    name: "Managed Services",
    description: "Outsourced operations and support",
    icon: "🛠️"
  },
  {
    id: 4,
    type: "service",
    name: "Training Platform",
    description: "Skill development and certification",
    icon: "🎓"
  },
  {
    id: 5,
    type: "service",
    name: "Staffing Agency",
    description: "Talent acquisition and placement",
    icon: "🤝"
  },
  {
    id: 6,
    type: "service",
    name: "Content Creation",
    description: "Media production and marketing",
    icon: "🎬"
  },
  {
    id: 7,
    type: "service",
    name: "Subscription Box",
    description: "Curated recurring deliveries",
    icon: "📬"
  },
  {
    id: 8,
    type: "service",
    name: "On-Demand Service",
    description: "Gig economy platform",
    icon: "⚡"
  }
];

// Segment + Idea Bonus Combinations
const setupBonuses = [
  {
    segment: "B2B SaaS",
    idea: "Analytics Platform",
    bonus: { category: "Engineering", modifier: 0.1 },
    description: "Tech-driven B2B needs strong engineering"
  },
  {
    segment: "B2B SaaS",
    idea: "CRM System",
    bonus: { category: "Sales", modifier: 0.15 },
    description: "CRM expertise boosts sales effectiveness"
  },
  {
    segment: "D2C Consumer",
    idea: "Mobile App",
    bonus: { category: "Product", modifier: 0.15 },
    description: "Consumer apps need product excellence"
  },
  {
    segment: "D2C Consumer",
    idea: "Subscription Box",
    bonus: { category: "Ops", modifier: 0.15 },
    description: "Subscription logistics drive efficiency"
  },
  {
    segment: "Fintech",
    idea: "Payment Gateway",
    bonus: { category: "Finance", modifier: 0.2 },
    description: "Payments expertise is critical"
  },
  {
    segment: "Fintech",
    idea: "Security Suite",
    bonus: { category: "Engineering", modifier: 0.15 },
    description: "Security needs top engineers"
  },
  {
    segment: "Healthtech",
    idea: "AI Assistant",
    bonus: { category: "Engineering", modifier: 0.15 },
    description: "Health AI needs technical depth"
  },
  {
    segment: "Healthtech",
    idea: "Managed Services",
    bonus: { category: "Ops", modifier: 0.1 },
    description: "Healthcare ops matter for compliance"
  },
  {
    segment: "Edtech",
    idea: "Training Platform",
    bonus: { category: "Product", modifier: 0.15 },
    description: "Learning experience drives engagement"
  },
  {
    segment: "Edtech",
    idea: "Content Creation",
    bonus: { category: "Product", modifier: 0.1 },
    description: "Content quality defines edtech"
  },
  {
    segment: "Logistics",
    idea: "Delivery Service",
    bonus: { category: "Ops", modifier: 0.2 },
    description: "Delivery excellence is everything"
  },
  {
    segment: "Logistics",
    idea: "On-Demand Service",
    bonus: { category: "Sales", modifier: 0.1 },
    description: "On-demand needs customer acquisition"
  }
];

// Helper to find bonus for a combo
function getSetupBonus(segmentName, ideaName) {
  return setupBonuses.find(
    b => b.segment === segmentName && b.idea === ideaName
  ) || null;
}
```

---

## Feature 2: Drafting Mechanics

### State Changes (`game.js`)

```javascript
// Add to gameState
{
  ...existingState,

  // Company Setup Phase
  phase: 'setup', // add 'setup' as new phase option
  setupRound: 0,  // 0-2 (3 rounds of drafting)

  // Card decks for setup
  segmentDeck: [],    // Available segment cards to draw from
  ideaDeck: [],       // Combined product + service cards to draw from

  // Drafting state
  setupDraftTurn: 0,  // Which team's turn to draft (0-4)
  setupPhase: 'drop', // 'drop' | 'draw'

  // Discarded cards go back to deck
  setupDiscard: []
}

// Add to team object
{
  ...existingFields,

  // Setup cards
  setupHand: [],        // Current hand of cards (starts with 5)
  lockedSegment: null,  // Final chosen segment
  lockedIdea: null,     // Final chosen idea (product or service)
  setupBonus: null      // Bonus from segment+idea combo
}
```

### Game Flow Logic

```javascript
// Initialize company setup phase
function initSetupPhase() {
  // Shuffle decks
  const segments = shuffleArray([...segmentCards]);
  const products = shuffleArray([...productCards]);
  const services = shuffleArray([...serviceCards]);
  const ideas = shuffleArray([...products, ...services]);

  gameState.segmentDeck = segments.slice(5);  // Reserve extras
  gameState.ideaDeck = ideas.slice(10);       // Reserve extras

  // Deal initial hands to each team
  // Each team gets: 1 segment, 2 products, 2 services
  gameState.teams.forEach((team, idx) => {
    team.setupHand = [
      segments[idx],
      ideas[idx * 2],
      ideas[idx * 2 + 1],
      ideas[10 + idx * 2],     // More from shuffled deck
      ideas[10 + idx * 2 + 1]
    ].filter(Boolean);  // Filter out undefined if deck too small
  });

  gameState.setupRound = 0;
  gameState.setupDraftTurn = 0;
  gameState.setupPhase = 'drop';
  gameState.phase = 'setup';

  saveState();
  render();
}

// Team drops a card during setup
function dropSetupCard(teamIndex, cardId, cardType) {
  const team = gameState.teams[teamIndex];
  const cardIndex = team.setupHand.findIndex(
    c => c.id === cardId && (c.type === cardType || (cardType === 'segment' && !c.type))
  );

  if (cardIndex === -1) return;

  const [dropped] = team.setupHand.splice(cardIndex, 1);

  // Add to discard (will be shuffled back)
  gameState.setupDiscard.push(dropped);

  // Move to draw phase for this team
  gameState.setupPhase = 'draw';
  saveState();
  render();
}

// Team draws a card during setup
function drawSetupCard(teamIndex, fromDeck) {
  const team = gameState.teams[teamIndex];
  let card = null;

  if (fromDeck === 'segment' && gameState.segmentDeck.length > 0) {
    card = gameState.segmentDeck.pop();
  } else if (fromDeck === 'idea' && gameState.ideaDeck.length > 0) {
    card = gameState.ideaDeck.pop();
  }

  if (card) {
    team.setupHand.push(card);
  }

  // Move to next team or next round
  gameState.setupDraftTurn++;

  if (gameState.setupDraftTurn >= 5) {
    // All teams have drafted this round
    gameState.setupRound++;
    gameState.setupDraftTurn = 0;

    // Shuffle discard back into decks
    const discardSegments = gameState.setupDiscard.filter(c => !c.type);
    const discardIdeas = gameState.setupDiscard.filter(c => c.type);

    gameState.segmentDeck = shuffleArray([...gameState.segmentDeck, ...discardSegments]);
    gameState.ideaDeck = shuffleArray([...gameState.ideaDeck, ...discardIdeas]);
    gameState.setupDiscard = [];
  }

  gameState.setupPhase = 'drop';

  // Check if setup complete (3 rounds done)
  if (gameState.setupRound >= 3) {
    startLockingPhase();
  } else {
    saveState();
    render();
  }
}

// Start the locking phase where teams choose final cards
function startLockingPhase() {
  gameState.phase = 'setup-lock';
  saveState();
  render();
}

// Team locks their segment and idea
function lockSetupCards(teamIndex, segmentId, ideaId) {
  const team = gameState.teams[teamIndex];

  const segment = team.setupHand.find(c => c.id === segmentId && !c.type);
  const idea = team.setupHand.find(c => c.id === ideaId && c.type);

  if (!segment || !idea) {
    showToast('Must select 1 segment and 1 idea!', 'error');
    return;
  }

  team.lockedSegment = segment;
  team.lockedIdea = idea;
  team.setupBonus = getSetupBonus(segment.name, idea.name);

  saveState();
  render();

  // Check if all teams locked
  const allLocked = gameState.teams.every(t => t.lockedSegment && t.lockedIdea);
  if (allLocked) {
    showSetupSummary();
  }
}

// Show setup summary and proceed to auction
function showSetupSummary() {
  gameState.phase = 'setup-summary';
  saveState();
  render();
}

// Proceed from setup to auction
function startAuctionFromSetup() {
  gameState.phase = 'auction';
  saveState();
  render();
}
```

---

## Feature 3: Applying Bonuses

### Modified Valuation Logic

```javascript
// Modify applyMarketCard to include setup bonuses
function applyMarketCard(card) {
  gameState.teams.forEach((team, teamIndex) => {
    if (team.isDisqualified) return;

    let skillTotal = 0;

    team.employees.forEach(emp => {
      // Base hard skill modifier from market card
      let hardMod = card.hardSkillModifiers[emp.category] || 0;

      // Add setup bonus if category matches
      if (team.setupBonus && team.setupBonus.category === emp.category) {
        hardMod += team.setupBonus.modifier;
      }

      const adjustedHard = Math.min(1, Math.max(0, emp.hardSkill + hardMod));

      let softTotal = 0;
      Object.entries(emp.softSkills).forEach(([skill, value]) => {
        const softMod = card.softSkillModifiers[skill] || 0;
        softTotal += Math.min(1, Math.max(0, value + softMod));
      });

      skillTotal += adjustedHard + softTotal;
    });

    // ... rest of valuation calculation (including wildcard effects from Iteration 2)
  });
}
```

---

## UI Components

### 1. Setup Phase Screen (Drafting)

```
┌─────────────────────────────────────────────────────────────────┐
│  🎴 COMPANY SETUP - Round 2 of 3                                │
│                                                                 │
│  Alpha's Turn: Drop 1 card, then draw 1 card                    │
│                                                                 │
│  YOUR HAND:                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ 🏢      │ │ 📊      │ │ 💰      │ │ 📦      │ │ 🎓      │   │
│  │ B2B     │ │Analytics│ │Payment  │ │Delivery │ │Training │   │
│  │ SaaS    │ │Platform │ │Gateway  │ │Service  │ │Platform │   │
│  │         │ │ PRODUCT │ │ PRODUCT │ │ SERVICE │ │ SERVICE │   │
│  │ SEGMENT │ │         │ │         │ │         │ │         │   │
│  │ [DROP]  │ │ [DROP]  │ │ [DROP]  │ │ [DROP]  │ │ [DROP]  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                                 │
│  DRAW FROM:                                                     │
│  ┌───────────────┐  ┌───────────────┐                          │
│  │ 🏢 SEGMENTS   │  │ 💡 IDEAS      │                          │
│  │    (3 left)   │  │   (12 left)   │                          │
│  └───────────────┘  └───────────────┘                          │
│                                                                 │
│  Other Teams: Beta (5) | Gamma (5) | Delta (5) | Omega (5)     │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Setup Lock Phase Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  🔒 LOCK YOUR COMPANY SETUP                                     │
│                                                                 │
│  Select 1 Segment + 1 Idea (Product or Service)                 │
│                                                                 │
│  SEGMENTS IN HAND:                                              │
│  ┌─────────────┐                                                │
│  │ 🏢 B2B SaaS │ ← Selected                                     │
│  └─────────────┘                                                │
│                                                                 │
│  IDEAS IN HAND:                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │📊 Analytics │ │📦 Delivery  │ │🎓 Training  │               │
│  │  PRODUCT    │ │  SERVICE    │ │  SERVICE    │               │
│  │  ← Selected │ │             │ │             │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  BONUS PREVIEW:                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🎯 B2B SaaS + Analytics Platform                         │  │
│  │    → Engineering +0.1 to hard skills                     │  │
│  │    "Tech-driven B2B needs strong engineering"            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [LOCK SELECTIONS]                                              │
│                                                                 │
│  Teams Locked: 2/5 (Alpha ✓, Beta ✓, Gamma..., Delta..., Omega...)
└─────────────────────────────────────────────────────────────────┘
```

### 3. Setup Summary Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ COMPANY SETUP COMPLETE                                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ALPHA: B2B SaaS × Analytics Platform                     │  │
│  │ 🎯 Bonus: Engineering +0.1                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ BETA: D2C Consumer × Mobile App                          │  │
│  │ 🎯 Bonus: Product +0.15                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ GAMMA: Fintech × Payment Gateway                         │  │
│  │ 🎯 Bonus: Finance +0.2                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ DELTA: Healthtech × Consulting                           │  │
│  │ ❌ No bonus (unmatched combo)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ OMEGA: Logistics × Delivery Service                      │  │
│  │ 🎯 Bonus: Ops +0.2                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [START TALENT AUCTION]                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Updated Team Sidebar

Show segment + idea + bonus in team sidebar during auction and market rounds:

```
┌───────────┐
│   ALPHA   │
│  ───────  │
│ 🏢 B2B SaaS
│ 📊 Analytics
│ +0.1 Eng  │
│           │
│ ESOP: 7%  │
│ Hired: 2/3│
│ 🃏 Ready  │
└───────────┘
```

---

## Render Functions

### renderSetupPhase(app)

```javascript
function renderSetupPhase(app) {
  const currentTeam = gameState.teams[gameState.setupDraftTurn];

  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('setup')}

      <main class="setup-main">
        <div class="setup-header">
          <div class="setup-icon">🎴</div>
          <h1>Company Setup</h1>
          <p>Round ${gameState.setupRound + 1} of 3</p>
        </div>

        <div class="setup-turn-indicator">
          <span class="turn-team" style="color: ${currentTeam.color}">
            ${currentTeam.name}'s Turn
          </span>
          <span class="turn-action">
            ${gameState.setupPhase === 'drop' ? 'Drop 1 card' : 'Draw 1 card'}
          </span>
        </div>

        <div class="setup-hand">
          <h3>Your Hand</h3>
          <div class="hand-cards">
            ${currentTeam.setupHand.map(card => `
              <div class="setup-card ${card.type || 'segment'}">
                <div class="setup-card-icon">${card.icon}</div>
                <div class="setup-card-name">${card.name}</div>
                <div class="setup-card-type">${card.type ? card.type.toUpperCase() : 'SEGMENT'}</div>
                ${gameState.setupPhase === 'drop' ? `
                  <button class="drop-card-btn"
                          onclick="dropSetupCard(${gameState.setupDraftTurn}, ${card.id}, '${card.type || 'segment'}')">
                    Drop
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        ${gameState.setupPhase === 'draw' ? `
          <div class="setup-decks">
            <h3>Draw From</h3>
            <div class="deck-options">
              <button class="deck-btn segment"
                      onclick="drawSetupCard(${gameState.setupDraftTurn}, 'segment')"
                      ${gameState.segmentDeck.length === 0 ? 'disabled' : ''}>
                <span class="deck-icon">🏢</span>
                <span class="deck-label">Segments</span>
                <span class="deck-count">${gameState.segmentDeck.length} left</span>
              </button>
              <button class="deck-btn idea"
                      onclick="drawSetupCard(${gameState.setupDraftTurn}, 'idea')"
                      ${gameState.ideaDeck.length === 0 ? 'disabled' : ''}>
                <span class="deck-icon">💡</span>
                <span class="deck-label">Ideas</span>
                <span class="deck-count">${gameState.ideaDeck.length} left</span>
              </button>
            </div>
          </div>
        ` : ''}

        <div class="other-teams">
          ${gameState.teams.map((team, idx) => {
            if (idx === gameState.setupDraftTurn) return '';
            return `
              <span class="other-team" style="color: ${team.color}">
                ${team.name} (${team.setupHand.length})
              </span>
            `;
          }).join(' | ')}
        </div>
      </main>
    </div>
  `;
}
```

### renderSetupLock(app)

```javascript
function renderSetupLock(app) {
  const lockedCount = gameState.teams.filter(t => t.lockedSegment && t.lockedIdea).length;

  app.innerHTML = `
    <div class="game-container">
      ${renderPhaseBar('setup')}

      <main class="setup-lock-main">
        <div class="setup-header">
          <div class="setup-icon">🔒</div>
          <h1>Lock Your Company Setup</h1>
          <p>Each team: Select 1 Segment + 1 Idea</p>
        </div>

        <div class="lock-teams-grid">
          ${gameState.teams.map((team, idx) => {
            const isLocked = team.lockedSegment && team.lockedIdea;
            const segments = team.setupHand.filter(c => !c.type);
            const ideas = team.setupHand.filter(c => c.type);

            // For UI state tracking selected cards
            const selectedSegmentId = team.selectedSegmentId || (segments[0]?.id);
            const selectedIdeaId = team.selectedIdeaId || (ideas[0]?.id);

            const selectedSegment = segments.find(s => s.id === selectedSegmentId);
            const selectedIdea = ideas.find(i => i.id === selectedIdeaId);
            const previewBonus = selectedSegment && selectedIdea
              ? getSetupBonus(selectedSegment.name, selectedIdea.name)
              : null;

            return `
              <div class="lock-card ${isLocked ? 'locked' : ''}" style="--team-color: ${team.color}">
                <div class="lock-card-header">
                  <span class="team-icon" style="background: ${team.color}">${team.name.charAt(0)}</span>
                  <span class="team-name">${team.name}</span>
                  ${isLocked ? '<span class="locked-badge">✓ Locked</span>' : ''}
                </div>

                ${isLocked ? `
                  <div class="locked-selections">
                    <div class="locked-item">
                      <span>${team.lockedSegment.icon}</span>
                      <span>${team.lockedSegment.name}</span>
                    </div>
                    <span class="locked-x">×</span>
                    <div class="locked-item">
                      <span>${team.lockedIdea.icon}</span>
                      <span>${team.lockedIdea.name}</span>
                    </div>
                  </div>
                  ${team.setupBonus ? `
                    <div class="bonus-display">
                      🎯 ${team.setupBonus.category} +${team.setupBonus.modifier}
                    </div>
                  ` : `
                    <div class="no-bonus">No combo bonus</div>
                  `}
                ` : `
                  <div class="selection-section">
                    <h4>Segments</h4>
                    <div class="selection-options">
                      ${segments.map(s => `
                        <label class="selection-option ${selectedSegmentId === s.id ? 'selected' : ''}">
                          <input type="radio" name="segment-${idx}" value="${s.id}"
                                 ${selectedSegmentId === s.id ? 'checked' : ''}
                                 onchange="selectSetupCard(${idx}, 'segment', ${s.id})">
                          <span class="option-icon">${s.icon}</span>
                          <span class="option-name">${s.name}</span>
                        </label>
                      `).join('')}
                    </div>
                  </div>

                  <div class="selection-section">
                    <h4>Ideas</h4>
                    <div class="selection-options">
                      ${ideas.map(i => `
                        <label class="selection-option ${selectedIdeaId === i.id ? 'selected' : ''}">
                          <input type="radio" name="idea-${idx}" value="${i.id}"
                                 ${selectedIdeaId === i.id ? 'checked' : ''}
                                 onchange="selectSetupCard(${idx}, 'idea', ${i.id})">
                          <span class="option-icon">${i.icon}</span>
                          <span class="option-name">${i.name}</span>
                          <span class="option-type">${i.type}</span>
                        </label>
                      `).join('')}
                    </div>
                  </div>

                  ${previewBonus ? `
                    <div class="bonus-preview">
                      🎯 Bonus: ${previewBonus.category} +${previewBonus.modifier}
                      <p class="bonus-desc">${previewBonus.description}</p>
                    </div>
                  ` : `
                    <div class="no-bonus-preview">No combo bonus for this selection</div>
                  `}

                  <button class="lock-btn" onclick="lockSetupCards(${idx}, ${selectedSegmentId}, ${selectedIdeaId})">
                    Lock Selections
                  </button>
                `}
              </div>
            `;
          }).join('')}
        </div>

        <div class="lock-progress">
          Teams Locked: ${lockedCount}/5
        </div>
      </main>
    </div>
  `;
}
```

---

## CSS Additions

```css
/* Setup Phase Styles */
.setup-main {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.setup-header {
  text-align: center;
  margin-bottom: 2rem;
}

.setup-icon {
  font-size: 4rem;
}

.setup-turn-indicator {
  text-align: center;
  font-size: 1.25rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--card-bg);
  border-radius: 12px;
}

.turn-team {
  font-weight: 700;
  font-size: 1.5rem;
}

.turn-action {
  display: block;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

/* Setup Cards */
.hand-cards {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.setup-card {
  width: 140px;
  padding: 1.5rem 1rem;
  background: var(--card-bg);
  border-radius: 12px;
  text-align: center;
  border: 2px solid var(--border);
  transition: all 0.2s;
}

.setup-card.segment {
  border-color: #4ECDC4;
}

.setup-card.product {
  border-color: #FFD93D;
}

.setup-card.service {
  border-color: #6BCB77;
}

.setup-card-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.setup-card-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.setup-card-type {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.drop-card-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* Deck Options */
.setup-decks {
  text-align: center;
  margin-bottom: 2rem;
}

.deck-options {
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.deck-btn {
  padding: 2rem;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 150px;
}

.deck-btn:hover:not(:disabled) {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.deck-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.deck-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.deck-label {
  font-weight: 600;
  display: block;
}

.deck-count {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* Lock Phase */
.setup-lock-main {
  padding: 2rem;
}

.lock-teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.lock-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid var(--border);
}

.lock-card.locked {
  border-color: var(--success);
  opacity: 0.9;
}

.lock-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.locked-badge {
  margin-left: auto;
  background: var(--success);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.locked-selections {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 1rem 0;
}

.locked-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg);
  border-radius: 8px;
}

.locked-x {
  font-size: 1.25rem;
  color: var(--text-muted);
}

.selection-section {
  margin-bottom: 1rem;
}

.selection-section h4 {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.selection-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.selection-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg);
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.selection-option:hover {
  border-color: var(--primary);
}

.selection-option.selected {
  border-color: var(--primary);
  background: rgba(78, 205, 196, 0.1);
}

.selection-option input {
  display: none;
}

.bonus-preview, .bonus-display {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(78, 205, 196, 0.1);
  border-radius: 8px;
  text-align: center;
}

.bonus-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.no-bonus-preview, .no-bonus {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 8px;
  text-align: center;
  color: var(--text-muted);
}

.lock-btn {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.lock-progress {
  text-align: center;
  font-size: 1.125rem;
}
```

---

## Implementation Checklist

### Data
- [ ] Create `segmentCards` array (6 segments)
- [ ] Create `productCards` array (8 products)
- [ ] Create `serviceCards` array (8 services)
- [ ] Create `setupBonuses` array (12+ combos)
- [ ] Implement `getSetupBonus()` helper function

### State
- [ ] Add `setupRound`, `setupDraftTurn`, `setupPhase` to gameState
- [ ] Add `segmentDeck`, `ideaDeck`, `setupDiscard` to gameState
- [ ] Add `setupHand`, `lockedSegment`, `lockedIdea`, `setupBonus` to team object

### Logic
- [ ] Implement `initSetupPhase()` with card dealing
- [ ] Implement `dropSetupCard()` function
- [ ] Implement `drawSetupCard()` function
- [ ] Implement `startLockingPhase()` function
- [ ] Implement `lockSetupCards()` function
- [ ] Implement `showSetupSummary()` function
- [ ] Implement `startAuctionFromSetup()` function
- [ ] Modify `applyMarketCard()` to include setup bonuses

### UI
- [ ] Create `renderSetupPhase()` for drafting UI
- [ ] Create `renderSetupLock()` for locking UI
- [ ] Create `renderSetupSummary()` for summary before auction
- [ ] Update phase bar to include Setup phase
- [ ] Update team sidebar to show segment + idea + bonus
- [ ] Add all setup CSS styles

### Flow Integration
- [ ] Connect Registration → Setup → Auction flow
- [ ] Update phase progression logic
- [ ] Ensure localStorage saves/loads setup state

---

## Testing Scenarios

1. Complete 3 rounds of drafting with all teams
2. Verify cards shuffle back from discard after each round
3. Lock segment + idea combos for all teams
4. Verify bonus detection for matching combos
5. Verify no bonus for non-matching combos
6. Proceed to auction with bonuses applied
7. Verify bonuses appear in market round calculations
8. Test edge case: team has no segments (should not happen with proper dealing)
9. Test edge case: deck runs out during draw (button should disable)
