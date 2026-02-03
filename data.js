// ESOP Wars - Game Data

// Employee Cards (18 total for main auction + 3 reserve for secondary)
const employeeCards = [
  // Engineering (4 cards)
  {
    id: 1,
    name: "Priya Sharma",
    role: "Backend Engineer",
    category: "Engineering",
    hardSkill: 0.7,
    softSkills: { Resilience: 0.6, Communication: 0.4 }
  },
  {
    id: 2,
    name: "Arjun Patel",
    role: "Frontend Developer",
    category: "Engineering",
    hardSkill: 0.6,
    softSkills: { Adaptability: 0.7, "Pressure Handling": 0.5 }
  },
  {
    id: 3,
    name: "Kavya Reddy",
    role: "DevOps Engineer",
    category: "Engineering",
    hardSkill: 0.8,
    softSkills: { "Pressure Handling": 0.8 }
  },
  {
    id: 4,
    name: "Rohan Mehta",
    role: "Data Engineer",
    category: "Engineering",
    hardSkill: 0.65,
    softSkills: { Resilience: 0.5, Leadership: 0.4 }
  },

  // Product (4 cards)
  {
    id: 5,
    name: "Ananya Krishnan",
    role: "Product Manager",
    category: "Product",
    hardSkill: 0.75,
    softSkills: { Communication: 0.8, Leadership: 0.6 }
  },
  {
    id: 6,
    name: "Vikram Singh",
    role: "UX Designer",
    category: "Product",
    hardSkill: 0.6,
    softSkills: { Adaptability: 0.7, Communication: 0.6 }
  },
  {
    id: 7,
    name: "Meera Iyer",
    role: "Product Analyst",
    category: "Product",
    hardSkill: 0.55,
    softSkills: { "Pressure Handling": 0.5, Resilience: 0.6 }
  },
  {
    id: 8,
    name: "Aditya Nair",
    role: "Growth PM",
    category: "Product",
    hardSkill: 0.7,
    softSkills: { Leadership: 0.5 }
  },

  // Sales (4 cards)
  {
    id: 9,
    name: "Neha Gupta",
    role: "Sales Lead",
    category: "Sales",
    hardSkill: 0.8,
    softSkills: { Communication: 0.9, "Pressure Handling": 0.7 }
  },
  {
    id: 10,
    name: "Rahul Verma",
    role: "Account Executive",
    category: "Sales",
    hardSkill: 0.6,
    softSkills: { Resilience: 0.8, Adaptability: 0.5 }
  },
  {
    id: 11,
    name: "Shreya Joshi",
    role: "Business Development",
    category: "Sales",
    hardSkill: 0.65,
    softSkills: { Communication: 0.7, Leadership: 0.4 }
  },
  {
    id: 12,
    name: "Karthik Rao",
    role: "Enterprise Sales",
    category: "Sales",
    hardSkill: 0.75,
    softSkills: { "Pressure Handling": 0.6 }
  },

  // Ops (3 cards)
  {
    id: 13,
    name: "Divya Menon",
    role: "Operations Manager",
    category: "Ops",
    hardSkill: 0.7,
    softSkills: { Resilience: 0.7, Adaptability: 0.6 }
  },
  {
    id: 14,
    name: "Amit Kumar",
    role: "Supply Chain Lead",
    category: "Ops",
    hardSkill: 0.6,
    softSkills: { "Pressure Handling": 0.8, Communication: 0.5 }
  },
  {
    id: 15,
    name: "Pooja Desai",
    role: "Customer Success",
    category: "Ops",
    hardSkill: 0.55,
    softSkills: { Communication: 0.8, Resilience: 0.6 }
  },

  // Finance (3 cards)
  {
    id: 16,
    name: "Sanjay Kapoor",
    role: "Finance Manager",
    category: "Finance",
    hardSkill: 0.75,
    softSkills: { "Pressure Handling": 0.7, Leadership: 0.5 }
  },
  {
    id: 17,
    name: "Ritu Agarwal",
    role: "Financial Analyst",
    category: "Finance",
    hardSkill: 0.65,
    softSkills: { Adaptability: 0.5, Resilience: 0.6 }
  },
  {
    id: 18,
    name: "Varun Bhatia",
    role: "Accounts Lead",
    category: "Finance",
    hardSkill: 0.5,
    softSkills: { Communication: 0.6, "Pressure Handling": 0.5 }
  }
];

// Reserve employees for secondary auction (3 cards)
const reserveEmployees = [
  {
    id: 19,
    name: "Tanvi Shah",
    role: "Full Stack Developer",
    category: "Engineering",
    hardSkill: 0.85,
    softSkills: { Adaptability: 0.8, "Pressure Handling": 0.7 }
  },
  {
    id: 20,
    name: "Nikhil Saxena",
    role: "Head of Sales",
    category: "Sales",
    hardSkill: 0.9,
    softSkills: { Leadership: 0.8, Communication: 0.9 }
  },
  {
    id: 21,
    name: "Ishita Malhotra",
    role: "Strategy Lead",
    category: "Product",
    hardSkill: 0.8,
    softSkills: { Leadership: 0.7, Resilience: 0.6 }
  }
];

// Market Condition Cards (4 cards)
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
      Adaptability: 0.1
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
      Adaptability: 0
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
      Adaptability: 0.2
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
      Adaptability: 0.15
    }
  }
];

// Exit Cards (3 types)
const exitCards = [
  {
    id: 1,
    name: "IPO",
    multiplier: 2.5,
    description: "You ring the bell! Public markets reward your journey with maximum returns."
  },
  {
    id: 2,
    name: "M&A",
    multiplier: 2.0,
    description: "Acquired by a tech giant. Solid exit with great synergies."
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

// Market Segment Cards (6 total)
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
