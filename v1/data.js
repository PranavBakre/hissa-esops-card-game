// ESOP Wars - Game Data

// ==========================================
// Iteration 4: Category Perks
// ==========================================
const categoryPerks = {
  Engineering: {
    name: "Ship Fast",
    description: "Extra valuation boost during Rapid Scaling",
    icon: "🚀",
    effect: "engineering_scaling"
  },
  Product: {
    name: "User Focus",
    description: "50% reduction in soft skill penalties",
    icon: "🎯",
    effect: "soft_skill_shield"
  },
  Sales: {
    name: "Deal Closer",
    description: "+5% valuation with 2+ Sales employees",
    icon: "🤝",
    effect: "sales_synergy"
  },
  Ops: {
    name: "Efficiency",
    description: "10% ESOP discount after first Ops hire",
    icon: "⚡",
    effect: "esop_discount"
  },
  Finance: {
    name: "Cost Control",
    description: "25% loss reduction during Market Crash",
    icon: "🛡️",
    effect: "crash_shield"
  }
};

// ==========================================
// Iteration 4: Expanded Soft Skill Pool (10 total)
// ==========================================
const softSkillPool = [
  // Original 5
  { name: "Resilience", icon: "💪", description: "Handles setbacks gracefully" },
  { name: "Communication", icon: "💬", description: "Clear and effective messaging" },
  { name: "Pressure Handling", icon: "⏱️", description: "Performs under stress" },
  { name: "Leadership", icon: "👑", description: "Inspires and guides teams" },
  { name: "Adaptability", icon: "🔄", description: "Adjusts to change quickly" },
  // New 5
  { name: "Problem Solving", icon: "🧩", description: "Creative solution finder" },
  { name: "Collaboration", icon: "🤝", description: "Works well with others" },
  { name: "Initiative", icon: "🎯", description: "Self-starter who takes action" },
  { name: "Emotional Intelligence", icon: "❤️", description: "Understands team dynamics" },
  { name: "Strategic Thinking", icon: "🧠", description: "Sees the big picture" }
];

// Employee Cards (18 total for main auction + 3 reserve for secondary)
// Iteration 4: Updated with expanded soft skills (2-3 per employee)
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

  // Ops (3 cards) - Iteration 4: Boosted hard skills
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
    hardSkill: 0.65,
    softSkills: { "Pressure Handling": 0.8, "Problem Solving": 0.7 }
  },
  {
    id: 15,
    name: "Pooja Desai",
    role: "Customer Success",
    category: "Ops",
    hardSkill: 0.6,
    softSkills: { Communication: 0.8, "Emotional Intelligence": 0.75 }
  },

  // Finance (3 cards) - Iteration 4: Boosted hard skills
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
    hardSkill: 0.7,
    softSkills: { "Problem Solving": 0.6, Adaptability: 0.5 }
  },
  {
    id: 18,
    name: "Varun Bhatia",
    role: "Accounts Lead",
    category: "Finance",
    hardSkill: 0.55,
    softSkills: { Communication: 0.6, Collaboration: 0.7 }
  }
];

// Reserve employees for secondary auction (3 cards)
// Iteration 4: Updated with expanded soft skills
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

