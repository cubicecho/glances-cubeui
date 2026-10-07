import { formatBytes, formatBytesOf, formatFigure, formatPercent, formatTemperature } from '@/core/format';
import type { Host } from '@/hosts/use-live-hosts';
import { UsageDonut } from '@/readings/usage-donut';
import { TEMPERATURE_UNIT_CELSIUS, type TemperatureUnit } from '@/settings/defaults';
import { useSettings } from '@/settings/use-settings';

type Reading = NonNullable<Host['reading']>;

const FULL_PERCENT = 100;

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
 * Writes how many cores a figure is spread over.
 *
 * @param coreCount - The machine's logical cores, or `null` when it does not say.
 * @returns For example `"24 cores"`, or nothing when unknown.
 */
function describeCores(coreCount: number | null): string | undefined {
  if (coreCount === null || coreCount === 0) {
    return undefined;
  }
  return coreCount === 1 ? '1 core' : `${coreCount} cores`;
}

/**
 * The rings for a host's graphics cards: usage and memory for each card that reports them.
 *
 * @param gpus - The reading's GPUs.
 * @param temperatureUnit - The unit to write each card's temperature in.
 * @returns The rings, named by card only when there is more than one. The usage ring carries the temperature.
 */
function gpuRings(gpus: Reading['gpus'], temperatureUnit: TemperatureUnit) {
  return gpus.flatMap((gpu) => {
    const name = gpus.length > 1 ? `GPU ${gpu.id}` : 'GPU';
    const temperature =
      gpu.temperature === null
        ? undefined
        : formatTemperature(gpu.temperature, TEMPERATURE_UNIT_CELSIUS, temperatureUnit);
    return [
      { label: name, percent: gpu.usagePercent, detail: temperature },
      { label: `${name} memory`, percent: gpu.memoryPercent, detail: undefined },
    ]
      .filter((ring) => ring.percent !== null)
      .map((ring) => (
        <UsageDonut
          key={ring.label}
          label={ring.label}
          percent={ring.percent}
          value={ring.percent}
          format={formatPercent}
          detail={ring.detail}
        />
      ));
  });
}

/**
 * A host's headline figures as a row of rings: CPU, memory, each GPU and load, each with what it is measured against.
 *
 * @param props.reading - The host's latest reading.
 *
 * @remarks
 * The overview and the host page both draw this, so a figure reads the same wherever it is met.
 */
export function ReadingRings({ reading }: { reading: Reading }) {
  const [{ byteUnits, temperatureUnit }] = useSettings();
  const { cpu, memory, load } = reading;

  return (
    <div className="flex flex-wrap justify-around gap-x-4 gap-y-3">
      <UsageDonut
        label="CPU"
        percent={cpu.totalPercent}
        value={cpu.totalPercent}
        format={formatPercent}
        detail={describeCores(cpu.coreCount)}
      />
      <UsageDonut
        label="Memory"
        percent={memory.percent}
        value={memory.percent}
        format={formatPercent}
        amount={formatBytesOf(memory.usedBytes, memory.totalBytes, byteUnits)}
        detail={
          memory.availableBytes === null ? undefined : `${formatBytes(memory.availableBytes, byteUnits)} available`
        }
      />
      {gpuRings(reading.gpus, temperatureUnit)}
      {load === null ? null : (
        <UsageDonut
          label="Load"
          percent={loadShare(reading)}
          value={load.min1}
          format={formatFigure}
          detail={`${formatFigure(load.min5)} · ${formatFigure(load.min15)} (5, 15 min)`}
        />
      )}
    </div>
  );
}
