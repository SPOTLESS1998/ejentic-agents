// =============================================================================
//  CONTENT LOG — the durable record of every post the content agent writes.
//
//  Why this exists: the agent used to keep NO copy of what it published — the
//  drafts went to Telegram and vanished. This file is (1) an audit trail and
//  (2) the SOURCE the weekly newsletter curates from ("what did we post this
//  week?"). Keyed by `${date}:${slot}` so a repeated run overwrites cleanly.
//
//  On GitHub Actions this file is committed back to the repo after each run, so
//  the record survives — same pattern as data/seen-content.json.
// =============================================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface ContentPost {
  date: string; // YYYY-MM-DD (the send date)
  slot: string; // morning | afternoon | evening
  cycleDay: number; // 1..30
  theme: string; // the day's theme
  pillar: string; // EDUCATE | SHOWCASE | INSPIRE
  topic: string; // the mandated calendar topic
  angle: string; // one-line rationale
  xPost: string;
  linkedinPost: string;
  citedSourceUrls: string[];
  score: number | null; // editor-pass score (1-10) if one ran, else null
  createdAt: string; // ISO timestamp
}

export type ContentLog = Record<string, ContentPost>; // key = `${date}:${slot}`

export function loadPosts(path: string): ContentLog {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ContentLog;
  } catch {
    return {};
  }
}

/** Save one post under `${date}:${slot}`, pruning entries older than keepDays. */
export function appendPost(path: string, key: string, post: ContentPost, keepDays = 120): void {
  const log = loadPosts(path);
  log[key] = post;
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const pruned: ContentLog = {};
  for (const [k, v] of Object.entries(log)) {
    if (new Date(v.createdAt).getTime() >= cutoff) pruned[k] = v;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(pruned, null, 2));
}

/** All posts from the last `days` days, newest first — the newsletter's input. */
export function recentPosts(path: string, days: number): ContentPost[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return Object.values(loadPosts(path))
    .filter((p) => new Date(p.createdAt).getTime() >= cutoff)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
