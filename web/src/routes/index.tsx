import { createFileRoute } from '@tanstack/react-router';
import { EmptyState } from '@/components/page';
import { PageLayout } from '@/components/page-layout';
import { QueryState } from '@/components/query-state';
import { Server } from '@/core/app-icons';
import { HostCard } from '@/hosts/host-card';
import { useHosts } from '@/hosts/use-live-hosts';

export const Route = createFileRoute('/')({ component: OverviewRoute });

/**
 * The overview: one card per monitored host, updating as readings arrive.
 */
function OverviewRoute() {
  const query = useHosts();
  const hosts = query.data ?? [];

  return (
    <PageLayout
      title="Overview"
      description="Every Glances host this server samples, updated live."
      content={
        <div className="flex flex-col gap-4 py-4">
          <QueryState
            query={query}
            what="hosts"
            count={hosts.length}
            empty={
              <EmptyState
                icon={Server}
                title="No hosts configured"
                description="Set GLANCES_HOSTS, for example nas=http://nas:61208, and restart the server."
              />
            }
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {hosts.map((host) => (
              <HostCard key={host.name} host={host} />
            ))}
          </div>
        </div>
      }
    />
  );
}
