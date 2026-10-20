import express from 'express';
import type { Request, Response, NextFunction, Router } from 'express';
import { HttpError, SosService } from './service';

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

/** Mount with:  app.use('/api', createSosRouter(service, { webhookSecret }))  */
export function createSosRouter(service: SosService, opts: { webhookSecret?: string } = {}): Router {
  const r = express.Router();
  r.use(express.json({ limit: '50kb' }));

  const auth = async (req: Request) =>
    service.authenticate(req.header('x-user-id') ?? undefined, req.header('x-device-key') ?? undefined);

  r.post('/devices/register', wrap(async (req, res) => {
    res.status(201).json(await service.registerDevice(req.body?.userName));
  }));

  r.post('/sos', wrap(async (req, res) => {
    const d = await auth(req);
    const { record, trackingUrl, created } = await service.start(d, req.body ?? {});
    res.status(created ? 201 : 200).json({ sosId: record.sosId, status: record.status, trackingUrl });
  }));

  r.post('/sos/:id/location', wrap(async (req, res) => {
    const d = await auth(req);
    const rec = await service.update(d, req.params.id, req.body?.coords ?? req.body);
    res.json({ status: rec.status });
  }));

  r.post('/sos/:id/resolve', wrap(async (req, res) => {
    const d = await auth(req);
    const rec = await service.resolve(d, req.params.id);
    res.json({ status: rec.status });
  }));

  r.get('/track/:token', wrap(async (req, res) => {
    res.json(await service.publicView(req.params.token));
  }));

  r.post('/telegram/webhook', wrap(async (req, res) => {
    if (opts.webhookSecret && req.header('x-telegram-bot-api-secret-token') !== opts.webhookSecret) {
      throw new HttpError(401, 'bad secret');
    }
    await service.handleTelegramUpdate(req.body);
    res.json({ ok: true }); // always 200 so Telegram does not retry forever
  }));

  r.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('[sos] unexpected error', err);
    res.status(500).json({ error: 'internal error' });
  });
  return r;
}
