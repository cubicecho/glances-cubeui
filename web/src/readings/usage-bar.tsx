import type { CSSProperties } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { usageColor } from '@/readings/usage-color';

/**
 * A share in use drawn as a bar whose colour follows how full it is.
 *
 * @param props.percent - 0 to 100.
 * @param props.label - What the bar measures, as its accessible name.
 * @param props.valueLabel - The figure as a screen reader should say it.
 * @param props.className - Extra classes for the track, such as its width.
 */
export function UsageBar({
  percent,
  label,
  valueLabel,
  className,
}: {
  percent: number;
  label: string;
  valueLabel: string;
  className?: string;
}) {
  return (
    <Progress
      value={percent}
      label={label}
      valueLabel={valueLabel}
      className={cn('h-1.5 bg-muted', className)}
      indicatorClassName="bg-(--usage-color) transition-[width,background-color]"
      style={{ '--usage-color': usageColor(percent) } as CSSProperties}
    />
  );
}
