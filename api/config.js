import { bookableSundays, staffSundays } from './_lib/sundays.js';
import { RESTAURANT, BUFFET } from './_lib/config.js';

export default function handler(req, res) {
  res.status(200).json({
    restaurant: RESTAURANT,
    buffet: BUFFET,
    bookableSundays: bookableSundays(),
    staffSundays: staffSundays()
  });
}
