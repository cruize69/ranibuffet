import { checkPin } from './_lib/auth.js';
import { savePushSubscription, removePushSubscription } from './_lib/store.js';

export default async function handler(req, res) {
  const gate = checkPin(req);
  if (!gate.ok) return res.status(gate.code).json({ error: gate.msg });

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};

  if (req.method === 'POST') {
    if (!body.endpoint) return res.status(400).json({ error: 'Invalid subscription.' });
    await savePushSubscription(body);
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (body.endpoint) await removePushSubscription(body.endpoint);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
