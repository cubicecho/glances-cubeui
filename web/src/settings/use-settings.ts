import { useSyncExternalStore } from 'react';
import type { Settings } from '@/settings/defaults';
import { createSettingsStore, SETTINGS_STORAGE_KEY, type SettingsStorage } from '@/settings/settings-store';

/**
 * Finds this browser's storage.
 *
 * @returns `localStorage`, or null where reading it throws (blocked site data, some private windows).
 */
function browserStorage(): SettingsStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** One store for the page, so every component reads the same settings. */
const store = createSettingsStore(browserStorage());

// Another tab changed the settings: follow it.
window.addEventListener('storage', (event) => {
  const isSettings = event.key === SETTINGS_STORAGE_KEY || event.key === null;
  if (isSettings) {
    store.reload();
  }
});

/**
 * Reads this browser's settings and re-renders when they change.
 *
 * @returns The settings, and the function that replaces some of them and saves.
 */
export function useSettings(): [Settings, (changes: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(store.subscribe, store.get);
  return [settings, store.update];
}
