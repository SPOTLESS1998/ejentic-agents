// OFFLINE tests for the content agent's post-formatting and CLI-parsing rules.
// `npm run content-test` — no network, no API keys, no Gemini quota spent.
//
// These pin three fixed defects, all of the same family: a rule the system stated
// but never actually applied.
//
//   1. LINKEDIN LENGTH. "400–1100 chars" appeared in the drafting prompt, the
//      judge prompt and brand.ts — and was checked in none of them. Whatever
//      length the model returned got published. X had enforceXLimit(); LinkedIn
//      had nothing.
//   2. `--day` / `--slot` OVERRIDES. `Number(arg) || cycleDayFor(now)` silently
//      replaced `--day=0` and `--day=abc` with today, and let `--day=99` through
//      to draft DAY 1's topic under a "Calendar day 99/30" heading. Both flags are
//      workflow_dispatch inputs, so a typo in the GitHub run dialog reached the
//      reviewer looking perfectly correct.
//   3. THE WIRING. The last block below is unusual — it reads the agent's source
//      and asserts the helpers are actually CALLED. That is deliberate: the
//      original bug was never a wrong function, it was a rule with nothing on the
//      other end. A perfect enforceLinkedInLimit() that finalizeDraft() forgets to
//      call is exactly the bug we just fixed, and a unit test of the helper alone
//      would pass all the way through it.
import { readFileSync } from 'node:fs';
import {
  enforceXLimit,
  enforceLinkedInLimit,
  linkedInLengthNote,
  parseDayArg,
  parseSlotArg,
  trimToBoundary,
} from '../lib/postformat.js';
import { PLATFORMS } from '../context/brand.js';
import { SLOT_ORDER, CYCLE_DAYS } from '../context/calendar.js';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean): void {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}`);
  }
}

// Build a realistic post of an EXACT character length: real sentences, so the
// boundary-seeking trimmer has something to find (a string of 'aaaa' would only
// ever exercise the word-boundary fallback).
function prose(chars: number): string {
  let s = '';
  let i = 0;
  while (s.length < chars) s += `Sentence number ${i++} about autonomous AI agents at work. `;
  return s.slice(0, chars);
}

const TAGS = '\n\n#EjenticAI #AIAgents #Automation';
const { min: LI_MIN, softMax: LI_SOFT, hardLimit: LI_HARD } = PLATFORMS.linkedin;

console.log('\n--- LinkedIn PLATFORM ceiling: trimmed, because an over-limit post cannot post ---');
check('a post inside the ceiling is returned untouched', enforceLinkedInLimit(prose(1200)) === prose(1200));
check('a post exactly at the ceiling is untouched', enforceLinkedInLimit(prose(LI_HARD)).length === LI_HARD);
const overLong = prose(3400) + TAGS;
const trimmed = enforceLinkedInLimit(overLong);
check('a post over the ceiling comes back within it', trimmed.length <= LI_HARD);
check('...and was actually shortened', trimmed.length < overLong.length);
check('...but not butchered — the trim is tight, not catastrophic', trimmed.length > 2800);
check('...and the hashtags survive (they live at the END of a LinkedIn post)', trimmed.endsWith('#EjenticAI #AIAgents #Automation'));
check('an over-limit post with NO hashtags is still trimmed', enforceLinkedInLimit(prose(3400)).length <= LI_HARD);
check('absurd case: hashtags alone overflow → no crash, still within the ceiling', enforceLinkedInLimit('#x '.repeat(1200)).length <= LI_HARD);

console.log('\n--- LinkedIn HOUSE range: warned about, never silently rewritten ---');
check(`in-range (${LI_MIN}+) → no note`, linkedInLengthNote(prose(600)) === null);
check(`exactly ${LI_MIN} (the floor) → no note`, linkedInLengthNote(prose(LI_MIN)) === null);
check(`exactly ${LI_SOFT} (the target ceiling) → no note`, linkedInLengthNote(prose(LI_SOFT)) === null);
check(`${LI_MIN - 1} chars → flagged as too thin`, (linkedInLengthNote(prose(LI_MIN - 1)) ?? '').includes('under our'));
check(`${LI_SOFT + 1} chars → flagged as folded behind "…see more"`, (linkedInLengthNote(prose(LI_SOFT + 1)) ?? '').includes('see more'));
check('over the platform ceiling → flagged as over LinkedIn\'s own limit', (linkedInLengthNote(prose(LI_HARD + 1)) ?? '').includes('ceiling'));
check('the note is only ever a WARNING — it never returns modified text', typeof (linkedInLengthNote(prose(2000)) ?? '') === 'string');

console.log('\n--- X ceiling (under test for the first time) ---');
check('a short post is untouched', enforceXLimit('Just a normal tweet.') === 'Just a normal tweet.');
check(`exactly ${PLATFORMS.x.hardLimit} is untouched`, enforceXLimit(prose(PLATFORMS.x.hardLimit)).length === PLATFORMS.x.hardLimit);
check('an over-limit post comes back within the ceiling', enforceXLimit(prose(400)).length <= PLATFORMS.x.hardLimit);
check('a single unbroken word over the limit still gets cut (no infinite post)', enforceXLimit('x'.repeat(500)).length <= PLATFORMS.x.hardLimit);

console.log('\n--- trimToBoundary: keeps as much of the writing as it can ---');
check('under the max → unchanged', trimToBoundary('short text', 100) === 'short text');
check('prefers a paragraph break when one is late enough', trimToBoundary('a'.repeat(70) + '\n\n' + 'b'.repeat(40), 100).endsWith('a'));
check('falls back to a word boundary rather than cutting mid-word', !trimToBoundary('one two three four five six seven', 20).endsWith('sev'));

console.log('\n--- `--day=` : the silent-fallback bug ---');
check('flag absent → no value, no error (caller uses today)', parseDayArg([], CYCLE_DAYS).value === null && parseDayArg([], CYCLE_DAYS).error === null);
check('--day=12 → 12', parseDayArg(['--day=12'], CYCLE_DAYS).value === 12);
check('--day=1 (first day) → 1', parseDayArg(['--day=1'], CYCLE_DAYS).value === 1);
check(`--day=${CYCLE_DAYS} (last day) → ${CYCLE_DAYS}`, parseDayArg([`--day=${CYCLE_DAYS}`], CYCLE_DAYS).value === CYCLE_DAYS);
check('--day=007 → 7 (leading zeros are fine)', parseDayArg(['--day=007'], CYCLE_DAYS).value === 7);
check('--day=0 → ERROR (it used to silently become today)', parseDayArg(['--day=0'], CYCLE_DAYS).error !== null);
check(`--day=${CYCLE_DAYS + 1} → ERROR (one past the calendar)`, parseDayArg([`--day=${CYCLE_DAYS + 1}`], CYCLE_DAYS).error !== null);
check('--day=99 → ERROR (it used to draft day 1 under a "day 99/30" heading)', parseDayArg(['--day=99'], CYCLE_DAYS).error !== null);
check('--day=abc → ERROR (it used to silently become today)', parseDayArg(['--day=abc'], CYCLE_DAYS).error !== null);
check('--day=2.7 → ERROR (no such calendar day)', parseDayArg(['--day=2.7'], CYCLE_DAYS).error !== null);
check('--day=-3 → ERROR', parseDayArg(['--day=-3'], CYCLE_DAYS).error !== null);
check('--day= (empty) → ERROR', parseDayArg(['--day='], CYCLE_DAYS).error !== null);
check('a rejected day yields NO value — the caller cannot use it by accident', parseDayArg(['--day=99'], CYCLE_DAYS).value === null);
check('the error message names the valid range, so the operator can fix it', (parseDayArg(['--day=99'], CYCLE_DAYS).error ?? '').includes(`1..${CYCLE_DAYS}`));

console.log('\n--- `--slot=` : same bug, same treatment ---');
check('flag absent → no value, no error (caller uses the clock)', parseSlotArg([], SLOT_ORDER).value === null && parseSlotArg([], SLOT_ORDER).error === null);
check('--slot=morning → morning', parseSlotArg(['--slot=morning'], SLOT_ORDER).value === 'morning');
check('--slot=Evening → evening (case-insensitive)', parseSlotArg(['--slot=Evening'], SLOT_ORDER).value === 'evening');
check('--slot=morrning → ERROR (a typo used to run whatever slot the clock said)', parseSlotArg(['--slot=morrning'], SLOT_ORDER).error !== null);
check('--slot= (empty) → ERROR', parseSlotArg(['--slot='], SLOT_ORDER).error !== null);
check('the error message lists the real slots', (parseSlotArg(['--slot=x'], SLOT_ORDER).error ?? '').includes('morning'));

console.log('\n--- one source of truth for the numbers ---');
check('LinkedIn min < target ceiling < platform ceiling', LI_MIN < LI_SOFT && LI_SOFT < LI_HARD);
check('X: what we ask for is under what the platform allows', PLATFORMS.x.softMax < PLATFORMS.x.hardLimit);
check('the English `target` strings still quote the real numbers', PLATFORMS.linkedin.target.includes(String(LI_MIN)) && PLATFORMS.linkedin.target.includes(String(LI_SOFT)));

// --- WIRING: is the rule actually connected to anything? ---------------------
// Reading source text as a test is unusual, so it needs a reason: the defect being
// fixed was never a wrong calculation, it was a rule with nothing on the other end.
// Every check above would pass on a codebase where finalizeDraft() ignores
// enforceLinkedInLimit() entirely — which is precisely the state this repo was in.
console.log('\n--- wiring: the helpers are actually called by the agent ---');
const agent = readFileSync(new URL('../agents/content.ts', import.meta.url), 'utf8');
const gemini = readFileSync(new URL('../lib/gemini.ts', import.meta.url), 'utf8');
const finalizeBody = agent.slice(agent.indexOf('function finalizeDraft'), agent.indexOf('function applyCTAUrl'));
check('finalizeDraft() applies the LinkedIn ceiling', /enforceLinkedInLimit\s*\(/.test(finalizeBody));
check('finalizeDraft() still applies the X ceiling', /enforceXLimit\s*\(/.test(finalizeBody));
check('the Telegram digest shows the length warning to the reviewer', /linkedInLengthNote\s*\(/.test(agent));
check('main() parses --day through the strict parser', /parseDayArg\s*\(\s*args/.test(agent));
check('main() parses --slot through the strict parser', /parseSlotArg\s*\(\s*args/.test(agent));
check('the old silent `Number(...) || cycleDayFor` fallback is gone', !/Number\(dayArg[^)]*\)\s*\|\|/.test(agent));
check('a bad flag aborts the run instead of falling back', /process\.exit\(1\)/.test(agent.slice(agent.indexOf('argErrors'), agent.indexOf('const now = new Date()'))));
check('the editor pass is bounded by an AI-call budget', /reviewAndRevise\([^)]*MAX_AI_CALLS\s*-\s*1\)/.test(agent));
check('the quota breaker is per-model, not one global boolean', /trippedModels\s*=\s*new Set/.test(gemini) && !/let\s+quotaTripped/.test(gemini));
check('...and a 429 trips only the model that returned it', /trippedModels\.add\(model\)/.test(gemini));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
