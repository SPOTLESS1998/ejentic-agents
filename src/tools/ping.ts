// Helper: send yourself a test message to confirm the Telegram wiring works.
//   npm run ping
import { resolveChatId, sendMessage } from '../lib/telegram.js';

const chatId = await resolveChatId();
await sendMessage(
  chatId,
  '✅ <b>Ejentic agent — test message</b>\nIf you can read this, your bot token and chat are wired up correctly.',
);
console.log('Sent a test message to chat', chatId);
