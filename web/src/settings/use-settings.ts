import { useEffect, useSyncExternalStore } from 'react';
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

/**
 * Puts the chosen density on the document, where `index.css` reads it. Mount it once, in the app shell.
 *
 * @remarks
 * It is on the root element and not a wrapper so that popovers and tooltips, which are drawn outside the app's tree, follow it.
 */
export function useDensity(): void {
  const [{ density }] = useSettings();
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);
}
