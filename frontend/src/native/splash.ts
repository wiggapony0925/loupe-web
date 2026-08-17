/**
 * Splash-screen bridge: config sets launchAutoHide=false so the native
 * splash holds until the app has decided what to render (auth resolved) —
 * no white flash, no half-hydrated first frame.
 */
import { SplashScreen } from '@capacitor/splash-screen';
import { isNative } from './platform';

export function hideSplash(): void {
  if (!isNative()) return;
  void SplashScreen.hide({ fadeOutDuration: 220 }).catch(() => undefined);
}
