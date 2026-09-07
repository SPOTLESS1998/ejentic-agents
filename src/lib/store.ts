// A tiny "already-seen" memory so the same opportunity is never reported twice.
// It's just a JSON file keyed by a normalized URL. On GitHub Actions this file
// is committed back to the repo after each run so the memory survives.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface SeenEntry {
  firstSeen: string;
  label: string;
  title: string;
  // Why this key is remembered:
  //   'reported' — we actually sent it to the user. Suppress it hard, for a long
  //                time, so we never message the same opportunity twice.
  //   'screened' — Gemini looked at it and passed (low fit / not genuine). Worth
  //                remembering so we don't burn AI budget re-judging it tomorrow,
  //                but it should become eligible again fairly soon: job postings
  //                get edited, and a "maybe" today can be a real fit next week.
  // Older entries written before this field existed have no `kind`; treated as
  // 'reported' (the old behaviour) so nothing already sent suddenly re-surfaces.
  kind?: 'reported' | 'screened';
}
export type SeenMap = Record<string, SeenEntry>;

// How long a key stays "seen" — deliberately different by kind. A reported
// opportunity stays suppressed for a long time; a merely-screened one frees up
// quickly so a slow-refreshing board doesn't converge on "nothing is ever new".
export const SEEN_TTL_DAYS = { reported: 60, screened: 10 } as const;

/** Is this key still suppressed? A key is "fresh" (returns false) once its
 *  kind-specific TTL has elapsed, so an old screened-out role can be reconsidered
 *  and a long-ago reported one can eventually resurface if it's still live. */
export function isSuppressed(entry: SeenEntry | undefined, now = Date.now()): boolean {
  if (!entry) return false;
  const kind = entry.kind ?? 'reported'; // pre-TTL entries = the old forever-ish behaviour
  const ttlDays = SEEN_TTL_DAYS[kind];
  const age = now - new Date(entry.firstSeen).getTime();
  if (!Number.isFinite(age)) return true; // unparseable date → stay safe, keep suppressed
  return age < ttlDays * 24 * 60 * 60 * 1000;
}

/** Normalize a URL so trivial variants (trailing slash, tracking params) match. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const p of [...u.searchParams.keys()]) {
      if (/^utm_|^ref$|^source$|gclid|fbclid/i.test(p)) u.searchParams.delete(p);
    }
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function loadSeen(path: string): SeenMap {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SeenMap;
  } catch {
    return {};
  }
}

/** Save the seen-map, pruning entries older than keepDays to bound file size. */
export function saveSeen(path: string, seen: SeenMap, keepDays = 90): void {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const pruned: SeenMap = {};
  for (const [k, v] of Object.entries(seen)) {
    if (new Date(v.firstSeen).getTime() >= cutoff) pruned[k] = v;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(pruned, null, 2));
}
