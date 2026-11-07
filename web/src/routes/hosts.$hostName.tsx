import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { CardLayout } from '@/components/card-layout';
import { DescriptionList, PropertyRow } from '@/components/description-list';
import { EmptyState } from '@/components/page';
import { PageLayout } from '@/components/page-layout';
import { QueryState } from '@/components/query-state';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ServerOff } from '@/core/app-icons';
import { formatBytes, formatPercent, formatRate, formatTime } from '@/core/format';
import { HostStatusBadge } from '@/hosts/host-status-badge';
import { type Host, useHostEverything, useHosts } from '@/hosts/use-live-hosts';
import { ReadingRings } from '@/readings/reading-rings';
import {
  ContainerTable,
  describeLoad,
  FilesystemTable,
  GpuTable,
  NetworkTable,
  ProcessTable,
  SensorTable,
} from '@/readings/reading-tables';
import { NETWORK_SERIES, UsageChart, usageSeries } from '@/readings/usage-chart';
import { useSettings } from '@/settings/use-settings';

export const Route = createFileRoute('/hosts/$hostName')({ component: HostRoute });

/**
 * One host in full: headline figures, trends over the kept history, and each plugin's table.
 */
function HostRoute() {
  const { hostName } = Route.useParams();
  const query = useHosts();
  const host = query.data?.find((candidate) => candidate.name === hostName);

  return (
    <PageLayout
      title={hostName}
      breadcrumbs={<Link to="/">Overview</Link>}
      description={host?.reading?.system.description ?? undefined}
      action={host ? <HostStatusBadge status={host.status} /> : undefined}
      content={
        <div className="flex flex-col gap-6 py-4">
          <QueryState
            query={query}
            what="this host"
            count={host ? 1 : 0}
            empty={
              <EmptyState
                icon={ServerOff}
                level={2}
                title={`No host named ${hostName}`}
                description="It is not in GLANCES_HOSTS on this server."
              />
            }
          />
          {host ? <HostReadings host={host} /> : null}
        </div>
      }
    />
  );
}

/**
 * Switches a table between the rows the settings ask for and every row the host reports.
 *
 * @param props.shownCount - How many rows the settings show.
 * @param props.count - How many rows the host reports.
 * @param props.showsAll - Whether the table is showing every row.
 * @param props.onChange - Called with the new choice.
 * @returns The button, or nothing when the settings already show every row.
 */
function ShowAllButton({
  shownCount,
  count,
  showsAll,
  onChange,
}: {
  shownCount: number;
  count: number;
  showsAll: boolean;
  onChange: (showsAll: boolean) => void;
}) {
  const hidesNothing = shownCount >= count;
  if (hidesNothing && showsAll === false) {
    return null;
  }
  return (
    <Button variant="ghost" size="sm" aria-pressed={showsAll} onClick={() => onChange(showsAll === false)}>
      {showsAll ? 'Show fewer' : `Show all ${count}`}
    </Button>
  );
}

/**
 * Says how long a host has been up and how much it is running.
 *
 * @param reading - The host's latest reading.
 * @returns For example `"Up 14 days, 15:54:25 with 1049 processes."`, with only the parts the host reports.
 */
function describeRunning(reading: NonNullable<Host['reading']>): string | undefined {
  const processes = reading.processCount ? `${reading.processCount.total} processes` : null;
  if (reading.uptime === null) {
    return processes === null ? undefined : `Running ${processes}.`;
  }
  return processes === null ? `Up ${reading.uptime}.` : `Up ${reading.uptime} with ${processes}.`;
}

/**
 * Everything the page shows about a host that exists.
 *
 * @param props.host - The host to draw.
 */
