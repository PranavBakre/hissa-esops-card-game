# ESOP Wars — Iteration 4 Plan

**Goal:** Full employee category details with perks + Expanded soft skill pool + Balance pass

---

## Feature 1: Full Employee Category Details

### Concept
Each of the 5 employee categories has unique perks and characteristics that make hiring decisions more strategic.

### Category Perks

| Category | Perk Name | Effect |
|----------|-----------|--------|
| **Engineering** | "Ship Fast" | +0.05 valuation multiplier per Engineering employee during Rapid Scaling market condition |
| **Product** | "User Focus" | Negates 50% of negative soft skill modifiers |
| **Sales** | "Deal Closer" | Bonus +5% valuation if team has 2+ Sales employees |
| **Ops** | "Efficiency" | Reduces ESOP cost by 10% on subsequent hires (after first Ops employee) |
| **Finance** | "Cost Control" | Shield from 25% of valuation loss during Market Crash conditions |

### Data Additions (`data.js`)

```javascript
// Category definitions with perks
const categoryPerks = {
  Engineering: {
    name: "Ship Fast",
    description: "Extra valuation boost during growth periods",
    icon: "🚀",
    effect: "engineering_scaling"
  },
  Product: {
    name: "User Focus",
    description: "Resilient to soft skill penalties",
    icon: "🎯",
    effect: "soft_skill_shield"
  },
  Sales: {
    name: "Deal Closer",
    description: "Bonus when sales team is strong",
    icon: "🤝",
    effect: "sales_synergy"
  },
  Ops: {
    name: "Efficiency",
    description: "Reduces hiring costs",
    icon: "⚡",
    effect: "esop_discount"
  },
  Finance: {
    name: "Cost Control",
    description: "Protection during downturns",
    icon: "🛡️",
    effect: "crash_shield"
  }
};
```

### Logic Changes

```javascript
// Apply category perks during market rounds
function applyCategoryPerks(team, marketCard, baseChange) {
  let adjustedChange = baseChange;

  // Count employees by category
  const categoryCounts = {};
  team.employees.forEach(emp => {
    categoryCounts[emp.category] = (categoryCounts[emp.category] || 0) + 1;
  });

  // Engineering: "Ship Fast" - bonus during Rapid Scaling
  if (marketCard.name === "Rapid Scaling" && categoryCounts["Engineering"]) {
    adjustedChange += team.valuation * 0.05 * categoryCounts["Engineering"];
  }

  // Sales: "Deal Closer" - synergy bonus
  if (categoryCounts["Sales"] >= 2) {
    adjustedChange += team.valuation * 0.05;
  }

  // Finance: "Cost Control" - crash protection
  if (marketCard.name === "Market Crash" && categoryCounts["Finance"] && baseChange < 0) {
    adjustedChange = baseChange * 0.75;  // 25% reduction in losses
  }

  return adjustedChange;
}

// Product perk: Applied during soft skill calculation
function applyProductPerk(team, softSkillModifier) {
  const hasProduct = team.employees.some(e => e.category === "Product");
  if (hasProduct && softSkillModifier < 0) {
    return softSkillModifier * 0.5;  // 50% reduction in penalties
  }
  return softSkillModifier;
}

// Ops perk: Applied during bidding
function getEsopDiscount(team) {
  const hasOps = team.employees.some(e => e.category === "Ops");
  return hasOps ? 0.10 : 0;  // 10% discount if team has Ops employee
}

// Modified bid placement with Ops discount
function placeBidWithPerks(teamIndex, amount) {
  const team = gameState.teams[teamIndex];
  const discount = getEsopDiscount(team);
  const effectiveAmount = amount * (1 - discount);

  // Show discount in UI if applicable
  if (discount > 0) {
    team.lastDiscount = amount - effectiveAmount;
  }

  return placeBid(teamIndex, effectiveAmount);
}
```

### UI Updates

#### Employee Card with Category Perk

