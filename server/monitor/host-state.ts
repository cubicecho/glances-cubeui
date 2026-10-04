import type { Reading } from '../glances/reading.ts';

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
  /** Received on every interface but loopback, in bytes per second. */
  receivedBytesPerSecond: number;
  /** Sent on every interface but loopback, in bytes per second. */
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

/** The loopback interface, whose traffic never leaves the machine. */
const LOOPBACK_INTERFACE = 'lo';

/**
 * Reduces a reading to the numbers charted over time.
 *
 * @param reading - The full reading.
 * @returns Its sample.
 */
export function sampleOf(reading: Reading): Sample {
  const external = reading.networkInterfaces.filter((network) => network.name !== LOOPBACK_INTERFACE);
  return {
    sampledAt: reading.sampledAt,
    cpuPercent: reading.cpu.totalPercent,
    memoryPercent: reading.memory.percent,
    load1: reading.load?.min1 ?? null,
    receivedBytesPerSecond: external.reduce((sum, network) => sum + network.receivedBytesPerSecond, 0),
    sentBytesPerSecond: external.reduce((sum, network) => sum + network.sentBytesPerSecond, 0),
  };
}
