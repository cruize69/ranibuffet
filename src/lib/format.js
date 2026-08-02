// Format a plain YYYY-MM-DD string without timezone shifting by constructing
// the date from its components at local midnight.
function partsOf(sunday) {
  const [y, m, d] = sunday.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Add whole days to a YYYY-MM-DD string using UTC math (date-only, tz-safe).
// Client-side counterpart to the same helper in api/_lib/sundays.js.
export function addDaysStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function monthShort(sunday) {
  return partsOf(sunday).toLocaleDateString('en-US', { month: 'short' });
}

export function dayNum(sunday) {
  return partsOf(sunday).getDate();
}

export function fullDate(sunday) {
  return partsOf(sunday).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

export function shortDate(sunday) {
  return partsOf(sunday).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

// Human label for the customer's three choices.
export function relLabel(index) {
  return ['This Sunday', 'Next', 'Following'][index] || '';
}

export function timeAgo(iso) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit'
  });
}

// Build a 6-row calendar grid for a given year/month (0-indexed month),
// used by the staff "jump to date" picker. Every cell has the date string,
// the day-of-month number, whether it belongs to the displayed month, and
// whether it's a Sunday (the only selectable day).
export function monthGrid(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const toStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = daysInPrevMonth - startWeekday + 1 + i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ dateStr: toStr(y, m, d), day: d, inMonth: false, isSunday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: toStr(year, month, d), day: d, inMonth: true, isSunday: new Date(year, month, d).getDay() === 0 });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const idx = cells.length - (startWeekday + daysInMonth);
    const d = idx + 1;
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ dateStr: toStr(y, m, d), day: d, inMonth: false, isSunday: false });
    if (cells.length >= 42) break;
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  while (weeks.length > 4 && weeks[weeks.length - 1].every((c) => !c.inMonth)) weeks.pop();
  return weeks;
}
