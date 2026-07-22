import { Redis } from '@upstash/redis';

// Works with either the Vercel-KV-style vars (KV_REST_API_URL / KV_REST_API_TOKEN)
// or the Upstash Marketplace vars (UPSTASH_REDIS_REST_URL / _TOKEN), so it runs
// against whichever Redis store you connect in the Vercel dashboard.
const kv = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

// ---- Key scheme -----------------------------------------------------------
// week:{YYYY-MM-DD}   hash  field=reservationId  value=reservation object
// marketing           hash  field=email(lowercased) value=contact object
const weekKey = (sunday) => `week:${sunday}`;
const MARKETING_KEY = 'marketing';

// ---- Reservations ---------------------------------------------------------
export async function listReservations(sunday) {
  const all = (await kv.hgetall(weekKey(sunday))) || {};
  return Object.values(all).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
}

export async function saveReservation(sunday, reservation) {
  await kv.hset(weekKey(sunday), { [reservation.id]: reservation });
}

export async function updateReservation(sunday, id, patch) {
  const current = await kv.hget(weekKey(sunday), id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await kv.hset(weekKey(sunday), { [id]: next });
  return next;
}

export async function deleteReservation(sunday, id) {
  await kv.hdel(weekKey(sunday), id);
}

// ---- Marketing contacts ---------------------------------------------------
export async function upsertMarketingContact(contact) {
  const email = contact.email.toLowerCase();
  const existing = await kv.hget(MARKETING_KEY, email);
  const merged = existing
    ? {
        ...existing,
        name: contact.name || existing.name,
        phone: contact.phone || existing.phone,
        reservationCount: (existing.reservationCount || 0) + 1,
        lastReservation: contact.lastReservation || existing.lastReservation
      }
    : {
        email,
        name: contact.name || '',
        phone: contact.phone || '',
        consentAt: contact.consentAt,
        consentText: contact.consentText,
        optedOut: false,
        reservationCount: 1,
        firstSeen: contact.consentAt,
        lastReservation: contact.lastReservation || ''
      };
  await kv.hset(MARKETING_KEY, { [email]: merged });
}

export async function listMarketingContacts() {
  const all = (await kv.hgetall(MARKETING_KEY)) || {};
  return Object.values(all).sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email)
  );
}

export async function setOptOut(email, optedOut) {
  const key = email.toLowerCase();
  const c = await kv.hget(MARKETING_KEY, key);
  if (!c) return null;
  const next = { ...c, optedOut };
  await kv.hset(MARKETING_KEY, { [key]: next });
  return next;
}
