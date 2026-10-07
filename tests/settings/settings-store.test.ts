import {
  BYTE_UNITS_DECIMAL,
  DetailLevel,
  SETTINGS_DEFAULTS,
  TEMPERATURE_UNIT_FAHRENHEIT,
} from '../../web/src/settings/defaults.ts';
import {
  createSettingsStore,
  parseSettings,
  SETTINGS_STORAGE_KEY,
  type SettingsStorage,
} from '../../web/src/settings/settings-store.ts';

/**
 * Builds a storage over a plain map.
 *
 * @param initial - What it holds to begin with.
 * @returns The storage and the map behind it.
 */
function memoryStorage(initial: Record<string, string> = {}): { storage: SettingsStorage; held: Map<string, string> } {
  const held = new Map(Object.entries(initial));
  return {
    held,
    storage: { getItem: (key) => held.get(key) ?? null, setItem: (key, value) => void held.set(key, value) },
  };
}

/** A storage that refuses every call, as a browser with site data blocked does. */
const BLOCKED_STORAGE: SettingsStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('parseSettings', () => {
  it('gives the defaults when nothing is stored', () => {
    expect(parseSettings(null)).toEqual(SETTINGS_DEFAULTS);
  });

  it.each(['not json', 'null', '[]', '"text"', '42'])('gives the defaults for %s', (raw) => {
    expect(parseSettings(raw)).toEqual(SETTINGS_DEFAULTS);
  });

  it('keeps every stored value that is usable', () => {
    const stored = {
      updateIntervalSeconds: 30,
      byteUnits: BYTE_UNITS_DECIMAL,
      temperatureUnit: TEMPERATURE_UNIT_FAHRENHEIT,
      processCount: 5,
      detailLevel: DetailLevel.All,
      hideSystemStorage: false,
    };
    expect(parseSettings(JSON.stringify(stored))).toEqual(stored);
  });

  it('replaces only the unusable keys with their defaults', () => {
    const raw = JSON.stringify({
      updateIntervalSeconds: -5,
      byteUnits: 'furlongs',
      temperatureUnit: TEMPERATURE_UNIT_FAHRENHEIT,
      processCount: 2.5,
      detailLevel: 'EVERYTHING',
      hideSystemStorage: 'yes',
    });
    expect(parseSettings(raw)).toEqual({ ...SETTINGS_DEFAULTS, temperatureUnit: TEMPERATURE_UNIT_FAHRENHEIT });
  });

  it('fills in keys an older version never stored and drops ones it does not know', () => {
    const parsed = parseSettings(JSON.stringify({ processCount: 10, retired: true }));
    expect(parsed).toEqual({ ...SETTINGS_DEFAULTS, processCount: 10 });
  });
});

describe('createSettingsStore', () => {
  it('starts from what storage holds', () => {
    const { storage } = memoryStorage({ [SETTINGS_STORAGE_KEY]: JSON.stringify({ processCount: 5 }) });
    expect(createSettingsStore(storage).get().processCount).toBe(5);
  });

  it('saves an update, keeps the other settings and tells subscribers', () => {
    const { storage, held } = memoryStorage();
    const store = createSettingsStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ updateIntervalSeconds: 10 });
    expect(store.get()).toEqual({ ...SETTINGS_DEFAULTS, updateIntervalSeconds: 10 });
    expect(parseSettings(held.get(SETTINGS_STORAGE_KEY) ?? null)).toEqual(store.get());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns the same object until something changes', () => {
    const store = createSettingsStore(memoryStorage().storage);
    const before = store.get();
    expect(store.get()).toBe(before);
    store.update({ processCount: 10 });
    expect(store.get()).not.toBe(before);
  });

  it('stops telling a listener that unsubscribed', () => {
    const store = createSettingsStore(memoryStorage().storage);
    const listener = vi.fn();
    store.subscribe(listener)();
    store.update({ processCount: 10 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('picks up what another tab wrote on reload', () => {
    const { storage, held } = memoryStorage();
    const store = createSettingsStore(storage);
    held.set(SETTINGS_STORAGE_KEY, JSON.stringify({ byteUnits: BYTE_UNITS_DECIMAL }));
    store.reload();
    expect(store.get().byteUnits).toBe(BYTE_UNITS_DECIMAL);
  });

  it('works from the defaults when storage throws, and still holds a change for the page', () => {
    const store = createSettingsStore(BLOCKED_STORAGE);
    expect(store.get()).toEqual(SETTINGS_DEFAULTS);
    store.update({ processCount: 5 });
    expect(store.get().processCount).toBe(5);
  });

  it('works with no storage at all', () => {
    const store = createSettingsStore(null);
    store.update({ byteUnits: BYTE_UNITS_DECIMAL });
    expect(store.get().byteUnits).toBe(BYTE_UNITS_DECIMAL);
  });
});
