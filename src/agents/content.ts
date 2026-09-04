// =============================================================================
//  CONTENT CREATOR AGENT  (agent #4)
//
//  Runs three times a day (morning / afternoon / evening). Each run:
//    1. Reads the RESEARCH agent's findings from data/seen-research.json — the
//       same store the researcher commits back to the repo after every run.
//       This is the symbiosis: content is grounded in what research found.
//    2. Scrapes the full text of the freshest articles (Firecrawl, free tier).
//    3. Drafts TWO platform variations of the SAME topic — one for X (Twitter),
//       one for LinkedIn — using ONE batched Gemini call.
//    4. Drops the drafts on the dedicated content bot on Telegram. A human
//       reviews, edits, and publishes. It NEVER posts to social media itself.
//
//  Guardrails: the 30-day calendar in src/context/calendar.ts decides WHAT to
//  post about (3 pillars/day); src/context/brand.ts decides HOW it sounds.
//  After day 30 the cycle restarts, so the agent runs forever, autonomously —
//  even if Claude/Cline is offline. GitHub Actions is the engine, the repo is
//  the memory.
// =============================================================================
import { geminiJSON, quotaExhausted, isQuotaError } from '../lib/gemini.js';
import { resolveChatId, sendMessage, esc } from '../lib/telegram.js';
import { loadSeen, saveSeen, type SeenMap } from '../lib/store.js';
import { appendPost, type ContentPost } from '../lib/content-log.js';
import { pushToWebsite } from '../lib/ingest-bridge.js';
import { scrape } from '../lib/firecrawl.js';
import { cleanText } from '../lib/websearch.js';
import { optionalEnv } from '../lib/env.js';
import {
  BRAND,
  PLATFORMS,
  SLOT_PROFILES,
  type Slot,
  brandSummary,
  slotBrief,
} from '../context/brand.js';
import {
  cycleDayFor,
  dayPlan,
  currentSlot,
  calendarIsComplete,
  CYCLE_DAYS,
} from '../context/calendar.js';

// Where the research agent leaves its findings (shared, committed by CI).
const RESEARCH_SEEN_PATH = 'data/seen-research.json';
// This agent's own memory: which slots already have drafts delivered.
const CONTENT_SEEN_PATH = 'data/seen-content.json';

const RESEARCH_LOOKBACK_DAYS = Number(optionalEnv('RESEARCH_LOOKBACK_DAYS', '3'));
const RESEARCH_PER_RUN = Number(optionalEnv('RESEARCH_PER_RUN', '2'));
const CONSULTATION_URL = optionalEnv('CONSULTATION_URL', '');
// The durable log of everything we post (audit trail + weekly-newsletter source).
const CONTENT_POSTS_PATH = 'data/content-posts.json';
// Optional stronger model JUST for drafting (unset → shared default). The editor
// pass runs on the cheap default to save free-tier quota.
const CONTENT_MODEL = optionalEnv('CONTENT_MODEL', '') || undefined;
// The editor rewrites a draft once if it scores below this (out of 10).
const QUALITY_GATE = Number(optionalEnv('CONTENT_QUALITY_GATE', '8'));

interface ResearchSource {
  url: string;
  title: string;
  firstSeen: string;
}

interface Article extends ResearchSource {
  text: string; // scraped body (cleaned); '' if the scrape failed
}

interface Draft {
  angle: string; // one-line rationale: how the research feeds today's topic
  xPost: string; // X (Twitter) variation — ≤280 chars
  linkedinPost: string; // LinkedIn variation — same topic, longer form
  citedSourceUrls: string[]; // which sources the post actually draws on
}

// --- 1. THE SYMBIOSIS: mine the research agent's findings --------------------
// The researcher commits data/seen-research.json after every daily run. We read
// the last `lookbackDays` days, newest first — those are today's raw materials.
function readResearchSources(lookbackDays: number): ResearchSource[] {
  const seen: SeenMap = loadSeen(RESEARCH_SEEN_PATH);
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const sources: ResearchSource[] = [];
  for (const [url, entry] of Object.entries(seen)) {
    if (entry.label !== 'RESEARCH') continue;
    if (new Date(entry.firstSeen).getTime() < cutoff) continue;
    sources.push({ url, title: entry.title, firstSeen: entry.firstSeen });
  }
  // Newest first; fall back to all-time if the last few days were quiet.
  sources.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  if (sources.length === 0) {
    for (const [url, entry] of Object.entries(seen)) {
      if (entry.label === 'RESEARCH') sources.push({ url, title: entry.title, firstSeen: entry.firstSeen });
    }
    sources.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  }
  return sources;
}

