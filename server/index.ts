// Boot only. Preflight is the first import: it exits with a sentence when the configuration is unusable.
import './core/preflight.ts';
import { glancesHosts, port, sampleIntervalSeconds, version } from './core/config.ts';
import { createGlancesClient } from './glances/client.ts';
import { parseHosts } from './glances/hosts.ts';
import { createApp } from './http/app.ts';
import { stopOnSignals } from './http/shutdown.ts';
import { createHostBus } from './monitor/host-bus.ts';
import { createHostStore } from './monitor/host-store.ts';
import { startSampler } from './monitor/sampler.ts';

const LISTEN_HOST = '0.0.0.0';

const hosts = parseHosts(glancesHosts());
const store = createHostStore(hosts.map((host) => host.name));
const bus = createHostBus();
const client = createGlancesClient({ fetch, now: () => new Date() });
const sampling = { intervalSeconds: sampleIntervalSeconds() };

const server = createApp({ store, bus }, sampling).listen(port(), LISTEN_HOST, () => {
  console.log(
    `[boot] glances-cubeui ${version()} on http://localhost:${port()}, watching ${hosts.length} host(s) every ${sampling.intervalSeconds} s`,
  );
  const sampler = startSampler({ hosts, client, store, bus }, sampling);
  stopOnSignals(server, { before: () => sampler.stop() });
});
