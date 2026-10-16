// Regenerate the fleet log index from the append-only run log.  `npm run regen-log`
//
// The index (data/AGENT-LOG.md) is derived state: it is a rendering of
// data/run-log.jsonl and nothing else. CI needs this as a separate step because
// two agents can finish at the same moment and both write the shared log. The
// append-only file merges cleanly (`.gitattributes` marks it `merge=union`, so a
// concurrent write unions the lines instead of conflicting), but the *rendering*
// of those unioned lines has to be rebuilt afterwards or the index goes stale.
//
// Why the index is not just left to the next run: the index is the thing a human
// reads. A stale index that omits a run is the exact failure the log exists to
// prevent — "is the agent quiet or broken?" answered with an out-of-date table.
import { render } from '../lib/runlog.js';
import { writeFileSync } from 'node:fs';

const out = render();
writeFileSync('data/AGENT-LOG.md', out);
const runs = (out.match(/^\| 20\d\d-/gm) ?? []).length;
console.log(`Regenerated data/AGENT-LOG.md — ${runs} run(s) on record.`);
