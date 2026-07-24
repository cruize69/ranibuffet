import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './config.js';
import { listPushSubscriptions, removePushSubscription } from './store.js';

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

// Sends a push notification to every registered staff device. If VAPID keys
// aren't set, this is a silent no-op — same graceful-fallback pattern as
// email without a Resend key, so a missing setup step never blocks a booking.
export async function notifyNewReservation(reservation, prettyDate) {
  if (!ensureConfigured()) return { sent: 0, skipped: true };

  const subs = await listPushSubscriptions();
  if (subs.length === 0) return { sent: 0, skipped: false };

  const payload = JSON.stringify({
    title: 'New reservation',
    body: `${reservation.name} · party of ${reservation.partySize} · ${prettyDate}`,
    url: '/staff'
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        sent += 1;
      } catch (err) {
        // 404/410 means the subscription is dead (browser data cleared,
        // uninstalled, etc.) — clean it up so future sends don't keep failing.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await removePushSubscription(sub.endpoint);
        } else {
          console.error('Push send failed:', err.message || err);
        }
      }
    })
  );
  return { sent, skipped: false };
}
