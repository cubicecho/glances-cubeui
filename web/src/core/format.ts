import { BYTE_UNITS_BINARY, type ByteUnits, type TemperatureUnit } from '../settings/defaults.ts';

/** How one way of scaling byte counts steps and what it calls each step. */
interface ByteScale {
  bytesPerUnit: number;
  unitNames: readonly string[];
}

const BYTE_SCALES: Record<ByteUnits, ByteScale> = {
  binary: { bytesPerUnit: 1024, unitNames: ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] },
  decimal: { bytesPerUnit: 1000, unitNames: ['B', 'kB', 'MB', 'GB', 'TB', 'PB'] },
};
const FAHRENHEIT_PER_CELSIUS = 1.8;
const FAHRENHEIT_AT_FREEZING = 32;
const TEMPERATURE_SYMBOLS: Record<TemperatureUnit, string> = { celsius: '°C', fahrenheit: '°F' };
/** Converts a temperature in the other unit into the one named. */
const TEMPERATURE_INTO: Record<TemperatureUnit, (degrees: number) => number> = {
  celsius: (fahrenheit) => (fahrenheit - FAHRENHEIT_AT_FREEZING) / FAHRENHEIT_PER_CELSIUS,
  fahrenheit: (celsius) => celsius * FAHRENHEIT_PER_CELSIUS + FAHRENHEIT_AT_FREEZING,
};
/** Temperatures keep one decimal at most. */
const TEMPERATURE_ROUNDING = 10;
/** Below this, a scaled figure keeps one decimal; from it up, none. */
const WHOLE_NUMBER_FROM = 100;

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * Writes a byte count.
 *
 * @param bytes - The count, or `null` when the host did not report one.
 * @param [units] - Binary (GiB) or decimal (GB) units. Binary when left out.
 * @returns For example `"3.2 GiB"`, or an em dash for `null`.
 */
export function formatBytes(bytes: number | null, units: ByteUnits = BYTE_UNITS_BINARY): string {
  if (bytes === null) {
    return '—';
  }
  const { bytesPerUnit, unitNames } = BYTE_SCALES[units];
  let value = Math.max(bytes, 0);
  let unit = 0;
  while (value >= bytesPerUnit && unit < unitNames.length - 1) {
    value /= bytesPerUnit;
    unit += 1;
  }
  const digits = unit === 0 || value >= WHOLE_NUMBER_FROM ? 0 : 1;
  return `${value.toFixed(digits)} ${unitNames[unit]}`;
}

/**
 * Writes how much of a byte total is in use, both figures in the total's unit so they compare at a glance.
 *
 * @param usedBytes - The part in use.
 * @param totalBytes - The whole.
 * @param [units] - Binary (GiB) or decimal (GB) units. Binary when left out.
 * @returns For example `"31.2/62.7 GiB"`.
 */
export function formatBytesOf(usedBytes: number, totalBytes: number, units: ByteUnits = BYTE_UNITS_BINARY): string {
  const { bytesPerUnit, unitNames } = BYTE_SCALES[units];
  let divisor = 1;
  let unit = 0;
  while (totalBytes / divisor >= bytesPerUnit && unit < unitNames.length - 1) {
    divisor *= bytesPerUnit;
    unit += 1;
  }
  const scale = (bytes: number): string => {
    const value = Math.max(bytes, 0) / divisor;
    const digits = unit === 0 || value >= WHOLE_NUMBER_FROM ? 0 : 1;
    return value.toFixed(digits);
  };
  return `${scale(usedBytes)}/${scale(totalBytes)} ${unitNames[unit]}`;
}

/**
 * Writes a transfer rate.
 *
 * @param bytesPerSecond - The rate, or `null` when unknown.
 * @param [units] - Binary (MiB/s) or decimal (MB/s) units. Binary when left out.
 * @returns For example `"1.4 MiB/s"`.
 */
export function formatRate(bytesPerSecond: number | null, units: ByteUnits = BYTE_UNITS_BINARY): string {
  return bytesPerSecond === null ? '—' : `${formatBytes(bytesPerSecond, units)}/s`;
}

/**
 * Writes a temperature in the unit the reader chose, converting when the host reported the other.
 *
 * @param degrees - The temperature, or `null` when unknown.
 * @param reportedIn - The unit the host reported it in.
 * @param shownIn - The unit to write it in.
 * @returns For example `"45 °C"` or `"113 °F"`, with one decimal at most.
 */
export function formatTemperature(
  degrees: number | null,
  reportedIn: TemperatureUnit,
  shownIn: TemperatureUnit,
): string {
  if (degrees === null) {
    return '—';
  }
  const value = reportedIn === shownIn ? degrees : TEMPERATURE_INTO[shownIn](degrees);
  return `${Math.round(value * TEMPERATURE_ROUNDING) / TEMPERATURE_ROUNDING} ${TEMPERATURE_SYMBOLS[shownIn]}`;
}

/**
 * Writes a percentage with one decimal.
 *
 * @param percent - 0 to 100, or `null` when unknown.
 * @returns For example `"42.5%"`.
 */
export function formatPercent(percent: number | null): string {
  return percent === null ? '—' : `${percent.toFixed(1)}%`;
}

/**
 * Writes a load average or another small plain figure.
 *
 * @param value - The figure, or `null` when unknown.
 * @returns Two decimals, or an em dash.
 */
export function formatFigure(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}

/**
 * Writes the time of day of an ISO timestamp, in the reader's locale.
 *
 * @param iso - An ISO 8601 timestamp.
 * @returns For example `"14:03:27"`.
 */
export function formatTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}
