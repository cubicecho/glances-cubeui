import { describe, expect, it } from 'vitest';
import { formatBytes, formatBytesOf, formatRate, formatTemperature } from '../../web/src/core/format.ts';
import {
  BYTE_UNITS_BINARY,
  BYTE_UNITS_DECIMAL,
  TEMPERATURE_UNIT_CELSIUS,
  TEMPERATURE_UNIT_FAHRENHEIT,
} from '../../web/src/settings/defaults.ts';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const GB = 1000 ** 3;

describe('formatBytes', () => {
  it('writes binary units unless told otherwise', () => {
    expect(formatBytes(16 * GIB)).toBe('16.0 GiB');
    expect(formatBytes(16 * GIB, BYTE_UNITS_BINARY)).toBe('16.0 GiB');
  });

  it('writes decimal units when asked', () => {
    expect(formatBytes(16 * GIB, BYTE_UNITS_DECIMAL)).toBe('17.2 GB');
    expect(formatBytes(500 * GB, BYTE_UNITS_DECIMAL)).toBe('500 GB');
    expect(formatBytes(1000, BYTE_UNITS_DECIMAL)).toBe('1.0 kB');
    expect(formatBytes(999, BYTE_UNITS_DECIMAL)).toBe('999 B');
  });

  it('writes a dash for a count the host did not report', () => {
    expect(formatBytes(null, BYTE_UNITS_DECIMAL)).toBe('—');
  });
});

describe('formatRate', () => {
  it('writes a rate in the chosen units', () => {
    expect(formatRate(1.5 * MIB)).toBe('1.5 MiB/s');
    expect(formatRate(1_500_000, BYTE_UNITS_DECIMAL)).toBe('1.5 MB/s');
  });
});

describe('formatTemperature', () => {
  it('leaves a temperature alone when it is already in the chosen unit', () => {
    expect(formatTemperature(45, TEMPERATURE_UNIT_CELSIUS, TEMPERATURE_UNIT_CELSIUS)).toBe('45 °C');
    expect(formatTemperature(98.6, TEMPERATURE_UNIT_FAHRENHEIT, TEMPERATURE_UNIT_FAHRENHEIT)).toBe('98.6 °F');
  });

  it('converts Celsius to Fahrenheit and back, to one decimal at most', () => {
    expect(formatTemperature(45, TEMPERATURE_UNIT_CELSIUS, TEMPERATURE_UNIT_FAHRENHEIT)).toBe('113 °F');
    expect(formatTemperature(36.6, TEMPERATURE_UNIT_CELSIUS, TEMPERATURE_UNIT_FAHRENHEIT)).toBe('97.9 °F');
    expect(formatTemperature(100, TEMPERATURE_UNIT_FAHRENHEIT, TEMPERATURE_UNIT_CELSIUS)).toBe('37.8 °C');
  });

  it('writes a dash for a temperature the host did not report', () => {
    expect(formatTemperature(null, TEMPERATURE_UNIT_CELSIUS, TEMPERATURE_UNIT_FAHRENHEIT)).toBe('—');
  });
});

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

  it('writes both figures in decimal units when asked', () => {
    expect(formatBytesOf(32 * GB, 64 * GB, BYTE_UNITS_DECIMAL)).toBe('32.0/64.0 GB');
    expect(formatBytesOf(32 * GIB, 64 * GIB, BYTE_UNITS_DECIMAL)).toBe('34.4/68.7 GB');
  });

  it('writes an empty total as zero bytes', () => {
    expect(formatBytesOf(0, 0)).toBe('0/0 B');
  });
});
