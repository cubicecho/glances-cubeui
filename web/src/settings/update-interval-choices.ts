import { UPDATE_INTERVAL_CHOICES_SECONDS } from './defaults.ts';

const SECONDS_PER_MINUTE = 60;

/**
 * Lists the update intervals a user can pick.
 *
 * @param sampleIntervalSeconds - How often the server samples every host.
 * @returns The server's interval, which is the fastest there is, then each offered interval above it.
 */
export function updateIntervalChoices(sampleIntervalSeconds: number): number[] {
  const slower = UPDATE_INTERVAL_CHOICES_SECONDS.filter((seconds) => seconds > sampleIntervalSeconds);
  return [sampleIntervalSeconds, ...slower];
}

/**
 * Finds the choice a stored setting stands for.
 *
 * @param updateIntervalSeconds - The stored interval, or null for every sample.
 * @param sampleIntervalSeconds - How often the server samples every host.
 * @returns The stored interval, or the server's when none is stored or the server is no faster.
 */
export function chosenUpdateInterval(updateIntervalSeconds: number | null, sampleIntervalSeconds: number): number {
  return Math.max(updateIntervalSeconds ?? sampleIntervalSeconds, sampleIntervalSeconds);
}

/**
 * Turns a picked choice into the setting to store.
 *
 * @param pickedSeconds - The choice.
 * @param sampleIntervalSeconds - How often the server samples every host.
 * @returns Null for the fastest choice, so it keeps following the server if its interval changes.
 */
export function updateIntervalSetting(pickedSeconds: number, sampleIntervalSeconds: number): number | null {
  return pickedSeconds <= sampleIntervalSeconds ? null : pickedSeconds;
}

/**
 * Writes an interval as a short label.
 *
 * @param seconds - The interval.
 * @returns For example `"5 s"` or `"1 min"`.
 */
export function formatInterval(seconds: number): string {
  const isUnderAMinute = seconds < SECONDS_PER_MINUTE;
  return isUnderAMinute ? `${seconds} s` : `${seconds / SECONDS_PER_MINUTE} min`;
}
