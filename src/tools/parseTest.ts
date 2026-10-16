// OFFLINE test for the Gemini JSON parser.  `npm run parse-test`
//
// Why this exists: on 2026-10-16 the JOB pass aborted with
//   "Expected double-quoted property name in JSON at position 32 (line 1 column 33)"
// and the whole batch of screened candidates was discarded — while the LEAD pass,
// in the SAME run, off the SAME key, returned four good leads. One bad character
// threw away a batch of work, and the error message named a character position
// instead of the defect.
//
// The repair that fixes this is the dangerous part. A JSON repair that is broad
// enough to fix anything is broad enough to silently rewrite the data, and the
// data here is an outreach email a human is about to send to a stranger. So the
// corruption cases below matter MORE than the repair cases: it is better for the
// parser to throw than to hand back a draft with the sender's own words changed.
import { safeParse, repairJson } from '../lib/gemini.js';

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
/** Assert the repair left the string untouched — the anti-corruption check. */
function unchanged(name: string, input: string): void {
  check(name, repairJson(input) === input);
}

// ---------------------------------------------------------------------------
console.log('\n--- clean input is never rewritten ---');
const clean = '{"picks":[{"i":0,"genuine":true,"confidence":95}]}';
unchanged('already-valid JSON passes through byte-for-byte', clean);
check('and it parses', (safeParse<{ picks: unknown[] }>(clean).picks.length) === 1);

// ---------------------------------------------------------------------------
console.log('\n--- the defects a model actually emits ---');
check(
  'trailing comma before } is dropped',
  safeParse<{ a: number }>('{"a":1,}').a === 1,
);
check(
  'trailing comma before ] is dropped',
  safeParse<number[]>('[1,2,]').length === 2,
);
check(
  'a bare key is quoted',
  safeParse<{ picks: unknown[] }>('{picks:[]}').picks.length === 0,
);
check(
  'a // comment is stripped',
  safeParse<{ a: number }>('{"a":1 // why\n}').a === 1,
);
check(
  'prose around the JSON is ignored',
  safeParse<{ a: number }>('Here you go:\n{"a":1}\nHope that helps!').a === 1,
);
check(
  'a ```json fence is unwrapped',
  safeParse<{ a: number }>('```json\n{"a":1}\n```').a === 1,
);
check(
  'nested trailing commas are all dropped',
  safeParse<{ a: { b: number[] } }>('{"a":{"b":[1,2,],},}').a.b.length === 2,
);
check(
  'the real-world job payload shape parses',
  safeParse<{ picks: { i: number }[] }>(
    '{"picks":[{"i":0,"genuine":true,"confidence":90,"role":"AI Engineer",},]}',
  ).picks[0].i === 0,
);

// ---------------------------------------------------------------------------
// The important half. Each of these strings contains a sequence that a naive
// regex repair would rewrite. They are all VALID JSON, so a correct parser must
// hand them back exactly as they arrived.
console.log('\n--- the repair must NOT rewrite string content ---');
const commaBeforeBrace = '{"body":"Thanks for your time, }"}';
unchanged('a comma before } inside a string survives', commaBeforeBrace);
check(
  'and its content is intact',
  safeParse<{ body: string }>(commaBeforeBrace).body === 'Thanks for your time, }',
);

const wordColon = '{"body":"Hi, team: we build agents"}';
unchanged('a `word:` inside a string is not quoted', wordColon);
check(
  'and its content is intact',
  safeParse<{ body: string }>(wordColon).body === 'Hi, team: we build agents',
);

const url = '{"body":"see https://ejentic.ai for more"}';
unchanged('a // inside a string is not treated as a comment', url);
check(
  'and the URL survives',
  safeParse<{ body: string }>(url).body.includes('https://ejentic.ai'),
);

const escaped = '{"body":"He said \\"yes, }\\" to it"}';
unchanged('an escaped quote does not close the string early', escaped);
check(
  'and the escaped body parses',
  safeParse<{ body: string }>(escaped).body === 'He said "yes, }" to it',
);

const brackets = '{"body":"use [1,2,] and {a,} literally"}';
unchanged('bracket-ish text inside a string is untouched', brackets);

const smartInside = '{"body":"He said \u201Cship it\u201D and left"}';
unchanged('smart quotes INSIDE a string are content, not delimiters', smartInside);
check(
  'and they survive verbatim',
  safeParse<{ body: string }>(smartInside).body === 'He said \u201Cship it\u201D and left',
);

// A deliberate limitation, asserted so it is a decision and not a surprise.
// Smart quotes ARE used as delimiters in prose constantly, so repairing them
// would corrupt real email bodies — see the note above repairJson. This input is
// therefore left to fail loudly, which is the correct trade.
let smartMsg = '';
try {
  safeParse('{\u201Ca\u201D:1}');
} catch (e) {
  smartMsg = (e as Error).message;
}
check(
  'smart-quoted KEYS are left to fail loudly, not guessed at',
  /Could not parse Gemini JSON output/.test(smartMsg),
);

// ---------------------------------------------------------------------------
console.log('\n--- hopeless input fails loudly, and says what was wrong ---');
let msg = '';
try {
  safeParse('this is not json at all, not even close');
} catch (e) {
  msg = (e as Error).message;
}
check('unparseable input throws', msg.length > 0);
check('the error names the failure', /Could not parse Gemini JSON output/.test(msg));
check('the error includes raw text to diagnose with', /Raw head:/.test(msg));
check('the error reports the length', /\(\d+ chars\)/.test(msg));

// ---------------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
