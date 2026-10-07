import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import { createYoga } from 'graphql-yoga';
import { isProduction, trustProxy } from '../core/config.ts';
import type { Context } from '../core/context.ts';
import { HTTP_DEFAULTS, SAMPLER_DEFAULTS, type SamplerSettings } from '../core/defaults.ts';
import { graphqlLogger } from '../graphql/logger.ts';
import { useOperationLimits } from '../graphql/operation-limits.ts';
import { schema } from '../graphql/schema.ts';
import type { HostBus } from '../monitor/host-bus.ts';
import type { HostStore } from '../monitor/host-store.ts';
import { healthHandler } from './health.ts';

const GRAPHQL_ENDPOINT = '/graphql';
const HEALTH_ENDPOINT = '/healthz';
/** Every path but the API's, so the web app's own routes load index.html. */
const WEB_ROUTES = /^(?!\/(graphql|healthz)$).*/;
/** Where `npm run build` puts the web app. */
const WEB_DIST = fileURLToPath(new URL('../../dist', import.meta.url));

/** What the app is built from. */
export interface AppDeps {
  store: HostStore;
  bus: HostBus;
}

/**
 * Builds the Express app: GraphQL, health, and the built web app when there is one. It does not listen.
 *
 * @param deps - The host store and bus.
 * @param [overrides] - Sampler settings to replace. The interval is what subscribers are paced against.
 * @returns The app.
 */
export function createApp(deps: AppDeps, overrides: Partial<SamplerSettings> = {}): Express {
  const { intervalSeconds } = { ...SAMPLER_DEFAULTS, ...overrides };
  const yoga = createYoga<Record<string, never>, Context>({
    schema,
    graphqlEndpoint: GRAPHQL_ENDPOINT,
    logging: graphqlLogger,
    graphiql: isProduction() === false,
    plugins: [useOperationLimits()],
    context: () => ({ store: deps.store, bus: deps.bus, sampleIntervalSeconds: intervalSeconds }),
  });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy());
  app.get(HEALTH_ENDPOINT, healthHandler());
  app.use(GRAPHQL_ENDPOINT, express.json({ limit: HTTP_DEFAULTS.bodyLimit }));
  app.all(GRAPHQL_ENDPOINT, (req, res) => yoga(req, res));

  const hasWebBuild = existsSync(WEB_DIST);
  if (hasWebBuild) {
    app.use(express.static(WEB_DIST));
    app.get(WEB_ROUTES, (_req, res) => res.sendFile('index.html', { root: WEB_DIST }));
  }
  return app;
}
