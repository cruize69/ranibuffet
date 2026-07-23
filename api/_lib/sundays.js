// All buffet-date logic is computed in America/New_York so it is correct
// regardless of where the serverless function runs (Vercel runs in UTC).

const TZ = 'America/New_York';
const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Break a Date into calendar parts as seen in Eastern Time.
function etParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short'
  });
  const p = fmt.formatToParts(date).reduce((a, x) => ((a[x.type] = x.value), a), {});
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour === 24 ? 0 : +p.hour, minute: +p.minute,
    weekday: WEEKDAY[p.weekday]
  };
}

function ymd(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Add whole days to a YYYY-MM-DD string using UTC math (date-only, tz-safe).
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

// The buffet program's launch date — no reservation may be made for any
// Sunday before this one, no matter what the clock-based calculation below
// would otherwise allow. Update this if the launch date ever changes.
const LAUNCH_SUNDAY = '2026-09-06'; // first Sunday in September 2026

// The earliest Sunday a customer can still book.
// Before Sun 12:00pm ET -> this upcoming Sunday (today if it's Sunday morning).
// Sun 12:00pm ET or later -> the event has started, roll to next Sunday.
// Never earlier than LAUNCH_SUNDAY.
export function earliestBookableSunday(now = new Date()) {
  const p = etParts(now);
  const today = ymd(p.year, p.month, p.day);
  const daysUntilSunday = (7 - p.weekday) % 7; // 0 when today is Sunday
  let sunday = addDays(today, daysUntilSunday);
  if (p.weekday === 0 && p.hour >= 12) sunday = addDays(sunday, 7);
  // ISO YYYY-MM-DD strings compare correctly with plain string comparison.
  return sunday < LAUNCH_SUNDAY ? LAUNCH_SUNDAY : sunday;
}

// The three Sundays a customer may choose from.
export function bookableSundays(now = new Date(), count = 3) {
  const first = earliestBookableSunday(now);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

// Sundays the staff manager can view: this calendar week's Sunday
// (today when it's Sunday, so the list stays visible during service) and forward.
export function staffSundays(now = new Date(), count = 6) {
  const p = etParts(now);
  const today = ymd(p.year, p.month, p.day);
  const daysUntilSunday = (7 - p.weekday) % 7;
  const thisWeekSunday = addDays(today, daysUntilSunday);
  return Array.from({ length: count }, (_, i) => addDays(thisWeekSunday, i * 7));
}