// Market Condition Cards (6 cards) - Iteration 4: Updated with all 10 soft skills + 2 new conditions
const marketCards = [
  {
    id: 1,
    name: "AI Hype Cycle",
    description: "AI investment is booming. Tech skills are hot, traditional sales takes a hit.",
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
    description: "Big companies are buying. Sales teams are the key to massive deals.",
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
    description: "Funding winter hits hard. Only the resilient survive this downturn.",
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
    description: "Growth at all costs! Every department needs to step up equally.",
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
  // Iteration 4: New market conditions
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
    description: "Compliance is king. Finance and ops become critical.",
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

// Exit Cards (3 types) - Iteration 4: Rebalanced multipliers
const exitCards = [
  {
    id: 1,
    name: "IPO",
    multiplier: 2.2,
    description: "You ring the bell! Public markets reward your journey with great returns."
  },
  {
    id: 2,
    name: "M&A",
    multiplier: 1.8,
    description: "Acquired by a tech giant. Solid exit with strong synergies."
  },
  {
    id: 3,
    name: "Joint Venture",
    multiplier: 1.5,
    description: "Strategic partnership. Conservative exit but guaranteed returns."
  }
];

// Team definitions
const teamDefinitions = [
  { name: "Alpha", color: "#FF6B6B" },
  { name: "Beta", color: "#4ECDC4" },
  { name: "Gamma", color: "#45B7D1" },
  { name: "Delta", color: "#96CEB4" },
  { name: "Omega", color: "#FFEAA7" }
];

// ==========================================
// Iteration 3: Company Setup Cards
// ==========================================

// Market Segment Cards (12 total - doubled for setup draft)
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
  },
  // Duplicate set for larger deck
  {
    id: 7,
    name: "B2B SaaS",
    description: "Enterprise software solutions for businesses",
    icon: "🏢"
  },
  {
    id: 8,
    name: "D2C Consumer",
    description: "Direct-to-consumer products and brands",
    icon: "🛒"
  },
  {
    id: 9,
    name: "Fintech",
    description: "Financial technology and payments",
    icon: "💳"
  },
  {
    id: 10,
    name: "Healthtech",
    description: "Healthcare technology and wellness",
    icon: "🏥"
  },
  {
    id: 11,
    name: "Edtech",
    description: "Education technology and learning platforms",
    icon: "📚"
  },
  {
    id: 12,
    name: "Logistics",
    description: "Supply chain and delivery solutions",
    icon: "🚚"
  }
];

// Product Cards (16 total - doubled for setup draft)
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
  },
  // New product cards
  {
    id: 9,
    type: "product",
    name: "IoT Platform",
    description: "Connected device management and monitoring",
    icon: "📡"
  },
  {
    id: 10,
    type: "product",
    name: "Collaboration Tool",
    description: "Team communication and project management",
    icon: "💬"
  },
  {
    id: 11,
    type: "product",
    name: "E-commerce Engine",
    description: "Online store and checkout infrastructure",
    icon: "🛍️"
  },
  {
    id: 12,
    type: "product",
    name: "Cloud Infrastructure",
    description: "Scalable compute and storage services",
    icon: "☁️"
  },
  {
    id: 13,
    type: "product",
    name: "Subscription Box",
    description: "Curated recurring product delivery",
    icon: "📦"
  },
  {
    id: 14,
    type: "product",
    name: "Developer Tools",
    description: "APIs and SDKs for builders",
    icon: "🔧"
  },
  {
    id: 15,
    type: "product",
    name: "Video Platform",
    description: "Streaming and video conferencing",
    icon: "🎬"
  },
  {
    id: 16,
    type: "product",
    name: "Booking System",
    description: "Appointments and reservations management",
    icon: "📅"
  }
];

