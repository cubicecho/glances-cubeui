import { PACING_DEFAULTS } from '../../server/core/defaults.ts';
import { type HostState, HostStatus } from '../../server/monitor/host-state.ts';
import { paced, paceInterval } from '../../server/monitor/paced-watch.ts';

const SAMPLE_INTERVAL_SECONDS = 3;

/** One sampled state and the moment it arrives, in seconds from the start. */
interface Arrival {
  atSeconds: number;
  name: string;
  status?: HostStatus;
}

/**
 * Runs arrivals through `paced` on a clock the test owns.
 *
 * @param intervalSeconds - The interval the subscriber settled on.
 * @param arrivals - The sampled states, in order.
 * @returns What got through, as `name@seconds`.
 */
async function passed(intervalSeconds: number, arrivals: Arrival[]): Promise<string[]> {
  let nowMs = 0;
  /**
   * Yields each arrival's state after moving the clock to its moment.
   */
  async function* source(): AsyncGenerator<HostState, void, void> {
    for (const arrival of arrivals) {
      nowMs = arrival.atSeconds * 1000;
      yield {
        name: arrival.name,
        status: arrival.status ?? HostStatus.Online,
        error: null,
        reading: null,
        history: [],
      };
    }
  }
  const pace = { intervalSeconds, sampleIntervalSeconds: SAMPLE_INTERVAL_SECONDS };
  const through: string[] = [];
  for await (const state of paced(source(), pace, () => nowMs)) {
    through.push(`${state.name}@${nowMs / 1000}`);
  }
  return through;
}

/**
 * Builds one host's arrivals on the sampler's beat.
 *
 * @param name - The host.
 * @param count - How many samples.
 * @returns Arrivals at 0, 3, 6 and so on.
 */
function onTheBeat(name: string, count: number): Arrival[] {
  return Array.from({ length: count }, (_, index) => ({ atSeconds: index * SAMPLE_INTERVAL_SECONDS, name }));
}

describe('paceInterval', () => {
  it('is the sample interval when the subscriber asks for nothing', () => {
    expect(paceInterval(null, SAMPLE_INTERVAL_SECONDS)).toBe(SAMPLE_INTERVAL_SECONDS);
  });

  it('keeps a request slower than the sampler', () => {
    expect(paceInterval(30, SAMPLE_INTERVAL_SECONDS)).toBe(30);
  });

  it.each([1, 0, -10])('raises a request of %s to the sample interval', (requested) => {
    expect(paceInterval(requested, SAMPLE_INTERVAL_SECONDS)).toBe(SAMPLE_INTERVAL_SECONDS);
  });

  it('caps a request at the longest interval allowed', () => {
    expect(paceInterval(1_000_000, SAMPLE_INTERVAL_SECONDS)).toBe(PACING_DEFAULTS.maxIntervalSeconds);
    expect(paceInterval(90, SAMPLE_INTERVAL_SECONDS, { maxIntervalSeconds: 60 })).toBe(60);
  });

  it('never goes below a sampler slower than the cap', () => {
    expect(paceInterval(null, 120, { maxIntervalSeconds: 60 })).toBe(120);
  });
});

describe('paced', () => {
  it('hands back the source itself when every sample is wanted', () => {
    const source = (async function* (): AsyncGenerator<HostState, void, void> {})();
    const pace = { intervalSeconds: SAMPLE_INTERVAL_SECONDS, sampleIntervalSeconds: SAMPLE_INTERVAL_SECONDS };
    expect(paced(source, pace)).toBe(source);
  });

  it('passes a host on at the sample nearest each interval', async () => {
    // Samples at 0, 3, 6 ... 30. Every 10 s lands on 0, then 9 (nearer 10 than 12), 18, 27.
    expect(await passed(10, onTheBeat('nas', 11))).toEqual(['nas@0', 'nas@9', 'nas@18', 'nas@27']);
  });

  it('passes every second sample at twice the sample interval, despite a late sampler', async () => {
    const arrivals = [0, 3.1, 6.1, 9.3, 12.3].map((atSeconds) => ({ atSeconds, name: 'nas' }));
    expect(await passed(6, arrivals)).toEqual(['nas@0', 'nas@6.1', 'nas@12.3']);
  });

  it('paces each host on its own clock', async () => {
    const arrivals = [
      { atSeconds: 0, name: 'nas' },
      { atSeconds: 3, name: 'nas' },
      { atSeconds: 4, name: 'pi' },
      { atSeconds: 6, name: 'nas' },
      { atSeconds: 7, name: 'pi' },
      { atSeconds: 9, name: 'nas' },
    ];
    expect(await passed(10, arrivals)).toEqual(['nas@0', 'pi@4', 'nas@9']);
  });

  it('passes a change of status at once, then paces from it', async () => {
    const arrivals = [
      { atSeconds: 0, name: 'nas' },
      { atSeconds: 3, name: 'nas', status: HostStatus.Unreachable },
      { atSeconds: 6, name: 'nas', status: HostStatus.Unreachable },
      { atSeconds: 9, name: 'nas' },
    ];
    expect(await passed(60, arrivals)).toEqual(['nas@0', 'nas@3', 'nas@9']);
  });

  it('closes the source when the subscriber leaves', async () => {
    let isClosed = false;
    /**
     * Yields forever, and notes when it is closed.
     */
    async function* source(): AsyncGenerator<HostState, void, void> {
      try {
        while (true) {
          yield { name: 'nas', status: HostStatus.Online, error: null, reading: null, history: [] };
        }
      } finally {
        isClosed = true;
      }
    }
    const events = paced(source(), { intervalSeconds: 10, sampleIntervalSeconds: SAMPLE_INTERVAL_SECONDS });
    await events.next();
    await events.return();
    expect(isClosed).toBe(true);
  });
});