function HostReadings({ host }: { host: Host }) {
  const { reading, history } = host;
  const [{ byteUnits }] = useSettings();
  const [showsAllFilesystems, setShowsAllFilesystems] = useState(false);
  const [showsAllInterfaces, setShowsAllInterfaces] = useState(false);
  const everything = useHostEverything(host.name, showsAllFilesystems || showsAllInterfaces).data;

  return (
    <>
      {host.status === 'UNREACHABLE' ? (
        <Alert
          variant="warning"
          title="This host is not answering"
          description={
            reading
              ? `${host.error ?? 'The last request failed.'} Showing the reading from ${formatTime(reading.sampledAt)}.`
              : (host.error ?? 'The last request failed.')
          }
        />
      ) : null}
      <CardLayout
        level={2}
        title="Now"
        description={reading ? describeRunning(reading) : undefined}
        contentSlot={
          reading ? <ReadingRings reading={reading} /> : <EmptyState compact title="No reading from this host yet." />
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <CardLayout
          level={2}
          title="Usage"
          description="Share in use over the kept history."
          contentSlot={
            <UsageChart
              samples={history}
              percent
              label="Share in use over time"
              formatValue={formatPercent}
              series={usageSeries(history)}
            />
          }
        />
        <CardLayout
          level={2}
          title="Network"
          description="Physical interfaces together."
          contentSlot={
            <UsageChart
              samples={history}
              label="Network traffic over time"
              formatValue={(value) => formatRate(value, byteUnits)}
              series={NETWORK_SERIES}
            />
          }
        />
      </div>
      {reading ? (
        <>
          {reading.gpus.length > 0 ? (
            <CardLayout level={2} title="GPU" contentSlot={<GpuTable gpus={reading.gpus} />} />
          ) : null}
          <CardLayout
            level={2}
            title="Filesystems"
            actionSlot={
              <ShowAllButton
                shownCount={reading.filesystems.length}
                count={reading.filesystemCount}
                showsAll={showsAllFilesystems}
                onChange={setShowsAllFilesystems}
              />
            }
            contentSlot={
              <FilesystemTable filesystems={(showsAllFilesystems && everything?.filesystems) || reading.filesystems} />
            }
          />
          <CardLayout level={2} title="Top processes" contentSlot={<ProcessTable processes={reading.processes} />} />
          <CardLayout level={2} title="Containers" contentSlot={<ContainerTable containers={reading.containers} />} />
          <div className="grid gap-6 xl:grid-cols-2">
            <CardLayout
              level={2}
              title="Network interfaces"
              actionSlot={
                <ShowAllButton
                  shownCount={reading.networkInterfaces.length}
                  count={reading.networkInterfaceCount}
                  showsAll={showsAllInterfaces}
                  onChange={setShowsAllInterfaces}
                />
              }
              contentSlot={
                <NetworkTable
                  interfaces={(showsAllInterfaces && everything?.networkInterfaces) || reading.networkInterfaces}
                />
              }
            />
            <CardLayout level={2} title="Sensors" contentSlot={<SensorTable sensors={reading.sensors} />} />
          </div>
          <CardLayout
            level={2}
            title="System"
            contentSlot={
              <DescriptionList
                content={[
                  <PropertyRow key="hostname" label="Hostname" value={reading.system.hostname} />,
                  <PropertyRow
                    key="os"
                    label="Operating system"
                    value={[reading.system.distribution ?? reading.system.osName, reading.system.osVersion]
                      .filter(Boolean)
                      .join(' ')}
                  />,
                  <PropertyRow key="cpu" label="Processor" value={reading.cpu.name ?? '—'} />,
                  <PropertyRow
                    key="load"
                    label="Load"
                    value={describeLoad(reading.load?.min1 ?? null, reading.cpu.coreCount)}
                  />,
                  <PropertyRow
                    key="swap"
                    label="Swap"
                    value={
                      reading.swap
                        ? `${formatBytes(reading.swap.usedBytes, byteUnits)} of ${formatBytes(reading.swap.totalBytes, byteUnits)}`
                        : '—'
                    }
                  />,
                  <PropertyRow key="glances" label="Glances" value={reading.glancesVersion ?? '—'} />,
                  <PropertyRow key="sampled" label="Last reading" value={formatTime(reading.sampledAt)} />,
                ]}
              />
            }
          />
        </>
      ) : null}
    </>
  );
}