```
┌───────────────────────────────────────────────┐
│  ⚙️ ENGINEERING                               │
│  ┌─────────────────────────────────────────┐  │
│  │    PS                                   │  │
│  │  Priya Sharma                           │  │
│  │  Backend Engineer                       │  │
│  │                                         │  │
│  │  Hard Skill: ████████░░ 0.8             │  │
│  │  Resilience: ██████░░░░ 0.6             │  │
│  │                                         │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │ 🚀 SHIP FAST                    │    │  │
│  │  │ Extra boost during growth       │    │  │
│  │  └─────────────────────────────────┘    │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

#### Team Sidebar with Active Perks

```
┌───────────┐
│   ALPHA   │
│  ───────  │
│ Active Perks:
│ 🚀 Ship Fast (2x Eng)
│ 🤝 Deal Closer
│           │
│ ESOP: 7%  │
│ Hired: 3  │
└───────────┘
```

---

## Feature 2: Expanded Soft Skill Pool

### Current Soft Skills (5)
- Resilience
- Communication
- Pressure Handling
- Leadership
- Adaptability

### New Soft Skills (+5 = 10 total)

```javascript
// Full soft skill pool
const softSkillPool = [
  // Existing
  { name: "Resilience", icon: "💪", description: "Handles setbacks gracefully" },
  { name: "Communication", icon: "💬", description: "Clear and effective messaging" },
  { name: "Pressure Handling", icon: "⏱️", description: "Performs under stress" },
  { name: "Leadership", icon: "👑", description: "Inspires and guides teams" },
  { name: "Adaptability", icon: "🔄", description: "Adjusts to change quickly" },

  // New
  { name: "Problem Solving", icon: "🧩", description: "Creative solution finder" },
  { name: "Collaboration", icon: "🤝", description: "Works well with others" },
  { name: "Initiative", icon: "🎯", description: "Self-starter who takes action" },
  { name: "Emotional Intelligence", icon: "❤️", description: "Understands team dynamics" },
  { name: "Strategic Thinking", icon: "🧠", description: "Sees the big picture" }
];
```

### Updated Market Cards with New Skills

```javascript
const marketCards = [
  {
    id: 1,
    name: "AI Hype Cycle",
    description: "AI investment is booming. Tech skills are hot.",
    hardSkillModifiers: {
      Engineering: 0.3,
      Product: 0.1,
      Sales: -0.2,
      Ops: 0,
      Finance: -0.1
    },
    softSkillModifiers: {
      Resilience: 0.1,
      Communication: 0,
      "Pressure Handling": 0.2,
      Leadership: 0,
      Adaptability: 0.1,
      // New skills
      "Problem Solving": 0.2,
      Collaboration: 0,
      Initiative: 0.15,
      "Emotional Intelligence": -0.1,
      "Strategic Thinking": 0.1
    }
  },
  {
    id: 2,
    name: "Enterprise Sales Boom",
    description: "Big companies are buying. Relationships matter.",
    hardSkillModifiers: {
      Engineering: -0.1,
      Product: 0,
      Sales: 0.4,
      Ops: 0.1,
      Finance: 0.1
    },
    softSkillModifiers: {
      Resilience: 0,
      Communication: 0.3,
      "Pressure Handling": 0.1,
      Leadership: 0.2,
      Adaptability: 0,
      "Problem Solving": 0,
      Collaboration: 0.2,
      Initiative: 0.1,
      "Emotional Intelligence": 0.25,
      "Strategic Thinking": 0.15
    }
  },
  {
    id: 3,
    name: "Market Crash",
    description: "Funding winter hits. Survival mode activated.",
    hardSkillModifiers: {
      Engineering: -0.1,
      Product: -0.1,
      Sales: -0.2,
      Ops: 0.1,
      Finance: 0.2
    },
    softSkillModifiers: {
      Resilience: 0.4,
      Communication: 0,
      "Pressure Handling": 0.3,
      Leadership: 0.1,
      Adaptability: 0.2,
      "Problem Solving": 0.2,
      Collaboration: 0.15,
      Initiative: -0.1,
      "Emotional Intelligence": 0.1,
      "Strategic Thinking": 0.2
    }
  },
  {
    id: 4,
    name: "Rapid Scaling",
    description: "Growth at all costs! Everyone steps up.",
    hardSkillModifiers: {
      Engineering: 0.1,
      Product: 0.15,
      Sales: 0.1,
      Ops: 0.15,
      Finance: 0.1
    },
    softSkillModifiers: {
      Resilience: 0.1,
      Communication: 0.1,
      "Pressure Handling": 0.1,
      Leadership: 0.15,
      Adaptability: 0.15,
      "Problem Solving": 0.1,
      Collaboration: 0.2,
      Initiative: 0.2,
      "Emotional Intelligence": 0.05,
      "Strategic Thinking": 0.1
    }
  },
  // New market conditions
  {
    id: 5,
    name: "Talent War",
    description: "Everyone's hiring. Soft skills command premiums.",
    hardSkillModifiers: {
      Engineering: 0,
      Product: 0.1,
      Sales: 0,
      Ops: -0.1,
      Finance: 0
    },
    softSkillModifiers: {
      Resilience: 0.15,
      Communication: 0.2,
      "Pressure Handling": 0,
      Leadership: 0.3,
      Adaptability: 0.2,
      "Problem Solving": 0.1,
      Collaboration: 0.25,
      Initiative: 0.2,
      "Emotional Intelligence": 0.3,
      "Strategic Thinking": 0.15
    }
  },
  {
    id: 6,
    name: "Regulatory Crackdown",
    description: "Compliance is king. Finance and ops critical.",
    hardSkillModifiers: {
      Engineering: -0.1,
      Product: -0.1,
      Sales: -0.2,
      Ops: 0.25,
      Finance: 0.3
    },
    softSkillModifiers: {
      Resilience: 0.1,
      Communication: 0.15,
      "Pressure Handling": 0.2,
      Leadership: 0.1,
      Adaptability: 0.1,
      "Problem Solving": 0.15,
      Collaboration: 0.1,
      Initiative: -0.1,
      "Emotional Intelligence": 0,
      "Strategic Thinking": 0.2
    }
  }
];
```

### Updated Employee Cards with More Soft Skills

```javascript
// Example updated employee with 2-3 soft skills
{
  id: 1,
  name: "Priya Sharma",
  role: "Backend Engineer",
  category: "Engineering",
  hardSkill: 0.7,
  softSkills: {
    Resilience: 0.6,
    Communication: 0.4,
    "Problem Solving": 0.8  // New skill
  }
}
```

### Full Updated Employee Deck

```javascript
const employeeCards = [
  // Engineering (4 cards)
  {
    id: 1,
    name: "Priya Sharma",
    role: "Backend Engineer",
    category: "Engineering",
    hardSkill: 0.7,
    softSkills: { Resilience: 0.6, "Problem Solving": 0.8 }
  },
  {
    id: 2,
    name: "Arjun Patel",
    role: "Frontend Developer",
    category: "Engineering",
    hardSkill: 0.6,
    softSkills: { Adaptability: 0.7, Collaboration: 0.6 }
  },
  {
    id: 3,
    name: "Kavya Reddy",
    role: "DevOps Engineer",
    category: "Engineering",
    hardSkill: 0.8,
    softSkills: { "Pressure Handling": 0.8, Initiative: 0.6 }
  },
  {
    id: 4,
    name: "Rohan Mehta",
    role: "Data Engineer",
    category: "Engineering",
    hardSkill: 0.65,
    softSkills: { "Strategic Thinking": 0.5, "Problem Solving": 0.7 }
  },

  // Product (4 cards)
  {
    id: 5,
    name: "Ananya Krishnan",
    role: "Product Manager",
    category: "Product",
    hardSkill: 0.75,
    softSkills: { Communication: 0.8, Leadership: 0.6, "Strategic Thinking": 0.7 }
  },
  {
    id: 6,
    name: "Vikram Singh",
    role: "UX Designer",
    category: "Product",
    hardSkill: 0.6,
    softSkills: { Adaptability: 0.7, "Emotional Intelligence": 0.65 }
  },
  {
    id: 7,
    name: "Meera Iyer",
    role: "Product Analyst",
    category: "Product",
    hardSkill: 0.55,
    softSkills: { "Problem Solving": 0.7, Collaboration: 0.6 }
  },
  {
    id: 8,
    name: "Aditya Nair",
    role: "Growth PM",
    category: "Product",
    hardSkill: 0.7,
    softSkills: { Initiative: 0.8, "Strategic Thinking": 0.6 }
  },

  // Sales (4 cards)
  {
    id: 9,
    name: "Neha Gupta",
    role: "Sales Lead",
    category: "Sales",
    hardSkill: 0.8,
    softSkills: { Communication: 0.9, "Emotional Intelligence": 0.8 }
  },
  {
    id: 10,
    name: "Rahul Verma",
    role: "Account Executive",
    category: "Sales",
    hardSkill: 0.6,
    softSkills: { Resilience: 0.8, Initiative: 0.7 }
  },
  {
    id: 11,
    name: "Shreya Joshi",
    role: "Business Development",
    category: "Sales",
    hardSkill: 0.65,
    softSkills: { Communication: 0.7, Collaboration: 0.65 }
  },
  {
    id: 12,
    name: "Karthik Rao",
    role: "Enterprise Sales",
    category: "Sales",
    hardSkill: 0.75,
    softSkills: { "Pressure Handling": 0.6, "Strategic Thinking": 0.7 }
  },

  // Ops (3 cards)
  {
    id: 13,
    name: "Divya Menon",
    role: "Operations Manager",
    category: "Ops",
    hardSkill: 0.7,
    softSkills: { Resilience: 0.7, Adaptability: 0.6, Collaboration: 0.65 }
  },
  {
    id: 14,
    name: "Amit Kumar",
    role: "Supply Chain Lead",
    category: "Ops",
    hardSkill: 0.6,
    softSkills: { "Pressure Handling": 0.8, "Problem Solving": 0.7 }
  },
  {
    id: 15,
    name: "Pooja Desai",
    role: "Customer Success",
    category: "Ops",
    hardSkill: 0.55,
    softSkills: { Communication: 0.8, "Emotional Intelligence": 0.75 }
  },

  // Finance (3 cards)
  {
    id: 16,
    name: "Sanjay Kapoor",
    role: "Finance Manager",
    category: "Finance",
    hardSkill: 0.75,
    softSkills: { "Pressure Handling": 0.7, "Strategic Thinking": 0.8 }
  },
  {
    id: 17,
    name: "Ritu Agarwal",
    role: "Financial Analyst",
    category: "Finance",
    hardSkill: 0.65,
    softSkills: { "Problem Solving": 0.6, Adaptability: 0.5 }
  },
  {
    id: 18,
    name: "Varun Bhatia",
    role: "Accounts Lead",
    category: "Finance",
    hardSkill: 0.5,
    softSkills: { Communication: 0.6, Collaboration: 0.7 }
  }
];

