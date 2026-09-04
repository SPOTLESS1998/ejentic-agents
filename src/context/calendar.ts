// =============================================================================
//  CONTENT CALENDAR — THE 30-DAY PIPELINE (the guardrail).
//
//  This is the "course outline" the content creator agent follows. Every day has
//  three slots (morning / afternoon / evening) and every slot names its topic
//  and how to treat it. The agent NEVER wanders outside this outline — the
//  research agent's daily findings are only raw material to make each topic
//  fresh, specific, and current.
//
//  When day 30 is done, the cycle restarts at day 1 (cycle 2, 3, …) — the
//  calendar stays the backbone, while fresh research keeps each cycle new.
//
//  Edit freely: this file is the single source of truth for what we post.
// =============================================================================

import { optionalEnv } from '../lib/env.js';
import type { Slot } from './brand.js';

export interface SlotPlan {
  topic: string; // the mandatory subject — the agent must post on THIS
  guidance: string; // how to treat it (format, angle, visual assets…)
}

export interface DayPlan {
  day: number;
  theme: string; // what the whole day is about
  slots: Record<Slot, SlotPlan>;
}

// The fixed order of slots within a day.
export const SLOT_ORDER: Slot[] = ['morning', 'afternoon', 'evening'];

// How many days one full cycle runs (a "content month").
export const CYCLE_DAYS = 30;

// The campaign's Day 1 (ISO date). The cycle day is counted FORWARD from here so
// the 30-day narrative always runs in order (Day 1 → 2 → 3 …). CI/production can
// re-anchor the launch with the CONTENT_CYCLE_START repo variable; this constant
// is the version-controlled default so the order is never left to chance.
export const DEFAULT_CYCLE_START = '2026-09-03';

