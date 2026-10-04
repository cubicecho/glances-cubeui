import { EmptyState } from '@/components/page';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBytes, formatFigure, formatPercent, formatRate } from '@/core/format';
import type { Host } from '@/hosts/use-live-hosts';

type Reading = NonNullable<Host['reading']>;

const NUMERIC = 'text-right tabular-nums';
/** From this share up, a filesystem's bar is drawn as nearly full. */
const NEARLY_FULL_PERCENT = 90;

/**
 * Mounted filesystems with how full each is.
 *
 * @param props.filesystems - The reading's filesystems.
 */
export function FilesystemTable({ filesystems }: { filesystems: Reading['filesystems'] }) {
  if (filesystems.length === 0) {
    return <EmptyState compact title="No filesystems reported." />;
  }
  return (
    <Table>
      <TableCaption className="sr-only">Filesystems</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Mount point</TableHead>
          <TableHead>Device</TableHead>
          <TableHead className="w-1/4">Usage</TableHead>
          <TableHead className={NUMERIC}>Used</TableHead>
          <TableHead className={NUMERIC}>Size</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filesystems.map((filesystem) => (
          <TableRow key={filesystem.mountPoint}>
            <TableHead>{filesystem.mountPoint}</TableHead>
            <TableCell className="text-muted-foreground">{filesystem.deviceName ?? '—'}</TableCell>
            <TableCell>
              <Progress
                value={filesystem.percent}
                label={`${filesystem.mountPoint} used`}
                valueLabel={formatPercent(filesystem.percent)}
                className="h-1.5"
                indicatorClassName={filesystem.percent >= NEARLY_FULL_PERCENT ? 'bg-destructive' : undefined}
              />
            </TableCell>
            <TableCell className={NUMERIC}>
              {formatBytes(filesystem.usedBytes)} ({formatPercent(filesystem.percent)})
            </TableCell>
            <TableCell className={NUMERIC}>{formatBytes(filesystem.sizeBytes)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Orders interfaces by their current traffic, so idle bridges sink below the ones in use.
 *
 * @param interfaces - The reading's network interfaces.
 * @returns A sorted copy, busiest first.
 */
function busiestFirst(interfaces: Reading['networkInterfaces']): Reading['networkInterfaces'] {
  const traffic = (networkInterface: Reading['networkInterfaces'][number]) =>
    networkInterface.receivedBytesPerSecond + networkInterface.sentBytesPerSecond;
  return [...interfaces].sort((first, second) => traffic(second) - traffic(first));
}

/**
 * Network interfaces with their current rates, busiest first.
 *
 * @param props.interfaces - The reading's network interfaces.
 */
export function NetworkTable({ interfaces }: { interfaces: Reading['networkInterfaces'] }) {
  if (interfaces.length === 0) {
    return <EmptyState compact title="No network interfaces reported." />;
  }
  return (
    <Table>
      <TableCaption className="sr-only">Network interfaces</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Interface</TableHead>
          <TableHead className={NUMERIC}>Received</TableHead>
          <TableHead className={NUMERIC}>Sent</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {busiestFirst(interfaces).map((networkInterface) => (
          <TableRow key={networkInterface.name}>
            <TableHead>{networkInterface.name}</TableHead>
            <TableCell className={NUMERIC}>{formatRate(networkInterface.receivedBytesPerSecond)}</TableCell>
            <TableCell className={NUMERIC}>{formatRate(networkInterface.sentBytesPerSecond)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Temperature and fan sensors.
 *
 * @param props.sensors - The reading's sensors.
 */
export function SensorTable({ sensors }: { sensors: Reading['sensors'] }) {
  if (sensors.length === 0) {
    return <EmptyState compact title="This host reports no sensors." />;
  }
  return (
    <Table>
      <TableCaption className="sr-only">Sensors</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Sensor</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead className={NUMERIC}>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sensors.map((sensor, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Glances repeats labels across chips, and the list keeps its order.
          <TableRow key={`${sensor.label}-${index}`}>
            <TableHead>{sensor.label}</TableHead>
            <TableCell className="text-muted-foreground">{sensor.kind ?? '—'}</TableCell>
            <TableCell className={NUMERIC}>
              {sensor.value === null ? '—' : `${sensor.value} ${sensor.unit ?? ''}`.trim()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Containers the host runs.
 *
 * @param props.containers - The reading's containers.
 */
export function ContainerTable({ containers }: { containers: Reading['containers'] }) {
  if (containers.length === 0) {
    return <EmptyState compact title="This host reports no containers." />;
  }
  return (
    <Table>
      <TableCaption className="sr-only">Containers</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Container</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Image</TableHead>
          <TableHead className={NUMERIC}>CPU</TableHead>
          <TableHead className={NUMERIC}>Memory</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {containers.map((container) => (
          <TableRow key={container.name}>
            <TableHead>{container.name}</TableHead>
            <TableCell>{container.status ?? '—'}</TableCell>
            <TableCell className="text-muted-foreground">{container.image ?? '—'}</TableCell>
            <TableCell className={NUMERIC}>{formatPercent(container.cpuPercent)}</TableCell>
            <TableCell className={NUMERIC}>{formatBytes(container.memoryBytes)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The busiest processes, as the server ranked them.
 *
 * @param props.processes - The reading's top processes.
 */
export function ProcessTable({ processes }: { processes: Reading['processes'] }) {
  if (processes.length === 0) {
    return <EmptyState compact title="No processes reported." />;
  }
  return (
    <Table>
      <TableCaption className="sr-only">Top processes</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Process</TableHead>
          <TableHead className={NUMERIC}>PID</TableHead>
          <TableHead>User</TableHead>
          <TableHead className={NUMERIC}>CPU</TableHead>
          <TableHead className={NUMERIC}>Memory</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {processes.map((process) => (
          <TableRow key={process.pid}>
            <TableHead>{process.name}</TableHead>
            <TableCell className={NUMERIC}>{process.pid}</TableCell>
            <TableCell className="text-muted-foreground">{process.user ?? '—'}</TableCell>
            <TableCell className={NUMERIC}>{formatPercent(process.cpuPercent)}</TableCell>
            <TableCell className={NUMERIC}>
              {formatBytes(process.memoryBytes)} ({formatPercent(process.memoryPercent)})
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Writes a load figure beside the core count it is judged against.
 *
 * @param load - The load average.
 * @param coreCount - The host's logical cores, when known.
 * @returns For example `"1.20 over 8 cores"`.
 */
export function describeLoad(load: number | null, coreCount: number | null): string {
  return coreCount === null ? formatFigure(load) : `${formatFigure(load)} over ${coreCount} cores`;
}
