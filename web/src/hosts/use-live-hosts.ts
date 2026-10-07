import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  HostChangedDocument,
  HostEverythingDocument,
  type HostEverythingQuery,
  type HostFieldsFragment,
  HostsDocument,
  SampleIntervalDocument,
} from '@/__generated__/graphql';
import { request, subscribe } from '@/core/gql';
import { animationMs } from '@/hosts/update-interval';
import type { DetailLevel } from '@/settings/defaults';
import { useSettings } from '@/settings/use-settings';

/** One monitored host as the web app reads it. */
export type Host = HostFieldsFragment;

/** Every filesystem and network interface of one host, whatever the settings say. */
export type HostEverything = NonNullable<NonNullable<HostEverythingQuery['host']>['reading']>;

const HOSTS_KEY = 'hosts';
const HOST_EVERYTHING_KEY = 'host-everything';
const SAMPLE_INTERVAL_KEY = ['sample-interval'] as const;
const MS_PER_SECOND = 1000;

/** The part of the settings that decides which rows the server sends. */
interface HostsView {
  detail: DetailLevel;
  hideSystem: boolean;
}

/**
 * Reads which rows of each host the settings ask for.
 *
 * @returns The variables of the hosts query and subscription, and the cache key they are kept under.
 */
function useHostsView(): { view: HostsView; key: readonly unknown[] } {
  const [{ detailLevel, hideSystemStorage }] = useSettings();
  return {
    view: { detail: detailLevel, hideSystem: hideSystemStorage },
    key: [HOSTS_KEY, detailLevel, hideSystemStorage],
  };
}

/**
 * Reads every host from the query cache, fetching once.
 *
 * @returns The hosts query; {@link useHostsSubscription} keeps its data current.
 */
export function useHosts(): UseQueryResult<Host[]> {
  const { view, key } = useHostsView();
  return useQuery({
    queryKey: key,
    queryFn: async () => (await request(HostsDocument, view)).hosts,
  });
}

/**
 * Reads every filesystem and network interface of one host, for a table told to show all.
 *
 * @param hostName - The host's name.
 * @param enabled - Whether any table is showing all. Nothing is fetched until one is.
 * @returns The query. It is read again at the pace the dashboard updates.
 */
export function useHostEverything(hostName: string, enabled: boolean): UseQueryResult<HostEverything | null> {
  const [{ updateIntervalSeconds }] = useSettings();
  const sampleIntervalSeconds = useSampleIntervalSeconds().data;
  const intervalSeconds = updateIntervalSeconds ?? sampleIntervalSeconds;
  return useQuery({
    queryKey: [HOST_EVERYTHING_KEY, hostName],
    queryFn: async () => (await request(HostEverythingDocument, { name: hostName })).host?.reading ?? null,
    enabled,
    refetchInterval: intervalSeconds === undefined ? false : intervalSeconds * MS_PER_SECOND,
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
 * to the update interval and sends the rows the settings ask for; changing either opens the stream again.
 */
export function useHostsSubscription(): void {
  const client = useQueryClient();
  const [{ updateIntervalSeconds }] = useSettings();
  const { detail, hideSystem } = useHostsView().view;
  useEffect(
    () =>
      subscribe(
        HostChangedDocument,
        { intervalSeconds: updateIntervalSeconds, detail, hideSystem },
        {
          next: ({ hostChanged }) => {
            client.setQueryData<Host[]>([HOSTS_KEY, detail, hideSystem], (hosts) =>
              hosts?.map((host) => (host.name === hostChanged.name ? hostChanged : host)),
            );
          },
          error: (error) => console.warn(`[hosts] ${error.message}`),
        },
      ),
    [client, updateIntervalSeconds, detail, hideSystem],
  );
}
