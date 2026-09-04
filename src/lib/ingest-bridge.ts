// =============================================================================
//  INGEST BRIDGE — mirror each finished post to the website's content store.
//
//  The website (the Next.js app in Antigravity/ai-agency) curates the WEEKLY
//  "Enterprise AI Playbook" newsletter from a ContentPost table. This bridge
//  POSTs each finished post to that app's locked-down /api/content/ingest
//  endpoint so its store stays in sync with what we actually published.
//
//  Two properties keep this safe to leave in place forever:
//    1. ENV-GATED. If CONTENT_INGEST_URL or CONTENT_INGEST_TOKEN is unset, this
//       is a silent no-op — the agent behaves exactly as before. Nothing to
//       configure until the website endpoint is live and reachable.
//    2. BEST-EFFORT, NEVER THROWS. data/content-posts.json (written by
//       appendPost) remains the source of truth; this is only a mirror. A
//       slow/down/rejecting website must never stop a draft from reaching the
//       Telegram review bot, so every failure is caught and logged, not raised.
// =============================================================================
import type { ContentPost } from './content-log.js';
import { optionalEnv } from './env.js';

// Keep the website call short so a hung endpoint can't stall the agent run.
const TIMEOUT_MS = 10_000;

/**
 * Mirror one finished post to the website's ingest endpoint. Resolves quietly
 * whether it succeeded, was skipped (not configured), or failed — it never
 * rejects, so callers can `await` it without a try/catch.
 */
export async function pushToWebsite(post: ContentPost): Promise<void> {
  const url = optionalEnv('CONTENT_INGEST_URL');
  const token = optionalEnv('CONTENT_INGEST_TOKEN');
  if (!url || !token) return; // not configured yet → do nothing, say nothing

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(post),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`[ingest-bridge] website rejected ${post.date}:${post.slot} (HTTP ${res.status}) ${detail.slice(0, 200)}`);
      return;
    }
    console.log(`[ingest-bridge] mirrored ${post.date}:${post.slot} → website content store`);
  } catch (e) {
    // Timeout / DNS / connection refused / etc. Best-effort — never fatal.
    console.warn(`[ingest-bridge] could not reach website for ${post.date}:${post.slot}: ${(e as Error)?.message ?? String(e)}`);
  }
}
