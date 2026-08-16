/**
 * Push registration + the lock-screen tagging entry point.
 *
 * On native, registers the FCM/APNs token with the backend, and when the
 * user taps a "new charge" notification, routes straight into the Feed with
 * that transaction's bottom sheet open — the whole point of the real-time
 * engine.
 */
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiFetch } from '@/lib/api';

export function usePushNotifications(
  enabled: boolean,
  onOpenTransaction: (transactionId: string) => void,
): void {
  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return;

    let cancelled = false;

    const register = async (): Promise<void> => {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted' || cancelled) return;

      await PushNotifications.addListener('registration', (token) => {
        void apiFetch('/v1/users/me/device-tokens', {
          method: 'POST',
          body: {
            token: token.value,
            platform: Capacitor.getPlatform() === 'ios' ? 'IOS' : 'ANDROID',
          },
        }).catch(() => undefined); // re-registered on next launch
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data as Record<string, string> | undefined;
        if (data?.type === 'transaction.created' && data.transactionId) {
          onOpenTransaction(data.transactionId);
        }
      });

      await PushNotifications.register();
    };

    void register().catch(() => undefined);

    return () => {
      cancelled = true;
      void PushNotifications.removeAllListeners().catch(() => undefined);
    };
  }, [enabled, onOpenTransaction]);
}
