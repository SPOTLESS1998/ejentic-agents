// Throwaway diagnostic: which free Gemini models have quota TODAY?
// Each model has its own daily bucket, so if one is exhausted (429) another may
// still work. Sends a 1-token prompt to each candidate and prints the status.
import 'dotenv/config';
import { requireEnv } from '../lib/env.js';

const key = requireEnv('GEMINI_API_KEY');
const CANDIDATES = [
  'gemini-2.5-flash', // control (expected exhausted)
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

async function probe(model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
    });
    if (res.ok) return 'OK ✅ (has quota today)';
    const body = (await res.text().catch(() => '')).toLowerCase();
    if (res.status === 429) return `429 ❌ ${/quota/.test(body) ? 'daily quota exhausted' : 'rate limited'}`;
    if (res.status === 404) return '404 (model id not available)';
    return `HTTP ${res.status}`;
  } catch (e) {
    return `network error: ${(e as Error).message}`;
  }
}

for (const m of CANDIDATES) {
  console.log(`${m.padEnd(26)} → ${await probe(m)}`);
}
