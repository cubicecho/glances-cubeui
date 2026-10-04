import { useEffect, useRef, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const EASE_POWER = 3;

/**
 * Slows to a stop: fast at first, settling at the end.
 *
 * @param progress - 0 to 1 through the animation.
 * @returns 0 to 1 through the distance.
 */
function easeOut(progress: number): number {
  return 1 - (1 - progress) ** EASE_POWER;
}

/**
 * Moves a number to each new target over a set time instead of jumping.
 *
 * @param target - The figure to show, or `null` when unknown.
 * @param durationMs - How long a move takes, in milliseconds.
 * @returns The figure to draw this frame. `null` and the first value are shown at once.
 *
 * @remarks
 * A reader who asked for reduced motion gets the target at once. A target that changes mid-move
 * starts a new move from wherever the figure is.
 */
export function useAnimatedNumber(target: number | null, durationMs: number): number | null {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    const isStill = window.matchMedia(REDUCED_MOTION_QUERY).matches || durationMs <= 0;
    if (target === null || from === null || from === target || isStill) {
      shownRef.current = target;
      setShown(target);
      return;
    }

    const startedAt = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const value = from + (target - from) * easeOut(progress);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return shown;
}
