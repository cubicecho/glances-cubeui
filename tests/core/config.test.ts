import { sampleIntervalSeconds } from '../../server/core/config.ts';
import { SAMPLER_DEFAULTS } from '../../server/core/defaults.ts';

describe('sampleIntervalSeconds', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is the default when SAMPLE_INTERVAL_SECONDS is unset or blank', () => {
    vi.stubEnv('SAMPLE_INTERVAL_SECONDS', undefined);
    expect(sampleIntervalSeconds()).toBe(SAMPLER_DEFAULTS.intervalSeconds);
    vi.stubEnv('SAMPLE_INTERVAL_SECONDS', '  ');
    expect(sampleIntervalSeconds()).toBe(SAMPLER_DEFAULTS.intervalSeconds);
  });

  it.each([
    ['10', 10],
    [' 2.5 ', 2.5],
    [String(SAMPLER_DEFAULTS.minIntervalSeconds), SAMPLER_DEFAULTS.minIntervalSeconds],
    [String(SAMPLER_DEFAULTS.maxIntervalSeconds), SAMPLER_DEFAULTS.maxIntervalSeconds],
  ])('reads "%s" as %s seconds', (raw, seconds) => {
    vi.stubEnv('SAMPLE_INTERVAL_SECONDS', raw);
    expect(sampleIntervalSeconds()).toBe(seconds);
  });

  it.each(['fast', '0', '-3', '0.25', '301', '5s', 'Infinity'])('refuses "%s" with a sentence', (raw) => {
    vi.stubEnv('SAMPLE_INTERVAL_SECONDS', raw);
    expect(() => sampleIntervalSeconds()).toThrow(`SAMPLE_INTERVAL_SECONDS is "${raw}". Expected a number of seconds`);
  });
});
