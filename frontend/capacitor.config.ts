/**
 * Capacitor shell config — the "Chase model": the production web build in
 * dist/ IS the app, wrapped in a native container with real push, haptics,
 * and status-bar control. `npx cap add ios && npx cap sync` after building.
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jfmcapital.trackify',
  appName: 'trackify',
  webDir: 'dist',
  backgroundColor: '#FFFFFF',
  server: {
    // https scheme so Firebase Auth + secure cookies behave inside the webview.
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#FFFFFF',
  },
  android: {
    backgroundColor: '#FFFFFF',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
