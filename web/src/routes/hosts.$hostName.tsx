import { createFileRoute, Link } from '@tanstack/react-router';
import { DescriptionList, PropertyRow } from '@/components/description-list';
import { EmptyState } from '@/components/page';
import { PageLayout } from '@/components/page-layout';
import { QueryState } from '@/components/query-state';
import { Section } from '@/components/section';
import { Alert } from '@/components/ui/alert';
import { ServerOff } from '@/core/app-icons';
import { formatBytes, formatPercent, formatRate, formatTime } from '@/core/format';
import { HostStatusBadge } from '@/hosts/host-status-badge';
import { type Host, useHosts } from '@/hosts/use-live-hosts';
import { ReadingStats } from '@/readings/reading-stats';
import {
  ContainerTable,
  describeLoad,
  FilesystemTable,
  GpuTable,
  NetworkTable,
  ProcessTable,
  SensorTable,
} from '@/readings/reading-tables';
import { UsageChart } from '@/readings/usage-chart';
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
 * Everything the page shows about a host that exists.
 *
 * @param props.host - The host to draw.
 */
function HostReadings({ host }: { host: Host }) {
  const { reading, history } = host;
  const [{ byteUnits }] = useSettings();

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
      <ReadingStats reading={reading} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          surface="card"
          title="CPU and memory"
          description="Share in use over the kept history."
          content={
            <UsageChart
              samples={history}
              percent
              label="CPU and memory use over time"
              formatValue={(value) => formatPercent(value)}
              series={[
                { key: 'cpuPercent', label: 'CPU', color: 'var(--chart-cpu)' },
                { key: 'memoryPercent', label: 'Memory', color: 'var(--chart-memory)' },
              ]}
            />
          }
        />
        <Section
          surface="card"
          title="Network"
          description="All interfaces together."
          content={
            <UsageChart
              samples={history}
              label="Network traffic over time"
              formatValue={(value) => formatRate(value, byteUnits)}
              series={[
                { key: 'receivedBytesPerSecond', label: 'Received', color: 'var(--chart-received)' },
                { key: 'sentBytesPerSecond', label: 'Sent', color: 'var(--chart-sent)' },
              ]}
            />
          }
        />
      </div>
      {reading ? (
        <>
          {reading.gpus.length > 0 ? (
            <Section surface="card" title="GPU" content={<GpuTable gpus={reading.gpus} />} />
          ) : null}
          <Section surface="card" title="Filesystems" content={<FilesystemTable filesystems={reading.filesystems} />} />
          <Section surface="card" title="Top processes" content={<ProcessTable processes={reading.processes} />} />
          <Section surface="card" title="Containers" content={<ContainerTable containers={reading.containers} />} />
          <div className="grid gap-6 xl:grid-cols-2">
            <Section
              surface="card"
              title="Network interfaces"
              content={<NetworkTable interfaces={reading.networkInterfaces} />}
            />
            <Section surface="card" title="Sensors" content={<SensorTable sensors={reading.sensors} />} />
          </div>
          <Section
            surface="card"
            title="System"
            content={
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
