import { useAnimatedNumber } from '@/core/use-animated-number';
import { useAnimationMs } from '@/hosts/use-live-hosts';
import { usageColor } from '@/readings/usage-color';

const FULL_PERCENT = 100;
const VIEW_BOX_SIZE = 36;
const CENTER = VIEW_BOX_SIZE / 2;
const STROKE_WIDTH = 3.5;
const RADIUS = (VIEW_BOX_SIZE - STROKE_WIDTH) / 2;

/**
 * A share in use drawn as a ring, with its figure in the middle and its name underneath.
 * A ring that knows the amounts behind its share writes them under the figure.
 *
 * @param props.label - What is measured, shown under the ring.
 * @param props.percent - How much of the ring to fill, 0 to 100, or `null` when unknown.
 * @param props.value - The figure in the middle.
 * @param props.format - Writes the figure, such as `formatPercent`.
 * @param [props.amount] - The amounts behind the share, such as `"31.2/62.7 GiB"`.
 *
 * @remarks
 * The figure is a prop of its own because not every ring shows its share: load is drawn as a
 * share of the cores but read as a load average. Ring and figure move to a new value together,
 * over half the time between updates; the accessible name states the new value at once.
 * The ring is sized for the amounts line, the longest thing it holds, whether or not a ring has one,
 * so a row of rings is one size.
 */
export function UsageDonut({
  label,
  percent,
  value,
  format,
  amount,
}: {
  label: string;
  percent: number | null;
  value: number | null;
  format: (value: number | null) => string;
  amount?: string;
}) {
  const figure = format(value);
  const accessibleName = amount === undefined ? `${label} ${figure}` : `${label} ${figure}, ${amount}`;
  const durationMs = useAnimationMs();
  const shownPercent = useAnimatedNumber(percent, durationMs);
  const shownValue = useAnimatedNumber(value, durationMs);
  const filled = shownPercent === null ? 0 : Math.min(Math.max(shownPercent, 0), FULL_PERCENT);

  return (
    <div role="img" aria-label={accessibleName} className="flex flex-col items-center gap-1.5">
      <div className="relative size-24">
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
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
          <span className="font-medium text-base">{format(shownValue)}</span>
          {amount === undefined ? null : <span className="text-[0.625rem] text-muted-foreground">{amount}</span>}
        </span>
      </div>
      <span className="text-center text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
