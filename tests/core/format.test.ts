import { describe, expect, it } from 'vitest';
import { formatBytesOf } from '../../web/src/core/format.ts';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

describe('formatBytesOf', () => {
  it('writes both figures in the unit of the total', () => {
    expect(formatBytesOf(32 * GIB, 64 * GIB)).toBe('32.0/64.0 GiB');
    expect(formatBytesOf(512 * MIB, 16 * GIB)).toBe('0.5/16.0 GiB');
  });

  it('drops the decimal from a figure of 100 or more', () => {
    expect(formatBytesOf(96 * GIB, 256 * GIB)).toBe('96.0/256 GiB');
  });

  it('writes whole bytes below the first unit', () => {
    expect(formatBytesOf(12, 512)).toBe('12/512 B');
  });

  it('writes an empty total as zero bytes', () => {
    expect(formatBytesOf(0, 0)).toBe('0/0 B');
  });
});
