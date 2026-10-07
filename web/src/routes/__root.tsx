import { createLink, createRootRoute, Outlet, useParams, useRouterState } from '@tanstack/react-router';
import { EmptyState } from '@/components/page';
import { QueryState } from '@/components/query-state';
import { RouteError } from '@/components/route-error';
import { BarNavItem, Sidebar, SidebarNavItem, SidebarSection } from '@/components/sidebar';
import { SidebarLayout } from '@/components/split-layout';
import { Settings } from '@/components/ui/icons';
import { ThemePicker } from '@/components/ui/theme-picker';
import { useThemePreference } from '@/components/ui/theme-preference';
import { Activity, LayoutDashboard, Server, ServerOff } from '@/core/app-icons';
import { HOST_STATUS_LABELS } from '@/hosts/host-status-badge';
import { type Host, useHosts, useHostsSubscription } from '@/hosts/use-live-hosts';

const SidebarLink = createLink(SidebarNavItem);
const BarLink = createLink(BarNavItem);
const SETTINGS_PATH = '/settings';

export const Route = createRootRoute({
  component: RootRoute,
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
});

/**
 * The app's mark and name, as the rail's header and the narrow bar both show it.
 */
function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 py-1 font-semibold text-sm">
      <Activity className="size-4" aria-hidden />
      CubeUI Glances
    </div>
  );
}

/**
 * Picks the glyph a host's row wears.
 *
 * @param host - The host the row is for.
 * @returns A crossed-out server when the host is unreachable, a server otherwise.
 */
function hostIcon(host: Host) {
  return host.status === 'UNREACHABLE' ? <ServerOff /> : <Server />;
}

/**
 * The app shell: the host list beside whichever page the route draws.
 *
 * @remarks
 * This is where the hosts subscription and the theme preference are mounted, once for every page.
 */
function RootRoute() {
  useThemePreference();
  useHostsSubscription();
  const query = useHosts();
  const hosts = query.data ?? [];
  const { hostName } = useParams({ strict: false });
  const isOverview = useRouterState({ select: (state) => state.location.pathname === '/' });
  const isSettings = useRouterState({ select: (state) => state.location.pathname === SETTINGS_PATH });

  return (
    <SidebarLayout
      className="h-svh"
      sidebarPosition="start"
      sidebarWidth="auto"
      divider="none"
      sidebarHideBelow="md"
      brand={<Brand />}
      navLabel="Main"
      action={
        <div className="w-28">
          <ThemePicker variant="compact" />
        </div>
      }
      nav={[
        <BarLink key="overview" to="/" label="Overview" icon={<LayoutDashboard />} active={isOverview} />,
        ...hosts.map((host) => (
          <BarLink
            key={host.name}
            to="/hosts/$hostName"
            params={{ hostName: host.name }}
            label={host.name}
            icon={hostIcon(host)}
            active={host.name === hostName}
          />
        )),
        <BarLink key="settings" to={SETTINGS_PATH} label="Settings" icon={<Settings />} active={isSettings} />,
      ]}
      sidebar={
        <Sidebar
          label="Main"
          header={<Brand />}
          content={
            <>
              <SidebarSection
                as="nav"
                label="Main"
                content={[
                  <SidebarLink key="overview" to="/" label="Overview" icon={<LayoutDashboard />} active={isOverview} />,
                ]}
              />
              <SidebarSection
                as="nav"
                title="Hosts"
                status={
                  <QueryState
                    compact
                    query={query}
                    what="hosts"
                    count={hosts.length}
                    empty={<EmptyState compact title="No hosts configured." className="px-2" />}
                  />
                }
                content={hosts.map((host) => (
                  <SidebarLink
                    key={host.name}
                    to="/hosts/$hostName"
                    params={{ hostName: host.name }}
                    label={host.name}
                    icon={hostIcon(host)}
                    status={host.status === 'ONLINE' ? undefined : { label: HOST_STATUS_LABELS[host.status].label }}
                    active={host.name === hostName}
                  />
                ))}
              />
            </>
          }
          footer={
            <>
              <SidebarLink to={SETTINGS_PATH} label="Settings" icon={<Settings />} active={isSettings} />
              <ThemePicker variant="compact" />
            </>
          }
        />
      }
      content={<Outlet />}
    />
  );
}
