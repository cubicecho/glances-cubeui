/** Byte counts in powers of 1024: KiB, MiB, GiB. */
export const BYTE_UNITS_BINARY = 'binary';
/** Byte counts in powers of 1000: kB, MB, GB. */
export const BYTE_UNITS_DECIMAL = 'decimal';
/** How byte counts and rates are scaled. */
export type ByteUnits = typeof BYTE_UNITS_BINARY | typeof BYTE_UNITS_DECIMAL;

/** Temperatures in degrees Celsius. */
export const TEMPERATURE_UNIT_CELSIUS = 'celsius';
/** Temperatures in degrees Fahrenheit. */
export const TEMPERATURE_UNIT_FAHRENHEIT = 'fahrenheit';
/** The unit temperatures are shown in. */
export type TemperatureUnit = typeof TEMPERATURE_UNIT_CELSIUS | typeof TEMPERATURE_UNIT_FAHRENHEIT;

/**
 * What one browser's user has chosen. To add a setting: a member here, its default below, and its
 * rule in `SETTINGS_SCHEMA` (`settings-store.ts`).
 */
export interface Settings {
  /** Time between dashboard updates, in seconds. Null follows every sample the server takes. */
  updateIntervalSeconds: number | null;
  /** How byte counts and rates are scaled. */
  byteUnits: ByteUnits;
  /** The unit temperatures are shown in. */
  temperatureUnit: TemperatureUnit;
  /** How many of a host's busiest processes its page lists. */
  processCount: number;
}

export const SETTINGS_DEFAULTS: Readonly<Settings> = Object.freeze({
  updateIntervalSeconds: null,
  byteUnits: BYTE_UNITS_BINARY,
  temperatureUnit: TEMPERATURE_UNIT_CELSIUS,
  processCount: 15,
});

const FIVE_SECONDS = 5;
const TEN_SECONDS = 10;
const HALF_A_MINUTE_SECONDS = 30;
const ONE_MINUTE_SECONDS = 60;
/** The update intervals offered above the server's own, in seconds. */
export const UPDATE_INTERVAL_CHOICES_SECONDS: readonly number[] = [
  FIVE_SECONDS,
  TEN_SECONDS,
  HALF_A_MINUTE_SECONDS,
  ONE_MINUTE_SECONDS,
];

const FEW_PROCESSES = 5;
const SOME_PROCESSES = 10;
/** The process counts offered. The server keeps the 15 busiest, so no choice goes past that. */
export const PROCESS_COUNT_CHOICES: readonly number[] = [FEW_PROCESSES, SOME_PROCESSES, SETTINGS_DEFAULTS.processCount];
