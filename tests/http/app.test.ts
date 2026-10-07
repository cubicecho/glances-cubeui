import type { Server } from 'node:http';
import { OPERATION_LIMIT_DEFAULTS } from '../../server/core/defaults.ts';
import { ErrorCode } from '../../server/core/errors.ts';
import { HttpStatus } from '../../server/core/wire.ts';
import { createApp } from '../../server/http/app.ts';
import { createHostBus, type HostBus } from '../../server/monitor/host-bus.ts';
import { HostStatus } from '../../server/monitor/host-state.ts';
import { createHostStore, type HostStore } from '../../server/monitor/host-store.ts';
import { sampleHost } from '../../server/monitor/sampler.ts';
import { createFakeClient, hostNamed, portOf } from '../helpers.ts';

/** Past `HTTP_DEFAULTS.bodyLimit`, which is 1 MB. */
const OVERSIZED_PADDING_BYTES = 1_100_000;
const HOSTS_QUERY = '{ hosts { name status error reading { system { hostname } } history { cpuPercent } } }';

describe('app', () => {
  let server: Server;
  let base: string;
  let store: HostStore;
  let bus: HostBus;

  beforeAll(async () => {
    store = createHostStore(['nas', 'dead']);
    bus = createHostBus();
    server = createApp({ store, bus }).listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${portOf(server)}`;
  });

  afterAll(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const post = (body: unknown) =>
    fetch(`${base}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('reports healthy', async () => {
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(HttpStatus.Ok);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it('serves each host with its status, reading and history', async () => {
    const deps = { client: createFakeClient({ dead: 'connect ECONNREFUSED' }), store, bus };
    await sampleHost(deps, hostNamed('nas'));
    await sampleHost(deps, hostNamed('dead'));
    const { data } = await (await post({ query: HOSTS_QUERY })).json();
    expect(data.hosts).toEqual([
      {
        name: 'nas',
        status: HostStatus.Online,
        error: null,
        reading: { system: { hostname: 'fixture-host' } },
        history: [{ cpuPercent: expect.any(Number) }],
      },
      { name: 'dead', status: HostStatus.Unreachable, error: 'connect ECONNREFUSED', reading: null, history: [] },
    ]);
  });

  it('narrows a reading to the detail asked for', async () => {
    const query = `{ host(name: "nas") { reading {
      filesystemCount networkInterfaceCount
      filesystems(detail: SUMMARY, hideSystem: true) { mountPoint datasets { mountPoint } }
      networkInterfaces(detail: SUMMARY) { name }
      every: networkInterfaces { name }
      disks(detail: SUMMARY) { name }
    } } }`;
    const { data } = await (await post({ query })).json();
    expect(data.host.reading).toEqual({
      filesystemCount: 1,
      networkInterfaceCount: 2,
      filesystems: [{ mountPoint: '/etc/resolv.conf', datasets: [] }],
      networkInterfaces: [{ name: 'eth0' }],
      every: [{ name: 'lo' }, { name: 'eth0' }],
      disks: [{ name: 'sda' }],
    });
  });

  it('answers an unknown host name with NOT_FOUND', async () => {
    const { errors } = await (await post({ query: '{ host(name: "nope") { name } }' })).json();
    expect(errors[0].extensions.code).toBe(ErrorCode.NotFound);
  });

  it('streams a sampled host to a subscriber over SSE', async () => {
    const query = encodeURIComponent('subscription { hostChanged(name: "nas") { name status } }');
    const controller = new AbortController();
    const response = await fetch(`${base}/graphql?query=${query}`, {
      headers: { accept: 'text/event-stream' },
      signal: controller.signal,
    });
    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    let received = '';
    // The subscription is live once the stream is open; publish until an event arrives.
    while (received.includes('"hostChanged"') === false) {
      await sampleHost({ client: createFakeClient(), store, bus }, hostNamed('nas'));
      const chunk = await reader?.read();
      received += chunk?.value ?? '';
    }
    controller.abort();
    expect(received).toContain('event: next');
    expect(received).toContain(`{"data":{"hostChanged":{"name":"nas","status":"${HostStatus.Online}"}}}`);
  });

  it('refuses a document with more aliases than maxAliases', async () => {
    const aliases = Array.from(
      { length: OPERATION_LIMIT_DEFAULTS.maxAliases + 1 },
      (_, index) => `a${index}: hosts { name }`,
    );
    const body = await (await post({ query: `{ ${aliases.join(' ')} }` })).json();
    expect(body.errors[0].extensions.code).toBe(ErrorCode.QueryTooComplex);
    expect(body.data).toBeUndefined();
  });

  it('rejects a body over the body limit with 413', async () => {
    const response = await post({ query: '{ __typename }', variables: { pad: 'x'.repeat(OVERSIZED_PADDING_BYTES) } });
    expect(response.status).toBe(HttpStatus.PayloadTooLarge);
  });
});
