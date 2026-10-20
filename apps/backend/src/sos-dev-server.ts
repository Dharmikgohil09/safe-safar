// Runs the SOS module on its own:  npx tsx src/sos-dev-server.ts
// Env: PORT, PUBLIC_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_NAME, TELEGRAM_WEBHOOK_SECRET
import express from 'express';
import { ConsoleMessenger, createSosRouter, MemoryStore, SosService, TelegramMessenger } from './modules/sos';

const port = Number(process.env.PORT ?? 4000);
const publicUrl = process.env.PUBLIC_URL ?? `http://localhost:${port}/api`;
const messenger = process.env.TELEGRAM_BOT_TOKEN ? new TelegramMessenger(process.env.TELEGRAM_BOT_TOKEN) : new ConsoleMessenger();
const service = new SosService(new MemoryStore(), messenger, publicUrl, process.env.TELEGRAM_BOT_NAME ?? 'SafeSafarBot');

const app = express();
app.use('/api', createSosRouter(service, { webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET }));
app.listen(port, () => console.log(`SOS API on :${port} (telegram: ${process.env.TELEGRAM_BOT_TOKEN ? 'live' : 'console only'})`));
