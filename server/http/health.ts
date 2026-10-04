import type { RequestHandler } from 'express';
import { version } from '../core/config.ts';

/**
 * Builds the `/healthz` handler.
 *
 * @returns The handler: 200 with `{ ok, version }` while the process serves requests.
 *
 * @remarks
 * An unreachable Glances host does not make this unhealthy: restarting the dashboard would not bring the host back.
 */
export function healthHandler(): RequestHandler {
  return (_req, res) => {
    res.json({ ok: true, version: version() });
  };
}
