import { randomUUID } from 'crypto';
import { bookableSundays, isValidStaffSunday, isValidBookableSunday } from './_lib/sundays.js';
import { MARKETING_CONSENT_TEXT } from './_lib/config.js';
import {
  saveReservation,
  listReservations,
  upsertMarketingContact
} from './_lib/store.js';
import { sendConfirmationEmail } from './_lib/email.js';
import { notifyNewReservation } from './_lib/push.js';
import { checkPin } from './_lib/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method === 'POST') return createReservation(req, res);
  if (req.method === 'GET') return getReservations(req, res);
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

// --- Public: create a reservation -----------------------------------------
async function createReservation(req, res) {
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const partySize = parseInt(body.partySize, 10);
  const sunday = (body.sunday || '').trim();
  const marketingOptIn = body.marketingOptIn === true;

  if (!name) return res.status(400).json({ error: 'Please enter a name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 100)
    return res.status(400).json({ error: 'Please enter a valid party size.' });

  // Re-validate the chosen Sunday against the server clock so a stale page
  // cannot book a date that is no longer available. Customers may pick any
  // valid Sunday via the calendar, not just the 3 quick-pick dates.
  if (!isValidBookableSunday(sunday))
    return res.status(400).json({
      error: 'That date is no longer available. Please choose another Sunday.',
      bookableSundays: bookableSundays()
    });

  const now = new Date().toISOString();
  const reservation = {
    id: randomUUID(),
    name, email, phone,
    partySize, sunday,
    seated: false,
    marketingOptIn,
    createdAt: now
  };

  await saveReservation(sunday, reservation);

  if (marketingOptIn) {
    await upsertMarketingContact({
      name, email, phone,
      consentAt: now,
      consentText: MARKETING_CONSENT_TEXT,
      lastReservation: sunday
    });
  }

  const [emailResult] = await Promise.all([
    sendConfirmationEmail(reservation, prettyDate(sunday)),
    notifyNewReservation(reservation, prettyDate(sunday))
  ]);

  return res.status(201).json({
    ok: true,
    reservation: { id: reservation.id, name, partySize, sunday },
    emailSent: emailResult.sent
  });
}

// --- Staff: list reservations for a given Sunday --------------------------
async function getReservations(req, res) {
  const gate = checkPin(req);
  if (!gate.ok) return res.status(gate.code).json({ error: gate.msg });

  const sunday = (req.query.week || '').trim();
  if (!isValidStaffSunday(sunday))
    return res.status(400).json({ error: 'A valid Sunday on or after launch is required.' });

  const reservations = await listReservations(sunday);
  const covers = reservations.reduce((sum, r) => sum + (r.partySize || 0), 0);
  const seatedCovers = reservations
    .filter((r) => r.seated)
    .reduce((sum, r) => sum + (r.partySize || 0), 0);

  return res.status(200).json({
    week: sunday,
    reservations,
    totals: { reservations: reservations.length, covers, seatedCovers }
  });
}

function prettyDate(sunday) {
  const [y, m, d] = sunday.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
