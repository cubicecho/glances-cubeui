import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { HostChangedDocument, type HostFieldsFragment, HostsDocument } from '@/__generated__/graphql';
import { request, subscribe } from '@/core/gql';
import { animationMs } from '@/hosts/update-interval';

/** One monitored host as the web app reads it. */
export type Host = HostFieldsFragment;

const HOSTS_KEY = ['hosts'] as const;

/**
 * Reads every host from the query cache, fetching once.
 *
 * @returns The hosts query; {@link useHostsSubscription} keeps its data current.
 */
export function useHosts(): UseQueryResult<Host[]> {
  return useQuery({
    queryKey: HOSTS_KEY,
    queryFn: async () => (await request(HostsDocument)).hosts,
  });
}

/**
 * How long a figure should take to move to its new value, from how often updates arrive.
 *
 * @returns Milliseconds: half the time between updates, or the default until that can be measured.
 */
export function useAnimationMs(): number {
  return animationMs(useHosts().data);
}

/**
 * Follows `hostChanged` and writes each host into the hosts query.
 *
 * @remarks
 * Mounted once, at the root, so every page reads the same live cache.
 */
export function useHostsSubscription(): void {
  const client = useQueryClient();
  useEffect(
    () =>
      subscribe(
        HostChangedDocument,
        {},
        {
          next: ({ hostChanged }) => {
            client.setQueryData<Host[]>(HOSTS_KEY, (hosts) =>
              hosts?.map((host) => (host.name === hostChanged.name ? hostChanged : host)),
            );
          },
          error: (error) => console.warn(`[hosts] ${error.message}`),
        },
      ),
    [client],
  );
}
