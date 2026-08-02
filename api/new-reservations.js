import { checkPin } from './_lib/auth.js';
import { countUnseen, listUnseen, getReservation, markSeen } from './_lib/store.js';

export default async function handler(req, res) {
  const gate = checkPin(req);
  if (!gate.ok) return res.status(gate.code).json({ error: gate.msg });

  const refs = await listUnseen(100);

  const items = [];
  let cleanedUp = false;
  for (const { sunday, id } of refs) {
    const r = await getReservation(sunday, id);
    if (r) {
      items.push(r);
    } else {
      // Reservation is gone (deleted outside the normal delete path) —
      // self-heal by dropping the dangling unseen reference.
      await markSeen(sunday, id);
      cleanedUp = true;
    }
  }

  const total = cleanedUp ? await countUnseen() : items.length;

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json({ total, items });
}
