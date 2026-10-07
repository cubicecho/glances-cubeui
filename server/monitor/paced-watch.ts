import { PACING_DEFAULTS, type PacingSettings } from '../core/defaults.ts';
import { MS_PER_SECOND } from '../core/wire.ts';
import type { HostState, HostStatus } from './host-state.ts';

/** How one subscriber is paced. */
export interface Pace {
  /** How often the subscriber wants to hear of each host, in seconds. */
  intervalSeconds: number;
  /** How often the sampler reads every host, in seconds. */
  sampleIntervalSeconds: number;
}

/** What a subscriber was last sent about one host. */
interface Sent {
  atMs: number;
  status: HostStatus;
}

/**
 * Settles the interval a subscriber is updated at.
 *
 * @param requestedSeconds - What the subscriber asked for, or null for every sample.
 * @param sampleIntervalSeconds - How often the sampler reads every host.
 * @param [overrides] - Pacing settings to replace.
 * @returns The request, raised to the sample interval and capped at the longest allowed.
 */
export function paceInterval(
  requestedSeconds: number | null,
  sampleIntervalSeconds: number,
  overrides: Partial<PacingSettings> = {},
): number {
  const { maxIntervalSeconds } = { ...PACING_DEFAULTS, ...overrides };
  const ceiling = Math.max(maxIntervalSeconds, sampleIntervalSeconds);
  return Math.min(Math.max(requestedSeconds ?? sampleIntervalSeconds, sampleIntervalSeconds), ceiling);
}

/**
 * Thins a stream of host states to one per host per interval. A host's first state and any change
 * of status pass at once; a state held back is dropped, since the next one carries the full history.
 *
 * @param events - The states as sampled. It is closed when the paced stream is.
 * @param pace - The settled interval and the sampler's.
 * @param [now] - The clock, in milliseconds.
 * @param [overrides] - Pacing settings to replace.
 * @returns The thinned stream, or `events` itself when every sample is wanted.
 */
export function paced(
  events: AsyncGenerator<HostState, void, void>,
  pace: Pace,
  now: () => number = Date.now,
  overrides: Partial<PacingSettings> = {},
): AsyncGenerator<HostState, void, void> {
  const { earlySampleShare } = { ...PACING_DEFAULTS, ...overrides };
  const wantsEverySample = pace.intervalSeconds <= pace.sampleIntervalSeconds;
  if (wantsEverySample) {
    return events;
  }
  const dueAfterMs = (pace.intervalSeconds - pace.sampleIntervalSeconds * earlySampleShare) * MS_PER_SECOND;
  const sentByHost = new Map<string, Sent>();

  /**
   * Passes on the states that are due.
   */
  async function* thin(): AsyncGenerator<HostState, void, void> {
    for await (const state of events) {
      const sent = sentByHost.get(state.name);
      const atMs = now();
      const isDue = sent === undefined || sent.status !== state.status || atMs - sent.atMs >= dueAfterMs;
      if (isDue) {
        sentByHost.set(state.name, { atMs, status: state.status });
        yield state;
      }
    }
  }
  return thin();
}
