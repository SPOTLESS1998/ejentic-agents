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
//
// The cap is PER MODEL, so the breaker is too. It used to be one global boolean,
// which quietly undid the whole point of splitting work across tiers: the content
// agent drafts on a stronger CONTENT_MODEL and judges on the cheap default
// precisely because they have SEPARATE daily budgets — but one 429 from the cheap
// judge locked out the strong model for the rest of the run, even though its own
// budget was untouched. Tracking the tripped models individually keeps one
// exhausted model from spending another model's quota for it.
const trippedModels = new Set<string>();

/** Is the daily quota spent? With no argument: "has ANY model tripped this run?"
 *  (the original meaning, which is what the single-model agents want). With a
 *  model name: just that model. Pass nothing for the model to ask about the
 *  configured default. */
export function quotaExhausted(model?: string): boolean {
  if (model === undefined) return trippedModels.size > 0;
  return trippedModels.has(model || MODEL);
}
export function isQuotaError(e: unknown): boolean {
  return /\b429\b|quota|rate limit/i.test((e as Error)?.message ?? '');
}

// Core call with a small retry loop for transient errors (rate limits, 5xx).
async function call(prompt: string, opts: { json: boolean; temperature?: number; model?: string }): Promise<string> {
  const key = requireEnv('GEMINI_API_KEY');
  const model = opts.model || MODEL;
  if (trippedModels.has(model)) throw new Error(`Gemini 429: daily quota for ${model} already exhausted this run`);
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
        // A quota 429 means THIS model's daily cap is spent — trip its breaker
        // (not every model's) and stop retrying it.
        if (res.status === 429 && /quota/i.test(lastErr)) {
          trippedModels.add(model);
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
  // Two samples. A model that emits a JSON defect is not reliably broken — it is
  // usually a one-off sampling artefact, and a second draw normally parses. This
  // matters more than it looks: on 2026-10-16 the JOB pass died on a single bad
  // character while the LEAD pass in the SAME run returned four good leads off the
  // same key, so one unlucky sample was throwing away an entire batch of work.
  // Retrying here is cheaper than losing the batch, and it is the only retry that
  // can recover from a defect the repair table below does not know about.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await call(prompt, { json: true, temperature, model });
    try {
      return safeParse<T>(raw);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// Gemini usually honours responseMimeType, but occasionally wraps JSON in prose
// or ``` fences, and sometimes emits small syntax defects. This digs the JSON
// out and repairs the defects we have actually seen, rather than throwing on the
// first bad character.
//
// Why this is not paranoia: the second `JSON.parse` used to be unguarded, so any
// defect it could not handle escaped as a raw SyntaxError ("Expected double-quoted
// property name in JSON at position 32") — which aborted the WHOLE pass, discarding
// every good pick in the batch because of one bad comma. Measured on 2026-10-16:
// the LEAD pass returned 3 confirmed leads while the JOB pass died on exactly this,
// in the same run, off the same key.
export function safeParse<T>(raw: string): T {
  // 1. Straight parse — the common case.
  try {
    return JSON.parse(raw) as T;
  } catch { /* fall through */ }

  // 2. Dig the outermost object/array out of surrounding prose or ``` fences.
  const fenced = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const m = fenced.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const candidates = m ? [m[0], fenced] : [fenced];
  for (const c of candidates) {
    try {
      return JSON.parse(c) as T;
    } catch { /* try the repair */ }
    const repaired = repairJson(c);
    try {
      return JSON.parse(repaired) as T;
    } catch { /* next candidate */ }
  }

  // 3. Nothing worked. Say WHAT was wrong and keep enough raw text to diagnose,
  //    instead of a bare position number that tells the reader nothing.
  throw new Error(
    `Could not parse Gemini JSON output (${raw.length} chars). Raw head: ` + raw.slice(0, 500),
  );
}

// The syntax defects a model actually produces, repaired with a scanner that
// tracks whether it is inside a string literal.
//
// It is a scanner and not a handful of regexes because the regex version was
// WRONG in a way that would have shipped silently. `{"body":"Hi, team: hello"}`
// contains both a `, ` and a `word:` sequence — inside a string. The regex
// `,(\s*[}\]])` and `([{,]\s*)(\w+)(\s*:)` both matched inside the email body and
// rewrote the CONTENT of a draft: `"Hi, }"` lost its comma, `"team: hello"` gained
// quotes around `team`. A repair broad enough to fix anything is broad enough to
// silently change the data, and a corrupted outreach email is worse than a loud
// parse failure — the human reviewing it would never know.
//
// Only three defects are handled, each one measured rather than imagined:
// trailing commas, `//` comments, and bare keys. Anything else still throws.
//
// Smart quotes are deliberately NOT handled. An earlier draft of this function
// rewrote them, and the test caught what that would have cost: `"He said "ship
// it" and left"` is ordinary email prose, so treating a smart quote as a
// delimiter corrupts the body of the very drafts this parser exists to deliver.
// There was also no evidence the model emits them — the defect was invented, and
// an invented defect is not worth a real corruption risk.
export function repairJson(s: string): string {
  let out = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inStr) {
      out += ch;
      if (ch === '\\') {
        // Copy the escaped character verbatim so `\"` does not close the string.
        if (i + 1 < s.length) out += s[++i];
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }

    // --- outside a string ---
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    // A `//` comment a model added out of habit. Skip to end of line.
    if (ch === '/' && s[i + 1] === '/') {
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    // A trailing comma: drop it only when the next significant char closes a
    // structure. This is the defect that actually aborted a run.
    if (ch === ',') {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (s[j] === '}' || s[j] === ']') continue; // omit the comma
      out += ch;
      continue;
    }
    // A bare object key: `{picks:` → `{"picks":`. Only after `{` or `,`, so a
    // colon anywhere else in the document is left alone.
    if (/[A-Za-z_$]/.test(ch)) {
      let prev = out.length - 1;
      while (prev >= 0 && /\s/.test(out[prev])) prev--;
      if (prev >= 0 && (out[prev] === '{' || out[prev] === ',')) {
        let j = i;
        while (j < s.length && /[A-Za-z0-9_$]/.test(s[j])) j++;
        let k = j;
        while (k < s.length && /\s/.test(s[k])) k++;
        if (s[k] === ':') {
          out += '"' + s.slice(i, j) + '"';
          i = j - 1;
          continue;
        }
      }
    }
    out += ch;
  }
  return out;
}
