// Pure formatting + CLI-parsing rules for a social post. No network, no env, no
// agent state — every function here is input → output, which is exactly why they
// live in their own module: `src/agents/content.ts` calls main() at module load,
// so anything left in that file cannot be imported by a test without launching a
// real run (scrapes, Gemini calls, a Telegram send). Rather than guard the
// entrypoint of a cron that fires three times a day, the testable parts moved
// here. `npm run content-test` exercises this file directly.
import { PLATFORMS } from '../context/brand.js';
import type { Slot } from '../context/brand.js';

// --- Length rules -----------------------------------------------------------
// Two KINDS of limit, and the difference decides who gets to act on it:
//
//   • A PLATFORM ceiling (X 280, LinkedIn 3000) is absolute. Over it the post
//     cannot be published at all, so code trims it — a trimmed post beats an
//     unpublishable one.
//   • A HOUSE target (LinkedIn 400–1100) is style. A 1,600-char LinkedIn post
//     publishes fine; it just gets folded behind "…see more". Cutting a good
//     argument in half to satisfy our own preference makes the post worse, so code
//     only WARNS and the human decides. Pushing the draft back into range is the
//     editor pass's job — it sits upstream and, unlike a regex, can rewrite.
//
// Before this module existed, "400–1100 chars" was stated in the drafting prompt,
// the judge prompt and brand.ts, and checked in none of them: advertised three
// times, enforced zero. The numbers now come from PLATFORMS so the prompt and the
// check cannot drift apart.

/** Hard ceiling on X. Trim at the last sentence end that fits; if not even one
 *  sentence fits, trim at the last word boundary. (Belts and braces — the prompt
 *  already asks for ≤ softMax.) */
export function enforceXLimit(post: string): string {
  const max = PLATFORMS.x.hardLimit;
  if (post.length <= max) return post;
  const cut = post.slice(0, max - 2);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd > 120) return cut.slice(0, sentenceEnd + 1);
  const wordEnd = cut.lastIndexOf(' ');
  return wordEnd > 0 ? cut.slice(0, wordEnd) : cut;
}

/** Trim to `max` chars at the most natural boundary available: a paragraph break
 *  first, then a sentence end, then a word. The fractions stop it from throwing
 *  away most of the post to find a pretty cut — if the only paragraph break sits
 *  at 10%, a word-boundary cut at 99% keeps far more of the writing. */
export function trimToBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const para = cut.lastIndexOf('\n\n');
  if (para > max * 0.6) return cut.slice(0, para).trimEnd();
  const sentenceEnd = Math.max(
    cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '),
    cut.lastIndexOf('.\n'), cut.lastIndexOf('!\n'), cut.lastIndexOf('?\n'),
  );
  if (sentenceEnd > max * 0.5) return cut.slice(0, sentenceEnd + 1).trimEnd();
  const wordEnd = cut.lastIndexOf(' ');
  return (wordEnd > 0 ? cut.slice(0, wordEnd) : cut).trimEnd();
}

/** Enforce LinkedIn's own 3,000-character ceiling, preserving the hashtags.
 *
 *  A LinkedIn post ENDS with its hashtag block, so a naive tail-trim would delete
 *  exactly the part the brand rules require. Detach the block, trim the body to
 *  leave room for it, then put it back. */
export function enforceLinkedInLimit(post: string): string {
  const max = PLATFORMS.linkedin.hardLimit;
  if (post.length <= max) return post;
  const tail = post.match(/(\s*(?:#[A-Za-z0-9_]+[ \t]*)+)$/)?.[1] ?? '';
  // Absurd case: the hashtag block alone overflows. Nothing worth preserving.
  if (!tail || tail.length >= max) return trimToBoundary(post, max);
  const body = post.slice(0, post.length - tail.length);
  return (trimToBoundary(body, max - tail.length) + tail).trimEnd();
}

/** Is the LinkedIn post outside our HOUSE range? Returns a short note for the
 *  human reviewer, or null when it's in range. A warning, never a mutation — see
 *  the note at the top of this section. */
export function linkedInLengthNote(post: string): string | null {
  const { min, softMax, hardLimit } = PLATFORMS.linkedin;
  const n = post.length;
  if (n < min) return `only ${n} chars — under our ${min}-char target, reads thin for LinkedIn`;
  if (n > hardLimit) return `${n} chars — over LinkedIn's own ${hardLimit}-char ceiling`;
  if (n > softMax) return `${n} chars — over our ${softMax}-char target, LinkedIn will fold it behind "…see more"`;
  return null;
}

// --- CLI override parsing ---------------------------------------------------

/** One parsed CLI override. `value: null` = the flag was absent (the caller uses
 *  its normal automatic value); `error` non-null = the flag was present but
 *  unusable, and the caller must refuse to run. */
export interface ArgResult<T> {
  value: T | null;
  error: string | null;
}

/**
 * Parse `--day=N`, where N must be a whole number in 1..cycleDays.
 *
 * This used to be `Number(arg) || cycleDayFor(now)`, which swallowed three
 * different mistakes in complete silence:
 *   • `--day=0`   → Number('0') is 0, which is FALSY, so `||` quietly replaced the
 *                   request with today's day.
 *   • `--day=abc` → NaN, also falsy, same silent replacement.
 *   • `--day=99`  → truthy, so it sailed through to dayPlan(99), which falls back
 *                   to CALENDAR[0]. The run then drafted DAY 1's topic while every
 *                   label — the console line and the Telegram header — announced
 *                   "Calendar day 99/30". A wrong post that looks right is worse
 *                   than no post at all.
 *
 * And this is not merely a local convenience flag: the GitHub Actions workflow
 * exposes both `day` and `slot` as workflow_dispatch inputs, so a typo in the run
 * dialog reaches production. Refusing to run is the right answer there — a red run
 * tells the operator to retype, whereas a silent fallback hands the reviewer the
 * wrong day's content looking entirely correct.
 */
export function parseDayArg(args: string[], cycleDays: number): ArgResult<number> {
  const arg = args.find((a) => a.startsWith('--day='));
  if (!arg) return { value: null, error: null };
  const raw = arg.slice('--day='.length).trim();
  // Whole digits only: rejects '', '2.7', '-3', '1e2', 'abc' — each of which used
  // to silently become "today" or a nonexistent calendar day.
  if (!/^\d+$/.test(raw)) {
    return { value: null, error: `--day="${raw}" is not a whole number (expected 1..${cycleDays})` };
  }
  const n = Number(raw);
  if (n < 1 || n > cycleDays) {
    return { value: null, error: `--day=${n} is outside the calendar (expected 1..${cycleDays})` };
  }
  return { value: n, error: null };
}

/** Parse `--slot=NAME` against the allowed slots. Same contract as parseDayArg.
 *  A typo like `--slot=morrning` used to fall through to the wall-clock slot,
 *  quietly running a slot nobody asked for and marking THAT one delivered. */
export function parseSlotArg(args: string[], slots: readonly Slot[]): ArgResult<Slot> {
  const arg = args.find((a) => a.startsWith('--slot='));
  if (!arg) return { value: null, error: null };
  const raw = arg.slice('--slot='.length).trim().toLowerCase();
  if (!(slots as readonly string[]).includes(raw)) {
    return { value: null, error: `--slot="${raw}" is not a slot (expected ${slots.join(' | ')})` };
  }
  return { value: raw as Slot, error: null };
}
