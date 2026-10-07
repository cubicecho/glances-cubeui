import { Fragment, useState } from 'react';
import { EmptyState } from '@/components/page';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from '@/components/ui/icons';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBytes, formatFigure, formatPercent, formatRate, formatTemperature } from '@/core/format';
import type { Host } from '@/hosts/use-live-hosts';
import { UsageBar } from '@/readings/usage-bar';
import { TEMPERATURE_UNIT_CELSIUS, TEMPERATURE_UNIT_FAHRENHEIT, type TemperatureUnit } from '@/settings/defaults';
import { useSettings } from '@/settings/use-settings';

type Reading = NonNullable<Host['reading']>;

const NUMERIC = 'text-right tabular-nums';
/** The sensor units Glances reports that are temperatures. Fan speeds (R) and shares (%) are not. */
const TEMPERATURE_UNITS_BY_GLANCES_UNIT: Partial<Record<string, TemperatureUnit>> = {
  C: TEMPERATURE_UNIT_CELSIUS,
  F: TEMPERATURE_UNIT_FAHRENHEIT,
};

/**
 * Writes a sensor's value: a temperature in the reader's unit, anything else as Glances gave it.
 *
 * @param sensor - The sensor.
 * @param temperatureUnit - The unit the reader chose for temperatures.
 * @returns For example `"45 °C"` or `"1200 R"`, or an em dash when the sensor has no value.
 */
function sensorValue(sensor: Reading['sensors'][number], temperatureUnit: TemperatureUnit): string {
  if (sensor.value === null) {
    return '—';
  }
  const reportedIn = TEMPERATURE_UNITS_BY_GLANCES_UNIT[sensor.unit ?? ''];
  if (reportedIn === undefined) {
    return `${sensor.value} ${sensor.unit ?? ''}`.trim();
  }
  return formatTemperature(sensor.value, reportedIn, temperatureUnit);
}

type FilesystemRow = Reading['filesystems'][number];

/**
 * The cells of one filesystem after its name: device, usage bar, used and size.
 *
 * @param props.filesystem - The filesystem, or a pool's total.
 */
function FilesystemCells({ filesystem }: { filesystem: Omit<FilesystemRow, 'datasets'> }) {
  const [{ byteUnits }] = useSettings();
  return (
    <>
      <TableCell className="text-muted-foreground">{filesystem.deviceName ?? '—'}</TableCell>
      <TableCell>
        <UsageBar
          percent={filesystem.percent}
          label={`${filesystem.mountPoint} used`}
          valueLabel={formatPercent(filesystem.percent)}
        />
      </TableCell>
      <TableCell className={NUMERIC}>
        {formatBytes(filesystem.usedBytes, byteUnits)} ({formatPercent(filesystem.percent)})
      </TableCell>
      <TableCell className={NUMERIC}>{formatBytes(filesystem.sizeBytes, byteUnits)}</TableCell>
    </>
  );
}

/**
 * Mounted filesystems with how full each is. A pool that totals several opens to list them.
 *
 * @param props.filesystems - The reading's filesystems.
 */
