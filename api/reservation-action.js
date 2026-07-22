import { updateReservation, deleteReservation } from './_lib/store.js';
import { checkPin } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const gate = checkPin(req);
  if (!gate.ok) return res.status(gate.code).json({ error: gate.msg });

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const { week, id, action } = body;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(week || '') || !id)
    return res.status(400).json({ error: 'week and id are required.' });

  if (action === 'seat' || action === 'unseat') {
    const updated = await updateReservation(week, id, { seated: action === 'seat' });
    if (!updated) return res.status(404).json({ error: 'Reservation not found.' });
    return res.status(200).json({ ok: true, reservation: updated });
  }

  if (action === 'delete') {
    await deleteReservation(week, id);
    return res.status(200).json({ ok: true, deleted: id });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