// Reserve employees (3 cards) - high value
const reserveEmployees = [
  {
    id: 19,
    name: "Tanvi Shah",
    role: "Full Stack Developer",
    category: "Engineering",
    hardSkill: 0.85,
    softSkills: { Adaptability: 0.8, "Problem Solving": 0.85, Initiative: 0.7 }
  },
  {
    id: 20,
    name: "Nikhil Saxena",
    role: "Head of Sales",
    category: "Sales",
    hardSkill: 0.9,
    softSkills: { Leadership: 0.8, Communication: 0.9, "Emotional Intelligence": 0.75 }
  },
  {
    id: 21,
    name: "Ishita Malhotra",
    role: "Strategy Lead",
    category: "Product",
    hardSkill: 0.8,
    softSkills: { Leadership: 0.7, "Strategic Thinking": 0.9, Collaboration: 0.65 }
  }
];
```

---

## Feature 3: Balance Pass

### Current Issues to Address

1. **Valuation Growth Too Fast/Slow**
2. **Some Categories Are Underpowered**
3. **Exit Multipliers May Be Unbalanced**
4. **ESOP Pool Constraints**

### Balance Adjustments

#### 1. Valuation Formula Tweak

**Current:**
```javascript
New Valuation = Previous Valuation × (1 + Skill Total × 0.1)
```

**Balanced:**
```javascript
// Cap the growth rate, add floor
const growthRate = Math.max(-0.3, Math.min(0.5, skillTotal * 0.08));
New Valuation = Previous Valuation × (1 + growthRate);
```

#### 2. Category Distribution in Deck

**Current:** 4 Eng, 4 Product, 4 Sales, 3 Ops, 3 Finance = 18
**Balanced (same):** Keep distribution but adjust skill values

**Adjustment:** Slightly boost underrepresented categories (Ops, Finance) hard skills:

```javascript
// Ops average hard skill: 0.55 → 0.65
// Finance average hard skill: 0.60 → 0.65
```

#### 3. Exit Multiplier Rebalance

| Exit Type | Current | Balanced |
|-----------|---------|----------|
| IPO | 2.5x | 2.2x |
| M&A | 2.0x | 1.8x |
| Joint Venture | 1.5x | 1.5x |

Rationale: Reduce gap between best and worst exit outcomes.

#### 4. Market Card Balance

Ensure each market card has:
- At least one category with positive modifier
- At least one soft skill with positive modifier
- Total positive modifiers ≈ total negative modifiers

#### 5. Starting Resources

**Current:**
- ESOP Pool: 10%
- Starting Valuation: ₹25M

**Balanced:**
- ESOP Pool: 12% (allows more flexibility)
- Starting Valuation: ₹20M (lower start, more growth)

### Balance Testing Framework

```javascript
// Simulation function to test balance
function simulateGame(iterations = 100) {
  const results = {
    winsByCategory: { Engineering: 0, Product: 0, Sales: 0, Ops: 0, Finance: 0 },
    averageValuation: 0,
    valuationRange: { min: Infinity, max: 0 },
    exitTypeWins: { IPO: 0, "M&A": 0, "Joint Venture": 0 }
  };

  for (let i = 0; i < iterations; i++) {
    const gameResult = runSimulatedGame();
    // Track results
  }

  return results;
}

