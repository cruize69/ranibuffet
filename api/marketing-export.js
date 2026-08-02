import { listMarketingContacts } from './_lib/store.js';
import { checkPin } from './_lib/auth.js';

// Exports opted-in contacts as a CSV. Column headers match what Mailchimp's
// importer expects (Email Address / First Name / Last Name), and the plain
// format imports cleanly into Constant Contact, Klaviyo, Squarespace, etc.
export default async function handler(req, res) {
  const gate = checkPin(req);
  if (!gate.ok) return res.status(gate.code).json({ error: gate.msg });

  const contacts = (await listMarketingContacts()).filter((c) => !c.optedOut);

  const headers = [
    'Email Address', 'First Name', 'Last Name', 'Phone',
    'Opt-In Date', 'Last Reservation', 'Reservations'
  ];
  const rows = contacts.map((c) => {
    const { first, last } = splitName(c.name);
    return [
      c.email,
      first,
      last,
      c.phone || '',
      dateOnly(c.consentAt),
      c.lastReservation || '',
      String(c.reservationCount || 0)
    ].map(csvCell).join(',');
  });

  const csv = [headers.map(csvCell).join(','), ...rows].join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="rani-mahal-marketing-${stamp}.csv"`);
  return res.status(200).send(csv);
}

function splitName(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function dateOnly(iso) {
  return iso ? String(iso).slice(0, 10) : '';
}

function csvCell(value = '') {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
