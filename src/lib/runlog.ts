// =============================================================================
//  RUN LOG — the fleet's shared, append-only record, with an index on top.
//
//  Why this exists: each of the five agents keeps a `seen-*.json` suppression
//  map and nothing else. That answers one question — "have I already sent
//  this?" — and it cannot answer the questions you actually ask when something
//  looks wrong:
//
//    • Is the Job agent quiet because the boards are dry, or because it broke
//      three weeks ago? Both runs print the same Telegram line ("No new
//      qualifying opportunities today"). Both look identical from the outside.
//      A dead agent and an idle agent are indistinguishable, and that is the
//      worst property a 24/7 system can have.
//    • What did the whole fleet do this week?
//    • When did the content agent last lose a run to the free-tier quota?
//
//  A suppression map is state. This is a diary. You need both, and the repo
//  only had the first one.
//
//  Shape borrowed from the "index on top" pattern in Jared Rhodenizer's
//  ai-memory-vault (CC BY-SA 4.0): a log whose first screen is a scannable
//  index, written before the detail, so a reader gets the shape of the last
//  month in five seconds instead of reading everything. Here the reader is
//  usually you at 6am deciding whether the fleet is healthy.
//
//  Two files:
//    data/run-log.jsonl — the record. Append-only. One JSON object per run.
//    data/AGENT-LOG.md  — GENERATED from it, rewritten on every append.
//                         Never hand-edit. Open this one.
//
//  TIMESTAMPS ARE UTC AND SAY SO. GitHub Actions runners are UTC; pretending
//  otherwise would put a wrong local time in a permanent record, which is worse
//  than an honest UTC one. Every rendered time is labelled UTC.
//
//  NEVER THROWS. Logging is diagnostics, and diagnostics must not be able to
//  take down a working agent at 6am. Every failure is swallowed, reported on
//  stderr, and the return value is a boolean the caller is free to ignore.
// =============================================================================
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface RunEntry {
  /** Which agent ran: job | scholarship | research | content | hackathon. */
  agent: string;
  /** How many items were actually sent to the user. 0 is a normal, meaningful value. */
  reported: number;
  /** Candidates gathered before the seen-store filter, when the agent counts them. */
  found?: number;
  /**
   * How many candidates were actually handed to the AI screener.
   *
   * Added 2026-10-16, because `found` and `reported` between them cannot tell
   * two completely different zeros apart. Every agent returns early when the
   * seen-store has already suppressed everything the boards returned, and that
   * early return happens BEFORE any screening — so a run that screened nothing
   * was being logged with the reason "nothing passed screening", which is a
   * statement about a screen that never ran. 37 found / 0 screened / 0 reported
   * means "the boards had nothing new"; 37 found / 37 screened / 0 reported
   * means "it all matched nothing". Those need different fixes.
   */
  screened?: number;
  /** True when quota or network cut the run short — reported 0 is then not real information. */
  degraded?: boolean;
  /**
   * Error messages from passes that threw and were swallowed by the caller's
   * `safeRun`. A non-empty list means the run did not complete, so its reported
   * count is not a measurement — it is the absence of one.
   *
   * This exists because `degraded` is set only for quota errors, and an auth
   * failure (HTTP 401, revoked key) is not a quota error. Without this field
   * such a run is recorded as "nothing sent", which reads as "the agent looked
   * and found nothing" when the truth is "the agent never got to look".
   */
  aborted?: string[];
  /** One line: why the run ended the way it did. Most valuable when reported is 0. */
  reason?: string;
  /** Set on --dry-run so a test run never pollutes the real record. */
  dryRun?: boolean;
}

/** A stored entry: the caller's fields plus the timestamp we stamped it with. */
export interface StoredRun extends RunEntry {
  ts: string;
}

export const RUN_LOG_PATH = 'data/run-log.jsonl';
export const RUN_INDEX_PATH = 'data/AGENT-LOG.md';

/** How long a run stays in the record. A diary line is tiny; keep it generous. */
const KEEP_DAYS = 180;
/** Rows in the index table. One screen, roughly a month for a daily fleet. */
const INDEX_ROWS = 40;
/** Consecutive zero-report runs before an agent is called out as possibly broken. */
const STREAK_ALERT = 5;

function readRuns(path: string): StoredRun[] {
  if (!existsSync(path)) return [];
  const out: StoredRun[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t) as StoredRun;
      // A line without an agent or a timestamp is not a run we can use. Skip it
      // rather than throw: a half-written line at the tail of the file (the
      // process was killed mid-append) must not make the whole log unreadable.
      if (obj && typeof obj.agent === 'string' && typeof obj.ts === 'string') out.push(obj);
    } catch {
      continue;
    }
  }
  return out;
}