// Rotate through the pool so morning/afternoon/evening don't reuse the same
// articles, and day-to-day starts at a different offset. Deterministic.
function pickSources(pool: ResearchSource[], count: number, date: Date, slot: Slot): ResearchSource[] {
  if (pool.length === 0) return [];
  const dayKey = date.toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  if (slot === 'afternoon') h = (h + 7) >>> 0;
  if (slot === 'evening') h = (h + 13) >>> 0;
  const offset = pool.length > 0 ? h % pool.length : 0;
  const picked: ResearchSource[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    picked.push(pool[(offset + i) % pool.length]);
  }
  return picked;
}

// --- 2. Read the articles (free Firecrawl scrapes, sanitized before the AI) --
async function fetchArticles(sources: ResearchSource[]): Promise<Article[]> {
  const articles: Article[] = [];
  for (const s of sources) {
    const raw = await scrape(s.url, 4000); // never throws; '' on failure
    const text = raw ? cleanText(raw).slice(0, 3500) : '';
    articles.push({ ...s, text });
    console.log(`  ${text ? 'read' : 'unreadable'}: ${s.title.slice(0, 60)} (${s.url})`);
  }
  return articles;
}

// --- 3. Draft both platform variations in ONE batched Gemini call ------------
// The calendar topic is non-negotiable; the research makes it fresh. Platform
// limits are stated in the prompt and re-checked in code below.
async function draftPost(slot: Slot, cycleDay: number, articles: Article[]): Promise<Draft> {
  const plan = dayPlan(cycleDay).slots[slot];
  const theme = dayPlan(cycleDay).theme;

  const material = articles.length
    ? articles
        .map(
          (a, i) =>
            `SOURCE ${i + 1}: ${a.title}\nURL: ${a.url}\nCONTENT:\n${a.text || '(could not be read — use only the title)'}`,
        )
        .join('\n\n---\n\n')
    : '(No readable research material today — write from the topic brief and brand knowledge only, and cite nothing.)';

  const prompt = `You are the content director for ${BRAND.name}. Draft today's social posts.

BRAND (voice, services, proof, founders — use, never contradict):
${brandSummary()}

TODAY'S ASSIGNMENT (from the 30-day content calendar — you MUST post about EXACTLY this topic):
- Cycle day ${cycleDay} of ${CYCLE_DAYS}, theme: "${theme}"
- Slot: ${slotBrief(slot)}
- MANDATORY TOPIC: ${plan.topic}
- Treatment guidance: ${plan.guidance}

RESEARCH MATERIAL gathered by our research agent (ground the post in this where it fits — make the post feel current and credible, but the calendar topic is still the star):
${material}

HARD RULES:
1. Both variations cover the SAME topic and angle — they are platform adaptations, not different posts.
2. X (Twitter) version: ${PLATFORMS.x.target} If you include a link, only one, and only a source URL below.
3. LinkedIn version: ${PLATFORMS.linkedin.target} Hashtags at the very end.
4. Use ONLY facts present in the topic brief, brand notes, or source content. NEVER invent statistics, customer names, client results, or quotes. Founder quotes must match the founders listed in the brand notes.
5. If the slot calls for a consultation CTA, end with: "${BRAND.cta.consultation}${CONSULTATION_URL ? ': ' + CONSULTATION_URL : ''}"
6. No emojis on X except at most one; LinkedIn may use 2-3 tasteful ones. No markdown headers. Plain text with line breaks for LinkedIn.
7. Written by humans, for humans — no "As an AI", no corporate filler, no hype like "revolutionary/game-changing".

Return STRICT JSON exactly like:
{"angle":"<one line: how today's research feeds the mandatory topic>",
 "xPost":"<the X post, <=270 chars, hashtags included>",
 "linkedinPost":"<the LinkedIn post, 400-1100 chars, hashtags at end>",
 "citedSourceUrls":["<only URLs you actually drew on>"]}`;

  const out = await geminiJSON<Draft>(prompt, 0.65, CONTENT_MODEL);
  return finalizeDraft(out);
}

