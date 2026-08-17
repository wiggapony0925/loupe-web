/**
 * Clipboard bridge — Capacitor Clipboard on device (navigator.clipboard is
 * permission-flaky inside webviews), navigator.clipboard on the web.
 */
import { Clipboard } from '@capacitor/clipboard';
import { isNative } from './platform';

export async function copyText(text: string): Promise<boolean> {
  if (isNative()) {
    try {
      await Clipboard.write({ string: text });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
