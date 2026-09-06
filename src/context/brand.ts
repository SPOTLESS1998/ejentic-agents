// =============================================================================
//  BRAND — WHO EJENTIC AI IS ON SOCIAL MEDIA.
//
//  This is the content creator agent's voice, values, and guardrails. The agent
//  feeds this to Gemini so every post sounds like Ejentic — not like a generic
//  AI account. Edit freely as the brand evolves; it's written in plain English.
//
//  Paired with src/context/calendar.ts (the 30-day content pipeline, the
//  "what to post when") — brand.ts is the "how it should sound".
// =============================================================================

import { EJENTIC } from './ejentic.js';

// The three daily publishing windows (West Africa Time). The GitHub Actions
// cron fires inside each window; the agent picks the slot from the clock.
export type Slot = 'morning' | 'afternoon' | 'evening';

export const BRAND = {
  name: 'Ejentic AI',
  tagline: 'An AI integration agency that builds autonomous agents and workflows for businesses.',

  // The Wakanda-inspired vision the evening posts sell.
  vision:
    'Wakanda-inspired: we believe Africa — starting in Nigeria — can lead the world in AI. ' +
    'Not by copying Silicon Valley, but by building ethical, human-centric systems that ' +
    'speak our languages, respect our data, and augment our people instead of replacing them.',

  // What Ejentic sells. IMPORTED, not restated.
  //
  // This used to be a second hand-written copy of the list in
  // src/context/ejentic.ts, with the comment "kept in sync by hand" — and by the
  // time anyone checked, it wasn't: NOT ONE of the five entries matched. The two
  // lists had drifted into describing different companies. That mattered because
  // the two copies feed different agents: ejentic.ts drives the job agent's LEAD
  // hunt (which businesses to approach, and what to pitch them), while this file
  // drives the content agent (what we tell the public we sell). So the agency was
  // hunting customers for one menu while advertising another.
  //
  // A list that must be "kept in sync by hand" will eventually not be. One source
  // of truth removes the possibility rather than relying on someone remembering.
  services: EJENTIC.services,

  // Real proof the posts can point to. Never invent customer results — use these.
  proofPoints: [
    'Watch Agents in Action — multilingual support agent demo: https://youtu.be/gbXhZMTdnkM',
    'Watch Agents in Action — autonomous lead-generation system demo: https://youtu.be/4DcFtp6amjs',
  ],

  // Standing instruction to the AI: reference the video prototypes when
  // showcasing agents (per the social media manager's tip).
  videoAssets:
    'Whenever a post showcases our agents, mention the "Watch Agents in Action" video prototypes (see proof points) — people trust demos more than claims.',

  // The faces of Week 3 evenings. These are our named architects — quotes must
  // stay consistent with their obsessions below.
  founders: [
    { name: 'Sarah Jenkins', role: 'Head of Design & Experience', obsession: 'UI/UX — AI should feel invisible and effortless; conversations, not screens.' },
    { name: 'David Chen', role: 'Chief Architect', obsession: 'Seamless, resilient systems — fallbacks, uptime, graceful degradation.' },
    { name: 'Elena Rodriguez', role: 'Lead ML Engineer', obsession: 'Responsible AI — evaluation before shipping, bias checks, data hygiene as a moral duty.' },
  ],

  // Hashtag pools the AI may draw from (never all at once — 0-2 on X, 3-5 on LinkedIn).
  hashtags: {
    core: ['#EjenticAI', '#AIAgents', '#Automation', '#BuildWithAI'],
    nigeria: ['#NigeriaTech', '#AfricanTech', '#TechInAfrica', '#BuildInNigeria'],
    bySlot: {
      morning: ['#AI', '#FutureOfWork', '#AIExplained'],
      afternoon: ['#RAG', '#AIAutomation', '#CustomerExperience', '#ROI'],
      evening: ['#EthicalAI', '#WakandaForever', '#AfricanInnovation'],
    } as Record<Slot, string[]>,
  },

  cta: {
    consultation: 'Book a free consultation', // paired with CONSULTATION_URL at render time
    academy: 'Ejentic Academy — train your team on real AI systems',
  },
};

// The three-pillar daily structure. Every post is assigned to exactly one slot,
// and every slot has a fixed job, tone, and craft note. This is the guardrail
// that keeps the feed balanced: Why → What → Who, every single day.
export const SLOT_PROFILES: Record<
  Slot,
  { label: string; window: string; pillar: string; goal: string; tone: string; craft: string }
> = {
  morning: {
    label: 'Morning — Educational & Thought Leadership (The "Why")',
    window: '08:00–10:00 WAT',
    pillar: 'EDUCATE',
    goal: 'Educate the market, debunk AI fears, and establish authority.',
    tone: 'Authoritative, insightful, demystifying. Plain English, zero hype.',
    craft: 'Open with a question or a myth worth busting; explain simply; end with a soft takeaway — not a sales pitch.',
  },
  afternoon: {
    label: 'Afternoon — Technical Showcase & Solutions (The "What")',
    window: '13:00–15:00 WAT',
    pillar: 'SHOWCASE',
    goal: 'Pitch our specific enterprise offers (RAG, Multilingual Bots, Automation) and show ROI.',
    tone: 'Premium, technical but accessible, results-oriented.',
    craft: 'Name the offer, paint the before/after, quantify the ROI where the source material supports a number, invite a conversation.',
  },
  evening: {
    label: 'Evening — Vision, Culture & Societal Impact (The "Who")',
    window: '18:00–20:00 WAT',
    pillar: 'INSPIRE',
    goal: 'Sell the Ejentic Vision (Wakanda-inspired, ethical AI, the human-centric approach to data).',
    tone: 'Inspiring, visionary, culturally resonant, human-centric.',
    craft: 'Story first, African pride, end with belief — a CTA only when the calendar asks for one.',
  },
};

// Hard platform rules. X has a hard 280-char limit (we aim ≤270 for safety);
// LinkedIn rewards longer, structured storytelling.
export const PLATFORMS = {
  x: {
    name: 'X (Twitter)',
    target: '≤270 characters (hard limit 280). Punchy. 0–2 hashtags. At most one link, and only if it truly helps.',
  },
  linkedin: {
    name: 'LinkedIn',
    target: '400–1100 characters. 3–6 short paragraphs with line breaks. 3–5 hashtags at the end. End with a question or soft CTA.',
  },
};

// Compact string handed to Gemini (keeps the prompt small = cheaper).
export function brandSummary(): string {
  const b = BRAND;
  return [
    `${b.name}: ${b.tagline}`,
    `Vision: ${b.vision}`,
    `Services: ${b.services.join(' ')}`,
    `Proof points (never invent others): ${b.proofPoints.join(' | ')}`,
    `Founders: ${b.founders.map((f) => `${f.name} (${f.role}, obsessed with ${f.obsession})`).join(' | ')}`,
    `Hashtag pools: core ${b.hashtags.core.join(' ')}, Nigeria ${b.hashtags.nigeria.join(' ')}, by-slot ${Object.values(b.hashtags.bySlot).flat().join(' ')}`,
  ].join('\n');
}

// Compact brief for one slot's tone/craft rules.
export function slotBrief(slot: Slot): string {
  const p = SLOT_PROFILES[slot];
  return `${p.label} — pillar ${p.pillar}. Goal: ${p.goal} Tone: ${p.tone} Craft: ${p.craft} Window: ${p.window}.`;
}