// Turn a raw model object into a clean, rule-compliant Draft. Shared by the first
// draft AND the editor's rewrite, so both pass the same guardrails: real CTA
// link, no stray markdown, hashtag caps (X ≤2 / LinkedIn ≤5), X hard ≤280.
function finalizeDraft(out: Partial<Draft>): Draft {
  const xPost = enforceXLimit(capHashtags(sanitizePost(applyCTAUrl(String(out.xPost ?? '').trim())), 2));
  const linkedinPost = capHashtags(sanitizePost(applyCTAUrl(String(out.linkedinPost ?? '').trim())), 5);
  if (!xPost || !linkedinPost) throw new Error('Gemini returned an empty draft');
  return {
    angle: String(out.angle ?? '').trim(),
    xPost,
    linkedinPost,
    citedSourceUrls: Array.isArray(out.citedSourceUrls) ? out.citedSourceUrls.map(String).slice(0, 4) : [],
  };
}

// Swap the "CONSULTATION_URL" token for the real link; if no link is configured,
// remove the token and tidy any dangling "consultation:" leftovers.
function applyCTAUrl(text: string): string {
  const out = text.replace(/\bCONSULTATION_URL\b/g, CONSULTATION_URL);
  return CONSULTATION_URL ? out : out.replace(/consultation:\s*$/gim, 'consultation').trim();
}