/** `2026-10-15 06:04` — UTC, labelled wherever it is shown. */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/** `2026-10-15` — the UTC day, for grouping. */
function day(iso: string): string {
  return iso.slice(0, 10);
}

function status(entry: StoredRun): string {
  if (entry.dryRun) return 'dry-run';
  if (entry.aborted?.length) return 'aborted';
  if (entry.degraded) return 'degraded';
  if (entry.reported === 0) return 'nothing sent';
  return 'ok';
}

// --- fleet health -----------------------------------------------------------
// The whole point of the log: turn "it looks quiet" into a number.
interface Health {
  agent: string;
  lastRun: string;
  lastReported: number;
  zeroStreak: number;
  abortStreak: number;
  lastAbort: string | null;
  lastNonZero: string | null;
  daysSinceNonZero: number | null;
}

function healthOf(runs: StoredRun[], now: number): Health[] {
  const byAgent = new Map<string, StoredRun[]>();
  for (const r of runs) {
    const list = byAgent.get(r.agent) ?? [];
    list.push(r);
    byAgent.set(r.agent, list);
  }

  const out: Health[] = [];
  for (const [agent, list] of byAgent) {
    // Newest first. `readRuns` preserves file order, which is append order, so
    // sorting here is what makes the streak counts mean "most recent".
    const ordered = [...list].sort((a, b) => b.ts.localeCompare(a.ts));

    // A run that did not complete tells you nothing about whether there was
    // anything to find. Counting it as a zero would make one bad quota day look
    // like the agent went quiet — the exact confusion this file exists to stop.
    // So degraded and aborted runs are excluded from the zero-streak.
    const completed = ordered.filter(
      (r) => !r.dryRun && !r.degraded && !(r.aborted?.length),
    );

    let zeroStreak = 0;
    for (const r of completed) {
      if (r.reported === 0) zeroStreak += 1;
      else break;
    }

    // Consecutive failed runs, counted separately. This has to be its own
    // measure: a fleet that aborts every single day has a zero-streak of 0
    // (because nothing completed), so without this the worst possible state —
    // an agent that has not successfully run in weeks — would show as healthy.
    let abortStreak = 0;
    for (const r of ordered) {
      if (r.dryRun) continue;
      if (r.aborted?.length) abortStreak += 1;
      else break;
    }

    const nonZero = completed.find((r) => r.reported > 0);
    const lastNonZero = nonZero ? day(nonZero.ts) : null;
    const daysSinceNonZero = nonZero
      ? Math.floor((now - new Date(nonZero.ts).getTime()) / 86400000)
      : null;
    const newestAbort = ordered.find((r) => r.aborted?.length);

    out.push({
      agent,
      lastRun: day(ordered[0].ts),
      lastReported: ordered[0].reported,
      zeroStreak,
      abortStreak,
      lastAbort: newestAbort?.aborted?.[0] ?? null,
      lastNonZero,
      daysSinceNonZero,
    });
  }
  return out.sort((a, b) => a.agent.localeCompare(b.agent));
}