// Service Cards (16 total - doubled for setup draft)
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
  },
  // New service cards
  {
    id: 9,
    type: "service",
    name: "Insurance Services",
    description: "Risk management and coverage",
    icon: "🛡️"
  },
  {
    id: 10,
    type: "service",
    name: "Legal Services",
    description: "Compliance and contract management",
    icon: "⚖️"
  },
  {
    id: 11,
    type: "service",
    name: "Customer Support",
    description: "Help desk and customer success",
    icon: "🎧"
  },
  {
    id: 12,
    type: "service",
    name: "Data Services",
    description: "Data processing and enrichment",
    icon: "🗄️"
  },
  {
    id: 13,
    type: "service",
    name: "Healthcare Services",
    description: "Telemedicine and wellness programs",
    icon: "🏥"
  },
  {
    id: 14,
    type: "service",
    name: "Financial Advisory",
    description: "Investment and tax planning",
    icon: "💹"
  },
  {
    id: 15,
    type: "service",
    name: "Marketing Agency",
    description: "Brand building and growth hacking",
    icon: "📣"
  },
  {
    id: 16,
    type: "service",
    name: "Facility Management",
    description: "Property and maintenance services",
    icon: "🏗️"
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
    segment: "B2B SaaS",
    idea: "Security Suite",
    bonus: { category: "Engineering", modifier: 0.15 },
    description: "Security products need top engineers"
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
    segment: "D2C Consumer",
    idea: "Marketplace",
    bonus: { category: "Sales", modifier: 0.1 },
    description: "Marketplaces need strong seller acquisition"
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
    description: "Fintech security needs top engineers"
  },
  {
    segment: "Fintech",
    idea: "AI Assistant",
    bonus: { category: "Engineering", modifier: 0.1 },
    description: "AI in finance requires tech depth"
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
    segment: "Healthtech",
    idea: "Mobile App",
    bonus: { category: "Product", modifier: 0.1 },
    description: "Patient apps need great UX"
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
    segment: "Edtech",
    idea: "AI Assistant",
    bonus: { category: "Engineering", modifier: 0.1 },
    description: "AI tutors need solid tech"
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
  },
  {
    segment: "Logistics",
    idea: "Analytics Platform",
    bonus: { category: "Engineering", modifier: 0.1 },
    description: "Route optimization needs tech"
  }
];

// Helper to find bonus for a segment + idea combo
function getSetupBonus(segmentName, ideaName) {
  return setupBonuses.find(
    b => b.segment === segmentName && b.idea === ideaName
  ) || null;
}

// ==========================================
// Iteration 6: Bot Teams Data
// ==========================================

// Bot problem statements - randomly assigned to bot teams
const botProblemStatements = [
  "AI-powered meal planning for busy families",
  "Blockchain-based credential verification for hiring",
  "Sustainable packaging marketplace for SMBs",
  "Remote team culture building platform",
  "Hyperlocal delivery network for pharmacies",
  "Mental health support app for college students",
  "Carbon footprint tracking for e-commerce",
  "Micro-learning platform for blue-collar workers",
  "Peer-to-peer equipment rental for construction",
  "Smart inventory management for kiranas",
  "Vernacular content creation tools for creators",
  "Electric vehicle charging station finder",
  "Gig worker benefits and insurance platform",
  "Farm-to-table marketplace for urban consumers",
  "Virtual events platform for regional businesses"
];

// Bot name word pools - combined to create unique 3-word names
const botNameAdjectives = [
  "Crimson", "Azure", "Golden", "Emerald", "Silver",
  "Cosmic", "Lunar", "Solar", "Stellar", "Quantum",
  "Swift", "Bold", "Bright", "Keen", "Prime"
];

const botNameNouns = [
  "Phoenix", "Falcon", "Tiger", "Dragon", "Wolf",
  "Spark", "Storm", "Wave", "Flux", "Pulse",
  "Nova", "Orbit", "Nexus", "Apex", "Core"
];

const botNameSuffixes = [
  "Labs", "Tech", "AI", "Systems", "Ventures",
  "Works", "Hub", "Studio", "Co", "Inc"
];

// Generate a unique bot name
function generateBotName(usedNames = []) {
  let attempts = 0;
  while (attempts < 50) {
    const adj = botNameAdjectives[Math.floor(Math.random() * botNameAdjectives.length)];
    const noun = botNameNouns[Math.floor(Math.random() * botNameNouns.length)];
    const suffix = botNameSuffixes[Math.floor(Math.random() * botNameSuffixes.length)];
    const name = `${adj} ${noun} ${suffix}`;

    if (!usedNames.includes(name)) {
      return name;
    }
    attempts++;
  }
  // Fallback with random number
  return `Bot Team ${Math.floor(Math.random() * 1000)}`;
}

// Get a random unused problem statement
function getRandomBotProblemStatement(usedStatements = []) {
  const available = botProblemStatements.filter(s => !usedStatements.includes(s));
  if (available.length === 0) {
    return botProblemStatements[Math.floor(Math.random() * botProblemStatements.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
