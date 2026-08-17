/**
 * External-link bridge. On device, links open in the in-app browser sheet
 * (SFSafariViewController / Custom Tabs) instead of tearing the user out of
 * the app; on the web, a normal new tab.
 */
import { Browser } from '@capacitor/browser';
import { isNative } from './platform';

export async function openExternal(url: string): Promise<void> {
  if (isNative()) {
    await Browser.open({ url }).catch(() => undefined);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
