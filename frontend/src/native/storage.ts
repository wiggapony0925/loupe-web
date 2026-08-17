/**
 * Key-value storage bridge: Capacitor Preferences on device (survives
 * webview cache eviction, which localStorage does NOT on iOS), localStorage
 * on the web. Writes go to BOTH on native so synchronous pre-paint readers
 * (the theme bootstrap in index.html) still work.
 */
import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

export async function storageGet(key: string): Promise<string | null> {
  if (isNative()) {
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null) return value;
    } catch {
      // fall through to localStorage
    }
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode — Preferences may still succeed
  }
  if (isNative()) {
    await Preferences.set({ key, value }).catch(() => undefined);
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  if (isNative()) {
    await Preferences.remove({ key }).catch(() => undefined);
  }
}
