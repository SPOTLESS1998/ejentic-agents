// WHO THE JOB AGENT IS HUNTING FOR.
// This is a plain-English profile built from Ejeh Adanu Peter's resume. The agent
// feeds this to Gemini so it can judge whether a job genuinely fits — and draft
// an application email that speaks in the candidate's real voice and experience.
//
// To update your profile later, just edit the text below.

export const CANDIDATE = {
  name: 'Ejeh Adanu Peter',
  email: 'Spotless1998@gmail.com',
  phone: '+234-8114113800',
  location: 'Abuja, Nigeria',
  twitter: '@SpotlessEjeh',

  // One-line pitch used in email openers.
  headline: 'AI Solutions & Automation Engineer — I build autonomous AI agents that run with little to no supervision.',

  // Where he wants to work (drives the search queries).
  preferences: {
    remote: true,
    locationPreference: 'Remote, global. Prefers roles based OUTSIDE Nigeria (international companies), but remote-anywhere is ideal.',
    employmentTypes: ['Full-time', 'Contract'],
  },

  // The roles worth flagging. The agent matches loosely — a posting doesn't need
  // the exact title, just the same kind of work.
  targetRoles: [
    'AI Engineer',
    'AI Automation Engineer',
    'AI Agent Engineer / Agentic Systems Engineer',
    'Applied AI Engineer',
    'LLM / Prompt Engineer',
    'AI Solutions Engineer',
    'Automation Engineer (AI-focused)',
    'Forward-Deployed AI Engineer',
    'AI Developer (autonomous agents / workflows)',
  ],

  // Proof points the email draft can pull from.
  strengths: [
    'Designs and orchestrates autonomous AI agents that perform tasks with little to no supervision.',
    'Builds agentic workflows that optimize outcomes while minimizing cost, error rate, and execution time.',
    'LLM integration, prompt engineering, and multi-agent orchestration.',
    'Built an autonomous multilingual customer-service agent that receives clients, advertises services, answers questions, logs complaints, and captures leads — embeddable in websites, apps, and social media. Demo: https://youtu.be/gbXhZMTdnkM',
    'Built an autonomous lead-generation system that scrapes the web for prospects, crafts personalized sales pitches, and performs outreach. Demo: https://youtu.be/4DcFtp6amjs',
    'Independent technical trader & market analyst (Forex, crypto, stocks) with strict risk models — comfortable in high-frequency / algorithmic market-scanning contexts.',
    'Cross-domain background: graphics design, creative writing, sales & advertising, community management, finance & investment.',
  ],

  education:
    'B.A. Linguistics (Second Class Upper), Federal University of Jos. Researching Master’s programs in Machine Learning and Computational Linguistics.',

  // Hard filters the agent should respect when judging fit.
  dealbreakers: [
    'Not a senior/principal role requiring 8+ years — he is early-career but highly capable.',
    'Skip roles requiring on-site presence in a specific non-Nigerian city with no remote option.',
    'Skip unpaid roles.',
  ],
};

// A compact string version handed to Gemini (keeps the prompt small = cheaper).
export function candidateSummary(): string {
  const c = CANDIDATE;
  return [
    `Name: ${c.name} (${c.location}). ${c.headline}`,
    `Wants: ${c.preferences.employmentTypes.join(' or ')}, ${c.preferences.locationPreference}`,
    `Target roles: ${c.targetRoles.join(', ')}.`,
    `Strengths: ${c.strengths.join(' ')}`,
    `Education: ${c.education}`,
    `Dealbreakers: ${c.dealbreakers.join(' ')}`,
  ].join('\n');
}
