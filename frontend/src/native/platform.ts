/**
 * Platform detection helpers — the only place `Capacitor` platform checks
 * live. Bridges branch here; components never ask what platform they're on.
 */
import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function platformName(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android' ? platform : 'web';
}
