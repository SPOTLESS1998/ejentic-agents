// A tiny "already-seen" memory so the same opportunity is never reported twice.
// It's just a JSON file keyed by a normalized URL. On GitHub Actions this file
// is committed back to the repo after each run so the memory survives.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface SeenEntry {
  firstSeen: string;
  label: string;
  title: string;
}
export type SeenMap = Record<string, SeenEntry>;

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
