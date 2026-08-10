// Free, structured job sources. Unlike generic web search (which returns listing /
// aggregator pages), these return INDIVIDUAL job postings with direct, clickable
// links — so what the agent reports is precise, not a search page. No API key needed.
//
// Reliability notes learned by testing (2026-08):
//  • The Muse  — category + remote filters genuinely work; real companies, real
//                apply links. Our most reliable source for actual roles.
//  • RemoteOK  — tech-native tags, but its /api occasionally serves decoy/junk rows
//                to scrapers, so we sanity-check every row and match on whole words.
//  • Remotive  — its free API IGNORES search/category and always returns the latest
//                ~20 remote jobs. Useless for targeted role search, but perfectly
//                fine for scanning the latest *support* roles (our lead signal).
const UA = 'Mozilla/5.0 (compatible; EjenticAgent/1.0)';

export interface BoardJob {
  url: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
}

// Job-post descriptions come as HTML; flatten to readable plain text AND scrub
// hidden junk. Scraped pages (RemoteOK especially) embed honeypot tokens and
// tracking blobs to catch scrapers — if they reach the LLM they leak into drafts
// (we saw a base64-encoded IP land in an email signature). This also removes a
// class of indirect prompt-injection payloads hidden in the text.
function stripHtml(s: string): string {
  return scrubInjection(
    s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&rsquo;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

// Remove hidden tracking tokens / encoded blobs / zero-width chars from scraped text.
export function scrubInjection(s: string): string {
  return s
    .replace(/[​-‍﻿]/g, '') // zero-width / BOM
    .replace(/#[A-Za-z0-9+/]{8,}={0,2}/g, '') // #<base64> honeypot tags
    .replace(/\b[A-Za-z0-9+/]{20,}={0,2}/g, '') // long base64-ish blobs
    .replace(/(^|\s)=+(?=\s|$)/g, '$1') // orphan "=="/"=" left behind
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Whole-word keyword matcher. Critical: plain `.includes("ai")` matches "captain",
// "email", "faint" — flooding results with junk. `\bai\b` matches only the word.
export function makeMatcher(keywords: string[]): (text: string) => boolean {
  const patterns = keywords.map(
    (k) => new RegExp(`\\b${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  );
  return (text: string) => patterns.some((p) => p.test(text));
}

// Reject rows that clearly aren't real postings (decoys, nav text, empties).
const JUNK_TITLE = /(page not found|how to apply|how apply|join our team|current jobs?( opening)?|come join|hiring process|our team|apply now)/i;
function looksLikeRealJob(j: BoardJob): boolean {
  if (!j.url.startsWith('http')) return false;
  if (/\/remote-jobs\/?$/.test(j.url)) return false; // bare listing URL, no posting
  const t = j.title.trim();
  if (t.length < 3 || t.length > 140) return false;
  if (JUNK_TITLE.test(t)) return false;
  if (/[�]/.test(t)) return false; // mangled/replacement chars = decoy row
  if (/\n/.test(t)) return false; // real titles are one line
  return true;
}

/** The Muse — real category + remote filtering. Best source for actual roles. */
export async function themuse(categories: string[], pages = 1, remoteOnly = true): Promise<BoardJob[]> {
  const out: BoardJob[] = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const params = new URLSearchParams();
      for (const c of categories) params.append('category', c);
      if (remoteOnly) params.append('location', 'Flexible / Remote');
      params.append('page', String(page));
      const res = await fetch(`https://www.themuse.com/api/public/jobs?${params.toString()}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) break;
      const data = await res.json();
      const results = data?.results ?? [];
      if (results.length === 0) break;
      for (const j of results) {
        const url = j?.refs?.landing_page;
        if (!url) continue;
        const levels = (j.levels ?? []).map((l: any) => l.name).join(', ');
        out.push({
          url: String(url),
          title: String(j.name ?? ''),
          company: String(j.company?.name ?? ''),
          location: (j.locations ?? []).map((l: any) => l.name).join('; ') || 'Remote',
          type: levels,
          description: (levels ? `Seniority: ${levels}. ` : '') + stripHtml(String(j.contents ?? '')).slice(0, 3000),
        });
      }
    } catch {
      break;
    }
  }
  return out.filter(looksLikeRealJob);
}

/** Remotive — returns the latest ~20 remote jobs (search is ignored on free tier). */
export async function remotive(term: string, limit = 12): Promise<BoardJob[]> {
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=${limit}`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.jobs ?? [])
      .map((j: Record<string, any>) => ({
        url: String(j.url ?? ''),
        title: String(j.title ?? ''),
        company: String(j.company_name ?? ''),
        location: String(j.candidate_required_location || 'Remote'),
        type: String(j.job_type || ''),
        description: stripHtml(String(j.description || '')).slice(0, 3500),
      }))
      .filter(looksLikeRealJob);
  } catch {
    return [];
  }
}

/** RemoteOK — one big list of remote jobs; keyword-filter it on whole words. */
export async function remoteOK(keywords: string[], limit = 25): Promise<BoardJob[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // The first array element is a legal/metadata notice — filter to real rows.
    const rows = Array.isArray(data) ? data.filter((x) => x && x.id && (x.position || x.title)) : [];
    const matches = makeMatcher(keywords);
    const out: BoardJob[] = [];
    for (const j of rows) {
      const hay = `${j.position || j.title} ${(j.tags || []).join(' ')} ${j.description || ''}`;
      if (!matches(hay)) continue;
      const rawUrl = String(j.url || (j.slug ? `https://remoteok.com/remote-jobs/${j.slug}` : `https://remoteok.com/l/${j.id}`));
      const job: BoardJob = {
        // Lowercase the host — RemoteOK's API sometimes returns "remoteOK.com".
        url: rawUrl.replace(/^(https?:\/\/[^/]+)/i, (m) => m.toLowerCase()),
        title: String(j.position || j.title),
        company: String(j.company || ''),
        location: String(j.location || 'Remote'),
        type: '',
        description: stripHtml(String(j.description || '')).slice(0, 3500),
      };
      if (!looksLikeRealJob(job)) continue;
      out.push(job);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
