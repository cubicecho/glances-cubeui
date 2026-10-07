import { createLink } from '@tanstack/react-router';
import { CardLayout } from '@/components/card-layout';
import { EmptyState } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Server } from '@/core/app-icons';
import { formatPercent } from '@/core/format';
import { HostStatusBadge } from '@/hosts/host-status-badge';
import type { Host } from '@/hosts/use-live-hosts';
import { ReadingRings } from '@/readings/reading-rings';
import { USAGE_SERIES, UsageChart } from '@/readings/usage-chart';

const ButtonLink = createLink(Button);
/**
 * One host on the overview: its status, a ring per headline figure (GPUs included) and the CPU and memory trend.
 *
 * @param props.host - The host to summarise.
 */
export function HostCard({ host }: { host: Host }) {
  const { reading } = host;

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
              <ReadingRings key="usage" reading={reading} />,
              <UsageChart
                key="trend"
                compact
                percent
                samples={host.history}
                series={USAGE_SERIES}
                formatValue={formatPercent}
                label={`${host.name} CPU and memory use over time`}
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
