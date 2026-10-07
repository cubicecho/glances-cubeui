import { z } from 'zod';
import {
  BYTE_UNITS_BINARY,
  BYTE_UNITS_DECIMAL,
  Density,
  DetailLevel,
  SETTINGS_DEFAULTS,
  type Settings,
  TEMPERATURE_UNIT_CELSIUS,
  TEMPERATURE_UNIT_FAHRENHEIT,
} from './defaults.ts';

/** The key the settings are kept under. */
export const SETTINGS_STORAGE_KEY = 'glances-cubeui:settings';

/** Each key falls back to its own default, so one bad or missing value costs only itself. */
const SETTINGS_SCHEMA: z.ZodType<Settings> = z.object({
  updateIntervalSeconds: z.number().positive().nullable().catch(SETTINGS_DEFAULTS.updateIntervalSeconds),
  byteUnits: z.enum([BYTE_UNITS_BINARY, BYTE_UNITS_DECIMAL]).catch(SETTINGS_DEFAULTS.byteUnits),
  temperatureUnit: z
    .enum([TEMPERATURE_UNIT_CELSIUS, TEMPERATURE_UNIT_FAHRENHEIT])
    .catch(SETTINGS_DEFAULTS.temperatureUnit),
  processCount: z.number().int().positive().catch(SETTINGS_DEFAULTS.processCount),
  detailLevel: z.enum(Object.values(DetailLevel)).catch(SETTINGS_DEFAULTS.detailLevel),
  hideSystemStorage: z.boolean().catch(SETTINGS_DEFAULTS.hideSystemStorage),
  density: z.enum(Object.values(Density)).catch(SETTINGS_DEFAULTS.density),
});

/** The part of `localStorage` the store uses. Either call may throw, as a blocked store does. */
export interface SettingsStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

/** One browser's settings, kept in memory and written through to storage. */
export interface SettingsStore {
  /** The current settings. The same object until something changes, so React can compare it. */
  get: () => Settings;
  /** Replaces the given settings, saves, and tells every subscriber. */
  update: (changes: Partial<Settings>) => void;
  /** Reads storage again, for when another tab wrote it. */
  reload: () => void;
  /** Calls the listener after each change. Returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void;
}

/**
 * Reads settings from what storage held.
 *
 * @param raw - The stored JSON, or null when nothing is stored.
 * @returns The settings, with the default for every key that is missing or unusable.
 */
export function parseSettings(raw: string | null): Settings {
  let stored: unknown = {};
  try {
    stored = JSON.parse(raw ?? '{}');
  } catch {
    // Not JSON: every key takes its default.
  }
  const parsed = SETTINGS_SCHEMA.safeParse(stored);
  return parsed.success ? parsed.data : { ...SETTINGS_DEFAULTS };
}

/**
 * Builds a settings store over a storage.
 *
 * @param storage - Where settings are kept, or null to keep them for this page load only.
 * @returns The store. A storage that throws is treated as empty on read and skipped on write.
 */
export function createSettingsStore(storage: SettingsStorage | null): SettingsStore {
  const listeners = new Set<() => void>();

  const read = (): Settings => {
    try {
      return parseSettings(storage?.getItem(SETTINGS_STORAGE_KEY) ?? null);
    } catch {
      return { ...SETTINGS_DEFAULTS };
    }
  };
  let current = read();

  const announce = (next: Settings): void => {
    current = next;
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    get: () => current,
    update: (changes) => {
      const next = { ...current, ...changes };
      try {
        storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage is full or blocked: the choice still holds until the page is closed.
      }
      announce(next);
    },
    reload: () => announce(read()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