export const CALENDAR: DayPlan[] = [
  // ===========================================================================
  //  WEEK 1 — THE FOUNDATION: "Who is Ejentic AI?"
  // ===========================================================================
  {
    day: 1,
    theme: 'The Grand Introduction',
    slots: {
      morning: {
        topic: 'Welcome to Ejentic AI — our mission to dive deep into the uncertain waters of AI to find solutions for businesses and society.',
        guidance: 'High-level introduction post. First impression: confident, warm, human. No product pitch yet.',
      },
      afternoon: {
        topic: 'The AI Transformation Journey — our 5-phase approach: Assessment, Pilot, Deployment, Training, Optimization.',
        guidance: 'Carousel-style breakdown (numbered list works on both platforms). Show the discipline behind the delivery.',
      },
      evening: {
        topic: 'The Wakanda Vision — why we believe Africa has what it takes to lead the world in technology, starting in Nigeria.',
        guidance: 'Passionate text post. Cultural pride, conviction, no jargon. This is the founding myth of the brand.',
      },
    },
  },
  {
    day: 2,
    theme: 'The Holistic Approach',
    slots: {
      morning: {
        topic: 'Why tech needs a "herbalist" approach — we look at businesses as ecosystems, diagnosing root causes before prescribing AI.',
        guidance: 'Use the herbalist metaphor with respect and wit. Diagnosis before prescription — that is the whole point.',
      },
      afternoon: {
        topic: 'What is "Adaptogenic AI"? Our philosophy of building resilient AI systems that adapt to market changes, not rigid deployments.',
        guidance: 'Coin the term boldly, then explain it plainly. Rigid bots break; adaptive agents survive.',
      },
      evening: {
        topic: 'Data Nurturing (Soil Quality) — your AI is only as good as your data, and why we prioritize data hygiene.',
        guidance: 'Farming/soil metaphor. Evening tone: reflective. The soil decides the harvest.',
      },
    },
  },
  {
    day: 3,
    theme: 'The Problem with Basic AI',
    slots: {
      morning: {
        topic: 'Why ChatGPT isn\u2019t enough for your enterprise — the limitations of public LLMs (hallucinations, data leaks).',
        guidance: 'Demystify without trashing AI. Name the two failure modes concretely; end with "so what do serious teams do?"',
      },
      afternoon: {
        topic: 'Introducing the Air-Gapped RAG Vault — our internal knowledge base offer: employees query private SOPs securely.',
        guidance: 'Product showcase. Explain air-gapped simply; the before/after is "SOPs in a drawer" → "answers in seconds, zero leaks".',
      },
      evening: {
        topic: 'Digital Detox & Pruning — streamline existing processes and cut redundant software before adding AI.',
        guidance: 'Counter-intuitive wisdom: AI on top of chaos automates the chaos. Reflective, practical evening post.',
      },
    },
  },
  {
    day: 4,
    theme: 'Bridging the Cultural Gap',
    slots: {
      morning: {
        topic: 'Customer support must speak the language of the streets — the problem with robotic, Westernized chatbots in African markets.',
        guidance: 'Cultural insight post. The market is multilingual; the bots mostly aren\u2019t. That gap is money left on the table.',
      },
      afternoon: {
        topic: 'Showcase: Localized Multilingual Agents — our bots that fluently speak Pidgin, Hausa, Yoruba, and Igbo.',
        guidance: 'Product showcase. Point to the "Watch Agents in Action" multilingual demo (https://youtu.be/gbXhZMTdnkM).',
      },
      evening: {
        topic: 'Human-Centric Design — how we build AI to augment human capabilities (upskilling), rather than simply displacing workers.',
        guidance: 'The jobs fear is real; address it head-on with empathy. Augmentation over replacement.',
      },
    },
  },
  {
    day: 5,
    theme: 'The Invisible Hand of Automation',
    slots: {
      morning: {
        topic: 'How much time do you spend copy-pasting? An interactive post about mundane administrative tasks.',
        guidance: 'Poll/interactive on X; question-led on LinkedIn. Let the audience admit the pain themselves.',
      },
      afternoon: {
        topic: 'Enterprise Workflow Automation — case study: connecting Stripe, a CRM, and an LLM to automate invoicing and lead routing.',
        guidance: 'Concrete architecture walkthrough. Name the tools. This is what "automation" actually means in practice.',
      },
      evening: {
        topic: 'Societal Impact: Shifting the Nature of Work — when humans don\u2019t do repetitive tasks, we unlock creativity and complex problem-solving.',
        guidance: 'Visionary evening post. Automation as liberation, not layoffs.',
      },
    },
  },
  {
    day: 6,
    theme: 'Demystifying the Buzzwords',
    slots: {
      morning: {
        topic: 'AI Glossary: What is a "Vector Database"? A simple, visual explanation of how we store company knowledge (Pinecone/pgvector).',
        guidance: 'Teach one term, perfectly. Analogy-first (a library that searches by meaning, not spelling).',
      },
      afternoon: {
        topic: 'The Inbound Lead Concierge — our AI greets visitors 24/7, qualifies intent, and routes high-value prospects to human sales reps.',
        guidance: 'Product showcase. The 2 AM lead nobody answered is the hook; the demo (https://youtu.be/4DcFtp6amjs) is the proof.',
      },
      evening: {
        topic: 'Ethical AI — algorithmic transparency, preventing bias, and our commitment to equitable outcomes.',
        guidance: 'Values post. Specific commitments, not vague virtue. This is who we are when nobody is watching.',
      },
    },
  },
  {
    day: 7,
    theme: 'Weekly Recap & Engagement',
    slots: {
      morning: {
        topic: 'Q&A Sunday — answer the top 3 most common questions businesses ask us about getting started with AI.',
        guidance: 'Pick the three real questions (cost, "will it replace my staff", "where do I start"). Crisp answers.',
      },
      afternoon: {
        topic: 'Demo Reel — a short video snippet of our "Watch Agents in Action" prototypes (Lead Gen or Multilingual Support).',
        guidance: 'Point to the demo videos: https://youtu.be/gbXhZMTdnkM and https://youtu.be/4DcFtp6amjs. Let the products speak.',
      },
      evening: {
        topic: 'The Week Ahead — a teaser of next week\u2019s discussions, focusing on specific industry use-cases.',
        guidance: 'Short, energizing, forward-looking. List the industries coming in week 2 as a hook.',
      },
    },
  },
  // ===========================================================================
  //  WEEK 2 — INDUSTRY DEEP DIVES (Finance, HR, Logistics, Support, Sales, Legal)
  //  Focus: pitching "Business Automation Potential" per industry.
  // ===========================================================================
  {
    day: 8,
    theme: 'Finance',
    slots: {
      morning: {
        topic: 'Fraud detection AI vs. legacy systems — why rule-based checks lose against adaptive agents.',
        guidance: 'Educational. Contrast static rules vs. adaptive models; end with "trust is the real currency".',
      },
      afternoon: {
        topic: 'AI Payment Reconciliation via Vision AI for OPay/Moniepoint receipts.',
        guidance: 'Showcase with local payment rails — this is deeply Nigerian and deeply practical. Name the pain: manual receipt matching.',
      },
      evening: {
        topic: 'Trust and security in Fintech.',
        guidance: 'Evening reflection: automation without trust is worthless. Tie to our ethical-AI stance.',
      },
    },
  },
  {
    day: 9,
    theme: 'HR & Recruiting',
    slots: {
      morning: {
        topic: 'The bias in human recruiting — we like to think humans are neutral; the data says otherwise.',
        guidance: 'Debunk the "humans are fairer" myth gently. Set up the case for structured, auditable screening.',
      },
      afternoon: {
        topic: 'Automated resume screening & onboarding KYC.',
        guidance: 'Showcase our HR automation. Before/after: 400 CVs, one weekend vs. weeks. Mention fairness safeguards.',
      },
      evening: {
        topic: 'Sentiment analysis for employee well-being.',
        guidance: 'Human-centric angle: technology that listens so leaders can act. Care with privacy — anonymize.',
      },
    },
  },
  {
    day: 10,
    theme: 'Operations & Logistics',
    slots: {
      morning: {
        topic: 'Supply chain fragility — the pandemic showed us what happens when operations run on spreadsheets and prayer.',
        guidance: 'Educational. Concrete African logistics examples; keep it vivid and plain.',
      },
      afternoon: {
        topic: 'Predictive maintenance and route optimization.',
        guidance: 'Showcase the numbers: downtime avoided, fuel saved, deliveries on time. ROI-first.',
      },
      evening: {
        topic: 'Sustainable growth and ecological balance via AI.',
        guidance: 'Visionary: efficiency IS sustainability. Waste less, deliver more, harm less.',
      },
    },
  },
  {
    day: 11,
    theme: 'Customer Service',
    slots: {
      morning: {
        topic: 'The cost of a lost lead at 2 AM — nobody answers, the buyer moves on.',
        guidance: 'Story-led. Calculate the silent leak: unanswered inquiries = unpaid invoices.',
      },
      afternoon: {
        topic: 'The multi-agent architecture: Researcher, Writer, Editor bots working together.',
        guidance: 'Showcase how WE orchestrate agents (this very system is the proof). Technical but accessible.',
      },
      evening: {
        topic: 'Empathetic AI design.',
        guidance: 'Reflective: empathy is a design decision. A complaint handled well builds more loyalty than no complaint at all.',
      },
    },
  },  {
    day: 12,
    theme: 'Marketing & Sales',
    slots: {
      morning: {
        topic: 'Why cold outreach is dying — and what is replacing it.',
        guidance: 'Educational. Generic blasts are noise; relevance is the new volume.',
      },
      afternoon: {
        topic: 'The Autonomous Researcher agent for competitive analysis.',
        guidance: 'Showcase our own research agent as the product: it scans, verifies, and briefs daily. Real, not hypothetical.',
      },
      evening: {
        topic: 'Data privacy in marketing.',
        guidance: 'Evening values post: personalization must never become surveillance. The ethical line we hold.',
      },
    },
  },
  {
    day: 13,
    theme: 'Legal & Compliance',
    slots: {
      morning: {
        topic: 'The terror of a 40-page contract — where do businesses actually lose money in legal review?',
        guidance: 'Relatable pain post. Time-to-answer is the hidden cost.',
      },
      afternoon: {
        topic: 'How Hybrid RAG instantly finds indemnity clauses in uploaded PDFs.',
        guidance: 'Showcase the RAG Vault applied to legal work. Concrete: clause-level retrieval in seconds, on-prem.',
      },
      evening: {
        topic: 'Governance and Accountability.',
        guidance: 'Values: an AI decision you can\u2019t audit is a liability. Traceability is non-negotiable for us.',
      },
    },
  },
  {
    day: 14,
    theme: 'Weekly Recap & African Tech Excellence',
    slots: {
      morning: {
        topic: 'Favorite case study of the week — the one post that shows what automation really changes.',
        guidance: 'Pick the strongest industry story from days 8\u201313 and retell it in one punchy narrative.',
      },
      afternoon: {
        topic: 'The numbers behind the week — lessons and takeaways from seven days of industry deep dives.',
        guidance: 'Recap carousel/list. Patterns across industries: the same leaks, the same fixes.',
      },
      evening: {
        topic: 'Weekend motivation on African tech excellence.',
        guidance: 'Pride and momentum. We are not catching up; we are building differently. Wakanda energy.',
      },
    },
  },
  // ===========================================================================
  //  WEEK 3 — THE "HOW-TO" & TECHNICAL TRANSPARENCY ("The Architects")
  //  Mornings: behind-the-scenes tips. Afternoons: our stack, playfully.
  //  Evenings: the founders' voices. Showing how we build = extreme trust.
  // ===========================================================================
  {
    day: 15,
    theme: 'Privacy by Architecture',
    slots: {
      morning: {
        topic: 'Why we use NVIDIA-hosted Llama 3 for extreme privacy instead of OpenAI.',
        guidance: 'Behind-the-scenes. Data never leaves the client\u2019s control — explain the trade-offs honestly.',
      },
      afternoon: {
        topic: 'A day in the life of Nova (our front-end agent).',
        guidance: 'Playful "day in the life" of a deployed agent: greets, qualifies, routes, logs. Link the demo video.',
      },
      evening: {
        topic: 'Sarah Jenkins on why UI/UX makes or breaks AI adoption.',
        guidance: 'Founder quote post. Sarah: "If users have to think about the AI, we failed."',
      },
    },
  },
  {
    day: 16,
    theme: 'Resilience Engineering',
    slots: {
      morning: {
        topic: 'How prompt engineering actually works — demystified.',
        guidance: 'Teach the craft simply: context, constraints, examples, verification. No magic, just method.',
      },
      afternoon: {
        topic: 'How our fallback system works if a model goes down.',
        guidance: 'Playful resilience tour: primary model fails → backup takes over → the user never notices.',
      },
      evening: {
        topic: 'David Chen on building systems that never leave users stranded.',
        guidance: 'Founder quote post. David: "Downtime isn\u2019t an accident; it\u2019s a design choice you didn\u2019t make."',
      },
    },
  },
  {
    day: 17,
    theme: 'RAG, Internally',
    slots: {
      morning: {
        topic: 'Anatomy of a RAG pipeline: from PDF to instant answers.',
        guidance: 'Step-by-step: chunk → embed → store (vector DB) → retrieve → answer with citations.',
      },
      afternoon: {
        topic: 'Meet our multilingual support agent — how it switches between Pidgin, Hausa, Yoruba & Igbo mid-conversation.',
        guidance: 'Showcase the language switching with a mini transcript. Link the demo.',
      },
      evening: {
        topic: 'Elena Rodriguez on evaluating AI before it ships.',
        guidance: 'Founder quote post. Elena: "We test agents like pilots — simulations before passengers."',
      },
    },
  },
  {
    day: 18,
    theme: 'How We Test',
    slots: {
      morning: {
        topic: 'Why we test agents like pilots: evals, simulations, and guardrails.',
        guidance: 'Educational. Introduce evals as the industry\u2019s flight simulator; quality is designed, not hoped for.',
      },
      afternoon: {
        topic: 'The agent toolbox we reach for (and why the boring choice usually wins).',
        guidance: 'Playful stack talk: simple, proven components over hype. Frugality as a feature.',
      },
      evening: {
        topic: 'Sarah Jenkins on designing conversations, not screens.',
        guidance: 'Founder quote post. The interface is the dialogue itself.',
      },
    },
  },  {
    day: 19,
    theme: 'Security Choices',
    slots: {
      morning: {
        topic: 'Air-gapped vs. cloud RAG: choosing by risk, not hype.',
        guidance: 'Decision-framework post. Regulated/secret data → air-gapped; public knowledge → cloud. Honest guidance.',
      },
      afternoon: {
        topic: 'From missed message to booked call: anatomy of our lead concierge.',
        guidance: 'Trace one real visitor journey through the agent, step by step, to a booked consultation.',
      },
      evening: {
        topic: 'David Chen on the unglamorous work: logs, retries, uptime.',
        guidance: 'Founder quote post. Reliability is a thousand boring decisions done right.',
      },
    },
  },
  {
    day: 20,
    theme: 'Clean Inputs, Trustworthy Outputs',
    slots: {
      morning: {
        topic: 'How we scrub prompt-injection and junk before AI ever sees it.',
        guidance: 'Behind-the-scenes security post: honeypots, hidden tokens, injection payloads — and why we strip them.',
      },
      afternoon: {
        topic: 'Workflow automation in the wild: Stripe + CRM + LLM, revisited step-by-step.',
        guidance: 'Deep-dive on the day-5 case study with more detail — reward the audience that\u2019s following along.',
      },
      evening: {
        topic: 'Elena Rodriguez on data hygiene as a moral duty.',
        guidance: 'Founder quote post. Bad data in → biased answers out; cleaning data is an ethical act.',
      },
    },
  },
  {
    day: 21,
    theme: 'Radical Transparency',
    slots: {
      morning: {
        topic: 'Behind the scenes: this very content is co-written by our agents (transparency post).',
        guidance: 'True story: the research agent scans daily; the content agent drafts from its findings; a human reviews and posts. Our pipeline IS the product demo.',
      },
      afternoon: {
        topic: 'Cost design: how we keep agents inside free tiers without cutting corners.',
        guidance: 'Frugal engineering as craft: batched AI calls, verification before spend, graceful degradation.',
      },
      evening: {
        topic: 'The builders\u2019 roundtable — Sarah, David & Elena on what\u2019s next.',
        guidance: 'Three short founder quotes woven into one reflective evening post.',
      },
    },
  },
  // ===========================================================================
  //  WEEK 4 — THE PUSH FOR PARTNERSHIP (Conversion Week)
  //  Mornings: Cost vs. Investment. Afternoons: SME vs. Enterprise playbook.
  //  Evenings: Direct CTAs — book the consultation.
  // ===========================================================================
  {
    day: 22,
    theme: 'Cost vs. Investment',
    slots: {
      morning: {
        topic: 'If an agent saves your team 120 hours a week, what does that cost you NOT to have it?',
        guidance: 'The ROI flip: reframe AI spend as money already leaking. Simple math beats hype.',
      },
      afternoon: {
        topic: 'The SME vs. Enterprise Playbook, part 1: quick-win automations for small businesses.',
        guidance: 'Showcase SME offers: lead concierge, invoice automation — live in days, not months.',
      },
      evening: {
        topic: 'Direct CTA: Ready to build smarter systems? Stop reading about AI and start implementing it.',
        guidance: 'Clean, confident call to action for a free consultation. No fluff. End with the consultation invitation.',
      },
    },
  },
  {
    day: 23,
    theme: 'The Playbook, Part 2',
    slots: {
      morning: {
        topic: 'The hidden invoice: what manual processes really cost per month.',
        guidance: 'Educational with a worksheet vibe: hours × rate × 12. Let them compute their own leak.',
      },
      afternoon: {
        topic: 'The SME vs. Enterprise Playbook, part 2: integrating with bureaucratic legacy systems.',
        guidance: 'Showcase enterprise approach: assessment, phased pilots, zero-disruption deployment.',
      },
      evening: {
        topic: 'Direct CTA: Your competitors are not waiting for perfect conditions.',
        guidance: 'Urgency without fear-mongering. Book the consultation while the advantage still exists.',
      },
    },
  },
  {
    day: 24,
    theme: 'Proof Before Promise',
    slots: {
      morning: {
        topic: 'Why we show demos before we show decks.',
        guidance: 'Educational/trust: claims are cheap; watchable prototypes are not. Link the demo videos.',
      },
      afternoon: {
        topic: 'Case walkthrough: from first call to working agent in 30 days.',
        guidance: 'Showcase the engagement model end-to-end. Concrete phases, concrete outcomes.',
      },
      evening: {
        topic: 'Direct CTA: Bring us your ugliest process. The one everyone hates.',
        guidance: 'Disarming, human CTA. The worst process is the best first project.',
      },
    },
  },
  {
    day: 25,
    theme: 'Objections, Answered',
    slots: {
      morning: {
        topic: '"Our data is too sensitive for AI" — the objection, and the air-gapped answer.',
        guidance: 'Handle the #1 objection head-on. The RAG Vault exists precisely for this.',
      },
      afternoon: {
        topic: '"We tried a chatbot and it embarrassed us" — why agent design makes the difference.',
        guidance: 'Showcase the difference between a bought bot and a designed agent: evals, tone, escalation to humans.',
      },
      evening: {
        topic: 'Direct CTA: A 30-minute conversation, zero obligation.',
        guidance: 'Lowest-friction CTA of the week. One clear link. Warm tone.',
      },
    },
  },  {
    day: 26,
    theme: 'The Math of Waiting',
    slots: {
      morning: {
        topic: 'Every month of delay compounds: the compounding cost of manual work.',
        guidance: 'Educational. Delay has a price curve; show the shape of it.',
      },
      afternoon: {
        topic: 'Retainer model: how we stick with clients long after deployment.',
        guidance: 'Showcase managed services: monitoring, retraining, optimization. Deployment is the starting line.',
      },
      evening: {
        topic: 'Direct CTA: The consultation is free. The indecision is not.',
        guidance: 'Sharp evening CTA. Respect the reader\u2019s intelligence; make the next step tiny.',
      },
    },
  },
  {
    day: 27,
    theme: 'Who This Is For',
    slots: {
      morning: {
        topic: 'The businesses we serve best — and the ones we honestly refer elsewhere.',
        guidance: 'Trust through honesty: name our ideal client and our disqualifiers. Authority comes from selectivity.',
      },
      afternoon: {
        topic: 'Multilingual support as market expansion: sell in the customer\u2019s language.',
        guidance: 'Showcase: Pidgin/Hausa/Yoruba/Igbo bots = new revenue from customers competitors can\u2019t reach.',
      },
      evening: {
        topic: 'Direct CTA: Book the free consultation — bring one process, leave with a plan.',
        guidance: 'Concrete promise for the call: one process in, one plan out. End with the consultation invitation.',
      },
    },
  },
  {
    day: 28,
    theme: 'Weekly Recap — The Partnership Week',
    slots: {
      morning: {
        topic: 'Recap: seven days of straight talk about ROI, objections, and readiness.',
        guidance: 'Recap the week\u2019s sharpest points. Position: partnership over pitch.',
      },
      afternoon: {
        topic: 'What an Ejentic partnership actually looks like: phases, check-ins, results.',
        guidance: 'Showcase the operating model — the relationship, not just the tech.',
      },
      evening: {
        topic: 'Direct CTA: The last push of partnership week — book your slot.',
        guidance: 'Close the week warmly but firmly. Consultation link. Gratitude.',
      },
    },
  },
  // ===========================================================================
  //  WEEK 5 — VISION FOR THE FUTURE (Days 29–30, cycle finale)
  // ===========================================================================
  {
    day: 29,
    theme: 'Where This Is Going',
    slots: {
      morning: {
        topic: 'Where is AI going in the next 12 months?',
        guidance: 'Trend forecast, grounded in the research agent\u2019s freshest findings. Bold but defensible.',
      },
      afternoon: {
        topic: 'Our managed AI services and retainer models — how we stick with clients long-term.',
        guidance: 'Showcase the long game: monitoring, retraining, optimization as a relationship.',
      },
      evening: {
        topic: 'A reflection on the Ejentic AI mission — how far we\u2019ve come and where we are taking Nigeria.',
        guidance: 'Gratitude + conviction. The journey is national, not just commercial.',
      },
    },
  },
  {
    day: 30,
    theme: 'The Grand Finale',
    slots: {
      morning: {
        topic: 'The Pre-mortem: what happens to a business that refuses to adopt AI by 2027?',
        guidance: 'A sober, respectful thought experiment — not fear-mongering. The cost of standing still.',
      },
      afternoon: {
        topic: 'The ultimate pitch for the Ejentic Academy — train your team on real AI systems.',
        guidance: 'Showcase the academy: upskilling as the bridge between fear and fluency.',
      },
      evening: {
        topic: 'A grand, cinematic post celebrating the team, the vision, and the future of Wakanda-inspired tech.',
        guidance: 'The finale. Cinematic language, pride, gratitude. End the cycle the way it began: with belief.',
      },
    },
  },
];

