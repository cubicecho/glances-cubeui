const QUARTER_PERCENT = 25;
const HALF_PERCENT = 50;
const FULL_PERCENT = 100;

/**
 * The points on the usage scale that have a colour of their own, lowest first. Each names the CSS
 * variable `--usage-<percent>` from `index.css`.
 */
const USAGE_STOPS = [0, QUARTER_PERCENT, HALF_PERCENT, FULL_PERCENT] as const;

/**
 * The colour for a share of something in use: calm when low, alarming when full.
 *
 * @param percent - 0 to 100. Anything outside is clamped.
 * @returns A CSS colour, blended between the two stops the share falls between.
 *
 * @remarks
 * The stops are CSS variables, so the scale follows the theme, and the blend is done by the
 * browser in OKLCH, which keeps the in-between colours from going muddy.
 */
export function usageColor(percent: number): string {
  const clamped = Math.min(Math.max(percent, 0), FULL_PERCENT);
  const upperIndex = Math.max(
    1,
    USAGE_STOPS.findIndex((stop) => clamped <= stop),
  );
  const lower = USAGE_STOPS[upperIndex - 1] ?? 0;
  const upper = USAGE_STOPS[upperIndex] ?? FULL_PERCENT;
  const share = Math.round(((clamped - lower) / (upper - lower)) * FULL_PERCENT);

  return `color-mix(in oklch, var(--usage-${upper}) ${share}%, var(--usage-${lower}))`;
}
