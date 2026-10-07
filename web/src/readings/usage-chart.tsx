import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatTime } from '@/core/format';
import type { Host } from '@/hosts/use-live-hosts';

type Sample = Host['history'][number];

/** One line of a chart: which sample figure it draws, what it is called and its colour. */
export interface ChartSeries {
  key: Exclude<keyof Sample, 'sampledAt'>;
  label: string;
  color: string;
}

/** CPU and memory in use, the trend every host is drawn with. */
const USAGE_SERIES: ChartSeries[] = [
  { key: 'cpuPercent', label: 'CPU', color: 'var(--chart-cpu)' },
  { key: 'memoryPercent', label: 'Memory', color: 'var(--chart-memory)' },
];
/** Graphics card use and memory, drawn for a host whose cards report them. */
const GPU_SERIES: ChartSeries[] = [
  { key: 'gpuPercent', label: 'GPU', color: 'var(--chart-gpu)' },
  { key: 'gpuMemoryPercent', label: 'GPU memory', color: 'var(--chart-gpu-memory)' },
];
/** Traffic over the physical interfaces. */
export const NETWORK_SERIES: ChartSeries[] = [
  { key: 'receivedBytesPerSecond', label: 'Received', color: 'var(--chart-received)' },
  { key: 'sentBytesPerSecond', label: 'Sent', color: 'var(--chart-sent)' },
];

const Y_AXIS_WIDTH = 84;
const FILL_OPACITY = 0.15;
const FULL_SIZE = 'aspect-auto h-56 w-full';
const COMPACT_SIZE = 'aspect-auto h-24 w-full';
const FULL_PERCENT = 100;
const PERCENT_DOMAIN: [number, number] = [0, FULL_PERCENT];

/**
 * Picks the shares in use a host's trend draws.
 *
 * @param samples - The host's history.
 * @returns CPU and memory, then each graphics figure any sample reports.
 */
export function usageSeries(samples: readonly Sample[]): ChartSeries[] {
  const reported = GPU_SERIES.filter(({ key }) => samples.some((sample) => sample[key] !== null));
  return [...USAGE_SERIES, ...reported];
}

/**
 * A host's recent samples as an area chart over time, with a legend naming each line.
 *
 * @param props.samples - The history to draw, oldest first.
 * @param props.series - The figures to draw.
 * @param props.formatValue - Writes a value for the axis and the tooltip.
 * @param props.label - The chart's accessible name.
 * @param props.percent - Pins the axis to 0–100 rather than fitting the data.
 * @param props.compact - Draws a short chart without axes or grid, for a card. The scale and the lines are the same.
 */
export function UsageChart({
  samples,
  series,
  formatValue,
  label,
  percent = false,
  compact = false,
}: {
  samples: Sample[];
  series: ChartSeries[];
  formatValue: (value: number) => string;
  label: string;
  percent?: boolean;
  compact?: boolean;
}) {
  const config: ChartConfig = Object.fromEntries(
    series.map(({ key, label: name, color }) => [key, { label: name, color }]),
  );

  return (
    <ChartContainer config={config} className={compact ? COMPACT_SIZE : FULL_SIZE} role="img" aria-label={label}>
      <AreaChart data={samples} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        {compact ? null : <CartesianGrid vertical={false} />}
        <XAxis
          hide={compact}
          dataKey="sampledAt"
          tickFormatter={formatTime}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
        />
        <YAxis
          hide={compact}
          width={Y_AXIS_WIDTH}
          tickFormatter={formatValue}
          tickLine={false}
          axisLine={false}
          domain={percent ? PERCENT_DOMAIN : [0, 'auto']}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatTime(String(value))}
              formatter={(value, name) => `${config[String(name)]?.label ?? name}: ${formatValue(Number(value))}`}
            />
          }
        />
        {/* Unsorted, so the legend keeps the order the series are given in rather than the alphabet's. */}
        <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
        {series.map(({ key }) => (
          <Area
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            fill={`var(--color-${key})`}
            fillOpacity={FILL_OPACITY}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
