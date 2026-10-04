import { SAMPLER_DEFAULTS, type SamplerSettings } from '../core/defaults.ts';
import { MS_PER_SECOND } from '../core/wire.ts';
import type { GlancesHost } from './hosts.ts';
import { parseReading, type Reading } from './reading.ts';

/** Every plugin in one request. */
const ALL_PLUGINS_PATH = '/api/4/all';

/** What the client needs from outside. */
export interface GlancesClientDeps {
  /** The fetch to call Glances with. */
  fetch: typeof fetch;
  /** The clock a reading is stamped from. */
  now: () => Date;
}

/** Reads Glances servers. */
export interface GlancesClient {
  /** Fetches one host's current reading. Throws when it can't be reached or answers something else. */
  read: (host: GlancesHost) => Promise<Reading>;
}

/**
 * Builds the client that reads Glances servers.
 *
 * @param deps - The fetch and the clock.
 * @param [overrides] - Sampler settings to replace.
 * @returns The client.
 */
export function createGlancesClient(deps: GlancesClientDeps, overrides: Partial<SamplerSettings> = {}): GlancesClient {
  const { requestTimeoutSeconds, topProcessCount } = { ...SAMPLER_DEFAULTS, ...overrides };

  const read: GlancesClient['read'] = async (host) => {
    const url = `${host.baseUrl}${ALL_PLUGINS_PATH}`;
    const headers = host.authorization === null ? undefined : { authorization: host.authorization };
    const signal = AbortSignal.timeout(requestTimeoutSeconds * MS_PER_SECOND);
    const response = await deps.fetch(url, { headers, signal });
    const requestFailed = response.ok === false;
    if (requestFailed) {
      throw new Error(
        `Glances at ${url} answered HTTP ${response.status}. Check the URL, that it runs with -w, and its password.`,
      );
    }
    return parseReading(await response.json(), deps.now(), topProcessCount);
  };

  return { read };
}
