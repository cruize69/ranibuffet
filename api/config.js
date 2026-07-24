import { bookableSundays, staffSundays, STAFF_LAUNCH_SUNDAY } from './_lib/sundays.js';
import { RESTAURANT, BUFFET, VAPID_PUBLIC_KEY } from './_lib/config.js';

export default function handler(req, res) {
  res.status(200).json({
    restaurant: RESTAURANT,
    buffet: BUFFET,
    bookableSundays: bookableSundays(),
    staffSundays: staffSundays(),
    launchSunday: STAFF_LAUNCH_SUNDAY,
    vapidPublicKey: VAPID_PUBLIC_KEY || null
  });
}
