const BYTES_PER_UNIT = 1024;
const BYTE_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] as const;
/** Below this, a scaled figure keeps one decimal; from it up, none. */
const WHOLE_NUMBER_FROM = 100;

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * Writes a byte count in binary units.
 *
 * @param bytes - The count, or `null` when the host did not report one.
 * @returns For example `"3.2 GiB"`, or an em dash for `null`.
 */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return '—';
  }
  let value = Math.max(bytes, 0);
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < BYTE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unit += 1;
  }
  const digits = unit === 0 || value >= WHOLE_NUMBER_FROM ? 0 : 1;
  return `${value.toFixed(digits)} ${BYTE_UNITS[unit]}`;
}

/**
 * Writes a transfer rate.
 *
 * @param bytesPerSecond - The rate, or `null` when unknown.
 * @returns For example `"1.4 MiB/s"`.
 */
export function formatRate(bytesPerSecond: number | null): string {
  return bytesPerSecond === null ? '—' : `${formatBytes(bytesPerSecond)}/s`;
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
