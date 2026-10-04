import { parseReading } from '../../server/glances/reading.ts';
import { fixtureReading, GLANCES_PAYLOAD, SAMPLED_AT, TOP_PROCESS_COUNT } from '../helpers.ts';

/** The three plugins a reading can't do without, as small as they parse. */
const REQUIRED_PLUGINS = {
  system: { hostname: 'bare', os_name: 'Linux' },
  cpu: { total: 12.5 },
  mem: { total: 100, used: 40, available: 60, percent: 40 },
};

describe('parseReading', () => {
  it('reads a captured Glances 4 payload', () => {
    const reading = fixtureReading();
    expect(reading.sampledAt).toBe(SAMPLED_AT.toISOString());
    expect(reading.system.hostname).toBe('fixture-host');
    expect(reading.cores).toHaveLength(8);
    expect(reading.memory.totalBytes).toBeGreaterThan(0);
    expect(reading.filesystems[0]?.mountPoint).toBeTypeOf('string');
    expect(reading.containers[0]).toMatchObject({ name: 'service-1', image: 'example/image:latest' });
    expect(reading.sensors).toContainEqual({ label: 'Package id 0', value: 45, unit: 'C', kind: 'temperature_core' });
  });

  it('keeps only the busiest processes, busiest first', () => {
    const { processes } = fixtureReading();
    const cpu = processes.map((process) => process.cpuPercent);
    expect(processes).toHaveLength(TOP_PROCESS_COUNT);
    expect(cpu).toEqual(cpu.toSorted((a, b) => b - a));
  });

  it('reads a host with every optional plugin off', () => {
    const reading = parseReading(REQUIRED_PLUGINS, SAMPLED_AT, TOP_PROCESS_COUNT);
    expect(reading.cpu.totalPercent).toBe(REQUIRED_PLUGINS.cpu.total);
    expect(reading).toMatchObject({ load: null, swap: null, processCount: null, sensors: [], containers: [] });
  });

  it('says which plugin is missing when the payload is not Glances 4', () => {
    const { cpu: _cpu, ...withoutCpu } = REQUIRED_PLUGINS;
    expect(() => parseReading(withoutCpu, SAMPLED_AT, TOP_PROCESS_COUNT)).toThrow(/at "cpu"/);
  });

  it('ignores plugins it does not read', () => {
    const withExtra = { ...(GLANCES_PAYLOAD as object), somethingNew: { a: 1 } };
    expect(parseReading(withExtra, SAMPLED_AT, TOP_PROCESS_COUNT)).toEqual(fixtureReading());
  });
});
