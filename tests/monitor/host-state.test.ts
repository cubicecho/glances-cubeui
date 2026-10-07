import type { Gpu } from '../../server/glances/reading.ts';
import { sampleOf } from '../../server/monitor/host-state.ts';
import { fixtureReading } from '../helpers.ts';

/**
 * Builds a graphics card that reports only the figures given.
 *
 * @param id - Glances' identifier for the card.
 * @param usagePercent - How busy it is, or null when the driver does not say.
 * @param memoryPercent - How much of its memory is in use, or null when the driver does not say.
 * @returns The card.
 */
function gpu(id: string, usagePercent: number | null, memoryPercent: number | null): Gpu {
  return { id, name: null, usagePercent, memoryPercent, temperature: null, fanSpeedPercent: null };
}

describe('sampleOf', () => {
  it('has no graphics figures for a machine without a card', () => {
    const sample = sampleOf({ ...fixtureReading(), gpus: [] });
    expect(sample).toMatchObject({ gpuPercent: null, gpuMemoryPercent: null });
  });

  it('averages each graphics figure over the cards that report it', () => {
    const sample = sampleOf({ ...fixtureReading(), gpus: [gpu('0', 20, 30), gpu('1', 60, null)] });
    expect(sample).toMatchObject({ gpuPercent: 40, gpuMemoryPercent: 30 });
  });
});
