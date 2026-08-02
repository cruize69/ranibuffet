import { listMarketingContacts, setOptOut } from './_lib/store.js';
import { checkPin } from './_lib/auth.js';

export default async function handler(req, res) {
  const gate = checkPin(req);
  if (!gate.ok) return res.status(gate.code).json({ error: gate.msg });

  if (req.method === 'GET') {
    const contacts = await listMarketingContacts();
    const active = contacts.filter((c) => !c.optedOut).length;
    return res.status(200).json({
      contacts,
      totals: { total: contacts.length, active, optedOut: contacts.length - active }
    });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
    const { email, optedOut } = body;
    if (!email) return res.status(400).json({ error: 'email is required.' });
    const updated = await setOptOut(email, optedOut === true);
    if (!updated) return res.status(404).json({ error: 'Contact not found.' });
    return res.status(200).json({ ok: true, contact: updated });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
