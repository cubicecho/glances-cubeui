import { SAMPLER_DEFAULTS, type SamplerSettings } from '../core/defaults.ts';
import { errorMessage } from '../core/errors.ts';
import { MS_PER_SECOND } from '../core/wire.ts';
import type { GlancesClient } from '../glances/client.ts';
import type { GlancesHost } from '../glances/hosts.ts';
import type { HostBus } from './host-bus.ts';
import type { HostState } from './host-state.ts';
import type { HostStore } from './host-store.ts';

/** What sampling needs from outside. */
export interface SamplerDeps {
  hosts: readonly GlancesHost[];
  client: GlancesClient;
  store: HostStore;
  bus: HostBus;
}

/** A running sampler. */
export interface Sampler {
  /** Stops scheduling samples. One already in flight still finishes. */
  stop: () => void;
}

/**
 * Samples one host, records the outcome and publishes it.
 *
 * @param deps - The client, store and bus.
 * @param host - The host to sample.
 * @returns The host's new state. A failed request is a state, not a throw.
 */
export async function sampleHost(deps: Omit<SamplerDeps, 'hosts'>, host: GlancesHost): Promise<HostState> {
  const { client, store, bus } = deps;
  let state: HostState;
  try {
    state = store.recordReading(host.name, await client.read(host));
  } catch (error) {
    state = store.recordFailure(host.name, errorMessage(error));
  }
  bus.publish(state);
  return state;
}

/**
 * Samples every host now, then again each interval until stopped.
 *
 * @param deps - The hosts, client, store and bus.
 * @param [overrides] - Sampler settings to replace.
 * @returns The handle that stops it.
 */
export function startSampler(deps: SamplerDeps, overrides: Partial<SamplerSettings> = {}): Sampler {
  const { intervalSeconds } = { ...SAMPLER_DEFAULTS, ...overrides };
  let timer: NodeJS.Timeout | null = null;
  let isStopped = false;

  const round = async (): Promise<void> => {
    await Promise.all(deps.hosts.map((host) => sampleHost(deps, host)));
    if (isStopped) {
      return;
    }
    // Scheduled after the round ends, so a slow host never has two requests in flight.
    timer = setTimeout(round, intervalSeconds * MS_PER_SECOND);
  };
  void round();

  return {
    stop: () => {
      isStopped = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
    },
  };
}
