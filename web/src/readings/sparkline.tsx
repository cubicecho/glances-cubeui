import { Area, AreaChart, YAxis } from 'recharts';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';

const FILL_OPACITY = 0.15;
const FULL_PERCENT = 100;
const PERCENT_DOMAIN: [number, number] = [0, FULL_PERCENT];

/**
 * A small axis-free trend of one percentage.
 *
 * @param props.values - The percentages, oldest first.
 * @param props.color - The line's colour, as a CSS value.
 * @param props.label - The accessible name, which should say the latest figure.
 */
export function Sparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  const config: ChartConfig = { value: { label, color } };
  const data = values.map((value, index) => ({ index, value }));

  return (
    <ChartContainer config={config} className="aspect-auto h-12 w-full" role="img" aria-label={label}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <YAxis hide domain={PERCENT_DOMAIN} />
        <Area
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={FILL_OPACITY}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
