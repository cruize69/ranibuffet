// Format a plain YYYY-MM-DD string without timezone shifting by constructing
// the date from its components at local midnight.
function partsOf(sunday) {
  const [y, m, d] = sunday.split('-').map(Number);
  return new Date(y, m - 1, d);
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
