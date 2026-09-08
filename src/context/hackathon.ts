// WHAT THE HACKATHON AGENT IS HUNTING FOR.
// Plain-English preferences fed to the AI so it can judge whether a hackathon
// is one we could genuinely enter and win — and skip the ones that aren't.
// Edit freely as plans change.
//
// The builder's name and the agency name come from the gitignored profile files
// (profile/candidate.json, profile/company.json), so this file holds no
// personal details of its own.

import { CANDIDATE } from './candidate.js';
import { EJENTIC } from './ejentic.js';

export const HACKATHON = {
  builder: `${CANDIDATE.name}, building as ${EJENTIC.name} (solo, or with a small team if the hackathon matches us).`,

  // What we can realistically ship in a hackathon window.
  skills: [
    'Autonomous AI agents & multi-agent orchestration (our core strength — see the demo videos)',
    'RAG / knowledge-base systems with retrieval, guardrails and citations',
    'LLM integration and prompt engineering',
    'TypeScript/Node, Python/FastAPI, Next.js — full small-product slices, not just prototypes',
    'Telegram/X bots, web scraping and automation pipelines',
    'Multilingual AI (Pidgin, Hausa, Yoruba, Igbo + English) customer-facing agents',
  ],

  // The sweet spot. Web3 × AI events are the priority (they run often on X,
  // prizes are real, and agent projects fit both worlds) — but a strong
  // pure-AI hackathon counts too.
  sweetSpot:
    'PRIORITY: Web3 × AI hackathons — AI agents on-chain, DeFi/crypto assistants, token or market analytics agents, DeSci, AI × trading — including hackathons HOSTED ON X/TWITTER by protocols and communities. ALSO welcome: pure-AI hackathons (agents, RAG, automation) with real prizes.',

  // Where they live: hosted on X/Twitter, or on the usual platforms.
  platforms:
    'Anywhere — X/Twitter-hosted events, DoraHacks, Devpost, ETHGlobal, Coinbase, BNB Chain, Solana, Arbitrum, base, and protocol/community hackathons generally.',

  // What makes one worth reporting.
  mustHave: [
    'Registration is still open (deadline not clearly passed).',
    'We can participate ONLINE — fully online, or a genuine online/remote track.',
    'A real prize: cash, USDC/stablecoin, or a token/points prize with clear value (the goal is prize money, not just swag).',
    'Theme matches the skills above — AI/agent builds preferred; Web3/AI crossover is the sweet spot.',
    'Enough runway: the deadline is at least a few days out so building something real is possible.',
  ],

  // Hard skips.
  avoid: [
    'Hackathons whose registration/submission deadline has clearly already passed.',
    'Onsite-only events in cities outside Nigeria with no online track.',
    'No-prize events (swag/certificate only).',
    'Anything that excludes Nigerian/African/global participants (residency or KYC restrictions that block us).',
    'Vague aggregator/listicle pages with no single named hackathon to enter.',
    'Pure giveaways/airdrop farms where there is nothing to actually build.',
  ],
};

// Compact string handed to the AI (keeps the prompt small = cheaper).
export function hackathonSummary(): string {
  const h = HACKATHON;
  return [
    `Builder: ${h.builder}`,
    `Skills we can ship: ${h.skills.join(' ')}`,
    `Sweet spot: ${h.sweetSpot}`,
    `Platforms/where: ${h.platforms}`,
    `Must have: ${h.mustHave.join(' ')}`,
    `Avoid: ${h.avoid.join(' ')}`,
  ].join('\n');
}