function renderIndex(runs: StoredRun[], now: number): string {
  const newestFirst = [...runs].sort((a, b) => b.ts.localeCompare(a.ts));
  const rows = newestFirst.slice(0, INDEX_ROWS);

  const table = rows.length
    ? [
        '| When (UTC) | Agent | Found | Screened | Reported | Status |',
        '|---|---|---|---|---|---|',
        ...rows.map(
          (r) =>
            `| ${stamp(r.ts)} | ${r.agent} | ${r.found ?? '—'} | ` +
            `${r.screened ?? '—'} | ${r.reported} | ${status(r)} |`,
        ),
      ].join('\n')
    : '_No runs recorded yet. This fills in the first time an agent runs for real._';

  const health = healthOf(runs, now);
  const healthTable = health.length
    ? [
        '| Agent | Last run | Reported then | Silent runs | Failed runs | Last non-zero |',
        '|---|---|---|---|---|---|',
        ...health.map(
          (h) =>
            `| ${h.agent} | ${h.lastRun} | ${h.lastReported} | ${h.zeroStreak} | ` +
            `${h.abortStreak} | ${h.lastNonZero ?? 'never'}` +
            `${h.daysSinceNonZero !== null ? ` (${h.daysSinceNonZero}d ago)` : ''} |`,
        ),
      ].join('\n')
    : '_Nothing to report._';

  // Write the sentence you would otherwise have to derive from the table.
  const flags: string[] = [];
  for (const h of health) {
    // A run that threw is the loudest possible signal and sorts first: the agent
    // is not quiet, it is broken, and no amount of waiting will fix it.
    if (h.abortStreak >= 2) {
      flags.push(
        `- **${h.agent}** has failed to complete **${h.abortStreak} consecutive runs**.` +
          (h.lastAbort ? ` Last error: \`${h.lastAbort}\`` : '') +
          ' The agent is not idle — it is broken, and the "nothing today" message it sends is false.',
      );
    } else if (h.zeroStreak >= STREAK_ALERT) {
      flags.push(
        `- **${h.agent}** has reported nothing for **${h.zeroStreak} consecutive runs**` +
          (h.lastNonZero ? ` (last sent something on ${h.lastNonZero}).` : ' (has never sent anything).') +
          ' That is either a genuinely dry source or a broken agent — check before assuming it is fine.',
      );
    } else if (h.daysSinceNonZero !== null && h.daysSinceNonZero >= 21) {
      flags.push(
        `- **${h.agent}** has sent nothing for **${h.daysSinceNonZero} days** (last: ${h.lastNonZero}).`,
      );
    }
  }

  const detail = newestFirst
    .slice(0, 10)
    .map((r) => {
      const bits = [
        `found ${r.found ?? '—'}`,
        `screened ${r.screened ?? '—'}`,
        `reported ${r.reported}`,
      ];
      const head = `- **${stamp(r.ts)} UTC · ${r.agent}** — ${bits.join(', ')} · ${status(r)}`;
      const lines = r.reason ? [`  - ${r.reason}`] : [];
      for (const err of r.aborted ?? []) lines.push(`  - failed: \`${err}\``);
      return [head, ...lines].join('\n');
    })
    .join('\n');

  return [
    '# Agent fleet log',
    '',
    '<!-- GENERATED by src/lib/runlog.ts on every append. Do not hand-edit:',
    '     the next run overwrites this file. Edit the entry, not the output. -->',
    '',
    `Every run of every agent, newest first. **${runs.length}** run(s) on record.`,
    'Times are UTC. `degraded` means quota or network cut the run short; `aborted`',
    'means a pass threw outright. In both cases the reported count is the absence',
    'of a measurement, not a measurement of zero — and neither counts as a silent run.',
    '`Screened` is how many candidates reached the AI. **Screened 0 with found above',
    'zero is not a quiet day — it means the boards returned nothing the seen-store',
    'had not already absorbed.**',
    '',
    '## Index',
    '',
    table,
    '',
    '## Fleet health',
    '',
    healthTable,
    '',
    ...(flags.length
      ? ['**Worth a look:**', '', ...flags, '']
      : ['Nothing flagged. Every agent that has run recently has sent something.', '']),
    '## Detail — last 10 runs',
    '',
    detail || '_No runs recorded yet._',
    '',
  ].join('\n');
}

/**
 * Append one run and regenerate the index.
 *
 * Returns true if the record was written. Never throws — a logging failure must
 * not be able to break a working agent, so the caller can safely ignore this.
 */
export function appendRun(
  entry: RunEntry,
  opts: { logPath?: string; indexPath?: string; now?: Date } = {},
): boolean {
  const logPath = opts.logPath ?? RUN_LOG_PATH;
  const indexPath = opts.indexPath ?? RUN_INDEX_PATH;
  try {
    // A dry run is a rehearsal, not an event. Recording it would put fake zeros
    // in the health numbers, and a fake zero is exactly what this log exists to
    // detect. Say so on stderr and write nothing.
    if (entry.dryRun) {
      console.log(`[runlog] dry-run, not recorded: ${entry.agent}`);
      return false;
    }

    const now = opts.now ?? new Date();
    const stored: StoredRun = { ...entry, ts: now.toISOString() };

    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, JSON.stringify(stored) + '\n');

    // Read back once, after the append, so the index always reflects what is
    // actually on disk rather than what we believe we just wrote.
    const all = readRuns(logPath);
    const cutoff = now.getTime() - KEEP_DAYS * 86400000;
    const kept = all.filter((r) => new Date(r.ts).getTime() >= cutoff);

    // Rewrite the whole log only when pruning (or a malformed line) actually
    // removed something, so the file cannot grow without bound. Otherwise leave
    // it alone: an append-only file that is only ever appended to is the one you
    // can trust to still contain what you put in it.
    if (kept.length !== all.length) {
      writeFileSync(logPath, kept.map((r) => JSON.stringify(r)).join('\n') + '\n');
    }

    mkdirSync(dirname(indexPath), { recursive: true });
    writeFileSync(indexPath, renderIndex(kept, now.getTime()));

    return true;
  } catch (err) {
    // Swallowed on purpose. See the header.
    console.error(`[runlog] could not record this run: ${(err as Error).message}`);
    return false;
  }
}

/** Read the record. Exported for the offline test and for ad-hoc inspection. */
export function loadRuns(path: string = RUN_LOG_PATH): StoredRun[] {
  return readRuns(path);
}

/** Render the index without writing it — used by the test. */
export function render(path: string = RUN_LOG_PATH, now: number = Date.now()): string {
  return renderIndex(readRuns(path), now);
}
