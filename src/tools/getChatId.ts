// Helper: find your Telegram chat id.
// Run AFTER you've sent your bot a message:   npm run chat-id
import { requireEnv } from '../lib/env.js';

const token = requireEnv('TELEGRAM_BOT_TOKEN');
const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const data = await res.json();
const updates: any[] = data?.result ?? [];

if (!updates.length) {
  console.log(
    'No messages yet.\n' +
      '1. Open Telegram and search for the bot you created with @BotFather.\n' +
      '2. Send it any message (e.g. "hi").\n' +
      '3. Run `npm run chat-id` again.',
  );
} else {
  const seen = new Set<number>();
  for (const u of updates) {
    const chat = u?.message?.chat ?? u?.edited_message?.chat;
    if (chat?.id && !seen.has(chat.id)) {
      seen.add(chat.id);
      const who = [chat.first_name, chat.username ? '@' + chat.username : ''].filter(Boolean).join(' ');
      console.log(`chat_id: ${chat.id}   ${who}`);
    }
  }
  console.log('\n→ Copy the chat_id above into your .env as TELEGRAM_CHAT_ID (and later into your GitHub secrets).');
}
