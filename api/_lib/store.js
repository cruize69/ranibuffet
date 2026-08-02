import Redis from 'ioredis';

// Connects over the standard Redis wire protocol using REDIS_URL — the
// connection string Vercel's "Redis storage" (Marketplace) integration
// provides. Reused across warm serverless invocations via the module-level
// singleton below; a fresh connection is only opened on a cold start.
let client;
function redis() {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is not set.');
    client = new Redis(url, {
      // Queue commands issued during the initial connect handshake (this
      // matters on cold starts) but still fail reasonably fast if the
      // connection is genuinely down, rather than hanging forever.
      maxRetriesPerRequest: 3,
      connectTimeout: 8000
    });
    client.on('error', (err) => console.error('Redis client error:', err));
  }
  return client;
}

// ---- Key scheme -----------------------------------------------------------
// week:{YYYY-MM-DD}   hash  field=reservationId  value=JSON reservation
// marketing           hash  field=email(lowercased) value=JSON contact
const weekKey = (sunday) => `week:${sunday}`;
const MARKETING_KEY = 'marketing';

// ---- Reservations ---------------------------------------------------------
export async function listReservations(sunday) {
  const all = await redis().hgetall(weekKey(sunday));
  return Object.values(all || {})
    .map((v) => JSON.parse(v))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function saveReservation(sunday, reservation) {
  await redis().hset(weekKey(sunday), reservation.id, JSON.stringify(reservation));
}

export async function updateReservation(sunday, id, patch) {
  const raw = await redis().hget(weekKey(sunday), id);
  if (!raw) return null;
  const next = { ...JSON.parse(raw), ...patch };
  await redis().hset(weekKey(sunday), id, JSON.stringify(next));
  return next;
}

export async function deleteReservation(sunday, id) {
  await redis().hdel(weekKey(sunday), id);
  await markSeen(sunday, id); // cleanup: don't leave a dangling "unseen" entry
}

export async function getReservation(sunday, id) {
  const raw = await redis().hget(weekKey(sunday), id);
  return raw ? JSON.parse(raw) : null;
}

// ---- "New reservation" tracking --------------------------------------------
// A single sorted set (score = created-at ms) tracks every reservation staff
// hasn't opened yet, regardless of which Sunday it's for — no need to scan a
// fixed window of weeks, and it's correct even for a reservation booked far
// in advance. Member format: "{sunday}::{id}".
const UNSEEN_KEY = 'unseen:reservations';
const member = (sunday, id) => `${sunday}::${id}`;

export async function markUnseen(sunday, id, createdAtMs) {
  await redis().zadd(UNSEEN_KEY, createdAtMs, member(sunday, id));
}

export async function markSeen(sunday, id) {
  await redis().zrem(UNSEEN_KEY, member(sunday, id));
}

export async function countUnseen() {
  return redis().zcard(UNSEEN_KEY);
}

// Newest-first list of {sunday, id} pairs still unseen.
export async function listUnseen(limit = 100) {
  const members = await redis().zrevrange(UNSEEN_KEY, 0, limit - 1);
  return members.map((m) => {
    const idx = m.indexOf('::');
    return { sunday: m.slice(0, idx), id: m.slice(idx + 2) };
  });
}

// ---- Marketing contacts ---------------------------------------------------
export async function upsertMarketingContact(contact) {
  const email = contact.email.toLowerCase();
  const raw = await redis().hget(MARKETING_KEY, email);
  const existing = raw ? JSON.parse(raw) : null;
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
  await redis().hset(MARKETING_KEY, email, JSON.stringify(merged));
}

export async function listMarketingContacts() {
  const all = await redis().hgetall(MARKETING_KEY);
  return Object.values(all || {})
    .map((v) => JSON.parse(v))
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}

export async function setOptOut(email, optedOut) {
  const key = email.toLowerCase();
  const raw = await redis().hget(MARKETING_KEY, key);
  if (!raw) return null;
  const next = { ...JSON.parse(raw), optedOut };
  await redis().hset(MARKETING_KEY, key, JSON.stringify(next));
  return next;
}

// ---- Push subscriptions ----------------------------------------------------
// hash  field=endpoint (the unique push URL for a device/browser)  value=JSON
const PUSH_KEY = 'push:subscriptions';

export async function savePushSubscription(sub) {
  if (!sub || !sub.endpoint) throw new Error('Invalid push subscription.');
  await redis().hset(PUSH_KEY, sub.endpoint, JSON.stringify(sub));
}

export async function listPushSubscriptions() {
  const all = await redis().hgetall(PUSH_KEY);
  return Object.values(all || {}).map((v) => JSON.parse(v));
}

export async function removePushSubscription(endpoint) {
  if (!endpoint) return;
  await redis().hdel(PUSH_KEY, endpoint);
}
