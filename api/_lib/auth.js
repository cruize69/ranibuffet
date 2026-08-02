// Simple shared-PIN gate for staff endpoints. The PIN is sent in a request
// header and compared server-side to STAFF_PIN — it is never exposed to the
// browser bundle.
export function checkPin(req) {
  const pin = req.headers['x-staff-pin'];
  const expected = process.env.STAFF_PIN;
  if (!expected) return { ok: false, code: 500, msg: 'STAFF_PIN is not configured on the server.' };
  if (!pin || pin !== expected) return { ok: false, code: 401, msg: 'Incorrect PIN.' };
  return { ok: true };
}