// =============================================================================
//  HELPERS — cycle math & slot lookup.
// =============================================================================

/**
 * Which calendar day (1..30) is "today" for a given date?
 * Day 1 of the cycle is the launch anchor (env CONTENT_CYCLE_START, ISO date,
 * e.g. "2026-09-03"; falls back to DEFAULT_CYCLE_START). The day is counted
 * FORWARD from there and wraps every 30 days, so the narrative always runs in
 * order. Dates on or before the anchor return Day 1.
 */
export function cycleDayFor(date: Date): number {
  // Count the cycle day FORWARD from a fixed launch anchor. We never fall back to
  // a random hash: an unset env used to scramble the 30-day narrative into a
  // different day every run (Day 18 one day, Day 10 the next), so followers never
  // saw the story in order. CONTENT_CYCLE_START overrides the built-in default.
  const start = optionalEnv('CONTENT_CYCLE_START') || DEFAULT_CYCLE_START;
  let startDay = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(startDay)) startDay = Date.parse(`${DEFAULT_CYCLE_START}T00:00:00Z`);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const elapsed = Math.floor((today - startDay) / 86_400_000);
  if (elapsed <= 0) return 1; // before/at launch → start the story at Day 1
  return (elapsed % CYCLE_DAYS) + 1;
}

/** The day plan for a given calendar day (1..30). */
export function dayPlan(cycleDay: number): DayPlan {
  const plan = CALENDAR.find((d) => d.day === cycleDay);
  // Belt and braces: CALENDAR must cover 1..CYCLE_DAYS.
  return plan ?? CALENDAR[0];
}

