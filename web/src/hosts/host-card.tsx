import { createLink } from '@tanstack/react-router';
import { CardLayout } from '@/components/card-layout';
import { EmptyState } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Server } from '@/core/app-icons';
import { formatFigure, formatPercent } from '@/core/format';
import { HostStatusBadge } from '@/hosts/host-status-badge';
import type { Host } from '@/hosts/use-live-hosts';
import { Sparkline } from '@/readings/sparkline';
import { UsageDonut } from '@/readings/usage-donut';

const ButtonLink = createLink(Button);
const FULL_PERCENT = 100;

type Reading = NonNullable<Host['reading']>;

/**
 * The one-minute load as a share of the cores, which is what makes a load figure high or low.
 *
 * @param reading - The host's latest reading.
 * @returns 0 to 100 and beyond, or `null` when the machine reports no load or no core count.
 */
function loadShare(reading: Reading): number | null {
  const cores = reading.cpu.coreCount;
  if (reading.load === null || cores === null || cores === 0) {
    return null;
  }
  return (reading.load.min1 / cores) * FULL_PERCENT;
}

/**
 * The rings for a host's graphics cards: usage and memory for each card that reports them.
 *
 * @param gpus - The reading's GPUs.
 * @returns The rings, named by card only when there is more than one.
 */
function gpuDonuts(gpus: Reading['gpus']) {
  return gpus.flatMap((gpu) => {
    const name = gpus.length > 1 ? `GPU ${gpu.id}` : 'GPU';
    return [
      { label: name, percent: gpu.usagePercent },
      { label: `${name} memory`, percent: gpu.memoryPercent },
    ]
      .filter((ring) => ring.percent !== null)
      .map((ring) => (
        <UsageDonut key={ring.label} label={ring.label} percent={ring.percent} value={formatPercent(ring.percent)} />
      ));
  });
}

/**
 * One host on the overview: its status, a ring per headline figure (GPUs included) and a CPU trend.
 *
 * @param props.host - The host to summarise.
 */
export function HostCard({ host }: { host: Host }) {
  const { reading } = host;
  const cpu = formatPercent(reading?.cpu.totalPercent ?? null);

  return (
    <CardLayout
      title={host.name}
      level={2}
      icon={<Server />}
      description={
        host.error ?? reading?.system.description ?? reading?.system.osName ?? 'Waiting for the first reading.'
      }
      action={<HostStatusBadge status={host.status} />}
      content={
        reading === null
          ? []
          : [
              <div key="usage" className="flex flex-wrap justify-around gap-x-4 gap-y-3">
                <UsageDonut label="CPU" percent={reading.cpu.totalPercent} value={cpu} />
                <UsageDonut
                  label="Memory"
                  percent={reading.memory.percent}
                  value={formatPercent(reading.memory.percent)}
                />
                {gpuDonuts(reading.gpus)}
                {reading.load === null ? null : (
                  <UsageDonut label="Load" percent={loadShare(reading)} value={formatFigure(reading.load.min1)} />
                )}
              </div>,
              <Sparkline
                key="trend"
                values={host.history.map((sample) => sample.cpuPercent)}
                color="var(--chart-cpu)"
                label={`${host.name} CPU trend, now ${cpu}`}
              />,
            ]
      }
      empty={<EmptyState compact title="No reading from this host yet." />}
      footerActions={
        <ButtonLink to="/hosts/$hostName" params={{ hostName: host.name }} variant="outline" size="sm">
          {`Open ${host.name}`}
        </ButtonLink>
      }
    />
  );
}
