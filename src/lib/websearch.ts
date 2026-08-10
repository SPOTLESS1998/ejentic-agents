// Shared helpers for the search-driven agents (#2 Scholarships, #3 Researcher).
// The Job agent (#1) uses structured job-board APIs; these two instead discover
// things via Firecrawl web search. Everything here is deliberately frugal and
// safe: search snippets only (no paid page scrapes), sanitized before the AI
// ever sees them, and dead links dropped before you're notified.
import { search, type SearchHit } from './firecrawl.js';
import { scrubInjection } from './jobboards.js';
import { normalizeUrl } from './store.js';

export interface Finding {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Run several search queries, merge the hits, drop duplicates (by normalized
 * URL), and sanitize every field. One failing query never kills the run — it's
 * logged and skipped. Returns title+snippet only: enough for the AI to screen,
 * and it costs no extra API credits (no page scraping).
 */
export async function gatherSearch(queries: string[], perQuery = 6): Promise<Finding[]> {
  const byUrl = new Map<string, Finding>();
  for (const q of queries) {
    let hits: SearchHit[] = [];
    try {
      hits = await search(q, perQuery);
    } catch (e) {
      console.error(`  search failed for "${q}": ${(e as Error).message}`);
      continue; // one bad/empty query shouldn't abort the whole gather
    }
    for (const h of hits) {
      if (!h.url) continue;
      const key = normalizeUrl(h.url);
      if (byUrl.has(key)) continue;
      byUrl.set(key, {
        url: h.url,
        title: scrubInjection(h.title).slice(0, 200),
        snippet: scrubInjection(h.description).slice(0, 600),
      });
    }
  }
  return [...byUrl.values()];
}

/**
 * A link is "live" unless it clearly 404s/410s or the host is unreachable.
 * 401/403 = exists but gated — still a real page. Never throws (returns false).
 */
export async function isLive(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EjenticAgent/1.0)' },
    });
    return res.status !== 404 && res.status !== 410;
  } catch {
    return false;
  }
}

/**
 * Last-line scrub on anything the LLM produced: drop tracking/honeypot blobs
 * that may have ridden in on scraped text, and neutralize stray markdown bold.
 */
export function cleanText(s: string): string {
  return scrubInjection(s).replace(/\*\*(.+?)\*\*/g, '$1').trim();
}
