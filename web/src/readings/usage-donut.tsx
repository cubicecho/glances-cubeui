import { usageColor } from '@/readings/usage-color';

const FULL_PERCENT = 100;
const VIEW_BOX_SIZE = 36;
const CENTER = VIEW_BOX_SIZE / 2;
const STROKE_WIDTH = 3.5;
const RADIUS = (VIEW_BOX_SIZE - STROKE_WIDTH) / 2;

/**
 * A share in use drawn as a ring, with its figure in the middle and its name underneath.
 *
 * @param props.label - What is measured, shown under the ring.
 * @param props.percent - How much of the ring to fill, 0 to 100, or `null` when unknown.
 * @param props.value - The figure in the middle, already formatted.
 *
 * @remarks
 * The figure is a prop of its own because not every ring shows its share: load is drawn as a
 * share of the cores but read as a load average.
 */
export function UsageDonut({ label, percent, value }: { label: string; percent: number | null; value: string }) {
  const filled = percent === null ? 0 : Math.min(Math.max(percent, 0), FULL_PERCENT);

  return (
    <div role="img" aria-label={`${label} ${value}`} className="flex flex-col items-center gap-1.5">
      <div className="relative size-16">
        <svg viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`} className="size-full -rotate-90" aria-hidden="true">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" strokeWidth={STROKE_WIDTH} className="stroke-muted" />
          {filled > 0 ? (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              pathLength={FULL_PERCENT}
              strokeDasharray={`${filled} ${FULL_PERCENT}`}
              stroke={usageColor(filled)}
              className="transition-[stroke-dasharray,stroke]"
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-medium text-sm tabular-nums">
          {value}
        </span>
      </div>
      <span className="text-center text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
