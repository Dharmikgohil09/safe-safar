import express from 'express';
import type { AddressInfo } from 'node:net';
import { createSosRouter, MemoryStore, SosService } from './modules/sos';
import type { Messenger } from './modules/sos';

let passed = 0, failed = 0;
const check = (n: string, ok: boolean, extra = '') => {
  console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : `   <-- ${extra}`));
  ok ? passed++ : (failed++, (process.exitCode = 1));
};

const sent: { chat: string; text: string }[] = [];
let failChat: string | null = null;
const messenger: Messenger = {
  async send(chat, text) {
    if (chat === failChat) throw new Error('blocked');
    sent.push({ chat, text });
  },
};

(async () => {
  const service = new SosService(new MemoryStore(), messenger, 'https://x.test/api', 'TestBot');
  const app = express();
  app.use('/api', createSosRouter(service, { webhookSecret: 'sek' }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: (await r.json().catch(() => ({}))) as any };
  };

  // register
  let r = await call('POST', '/devices/register', {});
  check('register needs a name', r.status === 400);
  r = await call('POST', '/devices/register', { userName: 'Kristal' });
  const dev = r.json;
  check('register returns user id, key, link code, bot link', r.status === 201 && dev.userId && dev.deviceKey && /^[0-9a-f]{6}$/.test(dev.linkCode) && dev.botLink.includes(dev.linkCode));
  const H = { 'x-user-id': dev.userId, 'x-device-key': dev.deviceKey };

  // contacts link through Telegram
  const hook = (text: string, chat: number, secret = 'sek') => call('POST', '/telegram/webhook', { message: { text, chat: { id: chat } } }, { 'x-telegram-bot-api-secret-token': secret });
  check('webhook rejects a wrong secret', (await hook('/start ' + dev.linkCode, 1, 'nope')).status === 401);
  await hook('/start ' + dev.linkCode, 111);
  await hook('/start ' + dev.linkCode, 222);
  check('contacts get a welcome message', sent.filter((s) => s.text.includes('will now get')).length === 2);
  sent.length = 0;
  await hook('/start abcdef', 333);
  check('bad link code is told so and not linked', sent.length === 1 && sent[0].text.includes('not valid'));
  await hook('hello', 444);
  sent.length = 0;

  // SOS needs auth
  check('SOS without credentials is 401', (await call('POST', '/sos', { sosId: 'abc123' })).status === 401);
  check('SOS with a wrong key is 401', (await call('POST', '/sos', { sosId: 'abc123' }, { ...H, 'x-device-key': 'bad' })).status === 401);
  check('bad sosId is 400', (await call('POST', '/sos', { sosId: '!' }, H)).status === 400);

  // start
  r = await call('POST', '/sos', { sosId: 'sos-0001', source: 'shake', coords: { lat: 21.17, lng: 72.83, ts: 1000 } }, H);
  check('SOS created (201) with a tracking link', r.status === 201 && r.json.trackingUrl.startsWith('https://x.test/api/track/'));
  check('both contacts alerted, with map link and tracking link',
    sent.length === 2 && sent.every((s) => s.text.includes('Kristal needs help') && s.text.includes('maps.google.com/?q=21.17,72.83') && s.text.includes(r.json.trackingUrl)));
  const track = r.json.trackingUrl.split('/api')[1];

  // retry (offline queue) must not alert again
  sent.length = 0;
  r = await call('POST', '/sos', { sosId: 'sos-0001', source: 'shake', coords: { lat: 21.18, lng: 72.84, ts: 2000 } }, H);
  check('same sosId again: 200, no second alert', r.status === 200 && sent.length === 0);

  // another user cannot touch it
  const other = (await call('POST', '/devices/register', { userName: 'Eve' })).json;
  const HE = { 'x-user-id': other.userId, 'x-device-key': other.deviceKey };
  check('another user cannot update my SOS', (await call('POST', '/sos/sos-0001/location', { lat: 1, lng: 1 }, HE)).status === 403);
  check('another user cannot resolve my SOS', (await call('POST', '/sos/sos-0001/resolve', {}, HE)).status === 403);
  check('another user cannot reuse my sosId', (await call('POST', '/sos', { sosId: 'sos-0001' }, HE)).status === 403);

  // updates incl. out-of-order
  check('bad coords are 400', (await call('POST', '/sos/sos-0001/location', { lat: 999, lng: 0 }, H)).status === 400);
  await call('POST', '/sos/sos-0001/location', { coords: { lat: 21.2, lng: 72.9, ts: 5000 } }, H);
  await call('POST', '/sos/sos-0001/location', { coords: { lat: 21.19, lng: 72.85, ts: 3000 } }, H); // late
  let pub = await call('GET', track);
  check('public view shows newest position even when updates arrive late', pub.json.lastCoords.ts === 5000 && pub.json.trail.map((t: any) => t.ts).join() === '1000,2000,3000,5000', JSON.stringify(pub.json.trail));
  check('public view exposes no ids or keys', !JSON.stringify(pub.json).includes(dev.userId) && !JSON.stringify(pub.json).includes(dev.deviceKey));
  check('unknown tracking token is 404', (await call('GET', '/track/deadbeef')).status === 404);

  // resolve: one failing chat does not block the other, all-clear sent once
  failChat = '111';
  sent.length = 0;
  r = await call('POST', '/sos/sos-0001/resolve', {}, H);
  check('resolve ok and the working chat still got the all-clear', r.status === 200 && sent.length === 1 && sent[0].chat === '222' && sent[0].text.includes('is safe'));
  sent.length = 0;
  await call('POST', '/sos/sos-0001/resolve', {}, H);
  check('resolving twice does not send the all-clear twice', sent.length === 0);
  await call('POST', '/sos/sos-0001/location', { coords: { lat: 5, lng: 5, ts: 9000 } }, H);
  pub = await call('GET', track);
  check('after resolve: status resolved, late update ignored', pub.json.status === 'resolved' && pub.json.lastCoords.ts === 5000);
  check('unknown SOS id is 404', (await call('POST', '/sos/nope-123/resolve', {}, H)).status === 404);

  // trail cap
  failChat = null;
  await call('POST', '/sos', { sosId: 'sos-0002' }, H);
  for (let i = 0; i < 520; i++) await service.update((await service.authenticate(dev.userId, dev.deviceKey)), 'sos-0002', { lat: 10, lng: 10, ts: i + 1 });
  pub = await call('GET', ((await call('POST', '/sos', { sosId: 'sos-0002' }, H)).json.trackingUrl as string).split('/api')[1]);
  check('trail is capped and the public view returns the last 100', pub.json.trail.length === 100 && pub.json.lastCoords.ts === 520);

  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
})();
