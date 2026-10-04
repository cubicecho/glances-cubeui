import type { Server } from 'node:http';
import type { GlancesClient } from '../server/glances/client.ts';
import type { GlancesHost } from '../server/glances/hosts.ts';
import { parseReading, type Reading } from '../server/glances/reading.ts';
import payload from './fixtures/glances-all.json' with { type: 'json' };

/** A captured `GET /api/4/all` body from Glances 4.5, trimmed and anonymised. */
export const GLANCES_PAYLOAD: unknown = payload;
/** The moment every test reading is stamped with. */
export const SAMPLED_AT = new Date('2026-01-01T00:00:00Z');
/** How many processes test readings keep. */
export const TOP_PROCESS_COUNT = 5;

/**
 * Builds a host with no credentials.
 *
 * @param name - The host's name.
 * @returns The host.
 */
export function hostNamed(name: string): GlancesHost {
  return { name, baseUrl: `http://${name}:61208`, authorization: null };
}

/**
 * Builds the reading the fixture payload parses to.
 *
 * @returns The reading.
 */
export function fixtureReading(): Reading {
  return parseReading(GLANCES_PAYLOAD, SAMPLED_AT, TOP_PROCESS_COUNT);
}

/**
 * Builds a client whose hosts answer or fail as the test decides.
 *
 * @param failing - Names of hosts whose read throws, with the message to throw.
 * @returns The client.
 */
export function createFakeClient(failing: Record<string, string> = {}): GlancesClient {
  return {
    read: async (host) => {
      const failure = failing[host.name];
      if (failure !== undefined) {
        throw new Error(failure);
      }
      return fixtureReading();
    },
  };
}

/**
 * Reads the port a test server was given.
 *
 * @param server - A server listening on port 0.
 * @returns The port the OS picked.
 * @throws If the server is not listening on a TCP port.
 */
export function portOf(server: Server): number {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('The test server is not listening on a TCP port.');
  }
  return address.port;
}
