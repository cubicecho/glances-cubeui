import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  HostChangedDocument,
  type HostFieldsFragment,
  HostsDocument,
  SampleIntervalDocument,
} from '@/__generated__/graphql';
import { request, subscribe } from '@/core/gql';
import { animationMs } from '@/hosts/update-interval';
import { useSettings } from '@/settings/use-settings';

/** One monitored host as the web app reads it. */
export type Host = HostFieldsFragment;

const HOSTS_KEY = ['hosts'] as const;
const SAMPLE_INTERVAL_KEY = ['sample-interval'] as const;

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
 * Reads how often the server samples every host, which is the fastest the dashboard can update.
 *
 * @returns The query, in seconds. It is fetched once: the interval only changes when the server restarts.
 */
export function useSampleIntervalSeconds(): UseQueryResult<number> {
  return useQuery({
    queryKey: SAMPLE_INTERVAL_KEY,
    queryFn: async () => (await request(SampleIntervalDocument)).sampleIntervalSeconds,
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
 * Mounted once, at the root, so every page reads the same live cache. The server paces the stream
 * to the update interval in the settings, and changing it opens the stream again at the new pace.
 */
export function useHostsSubscription(): void {
  const client = useQueryClient();
  const [{ updateIntervalSeconds }] = useSettings();
  useEffect(
    () =>
      subscribe(
        HostChangedDocument,
        { intervalSeconds: updateIntervalSeconds },
        {
          next: ({ hostChanged }) => {
            client.setQueryData<Host[]>(HOSTS_KEY, (hosts) =>
              hosts?.map((host) => (host.name === hostChanged.name ? hostChanged : host)),
            );
          },
          error: (error) => console.warn(`[hosts] ${error.message}`),
        },
      ),
    [client, updateIntervalSeconds],
  );
}
