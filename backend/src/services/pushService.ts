/**
 * Push notifications (FCM via firebase-admin).
 *
 * The core promise of the real-time engine is "tag it from the lock screen":
 * the instant an alert email is ingested, everyone mapped to that card gets a
 * push carrying the transaction id AND their device's `actionKey`, so the
 * iOS notification actions (Mine / Partner's / 50/50) can tag WITHOUT
 * launching the app (see controllers/pushActionController.ts). Because the
 * key is per-device, messages are built per-token and sent with sendEach.
 *
 * Push is best-effort BY DESIGN: a delivery failure logs and returns —
 * ingestion must never fail because APNs had a bad minute.
 */
import { getMessaging, type Message } from 'firebase-admin/messaging';
import { prisma } from '../config/db';
import { initFirebase } from '../middleware/verifyFirebaseToken';
import { formatUsd } from '../utils/money';
import { logger } from '../utils/logger';

const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export interface PushContent {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function notifyUsers(userIds: string[], content: PushContent): Promise<void> {
  if (userIds.length === 0) return;
  try {
    initFirebase();
    const devices = await prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true, actionKey: true },
    });
    if (devices.length === 0) return;

    const messages: Message[] = devices.map((device) => ({
      token: device.token,
      notification: { title: content.title, body: content.body },
      data: {
        ...content.data,
        ...(device.actionKey ? { actionKey: device.actionKey } : {}),
      },
      apns: {
        payload: {
          aps: {
            category: 'TAG_TRANSACTION',
            sound: 'default',
            'interruption-level': 'time-sensitive',
          },
        },
      },
      android: { priority: 'high' as const },
    }));

    const response = await getMessaging().sendEach(messages);

    // Prune tokens FCM says are dead so the table doesn't accrete ghosts.
    const stale: string[] = [];
    response.responses.forEach((result, index) => {
      const code = result.error?.code;
      if (code && STALE_TOKEN_CODES.has(code)) {
        const token = devices[index]?.token;
        if (token) stale.push(token);
      }
    });
    if (stale.length > 0) {
      await prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
    }
  } catch (err) {
    logger.warn({ err, userIds }, 'push delivery failed (non-fatal)');
  }
}

export async function notifyTransactionCreated(params: {
  transactionId: string;
  merchant: string;
  amountCents: number;
  accountOwnerId: string;
  spenderId: string | null;
  requiresTagging: boolean;
}): Promise<void> {
  const recipients = new Set<string>([params.accountOwnerId]);
  if (params.spenderId) recipients.add(params.spenderId);

  await notifyUsers([...recipients], {
    title: params.merchant,
    body: params.requiresTagging
      ? `${formatUsd(params.amountCents)} — who was this? Tap to tag`
      : `${formatUsd(params.amountCents)} — tap to tag`,
    data: {
      type: 'transaction.created',
      transactionId: params.transactionId,
    },
  });
}
