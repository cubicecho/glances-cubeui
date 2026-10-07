import { StatTile } from '@/components/stat-tile';
import { Clock } from '@/components/ui/icons';
import { Activity, Cpu, MemoryStick } from '@/core/app-icons';
import { formatBytes, formatFigure, formatPercent } from '@/core/format';
import type { Host } from '@/hosts/use-live-hosts';
import { useSettings } from '@/settings/use-settings';

/**
 * The headline figures of a host: CPU, memory, load and uptime.
 *
 * @param props.reading - The latest reading, or `null` before the first one lands.
 */
export function ReadingStats({ reading }: { reading: Host['reading'] }) {
  const [{ byteUnits }] = useSettings();
  const isWaiting = reading === null;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        label="CPU"
        icon={<Cpu />}
        loading={isWaiting}
        value={formatPercent(reading?.cpu.totalPercent ?? null)}
        hint={reading?.cpu.coreCount ? `${reading.cpu.coreCount} cores` : undefined}
      />
      <StatTile
        label="Memory"
        icon={<MemoryStick />}
        loading={isWaiting}
        value={formatPercent(reading?.memory.percent ?? null)}
        hint={
          reading
            ? `${formatBytes(reading.memory.usedBytes, byteUnits)} of ${formatBytes(reading.memory.totalBytes, byteUnits)}`
            : undefined
        }
      />
      <StatTile
        label="Load"
        icon={<Activity />}
        loading={isWaiting}
        value={formatFigure(reading?.load?.min1 ?? null)}
        hint={
          reading?.load
            ? `${formatFigure(reading.load.min5)} · ${formatFigure(reading.load.min15)} (5, 15 min)`
            : undefined
        }
      />
      <StatTile
        label="Uptime"
        icon={<Clock />}
        loading={isWaiting}
        value={reading?.uptime ?? '—'}
        hint={reading?.processCount ? `${reading.processCount.total} processes` : undefined}
      />
    </div>
  );
}