function runSimulatedGame() {
  // Initialize game with random team compositions
  // Simulate market rounds
  // Track which category-focused teams win most often
  // Return analysis data
}
```

---

## UI Updates for New Features

### 1. Employee Card with Multiple Soft Skills

```
┌─────────────────────────────────────────────┐
│  PRODUCT                         [🎯 Perk]  │
│  ┌─────────────────────────────────────┐    │
│  │         AK                          │    │
│  │    Ananya Krishnan                  │    │
│  │    Product Manager                  │    │
│  │                                     │    │
│  │  Hard Skill: ████████░░ 0.75        │    │
│  │  ─────────────────────────          │    │
│  │  💬 Communication:  ████████░░ 0.8  │    │
│  │  👑 Leadership:     ██████░░░░ 0.6  │    │
│  │  🧠 Strategic:      ███████░░░ 0.7  │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 2. Market Card with Full Skill Modifiers

```
┌────────────────────────────────────────────────────────────┐
│  📈 TALENT WAR                                              │
│  "Everyone's hiring. Soft skills command premiums."         │
│                                                             │
│  CATEGORY MODIFIERS:           SOFT SKILL MODIFIERS:        │
│  Engineering: +0.0             Resilience: +0.15            │
│  Product: +0.1                 Communication: +0.2          │
│  Sales: +0.0                   Pressure: +0.0               │
│  Ops: -0.1                     Leadership: +0.3             │
│  Finance: +0.0                 Adaptability: +0.2           │
│                                Problem Solving: +0.1        │
│                                Collaboration: +0.25         │
│                                Initiative: +0.2             │
│                                Emotional Intel: +0.3        │
│                                Strategic: +0.15             │
└────────────────────────────────────────────────────────────┘
```

