import type { HostState } from './host-state.ts';

/** Carries each host's new state to whoever is watching. */
export interface HostBus {
  /** Tells every watcher a host changed. */
  publish: (state: HostState) => void;
  /** Follows changes until the signal aborts. A null name follows every host. */
  watch: (hostName: string | null, signal?: AbortSignal) => AsyncGenerator<HostState, void, void>;
}

/**
 * Builds an in-process bus of host changes.
 *
 * @returns The bus.
 */
export function createHostBus(): HostBus {
  const listeners = new Set<(state: HostState) => void>();

  const publish: HostBus['publish'] = (state) => {
    for (const listener of listeners) {
      listener(state);
    }
  };

  /**
   * Follows changes. The listener attaches on the first `next()`.
   *
   * @param hostName - The host to follow, or null for all.
   * @param [signal] - Ends the watch.
   */
  async function* watch(hostName: string | null, signal?: AbortSignal): AsyncGenerator<HostState, void, void> {
    const queue: HostState[] = [];
    let wake: () => void = () => {};
    const listener = (state: HostState): void => {
      const isWatched = hostName === null || state.name === hostName;
      if (isWatched) {
        queue.push(state);
        wake();
      }
    };
    const onAbort = (): void => wake();
    listeners.add(listener);
    signal?.addEventListener('abort', onAbort);
    try {
      while (signal?.aborted !== true) {
        const next = queue.shift();
        if (next === undefined) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        } else {
          yield next;
        }
      }
    } finally {
      listeners.delete(listener);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  return { publish, watch };
}
