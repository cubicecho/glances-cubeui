import type { HostBus } from '../monitor/host-bus.ts';
import type { HostStore } from '../monitor/host-store.ts';

/** What every resolver is given. */
export interface Context {
  store: HostStore;
  bus: HostBus;
  /** The HTTP request, when there is one. Its signal ends a subscription the client left. */
  request?: Request;
}