/** Which slot (morning/afternoon/evening) is the current run responsible for? */
export function currentSlot(date: Date): Slot {
  // The three daily crons fire at 08:03 / 13:03 / 18:03 UTC (09:03 / 14:03 /
  // 19:03 WAT). The OLD cutoffs put 13:00 UTC in the morning band, so the
  // afternoon SHOWCASE run resolved to "morning" and was swallowed by the dedup
  // gate — the sales pillar almost never fired. These wider bands map 13:xx →
  // afternoon and tolerate GitHub's cron delays. (Scheduled runs also get their
  // slot passed explicitly by the workflow; this is the local/manual fallback.)
  const hour = date.getUTCHours(); // CI machines run UTC; WAT = UTC+1
  if (hour < 13) return 'morning';   // 08:03 UTC / 09:03 WAT → EDUCATE
  if (hour < 18) return 'afternoon'; // 13:03 UTC / 14:03 WAT → SHOWCASE (sell)
  return 'evening';                  // 18:03 UTC / 19:03 WAT → INSPIRE
}

/** Sanity check used by the self-test: every day has all three slots. */
export function calendarIsComplete(): boolean {
  if (CALENDAR.length !== CYCLE_DAYS) return false;
  const days = new Set(CALENDAR.map((d) => d.day));
  if (days.size !== CYCLE_DAYS) return false;
  for (let i = 1; i <= CYCLE_DAYS; i++) {
    if (!days.has(i)) return false;
    const plan = CALENDAR.find((d) => d.day === i)!;
    for (const s of SLOT_ORDER) {
      if (!plan.slots[s]?.topic?.trim()) return false;
    }
  }
  return true;
}