// Strip stray markdown the model sometimes emits (headers, **bold**, `code`) —
// social platforms render it literally, which looks amateurish. Conservative:
// removes only formatting syntax, never words.
function sanitizePost(text: string): string {
  return text
    .replace(/^\s*#{1,6}\s+/gm, '') // markdown headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/__(.+?)__/g, '$1') // __bold__
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1') // `code`
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Keep at most `max` hashtags (X ≤2, LinkedIn ≤5). Extras beyond the cap are
// dropped, preserving the first ones the model chose.
function capHashtags(text: string, max: number): string {
  let kept = 0;
  return text
    .replace(/#[A-Za-z0-9_]+/g, (m) => (kept++ < max ? m : ''))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Hard 280 limit on X. Trim at the last sentence end that fits; if even one
// sentence doesn't fit, trim at the last word boundary. (Belts and braces —
// the prompt already asks for ≤270.)
function enforceXLimit(post: string): string {
  if (post.length <= 280) return post;
  const cut = post.slice(0, 278);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd > 120) return cut.slice(0, sentenceEnd + 1);
  const wordEnd = cut.lastIndexOf(' ');
  return wordEnd > 0 ? cut.slice(0, wordEnd) : cut;
}

// --- 3b. THE EDITOR PASS: score the draft, rewrite once if it's weak ---------
interface Verdict {
  score: number; // 1-10
  issues: string[]; // what's wrong
  fixHint: string; // the single highest-impact fix
}

// Score the draft against the pillar's job + our anti-hype / anti-fabrication
// bar. Runs on the cheap default model to save quota.
async function judgeDraft(slot: Slot, cycleDay: number, draft: Draft): Promise<Verdict> {
  const plan = dayPlan(cycleDay).slots[slot];
  const profile = SLOT_PROFILES[slot];
  const prompt = `You are a demanding social-media editor for ${BRAND.name}. Score this draft.

THE ASSIGNMENT IT MUST HIT:
- Pillar: ${profile.pillar} — ${profile.goal}
- Mandated topic: ${plan.topic}
- X rule: ${PLATFORMS.x.target}
- LinkedIn rule: ${PLATFORMS.linkedin.target}

THE DRAFT:
X: ${draft.xPost}
LinkedIn: ${draft.linkedinPost}

Score 1-10. Reserve 8+ for genuinely SPECIFIC, human copy that could not have been
posted by any generic AI account. Deduct hard for: hype words (revolutionary,
game-changing, unlock, unleash, supercharge, cutting-edge, "fast-paced world"),
fabricated stats/clients/quotes, generic filler, wrong pillar, LinkedIn outside
400-1100 chars, wrong hashtag counts, or the two variations not sharing one topic.

Return STRICT JSON: {"score":<1-10>,"issues":["..."],"fixHint":"<the single biggest fix>"}`;
  const v = await geminiJSON<Verdict>(prompt, 0.2);
  return {
    score: Number(v.score) || 0,
    issues: Array.isArray(v.issues) ? v.issues.map(String).slice(0, 6) : [],
    fixHint: String(v.fixHint ?? '').trim(),
  };
}

// Rewrite the draft once, guided by the editor's issues + top fix.
async function reviseDraft(slot: Slot, cycleDay: number, draft: Draft, verdict: Verdict): Promise<Draft> {
  const plan = dayPlan(cycleDay).slots[slot];
  const prompt = `Rewrite these social posts to fix an editor's critique. Keep what works; fix what's flagged.

ASSIGNMENT (unchanged): ${slotBrief(slot)}
MANDATORY TOPIC: ${plan.topic}
Platform rules — X: ${PLATFORMS.x.target} LinkedIn: ${PLATFORMS.linkedin.target}

EDITOR'S VERDICT: score ${verdict.score}/10.
Issues: ${verdict.issues.join('; ') || '(none listed)'}
Most important fix: ${verdict.fixHint || '(none)'}

CURRENT DRAFT:
X: ${draft.xPost}
LinkedIn: ${draft.linkedinPost}

Rules: never invent statistics, clients, or quotes; no hype words; both variations
cover the SAME topic; hashtags at the very end. Return STRICT JSON exactly like:
{"angle":"${draft.angle.replace(/"/g, "'")}","xPost":"<rewritten, <=270 chars>","linkedinPost":"<rewritten, 400-1100 chars>","citedSourceUrls":${JSON.stringify(draft.citedSourceUrls)}}`;
  const out = await geminiJSON<Draft>(prompt, 0.6, CONTENT_MODEL);
  return finalizeDraft(out);
}

// Judge the draft; if it's below the gate, rewrite once and keep the better of
// the two — never regress. Never throws: on any error/quota it returns the
// original draft and whatever score we managed (or null).
async function reviewAndRevise(
  slot: Slot,
  cycleDay: number,
  draft: Draft,
): Promise<{ draft: Draft; score: number | null }> {
  try {
    const first = await judgeDraft(slot, cycleDay, draft);
    console.log(`  editor: draft scored ${first.score}/10${first.issues.length ? ` (${first.issues[0]})` : ''}`);
    if (first.score >= QUALITY_GATE) return { draft, score: first.score };

    const revised = await reviseDraft(slot, cycleDay, draft, first);
    const second = await judgeDraft(slot, cycleDay, revised);
    console.log(`  editor: rewrite scored ${second.score}/10`);
    return second.score >= first.score
      ? { draft: revised, score: second.score }
      : { draft, score: first.score };
  } catch (e) {
    console.error(`  editor pass skipped: ${(e as Error).message}`);
    return { draft, score: null };
  }
}

// --- 4. Deliver the drafts to the dedicated content bot on Telegram ----------
function render(
  slot: Slot,
  cycleDay: number,
  draft: Draft,
): string {
  const plan = dayPlan(cycleDay).slots[slot];
  const profile = SLOT_PROFILES[slot];
  const sources = draft.citedSourceUrls.length
    ? draft.citedSourceUrls.map((u) => `🔗 ${esc(u)}`).join('\n')
    : '<i>(no research source cited for this post)</i>';

  return [
    `✍️ <b>Ejentic Content Studio</b> — ${profile.label.split('—')[0].trim()} · ${new Date().toISOString().slice(0, 10)}`,
    `📅 Calendar day <b>${cycleDay}/${CYCLE_DAYS}</b> — <i>${esc(dayPlan(cycleDay).theme)}</i>`,
    `🎯 <b>Topic:</b> ${esc(plan.topic)}`,
    `💡 <b>Angle:</b> ${esc(draft.angle) || '<i>(not given)</i>'}`,
    '',
    '━━━ 𝕏  <b>TWITTER</b> ━━━',
    `<blockquote>${esc(draft.xPost)}</blockquote>`,
    `<i>${draft.xPost.length} chars · limit 280</i>`,
    '',
    '━━━ 💼 <b>LINKEDIN</b> ━━━',
    `<blockquote>${esc(draft.linkedinPost)}</blockquote>`,
    `<i>${draft.linkedinPost.length} chars</i>`,
    '',
    '<b>Grounded in today\u2019s research:</b>',
    sources,
    '',
    '👁 <b>Drafts only.</b> A human reviews, edits, and publishes — this agent never posts to social media.',
  ].join('\n');
}

// --- Orchestration ------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Test overrides: --day=12 forces a calendar day, --slot=morning forces a slot.
  const dayArg = args.find((a) => a.startsWith('--day='));
  const slotOverride = args.find((a) => a.startsWith('--slot='))?.split('=')[1] as Slot | undefined;
  const now = new Date();
  const cycleDay = dayArg ? Number(dayArg.split('=')[1]) || cycleDayFor(now) : cycleDayFor(now);
  const slot: Slot =
    slotOverride && ['morning', 'afternoon', 'evening'].includes(slotOverride)
      ? slotOverride
      : currentSlot(now);

  if (!calendarIsComplete()) {
    console.error('Calendar is incomplete — every day 1..30 needs all three slots filled.');
    process.exit(1);
  }

  // The dedicated content bot (falls back to the main bot while it's unset).
  const token = optionalEnv('TELEGRAM_CONTENT_BOT_TOKEN');
  if (!token) console.error('ℹ️ TELEGRAM_CONTENT_BOT_TOKEN not set — using the main bot. Create the dedicated bot before going live.');
  // Dedicated chat id wins; otherwise resolve like the other agents (main chat
  // id env, then auto-detect from the bot's latest messages).
  const chatId = dryRun
    ? '(dry-run)'
    : optionalEnv('TELEGRAM_CONTENT_CHAT_ID') || (await resolveChatId(token || undefined));

  // Don't double-send a slot if a run repeats (manual trigger after a success).
  const seen = loadSeen(CONTENT_SEEN_PATH);
  const slotKey = `${now.toISOString().slice(0, 10)}:${slot}`;
  if (seen[slotKey] && !dryRun) {
    console.log(`${slotKey} already delivered — nothing to do.`);
    return;
  }

  console.log(`Content creator — calendar day ${cycleDay}/${CYCLE_DAYS}, slot: ${slot}`);

  // 1. Symbiosis: mine the research agent's findings, 2. read the articles.
  const pool = readResearchSources(RESEARCH_LOOKBACK_DAYS);
  console.log(`Research pool: ${pool.length} article(s) from the last ${RESEARCH_LOOKBACK_DAYS} day(s).`);
  const chosen = pickSources(pool, RESEARCH_PER_RUN, now, slot);
  const articles = await fetchArticles(chosen);

  // 3. Draft, then run the editor pass (judge → one guided rewrite → keep the
  //    higher-scoring of the two). Never leave the human with silence on failure.
  let degraded = false;
  let draft: Draft | null = null;
  let score: number | null = null;
  try {
    draft = await draftPost(slot, cycleDay, articles);
    const reviewed = await reviewAndRevise(slot, cycleDay, draft);
    draft = reviewed.draft;
    score = reviewed.score;
  } catch (e) {
    if (isQuotaError(e)) degraded = true;
    console.error(`drafting failed: ${(e as Error).message}`);
  }
  if (quotaExhausted()) degraded = true;

  if (dryRun) {
    console.log('\n===== DRY RUN (nothing sent, seen-store NOT written) =====\n');
    if (draft) console.log(render(slot, cycleDay, draft).replace(/<\/?blockquote>/g, '"').replace(/<[^>]+>/g, ''));
    else console.log('No draft produced (see errors above).');
    return;
  }

  if (draft) {
    await sendMessage(chatId, render(slot, cycleDay, draft), token || undefined);
    seen[slotKey] = { firstSeen: new Date().toISOString(), label: 'CONTENT', title: `Day ${cycleDay} ${slot}` };
    saveSeen(CONTENT_SEEN_PATH, seen);
    // Persist the finished post: audit trail + the weekly newsletter's source.
    const plan = dayPlan(cycleDay);
    const post: ContentPost = {
      date: now.toISOString().slice(0, 10),
      slot,
      cycleDay,
      theme: plan.theme,
      pillar: SLOT_PROFILES[slot].pillar,
      topic: plan.slots[slot].topic,
      angle: draft.angle,
      xPost: draft.xPost,
      linkedinPost: draft.linkedinPost,
      citedSourceUrls: draft.citedSourceUrls,
      score,
      createdAt: new Date().toISOString(),
    };
    appendPost(CONTENT_POSTS_PATH, slotKey, post);
    // Mirror it to the website's weekly-newsletter store. Best-effort and
    // env-gated (see ingest-bridge.ts) — a no-op until CONTENT_INGEST_URL /
    // CONTENT_INGEST_TOKEN are set, and it never throws into this flow.
    await pushToWebsite(post);
  } else {
    const day = now.toISOString().slice(0, 10);
    await sendMessage(
      chatId,
      `✍️ <b>Ejentic Content Studio</b> — ${day}\n⚠️ I couldn\u2019t draft the ${slot} post this run (${degraded ? 'free AI quota spent' : 'an error occurred'}). I\u2019ll retry on the next run.`,
      token || undefined,
    );
  }

  console.log(`\nDone. Slot ${slot} of calendar day ${cycleDay}. Seen-store size: ${Object.keys(seen).length}.`);
}

main().catch((e) => {
  console.error('Content creator agent failed:', e);
  process.exit(1);
});