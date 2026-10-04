import { createHostBus } from '../../server/monitor/host-bus.ts';
import { HostStatus } from '../../server/monitor/host-state.ts';
import { createHostStore } from '../../server/monitor/host-store.ts';
import { sampleHost } from '../../server/monitor/sampler.ts';
import { createFakeClient, fixtureReading, hostNamed } from '../helpers.ts';

const REFUSED = 'connect ECONNREFUSED';

describe('sampleHost', () => {
  it('marks a host online, keeps its reading and adds a sample', async () => {
    const store = createHostStore(['nas']);
    const state = await sampleHost({ client: createFakeClient(), store, bus: createHostBus() }, hostNamed('nas'));
    expect(state).toMatchObject({ status: HostStatus.Online, error: null, reading: fixtureReading() });
    expect(state.history).toHaveLength(1);
    expect(store.find('nas')).toBe(state);
  });

  it('marks a host unreachable with the reason, and keeps what it last read', async () => {
    const store = createHostStore(['nas']);
    const bus = createHostBus();
    await sampleHost({ client: createFakeClient(), store, bus }, hostNamed('nas'));
    const state = await sampleHost({ client: createFakeClient({ nas: REFUSED }), store, bus }, hostNamed('nas'));
    expect(state).toMatchObject({ status: HostStatus.Unreachable, error: REFUSED, reading: fixtureReading() });
    expect(state.history).toHaveLength(1);
  });

  it('publishes the new state to a watcher of that host only', async () => {
    const store = createHostStore(['nas', 'pi']);
    const bus = createHostBus();
    const deps = { client: createFakeClient(), store, bus };
    const events = bus.watch('pi');
    // The watch attaches its listener on the first next(), so ask before sampling.
    const next = events.next();
    await sampleHost(deps, hostNamed('nas'));
    await sampleHost(deps, hostNamed('pi'));
    expect((await next).value).toMatchObject({ name: 'pi' });
    await events.return();
  });
});

describe('createHostStore', () => {
  it('starts every host pending, in configured order', () => {
    const states = createHostStore(['nas', 'pi']).all();
    expect(states.map((state) => [state.name, state.status])).toEqual([
      ['nas', HostStatus.Pending],
      ['pi', HostStatus.Pending],
    ]);
  });

  it('drops the oldest sample past the history size', () => {
    const historySampleCount = 3;
    const store = createHostStore(['nas'], { historySampleCount });
    const stamps = ['01', '02', '03', '04', '05'].map((second) => `2026-01-01T00:00:${second}.000Z`);
    for (const sampledAt of stamps) {
      store.recordReading('nas', { ...fixtureReading(), sampledAt });
    }
    const kept = store.find('nas')?.history.map((sample) => sample.sampledAt);
    expect(kept).toEqual(stamps.slice(-historySampleCount));
  });
});

describe('createHostBus', () => {
  it('ends a watch when its signal aborts', async () => {
    const controller = new AbortController();
    const events = createHostBus().watch(null, controller.signal);
    const next = events.next();
    controller.abort();
    expect((await next).done).toBe(true);
  });
});