### 3. Soft Skill Legend/Reference

Add a help button that shows all soft skills:

```
┌─────────────────────────────────────────┐
│  📖 SOFT SKILL REFERENCE                │
│                                         │
│  💪 Resilience - Handles setbacks       │
│  💬 Communication - Clear messaging     │
│  ⏱️ Pressure Handling - Works under stress
│  👑 Leadership - Guides teams           │
│  🔄 Adaptability - Adjusts quickly      │
│  🧩 Problem Solving - Finds solutions   │
│  🤝 Collaboration - Works with others   │
│  🎯 Initiative - Self-starter           │
│  ❤️ Emotional Intelligence - Empathy    │
│  🧠 Strategic Thinking - Big picture    │
│                                         │
│  [Close]                                │
└─────────────────────────────────────────┘
```

### 4. Category Perk Reference

```
┌─────────────────────────────────────────────────┐
│  🏆 CATEGORY PERKS                               │
│                                                  │
│  ⚙️ Engineering - "Ship Fast"                   │
│     Extra boost during Rapid Scaling             │
│                                                  │
│  📦 Product - "User Focus"                       │
│     50% reduction in soft skill penalties        │
│                                                  │
│  💼 Sales - "Deal Closer"                        │
│     +5% valuation with 2+ Sales employees        │
│                                                  │
│  🔧 Ops - "Efficiency"                           │
│     10% ESOP discount after first Ops hire       │
│                                                  │
│  💰 Finance - "Cost Control"                     │
│     25% loss reduction during Market Crash       │
│                                                  │
│  [Close]                                         │
└─────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Category Perks
- [ ] Create `categoryPerks` data structure
- [ ] Implement `applyCategoryPerks()` function
- [ ] Implement Engineering "Ship Fast" perk
- [ ] Implement Product "User Focus" perk
- [ ] Implement Sales "Deal Closer" perk
- [ ] Implement Ops "Efficiency" perk (ESOP discount)
- [ ] Implement Finance "Cost Control" perk
- [ ] Update employee card UI to show category perk
- [ ] Update team sidebar to show active perks
- [ ] Add category perk reference modal

### Expanded Soft Skills
- [ ] Add 5 new soft skills to data structure
- [ ] Update all 18 employee cards with 2-3 soft skills each
- [ ] Update all 3 reserve employees with soft skills
- [ ] Update market cards with all 10 soft skill modifiers
- [ ] Add 2 new market condition cards
- [ ] Update employee card UI to show all soft skills
- [ ] Update market card UI to show all modifiers
- [ ] Add soft skill reference modal

### Balance Pass
- [ ] Adjust valuation formula with growth cap
- [ ] Rebalance exit multipliers (2.2x, 1.8x, 1.5x)
- [ ] Adjust starting ESOP pool to 12%
- [ ] Adjust starting valuation to ₹20M
- [ ] Rebalance Ops and Finance hard skills
- [ ] Verify market card balance (positive ≈ negative modifiers)
- [ ] Create simulation test framework
- [ ] Run balance tests and iterate

### UI/UX Polish
- [ ] Add soft skill icons throughout UI
- [ ] Add perk indicators to employee cards
- [ ] Add help/reference modals for perks and skills
- [ ] Improve market card display for 10 soft skills
- [ ] Add tooltips explaining perk effects
- [ ] Update final winner screen with perk contributions

---

## Testing Scenarios

### Category Perks
1. Engineering team with "Ship Fast" during Rapid Scaling → Extra boost visible
2. Product team with "User Focus" during Market Crash → Reduced soft skill penalties
3. Sales team with 2+ Sales employees → 5% bonus applied
4. Team with Ops employee → Subsequent hires show 10% ESOP discount
5. Finance team during Market Crash → 25% loss reduction

### Expanded Soft Skills
1. Employees with 3 soft skills → All displayed on card
2. Market card affects all 10 soft skills → Correct calculation
3. New market conditions (Talent War, Regulatory Crackdown) → Play correctly

### Balance
1. Complete game with new balance settings → Valuations in reasonable range
2. No single category dominates across multiple games
3. All exit types feel viable (IPO not always best)
4. 12% ESOP pool allows strategic bidding

---

## File Changes Summary

| File | Changes |
|------|---------|
| `data.js` | Add categoryPerks, expand softSkillPool, add new market cards, update employee cards, update reserve employees |
| `game.js` | Add category perk logic, update valuation formula, add perk application functions, update ESOP calculation |
| `style.css` | Update employee card layout for more skills, add perk badges, add reference modal styles |
| `index.html` | Add reference modal markup (or generate dynamically) |

---

## Migration Notes

If updating from Iteration 3:

1. **State Migration:** Existing saved games may have old employee data
   - Either reset game state
   - Or migrate employee cards to include new soft skills

2. **Balance Changes:** Existing valuations won't retroactively change
   - Starting valuations for new games will be ₹20M instead of ₹25M
   - ESOP pool will be 12% instead of 10%

3. **Backward Compatibility:** Old market cards missing new soft skills
   - Default missing soft skill modifiers to 0
