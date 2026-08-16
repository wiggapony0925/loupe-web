/**
 * Haptics (Capacitor). Per the design spec: every tag assignment and button
 * press fires a light impact. All calls are fire-and-forget with a swallowed
 * rejection — on web (no haptics engine) the plugin rejects, and a missing
 * buzz must never become a visible error.
 */
import { useMemo } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export interface HapticsApi {
  impactLight: () => void;
  impactMedium: () => void;
  success: () => void;
  warning: () => void;
}

export function useHaptics(): HapticsApi {
  return useMemo(
    () => ({
      impactLight: () => {
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      },
      impactMedium: () => {
        void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
      },
      success: () => {
        void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      },
      warning: () => {
        void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
      },
    }),
    [],
  );
}
