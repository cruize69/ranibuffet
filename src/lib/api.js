async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export function getConfig() {
  return fetch('/api/config').then(json);
}

export function createReservation(payload) {
  return fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(json);
}

// --- Staff (PIN-gated) -----------------------------------------------------
const pinHeaders = (pin) => ({ 'Content-Type': 'application/json', 'x-staff-pin': pin });

export function listReservations(week, pin) {
  return fetch(`/api/reservations?week=${encodeURIComponent(week)}`, {
    headers: { 'x-staff-pin': pin }
  }).then(json);
}

export function reservationAction(payload, pin) {
  return fetch('/api/reservation-action', {
    method: 'POST', headers: pinHeaders(pin), body: JSON.stringify(payload)
  }).then(json);
}

export function listMarketing(pin) {
  return fetch('/api/marketing', { headers: { 'x-staff-pin': pin } }).then(json);
}

export function setOptOut(email, optedOut, pin) {
  return fetch('/api/marketing', {
    method: 'POST', headers: pinHeaders(pin),
    body: JSON.stringify({ email, optedOut })
  }).then(json);
}

// Trigger a CSV download through a temporary authenticated fetch -> blob.
export async function downloadMarketingCsv(pin) {
  const res = await fetch('/api/marketing-export', { headers: { 'x-staff-pin': pin } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Export failed.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rani-mahal-marketing-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
