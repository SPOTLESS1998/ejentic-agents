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

  // THE SINGLE SOURCE OF TRUTH FOR WHAT WE SELL.
  //
  // src/context/brand.ts (the content agent's voice) now imports this list
  // instead of restating it. It used to keep its own hand-written copy, and the
  // two had silently drifted until not one of the five entries matched — the job
  // agent was hunting customers for one menu while the content agent advertised
  // a different one to the public. Edit here and both agents follow.
  //
  // This list is the MERGE of the two former copies: the named products came from
  // brand.ts, the lead-gen / AI-strategy / market-research entries from here.
  // Neither copy was complete on its own, so neither was simply discarded.
  //
  // The LEAD hunt looks for businesses whose pain these solve.
  services: [
    'Autonomous multilingual customer-service agents (Pidgin, Hausa, Yoruba, Igbo + English) embeddable in websites, apps, and social media — they greet clients, advertise services, answer questions, log complaints, and capture leads.',
    'The Air-Gapped RAG Vault — a secure internal knowledge base so employees can query private SOPs and documents without data leaking.',
    'Autonomous lead-generation systems that scrape the web for prospects, craft personalized pitches, and perform outreach.',
    'The Inbound Lead Concierge — an agent that greets website visitors 24/7, qualifies intent, and routes high-value prospects to human sales.',
    'Custom agentic workflows and enterprise automation (e.g. Stripe + CRM + LLM pipelines for invoicing, lead routing, and reconciliation) that cut cost, error rate, and turnaround time.',
    'LLM integration and AI strategy for companies that want to adopt AI but do not know where to start.',
    'AI-powered market analysis and research tools.',
    'Managed AI services & retainers — we deploy, train your team, and optimize long-term.',
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
