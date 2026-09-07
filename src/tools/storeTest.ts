// OFFLINE test for the seen-store suppression logic.  `npm run store-test`
//
// This is the memory that decides whether an opportunity is "new". It went wrong
// quietly: every screened candidate was remembered forever, so once the job
// boards had served their small, slow-changing set of AI roles, nothing was ever
// eligible again and the daily digest went empty. The fix (store.ts) gives a key
// a kind-specific time-to-live. These assertions pin that behaviour so it can't
// silently regress into a permanent mute again.
import { isSuppressed, SEEN_TTL_DAYS, type SeenEntry } from '../lib/store.js';

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

const now = Date.parse('2026-09-07T12:00:00Z');
const daysAgo = (d: number): string => new Date(now - d * 864e5).toISOString();
const entry = (d: number, kind?: 'reported' | 'screened'): SeenEntry =>
  ({ firstSeen: daysAgo(d), label: 'JOB', title: 'x', ...(kind ? { kind } : {}) }) as SeenEntry;

console.log('\n--- reported: long suppression (we already messaged the user) ---');
check('5 days ago → still suppressed', isSuppressed(entry(5, 'reported'), now));
check('one day inside the window → still suppressed', isSuppressed(entry(SEEN_TTL_DAYS.reported - 1, 'reported'), now));
check('one day past the window → free to resurface', !isSuppressed(entry(SEEN_TTL_DAYS.reported + 1, 'reported'), now));

console.log('\n--- screened: short suppression (Gemini judged it, we did NOT send) ---');
check('3 days ago → still suppressed (no re-judging tomorrow)', isSuppressed(entry(3, 'screened'), now));
check('one day inside the window → still suppressed', isSuppressed(entry(SEEN_TTL_DAYS.screened - 1, 'screened'), now));
check('one day past the window → ELIGIBLE again (the dry-pipeline fix)', !isSuppressed(entry(SEEN_TTL_DAYS.screened + 1, 'screened'), now));

console.log('\n--- back-compat: entries written before `kind` existed ---');
check('legacy inside reported window → suppressed', isSuppressed(entry(5), now));
check('legacy past reported window → free', !isSuppressed(entry(SEEN_TTL_DAYS.reported + 1), now));

console.log('\n--- edge cases ---');
check('unknown key (undefined) → never suppressed', !isSuppressed(undefined, now));
check('unparseable date → stays suppressed (fail safe, no crash)', isSuppressed({ firstSeen: 'not-a-date', label: 'JOB', title: 'x', kind: 'screened' }, now));
check('a reported key outlives a screened one', SEEN_TTL_DAYS.reported > SEEN_TTL_DAYS.screened);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
