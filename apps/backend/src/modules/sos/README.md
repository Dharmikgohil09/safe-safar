# SOS module (Kristal)

Express router + service for SOS alerts. No database lock-in: it talks to a `Store` interface
(`MemoryStore` for dev; a MongoDB store only has to implement the same interface).

Mount it in the real backend:

    import { createSosRouter, SosService, MemoryStore, TelegramMessenger } from './modules/sos';
    const service = new SosService(new MemoryStore(), new TelegramMessenger(process.env.TELEGRAM_BOT_TOKEN!), process.env.PUBLIC_URL!, process.env.TELEGRAM_BOT_NAME);
    app.use('/api', createSosRouter(service, { webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET }));

Dependencies: express (and @types/express, @types/node, tsx, typescript for dev).

Endpoints (all JSON):
- POST /devices/register {userName}            -> {userId, deviceKey, linkCode, botLink}
- POST /sos {sosId, source, coords, startedAt}  (headers x-user-id, x-device-key). Same sosId again = no second alert.
- POST /sos/:id/location {coords}
- POST /sos/:id/resolve
- GET  /track/:token                            public live view (no ids or keys inside)
- POST /telegram/webhook                        contacts send /start <linkCode> to the bot

Run alone: npx tsx src/sos-dev-server.ts     Test: npx tsx src/sos.test.ts
