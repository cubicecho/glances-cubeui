import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatTime } from '@/core/format';
import type { Host } from '@/hosts/use-live-hosts';

type Sample = Host['history'][number];

/** One line of a chart: which sample figure it draws, what it is called and its colour. */
export interface ChartSeries {
  key: Exclude<keyof Sample, 'sampledAt'>;
  label: string;
  color: string;
}

const Y_AXIS_WIDTH = 84;
const FILL_OPACITY = 0.15;
const FULL_PERCENT = 100;
const PERCENT_DOMAIN: [number, number] = [0, FULL_PERCENT];

/**
 * A host's recent samples as an area chart over time.
 *
 * @param props.samples - The history to draw, oldest first.
 * @param props.series - The figures to draw.
 * @param props.formatValue - Writes a value for the axis and the tooltip.
 * @param props.label - The chart's accessible name.
 * @param props.percent - Pins the axis to 0–100 rather than fitting the data.
 */
export function UsageChart({
  samples,
  series,
  formatValue,
  label,
  percent = false,
}: {
  samples: Sample[];
  series: ChartSeries[];
  formatValue: (value: number) => string;
  label: string;
  percent?: boolean;
}) {
  const config: ChartConfig = Object.fromEntries(
    series.map(({ key, label: name, color }) => [key, { label: name, color }]),
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full" role="img" aria-label={label}>
      <AreaChart data={samples} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="sampledAt" tickFormatter={formatTime} tickLine={false} axisLine={false} minTickGap={48} />
        <YAxis
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