export function FilesystemTable({ filesystems }: { filesystems: Reading['filesystems'] }) {
  const [openPools, setOpenPools] = useState<readonly string[]>([]);
  if (filesystems.length === 0) {
    return <EmptyState compact title="No filesystems reported." />;
  }
  const toggle = (mountPoint: string): void => {
    setOpenPools((open) =>
      open.includes(mountPoint) ? open.filter((other) => other !== mountPoint) : [...open, mountPoint],
    );
  };
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
        {filesystems.map((filesystem) => {
          const isOpen = openPools.includes(filesystem.mountPoint);
          const hasDatasets = filesystem.datasets.length > 0;
          return (
            <Fragment key={filesystem.mountPoint}>
              <TableRow>
                <TableHead>
                  {hasDatasets ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3"
                      aria-expanded={isOpen}
                      onClick={() => toggle(filesystem.mountPoint)}
                    >
                      {isOpen ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
                      <span className="text-foreground">{filesystem.mountPoint}</span>
                      <span className="font-normal text-muted-foreground">{filesystem.datasets.length} datasets</span>
                    </Button>
                  ) : (
                    filesystem.mountPoint
                  )}
                </TableHead>
                <FilesystemCells filesystem={filesystem} />
              </TableRow>
              {isOpen
                ? filesystem.datasets.map((dataset) => (
                    <TableRow key={dataset.mountPoint}>
                      <TableHead className="pl-10 font-normal">{dataset.mountPoint}</TableHead>
                      <FilesystemCells filesystem={dataset} />
                    </TableRow>
                  ))
                : null}
            </Fragment>
          );
        })}
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
  const [{ byteUnits }] = useSettings();
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
            <TableCell className={NUMERIC}>{formatRate(networkInterface.receivedBytesPerSecond, byteUnits)}</TableCell>
            <TableCell className={NUMERIC}>{formatRate(networkInterface.sentBytesPerSecond, byteUnits)}</TableCell>
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
  const [{ temperatureUnit }] = useSettings();
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
            <TableCell className={NUMERIC}>{sensorValue(sensor, temperatureUnit)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * A share drawn as a bar with its figure, or a dash when the driver did not report it.
 *
 * @param props.percent - 0 to 100, or `null` when unknown.
 * @param props.label - What the bar measures, as its accessible name.
 */
function ShareBar({ percent, label }: { percent: number | null; label: string }) {
  if (percent === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center gap-3">
      <UsageBar percent={percent} label={label} valueLabel={formatPercent(percent)} className="min-w-16 flex-1" />
      <span className="w-14 text-right tabular-nums">{formatPercent(percent)}</span>
    </div>
  );
}

/**
 * Graphics cards with how busy each is and how full its memory is.
 *
 * @param props.gpus - The reading's GPUs.
 *
 * @remarks
 * Glances reports GPU memory as a share only, so there is no byte figure to show.
 */
export function GpuTable({ gpus }: { gpus: Reading['gpus'] }) {
  const [{ temperatureUnit }] = useSettings();
  return (
    <Table>
      <TableCaption className="sr-only">Graphics cards</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>GPU</TableHead>
          <TableHead className="w-1/4">Usage</TableHead>
          <TableHead className="w-1/4">Memory</TableHead>
          <TableHead className={NUMERIC}>Temperature</TableHead>
          <TableHead className={NUMERIC}>Fan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gpus.map((gpu) => (
          <TableRow key={gpu.id}>
            <TableHead>
              {gpu.name ?? gpu.id} <span className="font-normal text-muted-foreground">{gpu.name ? gpu.id : ''}</span>
            </TableHead>
            <TableCell>
              <ShareBar percent={gpu.usagePercent} label={`${gpu.id} usage`} />
            </TableCell>
            <TableCell>
              <ShareBar percent={gpu.memoryPercent} label={`${gpu.id} memory used`} />
            </TableCell>
            <TableCell className={NUMERIC}>
              {formatTemperature(gpu.temperature, TEMPERATURE_UNIT_CELSIUS, temperatureUnit)}
            </TableCell>
            <TableCell className={NUMERIC}>{formatPercent(gpu.fanSpeedPercent)}</TableCell>
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
  const [{ byteUnits }] = useSettings();
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
            <TableCell className={NUMERIC}>{formatBytes(container.memoryBytes, byteUnits)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The busiest processes, as the server ranked them, down to the count in the settings.
 *
 * @param props.processes - The reading's top processes.
 */
export function ProcessTable({ processes }: { processes: Reading['processes'] }) {
  const [{ byteUnits, processCount }] = useSettings();
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
        {processes.slice(0, processCount).map((process) => (
          <TableRow key={process.pid}>
            <TableHead>{process.name}</TableHead>
            <TableCell className={NUMERIC}>{process.pid}</TableCell>
            <TableCell className="text-muted-foreground">{process.user ?? '—'}</TableCell>
            <TableCell className={NUMERIC}>{formatPercent(process.cpuPercent)}</TableCell>
            <TableCell className={NUMERIC}>
              {formatBytes(process.memoryBytes, byteUnits)} ({formatPercent(process.memoryPercent)})
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
