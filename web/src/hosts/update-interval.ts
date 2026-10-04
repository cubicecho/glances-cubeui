/** How long a figure takes to reach its new value when nothing says how often updates come, in milliseconds. */
export const DEFAULT_ANIMATION_MS = 300;
/** The share of the time between two updates that a figure spends moving. */
const ANIMATED_SHARE = 0.5;
const MIN_SAMPLES = 2;

/** What {@link animationMs} reads of a host: when each kept sample was taken. */
interface SampledHost {
  history: { sampledAt: string }[];
}

/**
 * How long figures should take to move to a new value: half the time between updates.
 *
 * @param hosts - The hosts as last read. The spacing of a host's two latest samples is the update rate.
 * @returns Milliseconds, or {@link DEFAULT_ANIMATION_MS} while no host has two samples to measure.
 *
 * @remarks
 * Every host is sampled on the same timer, so the first host with enough history speaks for all.
 * Finishing in half the interval leaves each figure at rest before the next one arrives.
 */
export function animationMs(hosts: SampledHost[] | undefined): number {
  for (const host of hosts ?? []) {
    const [previous, latest] = host.history.slice(-MIN_SAMPLES);
    if (previous === undefined || latest === undefined) {
      continue;
    }
    const interval = Date.parse(latest.sampledAt) - Date.parse(previous.sampledAt);
    if (Number.isFinite(interval) && interval > 0) {
      return Math.round(interval * ANIMATED_SHARE);
    }
  }
  return DEFAULT_ANIMATION_MS;
}
