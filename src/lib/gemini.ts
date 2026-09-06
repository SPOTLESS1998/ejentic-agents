// Thin wrapper around Google's Gemini REST API (free tier). No SDK needed —
// Node 18+ has global fetch. We use it for two things: screening search results
// and drafting emails/reports. Everything is JSON-in, JSON-out.
import { requireEnv, optionalEnv } from './env.js';

// Default model. gemini-flash-lite-latest has the most generous free-tier daily
// quota and is plenty for screening + short email drafts (which you review before
// sending). gemini-2.5-flash is only ~20 requests/day/model on the free tier —
// fine for the scheduled once-a-day run, but tight for testing. Override with the
// GEMINI_MODEL env var; run `npm run probe-models` to see which have quota today.
const MODEL = optionalEnv('GEMINI_MODEL', 'gemini-flash-lite-latest');
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Circuit breaker: the free tier has a daily cap. Once we hit it, retrying (or
// making more calls this run) is futile and just wastes time — so the first
// daily-quota 429 trips this flag and every later call fails fast. Callers can
// check isQuotaError() to degrade gracefully instead of crashing.
let quotaTripped = false;
export function quotaExhausted(): boolean {
  return quotaTripped;
}
export function isQuotaError(e: unknown): boolean {
  return /\b429\b|quota|rate limit/i.test((e as Error)?.message ?? '');
}

// Core call with a small retry loop for transient errors (rate limits, 5xx).
async function call(prompt: string, opts: { json: boolean; temperature?: number; model?: string }): Promise<string> {
  const key = requireEnv('GEMINI_API_KEY');
  if (quotaTripped) throw new Error('Gemini 429: daily quota already exhausted this run');
  const model = opts.model || MODEL;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };

  let lastErr = '';
  // Named so the retry count and the "is there another attempt coming?" check
  // below can never drift apart.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${endpoint(model)}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === 'string' && text.trim()) return text;
        lastErr = 'Gemini returned an empty response';
      } else {
        lastErr = `Gemini HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`;
        // A quota 429 means the daily cap is spent — trip the breaker, don't retry.
        if (res.status === 429 && /quota/i.test(lastErr)) {
          quotaTripped = true;
          break;
        }
        // Otherwise only retry on transient rate-limit / server errors.
        if (![429, 500, 502, 503].includes(res.status)) break;
      }
    } catch (e) {
      lastErr = `Gemini network error: ${(e as Error).message}`;
    }
    // Back off only BETWEEN attempts. Sleeping after the LAST attempt would burn
    // ~4.5s doing nothing before we throw — and this is the timeout path of every
    // agent, so that delay lands on every single failure.
    if (attempt < MAX_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(lastErr || 'Gemini call failed');
}

/** Ask Gemini for free-form text. */
export async function geminiText(prompt: string, temperature = 0.4, model?: string): Promise<string> {
  return (await call(prompt, { json: false, temperature, model })).trim();
}

/** Ask Gemini for JSON and parse it into an object. */
export async function geminiJSON<T = unknown>(prompt: string, temperature = 0.2, model?: string): Promise<T> {
  const raw = await call(prompt, { json: true, temperature, model });
  return safeParse<T>(raw);
}

// Gemini usually honours responseMimeType, but occasionally wraps JSON in prose
// or ``` fences. This digs the JSON out either way.
function safeParse<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const m = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error('Could not parse Gemini JSON output: ' + raw.slice(0, 200));
  }
}
