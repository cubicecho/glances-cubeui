import { describe, expect, it } from 'vitest';
import { animationMs, DEFAULT_ANIMATION_MS } from '../../web/src/hosts/update-interval.ts';

const at = (...times: string[]) => ({ history: times.map((sampledAt) => ({ sampledAt })) });

describe('animationMs', () => {
  it('is half the time between the two latest samples', () => {
    const host = at('2026-10-04T10:00:00.000Z', '2026-10-04T10:00:03.000Z', '2026-10-04T10:00:04.000Z');
    expect(animationMs([host])).toBe(500);
  });

  it('skips a host with too little history', () => {
    const waiting = at('2026-10-04T10:00:00.000Z');
    const sampled = at('2026-10-04T10:00:00.000Z', '2026-10-04T10:00:03.000Z');
    expect(animationMs([waiting, sampled])).toBe(1500);
  });

  it('falls back to the default when nothing can be measured', () => {
    expect(animationMs(undefined)).toBe(DEFAULT_ANIMATION_MS);
    expect(animationMs([at()])).toBe(DEFAULT_ANIMATION_MS);
    expect(animationMs([at('2026-10-04T10:00:03.000Z', '2026-10-04T10:00:03.000Z')])).toBe(DEFAULT_ANIMATION_MS);
  });
});
