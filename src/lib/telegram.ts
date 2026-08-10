// Telegram Bot API client — how the agents reach you on your phone.
// Messages use HTML formatting and are split to respect Telegram's 4096-char limit.
import { requireEnv, optionalEnv } from './env.js';

const api = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

function token(): string {
  return requireEnv('TELEGRAM_BOT_TOKEN');
}

/** Escape text so it's safe inside Telegram HTML messages. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Work out which chat to message. Prefer an explicit TELEGRAM_CHAT_ID; otherwise
 * auto-detect from the most recent person who messaged the bot (getUpdates).
 */
export async function resolveChatId(): Promise<string> {
  const explicit = optionalEnv('TELEGRAM_CHAT_ID');
  if (explicit) return explicit;

  const res = await fetch(api(token(), 'getUpdates'));
  const data = await res.json();
  const updates: unknown[] = data?.result ?? [];
  for (let i = updates.length - 1; i >= 0; i--) {
    const u = updates[i] as Record<string, any>;
    const chat = u?.message?.chat ?? u?.edited_message?.chat;
    if (chat?.id) return String(chat.id);
  }
  throw new Error(
    'No TELEGRAM_CHAT_ID set and no recent messages found. Open Telegram, send your bot a message (e.g. "hi"), then try again.',
  );
}

/** Send a message (auto-split if it's too long for one Telegram message). */
export async function sendMessage(chatId: string, html: string): Promise<void> {
  for (const chunk of splitForTelegram(html, 3900)) {
    const res = await fetch(api(token(), 'sendMessage'), {
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
