// Telegram Bot API client — how the agents reach you on your phone.
// Messages use HTML formatting and are split to respect Telegram's 4096-char limit.
import { requireEnv, optionalEnv } from './env.js';

const api = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

// Which bot token to use. Callers can pass an explicit token (e.g. the Content
// agent's dedicated bot); everything else keeps using TELEGRAM_BOT_TOKEN.
function token(explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();
  return requireEnv('TELEGRAM_BOT_TOKEN');
}

/** Escape text so it's safe inside Telegram HTML messages. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Are we running unattended (GitHub Actions or any other CI)? Actions sets both
// CI=true and GITHUB_ACTIONS=true. This matters because the getUpdates fallback
// below picks a recipient from untrusted input — safe-ish when a human is sat
// there watching the output, never safe on a schedule with nobody looking.
function isUnattended(): boolean {
  const truthy = (name: string) => /^(1|true|yes)$/i.test(optionalEnv(name));
  return truthy('CI') || truthy('GITHUB_ACTIONS');
}

/**
 * Work out which chat to message. Prefer an explicit TELEGRAM_CHAT_ID.
 *
 * The fallback (auto-detect from whoever most recently messaged the bot) is a
 * convenience for a human doing first-run setup on their own laptop. It is NOT
 * a safe way to choose a recipient in general: Telegram bots are discoverable
 * by username, so any stranger who sends the bot "hi" becomes the most recent
 * sender — and the next run would deliver the owner's content drafts, brand
 * strategy and founder personas straight to them. That's a recipient hijack via
 * untrusted input, so we refuse the fallback whenever nobody is watching (CI)
 * and instead fail loudly, naming the variable to set.
 */
export async function resolveChatId(explicitToken?: string): Promise<string> {
  const explicit = optionalEnv('TELEGRAM_CHAT_ID');
  if (explicit) return explicit;

  if (isUnattended()) {
    throw new Error(
      'No TELEGRAM_CHAT_ID set and this is an unattended (CI) run, so I will NOT auto-detect a ' +
        'recipient: whoever last messaged the bot would receive your private drafts. ' +
        'Fix: add TELEGRAM_CHAT_ID to your GitHub Actions secrets (and TELEGRAM_CONTENT_CHAT_ID ' +
        'for the content bot). Run `npm run chat-id` locally to get the number.',
    );
  }

  // Interactive/local only from here down.
  console.error(
    '⚠️ No TELEGRAM_CHAT_ID set — falling back to whoever last messaged this bot. ' +
      'Anyone who finds the bot can become that person, so check the chat printed below ' +
      'and put the id in your .env before going live.',
  );
  const res = await fetch(api(token(explicitToken), 'getUpdates'));
  const data = await res.json();
  const updates: unknown[] = data?.result ?? [];
  for (let i = updates.length - 1; i >= 0; i--) {
    const u = updates[i] as Record<string, any>;
    const chat = u?.message?.chat ?? u?.edited_message?.chat;
    if (chat?.id) {
      // Name the resolved chat out loud so a wrong recipient is obvious to the
      // human instead of being discovered after the message has been sent.
      const who = [chat.first_name, chat.username ? '@' + chat.username : ''].filter(Boolean).join(' ');
      console.error(`⚠️ Auto-detected chat id ${chat.id}${who ? ` (${who})` : ''} — is that you?`);
      return String(chat.id);
    }
  }
  throw new Error(
    'No TELEGRAM_CHAT_ID set and no recent messages found. Open Telegram, send your bot a message (e.g. "hi"), then try again.',
  );
}

/** Send a message (auto-split if it's too long for one Telegram message). */
export async function sendMessage(chatId: string, html: string, explicitToken?: string): Promise<void> {
  for (const chunk of splitForTelegram(html, 3900)) {
    const res = await fetch(api(token(explicitToken), 'sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`Telegram sendMessage HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    }
  }
}

// Split on line boundaries so we never cut a message mid-tag.
function splitForTelegram(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const out: string[] = [];
  let buf = '';
  for (const line of text.split('\n')) {
    if ((buf + '\n' + line).length > limit) {
      if (buf) out.push(buf);
      buf = line;
    } else {
      buf = buf ? buf + '\n' + line : line;
    }
  }
  if (buf) out.push(buf);
  return out;
}
