import { describe, expect, it } from 'vitest';
import { usageColor } from '../../web/src/readings/usage-color.ts';

describe('usageColor', () => {
  it('is the stop itself at a stop', () => {
    expect(usageColor(0)).toBe('color-mix(in oklch, var(--usage-25) 0%, var(--usage-0))');
    expect(usageColor(25)).toBe('color-mix(in oklch, var(--usage-25) 100%, var(--usage-0))');
    expect(usageColor(100)).toBe('color-mix(in oklch, var(--usage-100) 100%, var(--usage-50))');
  });

  it('blends between the two stops around the share', () => {
    expect(usageColor(30)).toBe('color-mix(in oklch, var(--usage-50) 20%, var(--usage-25))');
    expect(usageColor(75)).toBe('color-mix(in oklch, var(--usage-100) 50%, var(--usage-50))');
  });

  it('clamps a share outside the scale', () => {
    expect(usageColor(-5)).toBe(usageColor(0));
    expect(usageColor(140)).toBe(usageColor(100));
  });
});
