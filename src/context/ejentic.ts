// WHAT EJENTIC AI SELLS.
// Used two ways:
//   1. The Job agent's LEAD hunt: find businesses that need these services, and
//      draft a cold pitch offering them.
//   2. (Later) the Ejentic Researcher agent's context.
//
// Edit freely as the offering evolves.

export const EJENTIC = {
  name: 'Ejentic AI',
  tagline: 'An AI integration agency that builds autonomous agents and workflows for businesses.',
  founder: 'Ejeh Adanu Peter',
  contactEmail: 'Spotless1998@gmail.com',

  // The core industries the agency positions around.
  industries: ['Healthcare', 'Fintech', 'E-commerce', 'Logistics', 'SMEs'],

  // The concrete things Ejentic can build/sell. The LEAD hunt looks for
  // businesses whose pain these solve.
  services: [
    'Autonomous multilingual customer-service agents (embeddable in websites, apps, and social media) that greet clients, advertise services, answer questions, log complaints, and capture leads.',
    'Autonomous lead-generation systems that scrape the web for prospects, craft personalized pitches, and perform outreach.',
    'Custom agentic workflows that automate repetitive business operations to cut cost, error rate, and turnaround time.',
    'LLM integration and AI strategy for companies that want to adopt AI but do not know where to start.',
    'AI-powered market analysis and research tools.',
  ],

  // Signals that a business is a good LEAD (the agent looks for these).
  idealCustomerSignals: [
    'Handles high volumes of customer inquiries (support-heavy, multilingual audiences).',
    'Growing e-commerce or SME with lean staff that would benefit from automation.',
    'Actively hiring for support/ops roles (a sign they are drowning in manual work).',
    'Recently raised funding or expanding to new markets (budget + growth pressure).',
    'Complains publicly about slow support or manual processes.',
  ],

  // Who to prioritise when the LEAD search would otherwise be too broad.
  targetSegments: 'Global, but prioritize SMEs and e-commerce businesses.',
};

export function ejenticSummary(): string {
  const e = EJENTIC;
  return [
    `${e.name}: ${e.tagline}`,
    `Industries: ${e.industries.join(', ')}.`,
    `Services offered: ${e.services.join(' ')}`,
    `Ideal customer signals: ${e.idealCustomerSignals.join(' ')}`,
    `Priority segments: ${e.targetSegments}`,
  ].join('\n');
}
