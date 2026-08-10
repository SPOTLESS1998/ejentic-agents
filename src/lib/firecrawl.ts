// Firecrawl REST client. Two jobs:
//  - search(): cheap web search that returns titles/links/snippets.
//  - scrape(): pulls the readable text of one page so we can verify a finding
//    and draft an accurate email from the real content (not a guess).
import { requireEnv } from './env.js';

const BASE = 'https://api.firecrawl.dev';

export interface SearchHit {
  url: string;
  title: string;
  description: string;
}

/** Web search. Returns up to `limit` hits (title + link + snippet only — cheap). */
export async function search(query: string, limit = 6): Promise<SearchHit[]> {
  const key = requireEnv('FIRECRAWL_API_KEY');
  const res = await fetch(`${BASE}/v2/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) {
    throw new Error(`Firecrawl search HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  }
  const data = await res.json();
  // v2 returns { data: { web: [...] } }; older shapes return { data: [...] }.
  const web = data?.data?.web ?? data?.data ?? [];
  return (Array.isArray(web) ? web : [])
    .map((h: Record<string, unknown>) => ({
      url: String(h.url ?? ''),
      title: String(h.title ?? ''),
      description: String(h.description ?? h.snippet ?? ''),
    }))
    .filter((h: SearchHit) => h.url);
}

/** Scrape one page to markdown. Returns '' if it can't be fetched (never throws). */
export async function scrape(url: string, maxChars = 6000): Promise<string> {
  try {
    const key = requireEnv('FIRECRAWL_API_KEY');
    const res = await fetch(`${BASE}/v2/scrape`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const md = data?.data?.markdown ?? data?.markdown ?? '';
    return typeof md === 'string' ? md.slice(0, maxChars) : '';
  } catch {
    return '';
  }
}
