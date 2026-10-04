import { SAMPLER_DEFAULTS, type SamplerSettings } from '../core/defaults.ts';
import type { Reading } from '../glances/reading.ts';
import { type HostState, HostStatus, sampleOf } from './host-state.ts';

/** The latest state of every host, with a bounded history each. Lost on restart. */
export interface HostStore {
  /** Every host, in configured order. */
  all: () => HostState[];
  /** One host, or null when no host has that name. */
  find: (name: string) => HostState | null;
  /** Records a successful reading and returns the host's new state. */
  recordReading: (name: string, reading: Reading) => HostState;
  /** Records a failed sample, keeping the last reading, and returns the host's new state. */
  recordFailure: (name: string, error: string) => HostState;
}

/**
 * Builds the in-memory store of host states.
 *
 * @param names - The configured host names.
 * @param [overrides] - Sampler settings to replace.
 * @returns The store, with every host pending.
 */
export function createHostStore(names: readonly string[], overrides: Partial<SamplerSettings> = {}): HostStore {
  const { historySampleCount } = { ...SAMPLER_DEFAULTS, ...overrides };
  const pending = (name: string): HostState => ({
    name,
    status: HostStatus.Pending,
    error: null,
    reading: null,
    history: [],
  });
  const states = new Map(names.map((name) => [name, pending(name)]));

  const stateOf = (name: string): HostState => {
    const state = states.get(name);
    if (state === undefined) {
      throw new Error(`No host named "${name}" is configured. Known hosts: ${names.join(', ')}.`);
    }
    return state;
  };

  const replace = (next: HostState): HostState => {
    states.set(next.name, next);
    return next;
  };

  return {
    all: () => [...states.values()],
    find: (name) => states.get(name) ?? null,
    recordReading: (name, reading) => {
      const history = [...stateOf(name).history, sampleOf(reading)].slice(-historySampleCount);
      return replace({ name, status: HostStatus.Online, error: null, reading, history });
    },
    recordFailure: (name, error) => replace({ ...stateOf(name), status: HostStatus.Unreachable, error }),
  };
}
