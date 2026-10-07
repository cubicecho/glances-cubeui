import type { Reading } from '../glances/reading.ts';
import { uplinkInterfaces } from '../glances/traffic-view.ts';

/** Whether a host is answering. */
export const HostStatus = {
  /** Not sampled yet. */
  Pending: 'PENDING',
  /** The last sample succeeded. */
  Online: 'ONLINE',
  /** The last sample failed. */
  Unreachable: 'UNREACHABLE',
} as const;
export type HostStatus = (typeof HostStatus)[keyof typeof HostStatus];

/** The few numbers kept from each reading, for charts. */
export interface Sample {
  /** When the reading was taken, as an ISO timestamp. */
  sampledAt: string;
  cpuPercent: number;
  memoryPercent: number;
  /** One-minute load average, or null where the machine has none. */
  load1: number | null;
  /** How busy the graphics cards are, averaged over those that say. Null where none does. */
  gpuPercent: number | null;
  /** How much graphics memory is in use, averaged over the cards that say. Null where none does. */
  gpuMemoryPercent: number | null;
  /** Received on the physical interfaces, in bytes per second. */
  receivedBytesPerSecond: number;
  /** Sent on the physical interfaces, in bytes per second. */
  sentBytesPerSecond: number;
}

/** What is known about one host right now. */
export interface HostState {
  name: string;
  status: HostStatus;
  /** Why the last sample failed, or null when it succeeded or none was taken. */
  error: string | null;
  /** The last successful reading, kept while the host is unreachable. */
  reading: Reading | null;
  /** Recent samples, oldest first. */
  history: readonly Sample[];
}

/**
 * Averages the figures that are known.
 *
 * @param values - One figure per item, null where an item does not report it.
 * @returns The mean of the known figures, or null when none is known.
 */
function meanOf(values: readonly (number | null)[]): number | null {
  const known = values.filter((value) => value !== null);
  if (known.length === 0) {
    return null;
  }
  return known.reduce((sum, value) => sum + value, 0) / known.length;
}

/**
 * Reduces a reading to the numbers charted over time.
 *
 * @param reading - The full reading.
 * @returns Its sample.
 */
export function sampleOf(reading: Reading): Sample {
  const external = uplinkInterfaces(reading.networkInterfaces);
  return {
    sampledAt: reading.sampledAt,
    cpuPercent: reading.cpu.totalPercent,
    memoryPercent: reading.memory.percent,
    load1: reading.load?.min1 ?? null,
    gpuPercent: meanOf(reading.gpus.map((gpu) => gpu.usagePercent)),
    gpuMemoryPercent: meanOf(reading.gpus.map((gpu) => gpu.memoryPercent)),
    receivedBytesPerSecond: external.reduce((sum, network) => sum + network.receivedBytesPerSecond, 0),
    sentBytesPerSecond: external.reduce((sum, network) => sum + network.sentBytesPerSecond, 0),
  };
}
